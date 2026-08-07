/**
 * #778 Slice 1 — thin authenticated application chrome.
 * Persistent Scope · Tenant · Role; Core vs Tenant visually distinct.
 */

import Link from 'next/link';
import { GLASS_TOKENS } from '../../lib/ui/glass.js';
import { SYNTHETIC_REQUEST_ID } from '../../lib/app/synthetic-store.js';

const CORE_THEME = {
  pageBg:
    'radial-gradient(1200px 600px at 10% -10%, rgba(45,212,191,0.18), transparent 55%), linear-gradient(165deg, #07111f 0%, #0b1a2e 48%, #10243a 100%)',
  accent: GLASS_TOKENS.accent,
  badgeBg: 'rgba(45,212,191,0.16)',
  badgeBorder: 'rgba(45,212,191,0.45)',
  panelBg: 'rgba(8,16,28,0.72)',
  label: 'CORE',
};

const TENANT_THEME = {
  pageBg:
    'radial-gradient(1000px 520px at 90% 0%, rgba(251,191,36,0.16), transparent 50%), linear-gradient(165deg, #1a1208 0%, #24180c 45%, #1c140a 100%)',
  accent: '#f3cd8a',
  badgeBg: 'rgba(243,205,138,0.14)',
  badgeBorder: 'rgba(243,205,138,0.45)',
  panelBg: 'rgba(28,18,10,0.72)',
  label: 'TENANT',
};

/**
 * @param {{
 *   chrome: Record<string, unknown> | null,
 *   children: import('react').ReactNode,
 *   title?: string,
 *   subtitle?: string,
 * }} props
 */
export default function AppShell({ chrome, children, title, subtitle }) {
  const scope = chrome?.selected_scope === 'tenant' ? 'tenant' : 'core';
  const theme = scope === 'tenant' ? TENANT_THEME : CORE_THEME;
  const role = chrome?.role != null ? String(chrome.role) : 'anonymous';
  const tenantLabel =
    scope === 'tenant'
      ? chrome?.selected_tenant_label != null
        ? String(chrome.selected_tenant_label)
        : 'CorpFlowAI'
      : '—';

  return (
    <div
      data-cf-app-shell="true"
      data-cf-app-scope={scope}
      style={{
        minHeight: '100vh',
        fontFamily: '"Source Serif 4", "Iowan Old Style", "Palatino Linotype", Palatino, serif',
        color: '#eef6ff',
        background: theme.pageBg,
        padding: '20px 16px 48px',
      }}
    >
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,500;8..60,700&family=DM+Sans:wght@500;700&display=swap"
      />
      <header
        data-cf-app-chrome="true"
        style={{
          maxWidth: 980,
          margin: '0 auto 20px',
          padding: '14px 18px',
          borderRadius: 16,
          border: `1px solid ${theme.badgeBorder}`,
          background: theme.panelBg,
          backdropFilter: 'blur(16px)',
          display: 'grid',
          gap: 10,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            alignItems: 'center',
            justifyContent: 'space-between',
            fontFamily: '"DM Sans", "Segoe UI", sans-serif',
          }}
        >
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span
              data-cf-app-scope-badge="true"
              style={{
                display: 'inline-block',
                padding: '4px 10px',
                borderRadius: 999,
                border: `1px solid ${theme.badgeBorder}`,
                background: theme.badgeBg,
                color: theme.accent,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.08em',
              }}
            >
              {theme.label}
            </span>
            <strong style={{ fontSize: 15, letterSpacing: '0.02em' }}>CorpFlowAI Application</strong>
          </div>
          <nav style={{ display: 'flex', gap: 12, fontSize: 13 }}>
            <Link href="/app" style={{ color: theme.accent }}>
              Scope
            </Link>
            {scope === 'tenant' ? (
              <Link href="/app/requests" style={{ color: '#eef6ff' }}>
                Requests & Progress
              </Link>
            ) : (
              <Link
                href={`/app/core/requests/${chrome?.synthetic_request_id || SYNTHETIC_REQUEST_ID}`}
                style={{ color: '#eef6ff' }}
              >
                Core request
              </Link>
            )}
            <Link href="/change" style={{ color: 'rgba(238,246,255,0.7)' }}>
              /change
            </Link>
          </nav>
        </div>
        <dl
          data-cf-app-context-strip="true"
          style={{
            margin: 0,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 8,
            fontFamily: '"DM Sans", "Segoe UI", sans-serif',
            fontSize: 12,
          }}
        >
          <div>
            <dt style={{ margin: 0, opacity: 0.65 }}>Scope</dt>
            <dd style={{ margin: 0, fontWeight: 700 }} data-cf-app-selected-scope={scope}>
              {scope === 'tenant' ? 'Tenant' : 'Core'}
            </dd>
          </div>
          <div>
            <dt style={{ margin: 0, opacity: 0.65 }}>Tenant</dt>
            <dd style={{ margin: 0, fontWeight: 700 }} data-cf-app-selected-tenant={tenantLabel}>
              {tenantLabel}
            </dd>
          </div>
          <div>
            <dt style={{ margin: 0, opacity: 0.65 }}>Role</dt>
            <dd style={{ margin: 0, fontWeight: 700 }} data-cf-app-selected-role={role}>
              {role}
            </dd>
          </div>
        </dl>
      </header>

      <main style={{ maxWidth: 980, margin: '0 auto' }}>
        {(title || subtitle) && (
          <div style={{ marginBottom: 18 }}>
            {title ? (
              <h1
                style={{
                  margin: '0 0 6px',
                  fontSize: 'clamp(1.6rem, 3vw, 2.1rem)',
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                }}
              >
                {title}
              </h1>
            ) : null}
            {subtitle ? (
              <p style={{ margin: 0, opacity: 0.82, fontFamily: '"DM Sans", sans-serif', fontSize: 14 }}>
                {subtitle}
              </p>
            ) : null}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
