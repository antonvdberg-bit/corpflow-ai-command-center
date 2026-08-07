# Café International — Website Rescue Build v1

Parent: #760  
Build issue: #797  
Tenant provisioning: #764  
Baseline: #784  
Visual concepts: #785

## Definition of done

Produce a first functional CorpFlowAI preview of Café International that is suitable for Dion and Anna-Marie to review, while leaving `cafeinternational.net`, GoHighLevel production, chatbot logic, WhatsApp automation and DNS untouched.

## Canonical working facts

The machine-readable source for this build packet is:

`fixtures/website-rescue/cafe-international-client-truth.json`

Use:

- Café International — The Flame Grill Café
- Royal Road, Trou aux Biches, Mauritius
- Monday–Saturday 16:30–22:00
- Sunday 12:30–22:00
- +230 5765 8735
- table bookings by phone or website chat
- takeaway by WhatsApp or phone only
- no takeaway via website chat
- no delivery
- since 2009 may be prominent

External directory differences are a cleanup task. Do not change canonical website facts to match third-party listings.

## Design direction

Build a hybrid of:

1. **The Flame Grill** — appetite-led steaks, ribs, burgers and flame-grill identity.
2. **Friendly Local Favourite** — owner-operated warmth, since-2009 history, hospitality and local trust.
3. **Modern Mauritius Grill** — use only for clear mobile navigation, destination clarity and fast conversion paths.

The site should feel substantial, warm and food-led rather than generic restaurant-template polished.

## Information architecture

First pass:

- `/`
- `/menu`
- `/steaks-and-grill`
- `/takeaway`
- `/about`
- `/visit`
- `/contact`

Do not add `/groups-and-events` until the offer is confirmed current.

## Homepage structure

### Hero

Headline direction:

**Flame-grilled favourites. Big flavour. Generous portions.**

Supporting message should establish Café International as an owner-operated Trou aux Biches grill serving steaks, ribs, burgers and more since 2009.

Primary actions:

- **View Menu** → `/menu`
- **Book a Table** → booking action panel with Phone + Chat
- **Order Takeaway** → takeaway action panel with WhatsApp + Phone

Never use one generic “Contact us” CTA when the customer intent is known.

### Proof / trust

Use verified/public proof only. Present third-party review reputation as supporting evidence without copying unsupported claims or stale directory facts.

### Grill highlights

Prioritize:

- steaks
- ribs
- burgers
- grill favourites

Portions and prices should be easy to reach from these sections.

### Since 2009 / owner-operated story

Use a concise, human section explaining the long-running local restaurant identity. Do not invent biography details.

### Menu preview

Show real category/item samples and a clear path to the full crawlable menu.

### Visit / contact

Show the canonical address, hours and phone directly in visible HTML.

## Menu v1

The full active menu should be represented as visible, crawlable HTML.

Required behavior:

- category headings
- item names
- descriptions where available
- size/weight where applicable
- MUR prices
- approved notes
- mobile-friendly scanning
- no requirement to interact with chat to discover menu items

The reconciled Google Sheet remains the owner-friendly authoring source. For this first code packet, a controlled fixture/snapshot is acceptable if a live importer would introduce unnecessary runtime coupling or protected-access work.

## Customer journey rules

### Booking

Allowed:

- Phone
- Existing website chat

The current chat remains protected. This packet may bridge to it, but must not alter its prompts, language behavior, providers, escalation or message delivery.

### Takeaway

Allowed:

- WhatsApp
- Phone

Explicitly prohibited in this packet:

- takeaway through website chat

The UI must not imply that the same chatbot flow handles ordering unless that operating model is separately approved later.

## SEO / AI discoverability

Required:

- server-rendered or equivalently crawlable critical content
- clean semantic headings
- unique page titles and meta descriptions
- canonical URLs
- sitemap support
- robots support
- Restaurant JSON-LD using verified facts only
- visible phone/address/hours/menu content
- descriptive image alt text
- no critical business information available only in client-side chat or images

## Mobile requirements

The mobile surface is the primary design constraint.

- persistent, understandable actions for menu / booking / takeaway where appropriate
- readable menu typography
- no horizontal overflow
- tap targets large enough for restaurant-use conditions
- fast path from landing page to menu and WhatsApp takeaway
- phone numbers actionable with `tel:`
- WhatsApp action should use the canonical number

## Chatbot boundary

Treat the existing chatbot as a protected external dependency.

Create a clear integration boundary in the build. If embedding is unsafe or unavailable on the preview environment, use a temporary explicit bridge/link and record that limitation.

Do not:

- edit chatbot prompts
- change languages
- change WhatsApp provider or number
- change order/kitchen routing
- change human escalation
- export/migrate conversation history

## External entity cleanup backlog

After the website facts are locked, prepare a separate owner-facing cleanup list for third-party listings that disagree with the website on address or hours.

This is not a blocker for the first preview.

## Acceptance checklist

The first preview is ready for owner review when:

- [ ] tenant/test surface resolves to `cafe-international`
- [ ] homepage renders on desktop/mobile
- [ ] menu renders as crawlable content
- [ ] canonical address/hours/phone are shown
- [ ] booking routes to Phone + Chat
- [ ] takeaway routes to WhatsApp + Phone
- [ ] takeaway does not route through Chat
- [ ] chatbot behavior has not changed
- [ ] SEO metadata/schema are present
- [ ] basic accessibility/performance checks have evidence
- [ ] screenshot evidence exists
- [ ] preview URL and commit SHA are recorded
- [ ] no production-domain or DNS change occurred

## Protected actions

Separate approval/execution remains required for:

- live tenant/bootstrap Postgres write
- billing-exempt production data write
- Vercel/domain activation if wildcard routing does not already cover the preview hostname
- production deploy where applicable
- `cafeinternational.net` cutover
- chatbot or WhatsApp logic changes

## Next implementation step

Use this specification and the client-truth fixture to implement the first tenant preview under #797. Open the implementation as a draft PR and report one exact blocker only if the preview cannot be made reviewable.
