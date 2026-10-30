// Pure offline candidate review; no Zoho calls or financial mutations.
// Source attestation is caller-provided and must be independently verified before tenant use.
const cents = (v) => {
  if (typeof v !== 'string' || !/^(0|[1-9]\d*)\.\d{2}$/.test(v)) throw new Error('Invalid fixed-2 amount');
  const [whole, fraction] = v.split('.');
  return BigInt(whole)*100n + BigInt(fraction);
};
const validDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
  && !Number.isNaN(Date.parse(v)) && new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
const norm = (s) => String(s??'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const previousPayment = new Set(['customer_payment','vendor_payment','transfer']);
export function reviewCandidates({bankRows,ledgerRows,source}) {
  if (!source || source.complete!==true || source.attested!==true || !validDate(source.observedAt)
    || !source.accountId || !source.currency) {
    return {status:'BLOCKED_SOURCE',recommendations:[],issues:['SOURCE_INCOMPLETE_OR_UNATTESTED'],liveMatchReady:false};
  }
  if (!Array.isArray(bankRows)||!Array.isArray(ledgerRows)) throw Error('Rows must be arrays');
  const keys = new Set();
  for (const row of [...bankRows,...ledgerRows]) {
    if (!row || !['bank','ledger'].includes(row.kind) || typeof row.id!=='string' || !row.id
      || keys.has(row.kind+':'+row.id)) return {status:'BLOCKED_SOURCE',recommendations:[],issues:['DUPLICATE_OR_INVALID_SOURCE_ID'],liveMatchReady:false};
    keys.add(row.kind+':'+row.id);
    if (!validDate(row.date)||!row.accountId||!row.currency||cents(row.amount)<=0n)
      return {status:'BLOCKED_SOURCE',recommendations:[],issues:['INVALID_SOURCE_ROW'],liveMatchReady:false};
  }
  if(bankRows.some(x=>x.kind!=='bank')||ledgerRows.some(x=>x.kind!=='ledger'))throw Error('Wrong row type');
  const results=bankRows.map(bank=>{
    const candidates=[];
    for(const ledger of ledgerRows){
      if(bank.accountId!==source.accountId||ledger.accountId!==source.accountId
        ||bank.currency!==source.currency||ledger.currency!==source.currency
        ||bank.direction!==ledger.direction||ledger.status!=='open'
        ||cents(bank.amount)!==cents(ledger.amount))continue;
      const ref=!!norm(bank.reference)&&norm(bank.reference)===norm(ledger.reference);
      const party=!!norm(bank.party)&&norm(bank.party)===norm(ledger.party);
      const days=Math.abs((Date.parse(bank.date)-Date.parse(ledger.date))/86400000);
      const evidence=['AMOUNT_EXACT','ACCOUNT_CURRENCY','DIRECTION'];
      if(ref)evidence.push('REFERENCE_EXACT');
      if(party)evidence.push('PARTY_EXACT');
      if(days<=7)evidence.push('DATE_WITHIN_7_DAYS');
      const score=(ref?4:0)+(party?3:0)+(days<=7?1:0);
      const route=previousPayment.has(ledger.type)?'EXISTING_RECORD':'MAY_CREATE_PAYMENT';
      candidates.push({ledgerId:ledger.id,type:ledger.type,route,evidence,score});
    }
    candidates.sort((a,b)=>b.score-a.score||a.ledgerId.localeCompare(b.ledgerId));
    const top=candidates[0];
    const state=!top?'NO_MATCH':(top.score>=7&&top.route==='EXISTING_RECORD'
      &&(!candidates[1]||candidates[1].score<top.score))?'REVIEW_CANDIDATE':'NEEDS_REVIEW';
    return {bankId:bank.id,state,candidates:candidates.slice(0,5),postAllowed:false};
  });
  const claims=new Map();
  for(const result of results){
    if(result.state!=='REVIEW_CANDIDATE')continue;
    const id=result.candidates[0].ledgerId;
    claims.set(id,[...(claims.get(id)||[]),result]);
  }
  for(const group of claims.values())if(group.length>1)for(const row of group){
    row.state='CONFLICT_REVIEW';row.issues=['LEDGER_REUSED_ACROSS_BANK_ROWS'];
  }
  return {status:'EVALUATION_ONLY',recommendations:results,
    issues:['NOT_CONNECTED_TO_ZOHO','NO_PARTIAL_OR_GROUPED_ALLOCATION'],
    liveMatchReady:false};
}
