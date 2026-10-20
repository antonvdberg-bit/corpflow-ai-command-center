import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { validateCampaign, validateSocialPostManifest } from '../lib/social-publishing/manifest.js';
import { buildCampaignDryRun, buildProviderDryRun } from '../lib/social-publishing/provider-payloads.js';
import { executionReceipt, selectDuePosts } from '../lib/social-publishing/due-posts.js';

const posts = JSON.parse(
  fs.readFileSync(new URL('../fixtures/social-publishing/cafe-november-2026.synthetic.json', import.meta.url)),
);

test('Cafe November synthetic campaign passes manifest validation', () => {
  const result = validateCampaign(posts);
  assert.equal(result.ok, true);
  assert.equal(result.posts.length, 3);
});

test('fails closed when a post is ready without approval', () => {
  const result = validateSocialPostManifest({
    ...posts[0],
    approvalState: 'DRAFT',
    publishState: 'READY',
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('unapproved_post_cannot_be_ready'));
});

test('builds deterministic Facebook dry-run payload', () => {
  const payload = buildProviderDryRun(posts[0]);
  assert.equal(payload.provider, 'meta');
  assert.equal(payload.channel, 'facebook');
  assert.equal(payload.operation, 'page_photo_post');
  assert.equal(payload.body.message, posts[0].caption);
  assert.equal(payload.idempotencyKey, posts[0].id);
});

test('builds deterministic Instagram two-step dry-run payload', () => {
  const payload = buildProviderDryRun(posts[1]);
  assert.equal(payload.channel, 'instagram');
  assert.equal(payload.steps.length, 2);
  assert.equal(payload.steps[0].body.caption, posts[1].caption);
  assert.equal(payload.steps[1].body.creationIdFromPreviousStep, true);
});

test('builds deterministic Google Business Profile dry-run payload', () => {
  const payload = buildProviderDryRun(posts[2]);
  assert.equal(payload.channel, 'google_business_profile');
  assert.equal(payload.body.summary, posts[2].caption);
  assert.equal(payload.idempotencyKey, posts[2].id);
});

test('builds complete three-channel campaign dry run without credentials', () => {
  const result = buildCampaignDryRun(posts);
  assert.equal(result.length, 3);
  assert.deepEqual(result.map((row) => row.payload.channel), [
    'facebook',
    'instagram',
    'google_business_profile',
  ]);
  assert.ok(result.every((row) => row.timezone === 'Indian/Mauritius'));
});


test('selects only approved ready unpublished posts that are due', () => {
  const now = new Date('2026-11-11T00:00:00+04:00');
  const candidates = [
    ...posts,
    { ...posts[0], id: 'draft-copy', approvalState: 'DRAFT', publishState: 'NOT_READY' },
    { ...posts[0], id: 'already-published', publishState: 'PUBLISHED', providerPostId: 'provider-123' },
  ];
  const due = selectDuePosts(candidates, now);
  assert.deepEqual(due.map((post) => post.id), ['cafe-nov-001', 'cafe-nov-002']);
});

test('execution receipt preserves post id as idempotency key', () => {
  const receipt = executionReceipt(posts[0], {
    providerPostId: 'provider-123',
    publishedAt: '2026-11-03T10:00:05+04:00',
  });
  assert.equal(receipt.postId, posts[0].id);
  assert.equal(receipt.idempotencyKey, posts[0].id);
  assert.equal(receipt.publishState, 'PUBLISHED');
  assert.equal(receipt.providerPostId, 'provider-123');
});
