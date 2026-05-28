# Lead Rescue Proof and Validation Asset Plan (v1)

Status: Plan only (docs). Execution lands in subsequent PRs as proof becomes available. No runtime page sections, no embedded video, no fake testimonials, no logos, no fabricated case results.

This plan is the named follow-up to the audit on PR #258 (Layer-3 Marketing / Sales Quality Gate). The audit confirmed that `/lead-rescue` and `/` already pass the publish gate (12/14 and 13/14), but with two soft scores: Proof and trust (1/2 on both), and Conversion logic (1/2 on `/lead-rescue`). This plan defines exactly what assets are needed to lift those two scores honestly, the schema each asset must satisfy before it is allowed to ship, and the format the first validation asset should take.

## 1. The gap (concise restatement of the audit)

| Surface | Quality Gate score | Where the soft scores are | What is missing |
|---|---:|---|---|
| `https://corpflowai.com/lead-rescue` | 12 / 14 | Proof and trust = 1/2; Conversion logic = 1/2 | No third-party testimonials, no named cases, no quantified pilot outcomes, no logos. No 45 to 60 second validation asset (demo / screen recording / annotated walkthrough) for buyers who want to see before submitting. |
| `https://corpflowai.com/` | 13 / 14 | Proof and trust = 1/2 | Same proof gap as `/lead-rescue` (no testimonials / cases / logos). Conversion logic is already 2/2 because the apex routes to a single buyable offer. |

Both pages have **structural proof** (specific numbers: 48 h, 7 days, 2 business hours, USD 150), **process clarity** (4-step post-intake flow, 3-step setup), and **softened claims** ("We do not guarantee new revenue"). What is missing is **third-party social proof** and, on the lead-rescue page specifically, a **validation asset** that lets a buyer evaluate the system without submitting intake first.

## 2. Approved proof-source types (typology)

The seven admissible proof types for CorpFlowAI marketing surfaces, ordered by *commercial weight* (top is strongest), with explicit availability today.

| Rank | Proof type | What it is | Availability today | Trigger to unlock |
|---:|---|---|---|---|
| 1 | **Real-client quantified case** | Named client, named outcome with a number, with the client's permission to use their name. Example: *"Cabinet Lex (Mauritius) cut missed enquiries from 4 per week to 0 over the 7-day pilot."* | Not available | First paying pilot completes + client signs a permission line on the runbook. |
| 2 | **Real-client testimonial (named)** | Named client, qualitative quote, with permission. Example: *"We stopped losing leads in two days. — Sophie K., Cabinet Lex."* | Not available | Same trigger as Rank 1; lower bar (no number required). |
| 3 | **Real-client testimonial (anonymized)** | Quote attributed to a role and sector but not a name. Example: *"Family-run hotel, north coast Mauritius — 'we were losing 2 to 3 enquiries a week before the pilot.'"* | Not available; **only acceptable if the client explicitly refuses naming and the role / sector is verifiably accurate** | Same as Rank 1 plus a written *"may we anonymize"* exchange. |
| 4 | **Validation asset (demo / screen recording / annotated walkthrough)** | A short asset that shows the system working on real or representational data, with provenance disclosed. Example: a 45-second screen recording of the operator's morning view + an enquiry capture, with on-screen text. | **Producible now** without any client. Uses the existing operator UI on a fresh demo tenant and synthetic data marked *Representational example only.* | Decision on format (Section 7 below). Production capacity. |
| 5 | **Internal artifact / workflow proof** | A diagram, schematic, or screenshot of the operating mechanism. Example: the existing `lead-rescue-process.svg` or `lead-rescue-dashboard.svg` already on the page. | **Live on both pages today** | Already counted toward the existing 12/14 and 13/14 scores. |
| 6 | **Structural / numerical proof** | Specific operational numbers: 48 h, 7 days, 2 business hours, USD 150, 1 lead source connected, 1 named contact required. | **Live on both pages today** | Already counted. |
| 7 | **External / authority signal** | A third-party recognition: industry list, partner badge, certification, accelerator or chamber-of-commerce mention. Example: a logo strip of accelerator / chamber affiliations if any. | Not currently available | Anton confirms an authority is willing to be cited. |

**Disallowed** (per Section 4 below): fabricated testimonials, fictional client names, generic stock logos used to imply customers, revenue guarantees, performance promises ("you will get X new leads"), legal or tax assurances.

## 3. Pre-proof rules: what we can and cannot say until first paying pilot completes

Until at least one paying pilot has completed and the client has given written permission to be referenced, the following rules apply on every public surface.

**We may say:**

