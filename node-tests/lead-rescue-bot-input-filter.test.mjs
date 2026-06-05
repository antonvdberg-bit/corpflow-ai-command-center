import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { checkUserInputForBankingData } from '../lib/server/lead-rescue-bot/input-filter.js';

describe('lead-rescue-bot/input-filter — banking-class data detection', () => {
  it('passes through clean visitor text', () => {
    const r = checkUserInputForBankingData(
      "Hi! I run a small B&B in Mauritius and I'm losing enquiries from Instagram DMs and WhatsApp. Can you help?",
    );
    assert.equal(r.blocked, false);
    assert.deepEqual(r.matchedClasses, []);
    assert.match(r.sanitizedText, /Mauritius/);
  });

  it('blocks Visa-style test card number (Luhn-valid)', () => {
    const r = checkUserInputForBankingData('My card is 4111 1111 1111 1111, can I pay now?');
    assert.equal(r.blocked, true);
    assert.ok(r.matchedClasses.includes('card'));
    assert.match(r.sanitizedText, /\[REDACTED\]/);
    assert.doesNotMatch(r.sanitizedText, /4111/);
  });

  it('blocks Mastercard-style test number with dashes (Luhn-valid)', () => {
    const r = checkUserInputForBankingData('5555-5555-5555-4444');
    assert.equal(r.blocked, true);
    assert.ok(r.matchedClasses.includes('card'));
  });

  it('does NOT flag a long random non-Luhn digit string (e.g. timestamp / order number)', () => {
    const r = checkUserInputForBankingData('Our order reference is 1234567890123 from yesterday.');
    assert.equal(r.blocked, false);
    assert.equal(r.matchedClasses.length, 0);
  });

  it('blocks a Mauritius IBAN', () => {
    const r = checkUserInputForBankingData(
      'My MCB IBAN is MU17BOMM0101101030300200000MUR for the transfer.',
    );
    assert.equal(r.blocked, true);
    assert.ok(r.matchedClasses.includes('iban'));
    assert.doesNotMatch(r.sanitizedText, /MU17BOMM/);
  });

  it('blocks a SWIFT/BIC code', () => {
    const r = checkUserInputForBankingData('Send it to MCBLMUMUXXX please.');
    assert.equal(r.blocked, true);
    assert.ok(r.matchedClasses.includes('swift'));
  });

  it('blocks a CVV reference', () => {
    const r = checkUserInputForBankingData('cvv: 123 — does that help?');
    assert.equal(r.blocked, true);
    assert.ok(r.matchedClasses.includes('cvv'));
  });

  it('blocks multiple classes at once', () => {
    const r = checkUserInputForBankingData('Card 4111-1111-1111-1111 cvv 999');
    assert.equal(r.blocked, true);
    assert.ok(r.matchedClasses.includes('card'));
    assert.ok(r.matchedClasses.includes('cvv'));
  });

  it('handles empty / non-string input safely', () => {
    assert.deepEqual(checkUserInputForBankingData(''), {
      blocked: false,
      matchedClasses: [],
      sanitizedText: '',
    });
    assert.deepEqual(checkUserInputForBankingData(/** @type {any} */ (null)), {
      blocked: false,
      matchedClasses: [],
      sanitizedText: '',
    });
  });

  it('does NOT flag ordinary words that look uppercase-ish', () => {
    const r = checkUserInputForBankingData(
      'I run THREE businesses in Mauritius and TWO of them lose leads from WhatsApp.',
    );
    assert.equal(r.blocked, false);
  });
});
