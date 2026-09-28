import { useMemo, useState } from 'react';
import Head from 'next/head';

const navItems = [
  ['overview', 'Overview'],
  ['inventory', 'Inventory & expiry'],
  ['reconciliation', 'Bank review'],
  ['customers', 'Customer intelligence'],
  ['growth', 'Growth planning'],
  ['discovery', 'Discovery checklist'],
];

const metrics = [
  { label: 'Stock health', value: '92%', detail: '3 items need attention', tone: 'teal' },
  { label: 'Customer signal', value: '38', detail: 'repeat customers tracked', tone: 'blue' },
  { label: 'Bank review', value: '2', detail: 'exceptions to review', tone: 'amber' },
  { label: 'Growth opportunities', value: '14', detail: 'follow-ups identified', tone: 'purple' },
];

const inventory = [
  { sku: 'VIT-D3-60', name: 'Vitamin D3 · 60 capsules', batch: 'D3-2407B', expiry: '18 Oct 2026', stock: 12, reorder: 20, state: 'Expiring soon', tone: 'amber' },
  { sku: 'OMEGA-90', name: 'Omega Balance · 90 softgels', batch: 'OB-2411A', expiry: '09 Nov 2026', stock: 8, reorder: 15, state: 'Reorder', tone: 'rose' },
  { sku: 'MAG-30', name: 'Magnesium Calm · 30 sachets', batch: 'MC-2502C', expiry: '14 Feb 2027', stock: 46, reorder: 20, state: 'Healthy', tone: 'teal' },
  { sku: 'PRO-20', name: 'Daily Probiotic · 20 caps', batch: 'DP-2504A', expiry: '22 Apr 2027', stock: 31, reorder: 18, state: 'Healthy', tone: 'teal' },
];

const transactions = [
  { date: '27 Sep', label: 'Wellness supplier · INV-8842', amount: 'MUR 18,450', status: 'Matched', tone: 'teal' },
  { date: '26 Sep', label: 'Card settlement · batch 0926', amount: 'MUR 42,800', status: 'Matched', tone: 'teal' },
  { date: '25 Sep', label: 'MUR 6,900 · reference missing', amount: 'MUR 6,900', status: 'Needs review', tone: 'amber' },
  { date: '24 Sep', label: 'Harbour Pharmacy · transfer', amount: 'MUR 12,600', status: 'Needs review', tone: 'amber' },
];

const customers = [
  { name: 'Amelia R.', signal: 'Repeat customer', detail: '3 orders · last 21 days', action: 'Invite to replenishment' },
  { name: 'Kavish P.', signal: 'Reorder opportunity', detail: 'Omega Balance · last order 74 days ago', action: 'Prepare follow-up' },
  { name: 'Sarah T.', signal: 'Cross-sell candidate', detail: 'Vitamin D3 buyer · no Magnesium Calm', action: 'Suggest companion product' },
  { name: 'Daniel M.', signal: 'Dormant', detail: '2 orders · last order 128 days ago', action: 'Review win-back segment' },
];

