/**
 * Synthetic accepted-offer order confirmation (#1494).
 *
 * Connects one accepted standard offer to one internal Sales Order and the
 * existing ERPNext Sales Order print format. Memory only. It does not write
 * to ERPNext, create a Sales Invoice or Payment Entry, take payment, or send
 * a message.
 */

import { getCatalogueItem, loadProductCatalogue, toPlainCommercialText } from './product-catalogue.js';
import {
  classifyQuotationBrand,
  isClientReadyQuotationBrand,
} from '../../templates/erpnext/quotation/quotation-brand-routing.mjs';
import {
  escapeHtml,
  markSafe,
  NATIVE_SALES_ORDER_PDF_GATE,
  renderProfessionalSalesOrder,
} from './sales-order-print-render.js';

export const DOCUMENT_ROLES = Object.freeze({
  order_confirmation: 'order_confirmation',
  tax_invoice: 'tax_invoice',
  payment_receipt: 'payment_receipt',
});

/** Submitted ERPNext Sales Order statuses that may use the confirmation title. */
export const CONFIRMATION_ORDER_STATUSES = Object.freeze([
  'To Deliver and Bill',
  'To Deliver',
  'To Bill',
  'Completed',
  'Accepted',
]);

export const SYNTHETIC_SUBMITTED_ORDER_STATUS = 'To Deliver and Bill';

export function isClientReadyOrderConfirmation(doc = {}) {
  const docstatus = Number(doc.docstatus);
  const status = String(doc.status || '').trim();
  return docstatus === 1 && CONFIRMATION_ORDER_STATUSES.includes(status);
}

/**
 * Fixed price for BAD-ADDRESS-CHANGE from the approved ZAR catalogue on
 * PR #1488. This module does not own Paddle price IDs or the purchase bridge.
 */
export const BAD_ADDRESS_CHANGE_OFFER = Object.freeze({
  item_code: 'BAD-ADDRESS-CHANGE',
  item_name: 'Registered-address change',
  description: 'Registered-address change',
  item_group: 'BAD Administration',
  uom: 'Nos',
  currency: 'ZAR',
  rate: 69,
  source: 'PR #1488 approved Business Admin Desk ZAR catalogue',
});

const ONES = [
  'Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function fail(code, extra = {}) {
  return {
    ok: false,
    code,
    replayed: false,
    confirmation: null,
    offer: null,
    order: null,
    fulfilment: null,
    customer: null,
    html: null,
    pdf: null,
    pdf_gate: NATIVE_SALES_ORDER_PDF_GATE,
    sales_invoice_count: extra.sales_invoice_count || 0,
    payment_entry_count: extra.payment_entry_count || 0,
    outbound_message_count: extra.outbound_message_count || 0,
    erpnext_write_count: extra.erpnext_write_count || 0,
    http_route: null,
    ...extra,
  };
}

function integerWords(value) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0 || number > 999999) {
    const error = new Error('AMOUNT_WORDS_UNSUPPORTED');
    error.code = 'AMOUNT_WORDS_UNSUPPORTED';
    throw error;
  }
  if (number < 20) return ONES[number];
  if (number < 100) {
    const ten = TENS[Math.floor(number / 10)];
    return number % 10 === 0 ? ten : `${ten} ${ONES[number % 10]}`;
  }
  if (number < 1000) {
    const rest = number % 100;
    return `${ONES[Math.floor(number / 100)]} Hundred${rest ? ` ${integerWords(rest)}` : ''}`;
  }
  const rest = number % 1000;
  return `${integerWords(Math.floor(number / 1000))} Thousand${rest ? ` ${integerWords(rest)}` : ''}`;
}

export function amountInWords(amount, currency) {
  return `${currency} ${integerWords(amount)} only`;
}

