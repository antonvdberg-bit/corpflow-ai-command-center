import { BatchLedger } from './core.mjs';

const initialBatches = [
  { batchId: 'batch-a', itemId: 'serum', lotNumber: 'Lot A', expiryDate: '2026-12-01', status: 'available', balanceQuantity: 6, reservedQuantity: 0, unit: 'each', version: 1, receivedDate: '2026-09-01' },
  { batchId: 'batch-b', itemId: 'serum', lotNumber: 'Lot B', expiryDate: '2027-03-01', status: 'available', balanceQuantity: 10, reservedQuantity: 2, unit: 'each', version: 1, receivedDate: '2026-10-01' },
  { batchId: 'batch-quarantine', itemId: 'serum', lotNumber: 'Lot Q', expiryDate: '2027-01-01', status: 'quarantined', balanceQuantity: 5, reservedQuantity: 0, unit: 'each', version: 1, receivedDate: '2026-09-10' },
  { batchId: 'batch-expired', itemId: 'serum', lotNumber: 'Lot E', expiryDate: '2026-01-01', status: 'expired', balanceQuantity: 4, reservedQuantity: 0, unit: 'each', version: 1, receivedDate: '2025-09-10' },
  { batchId: 'batch-undated', itemId: 'serum', lotNumber: 'Lot U', status: 'available', balanceQuantity: 3, reservedQuantity: 0, unit: 'each', version: 1, receivedDate: '2026-09-10' },
  { batchId: 'batch-other', itemId: 'other-product', lotNumber: 'Lot A', expiryDate: '2027-01-01', status: 'available', balanceQuantity: 20, reservedQuantity: 0, unit: 'each', version: 1, receivedDate: '2026-09-10' },
];

let ledger;
let pendingPlan;

const $ = (selector) => document.querySelector(selector);
const announce = (message, error = false) => {
  const node = $('#announcement');
  node.textContent = message;
  node.className = `announcement${error ? ' error' : ' success'}`;
};

function reset() {
  ledger = new BatchLedger(initialBatches, { serum: 'required', 'other-product': 'required' });
  pendingPlan = undefined;
  $('#allocation-review').hidden = true;
  render();
  announce('Demo reset.');
}

function invalidateReview() {
  pendingPlan = undefined;
  $('#allocation-review').hidden = true;
}

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function render() {
  const batches = ledger.batches;
  const asOfDate = $('#as-of-date').value;
  $('#physical-stock').textContent = `${batches.filter((batch) => batch.itemId === 'serum').reduce((sum, batch) => sum + batch.balanceQuantity, 0)} each`;
  $('#available-stock').textContent = isValidDate(asOfDate)
    ? `${batches
    .filter((batch) => batch.itemId === 'serum' && batch.status === 'available' && batch.expiryDate && batch.expiryDate > asOfDate)
      .reduce((sum, batch) => sum + batch.balanceQuantity - batch.reservedQuantity, 0)} each`
    : '—';
  const selectedLot = $('#receive-lot').value;
  $('#receive-lot').innerHTML = batches.filter((batch) => batch.itemId === 'serum').map((batch) =>
    `<option value="${batch.batchId}">${batch.lotNumber} · policy required · ${batch.expiryDate ? `expires ${batch.expiryDate}` : 'unknown expiry date'}</option>`).join('');
  if (batches.some((batch) => batch.batchId === selectedLot)) $('#receive-lot').value = selectedLot;
  const events = ledger.history;
  $('#history-list').innerHTML = events.length
    ? events.map((event) => `<li><strong>${event.type}</strong> — ${event.message || event.allocationId}</li>`).join('')
    : '<li class="muted">No changes yet.</li>';
  const last = [...events].reverse().find((event) => event.type === 'allocation');
  $('#undo').disabled = !last || events.some((event) => event.type === 'reversal' && event.allocationId === last.allocationId);
}

$('#receive-form').addEventListener('submit', (event) => {
  event.preventDefault();
  try {
    const batch = ledger.batches.find(({ batchId }) => batchId === $('#receive-lot').value);
    const result = ledger.receive({
      batchId: batch.batchId,
      itemId: batch.itemId,
      lotNumber: batch.lotNumber,
      expiryDate: batch.expiryDate,
      unit: batch.unit,
      quantity: $('#receive-quantity').value,
      idempotencyKey: `demo-receipt-${Date.now()}`,
    });
    announce(result.message);
    invalidateReview();
    render();
  } catch (error) {
    announce(error.message, true);
  }
});

$('#allocate-form').addEventListener('submit', (event) => {
  event.preventDefault();
  try {
    pendingPlan = ledger.plan({
      itemId: 'serum',
      quantity: $('#allocate-quantity').value,
      unit: 'each',
      asOfDate: $('#as-of-date').value,
    });
    if (!pendingPlan.ok) throw new Error(pendingPlan.message);
    $('#allocation-lines').innerHTML = pendingPlan.allocations.map((line) =>
      `<li><strong>${line.quantity} each</strong> from ${line.lotNumber} · policy ${line.itemPolicy} · ${line.expiryDate ? `expires ${line.expiryDate}` : 'no expiry required'} · ${line.remainingBalance} left</li>`
    ).join('');
    $('#allocation-review').hidden = false;
    announce('Review the suggested split before confirming.');
  } catch (error) {
    pendingPlan = undefined;
    $('#allocation-review').hidden = true;
    announce(error.message, true);
  }
});

$('#allocate-quantity').addEventListener('input', invalidateReview);

for (const eventName of ['input', 'change']) {
  $('#as-of-date').addEventListener(eventName, () => {
    invalidateReview();
    render();
  });
}

$('#confirm-allocation').addEventListener('click', () => {
  if (!pendingPlan) return;
  try {
    const result = ledger.commit(pendingPlan, { idempotencyKey: `demo-allocation-${Date.now()}` });
    invalidateReview();
    render();
    announce(`Allocation confirmed: ${result.allocationId}.`);
  } catch (error) {
    announce(error.message, true);
  }
});

$('#undo').addEventListener('click', () => {
  try {
    const last = [...ledger.history].reverse().find((event) => event.type === 'allocation');
    ledger.reverse(last.allocationId);
    invalidateReview();
    render();
    announce(`Reversed ${last.allocationId}.`);
  } catch (error) {
    announce(error.message, true);
  }
});

$('#reset').addEventListener('click', reset);
reset();
