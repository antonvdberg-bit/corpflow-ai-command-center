import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewCandidates} from '../lib/orixhealth/reconciliation-review.mjs';

const source={complete:true,attested:true,observedAt:'2026-10-30',accountId:'TEST_BANK',currency:'MUR'};
const bank=(id='b1',o={})=>({kind:'bank',id,accountId:'TEST_BANK',currency:'MUR',date:'2026-10-29',amount:'100.00',direction:'in',party:'Example Buyer',reference:'INV 101',...o});
const ledger=(id='l1',o={})=>({kind:'ledger',id,accountId:'TEST_BANK',currency:'MUR',date:'2026-10-29',amount:'100.00',direction:'in',party:'Example Buyer',reference:'INV-101',type:'customer_payment',status:'open',...o});
const run=(bs,ls,s=source)=>reviewCandidates({bankRows:bs,ledgerRows:ls,source:s});
test('existing recorded payment is review only, never post',()=>{const r=run([bank()],[ledger()]);assert.equal(r.recommendations[0].state,'REVIEW_CANDIDATE');assert.equal(r.recommendations[0].postAllowed,false);assert.equal(r.liveMatchReady,false);});
test('invoice route is not treated like pre-recorded payment',()=>assert.equal(run([bank()],[ledger('l1',{type:'invoice'})]).recommendations[0].state,'NEEDS_REVIEW'));
test('competing bank rows block same candidate',()=>assert.deepEqual(run([bank('b1'),bank('b2')],[ledger()]).recommendations.map(x=>x.state),['CONFLICT_REVIEW','CONFLICT_REVIEW']));
test('tied alternatives require review',()=>assert.equal(run([bank()],[ledger('l1'),ledger('l2')]).recommendations[0].state,'NEEDS_REVIEW'));
test('currency mismatch excluded',()=>assert.equal(run([bank()],[ledger('l1',{currency:'USD'})]).recommendations[0].state,'NO_MATCH'));
test('direction mismatch excluded',()=>assert.equal(run([bank()],[ledger('l1',{direction:'out'})]).recommendations[0].state,'NO_MATCH'));
test('closed record excluded',()=>assert.equal(run([bank()],[ledger('l1',{status:'closed'})]).recommendations[0].state,'NO_MATCH'));
test('amount mismatch excluded',()=>assert.equal(run([bank()],[ledger('l1',{amount:'101.00'})]).recommendations[0].state,'NO_MATCH'));
test('unattested input blocks',()=>assert.equal(run([bank()],[ledger()],{...source,attested:false}).status,'BLOCKED_SOURCE'));
test('incomplete input blocks',()=>assert.equal(run([bank()],[ledger()],{...source,complete:false}).status,'BLOCKED_SOURCE'));
test('duplicate bank id blocks',()=>assert.equal(run([bank(),bank()],[ledger()]).status,'BLOCKED_SOURCE'));
test('impossible date blocks',()=>assert.equal(run([bank('b1',{date:'2026-02-30'})],[ledger()]).status,'BLOCKED_SOURCE'));
test('invalid fixed precision blocks',()=>assert.equal(run([bank('b1',{amount:'100.001'})],[ledger()]).status,'BLOCKED_SOURCE'));
test('weak identity demands review',()=>assert.equal(run([bank('b1',{reference:'other',party:'unknown'})],[ledger()]).recommendations[0].state,'NEEDS_REVIEW'));
test('wrong source account excludes',()=>assert.equal(run([bank('b1',{accountId:'OTHER'})],[ledger()]).recommendations[0].state,'NO_MATCH'));
test('same source id across kinds is permitted',()=>assert.equal(run([bank('same')],[ledger('same')]).status,'EVALUATION_ONLY'));

test('unknown ledger type fails closed',()=>assert.equal(run([bank()],[ledger('l1',{type:'unsupported'})]).status,'BLOCKED_SOURCE'));
test('wrong row collection fails closed',()=>assert.equal(run([ledger()],[bank()]).status,'BLOCKED_SOURCE'));
test('malformed source collection fails closed',()=>assert.equal(run(null,[ledger()]).status,'BLOCKED_SOURCE'));
test('candidate reused even when not highest ranked blocks both bank entries',()=>{
 const b2=bank('b2',{reference:'different',party:'another'});
 const r=run([bank('b1'),b2],[ledger('l1'),ledger('l2',{reference:'different',party:'another'})]);
 assert.deepEqual(r.recommendations.map(x=>x.state),['CONFLICT_REVIEW','CONFLICT_REVIEW']);
});
