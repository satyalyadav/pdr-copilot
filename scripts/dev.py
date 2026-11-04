#!/usr/bin/env python3
"""Run both local servers with a recorded deadline and terminate their process groups."""

import json
import os
import signal
import subprocess
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DURATION = int(os.environ.get('PDR_DEV_SECONDS', '14400'))
children: list[subprocess.Popen] = []
stopping = False


def stop(signum=None, frame=None):
    global stopping
    stopping = True


for sig in (signal.SIGTERM, signal.SIGINT, signal.SIGHUP):
    signal.signal(sig, stop)


def main():
    if DURATION < 1:
        raise SystemExit('PDR_DEV_SECONDS must be a positive number.')
    commands = [
        ['uv', 'run', 'uvicorn', 'backend.app:app', '--host', '127.0.0.1', '--port', '8000'],
        ['npm', '--prefix', 'frontend', 'run', 'dev', '--', '--port', '5173', '--strictPort'],
    ]
    audit = ROOT / '.audit'
    audit.mkdir(exist_ok=True)
    started = datetime.now(timezone.utc)
    with (audit / 'jobs.log').open('a') as log:
        log.write(json.dumps({'owner': 'pdr-dev', 'purpose': 'local API and React servers', 'pid': os.getpid(), 'start': started.isoformat(), 'deadline': (started + timedelta(seconds=DURATION)).isoformat(), 'checkpoint': 'none; export sessions from the UI'}) + '\n')
    try:
        for command in commands:
            child = subprocess.Popen(command, cwd=ROOT, start_new_session=True)
            children.append(child)
            with (audit / 'jobs.log').open('a') as log:
                log.write(json.dumps({'owner': 'pdr-dev', 'pid': child.pid, 'process_group': child.pid, 'command': command, 'start': datetime.now(timezone.utc).isoformat()}) + '\n')
        print(f'PDR workspace: http://localhost:5173. Deadline: {DURATION} seconds. Ctrl+C stops both servers.', flush=True)
        limit = time.monotonic() + DURATION
        while not stopping and time.monotonic() < limit and all(c.poll() is None for c in children):
            time.sleep(0.25)
    finally:
        for child in children:
            try:
                os.killpg(child.pid, signal.SIGTERM)
            except ProcessLookupError:
                pass
        for child in children:
            try:
                child.wait(timeout=4)
            except subprocess.TimeoutExpired:
                pass
            try:
                os.killpg(child.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
        for child in children:
            child.wait()
    return 0 if stopping else max((child.returncode or 0 for child in children), default=0)


if __name__ == '__main__':
    sys.exit(main())
