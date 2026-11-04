#!/usr/bin/env python3
"""Run local servers under a Linux child subreaper with a finite deadline."""

import ctypes
import json
import os
import signal
import subprocess
import sys
import time
from datetime import UTC, datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DURATION = int(os.environ.get("PDR_DEV_SECONDS", "14400"))
children: list[subprocess.Popen] = []
stopping = False


def enable_subreaper():
    if sys.platform != "linux" or ctypes.CDLL(None, use_errno=True).prctl(36, 1, 0, 0, 0) != 0:
        raise SystemExit("The supervised runner requires Linux or WSL2 for detached-child cleanup.")


def stop(signum=None, frame=None):
    global stopping
    stopping = True


for sig in (signal.SIGTERM, signal.SIGINT, signal.SIGHUP):
    signal.signal(sig, stop)


def process_identity(pid: int):
    try:
        fields = Path(f"/proc/{pid}/stat").read_text().rsplit(")", 1)[1].split()
        return int(fields[1]), fields[19]
    except (OSError, ValueError, IndexError):
        return None


def descendants():
    records = {}
    for path in Path("/proc").glob("[0-9]*/stat"):
        pid = int(path.parent.name)
        identity = process_identity(pid)
        if identity:
            records[pid] = identity
    owned = {os.getpid()}
    while True:
        added = {pid for pid, (parent, _) in records.items() if parent in owned} - owned
        if not added:
            break
        owned.update(added)
    return {pid: records[pid] for pid in owned if pid != os.getpid()}


def cleanup():
    for sig, grace in [(signal.SIGTERM, 3), (signal.SIGKILL, 2)]:
        limit = time.monotonic() + grace
        while True:
            for child in children:
                child.poll()
            try:
                while os.waitpid(-1, os.WNOHANG)[0]:
                    pass
            except ChildProcessError:
                pass
            owned = descendants()
            if not owned:
                return
            for pid, identity in owned.items():
                if process_identity(pid) == identity:
                    try:
                        os.kill(pid, sig)
                    except ProcessLookupError:
                        pass
            if time.monotonic() >= limit:
                break
            time.sleep(0.05)
    remaining = descendants()
    if remaining:
        raise RuntimeError(f"Owned processes did not exit: {list(remaining)}")


def main():
    if DURATION < 1:
        raise SystemExit("PDR_DEV_SECONDS must be a positive number.")
    enable_subreaper()
    commands = [
        ["uv", "run", "uvicorn", "backend.app:app", "--host", "127.0.0.1", "--port", "8000"],
        ["npm", "--prefix", "frontend", "run", "dev", "--", "--port", "5173", "--strictPort"],
    ]
    audit = ROOT / ".audit"
    audit.mkdir(exist_ok=True)
    started = datetime.now(UTC)
    with (audit / "jobs.log").open("a") as log:
        log.write(
            json.dumps(
                {
                    "owner": "pdr-dev",
                    "purpose": "local API and React servers",
                    "pid": os.getpid(),
                    "start": started.isoformat(),
                    "deadline": (started + timedelta(seconds=DURATION)).isoformat(),
                    "checkpoint": "none; export sessions from the UI",
                }
            )
            + "\n"
        )
    failed_status = 0
    try:
        for command in commands:
            child = subprocess.Popen(command, cwd=ROOT, start_new_session=True)
            children.append(child)
            with (audit / "jobs.log").open("a") as log:
                log.write(
                    json.dumps(
                        {
                            "owner": "pdr-dev",
                            "pid": child.pid,
                            "process_group": child.pid,
                            "command": command,
                            "start": datetime.now(UTC).isoformat(),
                        }
                    )
                    + "\n"
                )
        print(
            f"PDR workspace: http://localhost:5173. Deadline: {DURATION} seconds. Ctrl+C stops both servers.",
            flush=True,
        )
        limit = time.monotonic() + DURATION
        while not stopping and time.monotonic() < limit:
            statuses = [child.poll() for child in children]
            if any(status is not None for status in statuses):
                failed_status = next((status for status in statuses if status), 0)
                break
            time.sleep(0.25)
    finally:
        cleanup()
    return failed_status


if __name__ == "__main__":
    sys.exit(main())
