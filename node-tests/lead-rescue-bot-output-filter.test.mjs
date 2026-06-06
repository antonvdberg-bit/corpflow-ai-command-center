import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { checkAssistantOutput } from '../lib/server/lead-rescue-bot/output-filter.js';

describe('lead-rescue-bot/output-filter — doctrine-locked post-filter', () => {
  describe('clean assistant output (must pass through)', () => {
    it('allows the doctrine-aligned canonical pitch', () => {
      const r = checkAssistantOutput(
        'AI Lead Rescue captures new enquiries, alerts the owner or operator, logs every lead, and surfaces follow-ups daily — without rebuilding your website or forcing a CRM migration.',
      );
      assert.equal(r.blocked, false);
      assert.equal(r.refusalClass, null);
    });

    it('allows the explicit no-guarantee disclaimer', () => {
      const r = checkAssistantOutput(
        'We do not guarantee new revenue. We help make sure existing enquiries are captured, visible, and followed up.',
      );
      assert.equal(r.blocked, false);
    });

    it('allows the standard offer description with USD 150', () => {
      const r = checkAssistantOutput(
        'The launch pilot is USD 150. We review every intake within two business hours, then email a USD invoice with the agreed payment route.',
      );
      assert.equal(r.blocked, false);
    });
  });

  describe('revenue / volume / conversion guarantees (block)', () => {
    it('blocks "we guarantee more revenue"', () => {
      const r = checkAssistantOutput("We guarantee more revenue within 30 days.");
      assert.equal(r.blocked, true);
      assert.equal(r.refusalClass, 'guarantee');
    });

    it('blocks "you will get more leads"', () => {
      const r = checkAssistantOutput('You will get more leads from this pilot.');
      assert.equal(r.blocked, true);
      assert.equal(r.refusalClass, 'guarantee');
    });

    it('blocks "never miss a lead"', () => {
      const r = checkAssistantOutput("You'll never miss a lead again.");
      assert.equal(r.blocked, true);
      assert.equal(r.refusalClass, 'guarantee');
    });

    it('blocks "10x revenue"', () => {
      const r = checkAssistantOutput('We can 10x your revenue in the first quarter.');
      assert.equal(r.blocked, true);
      assert.equal(r.refusalClass, 'guarantee');
    });
  });

  describe('discount / price-change patterns (block)', () => {
    it('blocks "20% off"', () => {
      const r = checkAssistantOutput("Since you're in Mauritius I can offer 20% off the pilot.");
      assert.equal(r.blocked, true);
      assert.equal(r.refusalClass, 'discount');
    });

    it('blocks "free first month"', () => {
      const r = checkAssistantOutput("We're running a free first month trial for new clients.");
      assert.equal(r.blocked, true);
      assert.equal(r.refusalClass, 'discount');
    });

    it('blocks "limited offer"', () => {
      const r = checkAssistantOutput("This is a limited offer expiring tomorrow.");
      assert.equal(r.blocked, true);
      assert.equal(r.refusalClass, 'discount');
    });
  });

  describe('banking / payment routing in output (block)', () => {
    it('blocks a Stripe payment link', () => {
      const r = checkAssistantOutput(
        'You can pay here: https://stripe.com/pay/abc123 and we will start.',
      );
      assert.equal(r.blocked, true);
      assert.equal(r.refusalClass, 'banking');
    });

    it('blocks a PayPal link', () => {
      const r = checkAssistantOutput('Send USD 150 to https://paypal.me/corpflowai/150');
      assert.equal(r.blocked, true);
      assert.equal(r.refusalClass, 'banking');
    });

    it('blocks an account-number quote', () => {
      const r = checkAssistantOutput('Our MCB account is 000123456789, please transfer USD 150.');
      assert.equal(r.blocked, true);
      assert.equal(r.refusalClass, 'banking');
    });
  });

  describe('hype vocabulary (block)', () => {
    it('blocks "revolutionary AI"', () => {
      const r = checkAssistantOutput('Our revolutionary AI handles every lead automatically.');
      assert.equal(r.blocked, true);
      assert.equal(r.refusalClass, 'hype');
    });

    it('blocks "fully autonomous"', () => {
      const r = checkAssistantOutput('A fully autonomous follow-up system for your business.');
      assert.equal(r.blocked, true);
      assert.equal(r.refusalClass, 'hype');
    });

    it('blocks "replaces your sales team"', () => {
      const r = checkAssistantOutput('This effectively replaces your sales team for $150.');
      assert.equal(r.blocked, true);
      assert.equal(r.refusalClass, 'hype');
    });

    it('blocks "24/7 AI support"', () => {
      const r = checkAssistantOutput('Includes 24/7 AI support for all your customers.');
      assert.equal(r.blocked, true);
      assert.equal(r.refusalClass, 'hype');
    });
  });

  describe('out-of-scope offers (block)', () => {
    it('blocks "we will rebuild your website"', () => {
      const r = checkAssistantOutput("Don't worry, we will rebuild your website at the same time.");
      assert.equal(r.blocked, true);
      assert.equal(r.refusalClass, 'out_of_scope');
    });

    it('blocks "we can migrate your CRM"', () => {
      const r = checkAssistantOutput('Yes we can migrate your CRM into ours.');
      assert.equal(r.blocked, true);
      assert.equal(r.refusalClass, 'out_of_scope');
    });
  });

  describe('priority ordering', () => {
    it('prefers guarantee over discount when both match', () => {
      const r = checkAssistantOutput(
        'I guarantee more leads — and you get 20% off as a Mauritius client.',
      );
      assert.equal(r.blocked, true);
      assert.equal(r.refusalClass, 'guarantee');
    });
  });

  describe('safe edge cases', () => {
    it('handles empty / non-string input', () => {
      assert.deepEqual(checkAssistantOutput(''), {
        blocked: false,
        refusalClass: null,
        matchedPattern: '',
      });
      assert.deepEqual(checkAssistantOutput(/** @type {any} */ (null)), {
        blocked: false,
        refusalClass: null,
        matchedPattern: '',
      });
    });

    it('does NOT block the phrase "no guarantees"', () => {
      const r = checkAssistantOutput("We don't make guarantees on revenue.");
      assert.equal(r.blocked, false);
    });

    it('does NOT block prices like USD 150 (the actual offer)', () => {
      const r = checkAssistantOutput('The pilot is USD 150 — that includes setup + 7-day monitoring.');
      assert.equal(r.blocked, false);
    });
  });
});
