# How to upload and update LuxeMaurice website content

LuxeMaurice already has two protected content tools. No separate CMS or second upload system is needed.

## Where to go

- **Property/listing text and visibility:** `https://lux.corpflowai.com/properties/admin`
- **Images, videos, and PDFs/documents:** `https://lux.corpflowai.com/change`

Sign in with the authorised LuxeMaurice tenant/editor account. Jan's account is allowlisted for the property editor in the current code. The complete Jan production walk-through still needs to be verified; Anton can co-pilot if the session or governance steps need support.

## 1. Add or edit property/listing text

1. Open `/properties/admin`.
2. Select an existing opportunity or choose **New private opportunity**.
3. Complete the listing fields: title, slug, region, property type, listing status, price guidance, teaser, description, highlights, bedrooms, bathrooms, and area.
4. Select **Save**.
5. Set visibility deliberately:
   - `draft` — saved, not public;
   - `preview` — available for authorised preview;
   - `published` — eligible for the public catalogue/detail page;
   - `archived` — retired from public use.
6. Preview the opportunity before publication, then verify `/properties` and `/property/<slug>` after it is published.

Nothing publishes merely because text was entered or saved.

## 2. Upload and publish images/photos

1. Open `/change`.
2. Select the relevant LuxeMaurice content sprint ticket:
   - **C1** — homepage imagery;
   - **C2** — first real private opportunity;
   - **C3** — placeholder/public-state cleanup;
   - **C4** — Jan end-to-end validation.
3. In **Add content**, select **Upload content**.
4. Choose an image from the operating-system file picker. The current default endpoint accepts `image/*`; the UI also accepts video and PDF. The current default limit is 3 MB per file and 8 files per ticket unless existing deployment configuration overrides it.
5. Confirm the green upload message appears and the file is visible in **Attachments**.
6. Select **Mark reviewed** after approval.
7. Link the reviewed image to the property/opportunity slug.
8. Choose the allowed public slot:
   - `hero`;
   - `card`;
   - `gallery`.
9. Add public alt text/caption where required. For galleries, set order and one cover image.
10. Select **Publish**. Upload, review, and link do not publish automatically.
11. Verify the image on `/`, `/properties`, or `/property/<slug>` as appropriate.

## 3. Upload PDFs/documents

The existing `/change` upload endpoint accepts exact MIME `application/pdf`.

1. Open the relevant ticket and select **Upload content**.
2. Choose the PDF.
3. Confirm it appears in **Attachments**.
4. Review it and keep it as a governed private attachment with a secure view/download link.

**Current public-display limit:** PDFs/documents do not have a public Luxe brochure/download component today. If Jan wants a PDF shown publicly, CorpFlowAI must first add or configure the approved public link/download surface. Do not treat attachment upload as public publication.

## 4. Upload or provide videos

The existing `/change` endpoint accepts `video/*`, so a video can be stored and reviewed as a governed ticket attachment.

**Current public-display limit:** Luxe public property media only serves reviewed and explicitly published `image/*`. There is no current public video player, transcoding flow, or video publish slot.

Current safe options:

- provide a YouTube, Vimeo, or approved private-hosted link for CorpFlowAI/operator placement after approval; or
- upload the raw video to the ticket for private review, then agree the hosting/embed step separately.

Do not claim that uploading a video makes it appear publicly.

## 5. What Jan can do and what remains governed

With the authorised account, Jan can use `/properties/admin` to create/edit listing text and visibility, and can use `/change` to upload supported files, review attachments, link approved images, and use the explicit image publish controls.

CorpFlowAI/operator remains responsible for:

- confirming rights, privacy, and public wording;
- ensuring the correct property and slot are selected;
- adding any missing public PDF or video link/embed surface;
- helping with credentials/session issues;
- verifying the live result before the work is treated as complete.

There is no full general-purpose CMS and no auto-publish.

## 6. Verify after publication

Jan checks:

- text, price/status, and listing details;
- hero, card, and gallery image choice/order;
- visibility and privacy;
- the live page and call-to-action;
- any approved document or video link that CorpFlowAI has separately placed.

Jan then replies:

- **Approved** — the result is accepted; or
- **Changes needed** — list the exact correction.