const checklist = [
  ['Zoho organisation profile and user roles', 'Unknown', 'Confirm who owns configuration and approvals.'],
  ['Chart of accounts and reporting periods', 'Unknown', 'Map the reports the team actually uses.'],
  ['Product catalogue and SKU naming', 'Pass', 'Sample catalogue structure is ready to validate.'],
  ['Batch / lot and expiry capture', 'Gap', 'Confirm capture point and minimum required fields.'],
  ['Reorder thresholds by product', 'Gap', 'Agree a practical threshold per fast-moving item.'],
  ['Supplier records and purchase workflow', 'Unknown', 'Walk through a typical supplier order.'],
  ['Stock adjustments and audit trail', 'Unknown', 'Check who can adjust quantities and why.'],
  ['Warehouse / shelf locations', 'Unknown', 'Confirm whether one or multiple locations matter.'],
  ['Bank feeds or statement import', 'Unknown', 'Review current bank export and cadence.'],
  ['Reconciliation rules and exception owner', 'Gap', 'Define what “needs review” means in practice.'],
  ['Payment approval and evidence', 'Unknown', 'Map approval evidence without initiating payments.'],
  ['Customer master and duplicate handling', 'Unknown', 'Check how repeat customers are identified today.'],
  ['Sales pipeline stages', 'Pass', 'Starter stages can be adapted to the team.'],
  ['Follow-up reminders and ownership', 'Gap', 'Choose the smallest reliable next-action habit.'],
  ['Dormant customer definition', 'Unknown', 'Agree the period that signals a win-back.'],
  ['Cross-sell signals from purchases', 'Gap', 'Validate two or three useful product pairings.'],
  ['Management dashboard cadence', 'Unknown', 'Decide what the owner needs weekly.'],
  ['Marketing segments and consent', 'Unknown', 'Review current list sources and permissions.'],
  ['Campaign planning calendar', 'Gap', 'Connect operational moments to campaign ideas.'],
  ['WhatsApp / email content approval', 'Unknown', 'Keep planning separate from live sending.'],
  ['Zoho Marketplace / native options', 'Unknown', 'Compare native fit before custom work.'],
  ['Existing integrations and exports', 'Unknown', 'Inventory current tools and hand-offs.'],
  ['Analytics and source-of-truth reports', 'Gap', 'Agree which numbers are trusted.'],
  ['Custom workflow candidates', 'Gap', 'Prioritise only the gaps native tools cannot cover.'],
  ['Owner sign-off and training plan', 'Unknown', 'Make adoption part of the delivery shape.'],
  ['90-day improvement roadmap', 'Unknown', 'Turn the discovery into staged decisions.'],
];

function StatusPill({ children, tone }) {
  return <span className={`oh-pill oh-pill-${tone || children.toLowerCase().replace(/\s/g, '-')}`}>{children}</span>;
}

function Panel({ title, eyebrow, action, children, className = '' }) {
  return (
    <section className={`oh-panel ${className}`}>
      <div className="oh-panel-head">
        <div>
          {eyebrow ? <p className="oh-eyebrow">{eyebrow}</p> : null}
          <h2>{title}</h2>
        </div>
        {action ? <span className="oh-panel-action">{action}</span> : null}
      </div>
      {children}
    </section>
  );
}

function Overview({ setView }) {
  return (
    <>
      <div className="oh-welcome">
        <div>
          <p className="oh-eyebrow">Friday demonstration · synthetic workspace</p>
          <h1>A clearer day for the team behind the business.</h1>
          <p>One practical view across stock, customers, banking and growth — so the next action is visible before it becomes urgent.</p>
        </div>
        <div className="oh-date-card"><span>Week of</span><strong>28 September 2026</strong><small>Prepared for OrixHealth Ltd</small></div>
      </div>
      <div className="oh-metrics">
        {metrics.map((metric) => <div className={`oh-metric oh-metric-${metric.tone}`} key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong><small>{metric.detail}</small></div>)}
      </div>
      <div className="oh-two-col">
        <Panel title="Today’s attention" eyebrow="Operator view" action="4 open items">
          <div className="oh-attention-list">
            <button type="button" onClick={() => setView('inventory')}><span className="oh-attention-icon amber">!</span><span><strong>Review 2 stock alerts</strong><small>One batch is approaching expiry; one needs reorder.</small></span><b>→</b></button>
            <button type="button" onClick={() => setView('reconciliation')}><span className="oh-attention-icon blue">↗</span><span><strong>Clear 2 bank exceptions</strong><small>Both are synthetic examples awaiting an owner.</small></span><b>→</b></button>
            <button type="button" onClick={() => setView('customers')}><span className="oh-attention-icon purple">✦</span><span><strong>Prepare 3 follow-ups</strong><small>Customers with a clear, timely next conversation.</small></span><b>→</b></button>
          </div>
        </Panel>
        <Panel title="A small operating rhythm" eyebrow="What this demonstrates" action="Starter shape">
          <div className="oh-rhythm"><div><b>01</b><span>See the signal</span><small>Bring the right operational numbers together.</small></div><div><b>02</b><span>Decide the action</span><small>Make ownership and exceptions explicit.</small></div><div><b>03</b><span>Keep the loop moving</span><small>Use the same context for follow-up and growth.</small></div></div>
        </Panel>
      </div>
      <Panel title="Business pulse" eyebrow="Synthetic snapshot" action="No live integrations">
        <div className="oh-pulse-grid">
          <div><span>Stock value in view</span><strong>MUR 284,600</strong><small>Across 42 example SKUs</small></div>
          <div><span>Customers needing a touch</span><strong>14</strong><small>Reorder, dormant or cross-sell signals</small></div>
          <div><span>Reconciliation this week</span><strong>18 / 20</strong><small>Matched examples · 2 exceptions</small></div>
          <div><span>Campaign ideas ready</span><strong>4</strong><small>Planning only — no messages sent</small></div>
        </div>
      </Panel>
    </>
  );
}

