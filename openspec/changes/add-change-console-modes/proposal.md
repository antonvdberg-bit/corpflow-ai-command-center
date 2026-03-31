# Change: Mode-aware Change Console + client-hosted console template

## Why
We need one shared `public/change.html` that can serve multiple rule-sets (Core ops, CorpFlowAI internal, Demo) while allowing real client sites to host their own `public/change.html` (often just a login + monitoring console) with stricter UI and no operator-only affordances.

## What Changes
- Add a lightweight UI context endpoint that returns **surface + mode + session level** derived from Host headers and cookies.
- Update the shared `public/change.html` to:
  - enforce rule-sets by mode (core/corpflowai/demo)
  - hide/disable operator-only actions when not admin
- Add a **client-site `change.html` template** (restricted UX) that tenants can host on their own domain/site.

## Impact
- Affected code: `api/factory_router.js`, `lib/server/host-tenant-context.js` (reuse), `public/change.html`
- Security: mode is derived server-side; UI never needs to infer from subdomain itself
- Deployment: uses existing `CORPFLOW_CORE_HOSTS` and tenant host mapping; optional host→mode map env

