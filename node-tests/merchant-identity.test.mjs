import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CUSTOMER_SERVICE_EMAIL,
  CUSTOMER_SERVICE_PHONE,
  MERCHANT_BRN,
  MERCHANT_LEGAL_NAME,
  MERCHANT_OUTLET_COUNTRY,
  MERCHANT_REGISTERED_OFFICE,
  TRANSACTION_RECEIPT_FIELDS,
  formatCurrencyDisclosure,
  formatMerchantIdentityLine,
  formatSupportSlaText,
  hasCustomerServicePhone,
} from '../lib/public/merchant-identity.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

test('merchant identity exposes PAY-SBM-2 approved public values', () => {
  assert.equal(MERCHANT_LEGAL_NAME, 'CorpFlowAI Ltd');
  assert.equal(MERCHANT_BRN, 'C25228280');
  assert.match(MERCHANT_REGISTERED_OFFICE, /Trou Aux Biches/);
  assert.equal(MERCHANT_OUTLET_COUNTRY, 'Mauritius');
  assert.equal(CUSTOMER_SERVICE_EMAIL, 'support@corpflowai.com');
});

test('currency disclosure is concise and omits pricing and payment-path detail', () => {
  const text = formatCurrencyDisclosure();
  assert.match(text, /Commercial terms, currency and payment instructions are confirmed in writing before payment/i);
  assert.match(text, /does not collect card details on public marketing pages/i);
  assert.doesNotMatch(text, /Two payment paths/i);
  assert.doesNotMatch(text, /MUR 35,?000/);
  assert.doesNotMatch(text, /MUR 45,?000/);
  assert.doesNotMatch(text, /USD account/i);
  assert.doesNotMatch(text, /\/lead-rescue/);
  assert.doesNotMatch(text, /\/offers\//);
  assert.doesNotMatch(text, /manual bank transfer/i);
  assert.doesNotMatch(text, /No card capture/i);
});

test('support SLA text is a single clear acknowledgement target', () => {
  const text = formatSupportSlaText();
  assert.equal(text, 'We aim to acknowledge routine enquiries within one business day.');
  assert.doesNotMatch(text, /within 2/);
  assert.doesNotMatch(text, /active pilot windows/i);
  assert.doesNotMatch(text, /within 2 and within 1/i);
});

test('merchant identity line includes outlet country', () => {
  assert.match(formatMerchantIdentityLine(), /Merchant outlet country: Mauritius/);
});

test('transaction receipt fields cover SBM minimum set', () => {
  const joined = TRANSACTION_RECEIPT_FIELDS.join(' ');
  assert.match(joined, /reference/i);
  assert.match(joined, /Purchaser name/i);
  assert.match(joined, /Transaction date/i);
  assert.match(joined, /amount/i);
  assert.match(joined, /Currency/i);
  assert.match(joined, /CorpFlowAI Ltd/);
  assert.match(joined, /corpflowai\.com/i);
  assert.match(joined, /authorization/i);
  assert.match(joined, /Masked card/i);
});

test('customer service phone is set for SBM website compliance', () => {
  assert.equal(hasCustomerServicePhone(), true);
  assert.match(CUSTOMER_SERVICE_PHONE, /\+230/);
});

test('shared public footer source uses canonical disclosure helpers', () => {
  const footer = fs.readFileSync(path.join(root, 'components/PublicSiteFooter.js'), 'utf8');
  assert.match(footer, /formatCurrencyDisclosure/);
  assert.match(footer, /formatSupportSlaText/);
  assert.match(footer, /CUSTOMER_SERVICE_EMAIL/);
  assert.match(footer, /CUSTOMER_SERVICE_PHONE/);
  assert.doesNotMatch(footer, /Two payment paths/);
  assert.doesNotMatch(footer, /active pilot windows/);
  assert.doesNotMatch(footer, /MUR 35,?000/);
});

const FORBIDDEN_PUBLIC_PATTERNS = [
  { name: 'two payment paths', re: /Two payment paths exist/ },
  { name: 'active pilot windows', re: /active pilot windows/ },
  { name: 'within 2 and within 1', re: /within 2 and within 1/ },
  { name: 'still obtaining a USD account', re: /still obtaining a USD account/i },
  { name: 'USD banking not yet / still being obtained', re: /USD banking for this (?:path|sprint path) (?:is not yet available|is still being obtained)/i },
  { name: 'footer-style MUR 35k/45k pair', re: /MUR 35,?000\s*\/\s*MUR 45,?000/ },
  { name: 'offers/* as commercial explanation', re: /on \/offers\/\*/ },
];

const PUBLIC_SURFACE_FILES = [
  'lib/public/merchant-identity.js',
  'lib/public/rapid-delivery-offers.js',
  'components/PublicSiteFooter.js',
  'components/public/CorpFlowPublicFooter.js',
  'components/CustomerServiceContact.js',
  'components/RapidDeliveryOfferPage.js',
  'pages/about.js',
  'pages/services.js',
  'pages/terms.js',
  'pages/process.js',
  'pages/standards.js',
  'pages/refund-policy.js',
  'pages/privacy.js',
  'pages/contact.js',
  'components/AiLeadRescueLanding.js',
];

test('public surfaces do not retain forbidden footer payment/SLA wording', () => {
  for (const rel of PUBLIC_SURFACE_FILES) {
    const text = fs.readFileSync(path.join(root, rel), 'utf8');
    for (const { name, re } of FORBIDDEN_PUBLIC_PATTERNS) {
      assert.equal(re.test(text), false, `${rel} still contains forbidden pattern: ${name}`);
    }
  }
});

test('approved offer-page pricing remains on intentional product surfaces', () => {
  const leadRescue = fs.readFileSync(path.join(root, 'components/AiLeadRescueLanding.js'), 'utf8');
  assert.match(leadRescue, /USD 150/);

  const offers = fs.readFileSync(path.join(root, 'lib/public/rapid-delivery-offers.js'), 'utf8');
  assert.match(offers, /35,?000|45000|45,?000/);
});
