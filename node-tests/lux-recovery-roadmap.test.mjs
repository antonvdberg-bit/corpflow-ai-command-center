import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  LUX_PRODUCT_DIRECTION_PILLAR_KEYS,
  LUX_PRODUCT_DIRECTION_PILLARS,
  LUX_PRODUCT_DIRECTION_PAGE_TITLE,
} from '../lib/client/lux-product-direction-content.js';

test('product direction content: eleven pillars', () => {
  assert.equal(LUX_PRODUCT_DIRECTION_PILLARS.length, 11);
  assert.equal(LUX_PRODUCT_DIRECTION_PILLAR_KEYS.length, 11);
  assert.equal(LUX_PRODUCT_DIRECTION_PAGE_TITLE, 'Product direction confirmation');
  assert.equal(LUX_PRODUCT_DIRECTION_PILLARS[0].title.includes('Public acquisition'), true);
  LUX_RECOVERY_RELEASE1_PACKAGES,
  LUX_RECOVERY_RELEASE1_TITLE,
} from '../lib/client/lux-recovery-roadmap-content.js';

test('recovery roadmap content: seven Release 1 packages', () => {
  assert.equal(LUX_RECOVERY_RELEASE1_PACKAGES.length, 7);
  assert.equal(LUX_RECOVERY_RELEASE1_TITLE.includes('First Real Opportunity'), true);
  assert.equal(LUX_RECOVERY_RELEASE1_PACKAGES[0].name, 'Clean public site');
  assert.equal(LUX_RECOVERY_RELEASE1_PACKAGES[6].name, 'Your editor walk-through');
});
