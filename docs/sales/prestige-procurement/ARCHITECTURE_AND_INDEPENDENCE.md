# Prestige Procurement — technical solution and independence test

**Status:** Architecture recommendation for #919. No install, no hosting purchase, no DNS.
**Anchor sentinel:** `<!-- PRESTIGE_PROCUREMENT_ARCHITECTURE_V1 -->`

<!-- PRESTIGE_PROCUREMENT_ARCHITECTURE_V1 -->

## Goal

The smallest **maintainable** solution that lets Prestige operate the site **without a recurring CorpFlowAI dependency**.

A CorpFlowAI-hosted tenant site, a custom CMS, or a Next.js app that only CorpFlowAI can deploy would fail this test even if it looked better in a demo.

---

## Options compared

### 1. Maintained CMS — self-hosted WordPress (recommended)

**What it is:** WordPress on a host **Prestige owns and pays for**. Custom design applied as a child theme / block theme. Prestige editors use the normal WordPress admin.

| Fit | Assessment |
|-----|------------|
| Self-management | Strong — page, media, forms, SEO plugins are ordinary WordPress skills |
| Independent hosting | Strong — move to another WordPress host with a standard backup |
| Custom design | Strong enough — custom theme, not a “cheap template” look |
| Catalogue later | Practical — WooCommerce only if they later buy that scope |
| CorpFlowAI residual dependency | None after warranty, if admin access is removed |
| Risk | Plugin sprawl if we over-install; mitigated by a short approved-plugin list |

**When this is wrong:** Prestige refuses WordPress in writing, or they need a custom application (quoting engine, stock system). Neither is in the current brief.

### 2. Custom frontend + maintained headless CMS (justified only if WordPress is rejected)

**What it is:** e.g. Next.js or Astro frontend + Sanity / Payload CMS. CorpFlowAI would still have to hand over a deploy pipeline.

| Fit | Assessment |
|-----|------------|
| Self-management | Weaker for a non-technical editor unless the CMS is carefully limited |
| Independent hosting | Weaker — frontend + CMS + build pipeline is three moving parts |
| Custom design | Strong |
| Residual dependency | High unless Prestige has a developer |
| Cost | Higher than WordPress for the same brochure/catalogue outcome |

**Do not choose this** unless Prestige has an in-house developer and rejects WordPress. Avoid building a custom CMS.

### 3. Self-hosted / open-source alternatives

| Platform | Practical? | Note |
|----------|------------|------|
| **Ghost** | No for this brief | Excellent publishing; weak services/catalogue/admin roles for a procurement site |
| **Strapi + custom front** | No as default | Same headless complexity as option 2 |
| **Webflow** | Possible leaner design path | Excellent editor and design control; **hosting is Webflow’s**. Export exists but is not a clean “take it to any host” story. Conflicts with “independent hosting” unless Prestige accepts Webflow as their host. |
| **Framer / Squarespace / Wix** | Possible for a tiny brochure | Weaker custom design + weaker export/portability. Not recommended for a named custom-design + independence brief. |

### 4. CorpFlowAI Command Center tenant site — rejected for live handover

Lux / CIPC-style CorpFlowAI-hosted surfaces are **`corpflow_test` factory/tenant tools**. Using them as Prestige’s public production site would:

- keep hosting and runtime with CorpFlowAI;
- contradict “no recurring CorpFlowAI fee” and “operate independently”;
- confuse environment classification (`corpflow_test` vs a client-owned site).

A CorpFlowAI preview during build is optional internal sandboxing only. **The live site must not be `*.corpflowai.com`.**

---

## Recommendation

**Primary path:** self-hosted **WordPress**, custom-designed block/child theme, short plugin list, hosting account in Prestige’s name.

**Fallback if Prestige wants a hosted designer tool and accepts vendor hosting:** **Webflow** on a Prestige-owned Webflow plan. Treat this as a commercial fork (see pricing Option C), not the default.

**Do not build a custom CMS.** Maintained products meet the brief.

### Approved-plugin list (WordPress path — keep short)

| Need | Maintained product class (example) | Rule |
|------|-------------------------------------|------|
| Forms | One form plugin | No second form plugin |
| SEO | One SEO plugin | |
| Backups | Host backups + one backup plugin | Restore tested once |
| Spam | Host/firewall or Akismet-class | |
| Image compression | One optimiser or host-level | |
| Security basics | Limit-login + host firewall | No “security suite” kitchen sink |
| Catalogue | None in base | WooCommerce only if OPTIONAL catalogue is sold |

No page-builder stack (Elementor + 20 add-ons) unless Anton explicitly accepts the maintenance cost. Default is the block editor + the custom theme.

---

## Independence proof (required)

The job is not done until all of the following are true. This is the handover test, not a slogan.

| Proof | How we show it |
|-------|----------------|
| Prestige owns or controls hosting/account after handover | Hosting invoice and DNS are in Prestige’s name. CorpFlowAI is not the account owner. |
| Prestige can update normal content without CorpFlowAI | Recorded training + editor guide + a Prestige editor publishes a test change on staging/live. |
| Prestige can manage agreed business data without code edits | Services/pages/media/forms are CMS fields, not hardcoded. |
| Backup/export path exists | Backup plugin/host job visible in their admin; one restore rehearsal; zip + database export at handover. |
| Source/assets/admin credentials handed over on an approved secure channel | Password manager share or in-person; **never** GitHub, chat logs, or this repo. |
| No hidden CorpFlowAI runtime dependency | No CorpFlowAI APIs, no CorpFlowAI tenant CMS, no CorpFlowAI-billed host, no required CorpFlowAI plugin. Analytics and email are Prestige’s accounts. |

If any row fails, the site is **not** independent, even if it looks finished.

---

## Hosting (client-paid — not in the CorpFlowAI fee)

Prestige chooses and pays. CorpFlowAI advises and sets up once.

| Class | Typical fit | Typical monthly (indicative, not quoted) |
|-------|-------------|------------------------------------------|
| Managed WordPress (SiteGround / similar) | Simplest for a non-technical admin | MUR ~400–1,200 |
| Cloudways / equivalent VPS panel | More control, still click-operated | MUR ~800–2,500 |
| Raw VPS with only SSH | Reject unless Prestige has a sysadmin | — |
| Webflow site plan | Only if Option C is chosen | Per Webflow’s then-current plan (Prestige’s card) |

CorpFlowAI does **not** commit to a host in this packet. Final host is agreed with Prestige. No paid purchase is authorised here.

---

## What CorpFlowAI still does (one-off, then leaves)

1. Discovery, IA, custom design.
2. WordPress install on Prestige’s host.
3. Theme, templates, forms, SEO, backups, roles.
4. Content population from Prestige inputs.
5. QA, training, handover, 30-day defect warranty.

After warranty, Prestige’s team (or a future supplier they choose) maintains the site. That is the point of the commercial model.
