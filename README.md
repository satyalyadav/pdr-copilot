# AI PDR copilot

An assess, adjust, reassess prototype for novices. Computer vision through a vision-capable LLM connects the uploaded dent photo to curated repair knowledge. The system explains its next adjustment, location, tools, reasoning and expected change, then evaluates the next photo. [AGENTS.md](AGENTS.md) defines the product goal.

## Run

Requires Linux/WSL2, Python 3.12+, uv, Node 20.19+ or 22.12+, and npm.

```bash
uv sync --group dev
npm --prefix frontend ci
cp .env.example .env
# Set OPENCODE_API_KEY in .env.
./scripts/dev.sh
```

Open http://localhost:5173. The API listens on 127.0.0.1:8000. The supervised runner stops both servers after four hours or Ctrl+C. `PDR_DEV_SECONDS=28800 ./scripts/dev.sh` allows eight hours. Ownership and deadlines are recorded in `.audit/jobs.log`. Restart the runner after backend changes.

The key stays on the backend. The configured model is DeepSeek V4.1 Flash through OpenCode Go; model and endpoint remain configurable. The app keeps an honest user agent and session ID. It does not change billing or privacy settings, switch providers, retry automatically, or replace failed model output with a fabricated assessment.

## Use the loop

1. Upload a dent photo and select **Assess image**. Read the visible evidence, focus area and proposed next action beside the photo. The outline locates damage approximately; it is not a tool-placement measurement.
2. Review the approach, tools, steps and expected change. Assumptions and physical applicability conditions remain available below the plan. No expert approval or confirmation checkbox is required to see guidance.
3. Add the next photo and select **Reassess image**. Action notes and your own observations are optional; the system assesses the result. A reported raised spot excludes another pull, and a reported coating concern stops corrections without depending on the provider.
4. Browse **Case photos** and use **Export case** to retain observations, plans and notes as JSON. Export excludes photo bytes. **Reset case** clears the photos, assessments and notes so you can start over without reloading. Keep one dent per case; reloading also clears the tab.

For the primary demonstration, upload `test-inputs/real-photos/denttime-rivian-before.webp`, assess it, then add `denttime-rivian-after.webp`. Leave the action note blank when individual repair steps are unknown. These are recorded shop photos, not a repair caused by this app. Images stay local because reuse permission is unverified. The paired after photo is never included in the first assessment.

## Precision demo

Select **Precision demo** to try the calibrated synthetic setup. Switch between **Original dent**, **Scripted improvement** and **Unchanged control**. The reflected stripes and the reconstructed center profile update together. The known synthetic shape is drawn beside the estimate so the result can be checked.

A virtual pinhole camera observes a reflective panel and an active stripe screen at known positions. The renderer applies the law of reflection. OpenCV decodes 16 phase-shifted images, and reflection geometry plus numerical integration recovers height using the flat outer edge as the zero reference. The reconstruction receives only those images and the calibration, not the prescribed dent depth or shape.

This mode generates its images locally and uses the existing repair cards without an LLM call or new dependencies. The stage change is predefined. It demonstrates measurement in an ideal calibrated simulation, not a predicted repair, real-world accuracy, or calibrated measurements from the ordinary car photos. The normal photo copilot remains a separate mode and retains its case when switching views.

A short explanation for the interview: "Known geometry lets us turn reflected patterns into a shape estimate. We compare it with the synthetic truth, then repeat after a scripted change."

References: [Sandia SOFAST](https://opencsp.sandia.gov/opencsp-data/sofast-2-0-data-examples/) and [KIT's deflectometry principle and ambiguity](https://ies.iar.kit.edu/neu/multiviewdeflectometry.php). This prototype is a small independent simulation; it does not run either project's implementation.

## Guidance and limits

The model describes visible damage, classifies the shape, states assumptions and chooses a technique. Python renders six curated cards: controlled low reduction, incremental crease reduction, remaining-shape inspection, finish evaluation, reported-high correction and stop for coating concerns. The selected method and image landmarks make the guidance specific to the current case. Steps, tools and expected changes come from code, not unrestricted model-written repair instructions.

Repair actions are labeled **proposed adjustments**, with vehicle, coating and product applicability conditions. The prototype does not determine safe force, exact tab position, material, paint integrity or current OEM authorization from photos. It has demonstrated no physical repair, expert parity or time saving. See [source notes](docs/source-notes.md) and [verification](docs/verification.md).

The normal-photo UI calls `/api/guidance`. The older `/api/analyze` stripe-tracing API remains a separate research path; readable stripes are not required by the main UI. Guided multi-angle capture and real-world calibrated acquisition remain deferred. The optional Precision demo uses a separate known virtual setup.

Uploads accept PNG, JPEG or WebP, up to 12 photos per tab and 12 MB/20 million pixels per photo. The backend applies EXIF orientation and resizes to fit 960×720 for the model. Photos go to the configured external provider only when assessed; the server does not retain them.

## Checks

```bash
uv run pytest
uv run mypy backend scripts
uv run ruff check backend scripts
uv run ruff format --check backend scripts
npm --prefix frontend run format:check
npm --prefix frontend run build
```

The API regressions mock only the provider boundary. They verify application behavior, not repair correctness. To check before and after photos with two sequential paid provider requests, followed by a model-free unchanged-image check:

```bash
timeout -k 10s 360s uv run python -m scripts.verify_copilot
```

The verifier saves results atomically to `.audit/novice-live.json` and refuses to overwrite existing evidence. Use a new `--output` path for an intentional new run. It checks tangible initial guidance, follow-up evaluation and no claimed improvement for identical pixels. It does not validate a physical repair.
