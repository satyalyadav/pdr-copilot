# PDR inspection prototype (historical plan)

Superseded November 4, 2026 by the normal-photo copilot described in [README.md](../README.md) and [verification.md](verification.md). The current flow calls vision guidance directly, supports card-based repair proposals and reassessment, and has no automatic local-checklist fallback.

Scope: CONTEXT.md, working local prototype only. OpenCode Go hosts the LLM. No slides or deployment.

## Public interfaces

Test boundaries confirmed by the user on November 4, 2026:

- `POST /api/analyze`: image observations and conservative comparison rejection. Tests catch unchanged-image instability and camera/light confounds, not physical accuracy.
- `POST /api/guidance`: source-linked inspection guidance, provenance, and failure behavior at the external LLM boundary. Tests catch invalid source IDs and missing credentials, not expert correctness.

## Design

The uploaded photo occupies most of the screen. The Assessment panel sits beside it on desktop and below it on mobile. One **Assess image** action runs the local check, then the model review when a backend key is configured. The checked area is outlined on the photo. The **Your photos** strip supports repeated captures and makes the selected comparison explicit. Text aligns left and stays minimal.

Use a workshop palette: fog #edf1f2, steel #c3ced1, ink #1c3038, petrol #276779, and signal amber #b46617. Use Trebuchet MS for headings, with the operating system sans serif for controls and reading. The image and inspection region carry the visual emphasis. Avoid dashboard statistics that suggest repair quality.

Show source provenance, synthetic status, and blocked comparisons beside the relevant result. An offline path labels itself as a basic checklist and shows curated sources. Live guidance sends the selected image to OpenCode only after the user clicks **Assess image**.

## Delivery checks

Run targeted backend tests during implementation, Python and TypeScript checks at checkpoints, and the complete backend suite once at completion. Review both standards and scope, fix findings, then commit.
