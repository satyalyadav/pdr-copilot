SOURCES = [
    {
        "id": "rivian-pdr-2023",
        "title": "Rivian PDR statement",
        "url": "https://oemonestop.com/sites/default/files/Rivian_POS_Paintless-Dent-Repair%282-2-23%29.pdf",
        "locator": "RCI-52-22-002-2, page 1, February 2, 2023",
        "status": "Historical OEM statement. Indexed text checked November 4, 2026. Current vehicle-specific applicability remains unresolved.",
        "passage": "For 2022+ R1T and R1S vehicles, the statement requires 30X paint checks before and after repair, prohibits modifying panels for access, and favors non-damaging glue pulling. Material restrictions and the current vehicle procedure must be checked separately. A photograph cannot establish paint compliance.",
    },
    {
        "id": "ding-king-lighting",
        "title": "Ding King lighting lesson",
        "url": "https://onlinepdrtraining.thedingking.com/paintless-dent-repair/module-b-explanation-of-lights-and-reflections/",
        "locator": "Setup and use of the reflector/line board or dent light",
        "status": "Training page checked November 4, 2026. Its setup-specific descriptions do not validate this prototype.",
        "passage": "The lesson gives different positioning instructions for reflector boards and powered dent lights. Reflection interpretation depends on the chosen setup; placing a dent in the solid bright LED reflection can obscure it. Confirm the lighting arrangement before interpreting a reflection.",
    },
]

STEPS = {
    "confirm_lighting": {
        "id": "confirm_lighting",
        "title": "Confirm the reflection setup",
        "text": "Identify whether this is a line board or a powered dent light. Check that the selected region shows a readable reflection before interpreting it.",
        "source_ids": ["ding-king-lighting"],
    },
    "recapture": {
        "id": "recapture",
        "title": "Capture a clearer view",
        "text": "Keep the selected region visible and reduce glare or obstruction. Record camera and light positions for the next capture. This capture protocol is a prototype proposal; the lesson supports the need for a readable lighting setup.",
        "source_ids": ["ding-king-lighting"],
    },
    "inspect_paint": {
        "id": "inspect_paint",
        "title": "Have the paint inspected",
        "text": "The historical Rivian statement specifies a 30X paint check. Ask a qualified technician to resolve the applicable inspection procedure. This image cannot confirm that the coating is intact.",
        "source_ids": ["rivian-pdr-2023"],
    },
    "verify_procedure": {
        "id": "verify_procedure",
        "title": "Resolve the vehicle procedure",
        "text": "Confirm the model year, panel material, and current Rivian repair procedure before any physical work. The cited historical statement is not a vehicle-specific repair authorization.",
        "source_ids": ["rivian-pdr-2023"],
    },
}

FINDINGS = {
    "stripe_curvature": "The model identified visibly curved reflection stripes in the selected region. This is an unvalidated visual interpretation.",
    "readable_stripes": "The model identified a readable stripe pattern in the selected region. Readability does not establish the panel shape.",
    "glare": "The model flagged possible glare that may obscure the selected region.",
    "occlusion": "The model flagged a possible obstruction in the selected region.",
    "uncertain": "The model could not confidently interpret the selected region. Request a clearer view.",
}


def guidance_payload(mode: str, step_ids: list[str], findings: list[str]) -> dict:
    ids = list(dict.fromkeys([*step_ids, "verify_procedure"]))
    steps = [STEPS[step_id] for step_id in ids]
    cited = {source for step in steps for source in step["source_ids"]}
    return {
        "mode": mode,
        "label": "Local source-backed template"
        if mode == "local"
        else "OpenCode Go image review with curated inspection guidance",
        "findings": [FINDINGS[kind] for kind in findings],
        "steps": steps,
        "sources": [source for source in SOURCES if source["id"] in cited],
        "repair_actions_validated": False,
        "limits": "The overlay and model interpretation do not establish depth, high/low sign, tool placement, force, repair quality, or OEM compliance. Physical corrections remain unvalidated.",
    }
