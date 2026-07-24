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

export const RARE_EXCLUSIVE_STRAPLINE =
  'Private Wealth & Lifestyle Platform for Mauritius';

export const RARE_EXCLUSIVE_PRIVILEGE_QUOTE = 'Not just properties. A privilege.';

/** Main nav (Invitation Only is rendered separately with a divider). */
export const RARE_EXCLUSIVE_NAV_MAIN = Object.freeze([
  Object.freeze({ label: 'Properties', href: '/properties' }),
  Object.freeze({ label: 'Lifestyle', href: '/#lifestyle' }),
  Object.freeze({ label: 'Destination Mauritius', href: '/#destination' }),
  Object.freeze({ label: 'Private Services', href: '/#services' }),
  Object.freeze({ label: 'About', href: '/#about' }),
  Object.freeze({ label: 'Contact', href: '/concierge' }),
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
      ? 'clamp(3.4rem, 8.5vw, 7.2rem)'
      : size === 'medium'
        ? 28
        : size === 'nav'
          ? 15
          : 18;
  const ampSize =
    size === 'hero'
      ? 'clamp(1.7rem, 3.8vw, 3rem)'
      : size === 'medium'
        ? 20
        : size === 'nav'
          ? 12
          : 14;
  const track = size === 'hero' ? '0.14em' : size === 'nav' ? '0.14em' : '0.12em';
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
      }}
    >
      <span
        style={{
          fontFamily: T.fontDisplay,
          fontWeight: 400,
          fontSize: wordSize,
          lineHeight: 0.86,
          letterSpacing: track,
          textTransform: 'uppercase',
          paddingLeft: track,
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
          lineHeight: 0.86,
          letterSpacing: track,
          textTransform: 'uppercase',
          paddingLeft: track,
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
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(ellipse at 72% 28%, rgba(255,248,230,0.35) 0%, transparent 50%),
            linear-gradient(180deg, rgba(17,17,17,0.05) 0%, transparent 35%, rgba(17,17,17,0.35) 100%)
          `,
          zIndex: 1,
          pointerEvents: 'none',
        }}
      />
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
          objectPosition: 'center',
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
          maxWidth: 1180,
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
        display: 'grid',
        gridTemplateColumns: '56px 1fr',
        alignItems: 'center',
        gap: 16,
        padding: '18px clamp(16px, 3.5vw, 48px)',
        borderBottom: `1px solid ${T.hairlineStone}`,
        background: 'rgba(244, 239, 232, 0.97)',
      }}
      className="re-ivory-header"
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
      <style>{`
        @media (max-width: 720px) {
          .re-ivory-header { grid-template-columns: 1fr !important; }
          .re-feature-bar { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 480px) {
          .re-feature-bar { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </header>
  );
}

/**
 * Concept A footer: privilege quote + crest + quiet legal note.
 */
export function RareExclusiveIvoryFooter({ note }) {
  return (
    <footer
      style={{
        padding: '72px 32px 56px',
        background: T.ivory,
        color: T.stone,
        textAlign: 'center',
        borderTop: `1px solid ${T.hairlineStone}`,
      }}
    >
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
      <div style={{ margin: '36px auto 0', display: 'flex', justifyContent: 'center' }}>
        <RareExclusiveCrest size={40} />
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
    </footer>
  );
}

export function rareExclusivePageShellStyle() {
  return {
    fontFamily: T.fontBody,
    minHeight: '100vh',
    background: T.ivoryPage || T.ivory,
    color: T.charcoal,
  };
}

/** Concept A primary CTA — solid gold rectangle. */
export function rareExclusiveCtaGoldStyle() {
  return {
    display: 'inline-block',
    padding: '15px 28px',
    borderRadius: 2,
    background: T.gold,
    color: T.charcoal,
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

/** Secondary text link with chevron. */
export function rareExclusiveCtaQuietStyle() {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '14px 4px',
    background: 'transparent',
    color: T.charcoal,
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
      <span aria-hidden="true" style={{ color: T.gold }}>
        ›
      </span>
    </a>
  );
}

/** Re-export font stylesheet so Ivory routes keep a single import path. */
export { LuxeMauriceFontStylesheet };
