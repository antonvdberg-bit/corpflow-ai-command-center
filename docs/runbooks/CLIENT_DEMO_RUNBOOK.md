# Client demo runbook (production-reliable)

**Purpose:** A repeatable, client-safe runbook for the Change Console “golden path” demo (the **/login → /change** story), including **what to do if X fails**.

**Canonical rules (do not re-decide here):**

- **Hostnames / apex vs tenant / login routing**: `docs/operations/TENANT_CLIENT_LOGIN.md`
- **“Production-grade” definition + demo standard**: `docs/strategy/PRODUCTION_GRADE_CLIENT_OUTCOMES.md`
- **Execution boundaries (brain vs hands)**: `docs/EXECUTION_BRAIN_VS_HANDS.md`

This runbook is based on **“Demo today”** in `docs/CORPFLOW_SHARED_TODO.md` and adds operator-grade reliability steps without duplicating canonical tenancy rules.

---

## Demo objective (what the client should leave believing)

- **Clarity**: “My request is captured as a ticket, scoped to my organization.”
- **Transparency**: “I can see benchmark vs CorpFlow build price before committing.”
- **Confidence**: “If I approve, the factory records it and automation is triggered (or clearly queued if GitHub isn’t wired yet).”
- **Auditability**: “Files/links can be attached to the ticket; everything is traceable.”

---

## Before the room (10-minute prep)

### Required: production prerequisites

- **DB**: `POSTGRES_URL` configured on the target deployment.
- **Tables**: ensure-schema has been run at least once on the target DB.
  - Canonical procedure: `docs/operations/ENSURE_POSTGRES_SCHEMA.md`
- **Tenant login works on the mapped host**.
  - Canonical rules + debug playbook: `docs/operations/TENANT_CLIENT_LOGIN.md`

### Optional (for “wow”): Approve build dispatch

- **GitHub dispatch** requires both:
  - `CMP_GITHUB_REPOSITORY` (or `GITHUB_REPO`)
  - `CMP_GITHUB_TOKEN` (or `GH_WORKFLOW_TOKEN`)
- If not configured, the demo still works through **Estimate** and can show “Saved in factory; dispatch when repo token is connected.”

### One-shot readiness check (recommended)

From a clean browser session:

1. Log in as the **tenant** on the client host (`/login` on the mapped tenant hostname).
2. Open `GET /api/ui/context` (same host, while logged in).
3. Inspect `change_console_readiness.warnings`.

If there are warnings, fix what you can pre-demo; if not, keep the warnings text handy as your “what happened” explanation if anything flakes.

---

## Live demo script (~10 minutes)

### Step 1 — Login (tenant scope)

- **What you say**: “This is your change workspace — everything stays scoped to your organization.”
- **What you do**: Open `/login` on the **client hostname** and sign in as the tenant user.

If you land on an operator/onboarding route, do **not** improvise host rules. Use the canonical checks in `docs/operations/TENANT_CLIENT_LOGIN.md`.

### Step 2 — Create a ticket

- **What you say**: “Describe what you want in plain language; we capture it as a ticket.”
- **What you do**: Open `/change`, enter a real request, click **Create ticket**. Point at **Ticket ID** and the list.

### Step 3 — Estimate

- **What you say**: “You see benchmark vs your CorpFlow build price before you commit.”
- **What you do**: Click **Estimate** and walk through brief/estimate output.

### Step 4 — Approve build (optional “wow”)

- **What you say**: “When you approve, we commit the build in our factory and trigger automation.”
- **What you do**: Click **Approve build** and show status/progress messaging.

If GitHub dispatch isn’t configured, say: “Saved in factory; branch dispatch happens when the repo token is connected.” (and point at readiness warnings if present).

### Step 5 — Attachments (files and links)

- **What you say**: “Files and links attach to the ticket.”
- **What you do**:
  - Upload a small image/PDF (after the ticket exists), and show it in the attachment list.
  - Paste an external shareable link in the external links box.

### Step 6 — Auditability

- **What you say**: “Everything is auditable; you can see readiness warnings instead of silent failure.”
- **What you do**: If needed, briefly show `GET /api/ui/context` and `change_console_readiness.warnings`.

---

## If something breaks in the room (fast triage)

### Login problems

- **Symptom**: Login “looks successful” but nothing sticks / keeps asking to log in.
  - **Likely cause**: `SOVEREIGN_SESSION_SECRET` missing on the deployment.
  - **Action**: Follow “Session cookie” guidance in `docs/operations/TENANT_CLIENT_LOGIN.md`.

- **Symptom**: Tenant ID mismatch or wrong tenant chrome.
  - **Action**: Follow host mapping + mismatch errors in `docs/operations/TENANT_CLIENT_LOGIN.md` (do not guess tenant ids).

### Tickets / estimate problems

- **Symptom**: Ticket create/estimate errors or no persistence.
  - **Likely cause**: `POSTGRES_URL` missing, or tables not created.
  - **Action**: Run factory `POST /api/factory/postgres/ensure-schema` (canonical: `docs/operations/ENSURE_POSTGRES_SCHEMA.md`), then re-check `GET /api/ui/context`.

### Approve build problems

- **Symptom**: Approve build “saves” but does not dispatch a workflow.
  - **Likely cause**: GitHub env not configured.
  - **Action**: Set `CMP_GITHUB_REPOSITORY` + `CMP_GITHUB_TOKEN` (or the fallback env names), then re-check `GET /api/ui/context` readiness warnings.

### Sandbox stuck / Overseer unavailable (admin)

- **Symptom**: “Overseer unavailable” / GitHub API 404 compare, or “dispatch OK but branch missing”.
  - **What it means**: the sandbox branch `cmp/<ticket_id>` is missing or the workflow didn’t create it yet.
  - **Fast action (recommended)**: on `/change`, open the **Completion** card and click **Self-heal sandbox** (admin). Then refresh **Live automation (GitHub)**.
  - **If it repeats**: check the repo/token config (`GITHUB_REPO`, `CMP_GITHUB_TOKEN`) and the sandbox base ref (`CMP_SANDBOX_BASE_REF`).

### Attachment upload problems

- **Symptom**: Upload fails with “table missing” style messaging.
  - **Likely cause**: `cmp_ticket_attachments` table missing on the target DB, or Prisma client not aligned.
  - **Action**:
    - Run factory ensure-schema (it creates `cmp_ticket_attachments`).
    - Confirm readiness: `GET /api/ui/context` should show `change_console_readiness.attachments_table_ok: true` for the logged-in tenant session.

---

## “Done” conditions (demo + production reliability)

The demo runbook is “done” when the following is true on the **target deployment**:

- **Login**: Tenant can log in on the mapped tenant host, and `GET /api/ui/context` reports `login_route: "client"` while on that host.
- **Tickets**: `/change` can create and list tickets; readiness shows `cmp_tickets_ok: true`.
- **Estimate**: Estimate runs for a ticket without silent failure (errors are shown as actionable messages).
- **Approve build**:
  - Either readiness shows `github_dispatch_ready: true`, **or** the UI clearly states dispatch is pending due to missing GitHub env (and the ticket state is still saved).
- **Attachments**:
  - Upload returns `ok: true` and the file shows up in list.
  - Download endpoint serves the file for the same session and is inaccessible to unauthenticated users.
  - Readiness shows `attachments_table_ok: true`.

