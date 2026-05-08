/**
 * Phase 4C.1 helpers — operator media review for Lux client request attachments.
 *
 * Scope (intentional, narrow):
 * - Attachments are stored in `cmp_ticket_attachments` (binary bytes, ticket-scoped).
 * - Per-attachment review metadata (intended_use, notes, media_type, review_status, …)
 *   lives in `cmp_tickets.console_json.lux_request_meta.attachments[]` so it travels with
 *   the Lux request ticket and stays operator-only (never surfaced on the public site).
 *
 * NOT in scope here:
 * - Publishing approved media to the public Lux site.
 * - Building galleries, CDNs, or AI/automation around media.
 * - Any cross-tenant attachment surface.
 *
 * Tenancy: every helper assumes the caller has already enforced
 * `tenantId === 'luxe-maurice'` and Lux-host context. Helpers do not re-derive tenancy.
 */

export const LUX_ATTACHMENT_REVIEW_STATUSES = Object.freeze([
  'pending_review',
  'reviewed',
  'rejected',
]);

export const LUX_ATTACHMENT_DEFAULT_REVIEW_STATUS = 'pending_review';

export const LUX_ATTACHMENT_INTENDED_USES = Object.freeze([
  'property_hero',
  'property_gallery',
  'request_supporting',
  'reference_material',
  'other',
]);

const REVIEW_NOTE_MAX_LEN = 1000;
const FILE_NAME_MAX_LEN = 240;
const NOTES_MAX_LEN = 1000;

/**
 * @param {unknown} raw
 * @returns {string | null}
 */
export function normalizeAttachmentReviewStatus(raw) {
  const v = raw != null ? String(raw).trim().toLowerCase() : '';
  if (!v) return null;
  return LUX_ATTACHMENT_REVIEW_STATUSES.includes(v) ? v : null;
}

/**
 * @param {unknown} raw
 * @returns {string | null}
 */
export function normalizeAttachmentIntendedUse(raw) {
  const v = raw != null ? String(raw).trim().toLowerCase().replace(/[\s-]+/g, '_') : '';
  if (!v) return null;
  return LUX_ATTACHMENT_INTENDED_USES.includes(v) ? v : null;
}

/**
 * @param {unknown} raw
 * @returns {string | null}
 */
export function normalizeAttachmentNotes(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  return s.slice(0, NOTES_MAX_LEN);
}

/**
 * @param {unknown} raw
 * @returns {string | null}
 */
export function normalizeReviewNote(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  return s.slice(0, REVIEW_NOTE_MAX_LEN);
}

/**
 * Coarse media type bucket derived from the upload `Content-Type`.
 * Operator UI shows this so reviewers can spot images vs videos vs documents at a glance
 * without trusting the raw mime string.
 *
 * @param {unknown} contentType
 * @returns {'image' | 'video' | 'audio' | 'document' | 'other'}
 */
export function deriveMediaType(contentType) {
  const ct = contentType != null ? String(contentType).trim().toLowerCase() : '';
  if (!ct) return 'other';
  if (ct.startsWith('image/')) return 'image';
  if (ct.startsWith('video/')) return 'video';
  if (ct.startsWith('audio/')) return 'audio';
  if (ct === 'application/pdf') return 'document';
  return 'other';
}

/**
 * Build a fresh `lux_request_meta.attachments[]` entry from upload inputs.
 * The entry is an operator-only metadata record; raw bytes never live here.
 *
 * @param {{
 *   attachment_id: string,
 *   file_name?: string | null,
 *   content_type?: string | null,
 *   byte_size?: number | null,
 *   intended_use?: string | null,
 *   notes?: string | null,
 *   created_at?: string | null,
 *   created_by?: string | null,
 * }} args
 * @returns {object}
 */
export function buildLuxAttachmentEntry(args) {
  const a = args && typeof args === 'object' ? args : {};
  const id = a.attachment_id != null ? String(a.attachment_id).trim() : '';
  if (!id) throw new Error('buildLuxAttachmentEntry: attachment_id required');
  const fileName =
    a.file_name != null && String(a.file_name).trim()
      ? String(a.file_name).trim().slice(0, FILE_NAME_MAX_LEN)
      : 'upload.bin';
  const contentType =
    a.content_type != null && String(a.content_type).trim()
      ? String(a.content_type).trim().slice(0, 160)
      : 'application/octet-stream';
  const byteSize = Number.isFinite(Number(a.byte_size)) ? Math.max(0, Math.trunc(Number(a.byte_size))) : 0;
  const intendedUse = normalizeAttachmentIntendedUse(a.intended_use);
  const notes = normalizeAttachmentNotes(a.notes);
  const createdAt =
    a.created_at != null && String(a.created_at).trim()
      ? String(a.created_at).trim()
      : new Date().toISOString();
  const createdBy = a.created_by != null && String(a.created_by).trim() ? String(a.created_by).trim() : null;

  return {
    attachment_id: id,
    file_name: fileName,
    content_type: contentType,
    byte_size: byteSize,
    media_type: deriveMediaType(contentType),
    intended_use: intendedUse,
    notes,
    review_status: LUX_ATTACHMENT_DEFAULT_REVIEW_STATUS,
    review_note: null,
    reviewed_at: null,
    reviewed_by: null,
    created_at: createdAt,
    created_by: createdBy,
  };
}