- *"This is a launch pilot."* — true.
- *"We do not yet publish client cases. The first published case will appear after the first paying pilot completes."* — honest about the proof gap.
- *"USD 150 launch pilot, invoiced after intake review."* — concrete pricing.
- *"48 hours from payment to live pilot. 7 days of pilot monitoring."* — specific operational numbers.
- *"We do not guarantee new revenue. We help make sure existing enquiries are captured, visible, and followed up."* — honest limit.
- *"Built and operated by [identity statement: based in Mauritius, working with clients in Mauritius and internationally]."* — HQ fact, not a pricing claim.
- *"Visual generated and assisted by AI tooling, reviewed by humans."* — mandatory for any AI-generated visual, already practiced.

**We may not say (until proof exists):**

- *"Our clients have seen X percent more leads."* — no clients, no aggregate number.
- *"Trusted by leading small businesses."* — generic social-proof claim with no underlying clients.
- *"Cabinet Lex" / "Hotel L'Oasis" / any specific client name* — invented or unauthorized.
- *"Recover 80 percent of missed enquiries."* — performance promise.
- *"Save thousands per month."* — revenue claim.
- Logos of companies who have not signed a written permission line.
- Star ratings or review counts not backed by an external review platform we actually use.
- Industry awards, certifications, or partner badges we do not actually hold.

**Soft replacements approved during the pre-proof window:**

- Replace *"Trusted by..."* (cannot say) with *"Built by an operating-systems team based in Mauritius, working with small businesses in Mauritius and internationally."* (HQ truth).
- Replace *"Our clients see..."* (cannot say) with *"What you see every morning"* + the existing dashboard mockup labelled *Representational example only* (already live).
- Replace a fabricated case-study card with a *"Why pricing is honest right now"* mini-section explaining the launch-pilot framing (optional; only if Anton wants explicit framing).

## 4. Schema: testimonial / pilot-result / case-study

YAML schema, stored under a future `data/proof/` directory once the first paying pilot completes. Designed to mirror `docs/marketing/03_CONTENT_ATOM_SCHEMA.md` style so the same retrieval / approval discipline applies.

```yaml
proof_record:
  id: "CF-PROOF-NNNN"
  status: "draft | pending_client_permission | approved | deprecated"
  proof_type: "case | testimonial_named | testimonial_anonymized | metric | screenshot | workflow | external_authority"

  client:
    name: ""
    legal_entity: ""
    sector: ""
    geography: ""
    name_use_permitted: true
    anonymization_acceptable_to_client: true
    permission_evidence_path: ""
    permission_date: "YYYY-MM-DD"

  pilot:
    pilot_id: ""
    pilot_start: "YYYY-MM-DD"
    pilot_end: "YYYY-MM-DD"
    lead_source_connected: ""
    alert_destination: ""
    invoice_currency: "USD"
    invoice_paid: true

  outcome:
    quote: ""
    metric_label: ""
    metric_before: ""
    metric_after: ""
    metric_window: ""
    metric_method: "operator-observed | client-reported | both"
    confidence: "high | medium | low"

  approved_use:
    surfaces:
      - "/lead-rescue"
      - "/"
    channels:
      - "website | linkedin | email | proposal"
    expires_on: "YYYY-MM-DD"

  governance:
    owner: "anton@corpflowai.com"
    last_reviewed: "YYYY-MM-DD"
    next_review_due: "YYYY-MM-DD"
    legal_notes: ""
    privacy_notes: ""
```

**Approval standard.** A `proof_record` may not be marked `approved` unless:

1. `client.name_use_permitted` (or `anonymization_acceptable_to_client`) is `true` with a written permission artefact at `client.permission_evidence_path`.
2. `pilot.invoice_paid` is `true` (no published claims from unpaid trials).
3. If `proof_type = case`, both `outcome.metric_before` and `outcome.metric_after` are populated and `outcome.metric_method` is filled.
4. `governance.owner` is named.
5. `approved_use.expires_on` is set (default 18 months from `pilot.pilot_end`).

**Retrieval rule.** Any agent producing copy that quotes a client must first locate the matching `proof_record` and verify `status: approved` and `approved_use.expires_on` is in the future. No quote may appear on any surface without a matching record.

## 5. The 45 to 60 second validation asset (concept)

Concept name: **AI Lead Rescue — what your morning looks like.**

Goal: lift `/lead-rescue` Conversion logic from 1/2 to 2/2 *immediately*, without a paying pilot, without inventing any testimonial, by *showing the operating surface itself* as proof. This satisfies the Multimodal Content Playbook's "Visual proof: screenshot, workflow, diagram, before/after, or result structure" requirement at conversion-stage proof density.

### 5.1 Asset spec

