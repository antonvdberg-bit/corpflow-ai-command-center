import {indexMarkdown,sendPublicKnowledge} from '../../lib/public/agent-readable-knowledge.js';
export default function PublicKnowledgeIndex(){return null;}
export async function getServerSideProps(ctx){return sendPublicKnowledge(ctx,indexMarkdown());}
