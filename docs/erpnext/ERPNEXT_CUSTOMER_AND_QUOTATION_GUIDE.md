# ERPNext customer and quotation guide — MUR rapid-delivery sprints

**Status:** Operator guide · **Updated:** 2026-07-14  
**Owner:** Anton  
**Anchor:** `<!-- ERPNEXT_CUSTOMER_AND_QUOTATION_GUIDE_V1 -->`

<!-- ERPNEXT_CUSTOMER_AND_QUOTATION_GUIDE_V1 -->

**NO IMPLEMENTATION AUTHORIZED** — procedure for when ERPNext is configured. Until Print Format is live, manual quote emails from `docs/revenue/templates/quote-email.md` remain canonical for external send.

---

## 1. When to create records

Create ERPNext **Customer** + **Quotation** after:

1. Discovery call complete and fit confirmed
2. Offer matched to catalogue slug
3. Starting MUR price stated (35k / 45k / 45k)
4. Client expects written quote within 24 hours

Do **not** create Customer for `/lead-rescue` USD 150 wedge in the MUR sprint Item master — separate funnel.

---

## 2. Customer creation

### 2.1 Field mapping (Postgres → ERPNext)

| Postgres / intake field | ERPNext Customer field |
| ----------------------- | ---------------------- |
| `business_name` | Customer Name |
| Contact from intake | Primary Contact (linked Contact doctype) |
| Email | Email |
| Phone | Mobile / Phone |
| CF-… reference | Notes or custom field — **always log** |
| Postgres `lead_id` | Notes — full UUID for mapping |
| Discovery notes | Communication or attached note |
| BRN (if provided) | Tax ID / custom field (when configured) |
| Billing address | Address doctype (linked) |

### 2.2 Operator steps (ERPNext UI)

> **Anton click-by-click:** ERPNext access required for all steps below.

1. Open ERPNext → **CRM** → **Customer** → **New**
2. Enter Customer Name (= legal business name)
3. Set Customer Type = Company (or Individual if sole trader)
4. Set Country = Mauritius (default for MUR sprints)
5. Add Contact: name, email, phone from intake
6. In Notes / Comments: `CF-{tail} | lead_id={uuid} | offer_slug={slug}`
7. Save

### 2.3 Automation class

| Step | Class |
| ---- | ----- |
| Customer creation | MANUAL CONTROL |
| Intake → Customer field copy | AUTOMATION CANDIDATE (future bridge packet) |
| CF-… cross-reference | MANUAL CONTROL |

---

## 3. Item selection (MUR sprints)

Use Items from the canonical catalogue (`docs/erpnext/ERPNEXT_PRODUCT_CATALOGUE_V1.md`):

| Offer (catalogue title) | Item code | Starting price | Status (#881) |
| ----------------------- | --------- | -------------- | ------------- |
| AI Lead Rescue Sprint | `CF-RD-LEAD-RESCUE` | MUR 35,000 | Item master live; Item Price pending role grant |
| Premium Landing Page Rescue | `CF-RD-LANDING-RESCUE` | MUR 45,000 | Item master live; Item Price pending role grant |
| Customer Recovery & Reputation Management Sprint | `CF-RD-REPUTATION-RECOVERY` | MUR 45,000 | Reserved code — not inserted |

USD 150 launch pilot uses `LR-SETUP-USD-150` (not a MUR clone of that SKU). Recurring: `LR-REC-USD-99` / `CF-WR-REC-MUR-MAINT`.

---

## 4. Quotation creation

### 4.1 Recommended path

**Quotation** (Path A per production readiness eval) — PDF title customised to *"Pro-forma invoice"* when Print Format live.

### 4.2 Quotation fields

| Field | Value |
| ----- | ----- |
| Customer | Customer from §2 |
| Currency | **MUR** |
| Item | Sprint Item (§3) |
| Rate | Catalogue starting price (adjust only with written scope change) |
| Qty | 1 |
| Notes | 50% deposit before work; balance on delivery acceptance |
| Valid till | 14 days default |

### 4.3 Deposit terms (verbatim intent)

Include in Quotation terms / cover email:

- **50% deposit** in MUR via manual bank transfer before work commences
- Balance on delivery acceptance (or before production release for landing page offer)
- **24–72 hours** first visible output after deposit clearance + access/assets
- **No revenue guarantees**

### 4.4 Operator steps (ERPNext UI)

> **Anton click-by-click:** ERPNext access required.

1. **Selling** → **Quotation** → **New**
2. Select Customer
3. Add Item line — MUR rate from catalogue
4. Set naming series (when configured: `CFLR-QUO-.YYYY.-.NNN`)
5. Add terms note for 50% deposit
6. Save → **Submit**
7. Print / PDF (when Print Format live) OR copy details to manual quote email
8. Record Quotation name on mapping sheet + `/admin/rapid-delivery` notes

### 4.5 Client acceptance gate

**Do not** issue deposit invoice until client replies in writing accepting scope and price.

---

## 5. CorpFlow operator desk alignment

After Quotation submitted:

| Desk field | Value |
| ---------- | ----- |
| Operator status | `proposal_sent` → `won` on acceptance |
| Notes | ERPNext Quotation ID |
| Proposal summary | Already generated on `/admin/rapid-delivery` — paste into email |

---

## 6. USD 150 wedge (parallel — do not mix)

| Aspect | MUR sprint | USD wedge |
| ------ | ---------- | --------- |
| Intake | `/offers/*` or `/contact#discovery` | `/lead-rescue` |
| Operator desk | `/admin/rapid-delivery` | `/admin/lead-rescue` |
| Currency | MUR | USD |
| Item | CF-RD-* Items | `LR-SETUP-USD-150` (production) / manual template |
| Quoting | This guide | `AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` |

---

## 7. Cross-references

- `lib/public/rapid-delivery-offers.js`
- `docs/revenue/templates/quote-email.md`
- `docs/erpnext/ERPNEXT_RECORD_MAPPING.md`
- `docs/erpnext/ERPNEXT_DEPOSIT_INVOICE_GUIDE.md`
