import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  LUX_OWNER_FEEDBACK_ACTIVE_BASELINE_BANNER,
  LUX_OWNER_FEEDBACK_ACTIVE_PRODUCT_SURFACE,
  LUX_OWNER_FEEDBACK_HISTORICAL_ITEMS,
  LUX_OWNER_FEEDBACK_ITEMS,
  LUX_OWNER_FEEDBACK_NEXT_SLICE,
  LUX_OWNER_FEEDBACK_PRODUCT_CATEGORIES,
  LUX_OWNER_FEEDBACK_QUEUE_META,
  countLuxOwnerFeedbackAwaitingAnton,
  countLuxOwnerFeedbackByStatus,
  luxOwnerFeedbackStatusLabel,
} from '../lib/client/lux-owner-feedback-queue.js';

const REQUIRED_CATEGORY_KEYS = [
  'residences',
  'yachts',
  'aviation',
  'island_experiences',
  'private_advisory',
  'buyer_access_flow',
  'advisor_pipeline',
  'website_readiness',
  'mobile_readiness',
];

test('lux owner feedback queue: new product baseline meta', () => {
  assert.equal(LUX_OWNER_FEEDBACK_QUEUE_META.pageTitle, 'LuxeMaurice AI — New Product Feedback Queue');
  assert.equal(LUX_OWNER_FEEDBACK_ACTIVE_PRODUCT_SURFACE, '/client/luxe-maurice-ai');
  assert.equal(LUX_OWNER_FEEDBACK_QUEUE_META.historicalContextIssue, '#529');
  assert.equal(LUX_OWNER_FEEDBACK_QUEUE_META.prSlice, '#580');
  assert.equal(LUX_OWNER_FEEDBACK_QUEUE_META.propertyOnlyScopeRejected, true);
  assert.match(LUX_OWNER_FEEDBACK_ACTIVE_BASELINE_BANNER, /multi-channel private-access/i);
  assert.match(LUX_OWNER_FEEDBACK_ACTIVE_BASELINE_BANNER, /not the old property-only/i);
});

test('lux owner feedback queue: multi-channel product categories', () => {
  const keys = LUX_OWNER_FEEDBACK_PRODUCT_CATEGORIES.map((c) => c.key);
  for (const key of REQUIRED_CATEGORY_KEYS) {
    assert.ok(keys.includes(key), `missing category: ${key}`);
  }
  assert.ok(keys.includes('multi_channel'));
});

test('lux owner feedback queue: P0 website and mobile readiness items', () => {
  const website = LUX_OWNER_FEEDBACK_ITEMS.find((x) => x.category === 'website_readiness' && x.priority === 'P0');
  const mobile = LUX_OWNER_FEEDBACK_ITEMS.find((x) => x.category === 'mobile_readiness' && x.priority === 'P0');
  assert.ok(website, 'website-ready P0 item missing');
  assert.ok(mobile, 'mobile-ready P0 item missing');
  assert.match(website.feedback, /website-ready/i);
  assert.match(mobile.feedback, /mobile-ready/i);
});

test('lux owner feedback queue: not property-only product scope', () => {
  const notPropertyOnly = LUX_OWNER_FEEDBACK_ITEMS.find((x) =>
    /not be treated as property-only|not property-only/i.test(x.feedback),
  );
  assert.ok(notPropertyOnly, 'property-only rejection item missing');
  assert.equal(LUX_OWNER_FEEDBACK_QUEUE_META.productScope, 'multi_channel_private_access');

  const multiChannel = LUX_OWNER_FEEDBACK_ITEMS.find((x) => x.category === 'multi_channel' && x.priority === 'P0');
  assert.ok(multiChannel);
  assert.match(multiChannel.feedback, /multi-channel|multi-directional/i);
});

test('lux owner feedback queue: active surface is /client/luxe-maurice-ai', () => {
  const activeSurfaceItem = LUX_OWNER_FEEDBACK_ITEMS.find((x) =>
    x.feedback.includes('/client/luxe-maurice-ai'),
  );
  assert.ok(activeSurfaceItem, 'active product surface item missing');

  const surfaces = LUX_OWNER_FEEDBACK_ITEMS.map((x) => x.affectedSurface).join(' ');
  assert.match(surfaces, /\/client\/luxe-maurice-ai/);

  for (const step of LUX_OWNER_FEEDBACK_NEXT_SLICE) {
    assert.match(step.outcome, /\/client\/luxe-maurice-ai|LuxeMaurice AI|multi-channel|mobile|website/i);
  }
});

test('lux owner feedback queue: active items have required operator fields', () => {
  assert.ok(LUX_OWNER_FEEDBACK_ITEMS.length >= 8);

  for (const item of LUX_OWNER_FEEDBACK_ITEMS) {
    assert.match(item.id, /^NP-\d{3}$/);
    assert.ok(item.category.trim());
    assert.ok(item.feedback.trim().length > 20);
    assert.ok(['P0', 'P1', 'P2'].includes(item.priority));
    assert.ok(
      ['queued', 'in_progress', 'blocked', 'awaiting_client', 'awaiting_anton', 'responded'].includes(item.status),
    );
    assert.ok(item.affectedSurface.trim());
    assert.ok(item.proposedResponse.trim());
    assert.ok(item.nextVisibleFix.trim());
    assert.equal(typeof item.antonApprovalRequired, 'boolean');
    assert.ok(item.sourceRef.trim());
  }
});

test('lux owner feedback queue: historical items separated from active slice', () => {
  assert.ok(LUX_OWNER_FEEDBACK_HISTORICAL_ITEMS.length >= 3);

  for (const item of LUX_OWNER_FEEDBACK_HISTORICAL_ITEMS) {
    assert.match(item.id, /^LEG-\d{3}$/);
    assert.match(item.sourceRef, /historical|#529/i);
  }

  const historicalText = LUX_OWNER_FEEDBACK_HISTORICAL_ITEMS.map((x) => x.feedback).join(' ');
  assert.match(historicalText, /recovery|property|#529|old/i);

  const activeP0Text = LUX_OWNER_FEEDBACK_ITEMS.filter((x) => x.priority === 'P0')
    .map((x) => x.feedback)
    .join(' ');
  assert.doesNotMatch(activeP0Text, /content sprint C2|recovery roadmap/i);
});

test('lux owner feedback queue: status counts and anton gate', () => {
  const counts = countLuxOwnerFeedbackByStatus();
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  assert.equal(total, LUX_OWNER_FEEDBACK_ITEMS.length);

  const awaitingAnton = countLuxOwnerFeedbackAwaitingAnton();
  assert.equal(awaitingAnton, 0);
  assert.equal(luxOwnerFeedbackStatusLabel('awaiting_client'), 'Awaiting Jan');
});

test('lux owner feedback queue: next delivery slice targets new product', () => {
  assert.equal(LUX_OWNER_FEEDBACK_NEXT_SLICE.length, 3);
  assert.match(LUX_OWNER_FEEDBACK_NEXT_SLICE[0].title, /LuxeMaurice AI/i);
  assert.match(LUX_OWNER_FEEDBACK_NEXT_SLICE[1].outcome, /not property-only|all channels/i);
  assert.match(LUX_OWNER_FEEDBACK_NEXT_SLICE[2].title, /Mobile|buyer/i);
});
