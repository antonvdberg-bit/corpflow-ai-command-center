# Delivery Quality Gate for External Communications

Status: Mandatory preflight before publishing, sending, or handing to development

## 1. Purpose

This quality gate protects CorpFlowAI from weak external communication, inconsistent claims, low-trust AI output, and aesthetically careless delivery.

## 2. Mandatory review checklist

### Strategic clarity

- The audience is explicit.
- The buyer stage is explicit.
- The commercial outcome is explicit.
- The asset has one primary job.

### Message quality

- The opening is specific and useful.
- The buyer problem is concrete.
- The benefit is stated in outcome language.
- The mechanism is understandable.
- The CTA is singular and obvious.

### Proof and trust

- Important claims are supported.
- Unsupported claims are softened or flagged.
- The asset is consistent with approved positioning.
- The asset does not contradict website, sales, or product documentation.
- The proof is recent enough for the claim being made.

### Scannability

- The asset can be understood quickly.
- Long paragraphs are avoided.
- Section headings carry meaning.
- Important information is visually findable.
- Tables, bullets, or diagrams are used where they reduce cognitive load.

### Visual and aesthetic quality

- The visual direction supports comprehension.
- The layout implies premium competence.
- There is enough whitespace.
- There is no decorative clutter.
- Screenshots, diagrams, or real product visuals are preferred over generic imagery.
- The page, post, video, or document feels deliberate rather than assembled.

### Conversion logic

- The next action is clear.
- A lower-friction path exists where appropriate.
- Objections are handled before the CTA where needed.
- The asset links to or references a validation asset.
- The asset moves the buyer one step forward.

### Client-facing trust

- Client instructions are clear.
- Next steps are unambiguous.
- Responsibilities are assigned where relevant.
- The content reduces support burden or decision confusion.

## 3. Scoring model

Each category is scored from 0 to 2:

- 0 = missing or weak.
- 1 = acceptable but needs improvement.
- 2 = strong.

Categories:

1. Strategic clarity.
2. Message quality.
3. Proof and trust.
4. Scannability.
5. Visual / aesthetic quality.
6. Conversion logic.
7. Channel fit.

Minimum publish score: 12 / 14.  
Anything below 12 must be revised.

## 4. Mandatory handoff format

When handing work to an engineer, designer, Cursor, or another agent, use:

```markdown
Definition of done: [one sentence]
Likely area: [app code / content / design / analytics / documentation]
Assets affected: [paths, pages, channels, files]
Commercial goal: [what buyer behavior this should improve]
Required proof: [approved proof or proof needed]
Visual standard: [what must be true aesthetically]
Verification: [URL, preview, screenshot, checklist, or acceptance test]
Do not change: [scope boundaries]
Handoff: [one paragraph with exact implementation instructions]
```

## 5. Final release rule

No prospect-facing or client-facing work should be shipped without a visible quality-gate statement in the PR, issue, chat handoff, or approval note.

## 6. Where the visible quality-gate statement lives

For pull requests in this repository, the visible quality-gate statement is the `## Marketing / Sales Quality Gate` section in `.github/PULL_REQUEST_TEMPLATE.md`. GitHub renders that template into every new PR description automatically. Authors fill it in; reviewers refuse to approve buyer-facing or client-facing PRs without a completed score (or an explicit `Not applicable — no prospect-facing or client-facing surface changed.` line for refactors that genuinely do not touch those surfaces).

The PR template embeds:

- The four required doctrine docs from § 2 of this file (`00_NON_NEGOTIABLE_MARKETING_COMMUNICATION_STANDARD.md`, `01_AGENT_OUTPUT_CONTRACT.md`, `02_MULTIMODAL_CONTENT_PLAYBOOK.md`, and this file).
- The seven scoring categories from § 3, with the **12 / 14 minimum publish score**.
- A pre-data measurement checklist that applies until Plausible, CRM, intake, and sales data are sufficient to evaluate live conversion outcomes.
- Explicit *Proof* and *Validation asset* status flags so the reviewer can see whether a buyer-facing surface is shipping with complete, partial, or pending evidence.
- A one-sentence reviewer statement closing with `passes / does not pass / is not applicable to` the gate.

Layer-3 enforcement is **soft**: CI does not fail on a low score. The mechanism is reviewer discipline, made unavoidable by the visible PR-template section. Layer-4 enforcement (CI fails PRs that touch buyer-facing surfaces without a quality-gate marker) is deliberately deferred until the team has lived with Layer-3 long enough to know which file-path triggers are safe to gate hard.

When this section changes — for example, a new doctrine doc is added or a scoring category is renamed — `.github/PULL_REQUEST_TEMPLATE.md` must be updated in the same PR so the two artefacts never drift.
