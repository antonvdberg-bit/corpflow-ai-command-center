/**
 * ERPNext adapter for BAD Paddle sandbox purchases.
 * Production writes stay disabled. Tests inject this memory adapter.
 */

import {
  createOrderConfirmationLedger,
  DOCUMENT_ROLES,
  issueAcceptedOfferOrderConfirmation,
} from '../../erpnext/accepted-offer-order-confirmation.js';

export const BAD_ERPNEXT_WRITE_MODES = Object.freeze(['disabled', 'synthetic', 'isolated_sandbox']);

export function getBadErpnextWriteMode(env = process.env) {
  const raw = String(env.PADDLE_BAD_ERPNEXT_MODE || 'disabled').trim();
  if (raw === 'isolated_sandbox') return 'isolated_sandbox';
  if (raw === 'synthetic') return 'synthetic';
  return 'disabled';
}

export function productionErpnextWritesAllowed(_mode = getBadErpnextWriteMode()) {
  return false;
}

function keyForCustomer(input) {
  return `${String(input.business_email || '').toLowerCase()}|${String(input.legal_business_name || '').toLowerCase()}`;
}

export function createMemoryBadErpnextAdapter(options = {}) {
  const unavailable = Boolean(options.unavailable);
  const delayMs = Number(options.delayMs || 0);
  let failAfter = options.failAfter || null;
  const customers = options.customers || [];
  const orders = options.orders || [];
  const onboardings = options.onboardings || [];
  const confirmationLedger = createOrderConfirmationLedger();
  const confirmations = [];
  const invoices = [];
  const payments = [];
  let tail = Promise.resolve();

  function serialize(fn) {
    const run = tail.then(fn, fn);
    tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  async function guard(stage) {
    if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
    if (unavailable) {
      const error = new Error('ERPNEXT_UNAVAILABLE');
      error.retryable = true;
      error.code = 'ERPNEXT_UNAVAILABLE';
      throw error;
    }
  }

  function failAfterStage(stage) {
    if (failAfter && failAfter === stage) {
      failAfter = null;
      const error = new Error('ERPNEXT_PARTIAL_FAILURE');
      error.retryable = true;
      error.code = 'ERPNEXT_PARTIAL_FAILURE';
      throw error;
    }
  }

  return {
    mode: 'synthetic',
    customers,
    orders,
    onboardings,
    confirmations,
    invoices,
    payments,
    async searchCustomer(input) {
      await guard('search');
      const exactTxn = customers.find((row) => row.correlation_id === input.correlation_id);
      if (exactTxn) return exactTxn;
      return customers.find((row) => keyForCustomer(row) === keyForCustomer(input)) || null;
    },
    async upsertCustomer(input) {
      return serialize(async () => {
        await guard('customer');
        const existing = customers.find((row) => row.correlation_id === input.correlation_id)
          || customers.find((row) => keyForCustomer(row) === keyForCustomer(input));
        if (existing) return existing;
        const created = {
          name: `CUST-BAD-${customers.length + 1}`,
          legal_business_name: input.legal_business_name,
          business_email: input.business_email,
          contact_name: input.contact_name,
          country: input.country,
          correlation_id: input.correlation_id,
          doctype: 'Customer',
          synthetic: true,
        };
        customers.push(created);
        failAfterStage('customer');
        return created;
      });
    },
    async searchOrder(input) {
      await guard('search');
      return (
        orders.find((row) => row.paddle_transaction_id === input.paddle_transaction_id) ||
        orders.find((row) => row.correlation_id === input.correlation_id) ||
        null
      );
    },
    async createInternalSalesOrder(input) {
      return serialize(async () => {
        await guard('order');
        const confirmationEligible = input.item_code === 'BAD-ADDRESS-CHANGE';
        const existing =
          orders.find((row) => row.paddle_transaction_id === input.paddle_transaction_id) ||
          orders.find((row) => row.correlation_id === input.correlation_id) ||
          null;
        if (existing) return existing;
        const created = {
          name: `SAL-ORD-BAD-${orders.length + 1}`,
          doctype: 'Sales Order',
          company: 'CorpFlowAI LTD',
          currency: 'ZAR',
          selling_price_list: 'ZAR Selling',
          customer: input.customer_name,
          item_code: input.item_code,
          item_name: input.item_name,
          rate: input.zar_amount,
          grand_total: input.zar_amount,
          paddle_transaction_id: input.paddle_transaction_id,
          correlation_id: input.correlation_id,
          docstatus: confirmationEligible ? 1 : 0,
          status: confirmationEligible ? 'To Deliver and Bill' : 'Draft',
          commercial_role: 'internal_paid_correlation',
          buyer_invoice_created: false,
          payment_entry_created: false,
          income_account: null,
        };
        orders.push(created);
        failAfterStage('order');
        return created;
      });
    },
    async createBuyerSalesInvoice() {
      throw new Error('PADDLE_MOR_FORBIDS_BUYER_INVOICE');
    },
    async createPaymentEntry() {
      throw new Error('PADDLE_MOR_FORBIDS_PAYMENT_ENTRY');
    },
    async searchOnboarding(input) {
      await guard('search');
      return (
        onboardings.find((row) => row.paddle_transaction_id === input.paddle_transaction_id) ||
        onboardings.find((row) => row.order_name === input.order_name) ||
        null
      );
    },
    async releaseOnboarding(input) {
      return serialize(async () => {
        await guard('onboarding');
        if (input.payment_status !== 'completed') {
          const error = new Error('ONBOARDING_REQUIRES_VERIFIED_PAYMENT');
          error.code = 'ONBOARDING_REQUIRES_VERIFIED_PAYMENT';
          throw error;
        }
        const existing =
          onboardings.find((row) => row.paddle_transaction_id === input.paddle_transaction_id) ||
          onboardings.find((row) => row.order_name === input.order_name) ||
          null;
        if (existing) return existing;
        const created = {
          name: `ONB-BAD-${onboardings.length + 1}`,
          order_name: input.order_name,
          customer_name: input.customer_name,
          item_code: input.item_code,
          paddle_transaction_id: input.paddle_transaction_id,
          correlation_id: input.correlation_id,
          status: 'released',
        };
        onboardings.push(created);
        return created;
      });
    },
    async issueOrderConfirmation(input) {
      return serialize(async () => {
        await guard('confirmation');
        const existing = confirmations.find(
          (row) => row.paddle_transaction_id === input.paddle_transaction_id
            || row.order_name === input.order_name,
        );
        if (existing) return existing;

        const order = orders.find((row) => row.name === input.order_name);
        const customer = customers.find((row) => row.name === input.customer_name);
        const onboarding = onboardings.find((row) => row.name === input.onboarding_name);
        const result = issueAcceptedOfferOrderConfirmation(confirmationLedger, {
          synthetic: true,
          document_role: DOCUMENT_ROLES.order_confirmation,
          correlation_id: `SYN-${input.correlation_id}`,
          item_code: input.item_code,
          currency: 'ZAR',
          rate: input.zar_amount,
          customer_name: customer?.legal_business_name || 'Synthetic BAD Customer',
          contact_name: customer?.contact_name || 'Synthetic Contact',
          contact_email: customer?.business_email || 'synthetic.bad@example.test',
          acceptance: {
            status: 'accepted',
            accepted_at: input.accepted_at || '2026-10-20T09:00:00Z',
          },
          repoRoot: input.repoRoot,
          linked_records: {
            customer: customer ? { ...customer, customer_name: customer.legal_business_name } : null,
            order,
            fulfilment: onboarding
              ? {
                name: onboarding.name,
                order_name: onboarding.order_name,
                offer_name: input.correlation_id,
                correlation_id: input.correlation_id,
                status: 'correlated',
                delivery_verified: false,
              }
              : null,
          },
        });
        if (!result.ok) {
          const error = new Error(result.code);
          error.code = result.code;
          throw error;
        }
        const confirmation = {
          ...result.confirmation,
          html: result.html,
          paddle_transaction_id: input.paddle_transaction_id,
          onboarding_name: input.onboarding_name,
        };
        confirmations.push(confirmation);
        return confirmation;
      });
    },
    async revokeOnboarding(input) {
      return serialize(async () => {
        await guard('revoke');
        const existing =
          onboardings.find((row) => row.paddle_transaction_id === input.paddle_transaction_id) ||
          onboardings.find((row) => row.order_name === input.order_name) ||
          null;
        if (!existing) return null;
        existing.status = 'revoked';
        existing.reason = input.reason || 'refund_or_failure';
        return existing;
      });
    },
  };
}

export function createBadErpnextAdapter(options = {}) {
  const mode = options.mode || getBadErpnextWriteMode(options.env);
  if (mode === 'isolated_sandbox' && options.isolatedAdapter) return options.isolatedAdapter;
  if (mode === 'isolated_sandbox') {
    const error = new Error('ISOLATED_ERPNEXT_ADAPTER_NOT_BOUND');
    error.code = 'ISOLATED_ERPNEXT_ADAPTER_NOT_BOUND';
    throw error;
  }
  if (productionErpnextWritesAllowed(mode)) {
    throw new Error('PRODUCTION_ERPNEXT_WRITES_FORBIDDEN');
  }
  return createMemoryBadErpnextAdapter(options);
}
