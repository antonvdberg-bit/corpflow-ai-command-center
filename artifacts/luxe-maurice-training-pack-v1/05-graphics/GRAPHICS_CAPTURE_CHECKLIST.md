# Graphics Capture Checklist

Operator steps for capturing (or re-capturing) the eight training screenshots. Use **fictional training data only**.

**Base URL:** `https://lux.corpflowai.com`  
**Output folder:** `artifacts/luxe-maurice-training-pack-v1/05-graphics/captures/`

**Pack status (2026-07-14):** all eight PNGs are present and privacy-reviewed. Keep this checklist for future recaptures.

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
| **Status** | COMPLETE |

---

## 02 — Private opportunities

| | |
|---|---|
| **Route** | `/client/luxe-maurice-ai/properties` |
| **State** | Signed out |
| **File** | `02-private-opportunities.png` |
| **Steps** | Open catalogue → ensure cards visible → capture |
| **Auto** | Yes |
| **Status** | COMPLETE |

---

## 03 — Private Access Request form

| | |
|---|---|
| **Route** | `/client/luxe-maurice-ai/buyer` |
| **State** | Signed out |
| **File** | `03-private-access-request-form.png` |
| **Steps** | Open form empty or partially filled with training data → capture |
| **Auto** | Yes |
| **Status** | COMPLETE |

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
| **Status** | COMPLETE |

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
| **Status** | COMPLETE |

---

## 06 — Advisor pipeline live request

| | |
|---|---|
| **Route** | `/client/luxe-maurice-ai/crm` |
| **State** | **Signed in** — LuxeMaurice tenant |
| **File** | `06-advisor-pipeline-live-request.png` |
| **Steps** | Sign in → open CRM → locate training request under **Received for advisor review** → capture one card |
| **Auto** | **No** — manual only |
| **Caution** | Crop to training row only; hide unrelated leads; prefer cropping browser chrome |
| **Status** | COMPLETE — CAPTURED · PRIVACY_REVIEWED |

---

## 07 — Demonstration records

| | |
|---|---|
| **Route** | `/client/luxe-maurice-ai/crm` |
| **State** | Signed out or signed in |
| **File** | `07-demonstration-records.png` |
| **Steps** | Scroll to **Demonstration records** heading → capture section |
| **Auto** | Yes (signed-out capture includes this section) |
| **Status** | COMPLETE |

---

## 08 — Change Console lead workflow

| | |
|---|---|
| **Route** | `/change` |
| **State** | **Signed in** — operator or LuxeMaurice tenant with LEADS access |
| **File** | `08-change-console-lead-workflow.png` |
| **Steps** | Open `/change` → LEADS → **Show internal / test** if needed → click training lead → list focuses on that row → capture focused lead + **OPERATOR ACTIONS** panel directly below |
| **Auto** | **No** — manual only |
| **Caution** | High privacy risk on this surface — crop to training lead and operator actions; use **Show all leads** only when switching; never include unrelated client rows in shared materials |
| **Controls to show** | Focused on … · Show all leads · Clear selection · OPERATOR ACTIONS |
| **Status** | COMPLETE — CAPTURED · PRIVACY_REVIEWED · CROPPED_TO_TRAINING_LEAD_AND_OPERATOR_ACTIONS |

---

## After capture / recapture

1. Update `GRAPHICS_MANIFEST.md` capture status for each file.
2. Run training-pack tests via `npm test`.
3. Complete Anton approval checklist in pack `README.md` before any client send.
