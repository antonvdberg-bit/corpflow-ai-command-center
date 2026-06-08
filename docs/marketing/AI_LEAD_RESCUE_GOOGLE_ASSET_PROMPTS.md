# AI Lead Rescue — Google / Gemini Asset Prompts

**Audience:** the operator using Google AI tools (Gemini, AI Studio, NotebookLM, Gemini image / Nano Banana tooling, AI Studio multi-speaker audio, Opal, Pomelli, Gemini Canvas) to draft AI Lead Rescue collateral.

**Status:** Prompt library. Docs-only — no generated images committed, no audio committed, no published external posts. Every prompt produces a **draft** that must pass `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` and `docs/marketing/04_DELIVERY_QUALITY_GATE.md` before any external use.

**Anchor sentinel:** `<!-- AI_LEAD_RESCUE_GOOGLE_ASSET_PROMPTS_V1 -->`

<!-- AI_LEAD_RESCUE_GOOGLE_ASSET_PROMPTS_V1 -->

## What this doc is for

The companion to `docs/marketing/AI_LEAD_RESCUE_MARKETING_ASSET_PACK.md`. Where the asset pack defines **what** to produce, this doc defines **the exact prompts** to paste into Google AI tools to produce the **first draft**.

Every prompt in this doc is bound by `docs/strategy/GOOGLE_ACCELERATION_LANE.md` — Google tools are **fuel, not the moat**, and they produce drafts only. Final production stays on CorpFlowAI app + GitHub + Vercel + Postgres + n8n + ERPNext. Sensitive client data is prohibited from these tools without a separate security / privacy review.

## Common preamble (paste at the top of every prompt below)

Every prompt in this doc opens with the same brand / doctrine preamble. Paste it verbatim into the Google tool so the draft has the right constraints from token 1.

```text
You are drafting marketing collateral for AI Lead Rescue —
a managed lead-response operating workflow for owner-managed
businesses in Mauritius and similar markets.

Brand tone: respectful, direct, owner-friendly, non-technical.
Sound like a sharp operations partner, not a hype-driven AI
vendor. Use short sentences and concrete outcomes.

Hard rules — do not break any of these:

- No guaranteed revenue. Allowed framing: "existing enquiries
  get captured, alerted, and tracked". Forbidden: "X new
  clients", "Y% growth", "never miss another lead".
- No generic AI agency positioning. AI Lead Rescue is a
  managed lead-response operating workflow, not a chatbot,
  not an AI agent, not a CRM replacement, not a sales-team
  replacement.
- No fake client testimonials. No invented quotes presented
  as real client praise.
- No fake client logos. No real company logos used to imply
  a relationship that does not exist.
- No sensitive data. Do not produce or assume any real
  client name, email, phone, bank, medical, financial, or
  ID data. Use placeholder initials only.
- Single offer: USD 150 launch pilot, 48-hour managed setup,
  7-day monitoring window. No tiers, no discounts, no
  add-ons in copy. Variations live operator-side.
- Above-the-line: managed outcomes and human accountability,
  not generic AI novelty.
- Human operator framing: a person (operator) reviews every
  intake; AI tools are internal acceleration only; customer-
  facing replies stay with the buyer.

Canonical primary CTA: "Start my 48-hour setup".
Canonical secondary CTA: "See how it works".
Canonical alternate CTAs:
  - "Send us your lead problem and we'll tell you if the
     48-hour setup fits."
  - "Start with one pilot."
  - "We'll review your intake before invoicing."

Visual direction: deep navy `#07111F` base, off-white
`#F8FAFC` content surfaces, teal `#2dd4bf` action accent.
No robots, no neon AI swirls, no brain icons, no generic
cyberspace art, no stock-photo handshakes.

Output language: English by default. If asked for French
or Mauritian Creole, mark the output as DRAFT —
REQUIRES HUMAN REVIEW.

