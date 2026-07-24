import React from 'react';
import Link from 'next/link';

import {
  LUXE_MAURICE_BRAND_TOKENS as T,
  LUXE_MAURICE_BRAND_SIGNATURE,
} from '../lib/client/luxe-maurice-brand-theme.js';
import { LuxeMauriceFontStylesheet } from './LuxeMauriceBrandPrimitives.js';

/**
 * Rare & Exclusive Collection — shared Ivory Editorial shell primitives.
 *
 * Used by lux.corpflowai.com public routes (homepage, /concierge, /properties,
 * /property/[slug]). Vercel previews are internal only; the client test URL is
 * the tenant host after merge/deploy.
 *
 * Visual direction (Issue #633): ivory editorial luxury, stacked Rare / & /
 * Exclusive wordmark, gold accents, fine-line navigation, curated bands —
 * not generic SaaS / dark admin UI.
 */

export const RARE_EXCLUSIVE_PUBLIC_BRAND = 'Rare & Exclusive Collection';

export const RARE_EXCLUSIVE_HERO_IMAGE =
  '/luxe-maurice-ai/luxury-coastal-private-access-hero.png';

/** Fine-line luxury navigation — anchors map to homepage sections or routes. */
export const RARE_EXCLUSIVE_NAV = Object.freeze([
  Object.freeze({ label: 'Properties', href: '/properties' }),
  Object.freeze({ label: 'Lifestyle', href: '/#lifestyle' }),
  Object.freeze({ label: 'Destination Mauritius', href: '/#destination' }),
  Object.freeze({ label: 'Private Services', href: '/#services' }),
  Object.freeze({ label: 'About', href: '/#about' }),
  Object.freeze({ label: 'Contact', href: '/concierge' }),
  Object.freeze({ label: 'Invitation Only', href: '/concierge', invite: true }),
]);

/**
 * Stacked Rare / & / Exclusive wordmark with gold ampersand.
 *
 * @param {{ tone?: 'charcoal' | 'ivory', size?: 'hero' | 'medium' | 'small' | 'nav', showSignature?: boolean, align?: 'center' | 'start' }} props
 */
export function RareExclusiveStackedWordmark({
  tone = 'charcoal',
  size = 'hero',
  showSignature = true,
  align = 'center',
}) {
  const isIvory = tone === 'ivory';
  const color = isIvory ? T.ivory : T.charcoal;
  const wordSize =
    size === 'hero'
      ? 'clamp(3.2rem, 8vw, 6.8rem)'
      : size === 'medium'
        ? 28
        : size === 'nav'
          ? 15
          : 18;
  const ampSize =
    size === 'hero'
      ? 'clamp(1.6rem, 3.6vw, 2.8rem)'
      : size === 'medium'
        ? 20
        : size === 'nav'
          ? 12
          : 14;
  const signatureSize = size === 'hero' ? 11 : 9.5;
  const track = size === 'hero' ? '0.16em' : size === 'nav' ? '0.14em' : '0.12em';
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
          lineHeight: 0.88,
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
          margin: size === 'hero' ? '0.22em 0 0.14em' : '0.14em 0 0.1em',
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
          lineHeight: 0.88,
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
            marginTop: size === 'hero' ? 26 : 10,
            fontFamily: T.fontBody,
            fontSize: signatureSize,
            fontWeight: 700,
            letterSpacing: size === 'hero' ? '0.36em' : '0.22em',
            lineHeight: 1.4,
            color: T.gold,
            textTransform: 'uppercase',
          }}
        >
          {LUXE_MAURICE_BRAND_SIGNATURE}
        </span>
      ) : null}
    </span>
  );
}

/**
 * Right-side Mauritius / villa lifestyle hero visual.
 * Uses the committed public-safe coastal asset plus CSS editorial framing.
 * No local/OneDrive/C-drive dependency.
 */