/**
 * @param {unknown} consoleJson
 * @returns {object}
 */
function cloneConsoleJson(consoleJson) {
  const cj = consoleJson && typeof consoleJson === 'object' && !Array.isArray(consoleJson) ? consoleJson : {};
  // Shallow-clone the levels we mutate; deeper structures are preserved by reference (Prisma writes JSON whole).
  const next = { ...cj };
  const meta = next.lux_request_meta && typeof next.lux_request_meta === 'object' && !Array.isArray(next.lux_request_meta)
    ? { ...next.lux_request_meta }
    : {};
  const list = Array.isArray(meta.attachments) ? meta.attachments.slice() : [];
  meta.attachments = list;
  next.lux_request_meta = meta;
  return next;
}

/**
 * Append (or upsert by attachment_id) an entry to `lux_request_meta.attachments[]`.
 * Returns the new console_json (immutable update).
 *
 * @param {unknown} consoleJson
 * @param {object} entry — output of `buildLuxAttachmentEntry`
 * @returns {object}
 */
export function upsertLuxAttachmentEntry(consoleJson, entry) {
  if (!entry || typeof entry !== 'object' || !entry.attachment_id) {
    throw new Error('upsertLuxAttachmentEntry: entry.attachment_id required');
  }
  const next = cloneConsoleJson(consoleJson);
  const list = next.lux_request_meta.attachments;
  const id = String(entry.attachment_id);
  const idx = list.findIndex((x) => x && String(x.attachment_id || '') === id);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...entry };
  } else {
    list.push(entry);
  }
  return next;
}

/**
 * Apply an operator review decision to a single attachment entry.
 * Returns `{ ok, consoleJson?, entry?, error? }` so callers can detect "not found"
 * vs other failure modes without throwing inside request handlers.
 *
 * @param {unknown} consoleJson
 * @param {string} attachmentId
 * @param {{ review_status: string, review_note?: string | null, reviewed_by?: string | null, reviewed_at?: string | null }} review
 * @returns {{ ok: true, consoleJson: object, entry: object } | { ok: false, error: string }}
 */
export function applyLuxAttachmentReview(consoleJson, attachmentId, review) {
  const id = attachmentId != null ? String(attachmentId).trim() : '';
  if (!id) return { ok: false, error: 'ATTACHMENT_ID_REQUIRED' };
  const status = normalizeAttachmentReviewStatus(review?.review_status);
  if (!status) return { ok: false, error: 'INVALID_REVIEW_STATUS' };

  const next = cloneConsoleJson(consoleJson);
  const list = next.lux_request_meta.attachments;
  const idx = list.findIndex((x) => x && String(x.attachment_id || '') === id);
  if (idx < 0) return { ok: false, error: 'ATTACHMENT_NOT_TRACKED' };

  const reviewedAt =
    review?.reviewed_at != null && String(review.reviewed_at).trim()
      ? String(review.reviewed_at).trim()
      : new Date().toISOString();
  const reviewedBy = review?.reviewed_by != null && String(review.reviewed_by).trim()
    ? String(review.reviewed_by).trim().slice(0, 200)
    : null;
  const reviewNote = normalizeReviewNote(review?.review_note);

  const updated = {
    ...list[idx],
    review_status: status,
    review_note: reviewNote,
    reviewed_at: reviewedAt,
    reviewed_by: reviewedBy,
  };
  list[idx] = updated;
  return { ok: true, consoleJson: next, entry: updated };
}

/**
 * Append a concise operator-visible message to `console_json.messages[]` recording
 * a review-status change. Idempotency is best-effort: we de-duplicate on
 * (attachment_id, review_status, reviewed_at) to avoid double-writes.
 *
 * @param {unknown} consoleJson
 * @param {{ attachment_id: string, file_name?: string | null, review_status: string, review_note?: string | null, reviewed_by?: string | null, reviewed_at?: string | null }} args
 * @returns {object} new console_json
 */
