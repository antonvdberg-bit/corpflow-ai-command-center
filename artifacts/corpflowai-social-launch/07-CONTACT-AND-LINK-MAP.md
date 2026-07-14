# Contact and Link Map

**Status:** `DRAFT ONLY` — **EXTERNAL PUBLISHING REQUIRES ANTON APPROVAL**

Canonical link and contact discipline for all social surfaces.

---

## Primary contacts (public)

| Channel | Value | Use on social |
|---------|-------|---------------|
| Website | https://corpflowai.com | All platforms — profile website field |
| Discovery call | https://corpflowai.com/contact#discovery | **Primary CTA** — link-in-bio, buttons, posts |
| Email | support@corpflowai.com | Posts, About, contact buttons |
| Offers index | https://corpflowai.com/offers | Educational posts |
| Lead Rescue | https://corpflowai.com/offers/ai-lead-rescue | O-01 posts |
| Landing Page Rescue | https://corpflowai.com/offers/premium-landing-page-rescue | O-02 posts |
| Reputation Recovery | https://corpflowai.com/offers/customer-reputation-recovery | O-03 posts |

---

## Never publish on social

| Item | Reason |
|------|--------|
| Bank account numbers | Security + policy |
| ERPNext internal URLs | Operator-only |
| Admin / login URLs | Security |
| API keys, tokens, webhook secrets | Security |
| Client names without written consent | Privacy |
| Private WhatsApp Business API credentials | Security + Meta hold |
| Guaranteed revenue claims | Doctrine |

---

## UTM parameter discipline (optional — Anton enables when ready)

Base pattern for social links:

```
https://corpflowai.com/contact#discovery?utm_source={platform}&utm_medium=social&utm_campaign={content_id}
```

| Platform | `utm_source` |
|----------|--------------|
| LinkedIn | `linkedin` |
| Facebook | `facebook` |
| Instagram | `instagram` |
| YouTube | `youtube` |

| Content atom | `utm_campaign` |
|--------------|----------------|
| L-01 launch | `launch-01` |
| O-01 Lead Rescue | `offer-lead-rescue` |
| D-01 discovery | `discovery-invite` |

**Note:** UTM on hash URLs (`#discovery`) may not pass to analytics on all platforms. Prefer `https://corpflowai.com/contact?utm_source=linkedin&utm_medium=social&utm_campaign=launch-01#discovery` if Plausible UTM tracking is active.

---

## CTA hierarchy

1. **Book a discovery call** → contact#discovery (default for all posts)
2. **See the offer** → specific `/offers/*` page (offer posts)
3. **Email us** → support@corpflowai.com (fallback)
4. **Visit corpflowai.com** → homepage (awareness only)

---

## Platform link placement

| Platform | Profile link | Post links | Notes |
|----------|--------------|------------|-------|
| LinkedIn | corpflowai.com | Full URLs in post body | Clickable in posts |
| Facebook | corpflowai.com + CTA button → discovery | Full URLs | CTA button primary |
| Instagram | Single link → discovery | "Link in bio" in captions | No clickable post links |
| YouTube | corpflowai.com in description | Links in description + pinned comment | End-screen cards to discovery |

---

## Mailto template (for posts mentioning email)

```
support@corpflowai.com
```

**Discovery mailto** (from `rapid-delivery-offers.js` pattern — adapt per offer):

```
mailto:support@corpflowai.com?subject=Discovery%20call%20request&body=Hi%20CorpFlowAI%20team%2C%0A%0AI%20would%20like%20to%20book%20a%20discovery%20call.%0A%0ABusiness%20name%3A%0AHow%20enquiries%20reach%20us%20today%3A%0ABest%20contact%20number%3A%0A%0A
```

---

## Cross-link map (profiles → profiles)

| From | Link to | When |
|------|---------|------|
| LinkedIn About | YouTube channel URL | After YouTube live |
| Facebook About | LinkedIn company page | After LinkedIn live |
| Instagram bio | No cross-links (single URL slot) | Use discovery URL only |
| YouTube description | LinkedIn + Facebook page URLs | After all profiles live |

Record live profile URLs in [13-PLATFORM-STATUS.md](./13-PLATFORM-STATUS.md) when created.

---

## Response SLA (operator — not published, internal)

| Channel | Target response |
|---------|-----------------|
| support@corpflowai.com | 1 business day |
| Facebook Messenger (if enabled) | 1 business day — manual replies only |
| Instagram DMs | 1 business day — manual replies only |
| LinkedIn messages | 1 business day |
| YouTube comments | 2 business days |

**No auto-replies. No chatbots on social DMs in launch phase.**
