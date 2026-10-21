# Paddle Live fail-closed configuration v1

**Status:** Implemented in repository code; **not** authorised for Live checkout, Live credentials in production, Paddle verification, or ERPNext writes.  
**Source:** #1432 Task B (21 October 2026). Extends the existing Sandbox rail; does not replace PR #1488.

## What this is

A separate Live configuration resolver and webhook path that **fails closed** until every Live prerequisite is present, consistent, and distinct from Sandbox.

Public checkout remains disabled in code. Completing Live env vars does not open a customer checkout.

## Environment selection

| Mode | How it is selected | Effect |
|---|---|---|
| Sandbox (default) | `NEXT_PUBLIC_PADDLE_ENV=sandbox` and existing Sandbox secrets | Existing `/billing/paddle-sandbox` and `/api/paddle/webhook` behaviour unchanged |
| Live | `PADDLE_RUNTIME_MODE=live` **plus** Live-prefixed credentials and nine Live price IDs | Live webhook may verify; public checkout stays off |

Live does **not** reuse `NEXT_PUBLIC_PADDLE_ENV=production`. That public env must stay `sandbox` so the browser bundle cannot point Paddle.js at Live.

Live client token, API key, webhook secret, and price IDs are **server-only** (`PADDLE_LIVE_*`). They are not `NEXT_PUBLIC_` values.

## Fail-closed rules

Live `configured=true` only when all of the following hold:

1. `PADDLE_RUNTIME_MODE=live`
2. `PADDLE_LIVE_CLIENT_TOKEN` starts with `live_`
3. `PADDLE_LIVE_API_KEY` starts with `pdl_live_apikey_`
4. `PADDLE_LIVE_NOTIFICATION_WEBHOOK_SECRET` is present and not equal to the Sandbox webhook secret
5. `PADDLE_LIVE_CHECKOUT_DOMAIN` is `businessadmindesk.co.za` or `www.businessadmindesk.co.za`
6. Nine distinct Live `pri_…` IDs are set for the approved BAD ZAR packages
7. None of those Live IDs equal Sandbox platform, implementation, or BAD sandbox price IDs
8. `PADDLE_LIVE_PUBLIC_CHECKOUT` is not set to enable checkout (any enable attempt is an error)

Missing, incomplete, mixed Sandbox/Live, or duplicate Live price IDs keep Live unconfigured. The Live webhook then returns `503 live_not_configured`.

`pwCustomer` / Paddle Retain is **not** implemented: Retain is not used and no authenticated Paddle customer ID is available.

Production ERPNext writes stay disabled. Live webhook persistence is an unactivated audit row only.

## Routes

| Path | Role |
|---|---|
| `/api/paddle/webhook` | Existing Sandbox webhook (unchanged) |
| `/api/paddle/status` | Existing Sandbox status (unchanged) |
| `/api/paddle/live/webhook` | Live signed webhook; fail-closed if Live is incomplete |
| `/api/paddle/live/status` | Live configuration flags only (no secrets, no price IDs) |

There is **no** `/billing/paddle-live` page.

## Not done by this change

- Creating Live Paddle products, prices, tokens, or notification destinations
- Writing production env/secrets
- Enabling customer-accessible Live checkout
- Merging or deploying
- Submitting Paddle verification
- ERPNext production writes
