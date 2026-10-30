// Offline, policy-neutral OrixHealth sales-pricing proposal. NEVER writes rates or tenant data.
// Caller must supply approved policy, currency and independently verified cost source.
const MONEY=/^(0|[1-9]\d*)\.(\d{2})$/;
const parse=v=>{if(typeof v!=='string'||!MONEY.test(v))return null;const [whole,fraction]=v.split('.');return BigInt(whole)*100n+BigInt(fraction)};
const format=c=>(c/100n).toString()+'.'+(c%100n).toString().padStart(2,'0');
export function planSalesPrice({costExworks,costCurrency,salesCurrency,policy,itemEligible,hasOverride}={}){
  if(!policy||policy.approved!==true||policy.markupPercent!==100||!policy.destinationListId||
     !['EXACT_CENTS'].includes(policy.rounding)) return {state:'BLOCKED_POLICY',proposedRate:null};
  if(itemEligible!==true||hasOverride!==false)return {state:'REVIEW_ELIGIBILITY',proposedRate:null};
  if(typeof costCurrency!=='string'||!/^[A-Z]{3}$/.test(costCurrency)||
    typeof salesCurrency!=='string'||!/^[A-Z]{3}$/.test(salesCurrency)||
    !policy.allowedCurrencies?.includes(costCurrency)||!policy.allowedCurrencies?.includes(salesCurrency))
      return {state:'BLOCKED_CURRENCY',proposedRate:null};
  if(costCurrency!==salesCurrency)return {state:'BLOCKED_FX_POLICY',proposedRate:null};
  const amount=parse(costExworks);
  if(amount===null||amount<=0n)return {state:'BLOCKED_COST',proposedRate:null};
  if(amount>99999999999999n)return {state:'BLOCKED_COST_RANGE',proposedRate:null};
  return {state:'PROPOSAL_ONLY',proposedRate:format(amount*2n),currency:salesCurrency,
    destinationListId:policy.destinationListId,writeAllowed:false};
}
