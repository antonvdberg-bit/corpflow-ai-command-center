import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import {
  LUX_ATTACHMENT_DEFAULT_REVIEW_STATUS,
  LUX_ATTACHMENT_INTENDED_USES,
  LUX_ATTACHMENT_REVIEW_STATUSES,
  appendLuxAttachmentReviewMessage,
  applyLuxAttachmentReview,
  buildLuxAttachmentEntry,
  deriveMediaType,
  normalizeAttachmentIntendedUse,
  normalizeAttachmentNotes,
  normalizeAttachmentReviewStatus,
  normalizeReviewNote,
  readLuxAttachmentEntries,
  safeLuxAttachmentShape,
  upsertLuxAttachmentEntry,
} from '../lib/cmp/_lib/lux-request-attachments.js';

test('LUX_ATTACHMENT_REVIEW_STATUSES is a frozen tri-state', () => {
  assert.deepEqual(LUX_ATTACHMENT_REVIEW_STATUSES, ['pending_review', 'reviewed', 'rejected']);
  assert.throws(() => {
    LUX_ATTACHMENT_REVIEW_STATUSES.push('approved');
  });
  assert.equal(LUX_ATTACHMENT_DEFAULT_REVIEW_STATUS, 'pending_review');
});

test('LUX_ATTACHMENT_INTENDED_USES is the agreed allowlist', () => {
  assert.deepEqual(
    LUX_ATTACHMENT_INTENDED_USES,
    ['property_hero', 'property_gallery', 'request_supporting', 'reference_material', 'other'],
  );
});

test('normalizeAttachmentReviewStatus accepts allowlisted values, rejects others', () => {
  assert.equal(normalizeAttachmentReviewStatus('reviewed'), 'reviewed');
  assert.equal(normalizeAttachmentReviewStatus('  PENDING_REVIEW '), 'pending_review');
  assert.equal(normalizeAttachmentReviewStatus('Rejected'), 'rejected');
  assert.equal(normalizeAttachmentReviewStatus('approved'), null);
  assert.equal(normalizeAttachmentReviewStatus(''), null);
  assert.equal(normalizeAttachmentReviewStatus(null), null);
  assert.equal(normalizeAttachmentReviewStatus(undefined), null);
});

test('normalizeAttachmentIntendedUse normalizes spacing/casing and rejects unknowns', () => {
  assert.equal(normalizeAttachmentIntendedUse('property_hero'), 'property_hero');
  assert.equal(normalizeAttachmentIntendedUse('Property Gallery'), 'property_gallery');
  assert.equal(normalizeAttachmentIntendedUse('reference-material'), 'reference_material');
  assert.equal(normalizeAttachmentIntendedUse('publish_now'), null);
  assert.equal(normalizeAttachmentIntendedUse(''), null);
  assert.equal(normalizeAttachmentIntendedUse(null), null);
});

test('normalizeAttachmentNotes trims and caps length', () => {
  assert.equal(normalizeAttachmentNotes(' hello '), 'hello');
  assert.equal(normalizeAttachmentNotes(''), null);
  assert.equal(normalizeAttachmentNotes(null), null);
  const big = 'x'.repeat(2000);
  assert.equal(normalizeAttachmentNotes(big).length, 1000);
});

test('normalizeReviewNote trims and caps length', () => {
  assert.equal(normalizeReviewNote('  ok  '), 'ok');
  assert.equal(normalizeReviewNote(''), null);
  const big = 'y'.repeat(2000);
  assert.equal(normalizeReviewNote(big).length, 1000);
});

test('deriveMediaType buckets common content types', () => {
  assert.equal(deriveMediaType('image/jpeg'), 'image');
  assert.equal(deriveMediaType('IMAGE/PNG'), 'image');
  assert.equal(deriveMediaType('video/mp4'), 'video');
  assert.equal(deriveMediaType('audio/mpeg'), 'audio');
  assert.equal(deriveMediaType('application/pdf'), 'document');
  assert.equal(deriveMediaType('application/zip'), 'other');
  assert.equal(deriveMediaType(''), 'other');
  assert.equal(deriveMediaType(null), 'other');
});

