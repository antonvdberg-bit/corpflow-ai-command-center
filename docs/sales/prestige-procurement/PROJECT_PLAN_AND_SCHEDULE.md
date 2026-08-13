# Prestige Procurement — project plan and schedule baseline

**Status:** Client-presentable WBS for #919. Duration **ranges** only. No committed calendar dates until Prestige agrees scope.
**Anchor sentinel:** `<!-- PRESTIGE_PROCUREMENT_PROJECT_PLAN_V1 -->`

<!-- PRESTIGE_PROCUREMENT_PROJECT_PLAN_V1 -->

**Baseline (recommended WordPress path, eight-page base):** **8–12 weeks** after mobilisation payment is verified and required inputs have arrived.

Owners: **CorpFlowAI** · **Prestige** · **third party** (host/registrar/photographer).

Payment-milestone suitability uses the five-gate model in [PRICING_PACKET.md](./PRICING_PACKET.md): mobilisation, design approval, build, pre-launch, handover.

---

## Phase 1 — Discovery & confirmation

| Field | Content |
|-------|---------|
| **Deliverables** | Confirmed sitemap; named approver; brand/asset checklist; hosting preference; written scope lock |
| **Owner** | CorpFlowAI leads; Prestige confirms |
| **Dependencies** | Signed quotation + mobilisation payment verified |
| **Estimate** | 8–16 hours over 1 week |
| **Review gate** | Prestige signs the scope matrix (REQUIRED vs OPTIONAL locked) |
| **Payment** | **Mobilisation 20%** — work does not start before cleared funds |
| **Risks** | Missing approver; no brand files; catalogue vs brochure still undecided |

## Phase 2 — Information architecture / content plan

| Field | Content |
|-------|---------|
| **Deliverables** | Sitemap; page outlines; content inventory (what Prestige must write vs what we structure); redirect list if replacing a site |
| **Owner** | CorpFlowAI; Prestige supplies facts, services, proof points |
| **Dependencies** | Phase 1 scope lock |
| **Estimate** | 12–20 hours over 1–2 weeks (can overlap late discovery) |
| **Review gate** | Prestige approves sitemap and which pages exist |
| **Payment** | Not a separate invoice — covered by mobilisation |
| **Risks** | Prestige delays copy; hidden extra pages appear |

## Phase 3 — UX/UI design

| Field | Content |
|-------|---------|
| **Deliverables** | Desktop + mobile design for Home + one inner template + key components (header, proof, form, footer). Remaining pages follow the system. |
| **Owner** | CorpFlowAI |
| **Dependencies** | Brand files or agreed palette; sitemap |
| **Estimate** | 24–40 hours over 2–3 weeks |
| **Review gate** | **Design approval** (one consolidated written round, then a polish round) |
| **Payment** | **Design approval 20%** due when Prestige accepts the design |
| **Risks** | Design-by-committee; unlimited look-and-feel churn — cap at two rounds |

## Phase 4 — Technical setup / CMS foundation

| Field | Content |
|-------|---------|
| **Deliverables** | Hosting account in Prestige’s name (they pay); WordPress installed; SSL; staging URL; roles; backup job created |
| **Owner** | CorpFlowAI sets up; Prestige creates/pays the host account; registrar stays with Prestige |
| **Dependencies** | Hosting choice; Prestige billing details on the host |
| **Estimate** | 12–20 hours over 1 week |
| **Review gate** | Staging loads on HTTPS; backup job visible to Prestige admin |
| **Payment** | Not billed separately — part of build milestone |
| **Risks** | Prestige delays host signup; CorpFlowAI must not pay the host “to save time” |

## Phase 5 — Page / template implementation

| Field | Content |
|-------|---------|
| **Deliverables** | Custom theme; eight agreed pages as templates; reusable blocks; mobile QA |
| **Owner** | CorpFlowAI |
| **Dependencies** | Approved design; staging CMS |
| **Estimate** | 32–48 hours over 2–3 weeks |
| **Review gate** | Staging walkthrough against sitemap |
| **Payment** | Combined with Phase 6 into **Build 25%** |
| **Risks** | Extra page types; catalogue scope creep |

## Phase 6 — Self-management features

| Field | Content |
|-------|---------|
| **Deliverables** | Editor vs Admin roles; forms + email to Prestige; SEO fields; media library rules; approved-plugin list only |
| **Owner** | CorpFlowAI; Prestige confirms the enquiry mailbox |
| **Dependencies** | Staging site; Prestige mailbox |
| **Estimate** | 16–24 hours over 1 week |
| **Review gate** | A Prestige editor can create a draft page and submit a test enquiry |
| **Payment** | **Build 25%** — due when staging templates + self-management are demonstrable |
| **Risks** | Wrong mailbox; Prestige wants a CRM that was not sold |

