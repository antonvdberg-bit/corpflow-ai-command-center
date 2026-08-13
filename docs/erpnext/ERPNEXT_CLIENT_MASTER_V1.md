# ERPNext Client Master v1 — commercial identity for onboarding

**Status:** Mapping + synthetic proof on ERPNext sandbox/test. **No custom fields. No DocType changes. No payments. No live client data.**  
**Issue:** [#880](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/880)  
**Parents:** #710, #711, #714 · **Sources:** #550, #654, #715, #716 · **Access probe:** #879 / #899  
**Environment:** ERPNext sandbox/test (`CorpFlowAI LTD`, Mauritius, default currency MUR)  
**Machine contract:** `config/erpnext-client-master.v1.json`  
**Mapper:** `lib/erpnext/client-master.js`

**Anchor:** `<!-- ERPNEXT_CLIENT_MASTER_V1 -->`

<!-- ERPNEXT_CLIENT_MASTER_V1 -->

```text
Canonical Context Preflight: PASS
Operating model version: 2026-08-12-v1
Environment: corpflow_test
GitHub state refreshed: YES
Source item: #880
```

## Verdict

**`ERPNext Client Master READY`**

Standard ERPNext Customer + Contact + Address can hold the commercial identity for Lead Rescue and Website Rescue. Two synthetic clients were created on the live sandbox in this run. No custom field or custom DocType is required for commercial onboarding identity.

Exact Client Master blocker: **NONE**.

Follow-ups that do **not** block this verdict: USD selling Price List and Payment Terms Template belong to #882; VAT/Tax Category belongs to HB-3; Item master belongs to #881.

---

## 1. Current state (inspected 2026-08-13)

Access path: Cursor Cloud secrets → Frappe token auth as `integrations@corpflowai.com` (no SSH, no Infisical runtime bridge). Versions: **frappe 16.25.0 / erpnext 16.26.2**.

| Object | Readable | Writable (this run) | Notes |
| --- | --- | --- | --- |
| Company | yes | not changed | `CorpFlowAI LTD` / `CFAI` / Mauritius / MUR |
| Customer | yes | **yes** (create + update) | Count was 0 before this packet |
| Contact | yes | **yes** | Email is **not** unique |
| Address | yes | **yes** | Required: type, line1, city, country |
| Lead | yes | not used | Optional pre-sale; `utm_source` not `source` |
| Opportunity | yes | not used | Optional qualified funnel |
| Customer Group | yes | not changed | Commercial / Government / Individual / Non Profit |
| Territory | yes | not changed | Mauritius / Rest Of The World |
| Price List | yes | not changed | Standard Selling = **MUR** only |
| Currency | yes | not changed | USD enabled |
| Quotation | yes | not created | Party = Customer; needs Item (#881/#882) |
| Sales Invoice | yes | not created | `customer` is required Link |
| Item Price | HTTP 403 | — | Catalogue (#881), not Client Master |
| Payment Terms | HTTP 403 | — | Empty templates; #882 |
| DocType metadata document | HTTP 403 | — | Form meta via `getdoctype` works |
| Customer delete | HTTP 403 | — | Disable is the available remediation |

Selling Settings: `cust_master_name = Customer Name`, default selling price list `Standard Selling`, sales order not required. Accounts Settings: tax category from **Billing Address**. No Tax Category rows. No Payment Terms Templates. **Item count = 0**.

Existing non-client rows (not used as commercial masters): operator/integration Contacts; Company office Address linked to `CorpFlowAI LTD`.

---

## 2. Three stores (do not mix)

| Store | What belongs here | What must not |
| --- | --- | --- |
| **1. ERPNext commercial master** | Legal/trading name, customer type, group, territory, billing currency, selling price list, tax id / BRN, website, primary Contact (email + WhatsApp/phone), billing Address | Enquiry process, pages, brand files, passwords |
| **2. CorpFlowAI delivery records** | #715 / #716 intake: sources, stages, escalation, test scenarios, reporting, timezone, case type/tier, hosting facts (no passwords), pages, design, revision authority, evidence packets, build gates | A second billing name/email/address treated as source of truth |
| **3. Approved secure channels only** | Passwords, OTPs, API keys, hosting/DNS/registrar credentials, mailbox credentials, messaging tokens, production access | GitHub, chat, tickets, ERPNext `customer_details`, delivery templates |

**Company Master (#765)** stays the **evidence/asset** hub (logos, certificates, publication/approval). It is **not** a second commercial customer. After this packet, legal/trading name, billing contact and billing address used on quotations and invoices are authoritative in **ERPNext**. Company Master may store a pointer to the ERPNext Customer name.

Postgres `leads` / operator desks remain intake and pipeline status only. Cross-reference the ERPNext Customer name; do not re-key commercial identity there.

---

## 3. Field mapping (#550 / #654 / #715 / #716)

### 3.1 Shared commercial identity → ERPNext

| Onboarding / Mauritius field | ERPNext | Notes |
| --- | --- | --- |
| Business / legal name | Customer.`customer_name` (required) | Invoice name. Document name usually matches on first create. |
| Trading name (if different) | Customer.`customer_details` line `trading_name=` | Do not create a second Customer. |
| Company vs individual | Customer.`customer_type` = Company / Individual / Partnership | Default Company for rescue clients. |
| Customer Group | `Commercial` | Standard row; no new group required. |
| Territory / service area | `Mauritius` or `Rest Of The World` | Standard rows. |
| Billing currency | Customer.`default_currency` | USD for Lead Rescue wedge; MUR for Website Rescue / MU sprints. |
| Price list | Customer.`default_price_list` = `Standard Selling` | MUR list today. USD list is a #882 standard-config follow-up. |
| Tax ID / BRN | Customer.`tax_id` | Standard field. Empty until the client provides it. |
| Website / current site URL | Customer.`website` | Public URL only. |
| Primary contact name | Contact.`first_name` + `last_name` | Linked with Dynamic Link → Customer. |
| Working email | Contact.`email_ids` (primary) | Customer.`email_id` is Read Only (fetched). |
| Working WhatsApp / phone | Contact.`phone_nos` (`is_primary_mobile_no`) | Lead also has `whatsapp_no` if a Lead is used pre-sale. |
| Named approver | Same Contact, or a second Contact with designation `Named approver` | No custom field. |
| Billing address | Address type Billing; required line1, city, country | Link to Customer; set as `customer_primary_address`. |
| Product (LR / WR) | `customer_details` `product=ai-lead-rescue` or `website-rescue` | Standard Text; no custom field. |
| CF-… / lead UUID / issue | `customer_details` `ref=` | Cross-reference only. |

Customer required by meta: `customer_name`, `customer_type`. Operator **must also set** group, territory, currency, price list so Quotation/Sales Invoice can inherit defaults.

### 3.2 Lead Rescue delivery-only (stays in CorpFlowAI)

`timezone`, `enquiry_sources`, `primary_leaky_source`, `current_process_summary`, `users_operators`, `lead_stages`, `escalation_rules`, `approved_response_rules`, `test_scenarios`, `reporting_requirements`, responsibilities / exclusions / acceptance / review cadence, evidence packets, `messaging_runtime_authorized`.

### 3.3 Website Rescue delivery-only (stays in CorpFlowAI)

`case_type`, `tier`, `domain_hostname`, `hosting_facts_summary` (no passwords), `brand_assets_status`, `pages_in_scope`, `services_or_products_summary`, `content_ownership`, `enquiry_destination`, `design_preferences`, `revision_authority`, `maintenance_boundary`, `content_assets_ready`, `approved_access_confirmed`, simulated deploy/DNS flags.

Brand **files** (logo binaries) belong in Company Master evidence storage, not on the Customer row.

### 3.4 Lead / Opportunity

Use **Lead** only before a Customer exists (enquiry → qualification). On frappe 16 the campaign/source fields are `utm_source` / `utm_medium` / `utm_campaign`, not `source`.

Use **Opportunity** when a qualified amount/stage is useful (`opportunity_from` + `party_name`). Once the client is quote-ready, **Customer is the master**. Set `Customer.lead_name` / `opportunity_name` if converting. Do not keep a second commercial identity on the Lead.

---

## 4. Links needed for quotation / invoice

| Document | Party fields that consume this master |
| --- | --- |
| Quotation | `quotation_to=Customer`, `party_name`, `contact_person`, `customer_address`, `currency`, `selling_price_list` |
| Sales Invoice | `customer` (required), `contact_person`, `customer_address`, `currency`, `selling_price_list` |
| Payment Entry | Party = Customer (payment evidence path; not executed in this packet) |

A Customer with primary Contact (email) and primary billing Address is **sufficient** for those party fields. Creating an actual Quotation still needs an **Item** (#881) and is owned by #882. This packet did not create quotations, invoices, or payment entries.

USD Customer + MUR `Standard Selling` is allowed on the Customer row. Quotation currency conversion is a #882 concern (`PRICE_LIST_CURRENCY_MISMATCH` warning in the mapper).

---

## 5. Duplicate prevention and update rules

ERPNext will **not** reliably stop a second Customer with the same `customer_name`. A live probe created `CF880 Synthetic Lead Rescue Ltd - 1` instead of rejecting. Contact email is also **not** unique. The integration user **cannot DELETE** Customer (HTTP 403) but **can disable**.

**Operator rules (enforced in `lib/erpnext/client-master.js` for fixtures; follow in the UI/API):**

1. **Search before create** on normalized name (strip a trailing ` - N`), primary email, and tax id if present.
2. **Match → UPDATE** the enabled Customer: refresh Contact, Address, currency, group, territory, website, `customer_details`. Do not silently rename.
3. **Conflict → STOP** if the same email belongs to a different customer name, or several enabled Customers share the name.
4. **Accidental suffix duplicate → disable it** (`disabled=1`) and write `DUPLICATE_OF=<canonical name>` in `customer_details`. Done in this run for `CF880 Synthetic Lead Rescue Ltd - 1`.
5. **Do not** create a parallel commercial row in Postgres, Company Master, or GitHub.

---

## 6. Lifecycle and handoff to delivery

```text
optional Lead
  → optional Opportunity
    → Customer + Contact + Address   ← commercial master (this packet)
      → Quotation / acceptance / payment evidence (#714 / #882)
        → financially_approved=true
          → delivery record (#715 or #716) stores ERPNext Customer name only
            → build / preview / acceptance / handover (delivery store)
```

Create the ERPNext Customer **before the first Quotation**, not after delivery starts. If a quote was issued outside ERPNext, create the Customer at financial approval so onboarding does not invent a second identity.

Handoff payload shape (`buildDeliveryHandoff`):

- `commercial_master: erpnext`
- `erpnext_customer: <Customer name>`
- `financially_approved: true|false`
- `next_state: approved_to_onboard` when approved
- delivery intake stays in the #715 / #716 record

Messaging runtime, DNS, and client_production remain separately gated.

---

## 7. Synthetic proof (no real client data)

Created via the existing integration API (standard DocTypes only):

| Product | Customer | Contact | Address | Currency |
| --- | --- | --- | --- | --- |
| Lead Rescue | `CF880 Synthetic Lead Rescue Ltd` | `Priya Synthetic-CF880 Synthetic Lead Rescue Ltd` | `CF880 Synthetic Lead Rescue Ltd-Billing` | USD |
| Website Rescue | `CF880 Synthetic Website Rescue Ltd` | `Jean Synthetic-CF880 Synthetic Website Rescue Ltd` | `CF880 Synthetic Website Rescue Ltd-Billing` | MUR |

Emails use `@example.invalid`. Primary contact and billing address were linked on each Customer. Read-back showed `email_id` / `mobile_no` populated from the Contact (Read Only fetch). Fixtures: `fixtures/erpnext-client-master/`.

Duplicate probe: second create of the Lead Rescue name succeeded as `… - 1`; that row was **disabled**. Contact with the same email was also accepted by ERPNext — another reason search-before-create is mandatory.

---

## 8. Standard-config changes (not done here)

| Change | Why | Blocks Client Master? |
| --- | --- | --- |
| USD selling Price List | Price USD quotations without MUR conversion | **No** — Customer.default_currency=USD already set |
| Payment Terms Template | Invoice schedules | **No** — empty; #882 |
| Tax Category / VAT | Mauritius VAT | **No** — HB-3 |
| Optional Customer Groups `Lead Rescue` / `Website Rescue` | Filter only | **No** — `Commercial` + `customer_details` is enough |

**Custom field / DocType proposal:** **none.**

---

## 9. Gaps (non-blocking)

- No Items, so a live Quotation cannot be completed until #881.
- USD price list missing (#882).
- Payment Terms DocType 403 for this user (#882 / role grant).
- `MASTER_ADMIN_KEY` still injected into ordinary Cursor Cloud runs (#899 UI delete) — does not block Client Master.
- No automated intake → ERPNext sync. Manual/operator create using this mapping is the v1 path (`NO IMPLEMENTATION AUTHORIZED` for a sync API).

---

## 10. Operator steps (sandbox / test)

1. Confirm `financially_approved` or quote-ready identity from #714.
2. Search Customer by name and Contact by email.
3. If found, update; if conflict, stop.
4. Else create Customer (Company, Commercial, Mauritius, currency, Standard Selling, `customer_details` product line).
5. Create Contact with primary email + mobile; link to Customer; set as primary.
6. Create Billing Address; link to Customer; set as primary.
7. Copy the Customer name onto the #715 / #716 delivery record. Do not paste secrets.

---

## 11. Protected boundary honoured

- No ERPNext schema / custom fields / custom DocTypes
- No production config change (no new Price List, Tax Category, or Payment Terms Template)
- No credentials printed or committed
- No payments, no client sends, no live client data
- Synthetic rows only; accidental duplicate disabled rather than deleted

## Delivery Reality Audit

```text
Delivery Reality Audit:
- Local fix exists: YES
- Merged to main: NO
- Production deployment ID: n/a — ERPNext sandbox/test mapping; no Vercel customer surface
- Commit deployed: n/a until merge
- Live URLs tested: n/a — ERPNext API sandbox/test (Customer/Contact/Address create+read)
- Expected vs actual result: two synthetic Customers with linked Contact+Address; duplicate suffix row disabled
- Client-facing flow usable: n/a (operator commercial master, not a public page)
- Final verdict: PARTIAL (PR only; not merged; ERPNext Client Master READY on sandbox/test)
```
