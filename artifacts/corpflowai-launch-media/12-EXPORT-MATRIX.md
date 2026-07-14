# Export Matrix — Launch Media Kit

**Status:** Draft · **NO PUBLISH AUTHORIZED**

Single reference for HeyGen renders, Canva exports, and platform delivery specs.

---

## Video masters (HeyGen)

| Format | Dimensions | Aspect | Codec | FPS | Audio | Use |
|--------|------------|--------|-------|-----|-------|-----|
| Master 16:9 | 1920 × 1080 | 16:9 | H.264 High | 30 | AAC 48 kHz stereo | YouTube, LinkedIn feed, site embed |
| Vertical 9:16 | 1080 × 1920 | 9:16 | H.264 High | 30 | AAC 48 kHz stereo | Reels, Shorts, TikTok, Stories |
| Square 1:1 | 1080 × 1080 | 1:1 | H.264 High | 30 | AAC 48 kHz stereo | LinkedIn feed, IG feed (optional) |

### HeyGen export settings

- Bitrate: 8–12 Mbps (16:9) · 6–8 Mbps (9:16)  
- Colour space: sRGB  
- Include burned-in captions only if platform requires; prefer sidecar SRT where supported  
- End-card: 3s hold on CTA URL (no audio fade before CTA readable)

---

## Derivative cuts

| Source | Derivative | Method |
|--------|------------|--------|
| V01–V07 master 16:9 | 9:16 short | Reframe per production sheet safe zones |
| V02–V04 offer videos | S02–S04 shorts | Tighten script or use dedicated short script |
| Any 16:9 | 1:1 | Centre crop avatar; stack UI below if split-screen |

---

## Static graphics (Canva)

| Asset class | Primary size | Alt sizes | Format | Max file size |
|-------------|--------------|-----------|--------|---------------|
| LinkedIn banner (C01) | 1584 × 396 | — | PNG | 4 MB |
| Facebook cover (C02) | 1640 × 856 | — | PNG | 100 KB target |
| YouTube banner (C03) | 2560 × 1440 | — | PNG | 6 MB |
| IG profile (C04) | 320 × 320 | — | PNG | 1 MB |
| Offer cards (C05) | 1080 × 1080 | 1080 × 1920 story | PNG | 2 MB |
| Carousel slides (C06) | 1080 × 1080 | — | PNG | 2 MB each |
| Quote cards (C07) | 1080 × 1080 | 1080 × 1920 | PNG | 2 MB |
| Article covers (C08) | 1200 × 630 | 1920 × 1080 | PNG | 2 MB |
| Vertical covers (C09) | 1080 × 1920 | — | PNG | 2 MB |
| Launch announcement (C10) | 1080 × 1080 | 1200 × 630 | PNG | 2 MB |
| Process infographic (C11) | 1080 × 1350 | 1920 × 1080 | PNG / PDF | 4 MB |
| Three-sprint comparison (C12) | 1920 × 1080 | 1080 × 1920 | PNG | 4 MB |

### Canva brand kit import

| Token | Hex |
|-------|-----|
| Accent teal | `#2dd4bf` |
| Dark background | `#06111f` |
| Primary text | `#eef6ff` |
| Link accent | `#7dd3fc` |
| Font | Inter (Bold 700, Regular 400) |

---

## Thumbnails (11-THUMBNAILS-AND-COVERS)

| Spec | Dimensions | Format |
|------|------------|--------|
| YouTube thumbnail | 1280 × 720 | PNG · sRGB · &lt; 2 MB |
| Social square thumb | 1080 × 1080 | PNG |
| Vertical thumb / cover | 1080 × 1920 | PNG |

---

## Caption / subtitle files

| Deliverable | Format | Naming |
|-------------|--------|--------|
| Full captions | SRT | `{asset-id}-en.srt` |
| Platform-native | VTT optional | `{asset-id}-en.vtt` |

Language: English (Mauritius market). Spell out "Mauritian rupees" in long-form; "MUR" acceptable in captions.

---

## File naming convention

```text
{asset-id}-{slug}-{aspect}.{ext}

Examples:
v01-flagship-16x9.mp4
v02-lead-rescue-9x16.mp4
s03-landing-page-9x16.mp4
c05a-lead-rescue-offer-card-1x1.png
t02-ai-lead-rescue-16x9.png
```

---

## Storage (operator — not in git)

Rendered masters live in operator vault or cloud drive. This repo holds specs and scripts only.

---

## Quality checks before handoff

- [ ] Correct aspect ratio per platform row  
- [ ] Safe zones respected (avatar face, CTA text)  
- [ ] Brand colours match `#2dd4bf` / `#06111f`  
- [ ] No bank details or secrets in any export  
- [ ] Synthetic UI labelled in video if shown  
- [ ] CTA URLs match `01-BRAND-AND-MESSAGE-GUIDE.md`
