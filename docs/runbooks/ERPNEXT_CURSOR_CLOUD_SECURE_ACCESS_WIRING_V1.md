# ERPNext sandbox — Cursor Cloud secure access wiring v1

**Status:** Operator wiring runbook (transport/session only).  
**Issue:** [#893](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/893)  
**Parents:** [#879](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/879), [#886](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/886), [#880](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/880), [#881](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/881), [#882](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/882)  
**Operator authorization:** Anton 2026-08-12 (durable gate approval on #893)  
**Anchor:** `<!-- ERPNEXT_CURSOR_CLOUD_SECURE_ACCESS_WIRING_V1 -->`

<!-- ERPNEXT_CURSOR_CLOUD_SECURE_ACCESS_WIRING_V1 -->

## 1. Outcome

Give **Cursor Cloud** a legitimate, least-privilege path to the **existing** ERPNext sandbox on `corpflow-exec-01-u69678` so access probes (#879 / #886) can return PASS/FAIL against real application objects.

This reuses the already-authorized operator pattern: **SSH → loopback `127.0.0.1:8080`** (see `docs/runbooks/ERPNEXT_SANDBOX_INSTALL.md` § 10). It does **not** create a public ERPNext endpoint.

## 2. Why automation alone cannot finish wiring

Cursor Cloud agents can:

- detect that the SSH/tunnel secret is missing;
- request secrets through the **Cursor environment Secrets UI** (`request-environment-setup-actions`);
- run the in-repo probe/tunnel helpers once the secret is present.

Cursor Cloud agents **cannot**:

- paste or invent private key material;
- write values into the Cursor dashboard Secrets tab without the operator UI;
- weaken the sandbox by exposing `:8080` publicly.

**Stop condition (exact):** if the secret is still absent after the UI request, the blocker is **UI-only operator action** below — not an authorization gap and not a missing second access service.

## 3. Secure path type (preference order)

| Preference | Path | Status for CorpFlowAI |
|---|---|---|
| 1 | Cursor Cloud **Secrets** → env var → SSH local-port-forward / remote read-only commands to loopback ERPNext | **Selected** for #893 |
| 2 | Existing private integration/session already available to Cursor Cloud | Not present (only unrelated `MASTER_ADMIN_KEY` injected on probe runs) |
| 3 | Other approved private transport (Tailscale userspace / Cloudflare Tunnel) | Not required if (1) works; do not invent new paid infra |

## 4. Secret names (values never in git / chat / PR)

Add these in **Cursor Dashboard → Cloud Agents → Secrets** (team or repo-scoped so **API-dispatched** agents inherit them).

| Secret name | Required | Contents (operator-held) |
|---|---|---|
| `CORPFLOW_EXEC01_SSH_PRIVATE_KEY` | **Yes** | PEM private key **or** base64(PEM) for an SSH identity authorized on `corpflow-exec-01` as user `anton` (or a dedicated least-privilege user Anton creates for Cursor Cloud only) |

Optional non-secret overrides (may be plain env vars if ever needed; defaults are hard-coded in scripts):

- host default: `5.78.213.185`
- user default: `anton`
- remote ERPNext port: `8080`
- site host header: `corpflowai-sandbox.localhost`
- compose project: `corpflowai-sandbox`

**Do not** put ERPNext Administrator passwords into Cursor Cloud if SSH remote `bench` / loopback `curl` is enough. Prefer credentials remaining on the box at `~/.erpnext-sandbox-credentials`.

## 5. One-time operator actions (UI only — no paste into chat)

### 5.1 Create or select a dedicated SSH key (recommended)

On a machine that already has authorized access to `corpflow-exec-01` (Anton's laptop):

1. Generate a **new** keypair used only for Cursor Cloud ERPNext sandbox access (ed25519).
2. Install the **public** key into `~/.ssh/authorized_keys` for the intended user on `corpflow-exec-01`.
3. Keep the private key out of git, Slack, GitHub issues, and chat.

### 5.2 Add the private key to Cursor Secrets (required)

1. Open [Cursor Cloud Agents dashboard](https://cursor.com/dashboard/cloud-agents).
2. Open **Secrets** (team/user scope that API-dispatched agents inherit — same place `MASTER_ADMIN_KEY` already appears to agents).
3. Add `CORPFLOW_EXEC01_SSH_PRIVATE_KEY`:
   - either the full PEM including `BEGIN` / `END` lines, or
   - `base64 -w0` of the PEM file (single line) if the UI mangles newlines.
4. Save. Do **not** paste the value into GitHub or this chat.
5. Confirm the secret is available to the **corpflow-ai-command-center** cloud agents (team/repo scope), not only a one-off personal draft that API runs ignore.

### 5.3 Host allowlist (usually already OK)

`corpflow-exec-01` must accept SSH from Cursor Cloud egress IPs. If SSH times out after the key is present, Anton adjusts the host firewall for Cursor Cloud egress only — still **no** public ERPNext port.

## 6. In-repo helpers (no secrets committed)

| Script | Purpose |
|---|---|
| `scripts/erpnext/cursor-cloud-sandbox-tunnel.sh` | Materialize key from env → SSH local forward `127.0.0.1:8080` → remote loopback; or `ssh --` remote commands |
| `scripts/erpnext/cursor-cloud-sandbox-probe.sh` | Safe PASS/FAIL probe: SSH auth, `/login` HTTP code, bench version, Company/Customer/Item counts |

### 6.1 Probe from a Cursor Cloud run

```bash
bash scripts/erpnext/cursor-cloud-sandbox-probe.sh
```

Expected PASS evidence (names only):

- `secure_path_secret_present: configured`
- `ssh_auth: PASS`
- `login_http_code: 200` or `302`
- `bench_version:` lines present
- `object_capability_summary:` Company / Customer / Item counts
- `ERPNext reachability: PASS`

### 6.2 Optional local tunnel

```bash
bash scripts/erpnext/cursor-cloud-sandbox-tunnel.sh start
bash scripts/erpnext/cursor-cloud-sandbox-tunnel.sh status
bash scripts/erpnext/cursor-cloud-sandbox-tunnel.sh stop
```

## 7. Boundary (authorized vs not)

**Authorized by #893 for this workstream only:**

- Cursor Cloud Secrets configuration that enables the existing SSH/tunnel/session path;
- read-only reachability + object capability probes for #879 / #886;
- subsequent #880 / #881 / #882 work only after a PASS probe under normal WIP rules.

**Not authorized:**

- public ERPNext exposure;
- CorpFlowAI production DB/schema changes;
- real payments / client sends;
- unrelated Vercel/GitHub env changes;
- new paid infrastructure;
- general L3 “agent drives the box” expansion beyond this sandbox transport.

## 8. Verification sequence after secret is saved

1. Start a **fresh** Cursor Cloud run for #879 or #886 (or re-run probe on a new agent that inherits the secret).
2. Run `bash scripts/erpnext/cursor-cloud-sandbox-probe.sh`.
3. Record non-secret evidence only (run ID, PASS/FAIL, site/version lines, object counts).
4. If PASS → queue/activate #880 and #881 under normal WIP/priority rules.
5. If FAIL → record exact blocker; do not invent object results.

## 9. Evidence contract (return shape)

```text
secure path type: configured | not configured
Cursor run ID: run-…
ERPNext reachability: PASS | FAIL
safe site/version metadata: …
object capability summary: …
exact blocker if any: …
next activated issue(s): …
```