test('buildLuxAttachmentEntry produces a complete operator-only metadata record', () => {
  const entry = buildLuxAttachmentEntry({
    attachment_id: 'att_123',
    file_name: 'hero.jpg',
    content_type: 'image/jpeg',
    byte_size: 12345,
    intended_use: 'property_hero',
    notes: 'Cliff view, golden hour',
    created_at: '2026-05-08T09:00:00.000Z',
    created_by: 'tenant_session',
  });
  assert.equal(entry.attachment_id, 'att_123');
  assert.equal(entry.file_name, 'hero.jpg');
  assert.equal(entry.content_type, 'image/jpeg');
  assert.equal(entry.byte_size, 12345);
  assert.equal(entry.media_type, 'image');
  assert.equal(entry.intended_use, 'property_hero');
  assert.equal(entry.notes, 'Cliff view, golden hour');
  assert.equal(entry.review_status, 'pending_review');
  assert.equal(entry.review_note, null);
  assert.equal(entry.reviewed_at, null);
  assert.equal(entry.reviewed_by, null);
  assert.equal(entry.created_at, '2026-05-08T09:00:00.000Z');
  assert.equal(entry.created_by, 'tenant_session');
});

test('buildLuxAttachmentEntry rejects invalid intended_use silently (null)', () => {
  const entry = buildLuxAttachmentEntry({
    attachment_id: 'att_1',
    file_name: 'x.png',
    content_type: 'image/png',
    byte_size: 1,
    intended_use: 'publish_now',
    notes: null,
  });
  assert.equal(entry.intended_use, null, 'unknown intended_use is dropped, not raised');
});

test('buildLuxAttachmentEntry refuses missing attachment_id', () => {
  assert.throws(() => buildLuxAttachmentEntry({ file_name: 'x.png', content_type: 'image/png' }), /attachment_id required/);
});

test('upsertLuxAttachmentEntry appends a new entry and preserves prior console_json shape', () => {
  const before = {
    locale: 'en',
    parent_programme_ticket: 'cmo8mjijk0000jl04l1jz0v6d',
    request_type: 'property_update',
    priority: 'Normal',
    lux_request_meta: { request_type: 'property_update', attachments: [] },
    messages: [],
    client_view: { workflow_state: 'awaiting_operator_review' },
  };
  const entry = buildLuxAttachmentEntry({
    attachment_id: 'att_1',
    file_name: 'a.jpg',
    content_type: 'image/jpeg',
    byte_size: 100,
    intended_use: 'property_gallery',
  });
  const after = upsertLuxAttachmentEntry(before, entry);
  // Immutable: original untouched.
  assert.deepEqual(before.lux_request_meta.attachments, []);
  // New: contains exactly the new entry.
  assert.equal(after.lux_request_meta.attachments.length, 1);
  assert.equal(after.lux_request_meta.attachments[0].attachment_id, 'att_1');
  assert.equal(after.lux_request_meta.request_type, 'property_update', 'sibling fields preserved');
  assert.equal(after.locale, 'en', 'top-level fields preserved');
});

test('upsertLuxAttachmentEntry replaces a duplicate by attachment_id (idempotent)', () => {
  const before = {
    lux_request_meta: {
      attachments: [
        { attachment_id: 'att_1', file_name: 'old.jpg', review_status: 'pending_review' },
      ],
    },
  };
  const entry = buildLuxAttachmentEntry({
    attachment_id: 'att_1',
    file_name: 'new.jpg',
    content_type: 'image/jpeg',
    byte_size: 1,
  });
  const after = upsertLuxAttachmentEntry(before, entry);
  assert.equal(after.lux_request_meta.attachments.length, 1);
  assert.equal(after.lux_request_meta.attachments[0].file_name, 'new.jpg');
});

test('upsertLuxAttachmentEntry creates lux_request_meta when missing', () => {
  const before = { locale: 'en' };
  const after = upsertLuxAttachmentEntry(
    before,
    buildLuxAttachmentEntry({ attachment_id: 'att_x', file_name: 'x.bin', content_type: 'application/octet-stream', byte_size: 1 }),
  );
  assert.ok(after.lux_request_meta);
  assert.equal(after.lux_request_meta.attachments.length, 1);
});

test('applyLuxAttachmentReview updates status, note, reviewer, time on the matched entry', () => {
  const before = {
    lux_request_meta: {
      attachments: [
        buildLuxAttachmentEntry({ attachment_id: 'att_1', file_name: 'a.jpg', content_type: 'image/jpeg', byte_size: 100 }),
        buildLuxAttachmentEntry({ attachment_id: 'att_2', file_name: 'b.mp4', content_type: 'video/mp4', byte_size: 200 }),
      ],
    },
  };
  const result = applyLuxAttachmentReview(before, 'att_2', {
    review_status: 'rejected',
    review_note: 'too dark',
    reviewed_by: '[email protected]',
    reviewed_at: '2026-05-08T09:30:00.000Z',
  });
  assert.equal(result.ok, true);
  assert.equal(result.entry.attachment_id, 'att_2');
  assert.equal(result.entry.review_status, 'rejected');
  assert.equal(result.entry.review_note, 'too dark');
  assert.equal(result.entry.reviewed_by, '[email protected]');
  assert.equal(result.entry.reviewed_at, '2026-05-08T09:30:00.000Z');
  // Other entry untouched.
  assert.equal(result.consoleJson.lux_request_meta.attachments[0].review_status, 'pending_review');
});

