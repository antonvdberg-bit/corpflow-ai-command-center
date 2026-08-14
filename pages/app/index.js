import Head from 'next/head';
import Link from 'next/link';
import { APP_FONT_HREF, APP_SHELL_CSS, CORE_THEME, themeStyleVars } from '../../components/app/app-theme.js';

/**
 * /app entry chooser — separate Core and Tenant authentication paths.
 * No shared ScopeSwitcher. One production app; two entry environments.
 */
export default function AppEntryChooser() {
  return (
    <div className="cf-app-root" data-environment="chooser" style={themeStyleVars(CORE_THEME)}>
      <Head>
        <title>CorpFlowAI · choose workspace</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href={APP_FONT_HREF} rel="stylesheet" />
        <style dangerouslySetInnerHTML={{ __html: APP_SHELL_CSS }} />
      </Head>
      <header className="cf-app-chrome" data-testid="app-chrome">
        <div className="cf-app-brand">CorpFlowAI</div>
        <div className="cf-app-meta">
          <span className="cf-app-chip" data-tone="accent">
            Operating Workspace · Tenant Workspace
          </span>
        </div>
      </header>
      <main className="cf-app-main">
        <section className="cf-app-panel" data-testid="app-entry-chooser">
          <h1 className="cf-app-h1">Choose workspace</h1>
          <p className="cf-app-lead">
            Enter the CorpFlowAI Operating Workspace or the Tenant Workspace deliberately. Each
            workspace uses its own existing sign-in. An Operating Workspace session cannot enter
            Tenant; a Tenant session cannot enter the Operating Workspace.
          </p>
          <div className="cf-app-actions" style={{ marginTop: 20 }}>
            <Link className="cf-app-btn" data-primary="true" href="/app/core" data-testid="enter-core">
              Open Operating Workspace
            </Link>
            <Link className="cf-app-btn" href="/app/tenant" data-testid="enter-tenant">
              Open Tenant Workspace
            </Link>
          </div>
          <p className="cf-app-muted" style={{ marginTop: 18 }}>
            Normal operator path — sign in, then open the matching environment (no proof query
            required):{' '}
            <a href={`/login?next=${encodeURIComponent('/app/core')}`}>Operating Workspace login</a>
            {' · '}
            <a href={`/login?next=${encodeURIComponent('/app/tenant')}`}>Tenant Workspace login</a>
          </p>
          <p className="cf-app-muted" data-testid="proof-harness-hint">
            Deterministic test harness only (Preview / local):{' '}
            <Link href="/app/core?proof=1">Core proof</Link>
            {' · '}
            <Link href="/app/tenant?proof=1">Tenant proof</Link>
          </p>
        </section>
      </main>
    </div>
  );
}
