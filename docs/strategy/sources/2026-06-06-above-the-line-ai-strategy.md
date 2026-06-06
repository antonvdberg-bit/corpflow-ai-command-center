# Strategy source — Above-the-Line AI Strategy (commodity vs defensible)

**Anchor sentinel:** `<!-- STRATEGY_SOURCE_20260606_ABOVE_THE_LINE_AI -->`

<!-- STRATEGY_SOURCE_20260606_ABOVE_THE_LINE_AI -->

## 1. Source metadata

| Field | Value |
|---|---|
| Working title | Above-the-Line AI Strategy — commodity vs defensible (assigned by the capture-requesting operator). |
| URL | not supplied to Cursor at capture time. |
| Source type | Strategy transcript (long-form spoken / written argument). |
| Source publication date | not supplied to Cursor at capture time. |
| Source creator | not supplied to Cursor at capture time. |
| Capture date | 2026-06-06. |
| Captured by | Anton, recorded in repo by Cursor. |
| Capture method | Operator-supplied distillation in the originating prompt. **Cursor did not fetch or watch the underlying source.** No transcript text is reproduced in this file. |
| Primary relevance | CorpFlowAI product strategy; AI Lead Rescue positioning; managed services framing; marketing offers; client proposals; technical discovery; roadmap decisions; future productized services. |

**Attribution discipline.** The strategic argument summarised below originates with the external source creator. CorpFlowAI does not claim authorship; we have only selected, condensed, and mapped the argument onto CorpFlowAI's existing operating surfaces. No transcript text is reproduced.

## 2. Summary (12 bullets)

1. **The commodity line is moving up.** Generic AI agents, generic chatbots, prompt-to-app tools, generic dashboards, simple content generators, and thin AI wrappers are being absorbed into platforms shipped by Google, OpenAI, Microsoft, Apple, Meta, and others. Whatever sits below that line will keep getting cheaper, bundled, or free.
2. **“AI company” is no longer a defensible category.** Calling yourself an AI agency, an AI agent company, or an AI wrapper company describes a layer the platforms will own.
3. **Defensibility lives above the line.** Vertical workflows, proprietary client context, managed operations, trust-heavy domains, secure system-to-system automation, owned distribution, and a real point of view are what platforms cannot easily commoditise.
4. **The right test is platform-pressure-tested.** “If a major platform shipped a free decent version of this tomorrow, would I still have customers?” If no, the offer is below the line.
5. **Generic chatbots are concierge layers, not strategy.** A chatbot may help route, qualify, or schedule, but it is not the moat.
6. **Managed outcomes beat tools.** Selling a tool that the buyer must operate competes with whichever bigger tool ships next. Selling a managed function that runs reliably is a different category.
7. **Trust and accountability scale better than novelty.** Buyers pay more for human-accountable workflows in finance, admin, healthcare-admin, legal-admin, and operations than for cleverer generic AI.
8. **Integration into real business systems compounds.** ERPNext, accounting, banking, CRM-lite, document pipelines — these are where workflows become hard to rip out and re-shop.
9. **Owned distribution is a moat.** Direct relationships, email lists, niche community presence, and pilot pipelines belong to the operator, not to the underlying model vendor.
10. **A point of view beats average output.** Generic models converge to average. A specific opinionated method, applied repeatedly to a niche, does not.
11. **Wedges are fine; wedges as identity are not.** Simple productized offers (like a 48-hour lead-response setup) are legitimate ways to land paying clients, **provided** they are positioned as the front door to managed operations, not as the company.
12. **Build order matters.** Narrow paid wedge → operator cockpit → delivery checklist → evidence/monitoring → handover templates → managed monthly service → niche expansion → secure vertical automation → industry operating system. Skipping steps is how teams drift below the line.

## 3. CorpFlowAI application

### 3.1 Product strategy

- The argument is adopted in the new doctrine **`docs/strategy/ABOVE_THE_LINE_STRATEGY_DOCTRINE.md`**. That file is canonical; this capture only **informs** it.
- The strategic product lines (Lead and Growth Operations; Business Operating Dashboards; Secure Workflow Automation) and the done-for-you function framing are taken into doctrine.
- "Commodity AI is fuel. It is not the moat." is taken into doctrine verbatim.

### 3.2 AI Lead Rescue

- AI Lead Rescue is explicitly framed as a **wedge** into managed lead / growth operations — not as “our AI agent.” The doctrine names the conditions under which Lead Rescue stays above the line and the failure modes that drop it below.
- This is consistent with existing `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` § *AI Lead Rescue doctrine* (single-offer rule, route-after-intent, USD 150 launch pilot).

### 3.3 Marketing

- `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` receives a *Strategic guardrail — Above-the-Line Doctrine* section so marketing surfaces never position CorpFlowAI as a generic AI wrapper / chatbot / agent company.
- The Hook / Proof / Depth doctrine in `docs/marketing/00_NON_NEGOTIABLE_MARKETING_COMMUNICATION_STANDARD.md` remains the **how to communicate** layer; the Above-the-Line doctrine governs **what to position**.

### 3.4 Roadmap and packets

- New packets under `docs/execution/` should justify themselves against the doctrine's mandatory evaluation test in their **Goal** or **Scope**.
- The immediate-implication ordering in the doctrine (LR production verification → login fix → wedge usage → no chatbot/bulk-email/social-scheduler detours → paid discovery for secure automation → chatbot as concierge only) reflects what is already approved and prioritized.

