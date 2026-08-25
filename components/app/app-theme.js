/**
 * Visual tokens for Slice 1 Core vs Tenant shell.
 * Distinct scopes; not marketing hero; reuse --cf-* naming.
 */

export const APP_FONT_HREF =
  'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=IBM+Plex+Serif:wght@500;600&display=swap';

export const CORE_THEME = Object.freeze({
  scope: 'core',
  label: 'CorpFlowAI Operating Workspace',
  '--app-bg0': '#0b1220',
  '--app-bg1': '#152238',
  '--app-panel': 'rgba(18, 28, 48, 0.92)',
  '--app-panel-border': 'rgba(148, 163, 184, 0.28)',
  '--app-text': '#e8eef7',
  '--app-muted': '#94a3b8',
  '--app-accent': '#38bdf8',
  '--app-accent-soft': 'rgba(56, 189, 248, 0.14)',
  '--app-warn': '#fbbf24',
  '--app-ok': '#34d399',
  '--app-danger': '#f87171',
  '--app-stripe':
    'repeating-linear-gradient(135deg, rgba(56,189,248,0.08) 0 12px, transparent 12px 24px)',
});

export const TENANT_THEME = Object.freeze({
  scope: 'tenant',
  label: 'Tenant Workspace — CorpFlowAI',
  '--app-bg0': '#071a18',
  '--app-bg1': '#0f2f2a',
  '--app-panel': 'rgba(12, 36, 32, 0.94)',
  '--app-panel-border': 'rgba(45, 212, 191, 0.28)',
  '--app-text': '#ecfdf8',
  '--app-muted': '#99b8b0',
  '--app-accent': '#2dd4bf',
  '--app-accent-soft': 'rgba(45, 212, 191, 0.16)',
  '--app-warn': '#fbbf24',
  '--app-ok': '#6ee7b7',
  '--app-danger': '#fb7185',
  '--app-stripe':
    'radial-gradient(ellipse at 20% 0%, rgba(45,212,191,0.18), transparent 55%), radial-gradient(ellipse at 90% 20%, rgba(20,184,166,0.12), transparent 45%)',
});

export function themeStyleVars(theme) {
  /** @type {Record<string, string>} */
  const style = {};
  for (const [k, v] of Object.entries(theme)) {
    if (k.startsWith('--')) style[k] = String(v);
  }
  return style;
}

