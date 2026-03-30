# Client-facing change overlay

## `change-overlay.js`

Loads the CMP **bubble** (`/assets/cmp/bubble.js`) so a **published** site can offer a floating “request a change” control without duplicating logic.

- Set **`data-corpflow-api-base`** to your deployed Command Center origin (the app that serves `/api/cmp/...`).
- Optional **`data-cmp-client-id`**, **`data-cmp-locale`** (e.g. `es`, `fr`), and dormant-gate **`data-cmp-session-token`** mirror the bubble’s attributes.

## i18n

The bubble uses **`navigator.language`** (or **`data-cmp-locale`**) for UI strings and sends the same code to **`ai-interview`** so clarification questions match the user’s language (en, es, fr, de, pt).

## Factory-only onboarding

Operator playbooks (CORE hosts, `log-stream`, sovereign bootstrap) remain **factory-operator** flows; this embed is for **client sites** that point at your factory API.

Do **not** commit real Baserow or n8n hostnames in client snippets—only the public Vercel (or custom) URL of this app.
