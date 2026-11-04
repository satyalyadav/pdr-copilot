# AI PDR copilot

## Goal

Help novices approach experienced PDR results by reproducing
expert perception, decision-making, execution guidance, and
evaluation through an AI copilot.

Combine computer vision, an LLM, and documented expert repair
knowledge to guide a novice through repairing a dent.

## Core loop

Assess, adjust, reassess:

1. The novice photographs the dent.
2. The system assesses it and explains the next adjustment.
3. The novice applies the guidance and photographs the result.
4. The system evaluates the visible changes using the photos
   and available action history, then updates its guidance.
5. Repeat as the dent changes.

The system owns the reasoning and evaluation. The novice
performs the physical actions and supplies images and observations.

## Guidance requirements

- Give concrete, image-specific guidance: what to do next,
  where, why, which tools are needed, and what change to expect.
- Use existing documented expert knowledge. Require no human
  PDR expert involvement in building, demonstrating, or operating
  this prototype.
- Do not substitute "consult an expert" for the AI's reasoning.
- Prioritize useful qualitative advice over precise measurements.
  State assumptions briefly. Do not invent measurements,
  physical details, or claims of repair success.

## Current prototype

- Demonstrate the loop using the existing Rivian before/after
  image sequence.
- Assess the first image independently. Introduce the second
  image afterward to evaluate visible changes and update guidance.
- Do not block the demonstration on additional photographs.
- Treat the pair as a recorded repair example. Do not invent
  intermediate actions or claim the AI caused the repair.
- Defer guided multi-angle capture and precision improvements
  until the basic loop works.

## Acceptance

- The first image receives tangible guidance specific to its dent.
- The second image receives a comparison and an updated next step.
- Identical images never count as evidence of improvement.
- Verify useful assistance across the loop, not merely successful
  API responses.
- Preserve this objective across implementation and review.
  Propose changes to the agreed scope before adopting them.