export function orderConfirmationItemGroupParent(itemGroup, repoRoot) {
  const name = String(itemGroup || '').trim();
  const catalogue = loadProductCatalogue(repoRoot);
  const row = (catalogue.item_groups || []).find((group) => group.name === name);
  if (row) return row.parent_item_group || null;
  if (name === 'BAD Administration' || name === 'Business Admin Desk Services') {
    return name === 'BAD Administration' ? 'Business Admin Desk Services' : 'All Item Groups';
  }
  if (name === 'Services') return 'All Item Groups';
  return null;
}

export function resolveApprovedStandardOffer(itemCode, repoRoot) {
  if (itemCode === BAD_ADDRESS_CHANGE_OFFER.item_code) {
    return { ...BAD_ADDRESS_CHANGE_OFFER };
  }
  const item = getCatalogueItem(itemCode, repoRoot);
  if (!item || item.public_offer !== true) return null;
  const price = (item.prices || []).find((row) => row.authority === 'canonical' && Number.isFinite(Number(row.rate)));
  if (!price) return null;
  return {
    item_code: item.item_code,
    item_name: item.item_name,
    description: toPlainCommercialText(item.commercial_description),
    item_group: item.item_group,
    uom: item.stock_uom || 'Nos',
    currency: String(price.currency),
    rate: Number(price.rate),
    source: 'config/erpnext-product-catalogue.v1.json',
  };
}

export function createOrderConfirmationLedger() {
  return {
    customers: [],
    offers: [],
    orders: [],
    fulfilments: [],
    confirmations: [],
    sales_invoices: [],
    payment_entries: [],
    outbound_messages: [],
    erpnext_writes: [],
  };
}

function counts(ledger) {
  return {
    sales_invoice_count: ledger.sales_invoices.length,
    payment_entry_count: ledger.payment_entries.length,
    outbound_message_count: ledger.outbound_messages.length,
    erpnext_write_count: ledger.erpnext_writes.length,
  };
}

function snapshot(record, code) {
  return {
    ok: true,
    code,
    replayed: record.replayed === true,
    confirmation: record.confirmation,
    offer: record.offer,
    order: record.order,
    fulfilment: record.fulfilment,
    customer: record.customer,
    html: record.confirmation.html,
    pdf: null,
    pdf_gate: NATIVE_SALES_ORDER_PDF_GATE,
    http_route: null,
    brand: record.confirmation.brand,
    ...counts(record.ledger),
  };
}

function storedBundle(ledger, correlationId) {
  const confirmation = ledger.confirmations.find((row) => row.correlation_id === correlationId) || null;
  if (!confirmation) return null;
  return {
    ledger,
    replayed: true,
    confirmation,
    offer: ledger.offers.find((row) => row.name === confirmation.offer_name) || null,
    order: ledger.orders.find((row) => row.name === confirmation.order_name) || null,
    fulfilment: ledger.fulfilments.find((row) => row.name === confirmation.fulfilment_name) || null,
    customer: ledger.customers.find((row) => row.name === confirmation.customer_name_id) || null,
  };
}

function syntheticAddress(lines) {
  const html = (Array.isArray(lines) ? lines : [])
    .map((line) => escapeHtml(line))
    .filter(Boolean)
    .join('<br>');
  return markSafe(html);
}

function confirmationTerms({ offerName, orderName, fulfilmentName }) {
  const paragraph = (text) => `<p>${escapeHtml(text)}</p>`;
  return markSafe([
    paragraph(`Accepted offer reference: ${offerName}`),
    paragraph(`Sales order reference: ${orderName}`),
    paragraph(`Fulfilment reference: ${fulfilmentName}. Delivery is not verified.`),
    paragraph('This document is an order confirmation for the accepted service offer. It is not a tax invoice and it is not a payment receipt.'),
    paragraph('Payment was not executed by this document. No sales invoice or payment receipt was created.'),
    paragraph('Synthetic proof only. No message was sent and no ERPNext record was written.'),
  ].join(''));
}