export function appendLuxAttachmentReviewMessage(consoleJson, args) {
  const cj = consoleJson && typeof consoleJson === 'object' && !Array.isArray(consoleJson) ? { ...consoleJson } : {};
  const messages = Array.isArray(cj.messages) ? cj.messages.slice() : [];
  const at = args?.reviewed_at != null && String(args.reviewed_at).trim()
    ? String(args.reviewed_at).trim()
    : new Date().toISOString();
  const id = args?.attachment_id != null ? String(args.attachment_id).trim() : '';
  const status = normalizeAttachmentReviewStatus(args?.review_status) || 'pending_review';

  const dup = messages.some(
    (m) =>
      m &&
      m.kind === 'lux_attachment_review' &&
      String(m.attachment_id || '') === id &&
      String(m.review_status || '') === status &&
      String(m.at || '') === at,
  );
  if (dup) {
    cj.messages = messages;
    return cj;
  }

  messages.push({
    kind: 'lux_attachment_review',
    at,
    attachment_id: id,
    file_name: args?.file_name != null ? String(args.file_name).slice(0, FILE_NAME_MAX_LEN) : null,
    review_status: status,
    review_note: normalizeReviewNote(args?.review_note),
    reviewed_by: args?.reviewed_by != null ? String(args.reviewed_by).slice(0, 200) : null,
  });
  cj.messages = messages;
  return cj;
}

/**
 * Operator-safe attachment shape (no raw bytes, no internal storage paths).
 * Combines the `cmp_ticket_attachments` row with the `lux_request_meta.attachments[]`
 * metadata entry, falling back to safe defaults when meta is missing (e.g. legacy uploads).
 *
 * @param {{ id: string, file_name?: string | null, content_type?: string | null, byte_size?: number | null, created_at?: string | Date | null }} dbRow
 * @param {object | null} metaEntry
 * @returns {object}
 */
export function safeLuxAttachmentShape(dbRow, metaEntry) {
  const r = dbRow && typeof dbRow === 'object' ? dbRow : {};
  const m = metaEntry && typeof metaEntry === 'object' ? metaEntry : null;
  const id = r.id != null ? String(r.id) : (m && m.attachment_id != null ? String(m.attachment_id) : '');
  const fileName =
    (m && m.file_name != null && String(m.file_name)) ||
    (r.file_name != null ? String(r.file_name) : 'upload.bin');
  const contentType =
    (m && m.content_type != null && String(m.content_type)) ||
    (r.content_type != null ? String(r.content_type) : 'application/octet-stream');
  const byteSize = Number.isFinite(Number(r.byte_size))
    ? Math.max(0, Math.trunc(Number(r.byte_size)))
    : Number.isFinite(Number(m?.byte_size))
      ? Math.max(0, Math.trunc(Number(m.byte_size)))
      : 0;
  const createdAtRaw = r.created_at != null ? r.created_at : (m && m.created_at) || null;
  const createdAt =
    createdAtRaw instanceof Date ? createdAtRaw.toISOString() : createdAtRaw != null ? String(createdAtRaw) : null;

  return {
    attachment_id: id,
    file_name: fileName,
    content_type: contentType,
    byte_size: byteSize,
    media_type: m && m.media_type ? String(m.media_type) : deriveMediaType(contentType),
    intended_use: m && m.intended_use != null ? String(m.intended_use) : null,
    notes: m && m.notes != null ? String(m.notes) : null,
    review_status: m && m.review_status != null ? String(m.review_status) : LUX_ATTACHMENT_DEFAULT_REVIEW_STATUS,
    review_note: m && m.review_note != null ? String(m.review_note) : null,
    reviewed_at: m && m.reviewed_at != null ? String(m.reviewed_at) : null,
    reviewed_by: m && m.reviewed_by != null ? String(m.reviewed_by) : null,
    created_at: createdAt,
    download_url: id ? `/api/change-attachment/download?id=${encodeURIComponent(id)}` : null,
  };
}

/**
 * @param {unknown} consoleJson
 * @returns {object[]}
 */
export function readLuxAttachmentEntries(consoleJson) {
  const cj = consoleJson && typeof consoleJson === 'object' ? consoleJson : {};
  const meta = cj.lux_request_meta && typeof cj.lux_request_meta === 'object' ? cj.lux_request_meta : {};
  const list = Array.isArray(meta.attachments) ? meta.attachments : [];
  return list.filter((x) => x && typeof x === 'object' && x.attachment_id);
}
