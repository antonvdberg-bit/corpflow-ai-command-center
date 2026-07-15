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
      <a href="#content-updates">Content updates</a>
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
        <p>Please find the updated LuxeMaurice user guide and training walkthrough material prepared for your team. It covers how a guest submits a Private Access Request, how advisors review requests after sign-in, how operators manage stage and notes in Change Console, and how website content updates are provided, applied, and verified.</p>
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

    <section id="content-updates">
      <h2>How LuxeMaurice content gets added to the website</h2>
      <div class="panel">
        <p>Today, LuxeMaurice <strong>website content updates</strong> are handled as a <strong>managed CorpFlowAI update workflow</strong>. There are protected internal tools for controlled listing fields and governed media review, but they are <strong>not a general self-service CMS or upload portal</strong> for all website content.</p>
        <p>Jan sends the approved assets and content details to CorpFlowAI. CorpFlowAI applies the update, checks visibility and privacy, verifies it on the live site, and sends Jan the preview or live link for confirmation. Nothing is published automatically when content is provided.</p>
        <p>A broader self-service content upload experience can be considered as a future enhancement after the current editor and media workflow has been completed and verified end to end with Jan.</p>
      </div>

      <h3>Property photos and image galleries</h3>
      <p>Please provide:</p>
      <ul>
        <li>High-resolution JPEG, PNG, or WebP images.</li>
        <li>The property or listing reference/title.</li>
        <li>The preferred order: <strong>hero image first</strong>, followed by the gallery order.</li>
        <li>Optional captions and image descriptions.</li>
        <li>Any privacy, sensitivity, usage-rights, or expiry notes.</li>
        <li>Which images may be public, private, advisor-only, or request-only.</li>
      </ul>
      <p>CorpFlowAI reviews the files, links approved images to the correct property and placement, publishes only approved public images, and checks the hero and gallery order on the live page.</p>

      <h3>PDF brochures and other documents</h3>
      <p>Please provide the PDF file, its public display name, the property or page it belongs to, whether it should be downloadable, view-only, or private/request-only, and any version or expiry notes.</p>
      <p>PDF files are not automatically displayed when supplied. CorpFlowAI confirms the access level and prepares the appropriate link or document presentation before publication. Private documents remain outside the public website unless explicitly approved.</p>

      <h3>Videos and walkthrough links</h3>
      <p>Preferred: provide a YouTube, Vimeo, or approved private-hosted link if the video is already hosted, together with the video title, target page or listing, thumbnail image if available, and visibility preference (public, private, or request-only).</p>
      <p>If a raw video file is provided, CorpFlowAI must prepare, host, or embed it before it can appear on the website. Raw video files do not publish automatically, and the current property-image workflow does not directly display video as public property media.</p>

      <h3>Text and page-copy updates</h3>
      <p>Please provide the exact replacement text or clear bullet-point changes, the target page and section, approval status, required language or languages, and any wording that must remain private or advisor-only.</p>
      <p>CorpFlowAI applies the approved text to the correct page, checks formatting and links, and sends the resulting page for verification.</p>

      <h3>Property and listing details</h3>
      <p>For a new or updated opportunity, please provide:</p>
      <ul>
        <li>Property name/title and location.</li>
        <li>Price or status, where approved for publication.</li>
        <li>Bedrooms, bathrooms, and area, where applicable.</li>
        <li>Short description, long description, and key features.</li>
        <li>Contact or call-to-action preference.</li>
        <li>Visibility: public, private, advisor-only, coming soon, sold, or hidden.</li>
      </ul>
      <p>CorpFlowAI creates or updates the controlled listing record, applies the approved visibility, connects approved media, and checks the request/private-access path. A listing does not become public merely because its details were supplied.</p>

      <h3>Verify the update after it goes live</h3>
      <p>CorpFlowAI sends Jan a preview or live URL. Jan checks:</p>
      <ul>
        <li>Content accuracy and image order.</li>
        <li>That each document or video opens correctly.</li>
        <li>That visibility and privacy are correct.</li>
        <li>That the call to action and request flow are correct.</li>
      </ul>
      <p>Jan replies <strong>Approved</strong> or <strong>Changes needed</strong>. CorpFlowAI applies agreed corrections and sends the updated link for final confirmation.</p>
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
