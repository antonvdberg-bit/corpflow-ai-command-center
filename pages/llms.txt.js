import {llmsText,sendPublicKnowledge} from '../lib/public/agent-readable-knowledge.js';
export default function LlmDirectory(){return null;}
export async function getServerSideProps(ctx){return sendPublicKnowledge(ctx,llmsText());}