function brandForOffer(offer, repoRoot) {
  const parentOf = (group) => orderConfirmationItemGroupParent(group, repoRoot);
  return {
    parentOf,
    classification: classifyQuotationBrand([offer.item_group], parentOf),
  };
}

export function issueAcceptedOfferOrderConfirmation(ledger, request = {}) {
  const baseCounts = counts(ledger);
  const role = String(request.document_role || '').trim();
  if (role === DOCUMENT_ROLES.tax_invoice) return fail('TAX_INVOICE_NOT_ISSUED_HERE', baseCounts);
  if (role === DOCUMENT_ROLES.payment_receipt) return fail('PAYMENT_RECEIPT_NOT_ISSUED_HERE', baseCounts);
  if (role !== DOCUMENT_ROLES.order_confirmation) return fail('DOCUMENT_ROLE_REQUIRED', baseCounts);
  if (request.synthetic !== true) return fail('LIVE_CUSTOMER_FORBIDDEN', baseCounts);

  const correlationId = String(request.correlation_id || '').trim();
  if (!correlationId.startsWith('SYN-')) return fail('SYNTHETIC_CORRELATION_REQUIRED', baseCounts);

  const customerName = String(request.customer_name || '').trim();
  const contactEmail = String(request.contact_email || '').trim().toLowerCase();
  const linkedCustomer = request.linked_records?.customer || null;
  if (!/synthetic/i.test(customerName) && linkedCustomer?.synthetic !== true) {
    return fail('CUSTOMER_NOT_EXPLICITLY_SYNTHETIC', baseCounts);
  }
  if (!contactEmail.endsWith('@example.test')) return fail('SYNTHETIC_CONTACT_REQUIRED', baseCounts);

  const acceptanceStatus = String(request.acceptance?.status || '').trim().toLowerCase();
  if (acceptanceStatus !== 'accepted') return fail('DRAFT_NOT_CONFIRMABLE', baseCounts);

  const offer = resolveApprovedStandardOffer(request.item_code, request.repoRoot);
  if (!offer) return fail('UNKNOWN_OR_UNAPPROVED_OFFER', baseCounts);
  if (request.currency !== undefined && String(request.currency) !== offer.currency) {
    return fail('CURRENCY_NOT_APPROVED', baseCounts);
  }
  if (request.rate !== undefined && Number(request.rate) !== offer.rate) {
    return fail('PRICE_NOT_APPROVED', baseCounts);
  }

  const { parentOf, classification } = brandForOffer(offer, request.repoRoot);
  if (!isClientReadyQuotationBrand(classification)) {
    return fail('BRAND_NOT_CLIENT_READY', { ...baseCounts, brand_classification: classification });
  }

  const existing = ledger.confirmations.find((row) => row.correlation_id === correlationId);
  if (existing) {
    if (
      existing.customer_name !== customerName
      || existing.item_code !== offer.item_code
      || existing.contact_email !== contactEmail
    ) {
      return fail('CORRELATION_CONFLICT', baseCounts);
    }
    return snapshot(storedBundle(ledger, correlationId), 'REPLAYED');
  }

  const sequence = ledger.confirmations.length + 1;
  const prefix = classification === 'business_admin_desk' ? 'BAD' : 'CF';
  const customer = linkedCustomer || {
    name: `CUST-SYN-${prefix}-${sequence}`,
    customer_name: customerName,
    contact_name: String(request.contact_name || 'Synthetic Contact'),
    contact_email: contactEmail,
    synthetic: true,
  };
  const offerRecord = {
    name: `OFF-SYN-${prefix}-${sequence}`,
    kind: 'accepted_standard_offer',
    item_code: offer.item_code,
    item_name: offer.item_name,
    currency: offer.currency,
    rate: offer.rate,
    acceptance_status: 'accepted',
    accepted_at: String(request.acceptance.accepted_at || '2026-10-20T09:00:00Z'),
    source: offer.source,
    correlation_id: correlationId,
  };
  const order = request.linked_records?.order || {
    name: `SAL-ORD-SYN-${prefix}-${sequence}`,
    doctype: 'Sales Order',
    docstatus: 1,
    status: SYNTHETIC_SUBMITTED_ORDER_STATUS,
    acceptance_status: 'accepted',
    acceptance_evidence: {
      status: 'accepted',
      accepted_at: offerRecord.accepted_at,
      synthetic: true,
    },
    customer: customer.name,
    customer_name: customerName,
    currency: offer.currency,
    selling_price_list: null,
    item_code: offer.item_code,
    grand_total: offer.rate,
    correlation_id: correlationId,
    commercial_role: 'internal_order_correlation',
    buyer_invoice_created: false,
    payment_entry_created: false,
  };
  const fulfilment = request.linked_records?.fulfilment || {
    name: `FUL-SYN-${prefix}-${sequence}`,
    order_name: order.name,
    offer_name: offerRecord.name,
    correlation_id: correlationId,
    status: 'correlated',
    delivery_verified: false,
  };
  const transactionDate = offerRecord.accepted_at.slice(0, 10);
  const rendered = renderProfessionalSalesOrder({
    name: order.name,
    customer_name: customerName,
    contact_display: customer.contact_name,
    contact_email: contactEmail,
    address_display: syntheticAddress(request.address_lines || ['Synthetic test address only']),
    status: SYNTHETIC_SUBMITTED_ORDER_STATUS,
    docstatus: 1,
    transaction_date: transactionDate,
    delivery_date: '',
    currency: offer.currency,
    po_no: offerRecord.name,
    company: 'CorpFlowAI LTD',
    items: [{
      item_code: offer.item_code,
      item_name: offer.item_name,
      description: offer.description,
      item_group: offer.item_group,
      qty: 1,
      uom: offer.uom,
      rate: offer.rate,
      amount: offer.rate,
    }],
    taxes: [],
    total: offer.rate,
    grand_total: offer.rate,
    discount_amount: 0,
    in_words: amountInWords(offer.rate, offer.currency),
    terms: confirmationTerms({
      offerName: offerRecord.name,
      orderName: order.name,
      fulfilmentName: fulfilment.name,
    }),
  }, { parentOf, repoRoot: request.repoRoot });

  if (!isClientReadyOrderConfirmation(order) || !rendered.html.includes('Accepted Service Offer')) {
    return fail('ORDER_NOT_SUBMITTED_FOR_CONFIRMATION', baseCounts);
  }

  const confirmation = {
    name: `OC-SYN-${prefix}-${sequence}`,
    document_role: DOCUMENT_ROLES.order_confirmation,
    document_status: 'accepted_order_confirmation',
    brand: classification,
    correlation_id: correlationId,
    offer_name: offerRecord.name,
    order_name: order.name,
    fulfilment_name: fulfilment.name,
    customer_name_id: customer.name,
    customer_name: customerName,
    contact_email: contactEmail,
    item_code: offer.item_code,
    currency: offer.currency,
    rate: offer.rate,
    html: rendered.html,
    pdf: null,
    pdf_gate: rendered.pdf_gate,
    tax_invoice_issued: false,
    payment_receipt_issued: false,
    payment_executed: false,
    email_sent: false,
    erpnext_written: false,
  };

  ledger.customers.push(customer);
  ledger.offers.push(offerRecord);
  ledger.orders.push(order);
  ledger.fulfilments.push(fulfilment);
  ledger.confirmations.push(confirmation);

  return snapshot({
    ledger,
    replayed: false,
    confirmation,
    offer: offerRecord,
    order,
    fulfilment,
    customer,
  }, 'ISSUED');
}

export function retrieveOrderConfirmation(ledger, correlationId) {
  const bundle = storedBundle(ledger, String(correlationId || '').trim());
  if (!bundle) return fail('NOT_FOUND', counts(ledger));
  return snapshot(bundle, 'RETRIEVED');
}
