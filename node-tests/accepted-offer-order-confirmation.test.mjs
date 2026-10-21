import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  BAD_ADDRESS_CHANGE_OFFER,
  createOrderConfirmationLedger,
  DOCUMENT_ROLES,
  isClientReadyOrderConfirmation,
  issueAcceptedOfferOrderConfirmation,
  orderConfirmationItemGroupParent,
  retrieveOrderConfirmation,
  SYNTHETIC_SUBMITTED_ORDER_STATUS,
} from '../lib/erpnext/accepted-offer-order-confirmation.js';
import { loadCommercialDocumentsConfig } from '../lib/erpnext/commercial-documents.js';
import { getCatalogueItem } from '../lib/erpnext/product-catalogue.js';
import { renderProfessionalSalesOrder } from '../lib/erpnext/sales-order-print-render.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const template = readFileSync(
  path.join(root, 'templates/erpnext/sales-order/corpflowai-professional-sales-order.html'),
  'utf8',
);

function parentOf(group) {
  return orderConfirmationItemGroupParent(group, root);
}

function badRequest(overrides = {}) {
  return {
    synthetic: true,
    document_role: DOCUMENT_ROLES.order_confirmation,
    correlation_id: 'SYN-BAD-ADDRESS-CHANGE-001',
    item_code: 'BAD-ADDRESS-CHANGE',
    customer_name: 'Synthetic BAD Address Change (Pty) Ltd',
    contact_name: 'Synthetic Contact',
    contact_email: 'synthetic.bad.address@example.test',
    address_lines: ['Synthetic test address only', 'No real premises'],
    acceptance: { status: 'accepted', accepted_at: '2026-10-20T09:00:00Z' },
    repoRoot: root,
    ...overrides,
  };
}

function corpFlowRequest(overrides = {}) {
  const customer = loadCommercialDocumentsConfig(root).synthetic_proof.lead_rescue_customer;
  return {
    synthetic: true,
    document_role: DOCUMENT_ROLES.order_confirmation,
    correlation_id: 'SYN-CF-LEAD-RESCUE-150-001',
    item_code: 'LR-SETUP-USD-150',
    customer_name: customer,
    contact_name: 'Synthetic Contact',
    contact_email: 'synthetic.lead.rescue@example.test',
    address_lines: ['Synthetic test address only'],
    acceptance: { status: 'accepted', accepted_at: '2026-10-20T09:30:00Z' },
    repoRoot: root,
    ...overrides,
  };
}

test('Business Admin Desk accepted address-change renders one branded order confirmation', () => {
  const ledger = createOrderConfirmationLedger();
  const issued = issueAcceptedOfferOrderConfirmation(ledger, badRequest());
  assert.equal(issued.ok, true);
  assert.equal(issued.code, 'ISSUED');
  assert.equal(issued.brand, 'business_admin_desk');
  assert.equal(issued.offer.item_code, 'BAD-ADDRESS-CHANGE');
  assert.equal(issued.offer.currency, 'ZAR');
  assert.equal(issued.offer.rate, BAD_ADDRESS_CHANGE_OFFER.rate);
  assert.equal(issued.order.currency, 'ZAR');
  assert.equal(issued.order.grand_total, 69);
  assert.equal(issued.order.docstatus, 1);
  assert.equal(issued.order.status, SYNTHETIC_SUBMITTED_ORDER_STATUS);
  assert.equal(issued.order.acceptance_status, 'accepted');
  assert.equal(isClientReadyOrderConfirmation(issued.order), true);
  assert.equal(issued.order.buyer_invoice_created, false);
  assert.equal(issued.order.payment_entry_created, false);
  assert.equal(issued.fulfilment.delivery_verified, false);
  assert.equal(issued.confirmation.document_role, 'order_confirmation');
  assert.equal(issued.confirmation.document_status, 'accepted_order_confirmation');
  assert.equal(issued.confirmation.tax_invoice_issued, false);
  assert.equal(issued.confirmation.payment_receipt_issued, false);
  assert.equal(issued.pdf, null);
  assert.equal(issued.pdf_gate.status, 'NOT_GENERATED');
  assert.match(issued.html, /Business Admin Desk/);
  assert.match(issued.html, /A CorpFlowAI LTD trading identity/);
  assert.match(issued.html, /CorpFlowAI LTD/);
  assert.match(issued.html, /C25228280/);
  assert.match(issued.html, /28466939/);
  assert.match(issued.html, /Dextra Lane Lot No\. 3 Phase 1/);
  assert.match(issued.html, /\+230 5901 4284/);
  assert.match(issued.html, /businessadmindesk\.co\.za/);
  assert.match(issued.html, /Order Confirmation/);
  assert.match(issued.html, /Accepted Service Offer/);
  assert.match(issued.html, /Registered-address change/);
  assert.match(issued.html, /ZAR 69\.00/);
  assert.match(issued.html, /ZAR Sixty Nine only/);
  assert.match(issued.html, new RegExp(issued.offer.name));
  assert.match(issued.html, new RegExp(issued.order.name));
  assert.match(issued.html, new RegExp(issued.fulfilment.name));
  assert.match(issued.html, /Synthetic BAD Address Change \(Pty\) Ltd/);
  assert.match(issued.html, /not a tax invoice and it is not a payment receipt/);
  assert.match(issued.html, /To Deliver and Bill/);
  assert.doesNotMatch(issued.html, /ORDER STATE ERROR/);
  assert.doesNotMatch(issued.html, /finance@corpflowai\.com/);
  assert.doesNotMatch(issued.html, /<script>/);
});