function Inventory() {
  return <Panel title="Inventory & expiry control" eyebrow="Know what needs action" action="42 SKUs in sample">
    <p className="oh-panel-lead">A practical stock view combines what is on hand with batch and expiry context. The aim is a confident next step, not another spreadsheet.</p>
    <div className="oh-alert-banner"><span className="oh-attention-icon amber">!</span><span><strong>2 items need attention</strong><small>Prioritise the expiring batch, then replenish the low-stock item.</small></span></div>
    <div className="oh-table-wrap"><table><thead><tr><th>Product</th><th>Batch / expiry</th><th>On hand</th><th>Signal</th><th /></tr></thead><tbody>{inventory.map((item) => <tr key={item.sku}><td><strong>{item.name}</strong><small>{item.sku}</small></td><td>{item.batch}<small>Expires {item.expiry}</small></td><td><strong>{item.stock}</strong><small>Reorder at {item.reorder}</small></td><td><StatusPill tone={item.tone}>{item.state}</StatusPill></td><td><button className="oh-text-button" type="button">Review</button></td></tr>)}</tbody></table></div>
  </Panel>;
}

function Reconciliation() {
  return <Panel title="Bank review" eyebrow="Exceptions without payment risk" action="Read-only example">
    <p className="oh-panel-lead">Show the operator what matched, what did not, and what evidence is needed. This demonstration has no bank connection and cannot initiate a payment.</p>
    <div className="oh-recon-summary"><div><span>Statement items</span><strong>20</strong></div><div><span>Matched</span><strong className="oh-good">18</strong></div><div><span>Needs review</span><strong className="oh-warn">2</strong></div></div>
    <div className="oh-table-wrap"><table><thead><tr><th>Date</th><th>Transaction</th><th>Amount</th><th>Status</th><th /></tr></thead><tbody>{transactions.map((item) => <tr key={item.label}><td>{item.date}</td><td><strong>{item.label}</strong><small>Synthetic transaction</small></td><td>{item.amount}</td><td><StatusPill tone={item.tone}>{item.status}</StatusPill></td><td><button className="oh-text-button" type="button">{item.status === 'Matched' ? 'View' : 'Open review'}</button></td></tr>)}</tbody></table></div>
  </Panel>;
}

function Customers() {
  return <Panel title="Customer intelligence" eyebrow="Turn history into a helpful next step" action="38 repeat customers">
    <p className="oh-panel-lead">Simple signals help the team choose who to contact and why — without pretending every customer needs the same campaign.</p>
    <div className="oh-customer-grid">{customers.map((customer) => <article className="oh-customer" key={customer.name}><div className="oh-avatar">{customer.name[0]}</div><div><h3>{customer.name}</h3><StatusPill tone={customer.signal === 'Dormant' ? 'rose' : customer.signal === 'Repeat customer' ? 'teal' : 'blue'}>{customer.signal}</StatusPill><p>{customer.detail}</p><button className="oh-text-button" type="button">{customer.action} →</button></div></article>)}</div>
  </Panel>;
}

