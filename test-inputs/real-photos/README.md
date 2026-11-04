# Real photos for manual testing

These original downloaded images are not loaded automatically by the app. Adding them did not change app behavior. The image files are local-only and ignored by Git because no reuse license was established; download them from the URLs in `sources.json` if needed.

For a conditional repair-action example, use `ncpdr-small-ding-before.webp`, then its corresponding after photo. The before image already contains the publisher’s white circle; it is not an app annotation. A live check selected a controlled glue pull with unconfirmed prerequisites. This subtle ding is less visually dramatic.

For an obvious before/after change, use `denttime-rivian-before.webp`, then `denttime-rivian-after.webp`. Use this pair to check that the current copilot proposes a tangible crease-reduction method and then changes to finish or remaining-shape evaluation. The first shows an obvious depression beneath the rear light. The publisher presents the second as the corresponding repaired panel. The close-up framing is similar, but reflections and viewpoint differ. This is a qualitative example, not a controlled measurement of progress.

Other examples:

- `denttime-silver-door-before.webp` and `denttime-silver-door-after.webp` show a clear dent across a door's body line and the publisher's premium result. The shop also lists a practical result; this is not a verified sequence of intermediate repair stages.
- `denttime-reflection-before.webp` and `denttime-reflection-after.jpg` explain reflection lighting. The source's magnified circles show a local kink before and a smoother line afterward. These circles are part of the original published images, not an app overlay. The physical board at the right is not the dent.
- `white-door-before.webp` and `white-door-after.webp` show a crease near the door join below the window.
- `rivian-tailgate-before.webp` and `rivian-tailgate-after.webp` show another Rivian case with a close-up before and wider after view.
- The blue quarter-panel images show visible paint damage and are excluded from the primary PDR-suitable demonstration. Retain them as a coating-concern stop case.

All pairings are the publishers' accounts. No pair establishes an AI-caused repair, intermediate tool actions, or measured improvement.

## What to test

1. Upload a before photo and click **Assess image**. The normal-photo path goes directly to the vision model; it does not require stripes. Read the dent description, suggested area and source-backed next action.
2. Read the proposed method, tools and expected change. No expert approval or confirmation checkbox is required to see the plan. Physical applicability conditions remain explicit.
3. Add the corresponding after photo and click **Reassess image**. The action note and your observation are optional. Both photos reach the model; unknown repair actions remain unknown. The app compares appearance and suggests a follow-up; this does not establish an AI-caused repair or measured quality.
4. Use the blue damaged-paint case to review the stop behavior. A reported paint concern stops corrections even if the model is unavailable.

## Historical OpenCV check (separate research path)

The existing detector was run on these twelve originals with the default inspection area used by the earlier UI. Every photo returned `insufficient`. Most produced no markers; the red-fender after image produced one tracked stripe and some markers, which is below the detector's own minimum evidence threshold. Dots alone do not establish a dent. The generated internal fixtures `.audit/baseline.png` and `.audit/later.png` each produced eight tracked stripes and visible markers. This confirms execution on drawn stripe patterns, not validated dent detection on real photos. Exact outputs are in `opencv-check.json`.

The detector expects several bright, near-vertical, continuous stripes. These real photos have other reflections, so a failed stripe check does not mean the dent is absent. Use the real photos to test image understanding and the generated fixtures only to test the current stripe feature.

## Provenance

Sources: [N.C.Auto PDR gallery](https://ncpdr.co.uk/pdr-gallery/), [Dent Time](https://denttime.com/), its [reflection-light example](https://denttime.com/door-ding-repair/), and [Dent Press's gallery](https://www.dentrepaircharlotte.com/before-and-after). Exact image URLs are recorded in `sources.json`; additional inspected candidates are in [the research note](../../research/clear-demo-image-sources.md). Files preserve downloaded originals. Camera/lighting conditions and repair methods were not independently verified. No open reuse license was established. Inspection does not prove PDR suitability, repair quality or AI effectiveness.
