# Manual Outreach Runbook

**Status:** DRAFT ONLY · **Owner:** Anton  
**Scope:** 30-day CorpFlowAI commercial launch — warm network only

---

## Principles

1. **One-to-one** — every message is manually sent to one recipient
2. **Anton approves every external send** — check `15-ANTON-LAUNCH-APPROVAL.md`
3. **Route to website** — campaign drives discovery submissions, not DMs-for-pricing
4. **No automation** — no mail merge, no WhatsApp broadcast, no scheduled auto-send tools
5. **ERPNext is authoritative** — quotes, deposits, projects live there once configured

---

## Daily operator rhythm (15–30 min)

| Step | Action |
| ---- | ------ |
| 1 | Check `/admin/rapid-delivery` for new CF-… submissions |
| 2 | Check email for replies to outreach |
| 3 | Execute **one** calendar item from `03-30-DAY-CONTENT-CALENDAR.md` |
| 4 | Log activity in `14-LAUNCH-METRICS.md` |
| 5 | Friday: weekly metrics + follow-up pass |

---

## Outreach execution flow

```text
1. Select warm contact (existing relationship or referral)
2. Complete 11-PROSPECT-RESEARCH-TEMPLATE.md
3. If fit = Strong or Possible → pick draft (08/09/10)
4. Personalise [brackets] with verified facts only
5. Anton reviews → approves in 15-ANTON-LAUNCH-APPROVAL.md
6. Anton sends manually (email client / WhatsApp)
7. Log send date + draft ID in 14-LAUNCH-METRICS.md
8. If reply → 13-RESPONSE-AND-FOLLOW-UP-GUIDE.md
9. If interested → direct to offer page #discovery or send discovery link
10. On CF-… submission → acknowledge within 24h, book 15-min call
```

---

## Social publish flow

```text
1. Select post from 04/05/06/07 per calendar
2. Verify Hook / Proof / Depth + CTA to corpflowai.com
3. Anton approves specific post in 15-ANTON-LAUNCH-APPROVAL.md
4. Publish manually to platform
5. Log in 14-LAUNCH-METRICS.md (date, platform, post ID)
6. Optional: WA-08 to 2–3 warm contacts — "posted this, thought of you"
```

---

## Discovery intake flow (prospect-side)

Per `docs/revenue/CORPFLOWAI_GTM_SELLABLE_PATH.md`:

```text
Prospect clicks campaign link
  → https://corpflowai.com/offers/{slug} or /contact#discovery
  → Completes DiscoveryIntakeForm
  → Sees CF-… reference on screen
  → Row created in leads (product = corpflow-rapid-delivery)
```

**Operator:**

1. Open `/admin/rapid-delivery` (also linked from `/change/revenue`)
2. Review submission — qualify status
3. Copy proposal summary if helpful
4. Send post-intake email (EM template in `08-EMAIL-OUTREACH-DRAFTS.md`) — Anton-approved
5. Hold 15-min discovery call per `docs/revenue/templates/discovery-call-script.md`

---

## Sales flow after discovery call

Per `docs/revenue/REVENUE_DELIVERY_PLAYBOOK.md`:

```text
Discovery call (15 min)
  → Match offer (02-OFFER-MESSAGE-MATRIX.md)
  → Written quote within 24h (docs/revenue/templates/quote-email.md)
  → Client approves quote
  → Deposit request (docs/revenue/templates/deposit-request.md)
  → Client sends POP
  → Operator verifies CLEARED funds in bank
  → Approval to proceed email
  → 24–72h delivery clock starts
  → Preview → production release approval
  → ERPNext invoice + project record
```

**MUR sprints:** Mauritius clients pay in MUR. Do not ask MUR sprint clients to pay USD.

**USD wedge:** Separate path via `/lead-rescue` → `/admin/lead-rescue` — only when buyer fits pilot profile.

---

## Weekly review (30 min — Friday)

- [ ] Update `14-LAUNCH-METRICS.md` (all columns)
- [ ] Follow up non-responders (max 2 touches per contact in 30 days)
- [ ] Review `/admin/rapid-delivery` pipeline
- [ ] Adjust Week N+1 calendar if needed
- [ ] Note blockers for Anton

---

## Volume limits (anti-spam)

| Channel | Max per week |
| ------- | ------------ |
| Warm email | 3 |
| Warm WhatsApp | 3 |
| Referral asks | 1 |
| Social posts | 3–4 |
| Follow-ups | 5 total across channels |

---

## Explicit non-actions

| Non-action | Reason |
| ---------- | ------ |
| Mass email / WhatsApp broadcast | Campaign rule + playbook |
| Scraping / purchased lists | Campaign rule |
| Auto-send / drip tools | No runtime authorized |
| Contacting prospects without research template | False personalisation risk |
| Publishing without Anton approval | Governance |
| Linking /change or admin URLs publicly | Security + GTM map |
| Quoting without discovery call | Scope mis-match risk |
| Starting work before deposit cleared | Playbook §6–7 |

---

## Escalation to Anton

Stop and ask Anton when:

- Prospect requests custom scope outside three sprints
- Prospect is regulated-data vertical
- Prospect wants guaranteed revenue / lead volume
- Deposit verification unclear
- Negative public reply to social post
- Any request to automate outreach

---

## Related docs

- `docs/revenue/REVENUE_DELIVERY_PLAYBOOK.md`
- `docs/revenue/CORPFLOWAI_GTM_SELLABLE_PATH.md`
- `docs/revenue/CORPFLOWAI_PUBLIC_CTA_AND_INTAKE_MAP.md`
- `docs/revenue/templates/` (quote, deposit, discovery scripts)
- `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md`
