# Prestige Procurement — scope matrix

**Status:** Planning matrix for #919. Classifications are CorpFlowAI recommendations until Prestige confirms.
**Anchor sentinel:** `<!-- PRESTIGE_PROCUREMENT_SCOPE_MATRIX_V1 -->`

<!-- PRESTIGE_PROCUREMENT_SCOPE_MATRIX_V1 -->

Do **not** assume every row is required. Each row is one of:

| Classification | Meaning |
|----------------|---------|
| **REQUIRED** | Needed for a defensible independent website handover in the base package |
| **OPTIONAL** | Priced separately; include only if Prestige asks |
| **OUT OF SCOPE** | Not in this engagement; would be a new quote |
| **CLIENT DECISION** | Must be confirmed with Prestige before the quotation is locked |

**Base-package assumption until discovery confirms otherwise:** about **eight** public pages, custom visual design, WordPress self-management, enquiry forms (not a full shop), client-paid hosting, training, and a 30-day defect warranty.

---

## 1. Information architecture / sitemap

| Item | Classification | Notes |
|------|----------------|-------|
| Home | REQUIRED | Offer, proof, primary enquiry CTA |
| About / company | REQUIRED | Trust page for B2B buyers |
| Services / capabilities overview | REQUIRED | What Prestige procures or supplies |
| 2–3 service or category pages | REQUIRED | Depth pages; extra pages are OPTIONAL |
| Contact | REQUIRED | Address/hours placeholders until Prestige supplies facts |
| Enquiry / request form | REQUIRED | Email notification to Prestige; no CRM install in base |
| Privacy / legal | REQUIRED | Standard Mauritius-appropriate privacy page; legal review is CLIENT DECISION |
| Product / SKU catalogue (browse + filters) | CLIENT DECISION | Include only if they sell/list many items publicly |
| Blog / news | OPTIONAL | Not required for independence |
| Careers / login portal / member area | OUT OF SCOPE | Separate programme |
| Multilingual (EN + FR) | CLIENT DECISION | Base is English unless they confirm |

**Open:** current website URL (if any), must-have page list, whether a public catalogue exists today.

---

## 2. Visual design and responsive UX

| Item | Classification | Notes |
|------|----------------|-------|
| Custom visual design (desktop + mobile) | REQUIRED | One design system; not a generic template look |
| Mobile-first layout and tap-friendly CTAs | REQUIRED | |
| Brand application (logo, colours, type) | REQUIRED | Prestige supplies brand files or agrees guided palette |
| Photography art direction | CLIENT DECISION | Client-supplied photos preferred |
| Original illustration / 3D / motion system | OPTIONAL | Stock or client photos in base |
| Unlimited design exploration | OUT OF SCOPE | Two structured design-review rounds in base |

---

## 3. Page / content management

| Item | Classification | Notes |
|------|----------------|-------|
| Prestige staff can edit pages without code | REQUIRED | WordPress block editor (or equivalent maintained CMS) |
| Draft / publish workflow | REQUIRED | Editor vs Admin roles |
| Reusable sections (hero, proof, CTA, FAQ) | REQUIRED | So they do not break layout when editing |
| Full visual page builder with no training | OPTIONAL | Increases fragility; not the independence default |

---

## 4. Products / services / catalogue

| Item | Classification | Notes |
|------|----------------|-------|
| Structured service pages (title, summary, enquiry CTA) | REQUIRED | |
| Public product catalogue with prices | CLIENT DECISION | Only if they need buyers to browse SKUs |
| Stock, cart, checkout, payments | OUT OF SCOPE | E-commerce is a separate quote |
| PDF spec sheets / downloadable documents | OPTIONAL | Simple media library in base; a document portal is extra |
| ERP / inventory integration | OUT OF SCOPE | |

---

## 5. Media / document management

| Item | Classification | Notes |
|------|----------------|-------|
| Image library with alt text | REQUIRED | |
| PDF upload for brochures | REQUIRED | Reasonable file-size limits |
| Automatic image compression | REQUIRED | So editors do not destroy performance |
| Digital asset management (DAM) product | OUT OF SCOPE | |
| Licensed stock photography budget | OPTIONAL | Client-paid or quoted separately |

---

## 6. Enquiry / form management

| Item | Classification | Notes |
|------|----------------|-------|
| Primary enquiry form (name, company, email, phone, message) | REQUIRED | |
| Email notification to Prestige | REQUIRED | Uses Prestige’s mailbox; CorpFlowAI is not the inbox |
| Spam protection | REQUIRED | |
| File attachment on form | OPTIONAL | |
| Multi-step RFQ wizard | OPTIONAL | |
| Live chat / WhatsApp automation / Lead Rescue | OUT OF SCOPE | Separate SKU if wanted later |
| CRM (HubSpot, GHL, ERPNext website leads) | CLIENT DECISION | Base stores form entries in CMS + email |

---

## 7. Users / roles / admin permissions

| Item | Classification | Notes |
|------|----------------|-------|
| Prestige Administrator account | REQUIRED | Client-owned after handover |
| Editor role (content, not plugins/hosting) | REQUIRED | |
| Author / contributor roles | OPTIONAL | |
| CorpFlowAI lingering admin after warranty | OUT OF SCOPE | Temporary access only during build + 30-day warranty, then removed |
| SSO / Microsoft 365 directory sync | OPTIONAL | |