function Growth() {
  return <Panel title="Growth planning" eyebrow="Operational context, better conversations" action="Planning only">
    <p className="oh-panel-lead">Use stock and customer signals to shape a relevant campaign brief. This is a planning surface — no WhatsApp or email is connected.</p>
    <div className="oh-campaigns"><article><div className="oh-campaign-top"><StatusPill tone="amber">Seasonal</StatusPill><span>12 customers</span></div><h3>Prepare for the summer wellness reset</h3><p>Pair healthy stock cover with customers who usually reorder in October.</p><button className="oh-text-button" type="button">Open campaign brief →</button></article><article><div className="oh-campaign-top"><StatusPill tone="blue">Replenishment</StatusPill><span>8 customers</span></div><h3>Make the next order easier</h3><p>Offer a simple reminder for customers approaching their usual reorder window.</p><button className="oh-text-button" type="button">Open campaign brief →</button></article><article><div className="oh-campaign-top"><StatusPill tone="purple">Cross-sell</StatusPill><span>6 customers</span></div><h3>Complete the daily routine</h3><p>Suggest a considered companion product based on prior purchases.</p><button className="oh-text-button" type="button">Open campaign brief →</button></article></div>
    <div className="oh-safety-note"><span>◎</span><span><strong>Human approval stays in the loop.</strong> Any future message would be reviewed, approved and sent through the agreed channel separately.</span></div>
  </Panel>;
}

function Discovery() {
  const [filter, setFilter] = useState('All');
  const counts = useMemo(() => checklist.reduce((acc, [, status]) => ({ ...acc, [status]: (acc[status] || 0) + 1 }), {}), []);
  const rows = filter === 'All' ? checklist : checklist.filter((item) => item[1] === filter);
  return <Panel title="On-site discovery checklist" eyebrow="A meeting aid for the next conversation" action={`${checklist.length} starter checks`}>
    <p className="oh-panel-lead">Use this as a shared map: capture what is already working, what is blocking the team, and what should stay unknown until the right person confirms it.</p>
    <div className="oh-check-summary">{['All', 'Pass', 'Gap', 'Unknown'].map((item) => <button type="button" key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}><strong>{item === 'All' ? checklist.length : counts[item] || 0}</strong><span>{item}</span></button>)}</div>
    <div className="oh-checklist">{rows.map(([label, status, note], index) => <div className="oh-check" key={label}><span className="oh-check-number">{String(index + 1).padStart(2, '0')}</span><div><strong>{label}</strong><small>{note}</small></div><StatusPill tone={status === 'Pass' ? 'teal' : status === 'Gap' ? 'rose' : 'slate'}>{status}</StatusPill><button className="oh-text-button" type="button">Add note</button></div>)}</div>
  </Panel>;
}

