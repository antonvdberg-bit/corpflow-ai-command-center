import React from 'react';
import Link from 'next/link';

import {
  LUXE_MAURICE_BRAND_TOKENS as T,
} from '../lib/client/luxe-maurice-brand-theme.js';
import { LuxeMauriceFontStylesheet } from './LuxeMauriceBrandPrimitives.js';

/**
 * Rare & Exclusive Collection — Ivory Editorial shell (Concept A reference).
 *
 * Visual target: approved Concept A — Ivory Editorial reference for Issue #633.
 * lux.corpflowai.com is the client test environment; Vercel previews are internal only.
 *
 * Created in-repo via CSS/SVG/HTML + committed public-safe assets only.
 * No C drive / OneDrive dependency.
 */

export const RARE_EXCLUSIVE_PUBLIC_BRAND = 'Rare & Exclusive Collection';

export const RARE_EXCLUSIVE_HERO_IMAGE =
  '/luxe-maurice-ai/luxury-coastal-private-access-hero.png';

/** Concierge / Owner Experience lifestyle plate — committed public-safe asset. */
export const RARE_EXCLUSIVE_ADVISORY_IMAGE =
  '/luxe-maurice-ai/mauritius-private-advisory-lifestyle.jpg';

export const RARE_EXCLUSIVE_STRAPLINE =
  'Private Wealth & Lifestyle Platform for Mauritius';

export const RARE_EXCLUSIVE_PRIVILEGE_QUOTE = 'Not just properties. A privilege.';

/**
 * Contained editorial width — wide enough for split hero wordmark + photo,
 * without full-bleed stretch. ~1440 is a common luxury marketing content max.
 */
export const RARE_EXCLUSIVE_EDITORIAL_MAX = 1440;

export const RARE_EXCLUSIVE_AVAILABILITY_DISCLAIMER =
  'Availability, pricing, and terms are confirmed privately through a private advisor. Nothing on this page is an offer or solicitation.';

/** Main nav (Invitation Only is rendered separately with a divider). */
export const RARE_EXCLUSIVE_NAV_MAIN = Object.freeze([
  Object.freeze({ label: 'Properties', href: '/properties' }),
  Object.freeze({ label: 'Lifestyle', href: '/lifestyle' }),
  Object.freeze({ label: 'Destination Mauritius', href: '/destination-mauritius' }),
  Object.freeze({ label: 'Private Services', href: '/private-services' }),
  Object.freeze({ label: 'About', href: '/about' }),
  Object.freeze({ label: 'Contact', href: '/contact' }),
]);

/** Kept for tests / callers that expect the full list including Invitation Only. */
export const RARE_EXCLUSIVE_NAV = Object.freeze([
  ...RARE_EXCLUSIVE_NAV_MAIN,
  Object.freeze({ label: 'Invitation Only', href: '/concierge', invite: true }),
]);

/**
 * Gold R&E crest with crown — Concept A monogram treatment (SVG, repo-native).
 */
export function RareExclusiveCrest({ size = 52, title = RARE_EXCLUSIVE_PUBLIC_BRAND }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label={title}
      style={{ display: 'block', color: T.gold }}
    >
      <title>{title}</title>
      {/* Crown */}
      <path
        d="M18 16 L24 22 L32 12 L40 22 L46 16 L44 26 L20 26 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="miter"
      />
      <circle cx="32" cy="10" r="1.6" fill="currentColor" />
      {/* Shield oval */}
      <ellipse
        cx="32"
        cy="40"
        rx="18"
        ry="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <text
        x="32"
        y="45"
        textAnchor="middle"
        fill="currentColor"
        fontFamily='"Cormorant Garamond", Georgia, serif'
        fontSize="14"
        fontWeight="600"
        letterSpacing="0.08em"
      >
        {'R&E'}
      </text>
    </svg>
  );
}

/**
 * Stacked Rare / & / Exclusive wordmark with gold ampersand.
 *
 * @param {{ tone?: 'charcoal' | 'ivory', size?: 'hero' | 'medium' | 'small' | 'nav', showSignature?: boolean, align?: 'center' | 'start' }} props
 */