- Length: 45 to 60 seconds. Hard cap at 60 seconds. Sweet spot 50 seconds.
- Aspect ratio: 16:9 for landing-page placement; 9:16 vertical re-edit reserved for future LinkedIn / mobile use.
- Resolution: 1920 by 1080 minimum, captured at 60 fps.
- Audio: light ambient bed only, no music with vocals, no overpowering soundtrack. Soft narration optional in v1; on-screen text should carry meaning even with audio off (Multimodal Playbook § 5: "Clear on-screen text").
- Captions: required, burned-in or sidecar `.vtt`. Default state on the page must be muted with captions visible.
- Branding: neutral and restrained. CorpFlowAI wordmark in a corner only. No animated logo intro.

### 5.2 Storyboard outline (10 beats)

| t (s) | Beat | What is on screen | On-screen text |
|---:|---|---|---|
| 0 to 3 | Hook | Calm desk shot from the existing hero photograph, holds for one beat, then transitions into a laptop screen | "Where is the lead I missed yesterday?" |
| 3 to 8 | Problem | A side-by-side: a phone with a missed WhatsApp message, an email inbox with an unread enquiry, a website form submission notification | "Enquiries arrive in different places." |
| 8 to 14 | Mechanism intro | A clean view of the AI Lead Rescue operator UI on a demo tenant, blurred / synthetic data | "AI Lead Rescue captures every enquiry — in one place." |
| 14 to 22 | Capture demo | A simulated lead arrives via a website form on the left; an alert appears on the operator's view on the right; the row appears in the lead log | "1. Capture. 2. Alert. 3. Log." |
| 22 to 32 | Daily summary | The morning view: 3 new leads today, 1 follow-up due, 14 replied in 7 days. Counts and initials are masked. | "Your morning, in one screen." |
| 32 to 40 | Honest limit | Static text card with a calm aesthetic | "We do not guarantee new revenue. We make sure existing enquiries are captured, visible, and followed up." |
| 40 to 48 | Process | A 4-step strip: Submit intake. We review. USD invoice. 48-hour setup. | "USD 150 launch pilot. Invoiced after intake review." |
| 48 to 55 | CTA | A clean end card with the existing CTA wording | "Start my 48-hour setup." |
| 55 to 60 | Provenance | One-line provenance card | "Demo footage on a synthetic tenant. No client data shown." |

### 5.3 Required disclosures (mandatory)

- *"Demo footage on a synthetic tenant. No client data shown."* — final provenance card.
- *"USD 150 launch pilot, invoiced after intake review."* — pricing.
- *"We do not guarantee new revenue."* — honest limit.
- If any voice-over is generated by AI: *"Voice-over generated by AI tooling and reviewed by humans."* — additional provenance card or caption.

### 5.4 What the asset must not show

- Any real client name, real client logo, or real client lead.
- Any real Telegram chat ID, real phone number, real email address.
- Any real invoice or banking detail.
- Any real Postgres row or runtime ID.
- Any internal Vercel deployment URL.
- Any factory-only operator screen (factory routes are not buyer-facing).
- Any fabricated metric (no "recover 80 percent of leads"). Numbers shown on the daily-summary screen are synthetic and labelled as such.

## 6. Format recommendation: screen recording, narrated, with burned-in captions

Three candidate formats were considered, scored against the Multimodal Content Playbook (§ 4 visual rules, § 5 video rules, § 7 proof density at conversion stage).

| Criterion | Screen recording (narrated) | Annotated walkthrough (static) | Motion explainer (animated) |
|---|---|---|---|
| Proof density at conversion stage | **High** — shows the actual operating surface | Medium — implies the surface | Low — explains the concept abstractly |
| Honesty (vs Section 3 pre-proof rules) | **High** — provenance card states *demo on synthetic tenant* | High | Medium — animated abstractions can drift toward "looks like generic SaaS marketing" |
| Time to produce (estimate) | 2 to 4 hours from script to final cut, on a demo tenant | 1 to 2 hours (screenshots + annotation) | 8 to 16 hours (storyboard + animation + voice-over) |
| Cost / dependency footprint | OBS or QuickTime + free caption tool | Figma or Keynote + screenshots | Animation tool licence or contractor |
| Reversibility if it lands wrong | High — re-record on a fresh demo tenant | High — re-export | Low — animation reshoots are expensive |
| Lift on `/lead-rescue` Conversion logic score | **1 / 2 to 2 / 2** | 1 / 2 to 1.5 / 2 | 1 / 2 to 1.5 / 2 |
| Lift on `/lead-rescue` Visual / aesthetic | Already 2 / 2 — no change | No change | No change |
| Risk of "looks like every other AI startup" | **Low** | Low | High |

**Recommendation: produce the screen recording.** It is the only format that simultaneously (a) delivers the highest proof density at conversion stage, (b) honours the Section 3 pre-proof rules without inventing anything, (c) reuses the operating surface that already exists, and (d) is reversible if the first cut lands wrong. The annotated walkthrough is the **fallback** if recording capacity is unavailable; the motion explainer is **deferred** to a later packet (LR-6) once at least one validated pilot exists to inform the abstraction.

