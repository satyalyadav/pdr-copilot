"""Check the real provider on the Rivian sequence, without inventing repair actions."""

import argparse
import json
import os
import re
import time
from datetime import UTC, datetime, timedelta
from pathlib import Path

from fastapi.testclient import TestClient

from backend.app import app

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT / ".audit/novice-live.json")
    args = parser.parse_args()
    if args.output.exists():
        raise SystemExit("Evidence already exists. Choose a new --output for another paid run.")
    photos = ROOT / "test-inputs/real-photos"
    if not all(
        (photos / name).is_file()
        for name in ("denttime-rivian-before.webp", "denttime-rivian-after.webp")
    ):
        raise SystemExit(
            "Download the local Rivian pair using test-inputs/real-photos/sources.json."
        )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    started = datetime.now(UTC)
    audit = ROOT / ".audit"
    audit.mkdir(exist_ok=True)
    with (audit / "jobs.log").open("a") as log:
        log.write(
            json.dumps(
                {
                    "owner": "root",
                    "purpose": "two real-provider requests and an identical-image rule check",
                    "pid": os.getpid(),
                    "started": started.isoformat(),
                    "deadline": (started + timedelta(seconds=360)).isoformat(),
                    "checkpoint": str(args.output),
                    "safe_stop": "Send SIGTERM to this PID after checking its command and start time.",
                }
            )
            + "\n"
        )
    evidence: dict = {"started": started.isoformat(), "status": "running", "checks": []}

    def checkpoint():
        temporary = args.output.with_suffix(".tmp")
        encoded = json.dumps(evidence, indent=2)
        json.loads(encoded)
        temporary.write_text(encoded)
        temporary.replace(args.output)

    checkpoint()
    before = (photos / "denttime-rivian-before.webp").read_bytes()
    after = (photos / "denttime-rivian-after.webp").read_bytes()
    client = TestClient(app)

    def assess(name, image, previous=None, history=None):
        files = {"image": (name + ".webp", image, "image/webp")}
        data = {"mode": "zen", "outcome": "not_reported"}
        if previous is not None:
            files["previous_image"] = ("previous.webp", previous, "image/webp")
            data["history"] = json.dumps(history or [])
        tick = time.monotonic()
        response = client.post("/api/guidance", data=data, files=files)
        result = response.json()
        evidence["checks"].append(
            {
                "name": name,
                "http_status": response.status_code,
                "elapsed_seconds": round(time.monotonic() - tick, 2),
                "result": result,
            }
        )
        checkpoint()
        if response.status_code != 200:
            raise AssertionError(f"{name}: HTTP {response.status_code}; see {args.output}")
        advice = json.dumps(
            {
                key: result[key]
                for key in (
                    "visible_evidence",
                    "where_to_work",
                    "reason",
                    "next_action",
                    "assumptions",
                )
            }
        )
        if re.search(
            r"(?:consult|ask|show|seek|require).{0,60}(?:expert|professional)",
            advice,
            re.IGNORECASE,
        ):
            raise AssertionError(f"{name}: advice requires external expertise")
        assert result["next_action"]["steps"]
        assert result["next_action"]["tools"]
        assert result["next_action"]["expected_change"]
        assert result["sources"]
        return result

    try:
        first = assess("before", before)
        assert first["comparison"] is None
        assert first["next_action"]["id"] in {"crease_pull", "controlled_pull"}
        assert first["status"] == "proposal"
        history = [{"assessment": first["selection"], "action_note": "", "outcome": "not_reported"}]
        second = assess("after", after, before, history)
        assert second["comparison"] is not None
        assert second["comparison"]["change"] in {"looks_flatter", "cannot_judge"}
        assert second["next_action"]["id"] in {"finish_check", "check_remaining"}
        identical = assess("unchanged", before, before, history)
        assert identical["comparison"]["change"] == "no_visible_change"
        assert identical["next_action"]["id"] == "check_remaining"
        assert identical["review_method"] == "identical_image_rule"
        evidence["status"] = "passed"
    except Exception:
        evidence["status"] = "failed"
        raise
    finally:
        checkpoint()
        client.close()
    print(
        json.dumps(
            {
                "status": evidence["status"],
                "evidence": str(args.output),
                "checks": [
                    {"name": check["name"], "action": check["result"]["next_action"]["id"]}
                    for check in evidence["checks"]
                ],
            }
        )
    )


if __name__ == "__main__":
    main()