export const APP_SHELL_CSS = `
  .cf-app-root {
    min-height: 100vh;
    color: var(--app-text);
    background:
      var(--app-stripe),
      linear-gradient(165deg, var(--app-bg0) 0%, var(--app-bg1) 55%, var(--app-bg0) 100%);
    font-family: "DM Sans", system-ui, sans-serif;
  }
  .cf-app-root * { box-sizing: border-box; }
  .cf-app-chrome {
    position: sticky;
    top: 0;
    z-index: 20;
    display: flex;
    flex-wrap: wrap;
    gap: 12px 20px;
    align-items: center;
    justify-content: space-between;
    padding: 14px 20px;
    border-bottom: 1px solid var(--app-panel-border);
    background: color-mix(in srgb, var(--app-bg0) 88%, transparent);
    backdrop-filter: blur(10px);
  }
  .cf-app-brand {
    font-family: "IBM Plex Serif", Georgia, serif;
    font-weight: 600;
    font-size: 1.15rem;
    letter-spacing: 0.01em;
  }
  .cf-app-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }
  .cf-app-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    border: 1px solid var(--app-panel-border);
    border-radius: 8px;
    background: var(--app-panel);
    font-size: 0.78rem;
    color: var(--app-muted);
  }
  .cf-app-chip strong {
    color: var(--app-text);
    font-weight: 600;
  }
  .cf-app-chip[data-tone="accent"] {
    border-color: var(--app-accent);
    background: var(--app-accent-soft);
    color: var(--app-text);
  }
  a.cf-app-chip {
    text-decoration: none;
    color: inherit;
  }
  a.cf-app-chip:hover {
    border-color: var(--app-accent);
  }
  .cf-app-table-wrap {
    overflow-x: auto;
    margin-top: 16px;
    min-width: 0;
  }
  .cf-app-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.88rem;
  }
  .cf-app-table th,
  .cf-app-table td {
    text-align: left;
    padding: 10px 8px;
    border-bottom: 1px solid var(--app-panel-border);
    vertical-align: top;
    word-break: break-word;
  }
  .cf-app-table th {
    color: var(--app-muted);
    font-weight: 600;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .cf-app-signal {
    display: inline-block;
    margin: 0 6px 6px 0;
    padding: 2px 7px;
    border-radius: 999px;
    border: 1px solid var(--app-panel-border);
    font-size: 0.72rem;
    color: var(--app-muted);
  }
  .cf-app-main {
    max-width: 1080px;
    margin: 0 auto;
    padding: 28px 18px 64px;
  }
  .cf-app-scope-row {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 22px;
  }
  .cf-app-scope-btn {
    appearance: none;
    border: 1px solid var(--app-panel-border);
    background: var(--app-panel);
    color: var(--app-text);
    border-radius: 10px;
    padding: 12px 16px;
    font: inherit;
    font-weight: 600;
    cursor: pointer;
    transition: border-color 160ms ease, transform 160ms ease, background 160ms ease;
  }
  .cf-app-scope-btn:hover { border-color: var(--app-accent); transform: translateY(-1px); }
  .cf-app-scope-btn[data-active="true"] {
    border-color: var(--app-accent);
    background: var(--app-accent-soft);
    box-shadow: 0 0 0 1px var(--app-accent);
  }
  .cf-app-scope-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    transform: none;
  }
  .cf-app-panel {
    border: 1px solid var(--app-panel-border);
    background: var(--app-panel);
    border-radius: 14px;
    padding: 20px 18px;
    margin-bottom: 16px;
  }
  .cf-app-h1 {
    font-family: "IBM Plex Serif", Georgia, serif;
    font-size: clamp(1.35rem, 2.4vw, 1.75rem);
    margin: 0 0 8px;
    font-weight: 600;
  }
  .cf-app-lead {
    margin: 0;
    color: var(--app-muted);
    line-height: 1.45;
    max-width: 62ch;
  }
  .cf-app-progress {
    display: grid;
    gap: 8px;
    margin-top: 16px;
  }
  .cf-app-progress-bar {
    height: 10px;
    border-radius: 999px;
    background: rgba(255,255,255,0.08);
    overflow: hidden;
  }
  .cf-app-progress-fill {
    height: 100%;
    width: var(--pct, 0%);
    background: linear-gradient(90deg, var(--app-accent), color-mix(in srgb, var(--app-accent) 55%, white));
    transition: width 280ms ease;
  }
  .cf-app-grid {
    display: grid;
    gap: 12px;
  }
  .cf-app-comp {
    border: 1px solid var(--app-panel-border);
    border-radius: 12px;
    padding: 14px;
    background: rgba(0,0,0,0.12);
  }
  .cf-app-comp[data-attention="true"] {
    border-color: var(--app-warn);
  }
  .cf-app-comp-head {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 8px;
  }
  .cf-app-comp-title {
    margin: 0;
    font-size: 1rem;
    font-weight: 650;
  }
  .cf-app-badge {
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    padding: 4px 8px;
    border-radius: 6px;
    background: var(--app-accent-soft);
    color: var(--app-text);
  }
  .cf-app-badge[data-kind="viewonly"] {
    background: rgba(148,163,184,0.18);
  }
  .cf-app-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 12px;
  }
  .cf-app-btn {
    appearance: none;
    border: 1px solid var(--app-panel-border);
    background: transparent;
    color: var(--app-text);
    border-radius: 8px;
    padding: 8px 12px;
    font: inherit;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
  }
  .cf-app-btn[data-primary="true"] {
    background: var(--app-accent);
    border-color: transparent;
    color: #04201c;
  }
  .cf-app-btn:disabled { opacity: 0.45; cursor: not-allowed; }
  .cf-app-input, .cf-app-textarea {
    width: 100%;
    margin-top: 8px;
    border-radius: 8px;
    border: 1px solid var(--app-panel-border);
    background: rgba(0,0,0,0.2);
    color: var(--app-text);
    padding: 10px 12px;
    font: inherit;
  }
  .cf-app-textarea { min-height: 88px; resize: vertical; }
  .cf-app-error {
    color: var(--app-danger);
    margin: 12px 0 0;
    font-size: 0.9rem;
  }
  .cf-app-ok {
    color: var(--app-ok);
    margin: 12px 0 0;
    font-size: 0.9rem;
  }
  .cf-app-muted { color: var(--app-muted); font-size: 0.9rem; }
  .cf-app-kv {
    display: grid;
    grid-template-columns: minmax(120px, 180px) 1fr;
    gap: 6px 12px;
    font-size: 0.9rem;
    margin-top: 10px;
  }
  .cf-app-kv dt { color: var(--app-muted); margin: 0; }
  .cf-app-kv dd { margin: 0; word-break: break-word; }
  .cf-app-form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 12px 16px;
    margin-top: 14px;
  }
  .cf-app-label {
    display: block;
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--app-muted);
  }
  .cf-app-history {
    list-style: none;
    margin: 12px 0 0;
    padding: 0;
  }
  .cf-app-history li {
    border-bottom: 1px solid var(--app-panel-border);
    padding: 10px 0;
  }
  .cf-app-filter-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 14px;
  }
  .cf-app-sort-btn {
    appearance: none;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    padding: 0;
    cursor: pointer;
  }
  .cf-app-sort-btn[data-active="true"] {
    color: var(--app-text);
  }
  .cf-app-table th button {
    text-align: left;
  }
  .cf-app-search {
    margin-top: 14px;
    max-width: 360px;
  }
  .cf-pipe-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 12px 16px;
    margin: 16px 0 8px;
    min-width: 0;
  }
  .cf-pipe-filters .cf-app-label { min-width: 160px; flex: 1 1 180px; }
  .cf-pipe-filters .cf-app-input { width: 100%; margin-top: 6px; }
  .cf-pipe-board {
    display: flex;
    gap: 12px;
    overflow-x: auto;
    padding: 8px 0 16px;
    min-width: 0;
  }
  .cf-pipe-lane {
    flex: 0 0 260px;
    min-width: 0;
    background: rgba(0,0,0,0.18);
    border: 1px solid var(--app-panel-border);
    border-radius: 14px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .cf-pipe-lane-head {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    align-items: baseline;
  }
  .cf-pipe-empty { margin: 0; font-size: 0.82rem; }
  .cf-pipe-card {
    background: var(--app-panel);
    border: 1px solid var(--app-panel-border);
    border-radius: 12px;
    padding: 10px;
    min-width: 0;
  }
  .cf-pipe-card[data-stale="true"] {
    border-color: color-mix(in srgb, var(--app-warn) 55%, var(--app-panel-border));
  }
  .cf-pipe-card-title {
    color: var(--app-text);
    font-weight: 700;
    text-decoration: none;
    word-break: break-word;
  }
  .cf-pipe-card-title:hover { color: var(--app-accent); }
  .cf-pipe-card-meta {
    display: grid;
    gap: 6px;
    margin: 8px 0 0;
  }
  .cf-pipe-card-meta dt {
    font-size: 0.68rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--app-muted);
  }
  .cf-pipe-card-meta dd {
    margin: 2px 0 0;
    font-size: 0.82rem;
    word-break: break-word;
  }
  .cf-pipe-signals { margin-top: 8px; }
  .cf-pipe-move {
    display: grid;
    gap: 8px;
    margin-top: 10px;
  }
  .cf-app-main:has(.cf-pipe-board) {
    max-width: none;
  }
  .cf-app-dl {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 12px 18px;
    margin: 16px 0 0;
  }
  .cf-app-dl dt {
    font-size: 0.72rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--app-muted);
    margin: 0;
  }
  .cf-app-dl dd {
    margin: 4px 0 0;
    font-size: 0.92rem;
    line-height: 1.45;
    word-break: break-word;
    white-space: pre-wrap;
  }
  .cf-life-rail {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 8px 10px;
    margin: 10px 0 16px;
  }
  .cf-life-rail-item {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }
  .cf-life-rail-step {
    color: var(--app-accent);
    text-decoration: none;
    font-weight: 650;
    border: 1px solid var(--app-panel-border);
    border-radius: 999px;
    padding: 6px 10px;
    background: var(--app-accent-soft);
  }
  .cf-life-rail-step[data-current="true"] {
    box-shadow: 0 0 0 1px var(--app-accent);
  }
  .cf-life-rail-arrow {
    color: var(--app-muted);
  }
  .cf-life-rail-meta {
    max-width: 28ch;
  }
  .cf-app-draft-block { margin-top: 16px; }
  .cf-app-draft-block p { margin: 6px 0 0; line-height: 1.5; }
  .cf-app-draft {
    width: 100%;
    margin-top: 8px;
    min-height: 160px;
    border-radius: 8px;
    border: 1px solid var(--app-panel-border);
    background: rgba(0,0,0,0.2);
    color: var(--app-text);
    padding: 10px 12px;
    font: inherit;
    resize: vertical;
  }
  .cf-app-preview {
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px dashed var(--app-panel-border);
  }
  @media (max-width: 640px) {
    .cf-app-chrome { padding: 12px 14px; }
    .cf-app-main { padding: 18px 12px 48px; }
    .cf-app-kv { grid-template-columns: 1fr; }
    .cf-app-table { font-size: 0.8rem; }
    .cf-life-rail-meta { max-width: none; }
  }
`;
