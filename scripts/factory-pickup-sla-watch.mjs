#!/usr/bin/env node
import fs from 'node:fs';
import {
  DISPATCH_LABEL_CLAIMED,
  DISPATCH_LABEL_READY,
  discoverOpenIssuesByLabel,
  planCursorIssueClaims,
} from '../lib/server/cursor-issue-dispatch-lifecycle.js';
import {
  attachLinkedPullRequestsToIssues,
  fetchOpenPullRequestsForWip,
} from '../lib/server/cursor-wip-control.js';
import {
  evaluateFactoryPickupSla,
  findLatestReadyLabelAt,
  findPickupRecoveryForGeneration,
  formatFactoryPickupSlaComment,
} from '../lib/server/factory-pickup-sla.js';

const repo=String(process.env.GITHUB_REPOSITORY||'antonvdberg-bit/corpflow-ai-command-center');
const token=String(process.env.GITHUB_TOKEN||process.env.GH_TOKEN||'').trim();
const [owner,name]=repo.split('/');

async function gh(path, opts={}) {
  const res=await fetch(`https://api.github.com${path}`,{
    ...opts,
    headers:{
      Authorization:`Bearer ${token}`,
      Accept:'application/vnd.github+json',
      'X-GitHub-Api-Version':'2022-11-28',
      ...(opts.headers||{}),
    },
    signal:AbortSignal.timeout(30000),
  });
  const txt=await res.text();
  if(!res.ok) throw new Error(`GitHub HTTP ${res.status}: ${txt.slice(0,300)}`);
  return txt ? JSON.parse(txt) : null;
}
async function comments(issue){
  return await gh(`/repos/${owner}/${name}/issues/${issue}/comments?per_page=100`);
}
async function events(issue){
  return await gh(`/repos/${owner}/${name}/issues/${issue}/events?per_page=100`);
}
async function post(issue, body){
  return await gh(`/repos/${owner}/${name}/issues/${issue}/comments`,{
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({body})
  });
}
function output(k,v){
  if(process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT,`${k}=${v}\n`);
  else console.log(`output:${k}=${v}`);
}

if(!token) throw new Error('GITHUB_TOKEN required');

const ready=await discoverOpenIssuesByLabel(token,repo,DISPATCH_LABEL_READY);
const claimed=await discoverOpenIssuesByLabel(token,repo,DISPATCH_LABEL_CLAIMED);
const tracked=[...claimed,...ready];

for(const issue of tracked){
  try{ issue.comments=(await comments(issue.number)).map(c=>({body:String(c.body||''),created_at:c.created_at||null})); }
  catch{ issue.comments=[]; }
}
try{ attachLinkedPullRequestsToIssues(tracked,await fetchOpenPullRequestsForWip(token,repo)); }catch{}

const plan=planCursorIssueClaims({
  readyIssues:ready,
  claimedIssues:claimed,
  trackedIssues:tracked,
  wipLimits:{maxActiveCursorImplementationIssues:1},
  wakeReason:'scheduled_reconciliation',
  activationLane:'ordinary',
});

const target=Number(plan.activationTargetIssue||0)||null;
if(!target){
  output('should_recover','0'); output('source_issue',''); output('state','NO_TARGET');
  console.log(JSON.stringify({state:'NO_TARGET',availableSlots:plan.availableSlots}));
  process.exit(0);
}

const issue=ready.find(i=>Number(i.number)===target);
const issueComments=issue?.comments||[];
const issueEvents=await events(target);
const readyAt=findLatestReadyLabelAt(issueEvents);
const prior=findPickupRecoveryForGeneration(issueComments,target,readyAt);
const decision=plan.decisions.find(d=>Number(d.issue?.number)===target);
const sla=evaluateFactoryPickupSla({
  sourceIssue:target,
  readyAt,
  eligible:decision?.eligibleToClaim===true,
  availableSlots:plan.availableSlots,
  claimed:false,
  recoveryAlreadyRequested:Boolean(prior),
});

let shouldRecover=false;
if(sla.should_recover){
  shouldRecover=true;
  const now=new Date().toISOString();
  await post(target,formatFactoryPickupSlaComment({...sla,recovery_requested_at:now,observed_at:now}));
} else if(sla.state==='HARD_EXCEPTION' && prior){
  const alreadyHard=issueComments.some(c=>{
    try{
      return String(c.body||'').includes('CURSOR PICKUP SLA — HARD EXCEPTION') &&
        String(c.body||'').includes(`"ready_at":"${readyAt}"`);
    }catch{return false;}
  });
  if(!alreadyHard) await post(target,formatFactoryPickupSlaComment({...sla,observed_at:new Date().toISOString()}));
}

output('should_recover',shouldRecover?'1':'0');
output('source_issue',shouldRecover?String(target):'');
output('state',sla.state);
console.log(JSON.stringify({sla,shouldRecover,availableSlots:plan.availableSlots},null,2));
