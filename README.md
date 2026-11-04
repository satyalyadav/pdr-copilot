# PDR inspection copilot

A local React and Python/OpenCV prototype for the scope in [CONTEXT.md](CONTEXT.md). Inspect reflection stripes, select a region, get cited inspection guidance, record a technician's adjustment, and reassess a later capture.

## Run locally

The supervised runner requires Linux or WSL2, Python 3.12+, uv, Node 20.19+ or 22.12+, and npm.

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

1. The app starts with an empty upload panel. Choose your own PNG, JPEG, or WebP dent photo. No sample images are loaded.
2. Click **Assess image**. Yellow-orange dots mark stripe departures inside the centered inspection box. **Choose area** and the sliders optionally let you move or resize that box when it misses the area you want to inspect.
3. Request OpenCode image review, inspect the cited guidance, and optionally write a note. **Save assessment** keeps the current image, results, and note together in this tab.
4. Add a later photo after an adjustment. Use **Compare with** to choose the earlier capture. Changed uploaded comparisons remain unverified because the prototype cannot independently confirm camera and light stability. **Your photos** contains only your uploads.
5. Download saved assessments as JSON to preserve the images, overlays, guidance, sources, selections, and notes. Reloading clears the current tab. Original upload files are not retained on the server or included in the export.

Up to 12 uploads per session, 12 MB each, and 20 million pixels per image. Images must be at least 64 pixels wide and tall. Analysis resizes images to fit 960 by 720 pixels. Equality and dimension checks use the original decoded images before resizing. Pixel measurements refer to that resized image. The overlay expects near-vertical continuous bright stripes. General dent photos can produce insufficient evidence, and ordinary body curvature can produce stripe residuals.

## What is demonstrated

- Deterministic stripe tracing and a transparent, image-space departure overlay.
- An upload-first interface with conservative comparison states. Synthetic fixtures remain available to backend regression tests and are not loaded by the UI.
- OpenCode multimodal selection of predefined visual findings and curated inspection steps. The backend validates source IDs and rejects extra fields. The UI renders vetted text, not unrestricted repair instructions.
- Two curated source summaries with original links and locators. This is a small document collection, not a general search engine. OEM statements are historical and current vehicle-specific applicability remains unresolved.
- Local source-backed templates with explicit provenance, session notes, and JSON export.

No output establishes depth, high/low sign, tool placement, force, paint condition, OEM compliance, repair quality, or an effective physical correction. Synthetic camera/light rejection uses fixture parameters, not a validated real-world motion detector. A replay cannot prove AI advice caused a repair. [Expert review](CONTEXT.md) remains the first validation step. Calibrated deflectometry and physical trials are proposed future work.

## Checks

```bash
uv run pytest
uv run mypy backend scripts
uv run ruff check backend scripts
uv run ruff format --check backend scripts
npm --prefix frontend run typecheck
npm --prefix frontend run format:check
npm --prefix frontend run build
```

The API tests cover the user-agreed analysis and guidance boundaries. External-model tests use HTTP fixtures; they do not establish expert correctness. A live provider check is a separate verification step and uses the configured Go allowance. See [verification notes](docs/verification.md) for the observed results.
