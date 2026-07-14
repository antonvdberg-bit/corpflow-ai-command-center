# Voice and Delivery Guide

**Status:** Draft — pending Anton gate **A2**

---

## Voice profile

| Attribute | Target |
|-----------|--------|
| Gender | Match avatar or Anton preference |
| Accent | Neutral international English (Mauritius market + export-ready) |
| Pace | **140 words per minute** (calm, not rushed) |
| Pitch | Mid range; avoid announcer boom |
| Energy | Steady confidence; rises slightly on outcome lines, drops on CTA |
| Pauses | 0.5s after problem statement; 0.8s before CTA |

---

## Delivery rules

1. **Problem first** — slight weight on pain words (losing, fragmented, invisible).  
2. **Outcome second** — lighter, forward tone.  
3. **Price** — matter-of-fact; never apologetic.  
4. **CTA** — single beat slower; clear articulation of URL path.  
5. **No upspeak** on statements.

---

## HeyGen voice selection

| Priority | Voice type |
|----------|------------|
| 1 | Custom voice clone from Anton 60s sample (with consent) |
| 2 | HeyGen "Professional Male — Matthew" or equivalent |
| 3 | HeyGen "Professional Female — Sara" if avatar female |

**Stability:** Use one voice ID across all launch assets.

---

## Pronunciation (TTS flags)

Add SSML or HeyGen pronunciation entries:

```
CorpFlowAI → Corp-Flow A-I
MUR → M-U-R (or "Mauritian rupees")
Mauritius → maw-RISH-us
WhatsApp → Whats-App
```

---

## Emphasis map (apply per script)

| Phrase type | Delivery |
|-------------|----------|
| "stop losing" | Slight pause before |
| "24 to 72 hours" | Digit clarity |
| "50% deposit" | Even stress both words |
| "discovery call" | Warm, inviting |
| Offer names | Full title once; shorten in repeats |

---

## Audio mix spec

| Layer | Level |
|-------|-------|
| Voice | -3 dBFS peak |
| Music bed | -18 to -22 dB under voice |
| SFX (whoosh) | -12 dB max, sparse |

**Music:** Ambient corporate minimal; no EDM drops. Royalty-free library only.

---

## Caption style (burn-in + SRT)

| Property | Value |
|----------|-------|
| Font | Inter SemiBold |
| Size | 42px @ 1080p (scale for 9:16) |
| Color | `#eef6ff` |
| Highlight | `#2dd4bf` on key outcome words |
| Background | `rgba(6, 17, 31, 0.75)` pill |
| Position | Bottom center; max 2 lines |
| Max chars/line | 42 |

---

## Fallback if A2 delayed

Use HeyGen default professional English voice at 140 wpm. Mark `NEEDS_ANTON` in render log; re-export when voice approved.
