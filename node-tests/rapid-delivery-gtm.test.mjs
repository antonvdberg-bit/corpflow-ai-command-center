import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  RAPID_DELIVERY_PRODUCT,
  buildRapidDeliveryProposalSummary,
  isRapidDeliveryLead,
  isRapidDeliveryOfferSlug,
  leadRowToRapidDeliveryListItem,
  rapidDeliveryReferenceFromLeadId,
} from '../lib/cmp/_lib/rapid-delivery-operator.js';

describe('rapid-delivery operator helpers', () => {
  it('accepts known offer slugs only', () => {
    assert.equal(isRapidDeliveryOfferSlug('ai-lead-rescue'), true);
    assert.equal(isRapidDeliveryOfferSlug('not-a-real-offer'), false);
  });

  it('builds CF- references from lead ids', () => {
    assert.equal(rapidDeliveryReferenceFromLeadId('clxyzABCDEF'), 'CF-ABCDEF');
  });

  it('detects product marker on qualificationJson', () => {
    assert.equal(
      isRapidDeliveryLead({
        qualificationJson: { intake_meta: { product: RAPID_DELIVERY_PRODUCT, offer_slug: 'ai-lead-rescue' } },
      }),
      true,
    );
    assert.equal(isRapidDeliveryLead({ qualificationJson: { intake_meta: { product: 'ai-lead-rescue' } } }), false);
  });

  it('builds proposal markdown with offer starting price', () => {
    const summary = buildRapidDeliveryProposalSummary({
      id: 'lead123456',
      name: 'Alex',
      email: 'alex@example.com',
      phone: null,
      message: 'Need alerts',
      qualificationJson: {
        intake_meta: {
          product: RAPID_DELIVERY_PRODUCT,
          offer_slug: 'ai-lead-rescue',
          business_name: 'Demo Biz',
          enquiry_channels: 'WhatsApp',
          primary_pain: 'Missed enquiries',
          message: 'Need alerts',
        },
      },
    });
    assert.equal(summary.ok, true);
    assert.match(summary.markdown, /CF-/);
    assert.match(summary.markdown, /AI Lead Rescue Sprint/);
    assert.match(summary.markdown, /MUR 35/);
    assert.match(summary.markdown, /Anton approval/);
    assert.match(summary.markdown, /Delivery proof/);
    assert.match(summary.markdown, /corpflowai\.com\/offers\/ai-lead-rescue/);
  });

  it('maps list items with operator status default', () => {
    const item = leadRowToRapidDeliveryListItem({
      id: 'abcXYZ7890',
      name: 'Pat',
      email: 'pat@example.com',
      phone: null,
      status: 'NEW_INTAKE',
      createdAt: new Date('2026-07-14T00:00:00.000Z'),
      tenantId: 'root',
      qualificationJson: {
        intake_meta: {
          product: RAPID_DELIVERY_PRODUCT,
          offer_slug: 'premium-landing-page-rescue',
          business_name: 'Landing Co',
        },
        rapid_delivery_operator: { status: 'reviewing' },
      },
    });
    assert.equal(item.offer_slug, 'premium-landing-page-rescue');
    assert.equal(item.operator_status, 'reviewing');
    assert.equal(item.reference, 'CF-YZ7890');
  });
});
