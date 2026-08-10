import Head from 'next/head';
import { APP_FONT_HREF, APP_SHELL_CSS, CORE_THEME, TENANT_THEME, themeStyleVars } from './app-theme.js';

/**
 * Persistent Environment · Tenant · Role chrome for Slice 1.
 * Environment is fixed by entry path / session — not switchable.
 * @param {{
 *   environment: 'core'|'tenant',
 *   tenantLabel?: string | null,
 *   role?: string | null,
 *   username?: string | null,
 *   proofMode?: boolean,
 *   children: import('react').ReactNode,
 * }} props
 */
export default function AppShell({
  environment,
  tenantLabel,
  role,
  username,
  proofMode,
  children,
}) {
  const theme = environment === 'tenant' ? TENANT_THEME : CORE_THEME;
  const envLabel = environment === 'tenant' ? 'Tenant — CorpFlowAI' : 'Core';

  return (
    <div className="cf-app-root" data-scope={environment} data-environment={environment} style={themeStyleVars(theme)}>
      <Head>
        <title>{`${envLabel} · CorpFlowAI app`}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href={APP_FONT_HREF} rel="stylesheet" />
        <style dangerouslySetInnerHTML={{ __html: APP_SHELL_CSS }} />
      </Head>
      <header className="cf-app-chrome" data-testid="app-chrome">
        <div className="cf-app-brand">CorpFlowAI</div>
        <div className="cf-app-meta" data-testid="app-chrome-meta">
          <span className="cf-app-chip" data-tone="accent" data-testid="chip-scope">
            Environment · <strong>{envLabel}</strong>
          </span>
          <span className="cf-app-chip" data-testid="chip-tenant">
            Tenant · <strong>{environment === 'tenant' ? tenantLabel || 'CorpFlowAI' : '—'}</strong>
          </span>
          <span className="cf-app-chip" data-testid="chip-role">
            Role · <strong>{role || '—'}</strong>
          </span>
          {username ? (
            <span className="cf-app-chip" data-testid="chip-user">
              User · <strong>{username}</strong>
            </span>
          ) : null}
          {proofMode ? (
            <span className="cf-app-chip" data-testid="chip-proof">
              Proof mode
            </span>
          ) : null}
        </div>
      </header>
      <main className="cf-app-main">{children}</main>
    </div>
  );
}
