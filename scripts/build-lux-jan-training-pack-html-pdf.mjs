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
const captureGraphicsDir = path.join(
  root,
  'artifacts',
  'luxe-maurice-training-pack-v1',
  '05-graphics',
  'captures',
);
const outHtml = path.join(pack, 'LUXEMAURICE_TRAINING_PACK_FOR_JAN.html');
const outPdf = path.join(pack, 'LUXEMAURICE_TRAINING_PACK_FOR_JAN.pdf');
const localChrome =
  process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : '';

function browserLaunchOptions() {
  return localChrome && fs.existsSync(localChrome)
    ? { headless: true, executablePath: localChrome }
    : { headless: true };
}

const GRAPHICS = [
  ['01-landing-page.png', 'Figure 1 - LuxeMaurice AI home'],
  ['02-private-opportunities.png', 'Figure 2 - Access catalogue'],
  ['03-private-access-request-form.png', 'Figure 3 - Request access form'],
  ['04-request-submitted-reference.png', 'Figure 4 - Confirmation and LM-REQ reference'],
  ['05-advisor-sign-in-prompt.png', 'Figure 5 - Signed-out Advisor Pipeline'],
  ['06-advisor-pipeline-live-request.png', 'Figure 6 - Persisted training request (focused)'],
  ['07-demonstration-records.png', 'Figure 7 - Demonstration records (layout only)'],
  ['08-change-console-lead-workflow.png', 'Figure 8 - Focused lead and OPERATOR ACTIONS'],
  ['09-change-content-sprint-upload.png', 'Figure 9 - Illustrated C1/C2 Upload content workflow using existing controls'],
  ['10-change-attachment-review-publish.png', 'Figure 10 - Illustrated attachment review, link, and image publish controls'],
  ['11-properties-admin-listing-editor.png', 'Figure 11 - Illustrated existing property/listing editor and visibility controls'],
];

const CONTENT_WORKFLOW_GRAPHICS = [
  {
    filename: '09-change-content-sprint-upload.png',
    eyebrow: 'Existing /change workflow · illustrated guide',
    title: 'Add content to a LuxeMaurice sprint ticket',
    body: `
      <div class="columns">
        <aside>
          <small>PROPERTY & MEDIA</small>
          <button class="ticket active">C1 · Homepage imagery</button>
          <button class="ticket">C2 · First private opportunity</button>
          <button class="ticket">C4 · Jan validation</button>
        </aside>
        <section class="workspace">
          <span class="badge">C1 CONTENT SPRINT</span>
          <h2>Add content</h2>
          <p>Attach client-approved images, videos, or documents to this sprint task.</p>
          <button class="primary">Upload content</button>
          <ol>
            <li>Choose a supported image, video, or PDF.</li>
            <li>Confirm the uploaded attachment appears.</li>
            <li>Review it before any public use.</li>
          </ol>
          <div class="notice">Nothing becomes public at the upload step.</div>
        </section>
      </div>`,
  },
  {
    filename: '10-change-attachment-review-publish.png',
    eyebrow: 'Existing /change governance · illustrated guide',
    title: 'Review, link, and publish an approved image',
    body: `
      <section class="workspace wide">
        <div class="summary"><b>Total 1</b><b>Reviewed 1</b><b>Linked 1</b><b>Published 0</b></div>
        <div class="attachment">
          <div><span class="badge success">REVIEWED</span><h2>training-villa-hero.webp</h2><p>image/webp · fictional training file</p></div>
          <button class="secondary">Mark reviewed</button>
          <div class="rule"></div>
          <h3>Link this reviewed file to a property or opportunity</h3>
          <div class="fields"><label>Property slug<input value="lm-training-villa" readonly></label><label>Public slot<select><option>hero</option><option>card</option><option>gallery</option></select></label></div>
          <button class="secondary">Link to property</button>
          <div class="notice">Linking keeps the file private until Publish is selected.</div>
          <button class="primary">Publish approved image</button>
        </div>
      </section>`,
  },
  {
    filename: '11-properties-admin-listing-editor.png',
    eyebrow: 'Existing /properties/admin workflow · illustrated guide',
    title: 'Create or edit listing text and visibility',
    body: `
      <div class="columns admin">
        <aside><small>INVENTORY</small><p>Draft 1 · Preview 0 · Published 0</p><button class="ticket active">Training Villa LM-101</button><button class="secondary">New private opportunity</button></aside>
        <section class="workspace">
          <div class="visibility"><b>Quick visibility</b><button>draft</button><button>preview</button><button class="selected">published</button><button>archived</button></div>
          <div class="fields"><label>Title<input value="Training Villa LM-101" readonly></label><label>Region<input value="Grand Baie (fictional)" readonly></label></div>
          <div class="fields"><label>Listing status<input value="Available" readonly></label><label>Price guidance<input value="On application" readonly></label></div>
          <label>Description<textarea readonly>Fictional training copy used only to demonstrate the existing listing editor.</textarea></label>
          <button class="primary">Save private opportunity</button>
          <div class="notice">Saving and visibility are deliberate controls. Nothing auto-publishes.</div>
        </section>
      </div>`,
  },
];

