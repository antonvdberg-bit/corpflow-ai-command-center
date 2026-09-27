# Read-Only Portal Inspection Pattern v1

**Status:** Proposed canonical operating pattern  
**Controller:** #1351  
**Purpose:** inspect connected portals and client systems safely enough to make delivery decisions without turning inspection into configuration work.

## 1. Default posture

Portal inspection is:
- read-only;
- least privilege;
- evidence-oriented;
- scoped to one business/delivery question;
- non-destructive;
- secret-safe.

Do not request passwords, tokens, MFA codes, private keys or payment credentials in chat/docs/GitHub.

Prefer connected/OAuth tools or an already-authenticated dedicated browser profile. Never print or inspect secret values merely because a tool exposes the field.

## 2. Inspection sequence

For any portal:
1. state the business question;
2. identify the exact account/project/location/tenant being inspected;
3. record access method and permission level without secret values;
4. inspect configuration/state;
5. capture only evidence needed for the decision;
6. distinguish VERIFIED / USER-PROVIDED / INFERRED / UNKNOWN;
7. map the finding to the Client Delivery Pack;
8. stop before mutation;
9. if a change is required, prepare a bounded action packet and exact gate.

## 3. Evidence header

```text
PORTAL INSPECTION
Date:
Portal/system:
Client/tenant/project:
Business question:
Access mode:
Permission posture:
Read-only confirmed? YES/NO
Evidence captured:
Verified findings:
Unknowns:
Required change:
Protected gate?
Next owner/action:
```

## 4. System-specific focus

### Vercel
Read-only inspection may cover:
- project identity/framework;
- current production deployment and SHA;
- deployment state;
- aliases/domains;
- build logs;
- runtime error clusters/logs;
- project settings visible through read tools;
- environment-variable **names/presence only**, never secret values.

Do not deploy, rollback, alias, change domain configuration or write env values without protected approval.

### Cloudflare / DNS provider
Read-only inspection may cover:
- zone/domain identity;
- DNS records relevant to a route;
- proxy state;
- SSL/TLS mode;
- cache/routing configuration;
- current public resolution.

Do not edit DNS, purge cache, alter rules, certificates or proxy posture without protected approval.

### ERPNext
Read-only inspection may cover:
- standard DocTypes/configuration relevant to the client;
- Item / Item Group / UOM / Item Price / Price Lists;
- Customer/Supplier/company identity;
- Quotation/Invoice structure and status;
- workflow/role configuration;
- reporting availability.

Do not create/update commercial records, change schema, patch, migrate or alter permissions without exact approval.

### GoHighLevel / CRM / marketing platforms
Start with one location/account and read scopes only.
Inspect:
- contacts;
- opportunities/pipelines;
- calendars;
- custom fields;
- forms;
- conversations;
- locations;
- workflows/integrations where read access supports it.

Classify each function as retain / replace now / retain temporarily / retire. Do not send messages or mutate contacts/workflows during discovery.

### Client systems such as Zoho
Inspect existing capability before proposing custom work.
Capture:
- subscription/modules;
- roles/admin access;
- master data;
- workflows;
- reporting;
- extensions/Marketplace options;
- integrations;
- gaps.

Use Native / Configure / Extension / Partner / Custom / Unknown.

## 5. Browser automation rules

The dedicated browser profile may be used to:
- navigate;
- inspect;
- screenshot;
- read visible configuration/status;
- collect accessibility/runtime evidence.

Do not:
- click Save/Submit/Publish/Deploy/Send;
- alter toggles/fields;
- accept billing;
- authorize new integrations/scopes;
- expose tokens visible in URL/console/logs.

If a control is ambiguous, stop before clicking it and classify the required action.

## 6. Evidence storage

Store:
- GitHub summary in the governing issue;
- local browser evidence under the standard evidence root where used;
- client-facing screenshots only after checking they contain no secrets/private data.

Do not create a second operational database for inspection evidence.

## 7. Application-consolidation check

For every portal finding ask:
- Should this capability remain native/external?
- Does CorpFlowAI only need a linked view/action rather than a rebuild?
- Which authoritative system owns the data?
- If CorpFlowAI presents it, does it belong in Operating Workspace or Tenant Workspace?
- Would proposed work create a duplicate control plane?

Default to integration/presentation of authoritative systems, not replacement.

## 8. Stop conditions

Stop and park the item when:
- mutation is the next step;
- new paid service/plan is required;
- production DB/schema/env/secrets must change;
- DNS/domain/cache mutation is required;
- message/payment/external outreach would occur;
- required access is unavailable;
- evidence would require exposing private credentials/data.

Record the exact blocker, then move to the next approved work item.