export function RareExclusiveStackedWordmark({
  tone = 'charcoal',
  size = 'hero',
  showSignature = false,
  align = 'center',
}) {
  const isIvory = tone === 'ivory';
  const color = isIvory ? T.ivory : T.charcoal;
  const wordSize =
    size === 'hero'
      ? 'clamp(2.35rem, 4.2vw, 4.35rem)'
      : size === 'medium'
        ? 28
        : size === 'nav'
          ? 15
          : 18;
  const ampSize =
    size === 'hero'
      ? 'clamp(1.35rem, 2.4vw, 2.15rem)'
      : size === 'medium'
        ? 20
        : size === 'nav'
          ? 12
          : 14;
  const track = size === 'hero' ? '0.1em' : size === 'nav' ? '0.14em' : '0.12em';
  const alignItems = align === 'start' ? 'flex-start' : 'center';
  const textAlign = align === 'start' ? 'left' : 'center';

  return (
    <span
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems,
        textAlign,
        color,
        maxWidth: '100%',
        minWidth: 0,
      }}
    >
      <span
        style={{
          fontFamily: T.fontDisplay,
          fontWeight: 400,
          fontSize: wordSize,
          lineHeight: 0.9,
          letterSpacing: track,
          textTransform: 'uppercase',
          paddingLeft: track,
          whiteSpace: 'nowrap',
        }}
      >
        Rare
      </span>
      <span
        aria-hidden="true"
        style={{
          margin: size === 'hero' ? '0.18em 0 0.12em' : '0.12em 0 0.08em',
          fontFamily: T.fontDisplay,
          fontWeight: 400,
          fontStyle: 'italic',
          fontSize: ampSize,
          lineHeight: 1,
          color: T.gold,
        }}
      >
        &amp;
      </span>
      <span
        style={{
          fontFamily: T.fontDisplay,
          fontWeight: 400,
          fontSize: wordSize,
          lineHeight: 0.9,
          letterSpacing: track,
          textTransform: 'uppercase',
          paddingLeft: track,
          whiteSpace: 'nowrap',
        }}
      >
        Exclusive
      </span>
      {showSignature ? (
        <span
          style={{
            marginTop: size === 'hero' ? 22 : 10,
            fontFamily: T.fontBody,
            fontSize: size === 'hero' ? 11 : 9.5,
            fontWeight: 700,
            letterSpacing: '0.28em',
            lineHeight: 1.4,
            color: T.gold,
            textTransform: 'uppercase',
          }}
        >
          {RARE_EXCLUSIVE_PUBLIC_BRAND}
        </span>
      ) : null}
    </span>
  );
}

/**
 * Mauritius villa / lifestyle visual panel.
 * Committed coastal asset + CSS editorial framing (no external graphics).
 */
