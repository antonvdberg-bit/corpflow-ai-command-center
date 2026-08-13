import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  STORE,
  buildAddressPayload,
  buildContactPayload,
  buildCustomerPayload,
  buildDeliveryHandoff,
  classifyField,
  evaluateQuotationSuitability,
  findDuplicateMatches,
  listForbiddenSecretKeys,
  loadErpnextClientMasterConfig,
  normalizeCustomerName,
  resolveDuplicateAction,
  splitPersonName,
} from '../lib/erpnext/client-master.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(rel) {
  return readFileSync(path.join(REPO_ROOT, rel), 'utf8');
}

function readJson(rel) {
  return JSON.parse(read(rel));
}

const LR_INTAKE_CONFIG = readJson('config/lead-rescue-onboarding-delivery.v1.json');
const WR_INTAKE_CONFIG = readJson('config/website-rescue-onboarding-delivery.v1.json');
const LR_FIXTURE = readJson('fixtures/erpnext-client-master/lead-rescue.synthetic.json');
const WR_FIXTURE = readJson('fixtures/erpnext-client-master/website-rescue.synthetic.json');
const DUP_INDEX = readJson('fixtures/erpnext-client-master/duplicate-index.synthetic.json');

describe('ERPNext Client Master (#880)', () => {
  it('canonical docs and config exist with verdict READY', () => {
    const files = [
      'docs/erpnext/ERPNEXT_CLIENT_MASTER_V1.md',
      'docs/decisions/20260813-erpnext-client-master.md',
      'config/erpnext-client-master.v1.json',
      'lib/erpnext/client-master.js',
    ];
    for (const rel of files) {
      assert.equal(existsSync(path.join(REPO_ROOT, rel)), true, `missing ${rel}`);
    }
    const config = loadErpnextClientMasterConfig();
    assert.equal(config.verdict, 'ERPNext Client Master READY');
    assert.equal(config.custom_field_proposal.startsWith('none'), true);
    const doc = read('docs/erpnext/ERPNEXT_CLIENT_MASTER_V1.md');
    assert.ok(doc.includes('<!-- ERPNEXT_CLIENT_MASTER_V1 -->'));
    assert.ok(doc.includes('ERPNext Client Master READY'));
    assert.ok(doc.includes('CF880 Synthetic Lead Rescue Ltd'));
    assert.ok(doc.includes('CF880 Synthetic Website Rescue Ltd'));
    assert.ok(!/sk_live|ERPNEXT_API_SECRET\s*[:=]\s*\S+/.test(doc));
  });

  it('classifies Lead Rescue and Website Rescue intake into the three stores', () => {
    const lrIds = LR_INTAKE_CONFIG.lead_rescue_intake_fields.map((f) => f.id);
    const wrIds = WR_INTAKE_CONFIG.website_rescue_intake_fields.map((f) => f.id);
    const shared = LR_INTAKE_CONFIG.shared_onboarding_checklist.map((f) => f.id);

    const commercial = new Set();
    const delivery = new Set();
    const secret = new Set();
    for (const id of [...lrIds, ...wrIds, ...shared]) {
      const store = classifyField(id);
      if (store === STORE.ERPNEXT_COMMERCIAL) commercial.add(id);
      else if (store === STORE.APPROVED_SECURE_CHANNEL) secret.add(id);
      else delivery.add(id);
    }

    assert.ok(commercial.has('business_display_name'));
    assert.ok(commercial.has('primary_contact_name'));
    assert.ok(commercial.has('working_email'));
    assert.ok(delivery.has('enquiry_sources'));
    assert.ok(delivery.has('lead_stages'));
    assert.ok(delivery.has('pages_in_scope'));
    assert.ok(delivery.has('hosting_facts_summary'));
    assert.ok(delivery.has('timezone'));
    assert.equal(secret.size, 0, 'intake field ids must not be secrets');

    for (const id of LR_INTAKE_CONFIG.forbidden_intake_fields) {
      assert.equal(classifyField(id), STORE.APPROVED_SECURE_CHANNEL, id);
    }
    for (const id of WR_INTAKE_CONFIG.forbidden_intake_fields) {
      assert.equal(classifyField(id), STORE.APPROVED_SECURE_CHANNEL, id);
    }
    assert.equal(classifyField('dns_password'), STORE.APPROVED_SECURE_CHANNEL);
    assert.equal(classifyField('brand.logo.primary'), STORE.COMPANY_MASTER_EVIDENCE);
  });

  it('builds standard Customer/Contact/Address payloads without secrets or custom fields', () => {
    const customer = buildCustomerPayload(LR_FIXTURE, LR_FIXTURE.product);
    const contact = buildContactPayload(LR_FIXTURE, customer.customer_name);
    const address = buildAddressPayload(LR_FIXTURE, customer.customer_name);

    assert.equal(customer.doctype, 'Customer');
    assert.equal(customer.customer_name, 'CF880 Synthetic Lead Rescue Ltd');
    assert.equal(customer.customer_type, 'Company');
    assert.equal(customer.customer_group, 'Commercial');
    assert.equal(customer.territory, 'Mauritius');
    assert.equal(customer.default_currency, 'USD');
    assert.equal(customer.default_price_list, 'Standard Selling');
    assert.equal(customer.customer_details.includes('synthetic=true'), true);
    assert.equal(Object.keys(customer).some((k) => k.startsWith('custom_')), false);

    assert.equal(contact.first_name, 'Priya');
    assert.equal(contact.last_name, 'Synthetic');
    assert.equal(contact.email_ids[0].email_id, 'priya.synthetic@example.invalid');
    assert.equal(contact.links[0].link_doctype, 'Customer');
    assert.equal(address.address_type, 'Billing');
    assert.equal(address.city, 'Port Louis');
    assert.equal(address.country, 'Mauritius');
    assert.deepEqual(listForbiddenSecretKeys({ ...LR_FIXTURE, ...customer, ...contact }), []);

    const wrCustomer = buildCustomerPayload(WR_FIXTURE, WR_FIXTURE.product);
    assert.equal(wrCustomer.default_currency, 'MUR');
    assert.equal(wrCustomer.website, 'https://synthetic-website-rescue.example.invalid');
  });

  it('detects ERPNext suffix duplicates and same-email conflicts', () => {
    assert.equal(
      normalizeCustomerName('CF880 Synthetic Lead Rescue Ltd - 1'),
      normalizeCustomerName('CF880 Synthetic Lead Rescue Ltd'),
    );

    const sameName = findDuplicateMatches(DUP_INDEX.existing, {
      customer_name: 'CF880 Synthetic Lead Rescue Ltd',
      email: 'priya.synthetic@example.invalid',
    });
    const sameNameAction = resolveDuplicateAction(sameName, {
      customer_name: 'CF880 Synthetic Lead Rescue Ltd',
      email: 'priya.synthetic@example.invalid',
    });
    assert.equal(sameNameAction.action, 'UPDATE');
    assert.equal(sameNameAction.canonical, 'CF880 Synthetic Lead Rescue Ltd');

    const emailClash = findDuplicateMatches(DUP_INDEX.existing, {
      customer_name: 'Brand New Synthetic Cafe Ltd',
      email: 'priya.synthetic@example.invalid',
    });
    const clashAction = resolveDuplicateAction(emailClash, {
      customer_name: 'Brand New Synthetic Cafe Ltd',
      email: 'priya.synthetic@example.invalid',
    });
    assert.equal(clashAction.action, 'CONFLICT');

    const fresh = resolveDuplicateAction(
      findDuplicateMatches(DUP_INDEX.existing, {
        customer_name: 'CF880 Unseen Synthetic Ltd',
        email: 'unseen.synthetic@example.invalid',
      }),
      { customer_name: 'CF880 Unseen Synthetic Ltd', email: 'unseen.synthetic@example.invalid' },
    );
    assert.equal(fresh.action, 'CREATE');
  });

  it('marks linked Customer/Contact/Address as sufficient for quotation and invoice party fields', () => {
    const lr = evaluateQuotationSuitability(
      {
        name: 'CF880 Synthetic Lead Rescue Ltd',
        customer_name: 'CF880 Synthetic Lead Rescue Ltd',
        customer_type: 'Company',
        customer_group: 'Commercial',
        territory: 'Mauritius',
        default_currency: 'USD',
        default_price_list: 'Standard Selling',
        customer_primary_contact: 'Priya Synthetic-CF880 Synthetic Lead Rescue Ltd',
        customer_primary_address: 'CF880 Synthetic Lead Rescue Ltd-Billing',
        email_id: 'priya.synthetic@example.invalid',
        disabled: 0,
      },
      {
        name: 'Priya Synthetic-CF880 Synthetic Lead Rescue Ltd',
        email_id: 'priya.synthetic@example.invalid',
      },
      {
        name: 'CF880 Synthetic Lead Rescue Ltd-Billing',
        address_line1: '1 Synthetic Lane',
        city: 'Port Louis',
        country: 'Mauritius',
      },
    );
    assert.equal(lr.ok, true);
    assert.equal(lr.quotation_party.quotation_to, 'Customer');
    assert.equal(lr.sales_invoice_party.customer, 'CF880 Synthetic Lead Rescue Ltd');
    assert.ok(lr.warnings.includes('PRICE_LIST_CURRENCY_MISMATCH'));

    const wr = evaluateQuotationSuitability(
      {
        name: 'CF880 Synthetic Website Rescue Ltd',
        customer_type: 'Company',
        customer_group: 'Commercial',
        territory: 'Mauritius',
        default_currency: 'MUR',
        default_price_list: 'Standard Selling',
        customer_primary_contact: 'Jean Synthetic-CF880 Synthetic Website Rescue Ltd',
        customer_primary_address: 'CF880 Synthetic Website Rescue Ltd-Billing',
        disabled: 0,
      },
      { name: 'Jean Synthetic-CF880 Synthetic Website Rescue Ltd', email_id: 'jean.synthetic@example.invalid' },
      {
        name: 'CF880 Synthetic Website Rescue Ltd-Billing',
        address_line1: '2 Synthetic Avenue',
        city: 'Curepipe',
        country: 'Mauritius',
      },
    );
    assert.equal(wr.ok, true);
    assert.equal(wr.warnings.length, 0);
  });

  it('hands off a pointer to delivery without copying commercial master data', () => {
    const handoff = buildDeliveryHandoff({
      customer_name: 'CF880 Synthetic Lead Rescue Ltd',
      product: 'ai-lead-rescue',
      financially_approved: true,
    });
    assert.equal(handoff.commercial_master, 'erpnext');
    assert.equal(handoff.next_state, 'approved_to_onboard');
    assert.equal(handoff.do_not_copy_commercial_fields_into_delivery, true);
    assert.deepEqual(splitPersonName('Priya Synthetic'), { first_name: 'Priya', last_name: 'Synthetic' });
  });

  it('fixtures stay synthetic and onboarding docs point at ERPNext commercial master', () => {
    for (const fixture of [LR_FIXTURE, WR_FIXTURE]) {
      assert.equal(fixture.synthetic, true);
      assert.ok(String(fixture.working_email || '').endsWith('.invalid') || String(fixture.working_email || '').includes('example'));
      assert.equal(listForbiddenSecretKeys(fixture).length, 0);
    }
    const lrDoc = read('docs/operations/LEAD_RESCUE_ONBOARDING_AND_DELIVERY_V1.md');
    const wrDoc = read('docs/operations/WEBSITE_RESCUE_ONBOARDING_AND_DELIVERY_V1.md');
    assert.ok(lrDoc.includes('ERPNEXT_CLIENT_MASTER_V1.md'));
    assert.ok(wrDoc.includes('ERPNEXT_CLIENT_MASTER_V1.md'));
    assert.ok(read('docs/erpnext/ERPNEXT_RECORD_MAPPING.md').includes('ERPNEXT_CLIENT_MASTER_V1.md'));
  });
});