### 3.5 Technical discovery

- The chatbot is explicitly a **narrow concierge and routing aid**, not the strategic moat. Discovery work for clients should lead with managed operating workflow framing.
- Secure automation opportunities (e.g. bank-statement-to-system transfer) should be treated as **paid discovery candidates** rather than free scoping.

## 4. Action implications

### Do now (and only these things from this capture)

- Ship this doctrine as a docs-only PR.
- Add the *Strategic guardrail* section to `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` in the same PR.
- Add the doctrine to the `AGENTS.md` Must-read table and to the non-negotiable summary.
- Update `docs/strategy/sources/README.md` index with this capture row.

### Do not

- Do not edit runtime code, env vars, secrets, DNS, DB schema, analytics, Search Console wiring, or deployment configuration from this capture or doctrine.
- Do not re-position CorpFlowAI as an "AI agent company" anywhere in copy.
- Do not introduce a generic chatbot, bulk email tool, social scheduler, or generic dashboard product to delay first revenue from Lead Rescue.
- Do not promise revenue guarantees or "fully autonomous" outcomes; allowed-claims rules in `BRAND_AND_CONVERSION_DOCTRINE.md` still apply.
- Do not paste the underlying source transcript or large quoted passages into this file or anywhere else in the repo.

### Future packets (named only — not opened by this PR)

| Working name | Purpose | Approval gate |
|---|---|---|
| **AboveLine-Audit-Marketing-1** | Re-read all current public marketing surfaces (apex CorpFlowAI, AI Lead Rescue landing, tenant marketing where CorpFlowAI-branded) against the Above-the-Line doctrine; produce a gap list. Docs-only. | Separate operator DECISION block. |
| **AboveLine-Audit-Packets-1** | Walk the existing `docs/execution/` packets and tag each as above / below / wedge, with one-line rationale. Docs-only. | Separate operator DECISION block. |
| **Secure-Workflow-Discovery-Template-1** | Template for paid discovery engagements for secure system-to-system automation (e.g. bank-statement-to-ERP). Docs-only template, no client work attached. | Separate operator DECISION block. |
| **Concierge-Chatbot-Scope-1** | Explicit scope doc that bounds the chatbot to concierge / routing only; cross-link to the Above-the-Line doctrine. Docs-only. | Separate operator DECISION block. |
| **Vertical-Function-Brief-Template-1** | Template for done-for-you managed-function offers (restaurant, property agent, contractor, clinic-admin, finance-admin). Docs-only. | Separate operator DECISION block. |

## 5. Proposed doctrine updates

This capture has **already** produced the following doctrine changes in the same PR. They are listed here for traceability — the authoritative versions are the doctrine files, not this capture.

1. **New** `docs/strategy/ABOVE_THE_LINE_STRATEGY_DOCTRINE.md` — full doctrine.
2. **Updated** `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` — added *Strategic guardrail — Above-the-Line Doctrine* section near *Non-negotiable rule* / *Brand position*.
3. **Updated** `AGENTS.md` — added a Must-read row for the doctrine and an above-the-line non-negotiable summary bullet.
4. **Updated** `docs/strategy/sources/README.md` — added the index row for this capture.

Any further doctrine changes that fall out of operating against this argument (for example, packet-template additions, marketing-page audits, or new strategic product-line categories) must go through their **own** PR with their **own** operator DECISION block.

## 6. Honest limits of this capture

- Cursor did not fetch, watch, or read the underlying source. The summary above is built entirely from the operator-supplied distillation in the originating prompt. Nuance, counter-examples, or qualifications present in the original source but not surfaced in the distillation are not represented here.
- Source publication date, original creator, and URL were not supplied at capture time. A later edit may add them.
- No quantitative claims (market sizes, projected commoditisation timelines, revenue multiples) were imported. CorpFlowAI does not propagate unverified numbers into the repo.
- This capture is **opinion-shaped strategic argument**, not measurable evidence. It is adopted because it is consistent with existing CorpFlowAI doctrine (single-offer rule, managed-outcome framing, production-grade client outcomes, delivery reality) and because Anton has explicitly approved it as the strategic evaluation lens.

## 7. Cross-references

- `docs/strategy/ABOVE_THE_LINE_STRATEGY_DOCTRINE.md` — the doctrine produced from this capture (authoritative).
- `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` — brand and conversion doctrine; carries a *Strategic guardrail* cross-link to the Above-the-Line doctrine.
- `docs/marketing/00_NON_NEGOTIABLE_MARKETING_COMMUNICATION_STANDARD.md` — Hook / Proof / Depth doctrine.
- `docs/strategy/PRODUCTION_GRADE_CLIENT_OUTCOMES.md` — production bar (reliable, secure, observable).
- `docs/strategy/sources/README.md` — strategy sources index + capture conventions.
- `docs/strategy/sources/2026-05-28-simplicity-1-1-1-proof-email-memo.md` — companion strategy capture (1-1-1 rule, plumbing before traffic, memo culture).
- `docs/execution/CORPFLOW_EXECUTION_PACKET_STANDARD.md` — packet shape; new offers should justify themselves against the doctrine in their Goal / Scope.
- `.cursor/rules/delivery-reality.mdc` — only **live verified** is `COMPLETE`; this doctrine governs **what** to build, delivery-reality governs **when it counts as shipped**.