export function RareExclusiveHeroVisual({
  src = RARE_EXCLUSIVE_HERO_IMAGE,
  alt = 'Mauritius coastal residence — private lifestyle setting',
  showCaption = false,
  /** Soft left-edge fade into ivory (Concept A hero / card treatment). */
  fadeLeft = false,
  objectPosition = 'center',
}) {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: 320,
        overflow: 'hidden',
        background: 'linear-gradient(145deg, #E8DFD0 0%, #C9B896 45%, #A8946E 100%)',
      }}
    >
      <img
        src={src}
        alt={alt}
        decoding="async"
        fetchPriority="high"
        loading="eager"
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition,
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(ellipse at 72% 28%, rgba(255,248,230,0.28) 0%, transparent 50%),
            linear-gradient(180deg, rgba(17,17,17,0.04) 0%, transparent 40%, rgba(17,17,17,0.22) 100%)
            ${
              fadeLeft
                ? ', linear-gradient(90deg, #F4EFE8 0%, rgba(244,239,232,0.85) 8%, rgba(244,239,232,0.35) 22%, transparent 42%)'
                : ''
            }
          `,
          zIndex: 1,
          pointerEvents: 'none',
        }}
      />
      {showCaption ? (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: 28,
            bottom: 28,
            zIndex: 3,
            fontFamily: T.fontBody,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.32em',
            textTransform: 'uppercase',
            color: T.ivory,
            textShadow: '0 1px 8px rgba(0,0,0,0.35)',
          }}
        >
          Mauritius · by introduction
        </div>
      ) : null}
    </div>
  );
}

/**
 * CSS/SVG lifestyle panel for alternating content bands when no photo slot is used.
 * Evokes terrace / sunset / mountain silhouette without external assets.
 */
export function RareExclusiveLifestylePanel({ variant = 'terrace' }) {
  const gradients =
    variant === 'sea'
      ? 'linear-gradient(165deg, #D9CDB8 0%, #B8A88A 40%, #8A7A5E 70%, #5C4E3A 100%)'
      : 'linear-gradient(155deg, #E8DFD0 0%, #CDB99A 38%, #A88B62 68%, #6B5A42 100%)';

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: 280,
        overflow: 'hidden',
        background: gradients,
      }}
    >
      {/* Horizon / ocean band */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: '28%',
          height: '42%',
          background:
            variant === 'sea'
              ? 'linear-gradient(180deg, rgba(120,150,170,0.35) 0%, rgba(70,100,120,0.55) 100%)'
              : 'linear-gradient(180deg, rgba(168,132,44,0.18) 0%, rgba(90,70,40,0.4) 100%)',
        }}
      />
      {/* Mountain silhouette (Le Morne–inspired abstract) */}
      <svg
        viewBox="0 0 400 160"
        preserveAspectRatio="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: '26%',
          width: '100%',
          height: '48%',
          opacity: 0.55,
        }}
      >
        <path
          d="M0 140 L60 110 L110 125 L170 60 L230 115 L280 90 L340 120 L400 95 L400 160 L0 160 Z"
          fill="#2A241C"
        />
        <path
          d="M80 140 L140 100 L200 130 L260 85 L320 125 L400 110 L400 160 L80 160 Z"
          fill="#3A3228"
          opacity="0.7"
        />
      </svg>
      {/* Soft gold light */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse at 70% 30%, rgba(255,220,160,0.35) 0%, transparent 55%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 20,
          border: `1px solid rgba(168, 132, 44, 0.35)`,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}

/** Gold line-art icons for the Concept A feature bar. */
function FeatureIcon({ name }) {
  const common = {
    width: 28,
    height: 28,
    viewBox: '0 0 32 32',
    fill: 'none',
    stroke: T.gold,
    strokeWidth: 1.4,
    strokeLinecap: 'square',
    strokeLinejoin: 'miter',
    style: { display: 'block' },
    'aria-hidden': true,
  };
  if (name === 'key') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="5" />
        <path d="M16 14 L28 26 M22 20 L26 18 M24 22 L28 20" />
      </svg>
    );
  }
  if (name === 'shield') {
    return (
      <svg {...common}>
        <path d="M16 4 L26 8 V16 C26 22 21 26 16 28 C11 26 6 22 6 16 V8 Z" />
        <path d="M12 16 L15 19 L21 12" />
      </svg>
    );
  }
  if (name === 'cloche') {
    return (
      <svg {...common}>
        <path d="M6 20 C6 12 10 7 16 7 C22 7 26 12 26 20" />
        <path d="M4 20 H28" />
        <circle cx="16" cy="5" r="1.4" fill={T.gold} stroke="none" />
        <path d="M10 24 H22" />
      </svg>
    );
  }
  // compass
  return (
    <svg {...common}>
      <circle cx="16" cy="16" r="10" />
      <path d="M16 6 V10 M16 22 V26 M6 16 H10 M22 16 H26" />
      <path d="M13 19 L16 10 L19 19 L16 17 Z" fill={T.gold} stroke="none" />
    </svg>
  );
}

export const RARE_EXCLUSIVE_FEATURE_PILLARS = Object.freeze([
  Object.freeze({
    icon: 'key',
    title: 'Curated Properties',
    sub: 'Handpicked for Value & Legacy',
  }),
  Object.freeze({
    icon: 'shield',
    title: 'Discretion & Privacy',
    sub: 'By Invitation Only',
  }),
  Object.freeze({
    icon: 'cloche',
    title: 'Owner Concierge',
    sub: 'Seamless, Bespoke, Personal',
  }),
  Object.freeze({
    icon: 'compass',
    title: 'Mauritius Expertise',
    sub: 'Insight. Access. Advantage.',
  }),
]);

export function RareExclusiveFeatureBar() {
  return (
    <section
      aria-label="Collection pillars"
      style={{
        borderTop: `1px solid ${T.hairlineStone}`,
        borderBottom: `1px solid ${T.hairlineStone}`,
        background: T.ivory,
      }}
    >
      <div
        style={{
          maxWidth: RARE_EXCLUSIVE_EDITORIAL_MAX,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        }}
        className="re-feature-bar"
      >
        {RARE_EXCLUSIVE_FEATURE_PILLARS.map((p, i) => (
          <div
            key={p.title}
            style={{
              padding: '36px 22px',
              textAlign: 'center',
              borderRight:
                i < RARE_EXCLUSIVE_FEATURE_PILLARS.length - 1
                  ? `1px solid ${T.hairlineStone}`
                  : 'none',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <FeatureIcon name={p.icon} />
            </div>
            <div
              style={{
                fontFamily: T.fontBody,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: T.charcoal,
              }}
            >
              {p.title}
            </div>
            <div
              style={{
                marginTop: 8,
                fontFamily: T.fontDisplay,
                fontStyle: 'italic',
                fontSize: 14,
                lineHeight: 1.45,
                color: T.stone,
              }}
            >
              {p.sub}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Concept A header: centered gold crest + right fine-line nav + Invitation Only.
 */
export function RareExclusiveIvoryHeader({ activeHref = '' }) {
  return (
    <header
      style={{
        position: 'relative',
        zIndex: 20,
        borderBottom: `1px solid ${T.hairlineStone}`,
        background: T.ivory,
      }}
      className="re-ivory-header"
    >
      <div
        style={{
          maxWidth: RARE_EXCLUSIVE_EDITORIAL_MAX,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: '56px 1fr',
          alignItems: 'center',
          gap: 16,
          padding: '18px clamp(20px, 4vw, 40px)',
        }}
      >
      <Link
        href="/"
        style={{ textDecoration: 'none', justifySelf: 'start' }}
        aria-label={`${RARE_EXCLUSIVE_PUBLIC_BRAND} home`}
      >
        <RareExclusiveCrest size={48} />
      </Link>
      <nav
        aria-label={RARE_EXCLUSIVE_PUBLIC_BRAND}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 'clamp(12px, 1.8vw, 22px)',
          flexWrap: 'wrap',
        }}
      >
        {RARE_EXCLUSIVE_NAV_MAIN.map((item) => {
          const active =
            activeHref &&
            (activeHref === item.href ||
              (!item.href.includes('#') && activeHref.startsWith(item.href) && item.href !== '/'));
          return (
            <a
              key={item.label}
              href={item.href}
              style={{
                fontFamily: T.fontBody,
                fontSize: 10.5,
                fontWeight: 600,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: active ? T.charcoal : T.stone,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              {item.label}
            </a>
          );
        })}
        <span
          aria-hidden="true"
          style={{
            width: 1,
            height: 18,
            background: T.hairlineStone,
            flexShrink: 0,
          }}
        />
        <a
          href="/concierge"
          style={{
            fontFamily: T.fontBody,
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: T.gold,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          Invitation Only
        </a>
      </nav>
      </div>
      <style>{`
        @media (max-width: 720px) {
          .re-ivory-header > div { grid-template-columns: 1fr !important; }
          .re-feature-bar { grid-template-columns: 1fr 1fr !important; }
          .re-journey-grid { grid-template-columns: 1fr !important; }
          .re-promise-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 480px) {
          .re-feature-bar { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </header>
  );
}

