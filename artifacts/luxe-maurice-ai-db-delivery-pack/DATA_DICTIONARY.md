# LuxeMaurice AI — data dictionary (schema v1)

**Tenant boundary:** all business tables include `tenant_id`. Default demo tenant slug: `luxe-maurice`.

---

## tenants

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| slug | TEXT UNIQUE | e.g. `luxe-maurice` |
| display_name | TEXT | Client-facing org name |
| status | TEXT | active / suspended / archived |

**Frontend:** resolve tenant once at login or host mapping; filter all queries by `tenant_id`.

---

## users / roles / user_roles

Operator and advisor accounts. `user_roles` links users to tenant-scoped roles (`operator`, `advisor`, extend as needed).

---

## properties

Luxury property catalogue (private opportunities).

| Column | Type | Notes |
|--------|------|-------|
| slug | TEXT | URL key, unique per tenant |
| title, summary, description | TEXT | Listing copy |
| status | TEXT | draft → published workflow |
| region_label, location_label | TEXT | Discovery filters |
| price_label | TEXT | e.g. "Price on application" |
| highlights_json | JSONB | Bullet highlights for cards |
| published_at | TIMESTAMPTZ | Null until published |

**Relationships:** `property_media`, `property_documents`, `enquiries`, `property_matches`, `offers`.

**Frontend:** property list filters on `status = 'published'`; detail by `slug`.

---

## property_media

Gallery assets. `storage_path` is app-defined (S3, Supabase Storage, or local). `is_hero` marks card/detail hero.

---

## property_documents

Memorandum / legal / brochure placeholders. `visibility` controls buyer access tier.

---

## buyers / buyer_profiles / buyer_requirements

Buyer identity + wizard output.

| Table | Purpose |
|-------|---------|
| buyers | Core identity (email unique per tenant) |
| buyer_profiles | Wizard completion, budget, timeline |
| buyer_requirements | Key/value requirements (region, type, etc.) |

**Frontend:** buyer wizard writes `buyer_profiles` + `buyer_requirements`; create or upsert `buyers` by email.

---

## enquiries

Inbound interest before CRM qualification. Links optional `property_id` + `buyer_id`.

---

## leads

CRM record. Created from enquiry conversion. `status` drives pipeline (`new` → `qualified` → `viewing` → `offer` → `won`/`lost`).

---

## lead_scores

Rule-based or ML score snapshot. `model_version` tracks scoring logic (`rules_v1` in seed).

**Frontend:** display `score` + `score_band` on lead detail and CRM list sort.

---

## property_matches

Suggested or shortlisted property fits for a lead. `match_score` 0–100.

---

## viewings

Scheduled appointments. Links lead + property + optional host user.

---

## offers

Offer pipeline placeholder. `amount_label` supports "on application" without numeric price.

---

## crm_tasks

Operator tasks (follow-up, call, document review). Links lead and/or buyer.

---

## document_templates / generated_documents

Template store + generated output placeholders. No automation engine included — storage path only.

---

## communications

Audit log of inbound/outbound touchpoints. `body_preview` is truncated; full body lives outside DB if needed.

---

## audit_events

Generic append-only audit trail (`entity_type`, `entity_id`, `action`, `detail_json`).