## Phase 7 — Content migration / population

| Field | Content |
|-------|---------|
| **Deliverables** | Agreed pages populated from Prestige copy/images; placeholders clearly marked if copy is late |
| **Owner** | Prestige supplies; CorpFlowAI places and formats |
| **Dependencies** | Templates ready; content inventory from Phase 2 |
| **Estimate** | 12–24 hours over 1–2 weeks |
| **Review gate** | Prestige confirms facts (phone, address, services) are correct |
| **Payment** | Not a separate invoice |
| **Risks** | Late copy is the usual schedule killer — clock pauses if required inputs are missing |

## Phase 8 — QA / security / performance / accessibility

| Field | Content |
|-------|---------|
| **Deliverables** | Link/form test; mobile + desktop pass; basic a11y (headings, contrast, alt text); backup restore rehearsal; no mixed-content/SSL issues |
| **Owner** | CorpFlowAI |
| **Dependencies** | Content substantially in |
| **Estimate** | 12–20 hours over 1 week |
| **Review gate** | Internal QA checklist signed before client review |
| **Payment** | Feeds **pre-launch 20%** |
| **Risks** | Huge uncompressed images from Prestige; third-party embeds |

## Phase 9 — Client review & revisions

| Field | Content |
|-------|---------|
| **Deliverables** | Two structured written rounds (already partly used at design; remaining for pre-launch content/UI) |
| **Owner** | Prestige writes one batch; CorpFlowAI applies |
| **Dependencies** | QA complete |
| **Estimate** | 12–20 hours over 1–2 weeks |
| **Review gate** | Written “proceed to launch” from the named approver |
| **Payment** | **Pre-launch 20%** due on written proceed-to-launch |
| **Risks** | Feedback via scattered WhatsApp instead of one batch |

## Phase 10 — Hosting deployment / cutover

| Field | Content |
|-------|---------|
| **Deliverables** | DNS/SSL cutover plan; go-live on Prestige’s domain; Search Console + analytics in **Prestige’s** accounts |
| **Owner** | CorpFlowAI executes the plan; Prestige (or their IT) approves DNS changes |
| **Dependencies** | Pre-launch sign-off; domain access |
| **Estimate** | 8–16 hours, including a low-traffic cutover window |
| **Review gate** | Live URL loads; form test on the real domain |
| **Payment** | Remaining work sits in handover |
| **Risks** | DNS TTL; old site still cached; this is **not** a CorpFlowAI-owned domain |

## Phase 11 — Training / documentation / handover

| Field | Content |
|-------|---------|
| **Deliverables** | 90-minute recorded training; editor guide; export/backup pack; CorpFlowAI admin removed after warranty start |
| **Owner** | CorpFlowAI trains; Prestige attends |
| **Dependencies** | Live (or final staging if they delay DNS) |
| **Estimate** | 12–20 hours |
| **Review gate** | Prestige editor completes the independence test (publish a change; download a backup) |
| **Payment** | Combined with closeout |
| **Risks** | Wrong people attend; credentials shared in chat |

## Phase 12 — Acceptance / warranty closeout

| Field | Content |
|-------|---------|
| **Deliverables** | Written acceptance; 30-day defect warranty clock; closeout note |
| **Owner** | Both |
| **Dependencies** | Handover complete |
| **Estimate** | 4–8 hours plus on-demand warranty fixes |
| **Review gate** | Signed acceptance |
| **Payment** | **Handover 15%** due on written acceptance (warranty is included, not a sixth invoice) |
| **Risks** | New-feature requests labelled as “bugs” |

---

## Dependency picture

```text
Mobilisation payment
  → Discovery lock
    → IA / content plan
      → Design ──→ Design-approval payment
        → Hosting in Prestige’s name + CMS foundation
          → Templates + self-management ──→ Build payment
            → Content in
              → QA
                → Client review ──→ Pre-launch payment
                  → Cutover (Prestige DNS)
                    → Training + independence test
                      → Acceptance ──→ Handover payment
                        → 30-day warranty
```

Content from Prestige is the critical path. If copy or brand files are late, later dates move by the same amount. That is the honest schedule rule to say in the meeting.

## Parallelism (how we keep it inside 8–12 weeks)

- Hosting signup (Prestige) can start as soon as discovery ends — do not wait for final design.
- Content writing (Prestige) should start during design, not after QA.
- Analytics/Search Console accounts can be created by Prestige during build.

## What we will not put on a slide as a promise

- A go-live calendar date before scope lock + mobilisation.
- “We’ll handle hosting forever.”
- “Google will rank you.”
- Unlimited revision cycles.
