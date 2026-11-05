# AI PDR copilot: working context

Read [AGENTS.md](AGENTS.md) before product or implementation decisions. It records the agreed objective and prototype acceptance criteria.

## Current direction

Help novices approach experienced PDR results through computer vision, an LLM and documented expert repair knowledge. The system owns perception, next-step reasoning and evaluation. The novice supplies photos, carries out physical adjustments and may add observations.

The loop is assess, adjust, reassess. Use the existing Rivian rear-quarter before/after pair as the primary demonstration. Assess the first photo independently, then introduce the later photo to compare visible changes and update the next action. Additional views, human PDR experts and precise measurements are not prerequisites for this prototype.

The supplied pair is a recorded shop repair. Individual repair actions are unknown. It can demonstrate image understanding, conditional guidance and reassessment, but cannot establish that the AI caused a repair or that a novice achieved expert results.

## Implementation

React and FastAPI use a vision-capable LLM through the configured OpenCode endpoint. The current default is DeepSeek V4.1 Flash. Images reach the provider only when the user assesses them. A provider failure is explicit and keeps the case available for retry.

The model describes landmarks and damage, classifies the visible shape, states assumptions and selects a curated technique. Code supplies its approach, tools, steps, expected change and sources. Supported choices include incremental crease reduction, controlled low reduction, remaining-shape inspection, finish evaluation, reported-high correction and a coating-damage stop. Physical methods are always proposals with explicit applicability conditions, never an authorization inferred from a photograph.

The UI has no expert approval checkboxes or plan-confirmation gate. Action notes and the novice's observations are optional. Vehicle metadata defaults to unknown; the prototype has no vehicle-setup form. Reassessment sends both photos and only earlier cycles. The system evaluates the image even when the novice cannot classify the result. Subjective impressions of improvement or uncertainty do not replace that assessment. A reported coating concern triggers a model-free stop; identical photos trigger no-change inspection without another provider call. Prior instructions are hidden while a new photo awaits assessment.

## Evidence and next work

See [verification](docs/verification.md) for actual checks and remaining limits, and [source notes](docs/source-notes.md) for the knowledge boundary. The API checks enforce supported actions and comparison rules; the live sequence checks whether the configured model produces tangible guidance on the actual photos.

There is no measured depth, contact point, force or validated repair-quality score. A successful software demonstration does not establish physical repair effectiveness. An optional Precision demo now demonstrates calibrated deflectometry in a fixed synthetic setup. Its independent reconstruction uses rendered phase images and known camera/screen geometry, with a flat boundary reference. It compares reconstructed height with the generated ground truth and shares existing repair cards, without an LLM call. This is not calibrated measurement of the uploaded car photos or a tool-action simulator. Guided multi-angle capture, physical calibration, model training and a physical outcome study remain deferred.

The earlier [feasibility](research/pdr-feasibility.md) and [repair-sequence](research/pdr-repair-sequences.md) notes are research history. Their former expert-dependent prototype recommendations are superseded by AGENTS.md.
