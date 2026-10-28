import test from 'node:test';import assert from 'node:assert/strict';
import {PUBLIC_KNOWLEDGE,publicHost,conceptMarkdown,indexMarkdown,llmsText,sendPublicKnowledge} from '../lib/public/agent-readable-knowledge.js';
test('only CorpFlowAI public host is served',()=>{
 assert.equal(publicHost({headers:{host:'corpflowai.com'}}),true);
 for(const host of ['lux.corpflowai.com','cipc.corpflowai.com','tenant.corpflowai.com','evil.example','']) assert.equal(publicHost({headers:{host}}),false);
});
test('public allowlist and source links are complete and unique',()=>{
 assert.equal(new Set(PUBLIC_KNOWLEDGE.map(x=>x.slug)).size,PUBLIC_KNOWLEDGE.length);
 for(const x of PUBLIC_KNOWLEDGE){
   assert.match(x.source,/^\/[a-z-]+$/);
   assert.ok(conceptMarkdown(x).includes('https://corpflowai.com'+x.source));
   assert.ok(indexMarkdown().includes('/okf/'+x.slug+'.md'));
 }
 assert.match(llmsText(),/sitemap.xml/);
});
test('no private, tenant or credentials are exported',()=>{
 const serialized=[indexMarkdown(),llmsText(),...PUBLIC_KNOWLEDGE.map(conceptMarkdown)].join('\n');
 for(const marker of ['/change','/admin','/api/','tenant_id','POSTGRES_URL','Infisical','BEGIN PRIVATE KEY']) assert.equal(serialized.includes(marker),false);
});
test('responds 404 for a tenant host',()=>{
 const res={setHeader(){throw new Error('must not publish')},end(v){this.body=v}};
 sendPublicKnowledge({req:{headers:{host:'lux.corpflowai.com'}},res},'text');
 assert.equal(res.statusCode,404);
});
