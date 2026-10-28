import {PUBLIC_KNOWLEDGE,conceptMarkdown,sendPublicKnowledge,publicHost} from '../../lib/public/agent-readable-knowledge.js';
export default function PublicKnowledgeConcept(){return null;}
export async function getServerSideProps(ctx){
 if(!publicHost(ctx.req)){ctx.res.statusCode=404;ctx.res.end('Not Found');return {props:{}};}
 const slug=String(ctx.params?.slug||'');
 const doc=PUBLIC_KNOWLEDGE.find(x=>x.slug===slug);
 if(!doc){ctx.res.statusCode=404;ctx.res.end('Not Found');return {props:{}};}
 return sendPublicKnowledge(ctx,conceptMarkdown(doc));
}