test('CorpFlowAI standard offer uses the same confirmation mechanism', () => {
  const catalogue = getCatalogueItem('LR-SETUP-USD-150', root);
  const ledger = createOrderConfirmationLedger();
  const issued = issueAcceptedOfferOrderConfirmation(ledger, corpFlowRequest());
  assert.equal(issued.ok, true);
  assert.equal(issued.brand, 'corpflowai');
  assert.equal(issued.offer.item_code, 'LR-SETUP-USD-150');
  assert.equal(issued.offer.currency, 'USD');
  assert.equal(issued.offer.rate, 150);
  assert.equal(issued.offer.rate, catalogue.prices.find((row) => row.authority === 'canonical').rate);
  assert.ok(issued.html.includes('<strong style="color:#10233B;font-size:14px;">CorpFlowAI</strong>'));
  assert.match(issued.html, /CorpFlowAI LTD &middot; Mauritius/);
  assert.match(issued.html, /finance@corpflowai\.com/);
  assert.match(issued.html, /corpflowai\.com/);
  assert.match(issued.html, /C25228280/);
  assert.match(issued.html, /28466939/);
  assert.match(issued.html, /AI Lead Rescue Setup \(USD 150 launch pilot\)/);
  assert.match(issued.html, /USD 150\.00/);
  assert.match(issued.html, /USD One Hundred Fifty only/);
  assert.match(issued.html, /No revenue, lead-volume, or conversion guarantees/);
  assert.match(issued.html, /Order Confirmation/);
  assert.match(issued.html, /Accepted Service Offer/);
  assert.match(issued.html, new RegExp(issued.customer.customer_name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.doesNotMatch(issued.html, /businessadmindesk\.co\.za/);
  assert.doesNotMatch(issued.html, /Business Admin Desk/);
});

test('replay and retrieval stay idempotent and create no financial documents', () => {
  const ledger = createOrderConfirmationLedger();
  const first = issueAcceptedOfferOrderConfirmation(ledger, badRequest());
  const second = issueAcceptedOfferOrderConfirmation(ledger, badRequest());
  const fetched = retrieveOrderConfirmation(ledger, 'SYN-BAD-ADDRESS-CHANGE-001');
  assert.equal(second.code, 'REPLAYED');
  assert.equal(second.replayed, true);
  assert.equal(fetched.code, 'RETRIEVED');
  assert.equal(second.confirmation.name, first.confirmation.name);
  assert.equal(second.order.name, first.order.name);
  assert.equal(second.offer.name, first.offer.name);
  assert.equal(second.html, first.html);
  assert.equal(fetched.html, first.html);
  assert.equal(ledger.confirmations.length, 1);
  assert.equal(ledger.orders.length, 1);
  assert.equal(ledger.offers.length, 1);
  assert.equal(ledger.customers.length, 1);
  assert.equal(ledger.fulfilments.length, 1);
  assert.equal(ledger.sales_invoices.length, 0);
  assert.equal(ledger.payment_entries.length, 0);
  assert.equal(ledger.outbound_messages.length, 0);
  assert.equal(ledger.erpnext_writes.length, 0);
  assert.equal(second.sales_invoice_count, 0);
  assert.equal(second.payment_entry_count, 0);
  assert.equal(second.http_route, null);
  assert.equal(second.pdf, null);
});

test('draft, invoice, receipt, mixed brand, unknown offer, and conflicts are refused', () => {
  const ledger = createOrderConfirmationLedger();
  const draft = issueAcceptedOfferOrderConfirmation(ledger, badRequest({
    acceptance: { status: 'draft' },
  }));
  assert.equal(draft.ok, false);
  assert.equal(draft.code, 'DRAFT_NOT_CONFIRMABLE');
  assert.equal(ledger.orders.length, 0);

  const invoice = issueAcceptedOfferOrderConfirmation(ledger, badRequest({
    document_role: DOCUMENT_ROLES.tax_invoice,
  }));
  assert.equal(invoice.code, 'TAX_INVOICE_NOT_ISSUED_HERE');
  const receipt = issueAcceptedOfferOrderConfirmation(ledger, badRequest({
    document_role: DOCUMENT_ROLES.payment_receipt,
  }));
  assert.equal(receipt.code, 'PAYMENT_RECEIPT_NOT_ISSUED_HERE');
  assert.equal(issueAcceptedOfferOrderConfirmation(ledger, badRequest({
    item_code: 'NOT-A-SERVICE',
  })).code, 'UNKNOWN_OR_UNAPPROVED_OFFER');
  assert.equal(issueAcceptedOfferOrderConfirmation(ledger, badRequest({
    rate: 1,
  })).code, 'PRICE_NOT_APPROVED');
  assert.equal(issueAcceptedOfferOrderConfirmation(ledger, badRequest({
    synthetic: false,
  })).code, 'LIVE_CUSTOMER_FORBIDDEN');
  assert.equal(issueAcceptedOfferOrderConfirmation(ledger, badRequest({
    customer_name: 'Real Customer Ltd',
  })).code, 'CUSTOMER_NOT_EXPLICITLY_SYNTHETIC');

  const issued = issueAcceptedOfferOrderConfirmation(ledger, badRequest());
  assert.equal(issued.ok, true);
  const conflict = issueAcceptedOfferOrderConfirmation(ledger, badRequest({
    customer_name: 'Synthetic Other Buyer Ltd',
  }));
  const emailConflict = issueAcceptedOfferOrderConfirmation(ledger, badRequest({
    contact_email: 'synthetic.other@example.test',
  }));
  assert.equal(emailConflict.code, 'CORRELATION_CONFLICT');
  assert.equal(conflict.code, 'CORRELATION_CONFLICT');
  assert.equal(ledger.orders.length, 1);
  assert.equal(ledger.sales_invoices.length, 0);
  assert.equal(ledger.payment_entries.length, 0);
});

test('mixed and unknown item groups fail closed in the print format', () => {
  const mixed = renderProfessionalSalesOrder({
    name: 'SAL-ORD-SYN-MIXED',
    customer_name: 'Synthetic Mixed Brand Ltd',
    status: 'Accepted',
    docstatus: 0,
    currency: 'ZAR',
    transaction_date: '2026-10-20',
    items: [
      { item_name: 'Registered-address change', item_group: 'BAD Administration', qty: 1, uom: 'Nos', rate: 69, amount: 69 },
      { item_name: 'AI Lead Rescue Setup (USD 150 launch pilot)', item_group: 'CF Lead Rescue', qty: 1, uom: 'Nos', rate: 150, amount: 150 },
    ],
    taxes: [],
    total: 219,
    grand_total: 219,
  }, { parentOf });
  assert.match(mixed.html, /BRAND CLASSIFICATION ERROR \/ NOT CLIENT-READY/);
  assert.doesNotMatch(mixed.html, /Accepted Service Offer/);
  assert.doesNotMatch(mixed.html, /businessadmindesk\.co\.za/);

  const unknown = renderProfessionalSalesOrder({
    name: 'SAL-ORD-SYN-UNKNOWN',
    customer_name: 'Synthetic Unknown Group Ltd',
    status: 'Accepted',
    docstatus: 0,
    currency: 'ZAR',
    transaction_date: '2026-10-20',
    items: [
      { item_name: 'Unclassified service', item_group: 'Services', qty: 1, uom: 'Nos', rate: 69, amount: 69 },
    ],
    taxes: [],
    total: 69,
    grand_total: 69,
  }, { parentOf });
  assert.match(unknown.html, /NOT CLIENT-READY/);
  assert.doesNotMatch(unknown.html, /Accepted Service Offer/);
});

test('draft print status stays a sales order and customer markup is escaped', () => {
  const draft = renderProfessionalSalesOrder({
    name: 'SAL-ORD-SYN-DRAFT',
    customer_name: 'Synthetic <script>alert(1)</script> Ltd',
    status: 'Draft',
    docstatus: 0,
    currency: 'ZAR',
    transaction_date: '2026-10-20',
    items: [
      {
        item_name: 'Registered-address change',
        description: '<script>alert(1)</script>',
        item_group: 'BAD Administration',
        qty: 1,
        uom: 'Nos',
        rate: 69,
        amount: 69,
      },
    ],
    taxes: [],
    total: 69,
    grand_total: 69,
    in_words: 'ZAR Sixty Nine only',
  }, { parentOf });
  assert.match(draft.html, /Sales Order/);
  assert.doesNotMatch(draft.html, /Accepted Service Offer/);
  assert.match(draft.html, /Synthetic &lt;script&gt;alert\(1\)&lt;\/script&gt; Ltd/);
  assert.match(draft.html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(draft.html, /<script>/);
  assert.match(template, /Order Confirmation/);
  assert.match(template, /not a tax invoice and it is not a payment receipt/);
  assert.match(template, /doc\.docstatus == 1 and confirmation_status/);
});

test('draft Sales Order marked Accepted does not render as customer confirmation', () => {
  const unsafe = renderProfessionalSalesOrder({
    name: 'SAL-ORD-SYN-DRAFT-ACCEPTED',
    customer_name: 'Synthetic Draft Accepted Ltd',
    status: 'Accepted',
    docstatus: 0,
    currency: 'ZAR',
    transaction_date: '2026-10-20',
    po_no: 'OFF-SYN-BAD-UNSAFE',
    items: [
      {
        item_name: 'Registered-address change',
        item_group: 'BAD Administration',
        qty: 1,
        uom: 'Nos',
        rate: 69,
        amount: 69,
      },
    ],
    taxes: [],
    total: 69,
    grand_total: 69,
  }, { parentOf });
  assert.equal(isClientReadyOrderConfirmation({ docstatus: 0, status: 'Accepted' }), false);
  assert.match(unsafe.html, /ORDER STATE ERROR \/ NOT CLIENT-READY/);
  assert.match(unsafe.html, /Sales Order/);
  assert.doesNotMatch(unsafe.html, /Accepted Service Offer/);
  assert.doesNotMatch(unsafe.html, /<div class="subtitle">Order Confirmation<\/div>/);
});

test('cancelled and unknown submitted states are not accepted confirmations', () => {
  const cancelled = renderProfessionalSalesOrder({
    name: 'SAL-ORD-SYN-CANCELLED',
    customer_name: 'Synthetic Cancelled Ltd',
    status: 'Cancelled',
    docstatus: 2,
    currency: 'ZAR',
    transaction_date: '2026-10-20',
    items: [
      {
        item_name: 'Registered-address change',
        item_group: 'BAD Administration',
        qty: 1,
        uom: 'Nos',
        rate: 69,
        amount: 69,
      },
    ],
    taxes: [],
    total: 69,
    grand_total: 69,
  }, { parentOf });
  assert.equal(isClientReadyOrderConfirmation({ docstatus: 2, status: 'Cancelled' }), false);
  assert.match(cancelled.html, /Sales Order/);
  assert.doesNotMatch(cancelled.html, /Accepted Service Offer/);

  const unknownStatus = renderProfessionalSalesOrder({
    name: 'SAL-ORD-SYN-UNKNOWN-STATUS',
    customer_name: 'Synthetic Unknown Status Ltd',
    status: 'Mystery',
    docstatus: 1,
    currency: 'ZAR',
    transaction_date: '2026-10-20',
    items: [
      {
        item_name: 'Registered-address change',
        item_group: 'BAD Administration',
        qty: 1,
        uom: 'Nos',
        rate: 69,
        amount: 69,
      },
    ],
    taxes: [],
    total: 69,
    grand_total: 69,
  }, { parentOf });
  assert.equal(isClientReadyOrderConfirmation({ docstatus: 1, status: 'Mystery' }), false);
  assert.doesNotMatch(unknownStatus.html, /Accepted Service Offer/);

  const submitted = renderProfessionalSalesOrder({
    name: 'SAL-ORD-SYN-SUBMITTED',
    customer_name: 'Synthetic Submitted Ltd',
    status: SYNTHETIC_SUBMITTED_ORDER_STATUS,
    docstatus: 1,
    currency: 'ZAR',
    transaction_date: '2026-10-20',
    items: [
      {
        item_name: 'Registered-address change',
        item_group: 'BAD Administration',
        qty: 1,
        uom: 'Nos',
        rate: 69,
        amount: 69,
      },
    ],
    taxes: [],
    total: 69,
    grand_total: 69,
  }, { parentOf });
  assert.equal(isClientReadyOrderConfirmation({
    docstatus: 1,
    status: SYNTHETIC_SUBMITTED_ORDER_STATUS,
  }), true);
  assert.match(submitted.html, /Accepted Service Offer/);
  assert.match(submitted.html, /Order Confirmation/);
});

test('committed synthetic previews match a fresh render', () => {
  const bad = issueAcceptedOfferOrderConfirmation(createOrderConfirmationLedger(), badRequest());
  const corp = issueAcceptedOfferOrderConfirmation(createOrderConfirmationLedger(), corpFlowRequest());
  const badFile = readFileSync(path.join(root, 'fixtures/erpnext-order-confirmation/bad-address-change-order-confirmation.html'), 'utf8');
  const corpFile = readFileSync(path.join(root, 'fixtures/erpnext-order-confirmation/corpflowai-lead-rescue-order-confirmation.html'), 'utf8');
  assert.equal(badFile.includes(bad.html), true);
  assert.equal(corpFile.includes(corp.html), true);
  assert.match(badFile, /Order Confirmation/);
  assert.match(corpFile, /Accepted Service Offer/);
  assert.doesNotMatch(badFile, /%PDF/);
  assert.doesNotMatch(corpFile, /%PDF/);
});

test('confirmation module does not expose an HTTP route or paddle bridge', () => {
  const source = readFileSync(path.join(root, 'lib/erpnext/accepted-offer-order-confirmation.js'), 'utf8');
  const renderer = readFileSync(path.join(root, 'lib/erpnext/sales-order-print-render.js'), 'utf8');
  assert.doesNotMatch(source, /pages\/api|NextApiRequest|res\.end|fetch\(/);
  assert.doesNotMatch(renderer, /pages\/api|NextApiRequest|paddle/i);
  assert.doesNotMatch(source, /bad-order-bridge|bad-zar-catalog|webhook/);
  assert.equal(retrieveOrderConfirmation(createOrderConfirmationLedger(), 'SYN-MISSING').code, 'NOT_FOUND');
});
