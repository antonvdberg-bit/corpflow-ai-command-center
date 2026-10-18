/**
 * ERPNext adapter for BAD Paddle sandbox purchases.
 * Production writes stay disabled. Tests inject this memory adapter.
 */

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
  const customers = options.customers || [];
  const orders = options.orders || [];
  const onboardings = options.onboardings || [];
  const invoices = [];
  const payments = [];

  async function guard() {
    if (unavailable) {
      const error = new Error('ERPNEXT_UNAVAILABLE');
      error.retryable = true;
      error.code = 'ERPNEXT_UNAVAILABLE';
      throw error;
    }
  }

  return {
    mode: 'synthetic',
    customers,
    orders,
    onboardings,
    invoices,
    payments,
    async searchCustomer(input) {
      await guard();
      const exactTxn = customers.find((row) => row.correlation_id === input.correlation_id);
      if (exactTxn) return exactTxn;
      return customers.find((row) => keyForCustomer(row) === keyForCustomer(input)) || null;
    },
    async upsertCustomer(input) {
      await guard();
      const existing = await this.searchCustomer(input);
      if (existing) return existing;
      const created = {
        name: `CUST-BAD-${customers.length + 1}`,
        legal_business_name: input.legal_business_name,
        business_email: input.business_email,
        contact_name: input.contact_name,
        country: input.country,
        correlation_id: input.correlation_id,
        doctype: 'Customer',
      };
      customers.push(created);
      return created;
    },
    async searchOrder(input) {
      await guard();
      return (
        orders.find((row) => row.paddle_transaction_id === input.paddle_transaction_id) ||
        orders.find((row) => row.correlation_id === input.correlation_id) ||
        null
      );
    },
    async createInternalSalesOrder(input) {
      await guard();
      const existing = await this.searchOrder(input);
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
        docstatus: 0,
        commercial_role: 'internal_paid_correlation',
        buyer_invoice_created: false,
        payment_entry_created: false,
        income_account: null,
      };
      orders.push(created);
      return created;
    },
    async createBuyerSalesInvoice() {
      throw new Error('PADDLE_MOR_FORBIDS_BUYER_INVOICE');
    },
    async createPaymentEntry() {
      throw new Error('PADDLE_MOR_FORBIDS_PAYMENT_ENTRY');
    },
    async searchOnboarding(input) {
      await guard();
      return (
        onboardings.find((row) => row.paddle_transaction_id === input.paddle_transaction_id) ||
        onboardings.find((row) => row.order_name === input.order_name) ||
        null
      );
    },
    async releaseOnboarding(input) {
      await guard();
      if (input.payment_status !== 'completed') {
        const error = new Error('ONBOARDING_REQUIRES_VERIFIED_PAYMENT');
        error.code = 'ONBOARDING_REQUIRES_VERIFIED_PAYMENT';
        throw error;
      }
      const existing = await this.searchOnboarding(input);
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
    },
    async revokeOnboarding(input) {
      await guard();
      const existing = await this.searchOnboarding(input);
      if (!existing) return null;
      existing.status = 'revoked';
      existing.reason = input.reason || 'refund_or_failure';
      return existing;
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
