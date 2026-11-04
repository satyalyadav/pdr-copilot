# Implementation review

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