export function RareExclusiveHeroVisual({
  src = RARE_EXCLUSIVE_HERO_IMAGE,
  alt = 'Mauritius coastal residence — private lifestyle setting',
}) {
  return (
    <div
      aria-hidden={alt ? undefined : true}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: 320,
        overflow: 'hidden',
        background: `linear-gradient(145deg, #E8DFD0 0%, #D4C4A8 42%, #C4B090 100%)`,
      }}
    >
      {/* Atmospheric villa/lifestyle composition (CSS) behind the photo */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(ellipse at 70% 35%, rgba(255,255,255,0.35) 0%, transparent 55%),
            linear-gradient(180deg, rgba(168,132,44,0.12) 0%, transparent 40%, rgba(17,17,17,0.28) 100%)
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
      {/* Fine gold editorial frame */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 18,
          border: `1px solid rgba(168, 132, 44, 0.45)`,
          zIndex: 2,
          pointerEvents: 'none',
        }}
      />
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
    </div>
  );
}

function navLinkStyle(invite) {
  return {
    fontFamily: T.fontBody,
    fontSize: 10.5,
    fontWeight: 700,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    color: invite ? T.gold : T.stone,
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    borderBottom: invite ? `1px solid ${T.gold}` : '1px solid transparent',
    paddingBottom: 2,
  };
}

/**
 * Fine-line Ivory Editorial header shared across Lux public routes.
 */
export function RareExclusiveIvoryHeader({ activeHref = '' }) {
  return (
    <header
      style={{
        position: 'relative',
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 20,
        flexWrap: 'wrap',
        padding: '22px clamp(18px, 4vw, 56px)',
        borderBottom: `1px solid ${T.hairlineStone}`,
        background: 'rgba(244, 239, 232, 0.96)',
      }}
    >
      <Link
        href="/"
        style={{ textDecoration: 'none', flexShrink: 0 }}
        aria-label={`${RARE_EXCLUSIVE_PUBLIC_BRAND} home`}
      >
        <RareExclusiveStackedWordmark tone="charcoal" size="nav" showSignature={false} />
      </Link>
      <nav
        aria-label={RARE_EXCLUSIVE_PUBLIC_BRAND}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'clamp(14px, 2.2vw, 26px)',
          flexWrap: 'wrap',
          justifyContent: 'flex-end',
        }}
      >
        {RARE_EXCLUSIVE_NAV.map((item) => {
          const active =
            activeHref &&
            (activeHref === item.href ||
              (item.href.startsWith('/#') === false && activeHref.startsWith(item.href)));
          return (
            <a
              key={item.label}
              href={item.href}
              style={{
                ...navLinkStyle(item.invite),
                color: item.invite ? T.gold : active ? T.charcoal : T.stone,
              }}
            >
              {item.label}
            </a>
          );
        })}
      </nav>
    </header>
  );
}

/**
 * Shared charcoal footer with stacked wordmark.
 */
export function RareExclusiveIvoryFooter({ note }) {
  return (
    <footer
      style={{
        padding: '64px 32px 56px',
        background: T.charcoal,
        color: T.ivoryMuted,
        textAlign: 'center',
      }}
    >
      <RareExclusiveStackedWordmark tone="ivory" size="medium" showSignature />
      <p
        style={{
          margin: '34px auto 0',
          maxWidth: 640,
          fontFamily: T.fontBody,
          fontSize: 11.5,
          lineHeight: 1.8,
          color: T.ivoryMuted,
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

export function rareExclusiveCtaPrimaryStyle() {
  return {
    display: 'inline-block',
    padding: '15px 28px',
    borderRadius: T.radiusEditorial,
    background: T.charcoal,
    color: T.ivory,
    fontFamily: T.fontBody,
    fontWeight: 700,
    fontSize: 12,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    textDecoration: 'none',
    border: 'none',
    cursor: 'pointer',
  };
}

export function rareExclusiveCtaQuietStyle() {
  return {
    display: 'inline-block',
    padding: '14px 26px',
    borderRadius: T.radiusEditorial,
    border: `1px solid ${T.hairlineStone}`,
    background: 'transparent',
    color: T.charcoal,
    fontFamily: T.fontBody,
    fontWeight: 700,
    fontSize: 12,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    textDecoration: 'none',
  };
}

export function rareExclusiveCtaGoldStyle() {
  return {
    display: 'inline-block',
    padding: '16px 30px',
    borderRadius: T.radiusEditorial,
    background: T.gold,
    color: T.charcoal,
    fontFamily: T.fontBody,
    fontWeight: 700,
    fontSize: 12.5,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    textDecoration: 'none',
    border: 'none',
    cursor: 'pointer',
  };
}

/** Re-export font stylesheet so Ivory routes keep a single import path. */
export { LuxeMauriceFontStylesheet };
