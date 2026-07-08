# LuxeMaurice AI — frontend API contract (read/write models)

Contract shapes for a frontend or BFF layer against PostgreSQL/Supabase. **Not** a live HTTP API in this pack — SQL-backed data models only.

All queries MUST filter by `tenant_id` (from session or host mapping).

---

## 1. Property listing read model

**Query:** published properties for tenant.

```json
{
  "id": "uuid",
  "slug": "sample-coastal-residence",
  "title": "Sample Coastal Residence — Black River",
  "summary": "string",
  "region_label": "Black River",
  "location_label": "West Coast, Mauritius",
  "price_label": "Price on application",
  "status": "published",
  "hero_image": {
    "storage_path": "demo/.../hero.jpg",
    "alt_text": "string"
  },
  "published_at": "ISO-8601"
}
```

**SQL sketch:**

```sql
SELECT p.*, pm.storage_path, pm.alt_text
FROM properties p
LEFT JOIN property_media pm ON pm.property_id = p.id AND pm.is_hero = true
WHERE p.tenant_id = $1 AND p.status = 'published'
ORDER BY p.published_at DESC NULLS LAST;
```

---

## 2. Property detail read model

Includes gallery + documents metadata.

```json
{
  "property": { "...listing fields..." },
  "gallery": [{ "id": "uuid", "storage_path": "...", "sort_order": 0 }],
  "documents": [{ "id": "uuid", "title": "...", "visibility": "private" }]
}
```

---

## 3. Buyer wizard submission

**Write:** upsert buyer by email, insert/update profile + requirements.

```json
{
  "email": "buyer@example.com",
  "full_name": "string",
  "phone": "optional",
  "profile": {
    "nationality": "string",
    "budget_min": 1500000,
    "budget_max": 3500000,
    "currency_code": "USD",
    "timeline": "6-12 months"
  },
  "requirements": [
    { "key": "region", "value": "West Coast", "priority": "must_have" }
  ]
}
```

**Returns:** `{ "buyer_id": "uuid" }`

---

## 4. Enquiry / lead creation

**Write flow:**

1. Insert `enquiries` (property_id, buyer_id, message, channel=`web`)
2. Insert `leads` (enquiry_id, status=`new`)
3. Optional: insert `lead_scores`, `property_matches`, `crm_tasks`

```json
{
  "property_id": "uuid",
  "buyer_id": "uuid",
  "message": "Private consultation request",
  "channel": "web"
}
```

**Returns:**

```json
{
  "enquiry_id": "uuid",
  "lead_id": "uuid"
}
```

---

## 5. CRM lead list

```json
{
  "id": "uuid",
  "status": "new",
  "buyer": { "full_name": "...", "email": "..." },
  "property": { "slug": "...", "title": "..." },
  "score": { "score": 72.5, "score_band": "warm" },
  "created_at": "ISO-8601"
}
```

---

## 6. Match score output

```json
{
  "lead_id": "uuid",
  "matches": [
    {
      "property_id": "uuid",
      "slug": "sample-coastal-residence",
      "match_score": 81.0,
      "match_reason": "region and budget alignment",
      "status": "shortlisted"
    }
  ]
}
```

---

## 7. Document / template placeholders

**Templates:** list active `document_templates` by `template_key`.

**Generated:** create `generated_documents` row with `status='draft'`; storage path filled when PDF/export exists.

```json
{
  "template_key": "private_opportunity_intro",
  "lead_id": "uuid",
  "property_id": "uuid",
  "title": "Private Opportunity Memorandum"
}
```

---

## Status enums (reference)

| Entity | Values |
|--------|--------|
| properties.status | draft, review, published, withdrawn, archived |
| leads.status | new, contacted, qualified, viewing, offer, won, lost, nurture |
| enquiries.status | new, reviewing, converted, closed |
| crm_tasks.status | open, in_progress, done, cancelled |
