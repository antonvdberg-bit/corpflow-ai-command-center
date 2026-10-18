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
  ledger = new BatchLedger(initialBatches);
  pendingPlan = undefined;
  $('#allocation-review').hidden = true;
  render();
  announce('Demo reset.');
}

function invalidateReview() {
  pendingPlan = undefined;
  $('#allocation-review').hidden = true;
}

function render() {
  const batches = ledger.batches;
  const asOfDate = $('#as-of-date').value;
  $('#physical-stock').textContent = `${batches.filter((batch) => batch.itemId === 'serum').reduce((sum, batch) => sum + batch.balanceQuantity, 0)} each`;
  $('#available-stock').textContent = `${batches
    .filter((batch) => batch.itemId === 'serum' && batch.status === 'available' && batch.expiryDate && batch.expiryDate > asOfDate)
    .reduce((sum, batch) => sum + batch.balanceQuantity - batch.reservedQuantity, 0)} each`;
  $('#receive-lot').innerHTML = batches.filter((batch) => batch.itemId === 'serum').map((batch) => `<option value="${batch.batchId}">${batch.lotNumber} · expires ${batch.expiryDate}</option>`).join('');
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
      `<li><strong>${line.quantity} each</strong> from ${line.lotNumber} · expires ${line.expiryDate} · ${line.remainingBalance} left</li>`
    ).join('');
    $('#allocation-review').hidden = false;
    announce('Review the suggested split before confirming.');
  } catch (error) {
    pendingPlan = undefined;
    $('#allocation-review').hidden = true;
    announce(error.message, true);
  }
});

for (const selector of ['#allocate-quantity', '#as-of-date']) {
  $(selector).addEventListener('input', invalidateReview);
  $(selector).addEventListener('change', invalidateReview);
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
