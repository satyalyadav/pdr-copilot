# Implementation review

## Novice copilot revision, November 4, 2026

Two read-only Kiro Claude Opus 5.5 High reviews examined the changes from working-tree snapshot `9606e1028ab8422b85dd3f113e64bef194fdc85a` against AGENTS.md. The provider returned high effort and semantic-review mode. Kiro exposes no service-tier or fast-mode controls; neither fast nor priority processing was requested.

### Standards

The reviewer confirmed one correctness issue: a `raised_spot` classification could select an outward pull. It also identified two code-design issues: blank action notes were replaced by generated prose in exports, and shape rules were scattered. The revision gives each technique its allowed shapes, rejects incompatible choices, and preserves empty user notes. A reported high can use only the high-correction or inspection/stop methods.

The reviewer noted that allowing correction proposals after an optional `looks_flatter` or `unsure` impression needed an explicit acceptance test. That test now checks that the current image assessment still determines the proposal. A raised-spot pull and false finish choice are rejected through the guidance API.

Standards review: <t3-thread://v2/a56b48dc-41f8-44f1-aa31-d481398080c1/thread:delegated-task:command%3Amcp%3Ada85d034-f3ab-41ea-baf2-d41bd3bbb8a1%3Adelegate-task%3A516368b6-471b-4999-a72b-f0bd264b2021>

### Spec

The reviewer approved the main direction and confirmed tangible image-specific guidance, no expert or extra-photo gates, conditional physical proposals and honest recorded-pair labeling. It identified two behavior gaps: identical images could change the phase through model variation, and absent outcomes defaulted to an asserted lack of correction. Defaults are now `not_reported`. Identical images bypass the provider, preserve the earlier shape when available, and return no-change inspection rather than a new physical correction or finish claim. A prior coating stop remains a stop.

The technician-era wording was removed. The optional coating-concern report intentionally triggers a system rule without a model call. It does not require the novice to diagnose the result in the ordinary loop and cannot depend on provider availability.

Spec review: <t3-thread://v2/a56b48dc-41f8-44f1-aa31-d481398080c1/thread:delegated-task:command%3Amcp%3Ada85d034-f3ab-41ea-baf2-d41bd3bbb8a1%3Adelegate-task%3Aad4cd60a-9b2e-42e2-825d-0bdc3830dee0>

### Verification and decision trail

The author reproduced the raised-spot and identical-image gaps as failing API regressions, then verified the fixes. Raw red and green results are in `.audit/novice-review-red.log` and `.audit/novice-review-green.log`. The original earlier shape-validation failure is also preserved from the parent transcript in `.audit/novice-original-red-transcript.jsonl`, resolving the reviewer's missing-red-evidence concern.

The final live Chrome run passed before, after and unchanged-photo cycles, including empty action notes and unknown outcomes in the export. Evidence: `.audit/novice-ui-final-check.json`, `.audit/novice-ui-final-export.json`. The job-owned browser exited. A separate supervised development server remains available intentionally with a four-hour deadline, recorded in `.audit/jobs.log`; browser closure was never a claim that the development server stopped.

The fixes received author-run regression and live checks, not another independent review. The model's qualitative classification and physical effectiveness remain unvalidated.

Summary: Standards reported one correctness issue and two design heuristics, all addressed. Spec reported two behavior gaps and two minor observations, addressed or documented. The most consequential issues were pulling a stated high and changing the assessment from identical pixels.

## Earlier implementation review

This records earlier revisions. For the normal-photo implementation and Kiro reviews, see [verification.md](verification.md).

Two independent read-only reviews compared `48869db...50bf4a4`, using CONTEXT.md and the user's clarified scope. Both used GPT-6.1 Terra at high effort with standard service. The tool does not support a separate fastMode setting. The coordinator fixed the findings below; the revisions received targeted checks rather than a second independent review.

## Standards

The reviewer reported three correctness findings:

- The runner's process-group cleanup could leave a descendant that detached into another session. The runner now uses a Linux child subreaper, checks each descendant's process identity before signaling, and performs bounded termination and reaping. A temporary reproduction confirmed that it adopts and removes a detached grandchild.
- Image resizing happened before equality and dimension checks. Uploads now retain the original decoded size and a fingerprint of the original oriented pixels. API regressions cover original dimensions that resize to the same dimensions and a small change that must not be called identical.
- Initialization could replace an upload added while the initial requests were pending. Initialization now merges built-in demos with existing uploaded captures.

No additional actionable code smells were reported. Three findings were addressed. The most consequential documented issue was detached-child cleanup.

## Spec

The reviewer reported one partial requirement. CONTEXT.md asks to compare visible changes when capture conditions allow, but the original UI displayed a generic comparison summary. Comparable synthetic captures now return selected-region and outside-region pixel differences, a cyan difference overlay, and paired stripe-reference departures. The UI describes the visible change and displays the overlay and bar chart without a repair-quality claim. Changed uploads remain unverified.

One finding was addressed. The missing visible-change description was the sole spec finding.

## Evidence review

GPT-6 Astra at low effort reviewed the decision trail and verification claims. It confirmed the live-request and UI evidence, and flagged missing test/build/typecheck outputs in the transcript excerpt supplied to it. Completed command outputs are now retained in `.audit/final-checks.log`, with an appended decision-log entry linking that evidence. This was a missing evidence pointer, not a failed check.

## UI simplification review

Claude Opus 5.5 at high effort reviewed the uncommitted UI simplification twice, read-only. The first review found no P0 issues and three P1 issues: shortened finding text dropped the limits caveat, assessment errors appeared above the scrolled-to result, and the analyzed area was hidden by default. It also noted that finding labels depended on English substrings.

The fixes added a fixed limits line and a conditional dot explanation, moved assessment errors into the result panel with an alert role, showed the checked-area outline and no-stripes message after every assessment, and made the backend return finding IDs for stable label mapping. Re-clicking the selected photo no longer clears results, notes survive area and comparison changes, and health probes accept GET and HEAD.

The second review found no remaining P0 or P1 issues and confirmed the fixes in code, at 390 pixels, and at desktop width. It used a fake provider response for the AI path so the review did not consume Go allowance.
