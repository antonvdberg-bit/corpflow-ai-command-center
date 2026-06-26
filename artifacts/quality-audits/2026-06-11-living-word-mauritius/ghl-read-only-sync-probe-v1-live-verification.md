# Living Word — GHL read-only sync probe v1 (live verification)

**Status:** **COMPLETE** (probe scope) — live read-only probe executed on Vercel Production via **admin `corpflow_session` only** (no `MASTER_ADMIN_KEY`).

**Timestamp (UTC):** 2026-06-26T11:05:53.367Z
**Tenant:** `living-word-mauritius`
**Environment target:** vercel_production_factory
**API calls:** 10 / 19

## Statements

- **No secrets exposed** in this artifact
- **No `MASTER_ADMIN_KEY`** used for probe execution (admin session cookie only)
- **No GHL writes** performed
- **No outbound messages** sent
- **No public site / DNS / GHL config** changes
- **No real member names, emails, phones, or message bodies** committed (field names/counts/metadata only)

## Endpoints / categories checked

- `GET /locations/s3s8FXVgfq50uU7HIFSE` — HTTP 200 — ok
- `GET /locations/s3s8FXVgfq50uU7HIFSE/customFields?model=contact` — HTTP 200 — ok
- `POST /contacts/search` — HTTP 200 — ok
- `POST /contacts/search` — HTTP 200 — ok
- `GET /forms/?locationId=s3s8FXVgfq50uU7HIFSE` — HTTP 200 — ok
- `GET /forms/submissions?locationId=s3s8FXVgfq50uU7HIFSE&limit=1` — HTTP 200 — ok
- `GET /opportunities/pipelines?locationId=s3s8FXVgfq50uU7HIFSE` — HTTP 200 — ok
- `GET /calendars/?locationId=s3s8FXVgfq50uU7HIFSE` — HTTP 200 — ok
- `GET /surveys/?locationId=s3s8FXVgfq50uU7HIFSE` — HTTP 200 — ok
- `GET /users/search?locationId=s3s8FXVgfq50uU7HIFSE` — HTTP 422 — failed

## Sensitive domains intentionally excluded

- conversations
- messages
- notes
- contact_create_update_delete
- outbound_send
- webhooks_register

## Summary metadata

- **Location:** [redacted-name] (`s3s8FXVgfq50uU7HIFSE`)
- **Contacts total (estimate):** 642
- **Distinct tags in sample:** —
- **Custom fields (contact model):** 51
- **Forms:** 6
- **Surveys:** 1
- **Pipelines:** 4
- **Calendars:** 1

## Field manifest (custom fields)

