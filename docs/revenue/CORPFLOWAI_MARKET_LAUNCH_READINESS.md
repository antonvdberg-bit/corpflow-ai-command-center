# CorpFlowAI market launch readiness

**Status:** Physical work register · **Updated:** 2026-07-13  
**Month-end target:** MUR 150,000–200,000  
**Anchor:** `<!-- CORPFLOWAI_MARKET_LAUNCH_READINESS_V1 -->`

<!-- CORPFLOWAI_MARKET_LAUNCH_READINESS_V1 -->

---

## A. Public product surfaces

| Surface | Live URL | Owner | Current status | Work remaining | Launch blocker | Evidence required | Anton approval |
| ------- | -------- | ----- | -------------- | -------------- | -------------- | ----------------- | -------------- |
| Homepage | `https://corpflowai.com/` | Anton | **Aligned in PR** | Live production verify | Deploy pending | HTTP 200 + screenshot | **Yes** |
| AI Lead Rescue Sprint | `/offers/ai-lead-rescue` | Anton | **Aligned in PR** | Live verify | Deploy | 200 + mailto CTA | **Yes** |
| Premium Landing Page Rescue | `/offers/premium-landing-page-rescue` | Anton | **Aligned in PR** | Live verify | Deploy | 200 | **Yes** |
| Customer Recovery Sprint | `/offers/customer-reputation-recovery` | Anton | **Aligned in PR** | Live verify | Deploy | 200 | **Yes** |
| Contact | `/contact` | Anton | **Aligned in PR** | Live verify | Deploy | mailto | **Yes** |

---

## B. Commercial operations

| Step | Exists today | Physical work remaining |
| ---- | ------------ | ------------------------- |
| ERPNext prospect record | Docs + evaluation | **ERPNext configuration** — NEEDS_ANTON |
| Discovery call | Templates in `docs/revenue/templates/` | Anton runs calls |
| Quote / deposit / verification | Templates | Manual |
| Delivery / release | Playbook + templates | Manual + Delivery Reality Audit |

---

## C. Sales assets

| Asset | Status |
| ----- | ------ |
| Quote / discovery / deposit templates | **Exists** |
| One-page offer PDF | **Missing** — P1 |
| Named case study | **NEEDS_ANTON** (anonymised proof on homepage) |

---

## D. Technical launch checks

| Check | Status |
| ----- | ------ |
| Production URLs | **PARTIAL** — preview in PR |
| HTTPS / domain | **READY** |
| Form persistence | **READY** (`/lead-rescue`); offers use mailto |
| Mobile nav | **Aligned in PR** |
| noindex on operator routes | **READY** |

---

## E. Legal and trust

| Item | Status |
| ---- | ------ |
| Privacy / terms / merchant identity | **READY** |
| Case study permission | **NEEDS_ANTON** |

---

## F. Launch decision

**READY_WITH_MANUAL_PROCESS**

### P0 remaining

1. Merge PR → production deploy → live verification  
2. Anton-led discovery against MUR offers  
3. ERPNext logging when configured  

### P1 remaining

1. Align `/lead-rescue` header/footer with public family  
2. Offer PDF + outreach assets  
3. Product A / France route decision  

### Anton decisions

1. Production merge/deploy  
2. Named vs anonymised case study  
3. Product A / France visibility  
4. ERPNext CRM go-live  
