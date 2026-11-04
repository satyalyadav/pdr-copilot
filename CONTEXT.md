# AI PDR copilot: working context

## Goal and scope

Rivian Applied Intelligence interview, November 5, 2026. Help novices approach expert PDR quality, speed and consistency; ongoing AI dependence is acceptable. Start with PDR-suitable dents. Deliver a small artifact and short slides, with demonstrated and proposed capabilities clearly distinguished.

## Main solution: vision + LLM + expert repair knowledge

Provide visual guidance grounded in expert techniques and vehicle-specific procedures. The loop is **assess, adjust, reassess**:

1. Supply an image of the dent under reflection lighting.
2. Vision highlights observable distortion and regions to inspect.
3. The LLM explains observations and next inspection steps using cited expert/OEM guidance.
4. The technician acts, then supplies another image.
5. Compare visible changes if camera and lighting conditions allow; otherwise request another capture.

Connecting observations to physical corrections remains unvalidated. Dent detection alone does not establish depth, high/low sign, tool placement or force.

## Interview prototype

- Proposed stack: React, Python/OpenCV, an LLM and curated document retrieval. No initial model training is required; the LLM is undecided.
- Show images, distortion overlays, cited guidance and a sequence of reassessments. FFmpeg can extract timestamped video frames.
- Prefer a real repair-video segment. Replay cannot prove AI advice caused the outcome. Clearly labeled synthetic images are a fallback, not a validated metal simulation.
- Test unchanged images and misleading camera/light changes. Report image evidence and uncertainty; avoid unvalidated repair-quality scores.

## First validation: expert review before a physical pilot

Establish useful output through inexpensive expert review before investing in standardized panels and controlled repairs.

1. Show experts dent images and AI guidance. Assess correctness, usefulness, specificity, missing information and OEM compliance. Record errors and improvements.
2. Have experts blind-judge novice-only versus AI-assisted results, hiding labels and randomizing presentation. For genuine repair outcomes, include starting-dent images. Use separate reviewers or unseen cases to reduce recognition from the first review.
3. If repair outcomes are unavailable, compare novices' assessments and proposed next steps on the same unseen images. This evaluates guidance, not physical repair performance.

Agree on acceptance criteria with experts. Favorable reviews justify further testing, not claims of expert-level repairs or time savings. Differing starting dents limit conclusions from existing physical repairs.

## Follow-up / reach experiment: calibrated deflectometry

Optional later measurement experiment. Photograph known stripes reflected in a test panel with measured camera/screen positions. Compare estimated shape against a known shape or independent measurement. Success supports tracking remaining deformation, not choosing repair actions or forces. It is not a prototype prerequisite.

After expert review, consider a physical pilot with comparable fresh dents, multiple novice/expert technicians, and independent assessment of finish, total time, consistency and damage. Do not reuse repaired sites.

## Sources and current evidence

| Material | Role and status |
| --- | --- |
| [Rivian PDR statement](https://oemonestop.com/sites/default/files/Rivian_POS_Paintless-Dent-Repair%282-2-23%29.pdf) | OEM constraints. The linked 2023 document favors non-damaging glue pulling and specifies paint inspections. Resolve applicable current model/material procedures. |
| [Ding King lighting lesson](https://onlinepdrtraining.thedingking.com/paintless-dent-repair/module-b-explanation-of-lights-and-reflections/) and [GYS manual](https://www.gastec.is/wp-content/uploads/2021/05/GYS053168-MANUAL.pdf) | Expert knowledge candidates. Interpretation depends on lighting setup. GYS was accessible only through indexed excerpts. |
| [Just Kampers](https://www.justkampers.com/videos/index/watch/id/462/), [Bowax](https://bowax.com.tr/academy/galeri/pdr), [Dent Press](https://www.dentrepaircharlotte.com/before-and-after) | Replay candidates. Just Kampers' transcript describes progressive stages. Bowax sampled frames show a pulling action. Inspected clips have camera movement or obstruction; no comparison-ready sequence or reuse license is established. |
| [DLR dataset](https://zenodo.org/records/17900121) and [thesis](https://elib.dlr.de/220402/); [CarDD](https://cardd-ustc.github.io/) | Optional detection imagery/research. They do not establish repair outcomes or action recommendations. |
| [Deflectometry review](https://pmc.ncbi.nlm.nih.gov/articles/PMC5750795/), [OpenCSP/SOFAST](https://opencsp.sandia.gov/opencsp-data/sofast-2-0-data-examples/), [KIT benchmark](https://ies.iar.kit.edu/neu/multiviewdeflectometry.php) | Follow-up measurement methods, code and examples. Not PDR repair sequences. |
| [RDDAC](https://github.com/BaumSebastian/RDDAC), [Waterloo dent research](https://uwaterloo.ca/waterloo-forming-crash-lab/research-areas/legacy-projects/dent-resistance-automotive-panels) | Future force/deformation and physics research. Manufacturing or dent-formation evidence does not establish a repair policy. |

Our searches have not verified a public PDR action/force/outcome dataset. No application or physical experiment exists yet. Next decisions: image sequence, LLM and expert-review cases/criteria.

Start here for the current plan. Supporting detail remains in [feasibility research](research/pdr-feasibility.md) and [repair-sequence research](research/pdr-repair-sequences.md).
