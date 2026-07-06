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
});
