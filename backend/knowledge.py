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
        "title": "Inspect the paint",
        "text": "The historical Rivian statement specifies a 30X paint check. Follow the applicable vehicle inspection procedure. This image cannot confirm that the coating is intact.",
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
        "finding_ids": findings,
        "findings": [FINDINGS[kind] for kind in findings],
        "steps": steps,
        "sources": [source for source in SOURCES if source["id"] in cited],
        "repair_actions_validated": False,
        "limits": "The overlay and model interpretation do not establish depth, high/low sign, tool placement, force, repair quality, or OEM compliance. Physical corrections remain unvalidated.",
    }


# The model localizes damage; these templates supply the physical steps.
SOURCES.extend(
    [
        {
            "id": "keco-controlled-pulls",
            "title": "KECO precision lifter demonstration",
            "url": "https://www.kecotabs.com/blogs/all/crease-killer-precision-lifter",
            "locator": "Transcript: initial crease correction; flexible-tab reduction; closing incremental-pull advice",
            "status": "Primary manufacturer transcript reread November 4, 2026. Its deliberate overpull demonstrations are excluded.",
            "passage": "The tutorial aligns a crease tab with the low, demonstrates flexible tabs for initial reduction and narrow tabs for later detail, then checks the panel between incremental pulls. It warns that off-center placement and overpulling can damage metal. This supports a qualitative technique, not a validated plan for this vehicle.",
        },
        {
            "id": "carcosmetics-pdr",
            "title": "Car Cosmetics PDR technique FAQ",
            "url": "https://www.carcosmetics.com/en/service/frequently-asked-questions-faq/",
            "locator": "Reflection board/PDR lamp; cold glue procedure; PDR suitability",
            "status": "Primary PDR supplier guidance read November 4, 2026. Cold-glue details do not apply to every adhesive system.",
            "passage": "The FAQ describes controlled external pulling, checking under a PDR lamp after each pull, and correcting a confirmed high with a knockdown. Intact original paint and damage shape affect suitability. Lamp reflections help locate remaining lows and highs.",
        },
    ]
)