| id | name | key | dataType |
|----|------|-----|----------|
| 0QclTETrVVxObuXCSIhb | [redacted-name] | contact.barista_team_active | SINGLE_OPTIONS |
| 1mVQlcHvYd7w6zWUFo4N | [redacted-name] | contact.prayer_team_joined | DATE |
| 44iYcWfu3cXmPXRWJbbu | [redacted-name] | contact.i_want_to_join | CHECKBOX |
| 45e7wMlkDqYUGldphl95 | [redacted-name] | contact.wordgroups_joined | DATE |
| 6oTZTQxZWIXps0fVhshL | [redacted-name] | contact.barista_team_joined | DATE |
| 9AVODffNDQ7WsSWvEMdV | [redacted-name] | contact.events_n_lifestyle_leader | TEXT |
| 9Z0Ekd8EUPif87iF2opZ | [redacted-name] | contact.mens_ignite_leader | TEXT |
| B0NzcWktOPMEy0SVIhPj | [redacted-name] | contact.worship_team_joined | DATE |
| BH8cT9R2prcDlr3fua7B | [redacted-name] | contact.bloom_ladies_leader | TEXT |
| BKwiFAIwp6BnXzjRv0wA | [redacted-name] | contact.i_have_a_prayer_request | TEXT |
| EU4Fg2gnYnmAejQRabg2 | [redacted-name] | contact.emergency_contact_person_name | TEXT |
| EZ4Sce9BzC5F2XWHmWCw | [redacted-name] | contact.wordgroups_leader | TEXT |
| FRY4NeuIPSaXvVFRM2sI | [redacted-name] | contact.approval_status | SINGLE_OPTIONS |
| Fpnbv5GzypSDX6K8ylh2 | [redacted-name] | contact.ready_to_serve | CHECKBOX |
| KMrYklYkndG4vAJrgJa1 | [redacted-name] | contact.tech__media_team_active | SINGLE_OPTIONS |
| NlHjf6yxTn8Dsp5a5sbj | [redacted-name] | contact.ushers_team_leader | TEXT |
| O3K1UMI62I939XMX0M5a | [redacted-name] | contact.ushers_team_joined | DATE |
| O3oIcc0PjG08Ah5Zl8wW | [redacted-name] | contact.prefill_url | TEXT |
| OdhW50MVIlKGHXaIKOKs | [redacted-name] | contact.update_type | RADIO |
| OecIWv7dptjEYkhoTkgp | [redacted-name] | contact.business_name | TEXT |
| PHX9nHmMqclhbAPh59rI | [redacted-name] | contact.phone_2 | TEXT |
| UZhPnL6BXfAQSUUFOS3N | [redacted-name] | contact.profile_update_shortlink | TEXT |
| VAzJD34fEboEllTi8LG6 | [redacted-name] | contact.trinity_kids_status | SINGLE_OPTIONS |
| WRgovr54uLQf8eMmHA1A | [redacted-name] | contact.mens_ignite_active | SINGLE_OPTIONS |
| WWtyntpj2HyrxkqY0kNg | [redacted-name] | contact.barista_team_leader | TEXT |
| XRh3ESBG4xyPVnk1mdoi | [redacted-name] | contact.update_your_profile | LARGE_TEXT |
| XXZUhixqs67gyhwFmrtH | [redacted-name] | contact.mens_ignite_joined | DATE |
| XdX4vW6IQCYRzh01sfL8 | [redacted-name] | contact.preferred_communication | SINGLE_OPTIONS |
| Y9JL215yXnCPh8sJ1vBT | [redacted-name] | contact.events__lifestyle_joined | DATE |
| azV2QxuLl0SB8cFELOai | [redacted-name] | contact.gender_sex_1 | SINGLE_OPTIONS |
| cLoMnATjKk3U0Ucrn7EN | [redacted-name] | contact.how_many_people | TEXT |
| crjWUYoz7qWrIcx7an0i | [redacted-name] | contact.wordgroups_active | SINGLE_OPTIONS |
| d9WZJ9vQJou2LdwjKfvQ | [redacted-name] | contact.users_group_status | SINGLE_OPTIONS |
| e9fLZ4XXjlczewMW2Pu4 | [redacted-name] | contact.events__lifestyle_active | SINGLE_OPTIONS |
| eUoODww0v9g4VVMXwsOC | [redacted-name] | contact.bloom_ladies_active | SINGLE_OPTIONS |
| fd63y1h9h25t9bQo1fbV | [redacted-name] | contact.email_2 | TEXT |
| hDEajjzkXJFJhgdZf31y | [redacted-name] | contact.prayer_team_leader | TEXT |
| i9iyZU4OORpopBd6heSg | [redacted-name] | contact.bloom_ladies_joined | DATE |
| iI4pFPmnXWcHWQSxkmeI | [redacted-name] | contact.prayer_team_actice | SINGLE_OPTIONS |
| lCkSnOxqezwltVpy0Y6A | [redacted-name] | contact.emergency_contact_phone_number | TEXT |
| lJ9rZGx9r01vI880Bn30 | [redacted-name] | contact.last_data_qa_date | DATE |
| lOtp1PLbTKOGGYTUjciF | [redacted-name] | contact.i_am_ready_to_serve_on_a_team_s | CHECKBOX |
| llYWnKDQ8jsirpENDKvS | [redacted-name] | contact.to_celebrate_we_will_pledge_a_rs_200_donation_on_your_behalf_please_select_a_charity_below | CHECKBOX |
| mRnPfqgWFUCRg5kZ5J8A | [redacted-name] | contact.member_type | SINGLE_OPTIONS |
| mbIaUKjfb0HPpRyEvn0I | [redacted-name] | contact.tech_n_media_team_leader | TEXT |
| mtsFtf00f00bEFE0ad1t | [redacted-name] | contact.trinity_kids_joined | DATE |
| nCDjceTVPHRoxudczJ3K | [redacted-name] | contact.worship_team_active | SINGLE_OPTIONS |
| qXQavzZGBIHvgJCZVHXt | [redacted-name] | contact.add_me_to_church_communications_for_updates_and_events | CHECKBOX |
| rGRIbl34zuO0VNR6Orb9 | [redacted-name] | contact.trinity_kids_team_leader | TEXT |
| t3Ax8zP9SZdS7faCHLDU | [redacted-name] | contact.worship_team_leader | TEXT |
| tXgTyd3xLUyXDofVhHxk | [redacted-name] | contact.tech__media_team_joined | DATE |

## Forms metadata

- `YvuQtsoSWj76pk7dR7Cb` — [redacted-name]
- `L5463D74CHceRkq3qbnS` — [redacted-name]
- `i7Uc7MPcwNu6pgHsNenm` — [redacted-name]
- `UoXTs5jRHO5vFaOlyHSl` — [redacted-name]
- `uV3bc9e8IyEqGIWX9rRH` — [redacted-name]
- `T5Rf9UNjqT2l4A60MKva` — [redacted-name]

## Recommended next packet

**Member Update Flow schema/form design v1** from this field manifest — see [`member-update-flow-schema-form-design-v1.md`](./member-update-flow-schema-form-design-v1.md). Not direct canonical import.

## Delivery Reality Audit

```text
Local fix exists: YES
Merged to main: YES (probe route + session-only operator script, PR #478)
Production deployment ID: live probe against core.corpflowai.com (2026-06-26)
Commit deployed: 76268977 (main) + prior GHL probe implementation
Live probe executed: YES
Auth method: admin corpflow_session (factory login) — no MASTER_ADMIN_KEY
API call count: 10 / 19
GHL writes: NO
Secrets in artifact: NO
Real member data in artifact: NO (redacted field names only)
Final verdict: COMPLETE (probe scope)
Client-facing flow usable: N/A (inventory only)
```
