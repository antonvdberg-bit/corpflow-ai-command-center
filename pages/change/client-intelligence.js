import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';

const categories = ['ALL', 'FACT', 'RESEARCH_FINDING', 'OPTION', 'DECISION', 'UNKNOWN', 'COMMITMENT', 'CONCERN'];

function Card({ children, title, tone = 'normal' }) {
  return <section className={`ci-card ci-${tone}`}><h2>{title}</h2>{children}</section>;
}

export default function ClientIntelligence() {
  const [packet, setPacket] = useState(null);
  const [category, setCategory] = useState('ALL');
  const [search, setSearch] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState(null);
  const [error, setError] = useState('');

  async function load() {
    const params = new URLSearchParams({ context_key: 'orixhealth' });
    if (category !== 'ALL') params.set('category', category);
    if (search.trim()) params.set('search', search.trim());
    const response = await fetch(`/api/factory_router?__path=factory%2Fclient-intelligence&${params}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Unable to load context');
    setPacket(payload);
  }

  useEffect(() => { load().catch((e) => setError(e.message)); }, [category]);

  const current = packet?.records || [];
  const byCategory = useMemo(() => (name) => current.filter((record) => record.category === name), [current]);
  async function ask(event) {
    event.preventDefault();
    if (!question.trim()) return;
    const response = await fetch('/api/factory_router?__path=factory%2Fclient-intelligence&context_key=orixhealth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });
    const payload = await response.json();
    if (!response.ok) return setError(payload.error || 'Question failed');
    setAnswer(payload);
  }

  return <div className="ci-page"><Head><title>Client intelligence · CorpFlowAI</title></Head>
    <header className="ci-header"><div><p className="ci-kicker">Internal operator context</p><h1>Where are we with OrixHealth?</h1><p className="ci-sub">A grounded call companion: current understanding, open verification and the evidence behind it.</p></div><a href="/change">Change Console</a></header>
    {error ? <div className="ci-error">{error} · Sign in as a factory operator and retry.</div> : null}
    <main>
      <div className="ci-grid">
        <Card title="Current state" tone="hero">
          <div className="ci-state"><strong>{packet?.space?.status || 'Loading'}</strong><span>Prospect · issue #{packet?.space?.primaryGithubIssue || '—'}</span></div>
          <p>Operational focus: stock and expiry control, import landed cost, MCB reconciliation, and useful customer follow-up — improving Zoho before custom work.</p>
          <div className="ci-stats"><span><b>{byCategory('FACT').length}</b> facts</span><span><b>{byCategory('UNKNOWN').length}</b> unknowns</span><span><b>{byCategory('DECISION').length}</b> decisions</span><span><b>{packet?.sourceCount || 0}</b> sources</span></div>
        </Card>
        <Card title="2 October focus">
          <ul className="ci-list">{['Verify entitlement, modules, roles and WhatsApp integration', 'Walk one import and one MCB CSV reconciliation cycle', 'Leave with a classified gap matrix and smallest paid next step'].map((item) => <li key={item}>{item}</li>)}</ul>
        </Card>
      </div>
      <Card title="Ask the context fabric">
        <form className="ci-ask" onSubmit={ask}><input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="What do we know vs still need to verify about banking?" /><button type="submit">Ask</button></form>
        {answer ? <div className="ci-answer"><strong>Grounded answer</strong><p>{answer.answer}</p><small>Supporting records: {answer.supportingRecords.map((record) => record.key).join(', ') || 'none'}</small></div> : <p className="ci-hint">Answers are deterministic and limited to retrieved records. No live model or external send is used.</p>}
      </Card>
      <Card title="Context records">
        <form className="ci-toolbar" onSubmit={(e) => { e.preventDefault(); load().catch((err) => setError(err.message)); }}><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search facts, research, tags…" /><button type="submit">Search</button><div className="ci-filters">{categories.map((item) => <button className={category === item ? 'active' : ''} type="button" onClick={() => setCategory(item)} key={item}>{item.replace('_', ' ')}</button>)}</div></form>
        <div className="ci-records">{current.map((record) => <article key={record.id}><div className="ci-record-head"><span className={`ci-pill ci-pill-${record.category.toLowerCase()}`}>{record.category.replace('_', ' ')}</span><span>{record.verification} · {record.confidence}</span></div><h3>{record.title}</h3><p>{record.body}</p>{record.sources?.length ? <small>Source: {record.sources.map((source) => source.label).join(', ')}</small> : null}</article>)}</div>
      </Card>
    </main>
    <style jsx>{`
      :global(*){box-sizing:border-box}.ci-page{min-height:100vh;background:#f4f7f6;color:#173638;font:15px/1.5 system-ui,sans-serif;padding:36px clamp(18px,5vw,76px)}.ci-header{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;max-width:1180px;margin:auto auto 28px}.ci-header h1{font-size:clamp(2rem,4vw,3.4rem);line-height:1.03;letter-spacing:-.055em;margin:0 0 10px}.ci-header a{color:#187b70;text-decoration:none;border:1px solid #bbdcd5;border-radius:99px;padding:9px 14px;font-weight:700;white-space:nowrap}.ci-kicker{color:#168a7c;text-transform:uppercase;letter-spacing:.14em;font-size:.7rem;font-weight:800;margin:0 0 8px}.ci-sub{color:#668080;max-width:650px;margin:0}.ci-error{max-width:1180px;margin:0 auto 18px;background:#fff0ed;border:1px solid #efb8ae;border-radius:10px;padding:12px;color:#9a3e34}.ci-page main{max-width:1180px;margin:auto}.ci-grid{display:grid;grid-template-columns:1.35fr .65fr;gap:16px}.ci-card{background:white;border:1px solid #d8e6e2;border-radius:16px;padding:22px;margin-bottom:16px;box-shadow:0 8px 25px #194f4010}.ci-card h2{font-size:1.05rem;margin:0 0 15px}.ci-hero{background:#133f40;color:#ecfbf6;border-color:#133f40}.ci-hero p{color:#b7d8d1;max-width:720px}.ci-state{display:flex;align-items:baseline;gap:14px}.ci-state strong{font-size:2rem}.ci-state span,.ci-stats span,.ci-record-head span:last-child,.ci-records small{color:#72908d;font-size:.76rem}.ci-hero .ci-stats span{color:#afd2ca}.ci-stats{display:flex;gap:26px;border-top:1px solid #386566;padding-top:15px;margin-top:20px}.ci-stats b{display:block;font-size:1.25rem;color:#fff}.ci-list{margin:0;padding-left:20px;color:#526f6d}.ci-list li{margin:9px 0}.ci-ask,.ci-toolbar{display:flex;gap:9px;flex-wrap:wrap}.ci-ask input,.ci-toolbar input{flex:1;min-width:220px;border:1px solid #cfe0dc;border-radius:9px;padding:11px 13px;font:inherit}.ci-ask button,.ci-toolbar>button{background:#168a7c;color:white;border:0;border-radius:9px;padding:0 18px;font-weight:800}.ci-hint{color:#78908d;font-size:.85rem}.ci-answer{margin-top:15px;background:#edf8f5;border:1px solid #c2e5dd;border-radius:10px;padding:14px}.ci-answer p{white-space:pre-line;margin:5px 0}.ci-answer small{color:#487a72}.ci-filters{display:flex;gap:6px;overflow:auto;width:100%;padding-top:4px}.ci-filters button{border:1px solid #d4e2df;background:#f8fbfa;color:#55716f;border-radius:99px;padding:7px 10px;white-space:nowrap;font-size:.73rem}.ci-filters button.active{background:#dff3ed;color:#137468;border-color:#a4d8ce}.ci-records{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:18px}.ci-records article{border:1px solid #e0ebe8;border-radius:11px;padding:14px}.ci-record-head{display:flex;justify-content:space-between;gap:8px}.ci-pill{border-radius:99px;padding:4px 7px;text-transform:uppercase;font-size:.63rem;font-weight:800;background:#e8f2ef;color:#41716b}.ci-pill-unknown,.ci-pill-concern{background:#fff1dc;color:#9a681c}.ci-pill-decision,.ci-pill-option{background:#e9e5fa;color:#6550a0}.ci-pill-research_finding{background:#e6f0fb;color:#396b9d}.ci-records h3{font-size:.93rem;margin:11px 0 5px}.ci-records p{color:#536f6d;font-size:.85rem;margin:0 0 9px}.ci-records small{display:block}@media(max-width:760px){.ci-header{display:block}.ci-header a{display:inline-block;margin-top:15px}.ci-grid,.ci-records{grid-template-columns:1fr}.ci-stats{gap:12px;justify-content:space-between}.ci-ask button{height:42px}}
    `}</style>
  </div>;
}
