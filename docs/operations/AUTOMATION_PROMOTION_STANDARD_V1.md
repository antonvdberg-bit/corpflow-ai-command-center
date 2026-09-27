# CorpFlowAI Automation Promotion Standard v1

Source issue: #1296

## Purpose

Give CorpFlowAI one reusable pattern for taking a useful automation from idea to governed production without turning the proof stage into an infrastructure project.

This standard exists because production governance and delivery speed are both required. The proof stage should answer **does this capability materially improve delivery?** The production stage should answer **can we run it repeatedly with appropriate controls and evidence?**

## Core rule

**Prove value before hardening. Harden only what has proved useful.**

Do not require production-grade credential architecture, custom infrastructure, broad orchestration, or paid capacity merely to determine whether a low-risk capability is useful.

## Promotion path

`business outcome -> bounded proof -> evidence -> ADOPT / DEFER / REJECT -> governed production path -> verify -> operate`

### 1. Define the business outcome
Before touching credentials or infrastructure, define:
- the operator/client outcome;
- what useful output must be produced;
- what existing manual work it should reduce or improve;
- the smallest acceptance evidence;
- protected actions that remain out of scope.

### 2. Use the fastest safe proof path
Prefer, in order where appropriate:
1. already-connected plugin/connector/native integration;
2. existing free/open API or tool;
3. existing repo workflow/runtime;
4. small bounded custom adapter;
5. new infrastructure only when the earlier options are insufficient.

For public/read-only/non-mutating work, use controls proportionate to the risk. Do not make Anton administer production-grade secret plumbing before the capability has proved value.

### 3. Bound the proof
A proof should have explicit limits such as:
- approved public target(s);
- read-only/non-mutating behaviour;
- page/item/time caps;
- no form submission or external send;
- no client-private/login data;
- no paid-tier change;
- no production DB/schema mutation.

### 4. Decide from evidence
After the proof, record one decision:
- **ADOPT** — materially improves delivery/operator time/coverage/reliability;
- **DEFER** — useful idea but current cost, setup burden, reliability, or timing is not justified;
- **REJECT** — does not add enough value or creates unacceptable operational risk/maintenance.

The decision should consider:
- quality of output;
- operator time saved;
- delivery/revenue relevance;
- reliability and retry behaviour;
- free/paid cost profile;
- ongoing maintenance burden;
- whether a simpler alternative already exists.

### 5. Productionise only after ADOPT
After ADOPT, move the capability into the governed production path using the smallest practical architecture.

Default production controls:
- dedicated service identity where needed;
- practical capability/workstream-scoped access;
- read/write permissions matched to the actual action;
- secrets stored outside chat/repo/docs/logs;
- deterministic limits and retries;
- evidence artifact or durable execution record;
- explicit operator approval for protected production actions.

Do not confuse least privilege with per-secret/per-action micromanagement. The correct target is **small enough to be safe, broad enough to operate without constant operator intervention**.

### 6. Verify before declaring production-ready
A capability is production-ready only after a governed run produces runtime evidence.

Minimum verification:
- authentication/access path succeeds;
- intended bounded work completes;
- useful output is produced;
- evidence is retained;
- no protected side effect occurred;
- failure mode/retry behaviour is understood;
- paid capacity was not silently introduced.

### 7. Operator-burden stop rule
If setup, credential administration, or permission tuning consumes disproportionate operator time relative to the proof value:

**Stop adding controls. Simplify the architecture.**

Before asking Anton for another manual setup step, answer:
1. Can the proof run through an existing connector/plugin/native path?
2. Can access be safely widened within the dedicated workstream instead of adding another micro-policy?
3. Can the workload be reshaped to fit current free-tier/concurrency limits?
4. Can the capability remain interactive/manual until commercial demand justifies more infrastructure?

## Firecrawl/WMA reference implementation

The WMA Firecrawl promotion established the following reference pattern:

### Proof
- Firecrawl plugin used for public-site discovery/extraction.
- Value demonstrated quickly against CorpFlowAI and Explorers Mauritius.
- Firecrawl materially improved site inventory, route discovery, metadata/content extraction and lead-path audit speed.

### Production architecture
- **Firecrawl:** public-site discovery and extraction.
- **Playwright:** deterministic desktop/mobile/runtime verification.
- **GitHub Actions:** governed, reproducible evidence execution.
- **Infisical:** runtime secret source.
- **GitHub:** durable decision/evidence/control record.

### Access posture
Dedicated WMA identity receives practical WMA-scoped secret access sufficient for operation:
- Describe Secret;
- Read Value.

No Create, Modify or Remove permission is required.

### Workload shape
Do not rely on a high-concurrency bulk crawl where current plan limits make it fragile.

WMA uses:
`map -> same-origin URL selection -> sequential scrape -> bounded 429 backoff -> evidence artifact`

This preserves bounded coverage while fitting current Firecrawl concurrency constraints.

## Reuse for the next automation
For every new automation, create a bounded packet containing only:
- business outcome;
- fast proof route;
- risk boundary;
- acceptance evidence;
- ADOPT/DEFER/REJECT decision;
- production access model if adopted;
- governed verification run;
- operator-burden stop rule.

Do not begin with infrastructure architecture unless the automation itself is infrastructure.

## Protected actions
This standard does not itself approve:
- production deploys;
- DB/schema changes;
- env/secrets/access changes;
- payment actions;
- external email/WhatsApp/SMS sends;
- paid vendors/plans;
- public client-facing launches.

Those remain separately approved actions under CorpFlowAI governance.
