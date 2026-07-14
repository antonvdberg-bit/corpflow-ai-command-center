# Publishing Checklist — Launch Media Kit

**Status:** Draft gate · **NO EXTERNAL PUBLISHING AUTHORIZED** until all items checked

Run this checklist before any video upload, social post, or site embed goes live.

---

## 1. Operator gates (Anton)

- [ ] **A1** Avatar approved or fallback labelled synthetic  
- [ ] **A2** Voice approved or default documented  
- [ ] **A3** Founder intro path decided (avatar vs live)  
- [ ] **A4** Logo lockup imported to Canva (or wordmark fallback noted)  
- [ ] **A5** CTA URLs confirmed per asset  
- [ ] **A6** End-card contact details confirmed (discovery form only unless phone approved)

See `ANTON-CAPTURE-CHECKLIST.md` for capture details.

---

## 2. Offer accuracy

- [ ] Prices match `lib/public/rapid-delivery-offers.js` (MUR 35k / 45k / 45k)  
- [ ] Third sprint is **Customer Recovery & Reputation Management** — not "Automation Starter"  
- [ ] Deposit language: "50% deposit before work/build/recovery" — no bank details in creative  
- [ ] USD 150 pilot mentioned only where flagged (flagship wedge); not mixed with MUR sprint pricing  
- [ ] CTA copy is buyer-action language (see `01-BRAND-AND-MESSAGE-GUIDE.md`)

---

## 3. Claims and proof

- [ ] No guaranteed revenue or ROI  
- [ ] No fake testimonials, star counts, or named clients without written approval  
- [ ] UI shots labelled "Illustrative operator view" or equivalent in video/description  
- [ ] No "AI replaces your staff" framing  
- [ ] Timeline claims match playbook: "24–72 hours" / "five business days" where stated

---

## 4. Brand and visual

- [ ] Colours: teal `#2dd4bf`, dark `#06111f`, text `#eef6ff`  
- [ ] Typography: Inter Bold / Regular  
- [ ] Hook / Proof / Depth present on marketing surfaces  
- [ ] Delivery Quality Gate score ≥ 12/14 (`docs/marketing/04_DELIVERY_QUALITY_GATE.md`)  
- [ ] Synthetic avatar disclosure in description where applicable

---

## 5. Technical export

- [ ] Dimensions and codecs per `12-EXPORT-MATRIX.md`  
- [ ] Thumbnail legible at mobile browse size  
- [ ] Captions/SRT included or burned in per platform  
- [ ] Correct aspect ratio uploaded (don't stretch 16:9 to 9:16)  
- [ ] File names follow export matrix convention

---

## 6. Platform-specific

### YouTube

- [ ] Title ≤ 100 chars · description includes CTA URL  
- [ ] Thumbnail 1280×720 uploaded  
- [ ] "AI-assisted narration" note in description if synthetic voice  
- [ ] Playlist assigned (Flagship / Offers / Shorts)

### LinkedIn

- [ ] Native upload preferred over link-only for video  
- [ ] Article cover 1200×630 if long-form  
- [ ] Company banner updated only after Anton approves

### Instagram / Facebook

- [ ] 9:16 for Reels/Stories · 1:1 for feed cards  
- [ ] Link in bio / page CTA points to `corpflowai.com/contact#discovery`  
- [ ] No payment instructions in captions

### Site embed

- [ ] Embed tested on production tenant host after deploy  
- [ ] Lazy-load / performance acceptable  
- [ ] Live URL verification per `delivery-reality.mdc` before marking COMPLETE

---

## 7. Security and compliance

- [ ] No secrets, tokens, private URLs, or client PII in renders  
- [ ] No unauthorised client logos  
- [ ] Redacted complaint samples only in recovery assets

---

## 8. Delivery Reality Audit (required for customer-visible publish)

```text
Delivery Reality Audit:
- Local fix exists: YES (render) / N/A (docs-only kit)
- Merged to main: YES/NO
- Production deployment ID:
- Commit deployed:
- Live URLs tested:
- Expected vs actual result:
- Client-facing flow usable: YES/NO
- Final verdict: COMPLETE / PARTIAL / FAILED
```

Docs-only kit merge ≠ publish. Publish completion requires live URL checks on affected surfaces.

---

## Sign-off

| Role | Name | Date | Verdict |
|------|------|------|---------|
| Operator | Anton | | APPROVED / HOLD |
| Quality gate | | | ≥ 12/14 |

**Hold** if any section 2 or 3 item fails.
