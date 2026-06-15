/**
 * Chat Widget v0 — demo / verification page.
 *
 * Renders a minimal page on the tenant host that loads the chat widget via the
 * canonical `<script async src="/api/chat-widget/loader.js">` tag.
 *
 * Used for live verification at:
 *   https://living-word-mauritius.corpflowai.com/chat-widget-demo
 *
 * Anonymous-public; no auth required to view. The widget itself enforces
 * tenant isolation via host -> tenant_id mapping in `tenant_hostnames`.
 */

import Head from 'next/head';

export default function ChatWidgetDemoPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#FAFAFA',
        color: '#111',
        font: '15px/1.55 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        padding: '48px 20px',
      }}
    >
      <Head>
        <title>Chat widget demo</title>
        <meta name="robots" content="noindex,nofollow" />
        <script async src="/api/chat-widget/loader.js" data-flow="default" data-position="bottom-right" />
      </Head>
      <main style={{ maxWidth: 720, margin: '0 auto' }}>
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>Chat widget — verification page</h1>
        <p style={{ color: '#444', marginTop: 0 }}>
          This is a CorpFlow internal verification surface. It loads the chat widget via a
          standard <code>&lt;script async&gt;</code> tag pointing at <code>/api/chat-widget/loader.js</code>.
          The tenant is resolved from the host that serves this page (via{' '}
          <code>tenant_hostnames</code>).
        </p>
        <h2 style={{ fontSize: 18, marginTop: 32 }}>What you should see</h2>
        <ul>
          <li>A floating chat bubble in the bottom-right corner (when the widget is enabled for this tenant).</li>
          <li>Clicking the bubble opens a panel with a welcome menu and the configured starter options.</li>
          <li>Each conversation creates a <code>chat_widget_threads</code> row scoped to this tenant.</li>
          <li>On submit, an <code>automation_events</code> row of type <code>chat_widget.lead.submitted</code> is created.</li>
        </ul>
        <h2 style={{ fontSize: 18, marginTop: 32 }}>If you do not see the bubble</h2>
        <ul>
          <li>The kill switch may be off (<code>chat_widget_configs.enabled = false</code>).</li>
          <li>The migration may not yet be applied to this database.</li>
          <li>The seed script may not yet have run for this tenant.</li>
        </ul>
        <p style={{ color: '#666', marginTop: 32, fontSize: 13 }}>
          Out of scope for this surface: marketing copy, conversion CTAs, brand chrome. This is a
          throwaway operator-only demo page.
        </p>
      </main>
    </div>
  );
}
