# Prototype knowledge sources

The app stores concise paraphrases, original URLs, locators and applicability notes in `backend/knowledge.py`.

| Source | Used for | Boundary |
| --- | --- | --- |
| [Rivian PDR statement, 2023](https://oemonestop.com/sites/default/files/Rivian_POS_Paintless-Dent-Repair%282-2-23%29.pdf) | Paint inspection, access restrictions and external pulling | Historical statement; it does not establish current vehicle-specific authorization. |
| [Ding King lighting lesson](https://onlinepdrtraining.thedingking.com/paintless-dent-repair/module-b-explanation-of-lights-and-reflections/) | Reflection inspection | Interpretation depends on the lighting setup; an ordinary photo is not calibrated geometry. |
| [KECO precision lifter tutorial](https://www.kecotabs.com/blogs/all/crease-killer-precision-lifter) | Crease-tab alignment, flexible-tab initial reduction and incremental correction | Manufacturer transcript reread November 4, 2026. Its deliberate damage demonstrations are excluded. It does not validate this vehicle's repair plan. |
| [Car Cosmetics PDR FAQ](https://www.carcosmetics.com/en/service/frequently-asked-questions-faq/) | Reflection checks, controlled external pulling and reported-high correction | Supplier guidance reread November 4, 2026. Adhesive preparation remains system-specific. |

The six cards are prototype adaptations. Their approach, steps, tools and expected visual changes are owned by code. The LLM selects a card and supplies observations, shape, assumptions, landmarks and reasoning. A citation establishes the source of a technique, not the correctness of its application to a particular dent.

The crease card now uses the KECO tutorial's correction sequence rather than treating all sharp creases as a referral. Its exact location is an unvalidated image interpretation. The separate KECO 6C collision workflow ends with refinishing and was not incorporated as a PDR completion procedure.

Before/after publisher photos are recorded demonstration inputs. They supply no intermediate actions, force measurements or evidence that AI guidance produced the result. Human PDR expert involvement is not required for this prototype. Physical effectiveness remains untested.
