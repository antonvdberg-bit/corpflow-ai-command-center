# Regional pricing publication evidence

**Date:** 2026-10-08  
**Source:** Issue #1432 / approved standard-pricing packet  
**Environment:** `corpflow_test` preview only; no public publication is claimed here.

## Sanitized acceptance evidence

- Standard pricing is implemented in `lib/public/regional-service-pricing.js`.
- The four accepted market matrices are exercised by
  `node-tests/regional-service-pricing.test.mjs`.
- `/pricing` requires product selection before market selection and clears the market when
  the product changes.
- Payment remains assessment-first; no checkout, payment SDK, secret, client data or intake
  write was added.
- The former MUR 85,000 Enquiry Recovery Sprint is closed to new sales; accepted quotes
  remain honoured and new work follows the permanent regional standard.
- The fictional Website Rescue validation path remains `/demo/website-rescue`.

## Marketing quality gate

<<<<<<< HEAD
Quality-gate score: **13/14 provisional**. Strategic clarity 2, message quality 2, proof/trust 2,
scannability 2, visual/aesthetic 1 pending screenshot artifact, conversion logic 2, channel fit 2.
=======
Quality-gate score: **13/14 provisional**. Strategic clarity 2, message quality 2, proof/trust 2,
scannability 2, visual/aesthetic 1 pending screenshot artifact, conversion logic 2, channel fit 2.
>>>>>>> 67fa46f2 (feat(marketing): publish approved regional service pricing)

Required visual checks before treating the asset as verified:

- product selection precedes market selection;
- changing product clears stale currency;
- all four market rates and bounded scopes render correctly;
- no horizontal overflow at 390px or desktop;
- assessment mailto is valid;
- `/pricing`, `/demo/website-rescue` and both secondary pricing links resolve.

## Local preview result

Manual browser smoke passed on `http://localhost:3000` at 390px mobile and 1792px desktop:

- `/pricing`, `/demo/website-rescue`, `/lead-rescue` and `/website-rescue` resolved;
- product selection preceded market selection, and changing product cleared market selection;
- all four markets and the exact accepted rates rendered, including Website Rescue South Africa
  at `ZAR 15,900` setup and `ZAR 2,190 / month`;
- no horizontal overflow was observed;
- the assessment mailto resolved to `support@corpflowai.com`;
- both existing secondary links resolved to `/pricing`;
- no form was submitted and no message was sent.

This is local preview evidence, not a deployed or public-live verification.

No live gateway availability, payment activation, client outcome, or public publication is
claimed by this evidence file.
