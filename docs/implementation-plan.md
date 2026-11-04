# PDR inspection prototype

Scope: CONTEXT.md, working local prototype only. OpenCode Go hosts the LLM. No slides or deployment.

## Public interfaces

Test boundaries confirmed by the user on November 4, 2026:

- `POST /api/analyze`: image observations and conservative comparison rejection. Tests catch unchanged-image instability and camera/light confounds, not physical accuracy.
- `POST /api/guidance`: source-linked inspection guidance, provenance, and failure behavior at the external LLM boundary. Tests catch invalid source IDs and missing credentials, not expert correctness.

## Design

The reflection image occupies most of the screen. A narrow right column explains observations and the next inspection. The bottom timeline supports repeated assessments and makes the selected comparison explicit. Text aligns left.

Use a workshop palette: fog #edf1f2, steel #c3ced1, ink #1c3038, petrol #276779, and signal amber #b46617. Use Trebuchet MS for headings, with the operating system sans serif for controls and reading. The image and inspection region carry the visual emphasis. Avoid dashboard statistics that suggest repair quality.

Show source provenance, synthetic status, and blocked comparisons beside the relevant result. An offline path explains computed image evidence with curated sources and clearly identifies itself as a local template. Live guidance requires an explicit request and sends the selected image to OpenCode.

## Delivery checks

Run targeted backend tests during implementation, Python and TypeScript checks at checkpoints, and the complete backend suite once at completion. Review both standards and scope, fix findings, then commit.