/**
 * Concept A footer: privilege quote flanked by gold hairlines + crest.
 */
export function RareExclusiveIvoryFooter({ note }) {
  return (
    <footer
      style={{
        padding: '64px 20px 48px',
        background: T.ivory,
        color: T.stone,
        textAlign: 'center',
        borderTop: `1px solid ${T.hairlineStone}`,
      }}
    >
      <div style={{ maxWidth: RARE_EXCLUSIVE_EDITORIAL_MAX, margin: '0 auto', padding: '16px 20px 0' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'clamp(16px, 3vw, 28px)',
          maxWidth: 720,
          margin: '0 auto',
        }}
      >
        <span
          aria-hidden="true"
          style={{ flex: '0 0 48px', height: 1, background: T.gold, opacity: 0.65 }}
        />
        <p
          style={{
            margin: 0,
            fontFamily: T.fontDisplay,
            fontStyle: 'italic',
            fontWeight: 400,
            fontSize: 'clamp(1.35rem, 2.4vw, 1.85rem)',
            lineHeight: 1.45,
            color: T.charcoal,
          }}
        >
          “{RARE_EXCLUSIVE_PRIVILEGE_QUOTE}”
        </p>
        <span
          aria-hidden="true"
          style={{ flex: '0 0 48px', height: 1, background: T.gold, opacity: 0.65 }}
        />
      </div>
      <div style={{ margin: '36px auto 0', display: 'flex', justifyContent: 'center' }}>
        <RareExclusiveCrest size={36} />
      </div>
      <p
        style={{
          margin: '28px auto 0',
          maxWidth: 640,
          fontFamily: T.fontBody,
          fontSize: 11.5,
          lineHeight: 1.8,
          color: T.stoneSoft || T.stone,
        }}
      >
        {note ||
          'Information on this site is indicative and not legal, tax, or immigration advice. Nothing here is an offer or solicitation; terms are agreed in writing through a private advisor.'}
      </p>
      </div>
    </footer>
  );
}

