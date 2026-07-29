# Website Rescue — Delivery & Onboarding Checklists v1

**Status:** Operator checklists for **#654** Website Rescue (public SKU: Premium Landing Page Rescue).
**Parent pack:** `docs/marketing/WEBSITE_RESCUE_PRODUCT_PACK_V1.md`
**Quote packet:** `docs/marketing/WEBSITE_RESCUE_QUOTE_READY_PACKET_V1.md`
**Templates:** `docs/revenue/templates/`
**Anchor sentinel:** `<!-- WEBSITE_RESCUE_DELIVERY_CHECKLISTS_V1 -->`

<!-- WEBSITE_RESCUE_DELIVERY_CHECKLISTS_V1 -->

**Client-handling rule:** Most clients are not web experts. Do **not** ask them to write a specification from scratch. Present guided options, examples, and a recommended path — then convert feedback into structured requirements.

---

## A. Website audit checklist (pre-quote / T3 always)

Operator-internal. Use quality dimensions from `docs/quality/CORPFLOW_WEBSITE_QUALITY_SYSTEM_V1.md`. Do **not** publish scores as buyer revenue claims.

- [ ] Starting URL(s) recorded
- [ ] Mobile viewport check (common phone width) — layout / overflow / tap targets
- [ ] Desktop viewport check — hierarchy and CTA visibility
- [ ] Offer clarity in ~5 seconds (pass/fail note)
- [ ] Primary CTA present? Buyer-action wording? Competing CTAs?
- [ ] Enquiry path exists and is testable?
- [ ] Trust signals present or missing (contact, proof, legal footer)?
- [ ] Page count / IA notes for T2/T3 routing
- [ ] Screenshot or private notes stored off-repo (ERPNext / operator vault — **no private client data in Git**)
- [ ] Recommended tier: T1 / T2 / T3 + one-sentence rationale

---

## B. Client content & asset checklist

Mirror and extend `docs/revenue/templates/client-onboarding-document-checklist.md` (Premium Landing Page Rescue section).

### Required before build clock

- [ ] Legal / trading name
- [ ] Primary contact name, email, phone
- [ ] Billing contact (if different)
- [ ] Approved quote or email “approve quote”
- [ ] Deposit verification record (date, amount, reference)
- [ ] Offer summary in plain language (or confirmed guided option)
- [ ] Target buyer description (who should enquire)
- [ ] Logo (vector preferred) or written permission to set wordmark
- [ ] Brand colours / fonts — or “use recommended palette” confirmed
- [ ] Photography / proof points — or stock direction confirmed
- [ ] Named production approver
- [ ] Enquiry destination (email / form recipient / handoff)
- [ ] Starting URL (if upgrade)

### T2 / T3 additional

- [ ] Page list + priority order
- [ ] Per-page bullet notes (operator will structure copy)
- [ ] Must-keep URLs or brand assets
- [ ] Redirect / cutover notes (T3)
- [ ] Domain registrar contact path (only if cutover quoted — never store passwords in chat logs)

---

## C. Domain & access checklist

- [ ] Production hostname agreed in writing
- [ ] Whether DNS cutover is in scope (default **no** unless quoted)
- [ ] If cutover in scope: Anton **W3** approval recorded before any DNS change
- [ ] Preview URL issued on CorpFlowAI-managed surface
- [ ] Approver can open preview on phone and desktop
- [ ] No production deploy of client content without written release approval + balance verification

---

## D. Design-choice process for novice clients

Use when the client cannot brief design.

1. **Show the fictional demo** (`/demo/website-rescue`) for 2 minutes — before/after shape only.
2. **Offer 2–3 guided directions** (examples — adapt per vertical):
   - **A — Calm professional:** dark navy + warm accent, photography-led, one CTA.
   - **B — Bright practical:** light surface, strong product grid, enquiry-first.
   - **C — Premium restrained:** fewer words, larger imagery, proof strip + CTA.
3. **Recommend one** (operator picks based on audience) and ask: “Approve A/B/C or say what to change in one sentence.”
4. **Lock** palette + layout direction in writing before build.
5. **Convert** their sentence into structured requirements (headline outcome, proof bullets, CTA label, enquiry fields).
6. **Do not** ask for wireframes, Figma skills, or “full content document” unless they volunteer it.

---

## E. Implementation checklist

- [ ] Tier and page list locked
- [ ] Design direction locked (D)
- [ ] Landing structure: Hook / Proof / Depth
- [ ] Exactly one primary CTA above the fold
- [ ] Mobile layout pass (no horizontal scroll on agreed width)
- [ ] Enquiry capture wired to agreed destination
- [ ] Test submission recorded (operator)
- [ ] Preview URL sent via `preview-feedback-request.md`
- [ ] Internal quality spot-check (operator scorecard — not buyer marketing)

---

## F. Review & revision cycle

- [ ] Round 1 feedback from **named approver** only (consolidated)
- [ ] Changes applied within agreed window
- [ ] Round 2 (T1/T2) or Rounds 2–3 (T3) as included
- [ ] Extra rounds change-ordered before work
- [ ] No silent scope expansion (new pages, new languages, new apps)

---

## G. Acceptance & handover checklist

- [ ] Tier acceptance criteria from product pack §3 all pass
- [ ] `production-release-approval.md` signed / emailed
- [ ] Balance payment manually verified
- [ ] Production release executed (DNS only if W3 + quoted)
- [ ] Production smoke: primary URL **200**, enquiry path tested live
- [ ] Handover note: what was built, how to request changes, who approves
- [ ] Maintenance boundary stated (what is **not** included ongoing)
- [ ] Optional maintenance offer sent (template) — no auto-enrol
- [ ] ERPNext / project record updated

---

## H. Maintenance boundary (default)

**Included in setup:** the quoted pages as accepted at handover.

**Not included unless quoted:** ongoing copy edits, new pages, SEO campaigns, hosting outside agreed arrangement, DNS changes, Lead Rescue monitoring, content writing retainers, or emergency after-hours support.

Point clients to `docs/revenue/templates/maintenance-offer.md` when they want ongoing help.

---

## I. Operator quick links

| Artefact | Path |
|----------|------|
| Product pack | `docs/marketing/WEBSITE_RESCUE_PRODUCT_PACK_V1.md` |
| Quote-ready packet | `docs/marketing/WEBSITE_RESCUE_QUOTE_READY_PACKET_V1.md` |
| Pricing guide | `docs/sales/WEBSITE_RESCUE_PRICING_GUIDE.md` |
| Demo path record | `docs/marketing/WEBSITE_RESCUE_DEMONSTRATION_PATH_V1.md` |
| Public offer | `/offers/premium-landing-page-rescue` |
| Public demo | `/demo/website-rescue` |
| Operator desk | `/admin/rapid-delivery` |
