<!--
  CorpFlowAI Command Center — Pull Request Template

  Fill in every section that applies. The Marketing / Sales Quality Gate
  block is mandatory for any PR that touches prospect-facing, client-facing,
  sales, marketing, homepage, landing-page, visual asset, public trust,
  pricing, onboarding, email, proposal, or social content.

  Reviewers should not approve a buyer-facing or client-facing PR without a
  visible quality-gate score (or an explicit "Not applicable" line).

  See `.cursor/rules/delivery-reality.mdc` for what counts as COMPLETE,
  PARTIAL, or FAILED on customer-visible work.
-->

## Summary

<!--
  1–3 bullets. Why this PR exists and what it changes. Plain language for a
  reader who is not a full-time engineer.
-->

-

## Scope and surfaces touched

- Runtime / app code changed: <!-- yes / no — list paths if yes -->
- Docs / rules / CI changed: <!-- yes / no — list paths if yes -->
- Client-facing surface changed: <!-- yes / no — list URLs / hosts if yes -->
- Operator-only surface changed: <!-- yes / no — list URLs / hosts if yes -->

## Test plan

<!--
  Checklist of TODOs the reviewer (or you, before flipping the verdict) can run.
  Include local tests, CI expectations, and any live URL checks if this PR
  touches a client-facing route.
-->

- [ ] `npm test` passes locally
- [ ] `npm run build` passes locally
- [ ] `npm run check:marketing-quality-gate` passes locally (if marketing-doctrine docs touched)
- [ ] Live URL probe planned for: <!-- list URLs, or write "n/a — docs-only" -->

## Delivery Reality Audit (per `.cursor/rules/delivery-reality.mdc`)

<!--
  Fill this in before flipping the PR verdict to COMPLETE.
  For docs-only PRs, "Live URLs tested" may be "n/a — docs-only".
  For PRs that change customer-visible behavior, live verification is required.
-->

```text
Delivery Reality Audit:
- Local fix exists: YES / NO
- Merged to main: YES / NO (filled after merge)
- Production deployment ID: (Vercel dpl_… or n/a — docs-only)
- Commit deployed: (full SHA after Production deploy is Ready)
- Live URLs tested: (list, or n/a — docs-only)
- Expected vs actual result:
- Client-facing flow usable: YES / NO
- Final verdict: COMPLETE / PARTIAL / FAILED
```

## Marketing / Sales Quality Gate

Complete this section for any PR that touches prospect-facing, client-facing, sales, marketing, homepage, landing-page, visual asset, public trust, pricing, onboarding, email, proposal, or social content.

If this PR does not touch those surfaces, write: `Not applicable — no prospect-facing or client-facing surface changed.`

### Required doctrine check
- [ ] I checked `docs/marketing/00_NON_NEGOTIABLE_MARKETING_COMMUNICATION_STANDARD.md`
- [ ] I checked `docs/marketing/01_AGENT_OUTPUT_CONTRACT.md`
- [ ] I checked `docs/marketing/02_MULTIMODAL_CONTENT_PLAYBOOK.md`
- [ ] I checked `docs/marketing/04_DELIVERY_QUALITY_GATE.md`

### Quality Gate score
Minimum publish score: **12 / 14**

| Category | Score 0–2 | Evidence / notes |
|---|---:|---|
| Strategic clarity |  |  |
| Message quality |  |  |
| Proof and trust |  |  |
| Scannability |  |  |
| Visual / aesthetic |  |  |
| Conversion logic |  |  |
| Channel fit |  |  |
| **Total** | **__/14** |  |

### Pre-data measurement criteria
Use this section until Plausible, CRM, intake, and sales data are sufficient.

- [ ] One primary audience is obvious within 5 seconds.
- [ ] One primary action is obvious above the fold or at the decision point.
- [ ] The page/message contains a specific buyer pain, not a generic benefit.
- [ ] The offer, price, scope, or next step is concrete enough that a buyer knows what happens next.
- [ ] Every strong claim is either backed by proof, softened, or clearly marked as not guaranteed.
- [ ] The content includes at least one trust reducer: disclaimer, process clarity, refund/payment clarity, provenance, or limitation.
- [ ] The page/message is skimmable: headings, short paragraphs, clear sequence, no dense walls of text.
- [ ] Any visual asset explains, proves, or reduces friction; it is not decorative filler.
- [ ] If an attention asset is used, a validation path exists or is explicitly queued.
- [ ] The CTA matches the buyer stage and does not create unnecessary decision overload.
- [ ] Mobile readability and CTA access were checked.
- [ ] No unsupported testimonial, logo, client name, revenue claim, legal claim, or performance promise was added.

### Known proof / validation status
Choose one:
- [ ] Proof complete — testimonials, case evidence, quantified outcomes, or approved logos included.
- [ ] Proof partial — no approved client proof yet; claims are softened and limitations are explicit.
- [ ] Proof pending — follow-up required before this should be treated as a mature conversion asset.

Choose one:
- [ ] Validation asset complete — demo, walkthrough, video, annotated screenshot, or equivalent included.
- [ ] Validation asset partial — static explanation exists but no demo/video yet.
- [ ] Validation asset pending — follow-up required.

### Final marketing reviewer statement
Write one sentence:
`This PR [passes / does not pass / is not applicable to] the Marketing / Sales Quality Gate because ...`
