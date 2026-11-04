# Verification record

Checked locally on November 4, 2026. Scope: the working prototype in CONTEXT.md, with labeled synthetic inputs and photo uploads. The user confirmed the analysis and guidance API test boundaries. The review baseline is research-only commit `48869db`.

## Observed behavior

- The final suite passed all 15 API tests. Python typechecking, linting, and formatting checks passed for the backend and runner. Frontend formatting, TypeScript checks, and the production React build passed. Exact commands and completed output are retained in `.audit/final-checks.log`.
- Chrome checks of the simplified flow covered upload, one-click assessment with a live OpenCode review, the checked-area outline, an in-panel 422 error, saving a note, JSON export, previous-photo comparison, and a 390-pixel viewport with no horizontal overflow. `/`, `/health`, and `/api/health` return 200 for GET and HEAD on port 8000; unknown paths still return 404.
- Two read-only reviews by Claude Opus 5.5 at high effort checked the UI simplification. The first found three P1 issues: missing limits copy, off-screen assessment errors, and an invisible checked area. All three were fixed; the second review found no remaining P0 or P1 issues.
- API tests passed for unchanged pixels, known synthetic camera/light motion, fixed synthetic changes, malformed input, unverified uploaded comparisons, known citations, invalid model output, provider errors, and timeouts.
- A real OpenCode Go request using `deepseek-v4.1-flash` returned HTTP 200, predefined visible findings, and valid source-backed inspection steps. An earlier pay-as-you-go request failed for insufficient account funds. The default now uses the user's Go subscription route.
- Chrome automation followed the UI through image assessment, technician note entry, record creation, JSON export, camera-motion rejection, the unchanged control, synthetic comparison, and a live DeepSeek image review. The downloaded export parsed as JSON and contained the recorded assessment.
- Separate Chrome checks uploaded two fixture images through the file input, assessed both, observed the unverified-capture warning, changed the region with the keyboard slider, and confirmed that old evidence cleared before reassessment.
- The mobile viewport measured 390 pixels wide with a document width of 390 pixels. The browser reported no JavaScript errors in either UI check. Desktop and mobile screenshots were inspected locally.

Post-review checks also confirmed the selected-region difference description, cyan changed-pixel overlay, paired comparison chart, original-image dimension handling, and cleanup of a detached grandchild. The revised UI smoke check again found no browser errors or horizontal overflow.

Raw local verification artifacts are in the ignored `.audit/` directory. The upload fixtures originated from this application's synthetic generator. They verify the upload path, not performance on real photographs.

## Practical limits

The app has not assessed a physical repair or been reviewed by a PDR expert. A successful provider request verifies integration, not advice quality. The current source set is two paraphrased documents with original links. Current OEM applicability remains unresolved.

The overlay fits straight references to continuous near-vertical bright stripes outside the selected region. Curvature, glare, occlusion, noise, and other patterns can defeat that heuristic. A pixel residual is not depth, a dent classifier, or a repair-quality score.

Synthetic comparison rejection uses known fixture settings. The software cannot independently verify real camera or light pose and refuses progress claims for changed uploads. The replay's changes are predetermined. It does not validate optical reconstruction, physical correction, novice improvement, time savings, or AI-caused repair outcomes.
