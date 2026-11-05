"""Save real AI runs for the five interview gallery pairs, one request at a time."""

import hashlib
import json
import os
import shutil
from datetime import UTC, datetime, timedelta
from pathlib import Path
from uuid import uuid4

from fastapi.testclient import TestClient

from backend.app import app

ROOT = Path(__file__).resolve().parents[1]
PHOTO_DIR = ROOT / "test-inputs/real-photos"
OUTPUT = ROOT / ".audit/gallery-ai.json"
PAIRS = [
    "white-door",
    "rivian-tailgate",
    "blue-quarter",
    "denttime-silver-door",
    "ncpdr-small-ding",
]


def main():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    if OUTPUT.exists():
        state = json.loads(OUTPUT.read_text())
        if state.get("in_flight"):
            raise SystemExit("An unfinished request needs review before resuming paid calls.")
    else:
        state = {"model": os.environ.get("OPENCODE_MODEL", "deepseek-v4.1-flash"), "examples": {}}
    started = datetime.now(UTC)
    with (ROOT / ".audit/jobs.log").open("a") as log:
        log.write(
            json.dumps(
                {
                    "owner": "root",
                    "purpose": "record five photo pairs with ten sequential AI requests",
                    "pid": os.getpid(),
                    "start": started.isoformat(),
                    "deadline": (started + timedelta(seconds=1800)).isoformat(),
                    "checkpoint": str(OUTPUT),
                }
            )
            + "\n"
        )

    def save():
        temporary = OUTPUT.with_suffix(".tmp")
        encoded = json.dumps(state, indent=2)
        json.loads(encoded)
        temporary.write_text(encoded)
        temporary.replace(OUTPUT)

    with TestClient(app) as client:
        for pair in PAIRS:
            entry = state["examples"].setdefault(pair, {})
            session = entry.setdefault("session_id", str(uuid4()))
            for stage in ["before", "after"]:
                if stage in entry:
                    continue
                name = f"{pair}-{stage}.webp"
                image = (PHOTO_DIR / name).read_bytes()
                files = {"image": (name, image, "image/webp")}
                data = {"mode": "zen", "outcome": "not_reported", "session_id": session}
                if stage == "after":
                    previous = (PHOTO_DIR / f"{pair}-before.webp").read_bytes()
                    files["previous_image"] = (f"{pair}-before.webp", previous, "image/webp")
                    data["history"] = json.dumps(
                        [
                            {
                                "assessment": entry["before"]["result"]["selection"],
                                "action_note": "",
                                "outcome": "not_reported",
                            }
                        ]
                    )
                state["in_flight"] = {"pair": pair, "stage": stage}
                save()
                response = client.post("/api/guidance", data=data, files=files)
                result = response.json()
                state["last_response"] = {"http_status": response.status_code, "result": result}
                save()
                if response.status_code != 200:
                    state["error"] = {"http_status": response.status_code, "result": result}
                    save()
                    raise SystemExit(f"{pair}/{stage} failed; inspect {OUTPUT} before retrying.")
                assert result.get("review_method") not in {
                    "reported_outcome_rule",
                    "identical_image_rule",
                }
                assert result["next_action"]["title"] and result["next_action"]["steps"]
                assert (result["comparison"] is None) == (stage == "before")
                entry[stage] = {
                    "file": name,
                    "sha256": hashlib.sha256(image).hexdigest(),
                    "recorded_at": datetime.now(UTC).isoformat(),
                    "result": result,
                }
                state["in_flight"] = None
                save()
                print(f"{pair}/{stage}: {result['next_action']['id']}", flush=True)
    state["status"] = "complete"
    save()
    gallery = {
        "model": state["model"],
        "examples": {
            pair: {stage: state["examples"][pair][stage] for stage in ["before", "after"]}
            for pair in PAIRS
        },
    }
    assets = ROOT / "frontend/src/assets/examples"
    assets.mkdir(parents=True, exist_ok=True)
    for pair in PAIRS:
        for stage in ["before", "after"]:
            name = f"{pair}-{stage}.webp"
            shutil.copyfile(PHOTO_DIR / name, assets / name)
    destination = ROOT / "frontend/src/data/photo-examples.json"
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_suffix(".tmp")
    temporary.write_text(json.dumps(gallery, indent=2) + "\n")
    temporary.replace(destination)
    print("Gallery recordings and photos exported. Rebuild the frontend to publish.", flush=True)


if __name__ == "__main__":
    main()
