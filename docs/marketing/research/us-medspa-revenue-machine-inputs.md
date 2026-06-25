# CorpFlowAI — US Medspa Revenue Machine operating inputs

> **Status:** BOUNDED RESEARCH / INPUT MATERIAL — for Anton review before any outreach.
> **NO IMPLEMENTATION AUTHORIZED.** This file does not authorize outreach, build, CRM,
> payment flow, or any production change.
> **Not doctrine.** Inputs only — review against `docs/marketing-automation-arm.md`,
> `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md`, and the human-approved outreach
> policy before any use in outreach or collateral.
> **Provenance:** Produced by Codex (local workspace only; branch `work` / full SHA
> `5a216e35da4795b998749cb8aae574154f317bf1` never reached GitHub). Recovered
> 2026-06-25 via operator-supplied transfer-safe text; imported by Cursor (PR #462).
> **Codex does not own PRs** — Cursor owns repo/docs PR implementation.

**Date:** 2026-06-25.
**Scope:** public-web research only; no outreach, no scraping, no bypassing protections,
no secrets, no production changes.
**Doctrine check:** Product A is positioned as an AI-ready website rebuild / migration
plus lead capture and Lead Rescue for medspas, aesthetic clinics, and elective
clinics. It is framed as a managed enquiry and booking operating workflow, not a
generic chatbot, generic AI agent, or guaranteed-revenue offer.

---

## CSV-ready prospect table

```csv
business_name,website_url,city,state,category,contact_page_url,booking_url,public_email_if_visible,phone_if_visible,source_url,initial_fit_reason,suspected_lead_rescue_opportunity,notes
"SculptME Med Spa","https://sculptmemedspa.com/","Alamo","CA","Medspa / injectables","https://sculptmemedspa.com/contact/","","","","https://sculptmemedspa.com/","Visible Botox/Dysport/Xeomin service content in an affluent local market; non-enterprise single-location feel.","Medium","Audit should confirm whether booking is prominent on mobile and whether contact forms trigger fast follow-up."
"B.TOX.BAR.","https://www.btoxbar.com/","Los Gatos","CA","Medspa / injectables","https://www.btoxbar.com/contact","","","","https://www.btoxbar.com/","High-value injectables and Daxxify positioning; premium local aesthetic buyer likely expects easy booking.","Medium","Multiple service pages create good audit surface; check if CTA path is consistent across service pages."
"Be You Medical","https://beyouthful.com/pages/sacramento","Sacramento","CA","Medical aesthetics / wellness","https://beyouthful.com/pages/contact","","","","https://beyouthful.com/pages/sacramento","Location page shows appointment and contact prompts plus newsletter capture; multi-location but still clinic-style.","Medium","Potential friction if location, contact, and booking paths compete."
"Rejuvify Med Spa","https://www.rejuvifymedspa.com/med-spa-in-los-angeles","Los Angeles","CA","Medspa / regenerative aesthetics","https://www.rejuvifymedspa.com/contact","https://www.rejuvifymedspa.com/","","(310) 962-8900","https://www.rejuvifymedspa.com/med-spa-in-los-angeles","Offers Botox, Morpheus8, IV therapy, and body contouring; explicit online booking plus phone creates measurable enquiry paths.","Medium","Good candidate for response-time and missed-call capture audit rather than basic website replacement."
"The Botox Spot","https://www.thebotoxspot.com/","Riverside","CA","Injectables / mobile Botox","https://www.thebotoxspot.com/contact-us/","https://www.thebotoxspot.com/","","(909) 752-6869","https://www.thebotoxspot.com/","Botox-focused offer with book-online and call paths; mobile-service model depends on clean enquiry routing.","Medium","Check if mobile visitors can quickly choose in-spa vs mobile appointment."
"Bella Glo Med Spa","https://www.bellagloaesthetics.com/injectables/neurotoxins/","Carlsbad","CA","Medspa / neurotoxins","https://www.bellagloaesthetics.com/contact/","","","(760) 453-7523","https://www.bellagloaesthetics.com/injectables/neurotoxins/","Neurotoxin page targets Botox near Carlsbad and references book-online or phone; clear high-value treatment intent.","Medium","Audit whether service-specific lead source is preserved after form or booking click."
"Dr. Sheena Kong Med Spa","https://www.sheenakong.com/contact/","San Francisco","CA","Medspa / aesthetics","https://www.sheenakong.com/contact/","","","","https://www.sheenakong.com/contact/","Contact page references consultations and Book Online Now; established physician-led aesthetic practice.","Medium","Opportunity if contact form and online booking are separate with no unified lead summary."
"La Belle Medspa","https://labelleoc.com/","Tustin","CA","Medspa / skin membership / injectables","https://labelleoc.com/contact/","","","","https://labelleoc.com/","High-value memberships, RF microneedling, Botox, and Laserlift; multiple offers can dilute the primary CTA.","Medium","Audit should focus on single next action for first-time visitors."
"ETX Inject","https://www.etxinject.com/","Crandall","TX","Aesthetic clinic / injectables / wellness","https://www.etxinject.com/contact","","","","https://www.etxinject.com/","Two-location rural/community aesthetic clinic with injectables and wellness services; likely owner-operated or small regional.","High","Multi-location enquiry capture and text/call follow-up could be valuable if current paths are fragmented."
"Dr. G Medical Solutions Aesthetics","https://drgmedicalsolutions.com/service/aesthetics/","Livingston","TX","Medical aesthetics within medical practice","https://drgmedicalsolutions.com/contact/","https://drgmedicalsolutions.com/service/aesthetics/","admin@drgmedicalsolutions.com","936-327-1015","https://drgmedicalsolutions.com/service/aesthetics/","Aesthetic services page lists Botox, Juvederm, Kybella, PRP and a form promising confirmation within 24 hours.","High","The 24-hour confirmation language suggests room for faster lead alerts and daily lead rescue summaries."
"InjectCo","https://injectco.com/","Multiple Texas cities","TX","Medical aesthetic clinic / injectables / laser / weight loss","https://injectco.com/contact","https://injectco.com/","","","https://injectco.com/","Strong service demand and transparent Botox pricing; multiple Texas locations but still niche-specific.","Low","Potentially more scaled than ideal; include only if Anton wants higher-volume Texas reference targets."
"Urbane Aesthetiks Medspa","https://www.urbanemedspa.com/blog","Richardson","TX","Medspa / injectables / laser","https://www.urbanemedspa.com/contact","https://www.urbanemedspa.com/","","","https://www.urbanemedspa.com/blog","Blog and service content show Botox, lip filler, laser hair removal and PDO threads; content engine suggests active local marketing.","Medium","Audit should determine if educational traffic has a clear book-appointment path and follow-up capture."
"MEDSPA 33","https://www.medspa33.com/","Plano","TX","Luxury medspa / injectables","https://www.medspa33.com/contact","","","","https://www.medspa33.com/","Plano luxury aesthetic clinic with Botox and fillers; likely high-value local enquiries.","Medium","Check mobile CTA clarity and whether consultation requests are tracked separately from generic contact."
"Vital Skin and Body","https://vitalskinandbody.com/","Temple","TX","Aesthetic treatments / Botox / skincare","https://vitalskinandbody.com/contact/","","","","https://vitalskinandbody.com/","Botox and advanced skincare services in a smaller Texas market; likely small-to-medium operator.","Medium","Possible fit if website has treatment clarity but weak lead capture/follow-up."
"MedSpa 22","https://medspa22.com/","Fort Myers","FL","Medical spa / cosmetic enhancement","https://medspa22.com/contact-us/","https://medspa22.com/","","","https://medspa22.com/","Service mix includes injectables, laser, weight loss, hormone therapy, vitamins; consultation form collects interest but uses generic Send CTA.","High","Generic form CTA and broad service mix indicate missed enquiry classification and follow-up opportunity."
"Living Young Center","https://livingyoungcenter.com/","St. Petersburg","FL","Medical spa / injectables / wellness","https://livingyoungcenter.com/contact/","","","","https://livingyoungcenter.com/","Established over 18 years with multiple Florida locations and injectable services; established SMB/regional profile.","Medium","Multi-location enquiries may benefit from routing and daily summaries; confirm enterprise-chain risk before outreach."
"TAO Medical Spa","https://www.discovertao.com/","Melbourne","FL","Medical spa / injectables / fillers","https://www.discovertao.com/contact","https://www.discovertao.com/","","321-372-1132","https://www.discovertao.com/","Reserve Online and Schedule Consultation both appear; rich injectables menu creates conversion audit surface.","Medium","Opportunity if dual CTAs create friction or no follow-up safety net exists after booking abandonment."
"Castellon Plastic Surgery Center Med Spa","https://www.drcastellon.com/medspa/","Melbourne","FL","Plastic surgery medspa / cosmetic treatments","https://www.drcastellon.com/contact/","","","","https://www.drcastellon.com/medspa/","Elective clinic with medspa treatments under board-certified surgeon; high-value consultation enquiries.","Medium","Lead rescue angle should emphasize admin enquiry capture, not clinical triage."
"Begin Anew Med Spa","https://www.beginanewmed.com/facial-aesthetics-medical-spa-treatments-jupiter/daxxify/","Jupiter","FL","Wellness and aesthetics / Daxxify","https://www.beginanewmed.com/contact/","","","","https://www.beginanewmed.com/facial-aesthetics-medical-spa-treatments-jupiter/daxxify/","Daxxify and medically guided aesthetics suggest premium treatment economics and service-specific intent pages.","Medium","Audit whether each high-intent treatment page routes to a tracked consultation path."
"Lumière Medspa Boca Raton","https://www.hornplasticsurgery.com/medspa/","Boca Raton","FL","Plastic surgery medspa / injectables / laser","https://www.hornplasticsurgery.com/contact/","https://www.hornplasticsurgery.com/medspa/","","561-288-0708","https://www.hornplasticsurgery.com/medspa/","High-value medspa attached to plastic surgery practice; consultation form includes procedure interest and best-time-to-reach fields.","Medium","Good audit candidate for response workflow and source-of-interest routing."
"Dr. G Med Spa","https://www.drgmedspa.com/","Boca Raton","FL","Medical spa / injectables / skincare","https://www.drgmedspa.com/contact","","","","https://www.drgmedspa.com/","Aesthetic injectables and skincare specialist with clinic hours and local office info; likely focused elective practice.","Medium","Check whether appointment path is immediate enough for high-intent Botox/filler traffic."
"Synergy Face + Body","https://feelsynergy.com/","Raleigh","NC","Medspa / plastic surgery / wellness","https://feelsynergy.com/contact/","https://feelsynergy.com/","","(919) 510-5130","https://feelsynergy.com/","Multiple NC locations, medspa plus plastic surgery and weight management; strong service breadth and call/text options.","Low","May be too large/regional for first wave, but useful as a benchmark for mature lead-routing patterns."
"Glo de Vie Med Spa","https://www.glodevie.com/services/cosmetic-injectables","Raleigh","NC","Medspa / cosmetic injectables","https://www.glodevie.com/contactus","https://www.glodevie.com/services/cosmetic-injectables","","919-510-5919","https://www.glodevie.com/services/cosmetic-injectables","Injectables service page explicitly asks visitors to contact or request a visit; high-intent page for Botox/fillers.","Medium","Audit if request-a-visit flow produces a quick owner-visible lead list."
"Skinsational Aesthetics","https://www.skinsationalaesthetics.org/areas-served/concord-north-carolina","Concord","NC","Medspa / injectables","https://www.skinsationalaesthetics.org/contact","https://www.skinsationalaesthetics.org/areas-served/concord-north-carolina","","","https://www.skinsationalaesthetics.org/areas-served/concord-north-carolina","Local area page with Botox, Dysport, fillers and Sculptra; visible Contact and Book Now CTAs.","Medium","Audit whether local SEO pages route cleanly into a booking/contact flow."
"Horizon Med Spa","https://horizonmedspa.com/","High Point","NC","Medspa / injectables","https://horizonmedspa.com/contact-us/","","","","https://horizonmedspa.com/","Local medspa with Botox testimonials and contact path; likely small-to-medium operator.","Medium","Opportunity depends on whether phone/form enquiries are logged and followed up systematically."
"Pinnacle Med Spa","https://pinnacle-medspa.com/","Moyock","NC","Medical weight loss / Botox / aesthetics","https://pinnacle-medspa.com/contact-us/","https://pinnacle-medspa.com/","","","https://pinnacle-medspa.com/","Medical weight loss plus Botox/aesthetics in smaller market; clear service demand and likely lean admin team.","High","Lead Rescue can help route weight-loss, hormone, and Botox enquiries without turning into clinical advice."
"Renew Med Spa","https://renewmedspanc.com/","Waxhaw","NC","Medspa / aesthetics","https://renewmedspanc.com/contact/","","","704-843-0226","https://renewmedspanc.com/","Local NC medspa with direct contact prompt and phone; likely small established operator.","Medium","Audit for mobile CTA clarity and after-hours missed enquiry capture."
"Urban MedSpa Charlotte","https://urbanmedspacharlotte.com/botox-fillers-matthews/","Charlotte","NC","Medspa / Botox and fillers","https://urbanmedspacharlotte.com/contact-us/","","","","https://urbanmedspacharlotte.com/botox-fillers-matthews/","Area-specific Botox/filler page and surrounding Charlotte market pages; high-intent local SEO traffic.","Medium","Opportunity if local SEO visitors are not routed to a fast booking path."
"Franklin Skin and Laser","https://franklinlaser.com/facial-aesthetics/skin-tightening/morpheus8/","Franklin / Nashville","TN","Skin and laser / Morpheus8 / facial aesthetics","https://franklinlaser.com/contact/","https://franklinlaser.com/facial-aesthetics/skin-tightening/morpheus8/","","","https://franklinlaser.com/facial-aesthetics/skin-tightening/morpheus8/","Board-certified surgeon-led Morpheus8 page with Book Now; high-ticket procedure intent.","Medium","Audit should focus on booking abandonment and follow-up visibility."
"Thomas Rose Aesthetics","https://www.thomasrosemedspa.com/morpheus-8","Nashville","TN","Medspa / Morpheus8 / injectables","https://www.thomasrosemedspa.com/contact","https://www.thomasrosemedspa.com/morpheus-8","","","https://www.thomasrosemedspa.com/morpheus-8","Morpheus8 and skin laxity pages with repeated Book Here/Book Now CTAs; likely small specialized aesthetic clinic.","Medium","Potential if many CTAs lead to third-party booking with no abandoned-enquiry rescue."
"Hourglass Aesthetics","https://hourglassmedspa.com/nashville/","Nashville","TN","Medspa / Morpheus8 / laser / hair growth","https://hourglassmedspa.com/contact/","https://hourglassmedspa.com/nashville/","","859-903-7546","https://hourglassmedspa.com/nashville/","Nashville medspa page includes Book Now, gift card, text, VIP list and many services; active commercial funnel.","High","Multiple action paths create lead-routing and follow-up visibility opportunity."
"Hello Laser","https://www.hellolaserspa.com/med-spa-arcadia-biltmore-phoenix","Phoenix","AZ","Luxury medspa / laser / body contouring","https://www.hellolaserspa.com/contact","","","","https://www.hellolaserspa.com/med-spa-arcadia-biltmore-phoenix","Luxury Biltmore/Arcadia medspa with EmSculpt Neo, CoolSculpting, laser hair and tattoo removal; high-value treatment mix.","Medium","Audit treatment-page CTA clarity and whether body-contouring consultations are followed up promptly."
"Revital-AZ Medical Spa & Laser Center","https://www.revitalaz.com/services/pro-nox","Carefree / Scottsdale","AZ","Laser and medical spa","https://www.revitalaz.com/contactus","https://www.revitalaz.com/services/pro-nox","","480-877-0541","https://www.revitalaz.com/services/pro-nox","Procedure-support page references consultations bookable online or by phone; established Scottsdale/Carefree aesthetic practice.","Medium","Opportunity if service pages do not capture intent before sending visitors into booking software."
"Lazaderm Chandler","https://lazaderm.com/locations/chandler-az","Chandler","AZ","Medical spa / CoolSculpting / Botox / filler / laser","https://lazaderm.com/contact","https://lazaderm.com/locations/chandler-az","","","https://lazaderm.com/locations/chandler-az","Location page promotes CoolSculpting Elite and physician-led aesthetics; high-value elective services.","Medium","Audit location-specific routing and follow-up for CoolSculpting consults."
"National Laser Institute Medical Spa","https://nlimedspa.com/blog/coolsculpting-deals-in-az/","Phoenix / Scottsdale","AZ","Medical spa / laser training medspa / CoolSculpting","https://nlimedspa.com/contact/","https://nlimedspa.com/blog/coolsculpting-deals-in-az/","","","https://nlimedspa.com/blog/coolsculpting-deals-in-az/","CoolSculpting and medical spa offer in AZ; booking path may be more complex due to training/model structure.","Low","May not match standard medspa buying motion; include as benchmark or exclude from first outreach if enterprise/training model is too complex."
"ReDerm MD Medical Spa","https://www.redermmd.com/about-rederm/dr-robert-g-fante/","Denver","CO","Medical spa / oculoplastic surgery / CoolSculpting","https://www.redermmd.com/contact-us/","","","","https://www.redermmd.com/about-rederm/dr-robert-g-fante/","Physician-led elective/aesthetic clinic with CoolSculpting and surgical credibility; high-value enquiries.","Medium","Lead Rescue pitch should focus on consultation request visibility and admin routing, not clinical advice."
```

---

## Website/enquiry audit rubric

Use this as a 10–15 minute first-pass score before writing any personalized outreach.
Score 1–5 where 1 = weak/friction-heavy and 5 = clear/strong. Add one sentence of
evidence per score.

| Dimension | 1 | 3 | 5 | Evidence to capture |
|---|---|---|---|---|
| Above-the-fold CTA clarity | No obvious action, generic "learn more," or competing buttons. | CTA exists but competes with several equal-weight actions. | One clear buyer-intent CTA such as "Book a consultation" or "Request appointment." | Screenshot/notes from desktop and mobile hero. |
| Booking/contact path clarity | Visitor must hunt; booking, phone, and forms are hidden or inconsistent. | Path exists but route choice is unclear or split across third-party booking, phone, and generic contact. | Visitor can choose the right action in one tap/click from every high-intent page. | Count clicks from treatment page to booking/contact. |
| Mobile trust/speed impression | Slow, cluttered, unreadable, intrusive popups, or low trust signals. | Usable but crowded, inconsistent, or missing reassurance near the CTA. | Fast-feeling, clean hierarchy, clear credentials/reviews/location near decision points. | Mobile viewport notes; do not need lab tooling for this first pass. |
| Treatment/service clarity | Services are vague, buried, or not mapped to visitor problems. | Service list is visible but benefits, candidacy, price/consultation expectations are uneven. | High-value treatments are clearly explained with next step, expectations, and trust cues. | Name 2–3 high-value services and whether they have dedicated pages. |
| Lead capture/follow-up quality | Only a generic form/phone number; no expectation-setting; no visible follow-up safety net. | Form or booking exists but no clear response time, routing, or after-hours capture. | Multiple enquiry channels are captured, routed, acknowledged, and owner-visible. | Note forms, phone/text, booking widgets, chatbot/concierge, newsletter/VIP capture. |

### Lead Rescue opportunity

| Rating | Definition | Typical signal | Outreach angle |
|---|---|---|---|
| High | Clear evidence of missed-enquiry risk or fragmented lead paths. | Generic forms, 24-hour response promise, many CTAs, third-party booking handoff, no after-hours capture, multi-location routing. | "Your website is already creating intent; the risk is enquiries disappearing between form, phone, booking, and follow-up." |
| Medium | Website has service demand and a working path, but follow-up visibility is uncertain. | Good service pages, booking and phone present, but no visible daily lead list or abandoned-booking rescue. | "This is a conversion and response-time audit, not a new-website pitch." |
| Low | Mature booking and routing appears strong, clinic is too scaled, or fit is unclear. | Enterprise/regional chain, robust booking stack, strong CTA discipline, less owner-operated. | Use only as benchmark or skip first-wave outreach. |

---

## Google Sheets template

**Sheet name:** CorpFlowAI - US Medspa Revenue Machine

### Tab: Prospects

Columns:

- `business_name`
- `website_url`
- `city`
- `state`
- `category`
- `contact_page_url`
- `booking_url`
- `public_email_if_visible`
- `phone_if_visible`
- `source_url`
- `initial_fit_reason`
- `suspected_lead_rescue_opportunity`
- `notes`
- `audit_status` — Not started / Audited / Outreach drafted / Anton approved / Sent / Follow-up due / Closed
- `cta_clarity_score_1_5`
- `booking_path_score_1_5`
- `mobile_trust_speed_score_1_5`
- `service_clarity_score_1_5`
- `lead_capture_score_1_5`
- `lead_rescue_rating` — High / Medium / Low
- `personalized_angle`
- `draft_outreach_subject`
- `draft_outreach_body`
- `anton_approval_status` — Pending / Approved / Revise / Do not contact
- `approved_send_channel` — Email / Contact form / Phone follow-up / LinkedIn / None
- `date_added`
- `last_reviewed_date`
- `next_action_date`
- `owner`
- `do_not_contact_reason`

### Tab: Audit Rubric

Columns:

- `dimension`
- `score_1_definition`
- `score_3_definition`
- `score_5_definition`
- `evidence_to_capture`
- `example_observation`
- `recommended_outreach_angle`

### Tab: Outreach Templates

Columns:

- `template_name`
- `use_case`
- `subject_line`
- `opening_line_pattern`
- `proof_or_observation_block`
- `offer_explanation`
- `cta`
- `follow_up_1`
- `follow_up_2`
- `compliance_notes`

Starter rows:

```csv
template_name,use_case,subject_line,opening_line_pattern,proof_or_observation_block,offer_explanation,cta,follow_up_1,follow_up_2,compliance_notes
"Audit-first medspa intro","High or Medium Lead Rescue rating","Quick enquiry-path note for {{business_name}}","I was reviewing {{service_or_page}} and noticed {{specific_public_observation}}.","This looks like high-intent traffic where phone, form, and booking handoffs can create missed enquiries.","CorpFlowAI helps clinics turn the website into a clearer enquiry and booking system: cleaner CTA path, lead capture, and a simple follow-up view.","Would you like me to send a 5-point screenshot audit for {{business_name}}?","Worth a quick look, or should I close the loop?","No worries if this is already handled — I can send the audit only if useful.","Do not claim revenue lift; do not imply hidden tracking; use public observations only."
"Website migration angle","Website looks service-rich but CTA-fragmented","Website enquiry path idea for {{business_name}}","Your {{treatment_category}} pages show strong buyer intent, but the next action appears split between {{path_a}} and {{path_b}}.","The risk is not traffic; it is losing people after they decide they are interested.","Product A is an AI-ready website rebuild or migration wrapped around lead capture and Lead Rescue, so enquiries are easier to book, review, and follow up.","Open to a short Loom-style audit before any call?","I can keep this to three screenshots and one suggested fix list.","If website work is not a priority this quarter, should I revisit later?","No bulk send; Anton approval before sending."
```

### Tab: Google Vids Assets

Columns:

- `asset_name`
- `script_version`
- `target_duration`
- `target_viewer`
- `primary_hook`
- `scene_count`
- `validation_asset_link`
- `production_status` — Draft / Needs review / Approved / Produced / Archived
- `doctrine_review_status`
- `notes`

### Tab: Follow Up Queue

Columns:

- `business_name`
- `approved_send_channel`
- `first_touch_date`
- `last_touch_date`
- `next_follow_up_date`
- `follow_up_number`
- `reply_status` — No reply / Interested / Not now / Not fit / Do not contact
- `last_message_summary`
- `next_message_draft`
- `anton_review_required`
- `stop_reason`
- `booked_call_url_or_date`
- `notes`

---

## Google Vids script A — 60–90 second Product A explainer: "Your website is your enquiry system"

**Target viewer:** owner/operator of a medspa, aesthetic clinic, or elective clinic.
**Target duration:** 75 seconds.
**Primary CTA:** Request a 5-point enquiry-path audit.
**Validation asset:** prospect-specific website/enquiry audit or Product A one-page explainer.

| Scene | Visual direction | Narration | On-screen text | Production notes |
|---|---|---|---|---|
| 1 | Calm clinic website mockup on phone; cursor hovers over Book / Contact / Call. | "For a medspa, your website is not just a brochure. It is the front door to your enquiry system." | Your website is your enquiry system. | Use synthetic clinic mockup; no real clinic screenshots. |
| 2 | Split view: visitor wants Botox, filler, laser, or weight-loss consult; arrows branch to form, phone, booking widget, Instagram. | "A visitor arrives with intent. They want Botox, filler, laser, weight loss, or a consultation. But the next step is often split between a form, a phone number, a booking widget, and social DMs." | High intent can still leak. | Keep tone calm; do not shame clinics. |
| 3 | Simple leak diagram: Website visit → intent → friction → no owner-visible follow-up. | "The risk is not always traffic. The risk is that a good enquiry disappears before anyone can respond, route it, or follow up." | Missed enquiry risk = lost visibility. | Avoid revenue guarantees. |
| 4 | CorpFlowAI Product A diagram: AI-ready website / migration + lead capture + Lead Rescue + daily owner view. | "CorpFlowAI Product A rebuilds or migrates the website around the operating job: clearer treatment pages, cleaner CTAs, better lead capture, and Lead Rescue so new enquiries are visible." | Website rebuild + lead capture + Lead Rescue. | Position as managed workflow, not chatbot. |
| 5 | Example dashboard card: New enquiries today; source; treatment interest; follow-up status. | "The outcome is simple: when someone shows intent, the clinic has a cleaner path to booking and a clearer view of what needs follow-up." | Capture. Route. Follow up. | Use synthetic data only. |
| 6 | Final CTA screen with CorpFlowAI brand treatment. | "If you want to know where your current website may be leaking enquiries, request a 5-point enquiry-path audit before changing anything." | Request a 5-point enquiry-path audit. | Add disclaimer: audit uses public website observations only. |

**CTA copy:** "Request a 5-point enquiry-path audit."

---

## Google Vids script B — 2–3 minute sample medspa website/enquiry audit walkthrough

**Target viewer:** medspa owner/operator who already has a website and wants practical evidence.
**Target duration:** 2 minutes 30 seconds.
**Primary CTA:** Ask for a clinic-specific audit.
**Validation asset:** Audit Rubric tab plus prospect-specific screenshot notes.

| Scene | Visual direction | Narration | On-screen text | Production notes |
|---|---|---|---|---|
| 1 | Synthetic medspa homepage mockup named "Example Aesthetic Clinic." | "This is a sample audit walkthrough. We are not naming or shaming a real clinic. The goal is to show the kinds of friction that can quietly cost a clinic enquiries." | Sample audit. Synthetic clinic. | Use fully synthetic UI and business name. |
| 2 | Mobile hero with beautiful image but vague button: "Learn More." | "First, above the fold. The visitor should know what to do in five seconds. If the only action is 'Learn More,' the page is asking a ready buyer to keep searching." | Rubric 1: CTA clarity. | Show score: 2/5 example. |
| 3 | Treatment page for "Botox and fillers" with buttons: Contact, Book, Specials, Membership, Call. | "Second, booking path clarity. Medspa visitors often come from a treatment page. If the next step is split across five equal actions, some people will pause, leave, or intend to come back later." | Rubric 2: Booking path clarity. | Emphasize clarity, not criticism. |
| 4 | Slow-feeling mobile screen with pop-up, tiny text, review badge buried at bottom. | "Third, mobile trust and speed impression. The first impression needs to feel clean, credible, and easy. Credentials, location, reviews, and the next step should support the decision, not compete with it." | Rubric 3: Mobile trust/speed. | Do not make technical performance claims without measurement. |
| 5 | Service cards for Botox, filler, laser, weight loss; one has clear expectations, others vague. | "Fourth, treatment clarity. High-value services deserve clear pages: who it is for, what happens next, what to expect, and how to request a consultation." | Rubric 4: Treatment clarity. | Use synthetic treatment names and non-medical language. |
| 6 | Contact form says "Send"; no response time; phone and booking widget are separate. | "Fifth, lead capture and follow-up. A generic form can work, but it often does not tell the owner what happened, which service the visitor wanted, or whether anyone followed up." | Rubric 5: Lead capture quality. | Avoid claiming hidden failures; phrase as risk. |
| 7 | Lead Rescue diagram: Form, phone, booking request, DM → simple lead list and follow-up status. | "Lead Rescue is the safety net. It does not replace your staff, and it is not a generic chatbot. It helps capture the enquiry, summarize the intent, route it, and keep follow-up visible." | Lead Rescue = visibility + follow-up. | Human-in-the-loop language. |
| 8 | Scorecard summary: CTA 2, booking path 2, mobile trust 3, service clarity 4, lead capture 2; opportunity High. | "In this sample, the clinic may not need more traffic first. It may need a cleaner enquiry system around the traffic it already has." | Sample verdict: High opportunity. | Label as sample, not diagnostic. |
| 9 | CTA slide. | "If you want this done for your clinic using public pages only, request a clinic-specific 5-point audit." | Ask for a clinic-specific audit. | Include no guaranteed-revenue language. |

**CTA copy:** "Ask for a clinic-specific 5-point audit."

---

## Google Vids script C — 2–4 minute client onboarding walkthrough

**Target viewer:** clinic owner/operator after initial interest but before setup.
**Target duration:** 3 minutes 15 seconds.
**Primary CTA:** Start intake for the enquiry-system rebuild.
**Validation asset:** onboarding checklist and Product A scope document.

| Scene | Visual direction | Narration | On-screen text | Production notes |
|---|---|---|---|---|
| 1 | Founder-style welcome slide with clinic website mockup and simple pipeline. | "Welcome. This walkthrough explains how CorpFlowAI turns a clinic website into a better enquiry and booking system." | From website to enquiry system. | Calm, consultative voice. |
| 2 | Current-state map: website pages, booking widget, phone, email, forms, Instagram. | "We start by mapping where enquiries can currently enter: treatment pages, contact forms, booking links, phone calls, email, ads, and social messages." | Step 1: Map enquiry paths. | Use synthetic example; no real patient data. |
| 3 | Audit screen showing the five rubric dimensions. | "Then we score the current path: CTA clarity, booking path clarity, mobile trust, treatment clarity, and lead capture or follow-up quality." | Step 2: Score the friction. | Connect to Audit Rubric tab. |
| 4 | Rebuild/migration wireframe: hero CTA, treatment page CTA, contact form, confirmation, lead summary. | "If the website needs a rebuild or migration, we design around the operating job first: help the visitor choose the right next step, capture the right details, and reduce handoff friction." | Step 3: Rebuild around action. | Not a design-only website pitch. |
| 5 | Lead Rescue flow: enquiry captured → source and treatment interest logged → owner/operator view → follow-up reminder. | "Lead Rescue is added as the safety net. A new enquiry should not disappear into one inbox, one booking tool, or one missed phone call. The clinic gets a simple view of what came in and what needs follow-up." | Step 4: Add Lead Rescue. | Do not promise automated patient messaging. |
| 6 | Human review checkpoint: "Anton approval / clinic approval before sending." | "Anything that goes to a prospect or client is reviewed. We do not auto-send outreach to your patients. We do not make clinical decisions. We focus on admin visibility, routing, and follow-up." | Human review. No clinical triage. | Important regulated-data boundary. |
| 7 | Setup plan: public-page audit, access checklist, form/booking review, test lead, daily summary, handoff. | "The setup is practical: confirm the pages and offers, connect or rebuild the form path, test the enquiry flow, verify notifications, and agree what the owner should see each day." | Step 5: Test the full path. | Use checklist visuals. |
| 8 | Before/after comparison: fragmented actions vs clear path and lead list. | "The goal is not a prettier website in isolation. The goal is a calmer system: clearer buyer action, fewer lost enquiries, and better follow-up visibility." | Outcome: clearer action, better visibility. | Avoid guaranteed revenue; use operational outcomes. |
| 9 | CTA slide with intake form mockup. | "If you are ready to review your current path, start intake for the enquiry-system rebuild. We will begin with the audit, confirm fit, and only then recommend the right scope." | Start intake for the enquiry-system rebuild. | CTA names buyer intent, not internal process. |

**CTA copy:** "Start intake for the enquiry-system rebuild."
