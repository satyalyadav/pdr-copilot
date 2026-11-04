# Curated knowledge and provenance

The application stores short paraphrases, links, and document locators in `backend/knowledge.py`. It renders fixed inspection steps that cite those records. The model can select those steps and predefined visible findings; it cannot supply an arbitrary source URL or physical instruction. This constraint deliberately limits the assistant to inspection.

- [Rivian RCI-52-22-002-2](https://oemonestop.com/sites/default/files/Rivian_POS_Paintless-Dent-Repair%282-2-23%29.pdf), February 2, 2023, page 1. Indexed primary-document text checked November 4, 2026. Direct PDF retrieval failed during this run. The app marks it historical and does not claim to have resolved current procedures, the vehicle's panel material, or paint compliance.
- [Ding King's lighting lesson](https://onlinepdrtraining.thedingking.com/paintless-dent-repair/module-b-explanation-of-lights-and-reflections/), setup section. Page text checked November 4, 2026. The app uses its setup dependence and visibility guidance, without applying its high/low interpretation to an arbitrary photo.

The recapture step includes a proposed fixed-camera/light protocol, labeled as a prototype proposal. The training source supports the need for readable lighting, not the validity of our capture gate. The source summaries do not replace an OEM service procedure or expert assessment.

[OpenCode Go's documentation](https://opencode.ai/v2/docs/console/go/) and authenticated model metadata were checked November 4, 2026. The API key remains in the ignored backend `.env`. The app uses the advertised OpenAI-compatible chat-completions protocol over OpenCode Go's subscription endpoint. It does not call an OpenAI account directly.
