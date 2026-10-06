# CorpFlowAI Professional Quotation v1

Canonical source for the ERPNext custom Print Format **CorpFlowAI Professional
Quotation** (`Quotation`, Jinja). The template is intentionally native to
ERPNext: ERPNext remains the commercial record and the renderer.

## Application path

1. Authenticate as the approved `integrations@corpflowai.com` integration user.
2. Read the existing `Print Format` record named `CorpFlowAI Professional
   Quotation`; do not edit standard Frappe formats.
3. Run `node scripts/erpnext/apply-professional-quotation.mjs`. The script
   embeds the repository-approved CorpFlowAI mark because the ERPNext Company
   record currently has no discoverable `image` path.
4. The script updates only that custom Print Format, then downloads PDFs for
   the OrixHealth Lead quotation and the synthetic Customer quotation.

## Data contract

The same Jinja handles `quotation_to=Lead` and `quotation_to=Customer`.
`customer_name` is the client-facing Bill To name; address and contact details
are optional fallbacks and internal Lead IDs are never rendered.

## Verification

Focused verification checks:

```bash
node --test node-tests/erpnext-professional-quotation.test.mjs
node scripts/erpnext/apply-professional-quotation.mjs
```

The live script fails closed unless the authenticated user is
`integrations@corpflowai.com`, the target Print Format is non-standard, both
quotation records remain Draft, and the OrixHealth amount/validity remain
MUR 25,000 / 2026-10-19. It does not submit, send, or release either
quotation.

Generated PDF and rendered-image evidence belongs under
`artifacts/erpnext/professional-quotation-1402/`.
