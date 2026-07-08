import { useEffect, useState } from 'react';
import Head from 'next/head';

import { LuxeMauriceFontStylesheet, LuxeMauriceWordmark, LuxEyebrow, LuxHairline } from '../../components/LuxeMauriceBrandPrimitives.js';
import { LUXE_MAURICE_BRAND_TOKENS as T } from '../../lib/client/luxe-maurice-brand-theme.js';

const HEALTH_API = '/api/lux/ai-sandbox/health';

export default function LuxeMauriceAiSandboxPage() {
  const [report, setReport] = useState(/** @type {Record<string, unknown>|null} */ (null));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const r = await fetch(HEALTH_API, { method: 'GET' });
        const j = await r.json().catch(() => ({}));
        if (!cancelled) setReport(j && typeof j === 'object' ? j : {});
      } catch (e) {
        if (!cancelled) setError(String(e?.message || e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const cardStyle = {
    border: `1px solid ${T.hairline}`,
    borderRadius: T.radiusLg,
    padding: '18px 20px',
    background: T.charcoalSoft,
    marginBottom: 14,
  };

  const migrations =
    report?.migrations && typeof report.migrations === 'object'
      ? /** @type {Record<string, unknown>} */ (report.migrations)
      : {};

  return (
    <>
      <Head>
        <title>LuxeMaurice AI sandbox — delivery status</title>
        <meta name="robots" content="noindex,nofollow" />
        <LuxeMauriceFontStylesheet />
      </Head>
      <div
        data-testid="lux-ai-sandbox-page"
        style={{ minHeight: '100vh', background: T.charcoal, color: T.ivory, fontFamily: T.fontBody }}
      >
        <header style={{ maxWidth: 760, margin: '0 auto', padding: '32px 24px 20px', textAlign: 'center' }}>
          <LuxeMauriceWordmark />
          <LuxEyebrow>LuxeMaurice AI — client sandbox</LuxEyebrow>
          <h1 style={{ margin: '12px 0 0', fontFamily: T.fontDisplay, fontWeight: 500, fontSize: '1.85rem' }}>
            Delivery status
          </h1>
          <p style={{ margin: '10px 0 0', color: T.ivoryMuted, fontSize: 14, lineHeight: 1.55 }}>
            Supabase-backed sandbox preview. Isolated from CorpFlow production database.
          </p>
        </header>

        <main style={{ maxWidth: 760, margin: '0 auto', padding: '0 24px 48px' }}>
          <LuxHairline />

          {loading ? <p style={{ marginTop: 20, color: T.ivoryMuted }}>Checking sandbox…</p> : null}
          {error ? (
            <div style={{ ...cardStyle, marginTop: 20, color: '#fecaca', borderColor: 'rgba(248,113,113,0.4)' }}>{error}</div>
          ) : null}

          {!loading && report ? (
            <>
              <div data-testid="lux-ai-sandbox-status" style={{ ...cardStyle, marginTop: 20 }}>
                <div style={{ fontWeight: 700, color: report.ok ? '#bbf7d0' : '#fecaca' }}>
                  {report.ok ? 'Sandbox ready for next build step' : 'Sandbox blocked'}
                </div>
                {report.blocker ? (
                  <p style={{ margin: '10px 0 0', fontSize: 14, color: T.ivoryMuted }}>
                    Blocker: <span style={{ color: T.ivory }}>{String(report.blocker)}</span>
                  </p>
                ) : null}
                {report.next_step ? (
                  <p style={{ margin: '8px 0 0', fontSize: 14, color: T.ivoryMuted, lineHeight: 1.55 }}>{String(report.next_step)}</p>
                ) : null}
              </div>

              <div style={cardStyle}>
                <div style={{ fontFamily: T.fontDisplay, marginBottom: 8 }}>Supabase connection</div>
                <div style={{ fontSize: 13, color: T.ivoryMuted, lineHeight: 1.6 }}>
                  REST reachable:{' '}
                  {report.supabase_rest && typeof report.supabase_rest === 'object'
                    ? String(/** @type {Record<string, unknown>} */ (report.supabase_rest).reachable)
                    : '—'}
                </div>
              </div>

              <div data-testid="lux-ai-sandbox-migrations" style={cardStyle}>
                <div style={{ fontFamily: T.fontDisplay, marginBottom: 8 }}>Migrations</div>
                <div style={{ fontSize: 13, color: T.ivoryMuted, lineHeight: 1.6 }}>
                  Expected: {String(migrations.expected_count ?? 0)} · Present: {String(migrations.present_count ?? 0)}
                  {Array.isArray(migrations.missing_files) && migrations.missing_files.length ? (
                    <span style={{ display: 'block', marginTop: 6, color: '#fecaca' }}>
                      Missing: {migrations.missing_files.join(', ')}
                    </span>
                  ) : null}
                </div>
              </div>

              <p style={{ fontSize: 12, color: T.stoneSoft, lineHeight: 1.55 }}>
                Operator runbook: docs/runbooks/LUX_AI_SUPABASE_SANDBOX_DELIVERY.md · Recovery alignment:{' '}
                /client/recovery-roadmap
              </p>
            </>
          ) : null}
        </main>
      </div>
    </>
  );
}
