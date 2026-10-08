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
- The MUR 85,000 Enquiry Recovery Sprint remains a separate offer.
- The fictional Website Rescue validation path remains `/demo/website-rescue`.

## Marketing quality gate

Provisional score: **13/14**, pending visual review of the local preview at 390px and desktop
widths. Strategic clarity 2, message quality 2, proof/trust 2, scannability 2, visual/aesthetic
1 pending screenshots, conversion logic 2, channel fit 2.

Required visual checks before treating the asset as verified:

- product selection precedes market selection;
- changing product clears stale currency;
- all four market rates and bounded scopes render correctly;
- no horizontal overflow at 390px or desktop;
- assessment mailto is valid;
- `/pricing`, `/demo/website-rescue` and both secondary pricing links resolve.

No live gateway availability, payment activation, client outcome, or public publication is
claimed by this evidence file.