CARDS = {
    "controlled_pull": {
        "id": "controlled_pull",
        "title": "Reduce the low with one controlled glue pull",
        "kind": "repair",
        "shapes": ["broad_low", "small_ding"],
        "tools": "Glue-pull lifter, shape-matched tab, compatible adhesive and release agent, PDR light",
        "approach": "Reduce the visible depression incrementally, then let the next image guide the following adjustment.",
        "steps": [
            "Locate the depression using the displayed panel landmarks. Match the glue tab to that low rather than covering the whole outlined region.",
            "Prepare the panel and attach the tab according to the compatible glue system's instructions.",
            "Make one small outward correction with the lifter, then release the adhesive as instructed instead of ripping the tab off.",
            "Record the action and add the next photo. The copilot will compare the remaining distortion before recommending another adjustment.",
        ],
        "expected_change": "The depression should look less pronounced, without a new raised spot. This is an expectation, not a measured result.",
        "stop_when": "Stop pulling if the paint changes, a raised spot appears, or the low is no longer identifiable. Do not increase force to chase unchanged damage.",
        "source_ids": ["keco-controlled-pulls", "carcosmetics-pdr", "rivian-pdr-2023"],
        "scope": "Qualitative low-reduction proposal. Exact tab dimensions, force and contact coordinates are not determined by the photograph.",
    },
    "crease_pull": {
        "id": "crease_pull",
        "title": "Reduce the crease with an incremental glue pull",
        "kind": "repair",
        "shapes": ["crease"],
        "tools": "Controlled glue-pull lifter, compatible flexible crease tab, adhesive and release agent, PDR light",
        "approach": "Start reducing the creased low with a shape-matched flexible tab. Reassess before progressing to narrower detail work.",
        "steps": [
            "Find the creased low at the displayed landmarks. Align a compatible flexible crease tab along it; the outline locates damage and is not a tab-placement guide.",
            "Follow the glue system's preparation and attachment instructions, then set the lifter using its product instructions.",
            "Apply one small controlled lift. Release the adhesive as instructed and stop before the low becomes a raised ridge.",
            "Add the next photo and any action note. The copilot will assess the crease and surrounding depression before choosing the next adjustment.",
        ],
        "expected_change": "The crease and surrounding depression should soften. Remaining distortion may need further work; a complete repair is not expected from one lift.",
        "stop_when": "Stop if paint changes, a ridge rises, the tab cannot be aligned on the low, or the lifter cannot be supported as specified. Do not bridge a panel seam.",
        "source_ids": ["keco-controlled-pulls", "rivian-pdr-2023"],
        "scope": "Prototype adaptation of a manufacturer technique for visible creased lows. This vehicle's suitability and exact tool setup are not established by the image.",
    },
    "check_remaining": {
        "id": "check_remaining",
        "title": "Hold off on another pull and inspect the remaining shape",
        "kind": "inspection",
        "tools": "PDR light or reflection board",
        "approach": "Avoid repeating a correction when the remaining deformation is unclear.",
        "steps": [
            "Leave the pulling tool off the panel while inspecting the displayed area.",
            "Sweep a PDR light across it to reveal localized reflection breaks without applying another correction.",
            "Record any directly observed change. The copilot uses the available photos for its assessment; an unclear image is not proof that the panel is flat.",
        ],
        "expected_change": "Inspection should reveal where distortion remains. This step changes no metal and should not be counted as repair progress.",
        "stop_when": "Pause physical corrections if you cannot distinguish the remaining low from a high.",
        "source_ids": ["carcosmetics-pdr", "ding-king-lighting"],
        "scope": "Use after a correction, when a panel looks flatter, or when a normal photo cannot resolve the remaining shape.",
    },
    "finish_check": {
        "id": "finish_check",
        "title": "End pulling and check the finish",
        "kind": "inspection",
        "shapes": ["nearly_flat"],
        "tools": "PDR light and the applicable paint-inspection equipment",
        "approach": "When the main dent is no longer apparent, switch from reshaping to finish evaluation.",
        "steps": [
            "Remove the pulling tool. Do not repeat the earlier pull on a panel that now appears smooth.",
            "Sweep the PDR light over the former dent and its edges to inspect for localized reflection breaks.",
            "Complete the applicable post-repair paint inspection. The current image supports a visual assessment, not certification of a finished repair.",
        ],
        "expected_change": "No metal change is intended. The aim is to find any remaining distortion or coating concern before further correction.",
        "stop_when": "Keep correction tools off the panel unless a remaining defect is identified. A smoother photograph alone does not establish a completed repair.",
        "source_ids": ["carcosmetics-pdr", "rivian-pdr-2023"],
        "scope": "Use when the current image appears nearly flat, even when prior repair actions are unknown.",
    },
    "tap_down": {
        "id": "tap_down",
        "title": "Correct the confirmed high with a knockdown",
        "kind": "repair",
        "shapes": ["raised_spot"],
        "tools": "PDR knockdown, PDR hammer and light",
        "approach": "A reported raised spot calls for reducing that high instead of another outward pull.",
        "steps": [
            "Under the PDR light, locate the raised spot you confirmed after the last correction.",
            "Using the knockdown kit's instructions, make a gentle correction of that high without repeating the previous pull.",
            "Inspect after each small correction; record the result and upload the next photo before continuing.",
        ],
        "expected_change": "The reported raised spot should become less prominent without creating a new low.",
        "stop_when": "Stop when the high is no longer clear, a low appears, or the paint changes. Do not continue pulling this high.",
        "source_ids": ["carcosmetics-pdr"],
        "scope": "Only for a reported high, never inferred from ordinary shading alone.",
    },
    "stop_paint": {
        "id": "stop_paint",
        "title": "Stop corrections and inspect the paint damage",
        "kind": "stop",
        "tools": "Applicable paint-inspection equipment",
        "approach": "Preserve the coating and suspend reshaping when a paint concern is present.",
        "steps": [
            "Do not apply another pull or knockdown to this area.",
            "Record the location and inspect the coating according to the vehicle procedure.",
            "Record the finding before resuming any repair.",
        ],
        "expected_change": "No correction is intended while the coating concern remains unresolved.",
        "stop_when": "Keep physical work paused while the paint concern remains unresolved.",
        "source_ids": ["rivian-pdr-2023", "carcosmetics-pdr"],
        "scope": "Required for a reported paint issue or visible coating damage.",
    },
}

PHYSICAL_PRECONDITIONS = [
    "The applicable vehicle procedure and panel material must permit the method; the historical Rivian statement is not current authorization.",
    "The coating must pass the required inspection, and the tool and adhesive setup must follow their product instructions.",
]
