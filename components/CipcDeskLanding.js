import React from 'react';
import Head from 'next/head';

import PublicMarketingPhotoGlassShell from './beauty/PublicMarketingPhotoGlassShell.js';
import HeroGlassBlock from './beauty/HeroGlassBlock.js';
import GlassPanel from './beauty/GlassPanel.js';
import GlassCardGrid from './beauty/GlassCardGrid.js';
import CtaGlassBlock from './beauty/CtaGlassBlock.js';
import { GLASS_TOKENS } from '../lib/ui/glass.js';
import {
  buildPublicVisualHero,
  CORPFLOW_PUBLIC_HERO_SCRIM_DESKTOP,
} from '../lib/public/corpflow-public-visuals.js';
import {
  CIPCDESK_LANDING_DEFAULTS,
  CIPCDESK_LANDING_DISCLAIMER,
  CIPCDESK_LANDING_HOW_IT_WORKS,
  resolveCipcDeskLandingContent,
} from '../lib/server/cipc-desk-landing-content.js';

/**
 * CIPC Desk standing-tenant homepage.
 *
 * Presentation-only: CorpFlowAI photo + glass visual language (Human-First Beauty
 * Layer primitives), adapted for professional CIPC / company-secretarial /
 * business-administration context. Email-first CTA only — no new workflows.
 *
 * Distinct from apex CorpFlow marketing (CIPC Desk brand + catalogue) and from
 * Lux / other tenant shells.
 */

const PAGE_CLASS = 'cipc-desk-landing';

const styles = {
  nav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
    marginBottom: 28,
  },
  brandMark: {
    width: 44,
    height: 44,
    borderRadius: 14,
    background: 'linear-gradient(145deg, rgba(45,212,191,0.35), rgba(45,212,191,0.08))',
    border: '1px solid rgba(45,212,191,0.45)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
    fontSize: 13,
    letterSpacing: '0.04em',
    color: GLASS_TOKENS.accent,
  },
  brandBlock: { display: 'flex', alignItems: 'center', gap: 12 },
  brandEyebrow: {
    fontSize: 11,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: '#7dd3fc',
    fontWeight: 700,
    margin: 0,
  },
  brandTitle: {
    margin: '2px 0 0',
    fontSize: 22,
    fontWeight: 750,
    letterSpacing: '-0.02em',
    color: GLASS_TOKENS.text,
  },
  navLink: {
    color: GLASS_TOKENS.textMuted,
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 600,
  },
  eyebrow: {
    margin: '0 0 10px',
    fontSize: 12,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: GLASS_TOKENS.accent,
    fontWeight: 800,
  },
  // Brand stays hero-level; supporting headline must not overpower it.
  brandHero: {
    margin: 0,
    fontSize: 'clamp(36px, 6vw, 58px)',
    fontWeight: 800,
    lineHeight: 1.02,
    letterSpacing: '-0.045em',
    color: GLASS_TOKENS.text,
  },
  h1: {
    margin: '12px 0 0',
    fontSize: 'clamp(20px, 2.8vw, 28px)',
    fontWeight: 650,
    lineHeight: 1.25,
    letterSpacing: '-0.02em',
    maxWidth: 720,
    color: '#dbe7f3',
  },
  lead: {
    marginTop: 14,
    marginBottom: 0,
    fontSize: 'clamp(15px, 1.8vw, 18px)',
    lineHeight: 1.6,
    color: GLASS_TOKENS.textMuted,
    maxWidth: 640,
  },
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 22,
  },
  btnBase: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    padding: '13px 20px',
    borderRadius: 16,
    fontWeight: 800,
    fontSize: 14.5,
    textDecoration: 'none',
    border: 'none',
    lineHeight: 1.2,
  },
  btnPrimary: {
    background: GLASS_TOKENS.ctaWarm,
    color: GLASS_TOKENS.ctaWarmText,
    boxShadow: GLASS_TOKENS.ctaWarmShadow,
  },
  btnSecondary: {
    background: 'rgba(255,255,255,0.10)',
    color: GLASS_TOKENS.text,
    border: '1px solid rgba(255,255,255,0.22)',
  },
  section: { marginTop: 28 },
  sectionLabel: {
    margin: 0,
    fontSize: 12,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: '#7dd3fc',
    fontWeight: 800,
  },
  h2: {
    margin: '8px 0 0',
    fontSize: 'clamp(22px, 3vw, 28px)',
    letterSpacing: '-0.03em',
    color: GLASS_TOKENS.text,
  },
  muted: {
    margin: '10px 0 0',
    color: GLASS_TOKENS.textMuted,
    lineHeight: 1.65,
    fontSize: 15.5,
    maxWidth: 720,
  },
  cardTitle: {
    margin: 0,
    fontSize: 17,
    fontWeight: 750,
    letterSpacing: '-0.015em',
    color: GLASS_TOKENS.text,
  },
  cardBody: {
    margin: '8px 0 0',
    color: GLASS_TOKENS.textMuted,
    lineHeight: 1.6,
    fontSize: 14.5,
  },
  stepNum: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    borderRadius: 10,
    background: 'rgba(45,212,191,0.16)',
    border: '1px solid rgba(45,212,191,0.35)',
    color: GLASS_TOKENS.accent,
    fontWeight: 800,
    fontSize: 13,
    marginBottom: 10,
  },
  footerText: {
    margin: 0,
    color: GLASS_TOKENS.textMuted,
    fontSize: 13,
    lineHeight: 1.55,
    textAlign: 'center',
  },
};

