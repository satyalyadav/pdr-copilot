import json
import os
from typing import Annotated, Any
from uuid import UUID

import cv2
from dotenv import load_dotenv
from fastapi import FastAPI, Form, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import ValidationError

from backend.demo import DEMOS, render_demo
from backend.vision import (
    MAX_BYTES,
    CapturedImage,
    Region,
    compare_reflections,
    data_url,
    decode_image,
    observe,
)

load_dotenv()
app = FastAPI(title="PDR inspection copilot")
app.state.zen_transport = None


async def load_input(upload: UploadFile | None, demo_id: str | None) -> CapturedImage:
    if upload is not None and demo_id:
        raise HTTPException(422, "Choose a demo frame or an uploaded image, not both.")
    if demo_id:
        if demo_id not in DEMOS:
            raise HTTPException(404, "Demo frame not found.")
        return CapturedImage.from_array(render_demo(demo_id))
    if upload is None:
        raise HTTPException(422, "Choose an image to inspect.")
    try:
        return decode_image(await upload.read(MAX_BYTES + 1))
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "zen_configured": bool(os.environ.get("OPENCODE_API_KEY", "").strip()),
        "model": os.environ.get("OPENCODE_MODEL", "deepseek-v4.1-flash"),
    }


@app.get("/api/demo")
def list_demo():
    return [
        {"id": key, "title": item["title"], "note": item["note"], "url": f"/api/demo/{key}"}
        for key, item in DEMOS.items()
    ]


@app.get("/api/demo/{demo_id}")
def demo_image(demo_id: str):
    if demo_id not in DEMOS:
        raise HTTPException(404, "Demo frame not found.")
    _, raw = cv2.imencode(".png", render_demo(demo_id))
    return Response(raw.tobytes(), media_type="image/png")


@app.post("/api/analyze")
async def analyze(
    image: UploadFile | None = None,
    previous_image: UploadFile | None = None,
    demo_id: Annotated[str | None, Form()] = None,
    previous_demo_id: Annotated[str | None, Form()] = None,
    region: Annotated[str, Form()] = "{}",
):
    try:
        selected = Region.model_validate(json.loads(region))
    except (ValueError, ValidationError) as exc:
        raise HTTPException(422, "Choose a valid region inside the image.") from exc
    capture = await load_input(image, demo_id)
    current = capture.image
    result = observe(current, selected)
    overlay = result.pop("overlay")
    change_overlay = None
    comparison: dict[str, Any] = {
        "status": "not_requested",
        "summary": "Add a previous capture to compare visible changes.",
        "mean_absolute_difference": None,
    }
    if previous_image is not None or previous_demo_id:
        previous_capture = await load_input(previous_image, previous_demo_id)
        previous = previous_capture.image
        if capture.original_size != previous_capture.original_size:
            comparison = {
                "status": "blocked",
                "summary": "Image dimensions differ. Recapture using the same framing.",
                "mean_absolute_difference": None,
            }
        elif capture.fingerprint == previous_capture.fingerprint:
            comparison = {
                "status": "unchanged",
                "summary": "The decoded pixels are identical. This supplies no evidence of repair progress.",
                "mean_absolute_difference": 0.0,
            }
        elif demo_id and previous_demo_id:
            a, b = DEMOS[demo_id], DEMOS[previous_demo_id]
            fixed = a["camera"] == b["camera"] and a["light"] == b["light"]
            if fixed:
                comparison, change_overlay = compare_reflections(current, previous, selected)
            else:
                comparison = {
                    "status": "blocked",
                    "summary": "Known synthetic camera or light motion. Recapture under the original conditions before comparing.",
                    "mean_absolute_difference": None,
                }
        else:
            comparison = {
                "status": "unverified",
                "summary": "Camera and light stability cannot be independently verified from these uploads. Request another controlled capture. No repair-progress claim is available.",
                "mean_absolute_difference": None,
            }
    return {
        "observation": result,
        "overlay": overlay,
        "change_overlay": change_overlay,
        "image": data_url(current),
        "region": selected.model_dump(),
        "width": current.shape[1],
        "height": current.shape[0],
        "provenance": "synthetic" if demo_id else "upload",
        "comparison": comparison,
    }


@app.get("/api/sources")
def sources():
    from backend.knowledge import SOURCES

    return SOURCES


@app.post("/api/guidance")
async def guidance(
    image: UploadFile | None = None,
    demo_id: Annotated[str | None, Form()] = None,
    region: Annotated[str, Form()] = "{}",
    mode: Annotated[str, Form()] = "local",
    session_id: Annotated[UUID | None, Form()] = None,
):
    from backend.knowledge import guidance_payload

    if mode not in {"local", "zen"}:
        raise HTTPException(422, "Choose local or Zen guidance.")
    try:
        selected = Region.model_validate(json.loads(region))
    except ValueError as exc:
        raise HTTPException(422, "Choose a valid region inside the image.") from exc
    capture = await load_input(image, demo_id)
    current = capture.image
    observation = observe(current, selected)
    if mode == "zen":
        from backend.zen import select_guidance

        selection = await select_guidance(
            data_url(current),
            selected.model_dump(),
            {k: v for k, v in observation.items() if k != "overlay"},
            app.state.zen_transport,
            str(session_id) if session_id else None,
        )
        return guidance_payload(
            "zen", list(selection.inspection_step_ids), list(selection.visible_findings)
        )
    step_ids = ["confirm_lighting", "inspect_paint"]
    if observation["state"] == "insufficient":
        step_ids.insert(0, "recapture")
    return guidance_payload("local", step_ids, [])
