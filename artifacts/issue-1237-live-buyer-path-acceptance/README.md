# Issue #1237 — live Lead Rescue + Website Rescue buyer-path acceptance

**Current-main SHA tested:** `eb31cfd3d3c74a3f8a17b81ae4d6cccf54c07751`  
**GitHub Production deployment:** `6133312089` (success, 2026-08-28T00:21:36Z)  
**Environment:** `corpflow_test` public buyer routes on `https://corpflowai.com`  
**Method:** GET/read-only. No enquiry submitted. No data created.

## Verdict on live current-main

`NOT READY — Website Rescue buyer surfaces still show internal SKU titles instead of Website Rescue`

Lead Rescue buyer path passed. Website Rescue lock/CTA after #1230 passed. Remaining conversion defect: buyer-visible SKU titles on `/demo/website-rescue` (`T1 Landing Rescue`, `landing-rescue SKU`) and on the destination `/website-rescue` footer/meta/alt (`Premium Landing Page Rescue`).

This branch removes that leakage. Live re-check after merge + Production publish is required before `LAUNCH PRODUCT LIVE BUYER PATHS VERIFIED`.

Full table and screenshots: `VERIFICATION-REPORT.md`.
