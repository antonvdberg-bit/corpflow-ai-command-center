# Graphics Capture Checklist

Operator steps for completing the eight training screenshots. Use **fictional training data only**.

**Base URL:** `https://lux.corpflowai.com`  
**Output folder:** `artifacts/luxe-maurice-training-pack-v1/05-graphics/captures/`

---

## Preparation

1. Use a clean browser profile (no personal bookmarks or extensions visible).
2. Set window width to **1440px** (desktop).
3. Use fictional training data:

```text
Name:    LuxeMaurice Training User
Email:   training@example.invalid
Phone:   (leave blank)
Category: Residences
Intent:  Exploring — advisory introduction
Region:  Mauritius
Notes:   Training demonstration request — safe to use in LuxeMaurice training materials.
```

4. Hide password fields when recording sign-in steps.

---

## 01 — Landing page

| | |
|---|---|
| **Route** | `/client/luxe-maurice-ai` |
| **State** | Signed out |
| **File** | `01-landing-page.png` |
| **Steps** | Open URL → wait for hero → capture viewport |
| **Auto** | Yes — `luxe-maurice-training-pack-capture.mjs` |

---

## 02 — Private opportunities

| | |
|---|---|
| **Route** | `/client/luxe-maurice-ai/properties` |
| **State** | Signed out |
| **File** | `02-private-opportunities.png` |
| **Steps** | Open catalogue → ensure cards visible → capture |
| **Auto** | Yes |

---

## 03 — Private Access Request form

| | |
|---|---|
| **Route** | `/client/luxe-maurice-ai/buyer` |
| **State** | Signed out |
| **File** | `03-private-access-request-form.png` |
| **Steps** | Open form empty or partially filled with training data → capture |
| **Auto** | Yes |

---

## 04 — Request submitted with reference

| | |
|---|---|
| **Route** | `/client/luxe-maurice-ai/buyer` (after submit) |
| **State** | Signed out |
| **File** | `04-request-submitted-reference.png` |
| **Steps** | Fill training data → Submit → wait for success panel → capture LM-REQ line |
| **Auto** | Optional — `LUX_TRAINING_SUBMIT_FORM=1` |
| **Caution** | Creates a real training row in Postgres — acceptable for training |

---

## 05 — Advisor sign-in prompt

| | |
|---|---|
| **Route** | `/client/luxe-maurice-ai/crm` |
| **State** | **Signed out** (incognito) |
| **File** | `05-advisor-sign-in-prompt.png` |
| **Steps** | Incognito window → open CRM → capture sign-in prompt (no persisted rows) |
| **Auto** | Yes |
| **Verify** | No real names, emails, or LM-REQ visible |

---

## 06 — Advisor pipeline live request

| | |
|---|---|
| **Route** | `/client/luxe-maurice-ai/crm` |
| **State** | **Signed in** — LuxeMaurice tenant |
| **File** | `06-advisor-pipeline-live-request.png` |
| **Steps** | Sign in → open CRM → locate training request under **Received for advisor review** → capture one card |
| **Auto** | **No** — manual only |
| **Caution** | Crop to training row only; hide unrelated leads |

---

## 07 — Demonstration records

| | |
|---|---|
| **Route** | `/client/luxe-maurice-ai/crm` |
| **State** | Signed out or signed in |
| **File** | `07-demonstration-records.png` |
| **Steps** | Scroll to **Demonstration records** heading → capture section |
| **Auto** | Yes (signed-out capture includes this section) |

---

## 08 — Change Console lead workflow

| | |
|---|---|
| **Route** | `/change` |
| **State** | **Signed in** — operator or LuxeMaurice tenant with LEADS access |
| **File** | `08-change-console-lead-workflow.png` |
| **Steps** | Open `/change` → LEADS → select training lead → capture workflow panel |
| **Auto** | **No** — manual only |
| **Caution** | **High risk** — crop tightly; redact unrelated client rows; do not send to Jan without review |

---

## After capture

1. Update `GRAPHICS_MANIFEST.md` capture status for each file.
2. Run `node node-tests/luxe-maurice-training-pack.test.mjs` (via `npm test`).
3. Complete Anton approval checklist in pack `README.md`.