function workflowGraphicHtml(graphic) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    *{box-sizing:border-box} body{margin:0;background:#11100e;color:#f4efe4;font-family:Inter,Segoe UI,Arial,sans-serif}
    main{width:1400px;min-height:900px;padding:54px 62px;background:radial-gradient(circle at 90% 0,#3b3020 0,transparent 32%),#11100e}
    .eyebrow,small{color:#d0ad62;font-size:13px;font-weight:800;letter-spacing:.16em;text-transform:uppercase}
    h1{font-family:Georgia,serif;font-size:48px;font-weight:500;margin:12px 0 34px} h2{font-family:Georgia,serif;font-size:32px;margin:10px 0} h3{font-size:17px}
    p,li,label{color:#d8d0c1;font-size:17px;line-height:1.55}.columns{display:grid;grid-template-columns:330px 1fr;gap:26px}.columns.admin{grid-template-columns:300px 1fr}
    aside,.workspace,.attachment{background:#f5f0e6;color:#27231d;border:1px solid #d8c9aa;border-radius:18px;padding:26px;box-shadow:0 18px 52px #0008}
    aside p,.workspace p,.workspace li,.workspace label,.attachment p{color:#625b50}.workspace.wide{max-width:1050px}.ticket,.secondary,.primary,.visibility button{display:block;width:100%;border-radius:9px;border:1px solid #b89b5b;padding:13px 15px;margin-top:12px;text-align:left;font-weight:750;background:#fff;color:#2b261e}
    .ticket.active,.visibility .selected{background:#2d2a24;color:#fff}.primary{background:#b8903f;color:#fff;text-align:center;font-size:17px}.secondary{width:auto;display:inline-block;background:#fff}
    .badge{display:inline-block;background:#2d2a24;color:#fff;border-radius:999px;padding:7px 11px;font-size:12px;font-weight:800;letter-spacing:.08em}.badge.success{background:#446a4d}
    .notice{margin-top:18px;border-left:4px solid #b8903f;background:#eee3ca;padding:14px;color:#493d28;font-weight:700}.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px}.summary b{background:#eee3ca;border-radius:10px;padding:14px;color:#493d28}
    .attachment{box-shadow:none}.rule{height:1px;background:#d8c9aa;margin:20px 0}.fields{display:grid;grid-template-columns:1fr 1fr;gap:16px}label{display:grid;gap:7px;font-weight:700}input,select,textarea{width:100%;border:1px solid #cbbd9f;border-radius:8px;padding:12px;background:#fff;color:#302a22;font:inherit}textarea{min-height:120px}.visibility{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:20px}.visibility button{width:auto;margin:0;padding:8px 12px}.visibility b{margin-right:5px}
  </style></head><body><main><div class="eyebrow">${graphic.eyebrow}</div><h1>${graphic.title}</h1>${graphic.body}</main></body></html>`;
}

async function writeContentWorkflowGraphics() {
  fs.mkdirSync(graphicsDir, { recursive: true });
  fs.mkdirSync(captureGraphicsDir, { recursive: true });
  const browser = await chromium.launch(browserLaunchOptions());
  try {
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1 });
    for (const graphic of CONTENT_WORKFLOW_GRAPHICS) {
      await page.setContent(workflowGraphicHtml(graphic), { waitUntil: 'load' });
      const capturePath = path.join(captureGraphicsDir, graphic.filename);
      await page.screenshot({ path: capturePath, fullPage: true });
      fs.copyFileSync(capturePath, path.join(graphicsDir, graphic.filename));
    }
  } finally {
    await browser.close();
  }
}

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
      <h2>How to upload and update LuxeMaurice website content</h2>
      <div class="panel">
        <p>LuxeMaurice already has two protected tools. Use <span class="url">https://lux.corpflowai.com/properties/admin</span> for property/listing text and visibility. Use <span class="url">https://lux.corpflowai.com/change</span> for images, videos, and PDF/document attachments.</p>
        <p>This is not a general CMS and nothing auto-publishes. The existing workflow is: <strong>upload → review → link → publish → verify</strong>. Jan can use it with the authorised LuxeMaurice tenant/editor account; Anton can co-pilot. Jan's complete production walk-through remains to be verified.</p>
      </div>

      <h3>A. Property/listing text and visibility — /properties/admin</h3>
      <ol>
        <li>Open <span class="url">https://lux.corpflowai.com/properties/admin</span> and sign in.</li>
        <li>Select an opportunity or choose <strong>New private opportunity</strong>.</li>
        <li>Complete title, slug, region, property type, listing status, price guidance, teaser, description, highlights, bedrooms, bathrooms, and area.</li>
        <li>Select <strong>Save</strong>.</li>
        <li>Set visibility deliberately: <code>draft</code>, <code>preview</code>, <code>published</code>, or <code>archived</code>.</li>
        <li>Preview first; after publication verify <span class="url">/properties</span> and <span class="url">/property/&lt;slug&gt;</span>.</li>
      </ol>
      <p>Saving text does not make it public automatically.</p>
      ${figure('11-properties-admin-listing-editor.png', 'Figure 11 - Illustrated existing property/listing editor and visibility controls')}

      <h3>B. Images/photos — /change</h3>
      <ol>
        <li>Open <span class="url">https://lux.corpflowai.com/change</span> and select the relevant C1–C4 content sprint ticket (C1 homepage imagery; C2 first real opportunity).</li>
        <li>In <strong>Add content</strong>, select <strong>Upload content</strong> and choose an image.</li>
        <li>Confirm the green upload result and the file in <strong>Attachments</strong>.</li>
        <li>Select <strong>Mark reviewed</strong>.</li>
        <li>Link the reviewed image to the property/opportunity slug.</li>
        <li>Choose <code>hero</code>, <code>card</code>, or <code>gallery</code>; add public alt/caption details and gallery order/cover where needed.</li>
        <li>Select <strong>Publish</strong>, then verify the corresponding live page.</li>
      </ol>
      <p>The current endpoint accepts <code>image/*</code>, <code>video/*</code>, and exact <code>application/pdf</code>. The current default limit is 3 MB per file and 8 files per ticket unless existing deployment configuration overrides it.</p>
      ${figure('09-change-content-sprint-upload.png', 'Figure 9 - Illustrated C1/C2 Upload content workflow using existing controls')}
      ${figure('10-change-attachment-review-publish.png', 'Figure 10 - Illustrated attachment review, link, and image publish controls')}

      <h3>C. PDFs/documents</h3>
      <p>Use <strong>Upload content</strong> on the relevant <span class="url">/change</span> ticket. PDFs are accepted as <code>application/pdf</code>, appear as governed attachments, and can be securely viewed/downloaded by authorised users.</p>
      <p><strong>Current public-display limit:</strong> Luxe pages do not currently compose a public brochure/download component. CorpFlowAI must add or configure the approved public link/download surface before a PDF can appear publicly. Upload alone is not publication.</p>

      <h3>D. Videos/walkthroughs</h3>
      <p>The existing endpoint accepts <code>video/*</code> for private governed review. Public Luxe property media currently serves only reviewed and explicitly published <code>image/*</code>; there is no public video player, transcoding flow, or video publish slot.</p>
      <p>Use a YouTube, Vimeo, or approved private-hosted link for operator placement after approval, or upload raw video for private review and agree the hosting/embed step separately.</p>

      <h3>E. What is self-service and what remains governed</h3>

      <ul>
        <li><strong>Jan can:</strong> create/edit listing text and visibility in <span class="url">/properties/admin</span>; upload supported files in <span class="url">/change</span>; review attachments; link approved images; and use explicit image publish controls with the authorised account.</li>
        <li><strong>CorpFlowAI/operator still checks:</strong> rights, privacy, public wording, correct property/slot, any missing PDF/video display surface, and the final live result.</li>
      </ul>

      <h3>F. Verify after publication</h3>
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
          <tr><td>/properties/admin listing text + draft/preview/published/archived visibility</td><td>Existing protected workflow</td></tr>
          <tr><td>/change image upload → review → link → hero/card/gallery publish</td><td>Existing governed workflow</td></tr>
          <tr><td>PDF/video upload and private review</td><td>Existing governed attachment workflow</td></tr>
          <tr><td>Public PDF download or public video player</td><td><strong>Not implemented</strong> — CorpFlowAI placement/build step required</td></tr>
          <tr><td>Outbound email / WhatsApp / SMS from the platform</td><td><strong>Not live</strong></td></tr>
          <tr><td>Automated client confirmation or advisor notification</td><td><strong>Not live</strong></td></tr>
          <tr><td>Follow-up after submission</td><td><strong>Human-led</strong> by your team</td></tr>
        </tbody>
      </table>
    </section>

    <section id="gallery">
      <h2>5. Training graphics gallery (01-11)</h2>
      <p>All eleven training graphics in sequence. Graphics 09–11 are clearly labelled illustrated guides based on the existing controls.</p>
      ${GRAPHICS.map(([file, caption]) => figure(file, caption)).join('\n')}
    </section>

    <footer>
      LuxeMaurice user guide and training walkthrough · Verification edition 15 July 2026 · CorpFlowAI · Demonstration data only
    </footer>
  </main>
</body>
</html>`;
}

async function writePdf(htmlPath, pdfPath) {
  const browser = await chromium.launch(browserLaunchOptions());
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

await writeContentWorkflowGraphics();
const html = buildHtml().replace(/[ \t]+$/gm, '');
fs.writeFileSync(outHtml, html, 'utf8');
console.log('wrote', outHtml, fs.statSync(outHtml).size);

await writePdf(outHtml, outPdf);
console.log('wrote', outPdf, fs.statSync(outPdf).size);
console.log('DONE_JAN_PACK');
