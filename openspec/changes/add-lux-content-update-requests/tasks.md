## 1. Implementation

- [ ] 1.1 Add pure helpers for allowed request types, visibility, priority, structured description, and `CONTENT-REQ-…` display references.
- [ ] 1.2 Add the protected `/client/luxe-maurice-ai/content` route using the existing LuxeMaurice host/session/editor gate.
- [ ] 1.3 Add a client-friendly content-update form for photos, documents, videos, listings, and text/page updates.
- [ ] 1.4 Submit through existing tenant-scoped CMP `ticket-create` persistence and display confirmation/next steps.
- [ ] 1.5 Add navigation/linking from the LuxeMaurice authenticated workflow where appropriate.
- [ ] 1.6 Update canonical CMP/Luxe documentation for the request workflow and operator boundary.

## 2. Tests

- [ ] 2.1 Test allowed request types, input limits, visibility, priority, description serialization, and reference generation.
- [ ] 2.2 Test route auth/tenant/editor behavior and required client copy.
- [ ] 2.3 Test that submission produces a reference/success state without claiming publication.
- [ ] 2.4 Confirm existing full Node suite and production build remain green.
- [ ] 2.5 Complete the security checklist for auth, tenancy, errors, logging, and data access.

## 3. Client package

- [ ] 3.1 Capture safe fictional screenshots: dashboard, request form, and confirmation (`09`–`11`).
- [ ] 3.2 Add the screenshots and manifest entries to the training pack.
- [ ] 3.3 Rebuild PDF/HTML with **How to add or update LuxeMaurice website content** near the front.
- [ ] 3.4 Update the follow-up email, send packet, inventory, checklist, and package tests.

## 4. Preview delivery

- [ ] 4.1 Push PR #609 and wait for a Ready Vercel Preview.
- [ ] 4.2 Verify the protected route and safe submission flow on Preview without contacting Jan.
- [ ] 4.3 Record Preview URL, screenshots, PDF page count, and verification results in PR #609.
- [ ] 4.4 Leave Anton approval and Production deployment/send gates open.
