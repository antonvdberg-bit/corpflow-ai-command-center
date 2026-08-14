import Head from 'next/head';
import { workspaceChromeForEnvironment } from '../../lib/app/workspace-context.js';
import { APP_FONT_HREF, APP_SHELL_CSS, CORE_THEME, TENANT_THEME, themeStyleVars } from './app-theme.js';

/**
 * Persistent Workspace · Tenant · Role chrome.
 * Environment is fixed by entry path / session — not switchable (#778).
 * Product names: Operating Workspace / Tenant Workspace (#772).
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
  const chrome = workspaceChromeForEnvironment(environment, { tenantLabel });

  return (
    <div
      className="cf-app-root"
      data-scope={environment}
      data-environment={environment}
      data-workspace={chrome.workspace_id}
      style={themeStyleVars(theme)}
    >
      <Head>
        <title>{`${chrome.workspace_label} · CorpFlowAI`}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href={APP_FONT_HREF} rel="stylesheet" />
        <style dangerouslySetInnerHTML={{ __html: APP_SHELL_CSS }} />
      </Head>
      <header className="cf-app-chrome" data-testid="app-chrome">
        <div className="cf-app-brand">CorpFlowAI</div>
        <div className="cf-app-meta" data-testid="app-chrome-meta">
          <span className="cf-app-chip" data-tone="accent" data-testid="chip-scope">
            Workspace · <strong>{chrome.workspace_label}</strong>
          </span>
          <span className="cf-app-chip" data-testid="chip-tenant">
            Tenant · <strong>{chrome.tenant_chip_label}</strong>
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
          <a
            className="cf-app-chip"
            data-testid="chip-switch-workspace"
            href={chrome.switch_href}
          >
            {chrome.switch_label}
          </a>
        </div>
      </header>
      <main className="cf-app-main">{children}</main>
    </div>
  );
}
