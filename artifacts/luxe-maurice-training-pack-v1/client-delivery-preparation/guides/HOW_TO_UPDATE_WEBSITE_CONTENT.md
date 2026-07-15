# How to upload and update LuxeMaurice website content

LuxeMaurice already has two protected content tools. No separate CMS or second upload system is needed.

## Where to go

- **Property/listing text and visibility:** `https://lux.corpflowai.com/properties/admin`
- **Images, videos, and PDFs/documents:** `https://lux.corpflowai.com/change`

Sign in with the authorised LuxeMaurice tenant/editor account. Jan's account is allowlisted for the property editor in the current code. The complete Jan production walk-through still needs to be verified; Anton can co-pilot if the session or governance steps need support.

## Add or edit property/listing text

1. Open `/properties/admin`.
2. Select an opportunity or choose **New private opportunity**.
3. Complete title, slug, region, property type, listing status, price guidance, teaser, description, highlights, bedrooms, bathrooms, and area.
4. Select **Save**.
5. Set visibility deliberately: `draft`, `preview`, `published`, or `archived`.
6. Preview before publication, then verify `/properties` and `/property/<slug>`.

Nothing publishes merely because text was entered or saved.

## Upload and publish images/photos

1. Open `/change`.
2. Select the relevant C1–C4 LuxeMaurice content sprint ticket.
3. In **Add content**, select **Upload content**.
4. Choose an image. The endpoint accepts `image/*`, `video/*`, and `application/pdf`; the current default limit is 3 MB per file and 8 files per ticket unless deployment configuration overrides it.
5. Confirm the green upload message and the file in **Attachments**.
6. Select **Mark reviewed**.
7. Link the image to the property/opportunity slug.
8. Choose `hero`, `card`, or `gallery`; add public alt/caption details and gallery order/cover where needed.
9. Select **Publish**.
10. Verify the live homepage, catalogue card, or property page.

Upload, review, and link do not publish automatically.

## PDFs/documents

PDF (`application/pdf`) uploads are supported as governed attachments with secure view/download.

**Current public-display limit:** there is no public Luxe brochure/download component today. CorpFlowAI must add or configure an approved public link/download surface before the PDF can appear publicly.

## Videos

Video (`video/*`) uploads are supported as governed private attachments for review.

**Current public-display limit:** public Luxe property media serves only reviewed, explicitly published `image/*`. There is no current public video player, transcoding flow, or video publish slot.

Provide a YouTube, Vimeo, or approved private-hosted link for operator placement after approval, or upload raw video for private review and agree the hosting/embed step separately.

## What Jan can do and what remains governed

With the authorised account, Jan can create/edit listing text and visibility in `/properties/admin`; upload supported files in `/change`; and use the review, image-link, and explicit image-publish controls. Jan's complete production walk-through remains a verification gate.

CorpFlowAI/operator still confirms rights/privacy, placement, public wording, any missing PDF/video display surface, and the final live result. There is no full general-purpose CMS and no auto-publish.

## Verify after publication

Jan checks listing text/status, hero/card/gallery choice and order, visibility/privacy, live page/CTA, and any separately placed document/video link.

Jan replies **Approved** or **Changes needed** with exact corrections.