const PAGE_MOTION_CSS = `
@keyframes cipcFadeUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
.${PAGE_CLASS} .cipc-anim {
  animation: cipcFadeUp 0.65s ease-out both;
}
.${PAGE_CLASS} .cipc-anim-delay-1 { animation-delay: 0.08s; }
.${PAGE_CLASS} .cipc-anim-delay-2 { animation-delay: 0.16s; }
.${PAGE_CLASS} .cipc-anim-delay-3 { animation-delay: 0.24s; }
@media (prefers-reduced-motion: reduce) {
  .${PAGE_CLASS} .cipc-anim {
    animation: none !important;
  }
}
`;

function safeStr(v) {
  return v != null ? String(v).trim() : '';
}

/**
 * @param {{ site?: Record<string, unknown> }} props
 */
export default function CipcDeskLanding({ site }) {
  const content = resolveCipcDeskLandingContent(site);
  const heroVisual = buildPublicVisualHero('process');
  const mailtoHref =
    safeStr(content.ctaHref) ||
    `mailto:${CIPCDESK_LANDING_DEFAULTS.contactEmail}?subject=${encodeURIComponent('CIPC Desk · enquiry')}`;

  return (
    <>
      <Head>
        <title>{content.pageTitle}</title>
        <meta name="description" content={content.metaDescription} />
        <meta name="robots" content="noindex,nofollow" />
        <meta name="theme-color" content="#06111f" />
        <style dangerouslySetInnerHTML={{ __html: PAGE_MOTION_CSS }} />
      </Head>

      <PublicMarketingPhotoGlassShell
        pageClassName={PAGE_CLASS}
        maxWidth={1120}
        hero={heroVisual}
        scrimTone="dark"
        scrimStyle={{ background: CORPFLOW_PUBLIC_HERO_SCRIM_DESKTOP }}
        publicScrimHook
        footer={
          <p style={styles.footerText}>
            CIPC Desk · Internal CorpFlowAI test surface · Powered by CorpFlowAI.
            Not an official CIPC website. Service details remain provisional until
            validated by the desk owner.
          </p>
        }
      >
        <nav className="cipc-anim" style={styles.nav} aria-label="CIPC Desk">
          <div style={styles.brandBlock}>
            <div style={styles.brandMark} aria-hidden="true">
              CD
            </div>
            <div>
              <p style={styles.brandEyebrow}>Internal test desk</p>
              <p style={styles.brandTitle}>CIPC Desk</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            <a href="#services" style={styles.navLink}>
              Services
            </a>
            <a href="#how-it-works" style={styles.navLink}>
              How it works
            </a>
            <a
              href={mailtoHref}
              style={{ ...styles.btnBase, ...styles.btnPrimary, minHeight: 42, padding: '10px 16px' }}
            >
              {content.ctaLabel}
            </a>
          </div>
        </nav>

        <div className="cipc-anim cipc-anim-delay-1">
          <HeroGlassBlock
            eyebrow={<p style={styles.eyebrow}>Company administration · South Africa</p>}
            title={
              <>
                <p style={styles.brandHero}>CIPC Desk</p>
                <h1 style={styles.h1}>{content.headline}</h1>
              </>
            }
            lead={<p style={styles.lead}>{content.lead}</p>}
            actions={
              <div style={styles.actions}>
                <a href={mailtoHref} style={{ ...styles.btnBase, ...styles.btnPrimary }}>
                  {content.ctaLabel}
                </a>
                <a href="#services" style={{ ...styles.btnBase, ...styles.btnSecondary }}>
                  View services
                </a>
              </div>
            }
          />
        </div>

        <section id="services" className="cipc-anim cipc-anim-delay-2" style={styles.section}>
          <GlassPanel variant={{ padding: 26, elevation: 2 }}>
            <p style={styles.sectionLabel}>Service summary</p>
            <h2 style={styles.h2}>{content.servicesTitle}</h2>
            <p style={styles.muted}>{content.servicesIntro}</p>
            <GlassCardGrid minColWidth={240} gap={14} style={{ marginTop: 18 }}>
              {content.services.map((item) => (
                <GlassPanel
                  key={item.name}
                  variant={{ padding: 18, elevation: 1, fill: GLASS_TOKENS.glassFillSoft }}
                >
                  <h3 style={styles.cardTitle}>{item.name}</h3>
                  <p style={styles.cardBody}>{item.detail}</p>
                </GlassPanel>
              ))}
            </GlassCardGrid>
          </GlassPanel>
        </section>

        <section id="how-it-works" className="cipc-anim cipc-anim-delay-3" style={styles.section}>
          <GlassPanel variant={{ padding: 26, elevation: 2 }}>
            <p style={styles.sectionLabel}>Clear process</p>
            <h2 style={styles.h2}>How a matter moves forward</h2>
            <p style={styles.muted}>
              Email-first support for registrations, amendments, annual returns, records,
              and compliance-related administration — reviewed by a specialist before work
              proceeds.
            </p>
            <GlassCardGrid minColWidth={200} gap={14} style={{ marginTop: 18 }}>
              {CIPCDESK_LANDING_HOW_IT_WORKS.map((step, idx) => (
                <GlassPanel
                  key={step.title}
                  variant={{ padding: 18, elevation: 1, fill: GLASS_TOKENS.glassFillSoft }}
                >
                  <div style={styles.stepNum}>{idx + 1}</div>
                  <h3 style={styles.cardTitle}>{step.title}</h3>
                  <p style={styles.cardBody}>{step.body}</p>
                </GlassPanel>
              ))}
            </GlassCardGrid>
          </GlassPanel>
        </section>

        <section style={styles.section}>
          <CtaGlassBlock>
            <p style={styles.sectionLabel}>Next step</p>
            <h2 style={styles.h2}>Email your CIPC matter</h2>
            <p style={styles.muted}>
              Share a short summary of what you need. The desk reviews scope and required
              information before anything is treated as confirmed.
            </p>
            <div style={styles.actions}>
              <a href={mailtoHref} style={{ ...styles.btnBase, ...styles.btnPrimary }}>
                {content.ctaLabel}
              </a>
              <a
                href={`mailto:${content.contactEmail}`}
                style={{ ...styles.btnBase, ...styles.btnSecondary }}
              >
                {content.contactEmail}
              </a>
            </div>
            <p style={{ ...styles.muted, marginTop: 18, fontSize: 13.5 }}>{CIPCDESK_LANDING_DISCLAIMER}</p>
          </CtaGlassBlock>
        </section>
      </PublicMarketingPhotoGlassShell>
    </>
  );
}