Now produce the asset described below.
```

Operator hygiene rule: **never paste the preamble + a confidential client name or real client data into the same prompt**. Use placeholder initials (`M.`, `K.`, `D.`) for any persona detail.

## 1. Visual workflow diagram

- **Tool.** Gemini image / Nano Banana, or any image generator that respects layout prompts.
- **Goal.** Single horizontal diagram showing *missed enquiry → owner alert → lead log → follow-up board → daily summary*.
- **Brand tone.** Calm operations-desk, premium, structured, high-trust.
- **Prompt.**

  ```text
  {PREAMBLE}

  Produce a single horizontal workflow diagram. Five stages,
  left to right, connected by thin teal arrows:

  1. "Missed enquiry" — icon: a speech bubble with a subtle
     red dot indicating unanswered.
  2. "Owner alert" — icon: a phone showing a WhatsApp + email
     notification preview, no real names.
  3. "Lead log" — icon: a structured spreadsheet row with a
     status pill.
  4. "Follow-up board" — icon: a five-state pipeline (new /
     replied / followed-up / qualified / won-or-lost).
  5. "Daily summary" — icon: a clean one-page summary card.

  Background: deep navy `#07111F`. Cards: off-white `#F8FAFC`.
  Accents and arrows: teal `#2dd4bf`. Typography: modern
  sans-serif (Inter or similar).

  No robots, no neon AI swirls, no brain icons, no stock-
  photo people, no real client names, no real logos.

  Output: a single 1920 × 1080 image suitable for landing
  page hero, social post, and deck slide.
  ```

- **Compliance guardrails.** No fake screenshots. No real PII. No medical / financial visual content. No before/after revenue overlays.

## 2. Property-business social image

- **Tool.** Gemini image / Nano Banana.
- **Goal.** A clean professional Mauritius real-estate office / mobile alert / lead-board concept (1080 × 1080).
- **Brand tone.** Calm, professional, owner-managed shop aesthetic.
- **Prompt.**

  ```text
  {PREAMBLE}

  Produce a 1080 × 1080 social image for the Mauritius real-
  estate / property niche.

  Composition:
  - A clean Mauritius real-estate desk in soft natural daylight.
  - On the desk: a laptop showing a single-day lead summary
    with three property enquiry rows (placeholder initials
    only — no real names, no real phone numbers, no real
    email addresses).
  - A phone next to the laptop showing a WhatsApp alert
    preview ("New viewing enquiry — Villa Tamarin, MUR 8M").
  - A small paper notebook with a viewing schedule sketched
    in pen.
  - No agents shown in the frame.
  - Background: blurred Mauritius office daylight; window with
    soft greenery hint.

  Aesthetic: calm operations-desk. Deep navy `#07111F` accent
  inside the laptop UI. Teal `#2dd4bf` status pill on the
  highlighted row.

  No robots, no neon AI swirls, no brain icons, no agency
  branding, no real Property24 / Lemons / Lexpress UI mock.

  Overlay text (top-left, sans-serif, off-white):
    "Stop losing leads because follow-up is too slow."
  Overlay URL (bottom-right, sans-serif, teal):
    "corpflowai.com/lead-rescue"
  ```

- **Compliance guardrails.** No real PII. No real Mauritius agency branding. No real portal UI mockups (Property24 / Lemons / Lexpress). No revenue numbers.

## 3. Contractor / trades social image

- **Tool.** Gemini image / Nano Banana.
- **Goal.** Missed call / job enquiry / follow-up board concept (1080 × 1080).
- **Brand tone.** Practical, professional, no chaos.
- **Prompt.**

  ```text
  {PREAMBLE}

  Produce a 1080 × 1080 social image for the contractor /
  trades / home-services niche.

  Composition:
  - A clean tradesperson workspace: a job-site notebook open
    to a quote-pipeline drawn in pen.
  - A phone resting on the notebook showing a missed-call
    indicator AND a WhatsApp enquiry preview ("Quote needed —
    rewire 3-bed villa, Curepipe").
  - A tablet showing a single-day lead summary with three
    quote-enquiry rows (placeholder initials only).
  - No people shown in the frame.
  - Calm, practical lighting. Minimal — no tools sprawled
    chaotically; no hard-hats; no stereotype trades imagery.

  Aesthetic: calm operations-desk. Deep navy `#07111F` accent
  on the tablet UI. Teal `#2dd4bf` status pill.

  No robots, no neon AI swirls, no brain icons, no contractor
  brand logos.

  Overlay text (top-left, sans-serif, off-white):
    "A quote went cold because you didn't reply in time?"
  Overlay URL (bottom-right, sans-serif, teal):
    "corpflowai.com/lead-rescue"
  ```

- **Compliance guardrails.** No real PII. No real contractor branding. No before/after revenue overlays. No invented MUR figures shown as actuals.

## 4. Clinic / admin social image

- **Tool.** Gemini image / Nano Banana.
- **Goal.** Patient/admin enquiry workflow without medical detail or clinical claims (1080 × 1080).
- **Brand tone.** Calm, administrative, professional. Reads as front-desk admin, not clinical.
- **Prompt.**

  ```text
  {PREAMBLE}

  Produce a 1080 × 1080 social image for the clinic / dental /
  optometry / wellness admin niche.

  Composition:
  - A clean clinic reception desk in soft daylight.
  - On the desk: a single tablet showing a daily appointment-
    enquiry summary (placeholder enquiries only — no real
    patient names, no medical detail, no clinical data).
  - A neat appointment book closed beside the tablet.
  - No people shown in the frame.
  - No medical equipment, no medical instruments, no
    stethoscopes, no white-coat imagery.
  - Soft daylight, calm tone.

  Aesthetic: calm operations-desk. Deep navy `#07111F` accent
  on the tablet UI. Teal `#2dd4bf` status pill on the
  highlighted row.

  No robots, no neon AI swirls, no brain icons, no clinic
  brand logos.

  Overlay text (top-left, sans-serif, off-white):
    "Appointment enquiries piling up over the weekend?"
  Overlay micro-line (just below, smaller):
    "For new-enquiry response — not for patient records or
     medical data."
  Overlay URL (bottom-right, sans-serif, teal):
    "corpflowai.com/lead-rescue"
  ```

- **Compliance guardrails.** **NO medical detail. NO patient names. NO clinical claims. NO before/after appointment volume numbers. The "not for patient records or medical data" disclaimer MUST appear on the image.** Read as administrative, not clinical.

## 5. 6-slide sales deck — AI Lead Rescue for owner-managed businesses

- **Tool.** Gemini Canvas.
- **Goal.** A reviewable 6-slide deck the operator can take into discovery meetings.
- **Brand tone.** Calm, structured, owner-friendly.
- **Prompt.**

  ```text
  {PREAMBLE}

  Produce a 6-slide presentation titled "AI Lead Rescue —
  for owner-managed businesses". Each slide has a headline,
  one line of body, and one visual direction note for the
  designer. Do not invent client names, logos, testimonials,
  or revenue numbers.

  Slide 1 — Problem
  Headline: "Most owner-managed businesses lose enquiries
  not because they lack a website, but because messages
  arrive in too many places."
  Body: "WhatsApp. Facebook. Website form. Email. Follow-up
  depends on whoever remembers."
  Visual direction: split-screen of four chaotic notification
  surfaces (WhatsApp / Facebook / form / email), no real
  names.

  Slide 2 — Outcome
  Headline: "Make every new enquiry visible by Monday morning."
  Body: "One daily lead list. One operator alert per enquiry.
  Five clear follow-up statuses."
  Visual direction: clean single-screen daily lead summary
  with placeholder initials, no real PII.

  Slide 3 — Offer
  Headline: "USD 150 launch pilot. 48-hour managed setup.
  7-day monitoring window."
  Body: "No card on the public page. Invoiced after we
  review your intake."
  Visual direction: simple offer card with the three numbers
  (150 / 48 / 7).

  Slide 4 — How it works
  Headline: "Capture. Alert. Log. Follow up."
  Body: "We connect one of your enquiry channels. We send
  alerts. We log every enquiry. You decide. You reply."
  Visual direction: the workflow diagram from § 1 of this
  doc.

  Slide 5 — Who it is for
  Headline: "Owner-managed property agents, contractors,
  and clinic admin in Mauritius."
  Body: "We do not handle patient records, financial data,
  or regulated workflows in the pilot."
  Visual direction: three niche tiles (property / contractor /
  clinic admin), each clearly captioned. No people shown.

  Slide 6 — Start
  Headline: "Start with one pilot."
  Body: "corpflowai.com/lead-rescue. A human operator
  reviews every intake before invoicing."
  Visual direction: clean CTA card with the canonical primary
  CTA "Start my 48-hour setup".

  Output: 6 slides, 16:9, brand-doctrine colours, modern
  sans-serif (Inter or similar). No filler slides. No
  testimonials. No revenue numbers.
  ```

- **Compliance guardrails.** No fake testimonials. No real client logos. No invented revenue or conversion numbers. Single-offer rule on slide 3.

## 6. 2-minute explainer video script

- **Tool.** NotebookLM (Video Overview) or Gemini (script-only).
- **Goal.** A 2-minute owner-friendly script. Audio narration is operator's choice (real voice preferred; AI voice acceptable with disclosure per `docs/strategy/GOOGLE_ACCELERATION_LANE.md`).
- **Brand tone.** Calm, plain-language, owner-led.
- **Prompt.**

  ```text
  {PREAMBLE}

  Produce a 2-minute (~280–320 word) video script for AI Lead
  Rescue, narrated in first person from the operator's voice.

  Structure:
  - 0:00–0:15 — Introduce yourself briefly and what AI Lead
    Rescue is, in plain language.
  - 0:15–0:35 — Name the problem (enquiries arrive in too
    many places; follow-up depends on memory).
  - 0:35–0:55 — Explain the workflow in one sentence per
    stage: capture, alert, log, daily summary.
  - 0:55–1:15 — State the offer (USD 150, 48-hour setup,
    7-day monitoring, no card on page).
  - 1:15–1:35 — State what is NOT promised (no revenue
    guarantee, no fully autonomous AI, no replace-your-staff).
  - 1:35–1:50 — Restate what IS promised (existing enquiries
    captured, visible, followed up).
  - 1:50–2:00 — CTA. End with: "If you want to start with
    one pilot, the page is corpflowai.com/lead-rescue.
    I'll review your intake within two business hours."

  Tone: respectful, direct, owner-friendly, non-technical.
  Sentence length: short. No jargon (CRM, API, webhook,
  schema, automation, AI agent — replace with operational
  verbs).

  Use the operator's first name once at the start. Use
  placeholder name "Anton" if no real name is provided.
  ```

- **Compliance guardrails.** No revenue claim. No fake testimonials. AI-narrated audio must carry an AI-disclosure caption per `docs/strategy/GOOGLE_ACCELERATION_LANE.md`.

## 7. 30-second social video script

- **Tool.** NotebookLM / Gemini script-only.
- **Goal.** 30-second script — problem → fix → CTA.
- **Brand tone.** Thumb-stopping but calm.
- **Prompt.**

  ```text
  {PREAMBLE}

  Produce a 30-second video script (~65–80 words spoken)
  for AI Lead Rescue.

  Structure:
  - 0:00–0:08 — Problem hook. One short sentence.
  - 0:08–0:18 — Fix in one sentence ("connect one channel
    into a daily lead list with operator alerts").
  - 0:18–0:25 — Offer in one sentence (USD 150 / 48h / 7-day).
  - 0:25–0:30 — CTA: "Start with one pilot. corpflowai.com
    slash lead-rescue."

  Tone: calm, direct, owner-friendly. No hype words. No
  "revolutionary", "unlock", "10x", "fully autonomous",
  "never miss a lead again".

  Output: spoken script only. Add a one-line per-second
  on-screen text suggestion in brackets after each line.
  ```

- **Compliance guardrails.** No revenue claim. No exaggerated AI cadence. CTA is canonical.

## 8. NotebookLM training — operator runbook to training summary

- **Tool.** NotebookLM.
- **Goal.** Generate a training summary a new operator can read in 10 minutes from `docs/operations/AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md`.
- **Brand tone.** Operator-facing, calm, instructional.
- **Prompt (paste with the operator runbook as the source document).**

  ```text
  {PREAMBLE}

  Source documents to use:
  - docs/operations/AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md
  - docs/operations/AI_LEAD_RESCUE_PAID_PILOT_ONBOARDING.md
  - docs/sales/AI_LEAD_RESCUE_DISCOVERY_CALL_SCRIPT.md

  Produce a 10-minute operator training summary covering:

  1. What AI Lead Rescue is (one paragraph, doctrine-aligned).
  2. The status pipeline (NEW_INTAKE → ... → MONTHLY_ACTIVE)
     with one-line description per status.
  3. The 13-item setup checklist (canonical V1 order) with
     a one-line "done means" for each.
  4. The Activity Log lifecycle scope (in / out / transition
     point) — verbatim from the runbook.
  5. The "what not to store" rules (verbatim).
  6. The 48-hour setup walkthrough (paid pilot onboarding).
  7. The 15-minute discovery call structure.
  8. The five doctrine reminders (taped-to-monitor lines).

  Format: bullet-led, scannable, owner / operator-friendly.
  No marketing language; this is internal training.

  Output language: English. If asked for French or Creole,
  mark output as DRAFT — REQUIRES HUMAN REVIEW.

  Output should be a single Markdown document, no Frontmatter.
  ```

- **Compliance guardrails.** No client PII in the summary. No marketing copy. Internal-training framing. NotebookLM-generated audio (if used) carries AI-disclosure.

## 9. Multilingual variant prompts

> **Important.** All non-English outputs from any prompt below must be marked **DRAFT — REQUIRES HUMAN REVIEW** before any external use. Mauritian Creole especially: idiom, tone, and register vary by context; AI-generated Creole is a draft, not a finished translation. Per `docs/sales/AI_LEAD_RESCUE_CAPABILITY_MATRIX.md` row 20 — client-facing automated replies in any language are **not promised**.

### 9.1 — French variant of the 30-second video script

```text
{PREAMBLE}

Traduisez en français le script vidéo de 30 secondes pour
AI Lead Rescue, en gardant le ton calme, direct et adapté
aux propriétaires de petites entreprises mauriciennes.

Conservez:
- Le prix (USD 150).
- La fenêtre de mise en place (48 heures).
- La fenêtre de monitoring (7 jours).
- L'appel à l'action canonique: "Démarrer mon installation
  de 48 heures" (forme verbale, action de l'acheteur).
- Le lien: corpflowai.com/lead-rescue.

Ne promettez pas de nouveau chiffre d'affaires. Ne
promettez pas de réponses automatiques au client. Ne
positionnez pas AI Lead Rescue comme un chatbot, un agent
IA, ni un remplacement de CRM.

Marquez en haut: "BROUILLON — RÉVISION HUMAINE REQUISE".
```

### 9.2 — Mauritian Creole variant of the WhatsApp opener

```text
{PREAMBLE}

Traduit an Kreol Morisien sa mesaz WhatsApp opener-la pou AI
Lead Rescue (source: docs/sales/AI_LEAD_RESCUE_OUTREACH_SCRIPTS.md
§ 1.1).

Garde:
- Ton respektye, ouvert, pa pousse.
- Pri (USD 150), 48 ker setup, monitoring 7 jours.
- Lien: corpflowai.com/lead-rescue.

Pa promet rezilta finansye. Pa promet response otomatik
pou klian. Pa positionn li koumadir enn chatbot, enn IA
ajan, oubien enn ranplassman CRM.

Marke lao mesaz-la: "BROUILLON — RÉVISION HUMAINE
REQUISE / DRAFT — REQUIRES HUMAN REVIEW".

Note: register Kreol varie selon piblik. Operator dois
relir avan envoye.
```

### 9.3 — French variant of the one-page flyer copy

```text
{PREAMBLE}

Traduisez en français la copie du flyer une page pour AI
Lead Rescue (source: docs/marketing/AI_LEAD_RESCUE_MARKETING_ASSET_PACK.md § 4).

Conservez les sections:
- Le problème
- Ce que fait le pilote
- Combien ça coûte (USD 150)
- Ce que nous ne promettons pas (pas de garantie de revenu,
  pas de réponses automatiques, pas de remplacement du
  personnel, pas de scraping, pas de CRM)
- Démarrer avec un seul pilote — corpflowai.com/lead-rescue

Ne promettez rien de nouveau. Marquez "BROUILLON —
RÉVISION HUMAINE REQUISE" en haut.
```

### 9.4 — Multilingual operator-side training summary

```text
{PREAMBLE}

À partir du résumé de formation opérateur (§ 8 de ce doc),
produisez les versions française et créole mauricienne.

Règles:
- Marquez chaque sortie "BROUILLON — RÉVISION HUMAINE REQUISE
  / DRAFT — REQUIRES HUMAN REVIEW" en haut.
- Conservez tous les termes techniques anglais s'ils sont
  utilisés tels quels dans l'app (PAID_SETUP, LIVE_PILOT,
  Activity Log, Setup checklist — ne traduisez pas les noms
  d'états ou de champs).
- Préservez les listes à puces de la version anglaise.
- Tonalité: calme, instructive, propre à un manuel interne.
```

- **Compliance guardrails (apply to all § 9 outputs).**
  - Every non-English output **must** carry the `DRAFT — REQUIRES HUMAN REVIEW` header.
  - No idiom, no slang, no street register — keep professional and owner-friendly.
  - Field names (`PAID_SETUP`, `Activity Log`, `Setup checklist`) stay English.
  - No customer-facing auto-reply promises in any language.
  - Operator reviews every translation before any external use.

## Operator workflow when using these prompts

1. **Pick the prompt.** Match the asset you need from `docs/marketing/AI_LEAD_RESCUE_MARKETING_ASSET_PACK.md` to one of § 1–9 above.
2. **Paste the preamble verbatim**, then the specific prompt body.
3. **Run the prompt in the Google tool** (Gemini Canvas / Gemini image / NotebookLM / Pomelli / Gemini app).
4. **Doctrine review.** Read the output against `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md`, `docs/strategy/ABOVE_THE_LINE_STRATEGY_DOCTRINE.md`, and `docs/marketing/04_DELIVERY_QUALITY_GATE.md` (target ≥ 12/14).
5. **Edit the output.** Concrete, specific, outcome-led. Remove generic-AI cadence ("revolutionary / unlock / 10x / fully autonomous").
6. **Multilingual outputs:** confirm the `DRAFT — REQUIRES HUMAN REVIEW` header is preserved.
7. **Store the final asset in the repo** if it becomes canonical (e.g. a reviewed flyer PDF, a deck PDF) under `docs/` — generated image binaries are **not** committed in this PR.
8. **Activity-log entry** (where a lead row exists) — note that this Google-generated draft was used in the workflow, so the audit trail is honest.

## What is forbidden in all prompts

- ❌ Pasting any real client name, real client phone number, real client email, real client business name, or real client document into a Google tool prompt.
- ❌ Asking the tool to produce fake testimonials, fake client quotes, fake screenshots, fake dashboards, fake metrics, or fake revenue numbers.
- ❌ Asking the tool to produce content that contradicts the canonical CTA, single-offer rule, or no-guarantee copy.
- ❌ Asking the tool to draft content for client outreach in any language without the `DRAFT — REQUIRES HUMAN REVIEW` header.
- ❌ Asking the tool to draft anything that touches medical / financial / legal / regulated data beyond the brief operational framing of the niches (per `docs/operations/SECURITY_REVIEW_CHECKLIST.md`).
- ❌ Generating logos, brand assets, screen mockups, or visual assets that mimic real third-party products (e.g. Property24, WhatsApp UI, Meta Business Suite UI) in a way that could confuse a viewer about source.

## Cross-references

- `docs/strategy/GOOGLE_ACCELERATION_LANE.md` — operating bounds for Google AI tool use.
- `docs/strategy/ABOVE_THE_LINE_STRATEGY_DOCTRINE.md` — managed-workflow framing.
- `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` — single-offer rule, CTA rules, allowed claims, AI-tool-generated collateral rules (§ *Google-tool-generated collateral*).
- `docs/marketing/00_NON_NEGOTIABLE_MARKETING_COMMUNICATION_STANDARD.md` — Hook / Proof / Depth.
- `docs/marketing/04_DELIVERY_QUALITY_GATE.md` — quality gate (target ≥ 12/14).
- `docs/marketing/AI_LEAD_RESCUE_MARKETING_ASSET_PACK.md` — full asset pack (companion).
- `docs/marketing/AI_LEAD_RESCUE_14_DAY_CONTENT_CALENDAR.md` — content calendar (companion).
- `docs/marketing/AI_LEAD_RESCUE_FIRST_PAID_PILOTS.md` — first-paid-pilots playbook.
- `docs/operations/AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md` — operator runbook.
- `docs/operations/SECURITY_REVIEW_CHECKLIST.md` — security review triggers.
