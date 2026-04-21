/**
 * Loads ticket attachments and derives measurable image facts before refinement (GROQ / deterministic).
 * Ensures we never ask users for format/size when bytes are already in Postgres.
 */

import { probeImageDimensions } from './image-dimensions.js';

/**
 * @param {{ width: number, height: number }} dim
 * @param {number} byteSize
 * @returns {{ level: 'ok' | 'warn' | 'issue', label: string }}
 */
export function assessHeroBackgroundSuitability(dim, byteSize) {
  const { width, height } = dim;
  const px = width * height;
  if (width < 800 || height < 400) {
    return {
      level: 'issue',
      label:
        'Resolution is likely insufficient for a full-width hero/background — recommend a larger source image (e.g. width ≥ 1200px).',
    };
  }
  if (width >= 1920 && height >= 700) {
    return { level: 'ok', label: 'Resolution looks suitable for large hero / full-width background use.' };
  }
  if (width >= 1200 && height >= 500) {
    return {
      level: 'ok',
      label: 'Resolution should work for typical hero use; very large displays may want an even wider master.',
    };
  }
  if (px < 800 * 450) {
    return {
      level: 'warn',
      label: 'Resolution may be marginal for full-bleed backgrounds on wide screens.',
    };
  }
  if (byteSize > 2.5 * 1024 * 1024) {
    return { level: 'warn', label: 'File is large — consider optimizing for web (quality vs load time).' };
  }
  return { level: 'ok', label: 'Resolution is acceptable for common layouts.' };
}

/**
 * @param {string} q
 * @param {{ hasImageFacts: boolean }} ctx
 * @returns {boolean} true = drop this question (user already provided data we can measure)
 */
export function questionAsksDerivableAssetFact(q, ctx) {
  if (!ctx.hasImageFacts) return false;
  const s = String(q || '').toLowerCase();
  if (!s.trim()) return false;
  const patterns = [
    /format\b/,
    /file\s*format/,
    /\.(png|jpe?g|gif|webp)\b/,
    /\bdimensions?\b/,
    /\bresolution\b/,
    /\b(width|height)\b/,
    /\bsize\s+of\s+(the\s+)?(uploaded\s+)?image/,
    /\bhow\s+big\b/,
    /\bwhat\s+.*\b(format|dimensions?|resolution|size)\b/,
    /uploaded\s+image.*\?$/,
    /size\s+of\s+the\s+upload/,
  ];
  return patterns.some((re) => re.test(s));
}

/**
 * @param {import('@prisma/client').PrismaClient | null | undefined} prisma
 * @param {string | null | undefined} ticketId
 * @returns {Promise<{
 *   promptBlock: string;
 *   hasImageFacts: boolean;
 *   facts: Array<Record<string, unknown>>;
 * }>}
 */
/**
 * Preference / tradeoff questions only — not derivable from uploaded bytes.
 *
 * @param {string} description
 * @returns {string[]}
 */
export function pickNonDerivablePreferenceQuestions(description) {
  const d = String(description || '').toLowerCase();
  /** @type {string[]} */
  const out = [];
  if (/parallax|scroll[\s-]*linked|scroll\s*effect/.test(d)) {
    out.push('Should parallax or scroll-linked motion be enabled on mobile, or limited to desktop for performance?');
  }
  if (/full[\s-]?screen|full[\s-]?bleed|hero|background\s*image|background\s*photo/.test(d)) {
    out.push('Should the hero/background span the full viewport on small screens, or use a shorter crop?');
  }
  if (/replace|swap|new\s+image/.test(d) && /home|landing|lux|page/.test(d)) {
    out.push('Should this image apply only to the homepage hero, or other pages too?');
  }
  return [...new Set(out)].slice(0, 2);
}

/**
 * Remove LLM questions that duplicate facts we already measured on attachments.
 *
 * @param {Record<string, unknown>} value
 * @param {{ hasImageFacts: boolean, facts?: Array<Record<string, unknown>> }} assetCtx
 * @returns {Record<string, unknown>}
 */
