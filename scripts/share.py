"""Supervise the interview server and a temporary Cloudflare Tunnel."""

import json
import os
import re
import shutil
import signal
import socket
import subprocess
import time
from datetime import UTC, datetime, timedelta
from pathlib import Path
from urllib.error import URLError
from urllib.request import urlopen

from scripts import dev

ROOT = Path(__file__).resolve().parents[1]
AUDIT = ROOT / ".audit"
STATE = AUDIT / "share-runtime.json"
stopping = False


def stop(signum=None, frame=None):
    global stopping
    stopping = True


def main() -> int:
    duration = int(os.environ.get("PDR_SHARE_SECONDS", "28800"))
    if duration < 1:
        raise SystemExit("PDR_SHARE_SECONDS must be a positive number.")
    candidates = sorted((Path.home() / ".t3/tools/cloudflared").glob("*/linux-x64/cloudflared"))
    binary = shutil.which("cloudflared") or (str(candidates[-1]) if candidates else None)
    if not binary:
        raise SystemExit("Install cloudflared or put it on PATH first.")
    if not (ROOT / "frontend/dist/index.html").is_file():
        raise SystemExit("Build the frontend with npm --prefix frontend run build first.")
    # Never expose an unrelated service already using this port.
    with socket.socket() as probe:
        probe.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            probe.bind(("127.0.0.1", 5173))
        except OSError:
            raise SystemExit("Port 5173 is in use. Stop this project's dev runner first.") from None
    dev.enable_subreaper()
    for sig in (signal.SIGTERM, signal.SIGINT, signal.SIGHUP):
        signal.signal(sig, stop)
    AUDIT.mkdir(exist_ok=True)
    start = datetime.now(UTC)
    state = {
        "owner": "root",
        "purpose": "PDR app and presentation interview tunnel",
        "pid": os.getpid(),
        "start": start.isoformat(),
        "deadline": (start + timedelta(seconds=duration)).isoformat(),
        "checkpoint": str(STATE),
        "url": None,
        "status": "starting",
        "safe_stop": f"Verify PID {os.getpid()} is python3 -m scripts.share here, then kill -TERM {os.getpid()}.",
    }

    def save():
        temporary = STATE.with_suffix(".tmp")
        temporary.write_text(json.dumps(state, indent=2) + "\n")
        temporary.replace(STATE)

    save()
    with (AUDIT / "jobs.log").open("a") as log:
        log.write(json.dumps(state) + "\n")
    try:
        with (
            (AUDIT / "share-server.log").open("w") as server_log,
            (AUDIT / "share-tunnel.log").open("w") as tunnel_log,
        ):
            server = subprocess.Popen(
                [
                    "uv",
                    "run",
                    "uvicorn",
                    "backend.share:app",
                    "--host",
                    "127.0.0.1",
                    "--port",
                    "5173",
                    "--workers",
                    "1",
                    "--limit-concurrency",
                    "64",
                ],
                cwd=ROOT,
                stdout=server_log,
                stderr=subprocess.STDOUT,
                start_new_session=True,
            )
            dev.children.append(server)
            state["server_pid"] = server.pid
            ready_deadline = time.monotonic() + 30
            while not stopping:
                try:
                    with urlopen("http://127.0.0.1:5173/api/health", timeout=2) as response:
                        if response.status == 200:
                            break
                except URLError:
                    pass
                if server.poll() is not None or time.monotonic() >= ready_deadline:
                    raise RuntimeError(
                        "Interview server did not start; see .audit/share-server.log."
                    )
                time.sleep(0.2)
            if stopping:
                return 0
            tunnel = subprocess.Popen(
                [
                    binary,
                    "tunnel",
                    "--no-autoupdate",
                    "--protocol",
                    "http2",
                    "--url",
                    "http://127.0.0.1:5173",
                    "--metrics",
                    "127.0.0.1:0",
                ],
                cwd=ROOT,
                stdout=tunnel_log,
                stderr=subprocess.STDOUT,
                start_new_session=True,
            )
            dev.children.append(tunnel)
            state["tunnel_pid"] = tunnel.pid
            save()
            limit = time.monotonic() + duration
            url_deadline = time.monotonic() + 60
            while not stopping and time.monotonic() < limit:
                if server.poll() is not None or tunnel.poll() is not None:
                    raise RuntimeError("A sharing process exited; check .audit/share-*.log.")
                if state["url"] is None:
                    match = re.search(
                        r"https://[a-z0-9-]+\.trycloudflare\.com",
                        (AUDIT / "share-tunnel.log").read_text(),
                    )
                    if match:
                        state.update(url=match[0], status="running")
                        save()
                        print(
                            f"App: {match[0]}\nPresentation: {match[0]}/presentation/", flush=True
                        )
                    elif time.monotonic() >= url_deadline:
                        raise RuntimeError("Tunnel URL unavailable; see .audit/share-tunnel.log.")
                time.sleep(0.25)
    finally:
        dev.cleanup()
        state["status"] = "stopped"
        state["stopped_at"] = datetime.now(UTC).isoformat()
        save()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