test('applyLuxAttachmentReview returns ATTACHMENT_NOT_TRACKED when id is unknown', () => {
  const before = { lux_request_meta: { attachments: [] } };
  const result = applyLuxAttachmentReview(before, 'att_missing', {
    review_status: 'reviewed',
  });
  assert.equal(result.ok, false);
  assert.equal(result.error, 'ATTACHMENT_NOT_TRACKED');
});

test('applyLuxAttachmentReview rejects invalid review_status', () => {
  const before = { lux_request_meta: { attachments: [{ attachment_id: 'att_1' }] } };
  const result = applyLuxAttachmentReview(before, 'att_1', { review_status: 'approved' });
  assert.equal(result.ok, false);
  assert.equal(result.error, 'INVALID_REVIEW_STATUS');
});

test('applyLuxAttachmentReview rejects empty attachment id', () => {
  const result = applyLuxAttachmentReview({}, '', { review_status: 'reviewed' });
  assert.equal(result.ok, false);
  assert.equal(result.error, 'ATTACHMENT_ID_REQUIRED');
});

test('appendLuxAttachmentReviewMessage adds a structured message and is idempotent', () => {
  const before = { messages: [] };
  const args = {
    attachment_id: 'att_1',
    file_name: 'a.jpg',
    review_status: 'reviewed',
    review_note: 'ok',
    reviewed_by: '[email protected]',
    reviewed_at: '2026-05-08T10:00:00.000Z',
  };
  const after = appendLuxAttachmentReviewMessage(before, args);
  assert.equal(after.messages.length, 1);
  assert.equal(after.messages[0].kind, 'lux_attachment_review');
  assert.equal(after.messages[0].review_status, 'reviewed');
  // Idempotent: same (id, status, at) does not double-write.
  const after2 = appendLuxAttachmentReviewMessage(after, args);
  assert.equal(after2.messages.length, 1);
});

test('safeLuxAttachmentShape returns operator-safe fields and a download_url', () => {
  const dbRow = {
    id: 'att_1',
    file_name: 'hero.jpg',
    content_type: 'image/jpeg',
    byte_size: 1234,
    created_at: new Date('2026-05-08T09:00:00.000Z'),
  };
  const meta = buildLuxAttachmentEntry({
    attachment_id: 'att_1',
    file_name: 'hero.jpg',
    content_type: 'image/jpeg',
    byte_size: 1234,
    intended_use: 'property_hero',
    notes: 'note',
  });
  const shape = safeLuxAttachmentShape(dbRow, meta);
  assert.equal(shape.attachment_id, 'att_1');
  assert.equal(shape.file_name, 'hero.jpg');
  assert.equal(shape.media_type, 'image');
  assert.equal(shape.intended_use, 'property_hero');
  assert.equal(shape.review_status, 'pending_review');
  assert.equal(shape.download_url, '/api/change-attachment/download?id=att_1');
  assert.equal('data' in shape, false, 'never expose raw bytes');
  assert.equal('tenantId' in shape, false, 'never expose internal tenant id');
});

test('safeLuxAttachmentShape works for legacy uploads with no metadata entry', () => {
  const dbRow = {
    id: 'att_legacy',
    file_name: 'old.pdf',
    content_type: 'application/pdf',
    byte_size: 5,
    created_at: '2026-01-01T00:00:00.000Z',
  };
  const shape = safeLuxAttachmentShape(dbRow, null);
  assert.equal(shape.media_type, 'document');
  assert.equal(shape.review_status, 'pending_review', 'defaults to pending_review when no meta');
  assert.equal(shape.intended_use, null);
  assert.equal(shape.download_url, '/api/change-attachment/download?id=att_legacy');
});

test('readLuxAttachmentEntries safely reads array; returns [] on missing', () => {
  assert.deepEqual(readLuxAttachmentEntries(null), []);
  assert.deepEqual(readLuxAttachmentEntries({}), []);
  assert.deepEqual(readLuxAttachmentEntries({ lux_request_meta: {} }), []);
  assert.deepEqual(readLuxAttachmentEntries({ lux_request_meta: { attachments: 'nope' } }), []);
  const list = [
    { attachment_id: 'att_1', file_name: 'a' },
    { not_an_attachment: true },
    { attachment_id: '', file_name: 'b' },
  ];
  const filtered = readLuxAttachmentEntries({ lux_request_meta: { attachments: list } });
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].attachment_id, 'att_1');
});
