// Public-only, manually curated agent-readable content. No DB, tenant, or private data.
// Google Search does not use OKF/llms.txt as ranking signals; these are optional exports.
export const PUBLIC_AGENT_HOSTS = new Set(['corpflowai.com', 'www.corpflowai.com']);
export const PUBLIC_KNOWLEDGE = Object.freeze([
  {slug:'about', title:'About CorpFlowAI',description:'CorpFlowAI is a Mauritius-based software and workflow automation company.',source:'/about',body:'CorpFlowAI helps businesses improve enquiry handling and operational workflows. Services and acceptance conditions are confirmed in writing; no revenue or search ranking is guaranteed.'},
  {slug:'services', title:'CorpFlowAI services',description:'Current software and workflow services.',source:'/services',body:'CorpFlowAI offers Lead Rescue, Website Rescue and bounded business automation. The exact scope, price, dependencies and approval process are established in a written offer. See the website for current prices and availability.'},
  {slug:'website-rescue',title:'Website Rescue',description:'Bounded website repairs and premium landing pages.',source:'/website-rescue',body:'Website Rescue focuses on a clearer public-facing landing page and a working enquiry path, with mobile review and client acceptance. Larger rebuilds and ongoing care require separate scope.'}
]);
export function publicHost(req) {
  const raw=String(req?.headers?.['x-forwarded-host']||req?.headers?.host||'');
  const host=raw.split(',')[0].trim().toLowerCase().replace(/:\d+$/,'');
  return PUBLIC_AGENT_HOSTS.has(host);
}
const yaml = (v) => JSON.stringify(String(v));
export function conceptMarkdown(doc){
 return ['---','name: '+yaml(doc.title),'description: '+yaml(doc.description),'type: Knowledge','sources:','  - '+yaml('https://corpflowai.com'+doc.source),'---','# '+doc.title,'',doc.body,'','Source: https://corpflowai.com'+doc.source,''].join('\n');
}
export function indexMarkdown(){
 return ['---','name: "CorpFlowAI public knowledge index"','description: "Selected approved public website information for AI agents"','type: Knowledge','---','# CorpFlowAI public knowledge','','This optional agent-readable directory contains summaries of publicly accessible CorpFlowAI pages. Refer to the original pages for current service scope and terms. No claim of preferential indexing or ranking is made.','',...PUBLIC_KNOWLEDGE.map(d=>'- ['+d.title+'](https://corpflowai.com/okf/'+d.slug+'.md) — '+d.description),''].join('\n');
}
export function llmsText(){
 return ['# CorpFlowAI','','> Public information directory; refer to original pages for the current authoritative version.','','- [Website](https://corpflowai.com/)','- [Sitemap](https://corpflowai.com/sitemap.xml)','- [Agent-readable knowledge](https://corpflowai.com/okf/index.md)',...PUBLIC_KNOWLEDGE.map(d=>'- ['+d.title+'](https://corpflowai.com'+d.source+')'),''].join('\n');
}
export function sendPublicKnowledge({req,res},body){
 if(!publicHost(req)){res.statusCode=404;res.end('Not Found');return {props:{}};}
 res.statusCode=200;
 res.setHeader('Content-Type','text/markdown; charset=utf-8');
 res.setHeader('Cache-Control','public, max-age=3600, s-maxage=3600');
 res.end(body);
 return {props:{}};
}
