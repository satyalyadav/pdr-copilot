# Verification: novice PDR copilot

November 4, 2026. Acceptance follows [AGENTS.md](../AGENTS.md). The former expert-approval flow is superseded.

## Current evidence

- **23 API tests passed.** The guidance boundary covers tangible crease proposals without expert/setup gates, malformed output, invented methods and instructions, reported-high restrictions, coating stops without a provider call, finish evaluation without a user diagnosis, unchanged-image handling and inconsistent shape/action rejection. The stripe-analysis and health regressions also passed. Evidence: `.audit/novice-final-tests.log`.
- Python typechecking, lint and formatting, frontend formatting, and the TypeScript/production build passed. Build evidence: `.audit/novice-final-build.log`.
- **The initial three real provider API requests passed.** The Rivian before image selected `crease_pull`; the after image selected `finish_check` with a tentative `looks_flatter` comparison; identical before images returned `no_visible_change`. The first request contained only the before photo. No repair actions or outcome diagnoses were supplied. Evidence: `.audit/novice-live.json` and `.audit/novice-live.log`. The final implementation uses a model-free identical-image rule, so the current verifier makes only two paid calls. Reproduce intentionally with `timeout -k 10s 360s uv run python -m scripts.verify_copilot --output .audit/new-live-run.json`; this makes two paid calls and refuses to overwrite prior evidence.
- **The actual Chrome UI and live backend/provider loop passed without response fixtures.** Upload before, assess, upload after, leave notes and observations at their defaults, reassess, then export two cycles. The initial UI call selected `controlled_pull`; the follow-up selected `finish_check`. The browser captured the request fields and actual API responses. It verified that prior instructions disappeared while the new image awaited assessment, no confirmation checkboxes were present, export contained both cycles, and a 390-pixel viewport had no horizontal overflow or page errors. Evidence: `.audit/verify-novice-ui.py`, `.audit/novice-ui-check.json`, `.audit/novice-ui-export.json`, and `.audit/novice-ui-before.png`, `novice-ui-after.png`, `novice-ui-mobile.png`. The job-owned browser exited after the check.

**After the review fixes, a fresh live Chrome run passed three cycles:** initial crease reduction, finish evaluation on the smoother panel, then no-change inspection on an identical after photo. All exported action notes stayed empty and outcomes stayed `not_reported`. The unchanged cycle used `identical_image_rule` without a provider call. Desktop and mobile layout, export, and browser cleanup passed. Evidence: `.audit/novice-ui-final-check.json`, `.audit/novice-ui-final-export.json`, `.audit/novice-ui-final-before.png`, `novice-ui-final-after.png`, and `novice-ui-final-mobile.png`.

The live runs returned useful qualitative guidance. Their initial classifications differed between a creased low and a broad low, showing that the interpretation and technique choice remain model-dependent. Technique-to-shape constraints now also reject pulls on a stated high, finish evaluation for a stated low, and crease-specific instructions for a non-crease. Failing regressions and the final live UI run verified the revised behavior. See [review](review.md) for findings and dispositions.

## What this establishes

The software can connect photo-specific observations to a curated method, show tools and expected change, then compare a later photo and update the next step. The novice does not need an expert approval, another photograph or a diagnosis of the result to run the demonstration.

The supplied pair shows a recorded shop repair. No synchronized intermediate actions are known. Neither the replay nor passing tests establish that the proposed method is correct for this panel, that AI advice caused a repair, or that a novice matches expert performance. Exact contact points, force, material, coating integrity and current vehicle authorization remain unmeasured. Physical methods are conditional proposals with explicit applicability conditions.

## Compact assessment layout

Kiro Claude Opus 5.5 High implemented a presentation-only redesign. The observation paragraph no longer renders; the focus, adjustment, complete steps, tools, expected change and pause condition remain visible. Secondary reasoning is under the collapsed physical-check details, and comparison evidence is expandable. The case export still retains the full observation.

Chrome checks used the recorded real-provider before/after responses, without new provider calls. They exercised assessment, stale-plan suppression on a new photo, reassessment, export, collapsed details, and readable steps at 1366×900, 1280×720 and 390×844. No horizontal overflow or page errors occurred. At 1366×900 the full collapsed assessment fits in the viewport; at 1280×720 the end of the pause box is just below the fold. Mobile uses natural single-column scrolling. Evidence: `.audit/compact-ui-check.json`, `.audit/compact-ui-export.json`, `.audit/compact-ui-desktop.png`, `.audit/compact-ui-laptop.png`, `.audit/compact-ui-after.png`, `.audit/compact-ui-mobile.png`. Typecheck, formatting and production build passed. No backend or guidance-policy changes were made.

## Earlier checks

The earlier verification counted an expert referral as a successful live loop. That established request/rendering behavior but failed the current product acceptance criteria. Its records remain in `.audit/live-ui-check.json`, `.audit/live-ui-export.json` and `.audit/live-current-pair.json`; they are historical evidence, not acceptance of the current novice workflow.