export default function OrixHealthDemo() {
  const [view, setView] = useState('overview');
  const content = view === 'overview' ? <Overview setView={setView} /> : view === 'inventory' ? <Inventory /> : view === 'reconciliation' ? <Reconciliation /> : view === 'customers' ? <Customers /> : view === 'growth' ? <Growth /> : <Discovery />;
  return <div className="oh-root"><Head><title>OrixHealth · Operating System Starter</title><meta name="description" content="Synthetic OrixHealth operating system starter demonstration." /><style>{`
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@600;700;800&display=swap');
    :root{--ink:#152a2c;--muted:#667b7b;--line:#dbe7e4;--paper:#f7fbfa;--white:#fff;--teal:#0b8f82;--teal-soft:#e1f4f0;--amber:#bd7b16;--amber-soft:#fff3dc;--rose:#c14f5c;--rose-soft:#fde8eb;--blue:#3673b9;--blue-soft:#e8f1fb;--purple:#7654a7;--purple-soft:#f0eafa}
    *{box-sizing:border-box}.oh-root{min-height:100vh;background:var(--paper);color:var(--ink);font-family:'DM Sans',sans-serif}.oh-root button{font:inherit}.oh-shell{display:grid;grid-template-columns:245px minmax(0,1fr);min-height:100vh}.oh-side{background:#12383a;color:#e8f6f2;padding:27px 18px;display:flex;flex-direction:column}.oh-brand{display:flex;align-items:center;gap:10px;font-family:Manrope,sans-serif;font-weight:800;font-size:1.08rem;letter-spacing:-.03em;padding:0 10px}.oh-mark{display:grid;place-items:center;background:#b8e8d7;color:#12383a;width:29px;height:29px;border-radius:9px;font-size:.82rem}.oh-prospect{margin:36px 10px 18px;color:#9bc7be;font-size:.67rem;text-transform:uppercase;letter-spacing:.13em;font-weight:700}.oh-side nav{display:grid;gap:4px}.oh-side nav button{background:transparent;border:0;color:#b5d2ce;text-align:left;padding:11px 12px;border-radius:9px;cursor:pointer;font-weight:500;display:flex;align-items:center;gap:11px}.oh-side nav button:hover,.oh-side nav button.active{background:#245457;color:#fff}.oh-nav-dot{width:7px;height:7px;border:1px solid currentColor;border-radius:50%;opacity:.7}.oh-side-foot{margin-top:auto;border-top:1px solid #2b5b5d;padding:19px 10px 0;color:#98c1bb;font-size:.75rem;line-height:1.5}.oh-side-foot strong{display:block;color:#e5f5f0;font-size:.82rem;margin-bottom:3px}.oh-main{min-width:0;padding:28px clamp(20px,4vw,58px) 70px}.oh-topbar{display:flex;justify-content:space-between;align-items:center;gap:15px;margin-bottom:30px}.oh-breadcrumb{font-size:.78rem;color:var(--muted)}.oh-breadcrumb strong{color:var(--ink)}.oh-demo-badge{border:1px solid #c5e5de;background:#effbf7;color:#28786e;border-radius:99px;padding:7px 11px;font-size:.71rem;font-weight:700;letter-spacing:.04em}.oh-welcome{display:flex;justify-content:space-between;gap:24px;align-items:flex-end;margin-bottom:26px}.oh-eyebrow{margin:0 0 8px;color:var(--teal);font-size:.7rem;text-transform:uppercase;letter-spacing:.13em;font-weight:700}.oh-welcome h1{font:800 clamp(2rem,4vw,3.25rem)/1.05 Manrope,sans-serif;letter-spacing:-.06em;max-width:690px;margin:0 0 13px;color:#12383a}.oh-welcome p:not(.oh-eyebrow){color:var(--muted);line-height:1.55;max-width:620px;margin:0;font-size:1rem}.oh-date-card{min-width:195px;background:#e3f4ef;border-radius:13px;padding:15px 17px;color:#36736b}.oh-date-card span,.oh-date-card small{display:block;font-size:.7rem}.oh-date-card strong{display:block;color:#12383a;font-size:.9rem;margin:4px 0}.oh-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:19px}.oh-metric{background:var(--white);border:1px solid var(--line);border-top:3px solid var(--teal);border-radius:12px;padding:16px 17px}.oh-metric-blue{border-top-color:var(--blue)}.oh-metric-amber{border-top-color:var(--amber)}.oh-metric-purple{border-top-color:var(--purple)}.oh-metric span,.oh-metric small{display:block;color:var(--muted);font-size:.74rem}.oh-metric strong{display:block;font:800 1.85rem Manrope,sans-serif;margin:7px 0 2px;color:#12383a}.oh-panel{background:var(--white);border:1px solid var(--line);border-radius:14px;padding:22px;margin-bottom:16px}.oh-panel-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:16px}.oh-panel h2{font:700 1.18rem Manrope,sans-serif;margin:0;letter-spacing:-.035em}.oh-panel-action{font-size:.7rem;color:var(--muted);border:1px solid var(--line);border-radius:99px;padding:6px 9px;white-space:nowrap}.oh-panel-lead{color:var(--muted);font-size:.88rem;line-height:1.5;margin:-5px 0 18px;max-width:720px}.oh-two-col{display:grid;grid-template-columns:1.08fr .92fr;gap:16px}.oh-attention-list{display:grid;gap:2px}.oh-attention-list button{border:0;border-top:1px solid var(--line);background:transparent;text-align:left;padding:14px 0;display:grid;grid-template-columns:30px 1fr 18px;align-items:center;gap:10px;cursor:pointer;color:var(--ink)}.oh-attention-list button:first-child{border-top:0;padding-top:0}.oh-attention-list button:hover strong,.oh-text-button:hover{color:var(--teal)}.oh-attention-list strong,.oh-attention-list small{display:block}.oh-attention-list small{color:var(--muted);font-size:.77rem;margin-top:4px}.oh-attention-list b{color:#98acaa}.oh-attention-icon{display:grid;place-items:center;border-radius:9px;width:28px;height:28px;font-weight:700}.oh-attention-icon.amber{background:var(--amber-soft);color:var(--amber)}.oh-attention-icon.blue{background:var(--blue-soft);color:var(--blue)}.oh-attention-icon.purple{background:var(--purple-soft);color:var(--purple)}.oh-rhythm{display:grid;gap:15px}.oh-rhythm div{display:grid;grid-template-columns:28px 1fr;column-gap:9px}.oh-rhythm b{grid-row:span 2;color:var(--teal);font-size:.74rem}.oh-rhythm span{font-weight:700;font-size:.9rem}.oh-rhythm small{color:var(--muted);font-size:.77rem;line-height:1.35;margin-top:3px}.oh-pulse-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.oh-pulse-grid div{border-left:2px solid #b8e8d7;padding-left:12px}.oh-pulse-grid span,.oh-pulse-grid small{display:block;color:var(--muted);font-size:.74rem}.oh-pulse-grid strong{display:block;font:700 1.2rem Manrope;margin:5px 0}.oh-table-wrap{overflow-x:auto}.oh-table-wrap table{width:100%;border-collapse:collapse;font-size:.84rem}.oh-table-wrap th{text-align:left;color:#839594;text-transform:uppercase;font-size:.65rem;letter-spacing:.08em;font-weight:700;padding:10px 10px;border-bottom:1px solid var(--line)}.oh-table-wrap td{padding:14px 10px;border-bottom:1px solid var(--line);vertical-align:middle;white-space:nowrap}.oh-table-wrap td:first-child,.oh-table-wrap th:first-child{padding-left:0}.oh-table-wrap td:last-child,.oh-table-wrap th:last-child{padding-right:0}.oh-table-wrap td strong,.oh-table-wrap td small{display:block}.oh-table-wrap td small{color:var(--muted);font-size:.72rem;margin-top:4px}.oh-pill{display:inline-block;padding:5px 8px;border-radius:99px;font-size:.68rem;font-weight:700;white-space:nowrap}.oh-pill-teal{background:var(--teal-soft);color:#17786e}.oh-pill-amber{background:var(--amber-soft);color:#9b6511}.oh-pill-rose{background:var(--rose-soft);color:#a63d4a}.oh-pill-blue{background:var(--blue-soft);color:#2d639f}.oh-pill-purple{background:var(--purple-soft);color:#674796}.oh-pill-slate{background:#edf2f2;color:#5e7271}.oh-text-button{border:0;background:transparent;color:#347d75;font-size:.76rem;font-weight:700;cursor:pointer;padding:4px 0}.oh-alert-banner,.oh-safety-note{display:flex;align-items:center;gap:11px;background:var(--amber-soft);border:1px solid #f1dcae;border-radius:10px;padding:12px 14px;margin-bottom:15px}.oh-alert-banner strong,.oh-alert-banner small{display:block}.oh-alert-banner small{font-size:.76rem;color:#876426;margin-top:3px}.oh-recon-summary{display:flex;gap:10px;margin-bottom:18px}.oh-recon-summary div{background:#f6faf9;border-radius:9px;padding:12px 15px;min-width:120px}.oh-recon-summary span{display:block;color:var(--muted);font-size:.7rem}.oh-recon-summary strong{display:block;font:700 1.25rem Manrope;margin-top:5px}.oh-good{color:var(--teal)}.oh-warn{color:var(--amber)}.oh-customer-grid,.oh-campaigns{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.oh-customer,.oh-campaigns article{border:1px solid var(--line);border-radius:11px;padding:16px;display:flex;gap:12px}.oh-avatar{background:#dff3ee;color:var(--teal);border-radius:50%;width:36px;height:36px;display:grid;place-items:center;font-weight:700}.oh-customer h3,.oh-campaigns h3{font-size:.92rem;margin:0 0 7px}.oh-customer p,.oh-campaigns p{color:var(--muted);font-size:.78rem;line-height:1.45;margin:10px 0}.oh-campaigns article{display:block}.oh-campaign-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}.oh-campaign-top>span{color:var(--muted);font-size:.72rem}.oh-safety-note{background:#eff8f6;border-color:#c8e7df;color:#3f6e68;margin-top:18px;font-size:.8rem}.oh-safety-note strong{color:#195c55}.oh-check-summary{display:flex;gap:8px;margin-bottom:14px;border-bottom:1px solid var(--line);padding-bottom:14px}.oh-check-summary button{background:#f5f9f8;border:1px solid var(--line);border-radius:9px;padding:8px 13px;display:flex;gap:7px;align-items:baseline;cursor:pointer;color:var(--muted)}.oh-check-summary button.active{background:var(--teal-soft);border-color:#9fd6cb;color:#146e65}.oh-check-summary strong{font-size:1rem;color:var(--ink)}.oh-checklist{display:grid}.oh-check{display:grid;grid-template-columns:34px minmax(0,1fr) auto auto;gap:10px;align-items:center;padding:11px 0;border-bottom:1px solid var(--line)}.oh-check-number{color:#9ab0ad;font-size:.7rem;font-weight:700}.oh-check strong,.oh-check small{display:block}.oh-check small{color:var(--muted);font-size:.74rem;margin-top:3px;line-height:1.35}.oh-check .oh-text-button{margin-left:8px}@media(max-width:900px){.oh-shell{grid-template-columns:1fr}.oh-side{padding:16px;position:sticky;top:0;z-index:3}.oh-prospect,.oh-side-foot{display:none}.oh-side nav{display:flex;overflow:auto;margin-top:15px}.oh-side nav button{white-space:nowrap}.oh-main{padding:22px 16px 50px}.oh-metrics{grid-template-columns:repeat(2,1fr)}.oh-two-col{grid-template-columns:1fr}.oh-pulse-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:560px){.oh-welcome{display:block}.oh-date-card{margin-top:18px}.oh-topbar{margin-bottom:22px}.oh-demo-badge{font-size:.62rem}.oh-metrics{gap:8px}.oh-metric{padding:12px}.oh-metric strong{font-size:1.5rem}.oh-panel{padding:16px}.oh-pulse-grid,.oh-customer-grid,.oh-campaigns{grid-template-columns:1fr}.oh-check{grid-template-columns:25px minmax(0,1fr) auto}.oh-check .oh-text-button{grid-column:2}.oh-check .oh-pill{grid-column:3;grid-row:1}.oh-check-summary{overflow:auto}.oh-check-summary button{flex:0 0 auto}}
  `}</style></Head><div className="oh-shell"><aside className="oh-side"><div className="oh-brand"><span className="oh-mark">O</span> OrixHealth</div><p className="oh-prospect">Operating system starter</p><nav>{navItems.map(([id, label]) => <button type="button" className={view === id ? 'active' : ''} onClick={() => setView(id)} key={id}><span className="oh-nav-dot" />{label}</button>)}</nav><div className="oh-side-foot"><strong>Prepared for Friday</strong>Decision-ready visibility for a practical Zoho enhancement conversation.<br /><br />Synthetic demonstration · no live connections</div></aside><main className="oh-main"><div className="oh-topbar"><div className="oh-breadcrumb">CorpFlowAI / <strong>OrixHealth starter</strong></div><span className="oh-demo-badge">SYNTHETIC DEMO DATA</span></div>{content}</main></div></div>;
}
