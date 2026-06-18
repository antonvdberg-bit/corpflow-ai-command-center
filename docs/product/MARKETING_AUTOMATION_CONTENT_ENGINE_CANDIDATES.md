# Marketing automation content engine — candidate evaluation

**Library:** CorpFlow Candidate & Reference Library (`docs/product/README.md`)

**Status:** `SERIOUS-CANDIDATE / EVALUATE-FIRST` (Google Vids) · `SERIOUS-CANDIDATE / DEPLOY-FIRST-PILOT` (OpenAI GPT Image)

**Verdict:** `CANDIDATE CAPTURED — PILOT RECOMMENDED — NO PRODUCTION AUTOMATION AUTHORIZED`

**Source references:**

- Video: [How to create professional work videos with AI avatars in Google Vids](https://workspace.google.com/blog/ai-and-machine-learning/how-to-create-professional-work-videos-with-ai-avatars-in-google-vids) (Google Workspace Blog, 2026-06-17).
- Image: [GPT Image models prompting guide](https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide) (OpenAI Cookbook).
- Image API: [OpenAI Image generation guide](https://platform.openai.com/docs/guides/image-generation) (Image API + Responses API; GPT Image models including `gpt-image-2`).

**Audience:** Anton (operator), Cursor / Codex Cloud (implementation agents), future contractors.

**Related canonical docs (do not contradict):**

- `docs/strategy/GOOGLE_ACCELERATION_LANE.md` — bounds Google AI tooling to drafts/prototypes; Gemini image tooling listed as visual **draft** lane only.
- `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` — no fake evidence; brand-safe visuals.
- `docs/strategy/ABOVE_THE_LINE_STRATEGY_DOCTRINE.md` — video is leverage for managed outcomes, not the moat.
- `docs/marketing/00_NON_NEGOTIABLE_MARKETING_COMMUNICATION_STANDARD.md` — Hook / Proof / Depth; dual-asset pattern.
- `docs/marketing/04_DELIVERY_QUALITY_GATE.md` — buyer-facing video must pass quality gate before publish.
- `docs/marketing/LR_PROOF_2_VIDEO_PIPELINE_PROPOSAL.md` — **approved** server-side Playwright + FFmpeg path for LR walkthrough screen captures (distinct use case).
- `docs/product/CHAT_DESTINATION_REFERENCE_SOCIAL_INTENTS.md` — future chat/concierge may consume text → voice → **AI-generated video** (not human video).

---

## Purpose

Capture **serious candidates** for a future CorpFlow **marketing automation content engine** — the toolchain and orchestration model for producing buyer-facing and operator-facing **image, video, and related visual** assets at scale.

This document is **candidate evaluation capture**, not implementation authorization. No API wiring, env vars, n8n workflow changes, production publish automation, or committed generated assets are authorized by this PR.

---

## Operator signal (Anton, 2026-06-18)

Anton has used the Google Vids / Gemini Workspace video-creation product set before and considers it a **high-value, free-or-low-friction candidate** that may deliver roughly **80% of the initial marketing video workflow** before CorpFlow invests in heavier custom automation.

Initial verdict for Google Vids:

> **`SERIOUS-CANDIDATE / EVALUATE-FIRST`** — likely best free/low-friction starting point for AI-assisted work-video generation, pending API/automation evaluation.

### Operator signal — OpenAI GPT Image (Anton, 2026-06-18)

Anton has already used **ChatGPT image generation manually for Lux Maurice** and reports **very high-quality output**. This should be treated as a **high-priority candidate** for CorpFlow's upcoming marketing automation asset pipeline — ahead of heavier custom build work.

Initial verdict for OpenAI GPT Image:

> **`SERIOUS-CANDIDATE / DEPLOY-FIRST-PILOT`** — manual ChatGPT UI path is proven for Lux; API pilot is the next bounded step after prompt/library discipline — **not** production automation.

---

## Intended CorpFlow use cases

These describe **where** a content engine would eventually serve CorpFlow — not what is built today:

| Use case | Description | Video target |
| -------- | ----------- | ------------ |
| **Marketing automation content production** | Repeatable generation of proof/validation assets for campaigns, tenants, and productized offers | AI avatar / AI-generated work video |
| **Article-to-video pipeline** | Turn approved articles, runbooks, or blog drafts into short companion clips (Hook → validation path) | AI-narrated explainer from source doc |
| **Product explainer videos** | Explain AI Lead Rescue, tenant offers, Change Console flows to prospects | AI presenter + slides/product visuals |
| **Training / onboarding videos** | Operator and client onboarding from canonical repo runbooks | AI avatar script delivery; repo remains source of truth |
| **Support videos** | How-to clips for common client questions (post-concierge authorization) | AI-generated; not live human camera |
| **Launch / campaign videos** | Time-boxed campaign assets tied to single-offer doctrine | Reviewed before any public surface |
| **Chat / concierge extension** | Future path where approved text scripts become voice or **AI-generated video** in the wider CorpFlow chat/concierge destination | **AI-generated / AI-avatar only — not human video** |

**Non-negotiable:** Future CorpFlow video targets are **AI-generated or AI-avatar content**. Human-on-camera production is out of scope for the default engine unless a separate client-specific packet explicitly authorizes it.

### Image use cases (OpenAI GPT Image)

| Use case | Description | Asset target |
| -------- | ----------- | ------------ |
| **Lux Maurice visual assets** | Hero, lifestyle, property-adjacent, and brand-mood imagery for `lux.corpflowai.com` | AI-generated stills; manual review before publish |
| **Campaign hero images** | Single-offer campaign headers aligned with Hook / Proof / Depth | Reviewed hero still |
| **Article illustrations** | Companion visuals for approved articles and depth assets | Illustration or scene still |
| **Social post visuals** | Attention assets pointing to validation paths (dual-asset pattern) | Square / vertical variants |
| **Landing-page image variants** | A/B or tenant-specific visual variants after copy is approved | Same-origin or Drive-hosted after review |
| **Brand moodboards** | Direction boards for tenant verticals before final asset lock | Internal / operator-only until approved |
| **Product / service explainer imagery** | AI Lead Rescue, concierge, managed-outcome visuals — not fake UI screenshots | Illustration or abstract proof-style art |
| **Ad concept generation** | Pre-production concepts for warm-network or tenant campaigns | Draft concepts only |
| **Article-to-image pipeline** | Approved article → brief → prompt pack → image set | Semi-automated orchestration; generation may stay manual initially |
| **Article-to-image-to-video pipeline** | Approved article → images → motion/video (Google Vids or successor) | Future chained pipeline; not authorized today |
| **AI-generated video workflow support** | Still frames, storyboards, reference plates for Vids / video candidates | Input ingredients only |

**Non-negotiable for images:** Generated assets must **not** be published automatically. No fake dashboards, fake testimonials, fake metrics, or fabricated product screenshots (`GOOGLE_ACCELERATION_LANE.md`, brand doctrine).

---

## Likely automation model (future-state sketch)

This is a **design hypothesis** for evaluation — not a build spec.

```text
Brief / source doc (repo or Drive)
    → n8n orchestration (briefs, scripts, approval tasks, checklists, publish handoffs)
    → Google Vids (manual-first or semi-automated render)
    → Human review (brand + quality gate + above-the-line)
    → Approved asset → Drive folder + optional repo `public/assets/video/` for same-origin hosting
    → Live verification on production URL (Delivery Reality Audit)
```

### Layer responsibilities

| Layer | Role | Maturity assumption |
| ----- | ---- | ------------------- |
| **n8n** | Orchestrate briefs, script drafts, approval tasks, Drive folder placement, asset checklists, publishing handoffs, `automation_events` audit | Governed spine exists today; **chat/video-specific workflows not authorized** |
| **Google Vids** | AI avatars, voiceovers, Slides→video, prompt-directed product demos | **Manual-first or semi-automated initially**; Anton-operated |
| **Gemini API / AI Studio / Veo / Drive+Docs** | Adjacent paths if Vids API exposure is limited — script generation, clip ingredients, longer-form generation | Evaluate in same packet; bounded by `GOOGLE_ACCELERATION_LANE.md` |
| **CorpFlow repo + Vercel** | Canonical hosting for buyer-facing embeds when same-origin is required | Existing LR walkthrough path uses `public/assets/video/` |
| **Human review** | Mandatory before any prospect/client-facing publish | Brand doctrine + 12/14 quality gate |

### API / automation caveat

**API availability must be evaluated before promising end-to-end automation.** As of capture date (2026-06-18):

- Google Vids public product surface emphasizes **Workspace UI workflows** (Slides integration, avatar selection, prompt-directed clips, multilingual voiceovers).
- **Do not assume** a fully headless Vids render API exists or is stable for CorpFlow production automation.
- If Vids itself has limited API exposure, evaluate **adjacent Google paths**: Gemini API script generation, Google AI Studio experiments, **Veo** for generative clip ingredients, Workspace Drive + Docs as the brief/script handoff surface, and NotebookLM Video Overview for doc→narrated draft (already listed in `GOOGLE_ACCELERATION_LANE.md`).

---

## What Google Vids offers (benchmark summary, June 2026)

From the public Google Workspace blog and product positioning:

- **Slides → video:** Auto storyboard + AI avatar script from presentations; re-script when content changes.
- **AI avatars and voiceovers:** Digital presenters; optional voice-only when avatar on-screen is not needed; multilingual expansion (8+ voiceover languages cited; 24 languages for avatar/voiceover from scripts on roadmap).
- **Pitch and demo clips:** Custom avatar with logo/background; emotional delivery steering (rolling out); prompt-directed avatar walking/talking/interacting; high-fidelity clips without stated duration limits for demos.
- **Accessibility / cost signal:** US Google accounts can try AI avatars **at no cost** with broader regional rollout cited; aligns with Anton's "free-or-low-friction" assessment.
- **Scale narrative:** Positioned for sales decks → customer walkthroughs, training replays, and product demos without traditional video shoots.

**Fit for CorpFlow:** Strong for **work-video** and **avatar-narrated explainers** where the source material is already in Slides or Docs. Complements — does not replace — the **screen-capture walkthrough** pipeline used for LR Proof (Playwright + FFmpeg).

---

## Candidate comparison table

| Candidate | Content type | Free / low-cost starting value | API / automation confidence | Manual fallback | CorpFlow destination fit | Evaluation questions | Current verdict |
| --------- | ------------ | ------------------------------ | --------------------------- | --------------- | ------------------------ | -------------------- | --------------- |
| **Google Vids** (Workspace) | AI avatar work videos, Slides→video, voiceover explainers, prompt-directed demo clips | **High** — US try-at-no-cost cited; Workspace already in CorpFlow stack; Anton prior use | **Low–unknown** — UI-first product; headless API not verified | **Strong** — operator creates in Vids UI, exports, manual review + publish | **High** for marketing automation, onboarding, explainers, future concierge video mode | Is there a stable API or Apps Script path? Regional availability for Mauritius operator? Data residency for client scripts? Multilingual needs for Lux / LR? Emotional-delivery quality on brand tone? | **`SERIOUS-CANDIDATE / EVALUATE-FIRST`** — likely best free/low-friction starting point pending API/automation eval |
| **OpenAI GPT Image** (ChatGPT UI + Image API / Responses API) | Stills: heroes, illustrations, social, moodboards, ad concepts, Lux Maurice visuals; edits; article-to-image; storyboard plates for video | **High for manual** — ChatGPT Plus; Anton-proven Lux quality; API is **separate billing** | **Medium for API pilot** — documented Image + Responses APIs; org verification may be required | **Strong** — ChatGPT UI manual-first (proven); API pilot with low-quality batches | **Very high** for Lux, campaigns, social, article illustrations; feeds future video pipeline | Org verified? Monthly API cap? Draft vs final model/size? n8n secret handling? Storage + audit trail? Brand gate workflow? | **`SERIOUS-CANDIDATE / DEPLOY-FIRST-PILOT`** — manual path proven; API pilot next bounded step |
| **NotebookLM Video Overview** | Doc → narrated video/audio summary | High for internal/training drafts | Low — no production pipeline | Manual export + review | Medium — training/onboarding drafts; weak for polished buyer CTAs | Does output pass brand gate without heavy edit? Sensitive doc upload policy? | **DRAFT LANE ONLY** per `GOOGLE_ACCELERATION_LANE.md` |
| **Gemini API + AI Studio** (incl. Veo where applicable) | Script generation, clip ingredients, experimental generative video | Medium — API costs at scale; `$GOOGLE_API_KEY` exists in template | Medium for text/scripts; **Low–medium for video** — model/API surface evolving | Manual prompt iteration in AI Studio | Medium — acceleration for scripts/storyboards; not default publish path | Which models are approved for client-facing render? Cost caps? Fake-evidence guardrails? | **ACCELERATION LANE ONLY** — evaluate alongside Vids, not instead of doctrine review |
| **Playwright + FFmpeg (LR pipeline)** | Silent screen-capture walkthroughs with burned-in captions | Medium — GitHub Actions minutes; already built | **High** for walkthrough YAML → MP4 | Re-run workflow + Anton sign-off | **High for product UI proof**; poor fit for avatar talking-head explainers | When to use vs Vids? Regeneration cadence on copy changes? | **APPROVED for LR-style walkthroughs** — different content class than Vids |
| **OpenAI / other vendor avatar video** | Third-party AI presenter SaaS | Low–medium — subscription + per-minute | Medium on vendor-dependent APIs | Vendor UI | Low–medium — adds vendor + brand-strip risk | Contradicts Google-first operator workflow? Data handling? | **DEFER** — evaluate only if Vids eval fails |
| **Human video shoot** | Live camera production | Low — time and contractor cost | N/A | Always available | Low for default engine — inconsistent, not automation-shaped | Only for exceptional client cases? | **OUT OF SCOPE** for default marketing automation engine |

---

## Relationship to existing LR video pipeline

CorpFlow already has an **approved, implemented** path for **silent UI walkthrough** videos:

- GitHub Actions workflow + Playwright + FFmpeg (`docs/marketing/LR_PROOF_2_VIDEO_PIPELINE_PROPOSAL.md`).
- Output: same-origin MP4 on marketing surfaces (e.g. `/lead-rescue`).

**Google Vids is complementary, not a replacement:**

| Dimension | LR Playwright + FFmpeg | Google Vids |
| --------- | ---------------------- | ----------- |
| Best for | Proving the product UI works (validation asset) | Explainer, pitch, training, avatar-narrated story |
| Narration | Silent + captions | AI avatar / voiceover |
| Automation today | YAML + CI workflow | Manual-first; API TBD |
| Buyer doctrine | Proof / validation (Depth path) | Hook + Proof when script passes gate |

A future **marketing automation content engine** may **route by content type**: walkthroughs → LR pipeline; explainers / campaigns / onboarding → Vids (or successor); **stills / heroes / social / illustrations → GPT Image (manual or API pilot)** after evaluation.

---

## OpenAI GPT Image — operating modes (future-state)

| Mode | Description | Authorization today |
| ---- | ----------- | ------------------- |
| **1. Manual-first** | Anton/operator uses **ChatGPT UI** for high-value images; best prompts and outputs captured into the Candidate Library / Drive | **Allowed** as operator practice (Anton-proven for Lux Maurice) |
| **2. Semi-automated** | n8n or repo process creates briefs, prompt packs, Drive folders, review checklists, publishing handoffs; **generation stays in ChatGPT UI initially** | **Not authorized** as automation until separate packet |
| **3. API pilot** | Evaluate OpenAI **Image API** (`/v1/images/generations`, `/v1/images/edits`) and/or **Responses API** image-generation tool; test prompts only; low-quality / small-batch draft mode first; human review before any public use | **Pilot recommended — not opened**; requires Anton authorization + budget cap |
| **4. Production** | Headless generation, storage rules, audit logging, brand gate at scale | **Not authorized** — requires billing clarity, budget cap, asset storage policy, approval gates, brand review, audit trail |

### Billing separation (critical)

**Do not assume** Anton's **ChatGPT Plus** subscription funds **OpenAI API platform** usage.

| Surface | Billing | CorpFlow implication |
| ------- | ------- | -------------------- |
| **ChatGPT UI image generation** | ChatGPT subscription limits | Manual-first Lux path; scarce; operator-owned |
| **OpenAI API** (Image API / Responses API) | Separate API org billing; per-image token/pricing | API automation is a **separately budgeted** capability requiring explicit authorization and a **monthly cap** |

API pilot mode must not start until Anton sets org verification (if required), enables GPT Image models on the API org, and approves a monthly budget.

### What OpenAI GPT Image offers (benchmark summary, June 2026)

From [OpenAI Image generation guide](https://platform.openai.com/docs/guides/image-generation) and [prompting guide](https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide):

- **GPT Image models** — including `gpt-image-2`, `gpt-image-1.5`, `gpt-image-1`, `gpt-image-1-mini` via Image API (generate + edit) and Responses API (conversational multi-turn editing).
- **Image API** — single-prompt generation and edits (partial or full); optional variations on supported legacy models.
- **Responses API** — multi-turn high-fidelity edits; image File IDs as inputs; image generation as a built-in tool within conversation flows.
- **Customization** — quality, size, format, compression; transparent backgrounds where model supports.
- **Organization verification** — may be required in OpenAI developer console before GPT Image API use (documented on platform guide).
- **Prompting discipline** — cookbook covers composition, style, text-in-image, reference-image consistency; relevant for Lux brand recurrence.

**Fit for CorpFlow:** Strong for **Lux Maurice**, tenant campaign heroes, and article/social illustrations where Anton has already validated ChatGPT UI quality. Complements Google Vids for **article → image → video** chains (images first, motion later).

### API / evaluation questions (GPT Image — record before pilot)

1. Does the current OpenAI account / API org have **image generation enabled**?
2. Is **organization verification** required before using GPT Image models (`gpt-image-2`, etc.)?
3. What **monthly API budget cap** should be set for pilot?
4. Which **model / quality / size** for draft vs final assets (`gpt-image-1-mini` draft vs `gpt-image-2` final)?
5. Can **n8n** call the Images API safely without exposing secrets (forward pattern vs direct key on box)?
6. Where are generated assets stored — **Drive**, repo `artifacts/`, or object storage?
7. What is the **human approval step** before publication (quality gate ≥ 12/14)?
8. How do we prevent accidental generation of **client-sensitive, misleading, or off-brand** images?
9. How do we track **prompt, source article, output asset, reviewer, publication status**?

### Known limitations (GPT Image)

- **API usage costs extra** beyond ChatGPT Plus — separate platform billing.
- **Complex prompts** may have latency; batch jobs need timeouts and idempotency if automated later.
- **Text rendering in images** may still require human review (prompting guide warns on typography).
- **Brand consistency** across recurring elements may need prompt discipline + reference images.
- **Layout-sensitive compositions** may need manual review or post-edit in ChatGPT UI.
- **Generated assets must not be published automatically** — human review mandatory.
- **No committing generated assets** unless Anton explicitly supplies and approves them for repo inclusion.

---

## Evaluation packet (not opened — named only)

When Anton authorizes next step, a separate packet should answer:

1. **API surface** — Vids headless/API, Apps Script, Workspace add-ons, or manual-only with n8n checklist orchestration.
2. **Regional access** — Mauritius operator + future client regions.
3. **Data classification** — what may enter Vids (no sensitive client data without security review per `GOOGLE_ACCELERATION_LANE.md`).
4. **Brand gate** — sample renders scored against `04_DELIVERY_QUALITY_GATE.md` (target ≥ 12/14).
5. **Dual-asset pattern** — every attention clip points to a validation asset (repo page, walkthrough, or depth doc).
6. **Cost model** — free tier limits, Workspace SKU requirements, per-minute overages at 10 / 50 / 200 videos.
7. **Concierge convergence** — whether approved Vids outputs can feed `docs/product/CHAT_DESTINATION_REFERENCE_SOCIAL_INTENTS.md` future video mode (text → voice → AI video).
8. **n8n orchestration v0** — manual-first checklist workflow only (no secret changes until packet approves).

**GPT Image pilot packet (not opened — named only):** `OpenAI-GPT-Image-API-Pilot-1` — test prompts, low-quality small batches, artifact storage only, Anton review gate, monthly API cap documented, no public publish automation.

---

## Guardrails (this candidate capture PR)

- **Docs only.**
- Do **not** implement Google Vids or OpenAI GPT Image integrations.
- Do **not** add env vars or edit `.env.template`.
- Do **not** handle OpenAI API keys in Cursor or commit keys to the repo.
- Do **not** change app code, public routes, or hosting paths.
- Do **not** modify n8n workflows.
- Do **not** run server / L3 commands or add containers.
- Do **not** start **restic**.
- Do **not** authorize production image generation automation or publishing automation.
- Do **not** commit generated assets unless Anton explicitly supplies and approves them.
- Do **not** authorize Chatwoot, Open WebUI, Dify, Coolify, Langfuse, AgentSpan, OpenJarvis, generic chatbot frameworks, or any new self-hosted tool.
- This is **candidate capture for marketing automation**, not implementation.

Any runtime or orchestration work requires a **separate named execution packet**, Google Acceleration adoption checklist where applicable (`docs/operations/GOOGLE_ACCELERATION_ADOPTION_CHECKLIST.md`), and Delivery Reality Audit for customer-visible outputs.

---

## Document history

| Version | Date (UTC) | Change |
| ------- | ---------- | ------ |
| v1 | 2026-06-18 | Initial capture — Google Vids as `SERIOUS-CANDIDATE / EVALUATE-FIRST` for marketing automation content engine. |
| v2 | 2026-06-18 | Added OpenAI GPT Image as `SERIOUS-CANDIDATE / DEPLOY-FIRST-PILOT`; operating modes, billing separation, API eval questions, Lux Maurice operator signal. |