/**
 * Outer page shell: warm parchment field + charcoal text for high contrast.
 * Content should sit inside RareExclusiveEditorialSpine.
 */
export function rareExclusivePageShellStyle() {
  return {
    fontFamily: T.fontBody,
    minHeight: '100vh',
    /* Same ivory as content — avoids pillar-box gutters that fight the layout. */
    background: T.ivory,
    color: T.charcoal,
  };
}

/**
 * Centered editorial content width (~1440). Subtle side padding on wide screens;
 * no heavy floating-card shadow (that read as clash + “too narrow”).
 */
export function RareExclusiveEditorialSpine({ children, style = {} }) {
  return (
    <div
      style={{
        maxWidth: RARE_EXCLUSIVE_EDITORIAL_MAX,
        width: '100%',
        margin: '0 auto',
        background: T.ivory,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Opaque ivory panel — text never sits on busy/transparent imagery. */
export function RareExclusiveOpaquePanel({ children, style = {} }) {
  return (
    <div
      style={{
        background: '#F8F4EE',
        border: `1px solid ${T.hairlineStone}`,
        padding: 'clamp(24px, 3vw, 36px)',
        color: T.charcoal,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Interior page hero band with crest + lifestyle photograph.
 * Prefer committed photos over abstract SVG panels (avoids visual clash).
 * visual: 'photo' | 'advisory' | 'sea' | 'terrace'
 */
export function RareExclusiveInteriorHero({
  eyebrow,
  title,
  body,
  visual = 'photo',
}) {
  const useAdvisory =
    visual === 'advisory' || visual === 'sea' || visual === 'terrace';
  const photoSrc = useAdvisory
    ? RARE_EXCLUSIVE_ADVISORY_IMAGE
    : RARE_EXCLUSIVE_HERO_IMAGE;
  const photoAlt = useAdvisory
    ? 'Mauritius lagoon and private terrace — private advisory setting'
    : 'Mauritius coastal residence — private lifestyle setting';

  return (
    <section
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.05fr) minmax(280px, 0.95fr)',
        borderBottom: `1px solid ${T.hairlineStone}`,
        background: T.ivory,
      }}
      className="re-interior-hero"
    >
      <div style={{ padding: 'clamp(44px, 6vw, 80px) clamp(28px, 4vw, 56px)', minWidth: 0 }}>
        <div style={{ marginBottom: 20 }}>
          <RareExclusiveCrest size={40} />
        </div>
        {eyebrow ? (
          <div
            style={{
              fontFamily: T.fontBody,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: T.gold,
            }}
          >
            {eyebrow}
          </div>
        ) : null}
        <h1
          style={{
            margin: '18px 0 18px',
            fontFamily: T.fontDisplay,
            fontWeight: 400,
            fontSize: 'clamp(2.1rem, 3.6vw, 3.1rem)',
            lineHeight: 1.12,
            color: T.charcoal,
          }}
        >
          {title}
        </h1>
        {body ? (
          <p
            style={{
              margin: 0,
              maxWidth: 520,
              fontFamily: T.fontBody,
              fontSize: 15.5,
              lineHeight: 1.8,
              color: '#4A433A',
            }}
          >
            {body}
          </p>
        ) : null}
      </div>
      <div style={{ minHeight: 300, borderLeft: `1px solid ${T.hairlineStone}` }}>
        <RareExclusiveHeroVisual
          src={photoSrc}
          alt={photoAlt}
          showCaption={false}
          objectPosition={useAdvisory ? 'center 40%' : 'center'}
        />
      </div>
      <style>{`
        @media (max-width: 800px) {
          .re-interior-hero { grid-template-columns: 1fr !important; }
          .re-interior-hero > div:last-child { min-height: 240px !important; border-left: none !important; border-top: 1px solid rgba(107,98,86,0.22); }
        }
      `}</style>
    </section>
  );
}

export const RARE_EXCLUSIVE_ENQUIRY_STEPS = Object.freeze([
  Object.freeze({
    n: '01',
    title: 'Share your intent',
    body: 'Tell us what you are seeking — residence, partnership, relocation, or ownership support.',
  }),
  Object.freeze({
    n: '02',
    title: 'Private advisor review',
    body: 'A single advisor reads your note in confidence and prepares a discreet next step.',
  }),
  Object.freeze({
    n: '03',
    title: 'Invitation to converse',
    body: 'Suitable introductions follow by appointment — never as an open-market listing response.',
  }),
]);

export function RareExclusiveEnquirySteps() {
  return (
    <section aria-label="Private advisory journey" style={{ padding: '48px 0 8px' }}>
      <div
        style={{
          fontFamily: T.fontBody,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
          color: T.gold,
          marginBottom: 28,
        }}
      >
        Private advisory journey
      </div>
      <div
        className="re-journey-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          borderTop: `1px solid ${T.hairlineStone}`,
          borderBottom: `1px solid ${T.hairlineStone}`,
        }}
      >
        {RARE_EXCLUSIVE_ENQUIRY_STEPS.map((step, i) => (
          <article
            key={step.n}
            style={{
              padding: '28px 22px',
              borderRight:
                i < RARE_EXCLUSIVE_ENQUIRY_STEPS.length - 1
                  ? `1px solid ${T.hairlineStone}`
                  : 'none',
              background: '#F8F4EE',
            }}
          >
            <div
              style={{
                fontFamily: T.fontDisplay,
                fontStyle: 'italic',
                fontSize: 22,
                color: T.gold,
              }}
            >
              {step.n}
            </div>
            <h3
              style={{
                margin: '12px 0 10px',
                fontFamily: T.fontDisplay,
                fontSize: 22,
                fontWeight: 500,
                color: T.charcoal,
              }}
            >
              {step.title}
            </h3>
            <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.7, color: '#4A433A' }}>
              {step.body}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

export const RARE_EXCLUSIVE_PROMISE_CARDS = Object.freeze([
  Object.freeze({
    icon: 'shield',
    title: 'Discretion & privacy',
    body: 'Your enquiry is held in confidence. Conversations begin by introduction and continue by appointment only.',
  }),
  Object.freeze({
    icon: 'cloche',
    title: 'Owner concierge',
    body: 'Design decisions, progress updates, and ownership support stay in one calm advisory thread.',
  }),
  Object.freeze({
    icon: 'compass',
    title: 'Mauritius expertise',
    body: 'Local insight on lifestyle, access, and long-term ownership — framed for private wealth clients.',
  }),
]);

export function RareExclusivePromiseGrid() {
  return (
    <section aria-label="Discretion, concierge, and Mauritius expertise" style={{ padding: '40px 0' }}>
      <div
        className="re-promise-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 18,
        }}
      >
        {RARE_EXCLUSIVE_PROMISE_CARDS.map((card) => (
          <RareExclusiveOpaquePanel key={card.title} style={{ padding: '28px 22px' }}>
            <div style={{ marginBottom: 14 }}>
              <FeatureIcon name={card.icon} />
            </div>
            <h3
              style={{
                margin: 0,
                fontFamily: T.fontDisplay,
                fontSize: 22,
                fontWeight: 500,
                color: T.charcoal,
              }}
            >
              {card.title}
            </h3>
            <p style={{ margin: '12px 0 0', fontSize: 14.5, lineHeight: 1.7, color: '#4A433A' }}>
              {card.body}
            </p>
          </RareExclusiveOpaquePanel>
        ))}
      </div>
    </section>
  );
}

/** Concept A primary CTA — solid gold rectangle with white label. */
export function rareExclusiveCtaGoldStyle() {
  return {
    display: 'inline-block',
    padding: '15px 28px',
    borderRadius: 2,
    background: T.gold,
    color: '#FFFFFF',
    fontFamily: T.fontBody,
    fontWeight: 700,
    fontSize: 11.5,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    textDecoration: 'none',
    border: 'none',
    cursor: 'pointer',
  };
}

/** Alias: primary CTA in Concept A is gold. */
export function rareExclusiveCtaPrimaryStyle() {
  return rareExclusiveCtaGoldStyle();
}

/** Secondary gold text link with chevron (Concept A). */
export function rareExclusiveCtaQuietStyle() {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '14px 4px',
    background: 'transparent',
    color: T.gold,
    fontFamily: T.fontBody,
    fontWeight: 700,
    fontSize: 11.5,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    textDecoration: 'none',
    border: 'none',
    cursor: 'pointer',
  };
}

export function RareExclusiveTextLink({ href, children }) {
  return (
    <a href={href} style={rareExclusiveCtaQuietStyle()}>
      {children}
      <span aria-hidden="true">›</span>
    </a>
  );
}

/** Re-export font stylesheet so Ivory routes keep a single import path. */
export { LuxeMauriceFontStylesheet };