---

## 8. SEO / meta / redirects

| Item | Classification | Notes |
|------|----------------|-------|
| Editable title, meta description, Open Graph | REQUIRED | |
| XML sitemap + robots.txt | REQUIRED | |
| Redirects for old URLs (if replacing a site) | CLIENT DECISION | Needs current URL list |
| Schema markup for organisation | REQUIRED | |
| Guaranteed Google ranking or traffic | OUT OF SCOPE | Never sold |
| Ongoing SEO retainer | OUT OF SCOPE | No CorpFlowAI recurring fee in this offer |

---

## 9. Analytics / reporting

| Item | Classification | Notes |
|------|----------------|-------|
| Privacy-respecting analytics on Prestige’s account | REQUIRED | Prestige owns the property (Plausible or GA4 — CLIENT DECISION) |
| Monthly CorpFlowAI performance reporting | OUT OF SCOPE | Would be a separate retainer |
| Search Console property in Prestige’s Google account | REQUIRED | Prestige owns it; CorpFlowAI helps set up during handover |

---

## 10. Backups / export / restore

| Item | Classification | Notes |
|------|----------------|-------|
| Automated backups on the chosen host | REQUIRED | Daily files + database, client-visible |
| Documented restore test once before handover | REQUIRED | |
| Full export (files + database) at handover | REQUIRED | |
| CorpFlowAI-operated backup vault | OUT OF SCOPE | Would recreate a hidden dependency |

---

## 11. Domain / DNS / SSL

| Item | Classification | Notes |
|------|----------------|-------|
| Advice on domain/DNS/SSL responsibilities | REQUIRED | Prestige (or their registrar) owns the domain |
| SSL on the chosen host | REQUIRED | Usually included by the host |
| CorpFlowAI registering or owning the domain | OUT OF SCOPE | Client must own the domain |
| DNS cutover from an existing live site | CLIENT DECISION | Scheduled with Prestige; not a silent cutover |

---

## 12. Hosting portability and deployment

| Item | Classification | Notes |
|------|----------------|-------|
| Hosting account in Prestige’s name | REQUIRED | Prestige pays the host |
| CorpFlowAI sets up WordPress on that host | REQUIRED | One-time |
| Written move instructions (export → new host) | REQUIRED | Independence proof |
| CorpFlowAI-hosted tenant (`*.corpflowai.com`) as the live site | OUT OF SCOPE | That would keep a CorpFlowAI runtime dependency |
| CorpFlowAI paying the host going forward | OUT OF SCOPE | Unless Anton later includes hosting in writing |

---

## 13. Migration / content population

| Item | Classification | Notes |
|------|----------------|-------|
| Populate the agreed pages from Prestige-supplied copy and images | REQUIRED | |
| Copywriting from scratch for all pages | OPTIONAL | Guided structure in base; full copywriting is extra |
| Migrate an existing large catalogue / hundreds of URLs | CLIENT DECISION | Changes effort band |
| Reconstruct missing brand assets | OPTIONAL | |

---

## 14. Training, documentation, handover

| Item | Classification | Notes |
|------|----------------|-------|
| 90-minute live training (recorded) | REQUIRED | Editors + one admin |
| Short written editor guide (how to change a page, add a service, download backups) | REQUIRED | |
| Admin credential handover via approved secure channel | REQUIRED | Not in GitHub, email body, or this repo |
| Ongoing “we’ll keep editing it for you” | OUT OF SCOPE | Contradicts independence + no-retainer model |

---

## 15. Acceptance, revisions, warranty / support

| Item | Classification | Notes |
|------|----------------|-------|
| Two structured revision rounds (design + pre-launch) | REQUIRED | One consolidated written batch per round |
| Named Prestige approver | REQUIRED | Single decision-maker |
| 30-day defect warranty after acceptance | REQUIRED | Break/fix only; not new features |
| Unlimited revisions | OUT OF SCOPE | |
| 12-month support retainer | OUT OF SCOPE | Optional later; not in this one-off fee |

---

## 16. Optional future features (separated from base)

Price only if Prestige asks. Do not fold into the base meeting narrative.

| Feature | Classification |
|---------|----------------|
| Public product catalogue | CLIENT DECISION / OPTIONAL |
| E-commerce checkout | OUT OF SCOPE |
| Multilingual | OPTIONAL |
| Blog | OPTIONAL |
| WhatsApp click-to-chat button (manual, no API) | OPTIONAL |
| AI Lead Rescue / automated follow-up | OUT OF SCOPE (separate SKU) |
| ERPNext customer portal | OUT OF SCOPE |
| Custom application / login / quoting engine | OUT OF SCOPE |

---

## Base vs negotiation levers (use these, don’t invent a new product)

If Prestige wants a lower price, remove in this order:

1. Drop from custom UI to **premium theme + brand customization** (leaner option).
2. Reduce to **five** pages (Home, About, Services, Contact, Privacy).
3. Prestige populates all copy themselves (CorpFlowAI builds empty templates).
4. Drop photography sourcing.

Do **not** keep full custom design + catalogue + copywriting and then discount the MUR 285,000 recommendation without Anton’s explicit price decision.
