# Agent integration search policy (research — not auto-deploy)

Purpose: when humans or **offline** agents look for FOSS or API components to plug into cloud environments, keep results **safe, license-aware, and reversible**. Production runtime must **not** browse the open web without explicit allowlists.

## Rules

1. **Allowlisted sources first**  
   Prefer: official docs, GitHub repos you’ve pinned, package registries with SPDX license metadata, CNCF landscape entries.

2. **License gate**  
   Default allow: MIT, Apache-2.0, BSD-2/3-Clause, ISC.  
   Flag for review: AGPL, GPL (copyleft), Commons Clause, “fair source,” unknown license.

3. **Output format (integration card)**  
   Every candidate must be summarized as:
   - **Name + URL**
   - **License**
   - **Auth model** (API key, OAuth, mTLS)
   - **Hosting** (SaaS, self-host Docker, k8s)
   - **Effort** (S/M/L) and **risk** (low/med/high)
   - **Suggested CorpFlow touchpoint** (`POST /api/automation/ingest` event type + optional forward)

4. **No silent production wiring**  
   Discovering a tool never creates credentials, DNS, or cloud resources. Promotion path: playbook upsert → human or approval-gated automation.

5. **Segregation**  
   Tenant-specific secrets stay tenant-scoped; factory-wide patterns live under `tenant_scope=global` playbooks.

## Inheriting capability

When an integration is implemented, add or update a playbook (`automation.playbook.upsert`) so **central agents** and **factory operators** read the same source of truth. Optional: emit custom `event_type` values for your adapters (e.g. `adapter.stripe.webhook.received`) via ingest so the event log reflects reality.
