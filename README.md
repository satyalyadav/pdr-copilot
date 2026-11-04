# PDR inspection copilot

A local React and Python/OpenCV prototype for the scope in [CONTEXT.md](CONTEXT.md). Inspect reflection stripes, select a region, get cited inspection guidance, record a technician's adjustment, and reassess a later capture.

## Run locally

Requires Python 3.12+, uv, Node 20.19+ or 22.12+, and npm.

```bash
uv sync --group dev
npm --prefix frontend ci
cp .env.example .env
# Set OPENCODE_API_KEY in .env for live image guidance.
./scripts/dev.sh
```

Open http://localhost:5173. The API listens on 127.0.0.1:8000. The runner stops both servers after four hours or when you press Ctrl+C. Set `PDR_DEV_SECONDS=28800` to allow eight hours. Job ownership and deadlines are recorded in `.audit/jobs.log`.

The key is backend-only and `.env` is ignored by Git. Never put it in a `VITE_` variable. Local inspection and source-backed templates work without a key. The frontend sends a selected image to OpenCode only when you click **Send image to OpenCode**. A failed live request shows an error and preserves existing guidance without changing its provenance.

The configured default is DeepSeek V4.1 Flash through OpenCode Go's subscription chat-completions endpoint. The app identifies itself honestly and sends a stable session ID for each browser session. Both model and base URL are configurable in `.env`. Choose a currently listed image-capable model from the [OpenCode model catalog](https://opencode.ai/v2/docs/console/models/). The catalog API is `https://opencode.ai/inference/go/v1/models`. Go allowances and model availability can change. DeepSeek may require the Global region in the workspace privacy settings. The app does not change that setting.

## Try the loop

1. Select **Initial reflection**, then **Assess image**. Amber points show stripe departures from fitted straight references. Open the explanation beneath the pixel measurements.
2. Request OpenCode guidance if configured, inspect each citation, and record a note. **Record this assessment** adds an immutable record to the current tab's session.
3. Select **After illustrative adjustment**, confirm the previous capture, then assess again. The fixture's camera and light settings are known. Its changing stripe warp is predetermined and does not model a physical repair.
4. Try **Unchanged control**, **Camera moved**, and **Light moved**. Identical pixels show no change. Known synthetic motion blocks comparison.
5. Add your own PNG, JPEG, or WebP photos. Use **Select region** to drag a rectangle, or use the keyboard sliders. All changed uploaded comparisons remain unverified because the prototype cannot independently observe camera and light pose.
6. Export the recorded assessments as JSON for expert review. Records live in browser memory and disappear on reload. Exports contain the analyzed, resized images and overlays, guidance provenance, sources, selections, and technician notes. Original upload files are not retained on the server or included in the export.

Up to 12 uploads per session, 12 MB each, and 20 million pixels per image. Analysis resizes images to fit 960 by 720 pixels. Pixel measurements refer to that resized image. The overlay expects near-vertical continuous bright stripes. General dent photos can produce insufficient evidence, and ordinary body curvature can produce stripe residuals.

## What is demonstrated

- Deterministic stripe tracing and a transparent, image-space departure overlay.
- Conservative comparison states with labeled synthetic fixtures and upload support.
- OpenCode multimodal selection of predefined visual findings and curated inspection steps. The backend validates source IDs and rejects extra fields. The UI renders vetted text, not unrestricted repair instructions.
- Two curated source summaries with original links and locators. This is a small document collection, not a general search engine. OEM statements are historical and current vehicle-specific applicability remains unresolved.
- Local source-backed templates with explicit provenance, session notes, and JSON export.

No output establishes depth, high/low sign, tool placement, force, paint condition, OEM compliance, repair quality, or an effective physical correction. Synthetic camera/light rejection uses fixture parameters, not a validated real-world motion detector. A replay cannot prove AI advice caused a repair. [Expert review](CONTEXT.md) remains the first validation step. Calibrated deflectometry and physical trials are proposed future work.

## Checks

```bash
uv run pytest
uv run mypy backend
uv run ruff check backend
uv run ruff format --check backend
npm --prefix frontend run typecheck
npm --prefix frontend run build
```

The API tests cover the user-agreed analysis and guidance boundaries. External-model tests use HTTP fixtures; they do not establish expert correctness. A live provider check is a separate verification step and uses the configured Go allowance. See [verification notes](docs/verification.md) for the observed results.
