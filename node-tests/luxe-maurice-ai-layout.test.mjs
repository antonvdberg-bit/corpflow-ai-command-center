import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  LUXE_MAURICE_AI_BASE,
  LUXE_MAURICE_AI_MULTI_CHANNEL_TAGLINE,
  luxeMauriceAiCatalogueCategoryHref,
  luxeMauriceAiCtaPrimary,
} from '../lib/client/luxe-maurice-ai-layout.js';

test('luxe maurice ai layout: active surface and multi-channel tagline', () => {
  assert.equal(LUXE_MAURICE_AI_BASE, '/client/luxe-maurice-ai');
  assert.match(LUXE_MAURICE_AI_MULTI_CHANNEL_TAGLINE, /multi-channel/i);
  assert.match(LUXE_MAURICE_AI_MULTI_CHANNEL_TAGLINE, /yachts/i);
  assert.match(LUXE_MAURICE_AI_MULTI_CHANNEL_TAGLINE, /aviation/i);
  assert.match(LUXE_MAURICE_AI_MULTI_CHANNEL_TAGLINE, /island experiences/i);
});

test('luxe maurice ai layout: CTAs meet mobile touch target', () => {
  const primary = luxeMauriceAiCtaPrimary();
  assert.ok(primary.minHeight >= 48);
  assert.match(String(primary.minWidth), /100%|280px/);
});

test('luxe maurice ai layout: catalogue category hrefs', () => {
  assert.equal(luxeMauriceAiCatalogueCategoryHref(''), '/client/luxe-maurice-ai/properties');
  assert.equal(
    luxeMauriceAiCatalogueCategoryHref('yacht_marine'),
    '/client/luxe-maurice-ai/properties?category=yacht_marine',
  );
});
