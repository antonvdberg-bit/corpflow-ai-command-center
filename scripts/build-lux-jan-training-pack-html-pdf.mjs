/**
 * Build Jan-facing LuxeMaurice Training Pack HTML + PDF.
 *
 * Usage:
 *   node scripts/build-lux-jan-training-pack-html-pdf.mjs
 *
 * Outputs (under client-delivery-preparation/):
 *   LUXEMAURICE_TRAINING_PACK_FOR_JAN.html
 *   LUXEMAURICE_TRAINING_PACK_FOR_JAN.pdf
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pack = path.join(root, 'artifacts', 'luxe-maurice-training-pack-v1', 'client-delivery-preparation');
const graphicsDir = path.join(pack, 'graphics');
const outHtml = path.join(pack, 'LUXEMAURICE_TRAINING_PACK_FOR_JAN.html');
const outPdf = path.join(pack, 'LUXEMAURICE_TRAINING_PACK_FOR_JAN.pdf');

const GRAPHICS = [
  ['01-landing-page.png', 'Figure 1 - LuxeMaurice AI home'],
  ['02-private-opportunities.png', 'Figure 2 - Access catalogue'],
  ['03-private-access-request-form.png', 'Figure 3 - Request access form'],
  ['04-request-submitted-reference.png', 'Figure 4 - Confirmation and LM-REQ reference'],
  ['05-advisor-sign-in-prompt.png', 'Figure 5 - Signed-out Advisor Pipeline'],
  ['06-advisor-pipeline-live-request.png', 'Figure 6 - Persisted training request (focused)'],
  ['07-demonstration-records.png', 'Figure 7 - Demonstration records (layout only)'],
  ['08-change-console-lead-workflow.png', 'Figure 8 - Focused lead and OPERATOR ACTIONS'],
];

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function dataUri(filename) {
  const p = path.join(graphicsDir, filename);
  const buf = fs.readFileSync(p);
  return `data:image/png;base64,${buf.toString('base64')}`;
}

function figure(filename, caption) {
  return `
    <figure class="shot">
      <img src="${dataUri(filename)}" alt="${esc(caption)}" />
      <figcaption>${esc(caption)}</figcaption>
    </figure>`;
}

function buildHtml() {
  const css = `
    :root {
      --bg: #0b0b0b;
      --panel: #141414;
      --gold: #c5a059;
      --text: #f5f2ea;
      --muted: #b7b2a6;
      --line: #2a2a2a;
      --max: 860px;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.55;
    }
    a { color: var(--gold); }
    .wrap { max-width: var(--max); margin: 0 auto; padding: 0 1.25rem 3rem; }
    header.hero {
      padding: 2.4rem 1.25rem 1.4rem;
      border-bottom: 1px solid var(--line);
      background: linear-gradient(180deg, #18150f 0%, var(--bg) 100%);
    }
    .brand {
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--gold);
      font-size: 0.82rem;
      font-weight: 600;
    }
    h1, h2, h3 { font-family: Georgia, "Times New Roman", serif; font-weight: 500; }
    h1 { font-size: 1.9rem; margin: 0.55rem 0 0.7rem; }
    h2 {
      font-size: 1.35rem;
      margin-top: 2.1rem;
      color: var(--gold);
      border-bottom: 1px solid var(--line);
      padding-bottom: 0.3rem;
      page-break-after: avoid;
    }
    h3 { font-size: 1.05rem; margin-top: 1.2rem; page-break-after: avoid; }
    .lede { color: var(--muted); max-width: 40rem; }
    .panel {
      background: var(--panel);
      border: 1px solid var(--line);
      padding: 1rem 1.1rem;
      margin: 1rem 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 0.9rem 0;
      font-size: 0.92rem;
    }
    th, td {
      border: 1px solid var(--line);
      padding: 0.5rem 0.6rem;
      text-align: left;
      vertical-align: top;
    }
    th { background: var(--panel); color: var(--gold); }
    ol, ul { padding-left: 1.25rem; }
    li { margin: 0.28rem 0; }
    code, .url {
      font-family: ui-monospace, Consolas, monospace;
      font-size: 0.86em;
      color: #e6d7b0;
      word-break: break-all;
    }
    figure.shot {
      margin: 1.1rem 0 1.5rem;
      background: #000;
      border: 1px solid var(--line);
      padding: 0.65rem;
      page-break-inside: avoid;
    }
    figure.shot img {
      display: block;
      width: 100%;
      height: auto;
      max-width: 100%;
    }
    figure.shot figcaption {
      color: var(--gold);
      margin-top: 0.45rem;
      font-size: 0.88rem;
    }
    nav.toc a { text-decoration: none; margin-right: 0.9rem; }
    footer {
      margin-top: 2.5rem;
      padding-top: 1rem;
      border-top: 1px solid var(--line);
      color: var(--muted);
      font-size: 0.9rem;
    }
    @media print {
      body { background: #fff; color: #111; }
      a, .brand, h2, figure.shot figcaption, th, code, .url { color: #8a6a2f; }
      .panel { background: #f7f7f7; border-color: #ddd; }
      header.hero { background: #fff; }
      figure.shot { border-color: #ccc; }
    }
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>LuxeMaurice Platform Training Pack</title>
  <style>${css}</style>
</head>
<body>
  <header class="hero">
    <div class="wrap">
      <div class="brand">LuxeMaurice · User guide and training walkthrough</div>
      <h1>LuxeMaurice AI training pack</h1>
      <p class="lede">A practical user guide and training walkthrough of the live Private Access Request journey: client submission, advisor review, and operator lead management. Prepared for Jan and the LuxeMaurice team by CorpFlowAI.</p>
    </div>
  </header>

  <main class="wrap">
    <nav class="toc" aria-label="Contents">
      <a href="#cover">Cover note</a>
      <a href="#order">Training order</a>
      <a href="#client">Client journey</a>
      <a href="#advisor">Advisor review</a>
      <a href="#operator">Operator workflow</a>
      <a href="#limits">Limitations</a>
      <a href="#gallery">Screenshot gallery</a>
    </nav>

    <section id="cover">
      <h2>Cover note</h2>
      <div class="panel">
        <p>Dear Jan,</p>
        <p>Please find the updated LuxeMaurice user guide and training walkthrough material prepared for your team. It covers how a guest submits a Private Access Request, how advisors review requests after sign-in, how operators manage stage and notes in Change Console, what is live today, and a suggested training order.</p>
        <p>Screenshots use a fictional demonstration identity (<strong>LuxeMaurice Training User</strong> / <span class="url">training@example.invalid</span>) so the pack stays safe for internal training. The walkthrough material is structured for a guided training session; it does not claim that recorded videos are included.</p>
        <p>Please review and confirm whether this is acceptable, or let us know if you would like any changes before we treat the training pack as final.</p>
        <p>Kind regards,<br/>Anton<br/>CorpFlowAI</p>
      </div>
      <p><strong>Verification edition:</strong> 15 July 2026</p>
      <p><strong>Live site:</strong> <span class="url">https://lux.corpflowai.com/client/luxe-maurice-ai</span></p>
    </section>

    <section id="order">
      <h2>Suggested training order</h2>
      <ol>
        <li><strong>Client journey</strong> - Landing → Access catalogue → Private Access Request → on-screen LM-REQ reference (graphics 01-04).</li>
        <li><strong>Advisor journey</strong> - Sign in → Advisor Pipeline → Received for advisor review → Demonstration records vs live rows (graphics 05-07).</li>
        <li><strong>Operator workflow</strong> - Open /change → LEADS → select lead → OPERATOR ACTIONS → stage / next-action practice (graphic 08).</li>
        <li><strong>Live practice round</strong> - Submit one training request, review it, update it in Change Console, then agree how real human-led follow-up will work.</li>
      </ol>
    </section>

    <section id="client">
      <h2>1. Client journey - Private Access Request</h2>
      <h3>Journey at a glance</h3>
      <ol>
        <li>A prospective client visits LuxeMaurice AI.</li>
        <li>They explore private opportunities in the access catalogue.</li>
        <li>They submit a Private Access Request.</li>
        <li>They receive an on-screen <code>LM-REQ-…</code> reference.</li>
        <li>An authorised advisor reviews the request in the Advisor Pipeline.</li>
        <li>The LuxeMaurice operator manages the lead in Change Console.</li>
        <li>Follow-up remains <strong>human-led</strong> (no automated email / WhatsApp / SMS from the platform today).</li>
      </ol>

      <h3>Open the site</h3>
      <p>Go to <span class="url">https://lux.corpflowai.com/client/luxe-maurice-ai</span>. You will see the landing page with private access channels: residences, yachts, aviation, island experiences, and advisory introductions.</p>
      ${figure('01-landing-page.png', 'Figure 1 - LuxeMaurice AI home')}

      <h3>Review private opportunities</h3>
      <p>Open <strong>Access catalogue</strong> at <span class="url">https://lux.corpflowai.com/client/luxe-maurice-ai/properties</span>. Browse categories and open an opportunity, or continue to a general access request.</p>
      ${figure('02-private-opportunities.png', 'Figure 2 - Access catalogue')}

      <h3>Submit a Private Access Request</h3>
      <p>Select <strong>Request access</strong> (<span class="url">https://lux.corpflowai.com/client/luxe-maurice-ai/buyer</span>). Complete the form fields that apply, then select <strong>Submit access request</strong>. Wait for confirmation before closing the page.</p>
      ${figure('03-private-access-request-form.png', 'Figure 3 - Request access form')}
      ${figure('04-request-submitted-reference.png', 'Figure 4 - Confirmation and LM-REQ reference')}

      <p>On success you see confirmation that the request was received for advisor review, plus a reference in the form <code>LM-REQ-…</code>. Keep that reference for follow-up.</p>
    </section>

    <section id="advisor">
      <h2>2. Advisor review - Advisor Pipeline</h2>
      <p><strong>Route:</strong> <span class="url">https://lux.corpflowai.com/client/luxe-maurice-ai/crm</span></p>
      <ol>
        <li>Sign in with LuxeMaurice tenant credentials.</li>
        <li>Open <strong>Advisor pipeline</strong>.</li>
        <li>Review live rows under <strong>Received for advisor review</strong>.</li>
        <li>Treat <strong>Demonstration records</strong> as layout examples only - not live client enquiries.</li>
      </ol>
      <div class="panel">
        <p><strong>Important:</strong> The Advisor Pipeline is a <strong>review surface</strong> and is <strong>read-only</strong> for stage and notes today. Outbound email / WhatsApp / SMS automation is <strong>not live</strong>. Follow-up remains human-led.</p>
      </div>
      ${figure('05-advisor-sign-in-prompt.png', 'Figure 5 - Signed-out Advisor Pipeline')}
      ${figure('06-advisor-pipeline-live-request.png', 'Figure 6 - Persisted training request (focused)')}
      ${figure('07-demonstration-records.png', 'Figure 7 - Demonstration records (layout only)')}
    </section>

    <section id="operator">
      <h2>3. Operator workflow - Change Console</h2>
      <p><strong>Route:</strong> <span class="url">https://lux.corpflowai.com/change</span></p>
      <ol>
        <li>Open Change Console and locate <strong>LEADS · LuxeMaurice CRM (concierge)</strong>.</li>
        <li>Find the request (use the <code>LM-REQ-…</code> reference when matching).</li>
        <li><strong>Select the lead</strong> - the list focuses on that row and <strong>OPERATOR ACTIONS</strong> appears directly underneath.</li>
        <li>Update stage, owner, next action, or notes where supported, then save.</li>
        <li>Use <strong>Show all leads</strong>, <strong>Clear selection</strong>, and <strong>Focus list on this lead</strong> as needed.</li>
      </ol>
      ${figure('08-change-console-lead-workflow.png', 'Figure 8 - Focused lead and OPERATOR ACTIONS')}
      <p>Stage and notes editing happens in Change Console - not in the Advisor Pipeline.</p>
    </section>

    <section id="limits">
      <h2>4. Current limitations</h2>
      <table>
        <thead><tr><th>Topic</th><th>Current state</th></tr></thead>
        <tbody>
          <tr><td>Private Access Request submit + on-screen LM-REQ reference</td><td>Live</td></tr>
          <tr><td>Advisor Pipeline (signed-in review)</td><td>Live - read-only for stage / notes</td></tr>
          <tr><td>Operator stage, owner, next action, notes in Change Console</td><td>Live</td></tr>
          <tr><td>Focused selected-lead list + OPERATOR ACTIONS</td><td>Live</td></tr>
          <tr><td>Outbound email / WhatsApp / SMS from the platform</td><td><strong>Not live</strong></td></tr>
          <tr><td>Automated client confirmation or advisor notification</td><td><strong>Not live</strong></td></tr>
          <tr><td>Follow-up after submission</td><td><strong>Human-led</strong> by your team</td></tr>
        </tbody>
      </table>
    </section>

    <section id="gallery">
      <h2>5. Screenshot gallery (01-08)</h2>
      <p>All eight training graphics in sequence. Demonstration data only.</p>
      ${GRAPHICS.map(([file, caption]) => figure(file, caption)).join('\n')}
    </section>

    <footer>
      LuxeMaurice user guide and training walkthrough · Verification edition 15 July 2026 · CorpFlowAI · Demonstration screenshots only
    </footer>
  </main>
</body>
</html>`;
}

async function writePdf(htmlPath, pdfPath) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load', timeout: 120000 });
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '14mm', right: '12mm', bottom: '14mm', left: '12mm' },
  });
  await browser.close();
}

const html = buildHtml();
fs.writeFileSync(outHtml, html, 'utf8');
console.log('wrote', outHtml, fs.statSync(outHtml).size);

await writePdf(outHtml, outPdf);
console.log('wrote', outPdf, fs.statSync(outPdf).size);
console.log('DONE_JAN_PACK');
