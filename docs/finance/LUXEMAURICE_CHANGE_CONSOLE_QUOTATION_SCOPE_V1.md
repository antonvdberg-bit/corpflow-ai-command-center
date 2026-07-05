# LuxeMaurice Change Console — ERPNext quotation scope v1

**Status:** Docs-only quotation pack for operator issue in ERPNext (sandbox or manual pro-forma until Phase D).  
**Customer:** LuxeMaurice (`luxe-maurice` / `lux.corpflowai.com`) — **paying client** (`billing_exempt = false` after `scripts/clear-luxe-maurice-billing-exempt.mjs`).  
**Handoff reference:** [luxemaurice-ai-handoff on Google Drive](https://drive.google.com/drive/folders/1CdKzjZApEn1ztChkDVxtfHkXp9dkpFkJ?usp=drive_link) — sync into `artifacts/luxe-maurice-ai-handoff/` for Groq ticket-create refinement.

## Purpose

Single ERPNext **Quotation** (or manual pro-forma) covering Lux `/change` operator usability (#523–#526 follow-up), concierge-aligned UI, configurable ticket email notifications, and Groq refinement fed by the full AI handoff corpus.

## Line items (suggested)

| # | Item | Notes |
|---|------|--------|
| 1 | **Change Console — create ticket flow** | Prominent CREATE TICKET panel, session/login messaging, tenant-safe Lux host scope (delivered #524). |
| 2 | **Change Console — withdraw / cancel** | Non-destructive operator withdrawal on open Lux tickets; programme master protected (delivered #524). |
| 3 | **Create-ticket draft isolation** | Separate `createRequestDraft` so new tickets do not reuse selected queue text (delivered #525). |
| 4 | **Estimate desk readability** | Lux `deskInk` tokens — readable actions on editorial cards (delivered #526). |
| 5 | **Concierge editorial alignment** | Charcoal / ivory / gold chrome on all Lux `/change` surfaces; Cormorant + Inter; nav pills match [concierge](https://lux.corpflowai.com/concierge) look (this pack). |
| 6 | **Ticket email notifications** | `corpflow.email.lux_ticket_update.v1` on create + withdraw via n8n webhook (delivered #526). |
| 7 | **Notification prefs UI** | On/off checkbox + email field beside top nav; persisted in `tenant_personas.persona_json.lux_change_notify` (this pack). |
| 8 | **Groq handoff context** | Full `luxemaurice-ai-handoff` corpus injected on **ticket-create** refinement when synced to repo (this pack). |
| 9 | **Commercial posture** | Remove Lux from billing-exempt / non-paying lists; token gate + client estimate lines apply (`clear-luxe-maurice-billing-exempt.mjs`). |

## Prior programme scope (carry-forward — same quotation family)

These remain the broader Lux delivery programme context; quote as continuation work where not yet closed on `docs/LUX/LUX_DELIVERY_PROGRAMME.md`:

- Vision-aligned public surfaces (`/`, `/properties`, `/property/[slug]`, `/concierge`) — largely live.
- Governed media pipeline (review → link → publish) and attachment workspace on `/change`.
- Concierge lead CRM strip + operator workflows on `/change`.
- First real client-published listing + editor E2E on production (programme §8 Reality Gate — still open).

## ERPNext operator steps (when sandbox/production authorised)

1. Customer: **LuxeMaurice** (existing or new Customer record — no secrets in repo).
2. Quotation doctype — one line per table row above, or grouped bundles (e.g. “Change Console operator pack — UI + email + Groq handoff”).
3. Currency: USD (or MUR equivalent per existing Lux commercial practice — accountant confirms).
4. Wording: managed outcomes / operator workspace — not generic AI wrapper; no guaranteed revenue claims.
5. **Do not** submit Sales Invoice or post GL until Phase D + Anton approval per `docs/finance/ERPNEXT_PRODUCTION_READINESS_EVALUATION.md`.

## Verification (delivery reality)

After deploy to Production on `lux.corpflowai.com`:

- `/change` — charcoal editorial chrome; nav + notify bar visible when logged in as Lux tenant.
- Create ticket → Groq refinement runs; telemetry `handoff_loaded` when handoff folder populated.
- Notify on/off + custom email respected on create/withdraw.
- `/change` smoke: `npm run smoke:change-overflow` with `LUX_SMOKE_BASE_URL=https://lux.corpflowai.com`.
- Billing: UI context shows Lux **not** `billing_exempt` after DB script.

## Related paths

- `pages/change.js`, `lib/client/lux-change-console-theme.js`
- `lib/cmp/_lib/lux-change-notify-prefs.js`, `lib/server/lux-ticket-operator-notify.js`
- `lib/server/lux-ai-handoff-context.js`, `artifacts/luxe-maurice-ai-handoff/README.md`
- `scripts/clear-luxe-maurice-billing-exempt.mjs`