## 7. Surface-by-surface uplift mapping

How each proof asset (in priority order) lifts the two pages.

| Asset (in order of production) | `/lead-rescue` Quality Gate effect | `/` Quality Gate effect |
|---|---|---|
| Validation screen recording (Section 5) | Conversion logic 1 → 2. Total 12/14 → **13/14**. | No direct uplift unless the apex featured-offer block links to the same asset (recommended; preserves the apex 13/14). |
| First paying pilot's `proof_record` (Section 4 schema), surfaced as a one-line testimonial block on `/lead-rescue` | Proof and trust 1 → 2. Total 13/14 → **14/14**. | Proof and trust 1 → 2. Total 13/14 → **14/14**. |
| Optional: external authority signal (Section 2 Rank 7), surfaced as a small affiliation strip | Marginal — does not lift further once already 14/14. | Marginal once already 14/14. Strengthens visitor confidence at first impression. |

Hitting **14/14 on both surfaces** is achievable from the current state with **two assets**: one screen recording (no client required) and one published testimonial (one paying pilot required).

## 8. Sequence and triggers (5-phase execution)

| Phase | Trigger | Output | Estimated effort | Approval gate |
|---|---|---|---|---|
| **Phase 0** | This plan merges. | Plan available to all agents. No client-facing change. | 0 (already this PR) | Plan-PR review |
| **Phase 1** | Anton schedules a 30-minute recording window. | First cut of the 45 to 60 second screen recording (Section 5.2 storyboard) hosted as a static `.mp4` under `public/assets/video/lead-rescue-validation-v1.mp4` plus `.vtt` captions, plus a `data/visual-assets/lead-rescue-validation.manifest.json` with provenance. **No embed on any page yet.** | 2 to 4 hours | Anton signs off on the cut |
| **Phase 2** | Phase 1 sign-off. | Single small PR adds a non-autoplay `<video>` element below the existing process diagram on `/lead-rescue`, captioned, muted by default, with a fallback poster image. Quality Gate score updated to 13/14 in the PR description. | 1 to 2 hours | Standard PR review with completed Marketing / Sales Quality Gate section |
| **Phase 3** | First paying pilot intake submitted, invoice paid, 48-hour setup completed, 7-day monitoring window closed, client agrees to be referenced. | First `proof_record` YAML at `data/proof/CF-PROOF-0001.yaml` per Section 4 schema, with `status: approved` and a written permission artefact. | 30 minutes admin once permission is granted | Anton confirms permission artefact is on file |
| **Phase 4** | Phase 3 sign-off. | Small PR adds a one-line testimonial block on `/lead-rescue` and a one-line variant on `/`, both reading the YAML by `id`. Quality Gate score updated to 14/14 in the PR description. | 1 to 2 hours | Standard PR review |
| **Phase 5 (optional)** | An external authority (accelerator, chamber, partner) confirms permission to be cited. | Affiliation strip on both pages. | 1 hour | Anton confirms cite permission |

Phases 1 and 2 are unblocked today and can execute in parallel with the LR-4 article work. Phases 3, 4, 5 are gated by real-world events and intentionally have no estimated date.

## 9. What stays out of scope until the first paying pilot completes

- No testimonial section on either page (Section 3 forbids it without permission).
- No "trusted by" logo strip.
- No star rating or review count.
- No "X clients served" counter.
- No before/after numbers on `/lead-rescue` other than the structural numbers already live (48 h, 7 days, 2 business hours, USD 150).
- No press / award / certification badges.
- No animated motion-graphic explainer (deferred to LR-6 research packet, only after sufficient Plausible engagement data).

## 10. Reversibility

This plan ships as a single new docs file. Reversal is a single revert PR removing one file. After revert:

- All Phase 1 to 5 work that has not yet shipped is unaffected (it is not yet on `main`).
- All Phase 1 to 5 work that has shipped is unaffected by this revert (each phase ships as its own PR).
- No client-facing surface changes in either direction.

## 11. Glossary cross-link

| Term | Canonical doc |
|---|---|
| Hook / Proof / Depth | `docs/marketing/00_NON_NEGOTIABLE_MARKETING_COMMUNICATION_STANDARD.md` |
| Attention asset / validation asset / proof density at conversion stage | `docs/marketing/02_MULTIMODAL_CONTENT_PLAYBOOK.md` |
| Content atom / proof_points / disallowed_claims | `docs/marketing/03_CONTENT_ATOM_SCHEMA.md` |
| Quality Gate scoring (7 categories, 12/14 publish minimum) | `docs/marketing/04_DELIVERY_QUALITY_GATE.md` |
| Single offer rule, route-after-intent, AI Lead Rescue doctrine | `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` |
| Delivery verdict (COMPLETE / PARTIAL / FAILED), live verification | `.cursor/rules/delivery-reality.mdc` |
