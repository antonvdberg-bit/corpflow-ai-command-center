# Deposit received — manual verification checklist

**Use:** Internal operator checklist when POP arrives. **Do not send to client until verified.**

---

## Intake record

| Field | Value |
| ----- | ----- |
| Business | |
| Contact | |
| Offer | |
| Quote total (MUR) | |
| Deposit expected (MUR) | |
| POP received at | |
| POP reference / amount | |

## Verification steps

- [ ] POP amount matches deposit due (MUR {amount})
- [ ] Payer name matches client or agreed third party
- [ ] Bank statement or online banking shows **cleared funds** (not pending)
- [ ] Record logged in **ERPNext** payment entry (when configured)
- [ ] No duplicate deposit for same quote reference

## If verified — client message (send after checks)

**Subject:** Deposit confirmed — work commencing · {business name}

```text
Hi {first name},

We have verified your deposit of MUR {amount}. Work on {offer name} commences now.

Expect first visible output within 24–72 hours after we confirm access/items from the quote.

I'll update you at {checkpoint time / date}.

Anton
CorpFlowAI Ltd
```

## If not verified — client message

```text
Hi {first name},

Thanks for sending the POP. We have not yet seen cleared funds for MUR {amount}
with reference {reference}. Work is on hold until verification completes.

Please confirm transfer date and reference, or send an updated confirmation.

Anton
```