export function applyAssetAwareSanitizer(value, assetCtx) {
  if (!value || !assetCtx?.hasImageFacts) return value;
  const orig = Array.isArray(value.missing_information) ? value.missing_information : [];
  const filtered = orig.filter((q) => !questionAsksDerivableAssetFact(String(q || ''), { hasImageFacts: true }));
  if (filtered.length === orig.length) return value;

  const hasIssue = Array.isArray(assetCtx.facts) && assetCtx.facts.some((f) => f && f.suitability === 'issue');

  let client = String(value.client_safe_response || '').trim();
  if (filtered.length === 0) {
    if (hasIssue) {
      client =
        'We measured your uploaded image(s) in the system. At least one file looks under-sized for a full-width hero or background — please upload a higher-resolution source, or confirm you want a smaller non-full-bleed layout.';
    } else {
      client =
        'We measured your uploaded image(s): format, pixel dimensions, and file size are already on file — no need to repeat them. The source looks workable for a typical web hero or background. Run Estimate when you are ready, or add any design preferences in chat.';
    }
    return {
      ...value,
      missing_information: [],
      confidence: hasIssue ? 'medium' : 'high',
      client_safe_response: client,
    };
  }

  return {
    ...value,
    missing_information: filtered,
    client_safe_response: client,
  };
}

/**
 * @param {import('@prisma/client').PrismaClient | null | undefined} prisma
 * @param {string | null | undefined} ticketId
 * @returns {Promise<{
 *   promptBlock: string;
 *   hasImageFacts: boolean;
 *   facts: Array<Record<string, unknown>>;
 * }>}
 */
export async function loadRefinementAssetContext(prisma, ticketId) {
  const tid = String(ticketId || '').trim();
  if (!prisma || !tid) {
    return { promptBlock: '', hasImageFacts: false, facts: [] };
  }

  try {
    const rows = await prisma.cmpTicketAttachment.findMany({
      where: { ticketId: tid },
      select: {
        fileName: true,
        contentType: true,
        byteSize: true,
        data: true,
        provider: true,
        secureUrl: true,
        imageWidth: true,
        imageHeight: true,
      },
      take: 16,
      orderBy: { createdAt: 'asc' },
    });

    /** @type {Array<Record<string, unknown>>} */
    const facts = [];
    /** @type {string[]} */
    const lines = [];

    for (const r of rows) {
      const ct = String(r.contentType || '').toLowerCase();
      if (!ct.startsWith('image/')) continue;
      /** @type {{ width: number, height: number } | null} */
      let dim = null;
      if (r.provider === 'cloudinary' && r.imageWidth != null && r.imageHeight != null) {
        dim = {
          width: Number(r.imageWidth),
          height: Number(r.imageHeight),
          format: ct.replace(/^image\//, '') || 'jpeg',
        };
      } else if (r.data != null) {
        const buf = Buffer.isBuffer(r.data) ? r.data : Buffer.from(r.data);
        if (!buf.length) continue;
        dim = probeImageDimensions(buf);
      } else {
        continue;
      }
      const kb = (Number(r.byteSize) || 0) / 1024;
      const byteLen = Number(r.byteSize) || 0;
      if (dim) {
        const suit = assessHeroBackgroundSuitability(dim, byteLen || 1);
        facts.push({
          file_name: r.fileName,
          content_type: r.contentType,
          byte_size: byteLen,
          width: dim.width,
          height: dim.height,
          format: dim.format,
          suitability: suit.level,
          suitability_detail: suit.label,
        });
        lines.push(
          `- ${r.fileName}: measured ${dim.format.toUpperCase()}, ${dim.width}×${dim.height}px, ${kb.toFixed(1)} KB. ${suit.label}`,
        );
      } else {
        facts.push({
          file_name: r.fileName,
          content_type: r.contentType,
          byte_size: byteLen,
          width: null,
          height: null,
          format: null,
          suitability: 'unknown',
          suitability_detail: 'Could not decode pixel dimensions from bytes; do not ask for format/size if the file is already attached.',
        });
        lines.push(
          `- ${r.fileName}: stored image (${kb.toFixed(1)} KB, ${r.contentType}); dimensions not decoded — do not ask for file format or byte size.`,
        );
      }
    }

    if (!lines.length) {
      return { promptBlock: '', hasImageFacts: false, facts: [] };
    }

    const promptBlock = [
      'KNOWN MEASURED ASSETS (authoritative — do NOT ask the user to state file format, pixel dimensions, or file size for these files):',
      ...lines,
      'Use this block to say whether the image is suitable, or flag a real issue. Only ask questions about preferences or tradeoffs the user must decide (e.g. parallax on mobile), not facts you can read above.',
    ].join('\n');

    return { promptBlock, hasImageFacts: true, facts };
  } catch {
    return { promptBlock: '', hasImageFacts: false, facts: [] };
  }
}
