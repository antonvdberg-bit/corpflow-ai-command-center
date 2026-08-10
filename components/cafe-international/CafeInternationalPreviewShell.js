import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

import { CAFE_INTERNATIONAL_VISUALS } from '../../lib/website-rescue/cafe-international-assets.js';

/**
 * Shared shell for Café International Website Rescue preview.
 * Path-based under /demo/cafe-international — noindex, no chatbot activation.
 * Visual-first: client-owned photography from Anton Drive folder.
 */

const T = {
  charcoal: '#1a1210',
  charcoalSoft: '#2a1c18',
  cream: '#f6efe6',
  creamMuted: '#d9cbb8',
  flame: '#c45c26',
  flameSoft: '#e8a06a',
  ember: '#8b3a1a',
  ink: '#140e0c',
  line: 'rgba(246,239,230,0.16)',
  glass: 'rgba(20,14,12,0.62)',
  glassBorder: 'rgba(246,239,230,0.22)',
  fontDisplay: '"Fraunces", "Iowan Old Style", Georgia, serif',
  fontBody: '"Source Sans 3", "Segoe UI", ui-sans-serif, system-ui, sans-serif',
};

export function CafeInternationalTokens() {
  return T;
}

function ActionButton({ href, children, primary = false, external = false }) {
  const style = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    padding: '12px 18px',
    borderRadius: 10,
    fontWeight: 700,
    fontSize: 15,
    letterSpacing: '0.01em',
    textDecoration: 'none',
    border: primary ? 'none' : `1px solid ${T.creamMuted}`,
    background: primary
      ? `linear-gradient(135deg, ${T.flameSoft} 0%, ${T.flame} 55%, ${T.ember} 100%)`
      : 'rgba(20,14,12,0.45)',
    color: primary ? T.ink : T.cream,
    boxShadow: primary ? '0 10px 28px rgba(196,92,38,0.35)' : 'none',
    backdropFilter: primary ? undefined : 'blur(8px)',
  };
  if (external) {
    return (
      <a href={href} style={style} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  }
  if (String(href || '').startsWith('tel:') || String(href || '').startsWith('https://wa.me')) {
    return (
      <a href={href} style={style}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} style={style}>
      {children}
    </Link>
  );
}

export function CafeGlassPanel({ children, style = {}, as: Tag = 'section', ...rest }) {
  return (
    <Tag
      style={{
        border: `1px solid ${T.glassBorder}`,
        borderRadius: 18,
        padding: '20px 18px',
        background: T.glass,
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        boxShadow: '0 18px 40px rgba(0,0,0,0.35)',
        ...style,
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function CafeActionPanel({
  title,
  subtitle,
  actions,
  tone = 'booking',
  image,
  children,
  id,
}) {
  const border =
    tone === 'takeaway' ? 'rgba(232,160,106,0.55)' : 'rgba(246,239,230,0.28)';
  return (
    <CafeGlassPanel
      id={id}
      data-cafe-action-panel={tone}
      style={{
        border: `1px solid ${border}`,
        padding: 0,
        overflow: 'hidden',
        background:
          tone === 'takeaway'
            ? 'linear-gradient(180deg, rgba(196,92,38,0.22), rgba(26,18,16,0.78))'
            : 'linear-gradient(180deg, rgba(246,239,230,0.10), rgba(26,18,16,0.78))',
      }}
    >
      {image ? (
        <div
          style={{
            height: 140,
            backgroundImage: `linear-gradient(180deg, rgba(20,14,12,0.15), rgba(20,14,12,0.72)), url(${image})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
          aria-hidden
        />
      ) : null}
      <div style={{ padding: '18px 16px 20px' }}>
        <div
          style={{
            fontSize: 12,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: T.flameSoft,
            fontWeight: 800,
          }}
        >
          {tone === 'takeaway' ? 'Takeaway' : 'Visit / dine in'}
        </div>
        <h2
          style={{
            margin: '8px 0 0',
            fontFamily: T.fontDisplay,
            fontSize: 'clamp(22px, 3vw, 28px)',
            color: T.cream,
            lineHeight: 1.15,
          }}
        >
          {title}
        </h2>
        <p style={{ margin: '10px 0 0', color: T.creamMuted, lineHeight: 1.5, fontSize: 15 }}>
          {subtitle}
        </p>
        {children}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 16 }}>
          {(actions || []).map((a) => (
            <ActionButton
              key={a.id}
              href={a.href}
              primary={a.kind === 'whatsapp' || a.kind === 'phone'}
              external={a.kind === 'chat_bridge'}
            >
              {a.label}
            </ActionButton>
          ))}
        </div>
      </div>
    </CafeGlassPanel>
  );
}

/**
 * Client food-motion with muted autoplay, poster fallback, and reduced-motion safety.
 */
export function CafeFoodMotion({
  src,
  poster,
  caption = 'From the flame grill',
}) {
  return (
    <figure
      data-cafe-food-motion="true"
      style={{
        margin: 0,
        borderRadius: 18,
        overflow: 'hidden',
        border: `1px solid ${T.line}`,
        background: T.ink,
        position: 'relative',
        boxShadow: '0 22px 48px rgba(0,0,0,0.4)',
      }}
    >
      <video
        data-cafe-food-motion-video
        src={src}
        poster={poster}
        muted
        playsInline
        autoPlay
        loop
        preload="metadata"
        controls={false}
        disablePictureInPicture
        aria-label={caption}
        style={{
          display: 'block',
          width: '100%',
          height: 'auto',
          aspectRatio: '16 / 9',
          objectFit: 'cover',
          background: `center / cover no-repeat url(${poster})`,
        }}
      />
      <img
        data-cafe-food-motion-fallback
        src={poster}
        alt={caption}
        style={{
          display: 'none',
          width: '100%',
          height: 'auto',
          aspectRatio: '16 / 9',
          objectFit: 'cover',
        }}
      />
      <figcaption
        style={{
          position: 'absolute',
          left: 14,
          bottom: 12,
          padding: '6px 10px',
          borderRadius: 8,
          background: 'rgba(20,14,12,0.72)',
          color: T.cream,
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          pointerEvents: 'none',
        }}
      >
        {caption}
      </figcaption>
    </figure>
  );
}

export default function CafeInternationalPreviewShell({
  title,
  description,
  canonicalPath,
  jsonLd,
  nav,
  activeHref,
  children,
  truth,
  fullBleedHero = false,
}) {
  const [open, setOpen] = useState(false);
  const canonical = `https://corpflowai.com${canonicalPath}`;
  const pageBg = CAFE_INTERNATIONAL_VISUALS.venueEvening;

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="robots" content="noindex,nofollow" />
        <link rel="canonical" href={canonical} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700&family=Source+Sans+3:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
        {jsonLd ? (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
        ) : null}
      </Head>
      <div
        data-cafe-international-preview
        style={{
          minHeight: '100vh',
          color: T.cream,
          fontFamily: T.fontBody,
          backgroundColor: T.ink,
          backgroundImage: fullBleedHero
            ? undefined
            : `
            linear-gradient(180deg, rgba(20,14,12,0.88) 0%, rgba(20,14,12,0.94) 40%, rgba(20,14,12,0.98) 100%),
            url(${pageBg})
          `,
          backgroundSize: 'cover',
          backgroundAttachment: 'fixed',
          backgroundPosition: 'center',
        }}
      >
        <div
          data-preview-ribbon
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 40,
            padding: '10px 16px',
            background: 'rgba(20,14,12,0.92)',
            borderBottom: `1px solid ${T.line}`,
            fontSize: 13,
            lineHeight: 1.45,
            color: T.creamMuted,
            backdropFilter: 'blur(10px)',
          }}
        >
          <strong style={{ color: T.cream }}>Website Rescue preview</strong>
          {' — '}
          CorpFlowAI corpflow_test / demo path for owner review. Not{' '}
          {String(truth?.production_domain || 'the live domain')}. No chatbot
          activation, no WhatsApp automation, no domain cutover.
        </div>

        <header
          style={{
            maxWidth: 1100,
            margin: '0 auto',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <Link
            href={nav?.[0]?.href || '/demo/cafe-international'}
            data-cafe-brand-lockup
            style={{
              textDecoration: 'none',
              color: T.cream,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              minWidth: 0,
            }}
          >
            <img
              src={CAFE_INTERNATIONAL_VISUALS.brandLogoMark}
              alt="Café International — The Flame Grill logo"
              width={48}
              height={48}
              style={{
                width: 48,
                height: 48,
                objectFit: 'contain',
                flexShrink: 0,
                filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.4))',
              }}
            />
            <span style={{ minWidth: 0 }}>
              <span
                style={{
                  display: 'block',
                  fontFamily: T.fontDisplay,
                  fontSize: 20,
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                }}
              >
                Café International
              </span>
              <span
                style={{
                  display: 'block',
                  fontFamily: T.fontBody,
                  fontSize: 11,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: T.flameSoft,
                  marginTop: 2,
                }}
              >
                The Flame Grill Café
              </span>
            </span>
          </Link>
          <button
            type="button"
            data-cafe-mobile-menu-btn
            aria-expanded={open}
            aria-controls="cafe-preview-nav"
            onClick={() => setOpen((v) => !v)}
            style={{
              minHeight: 44,
              minWidth: 44,
              borderRadius: 10,
              border: `1px solid ${T.line}`,
              background: T.charcoalSoft,
              color: T.cream,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {open ? 'Close' : 'Menu'}
          </button>
        </header>

        <nav
          id="cafe-preview-nav"
          aria-label="Café International preview"
          style={{
            display: open ? 'grid' : 'none',
            gap: 4,
            maxWidth: 1100,
            margin: '0 auto',
            padding: '0 16px 12px',
          }}
        >
          {(nav || []).map((item) => {
            const active = item.href === activeHref;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                style={{
                  padding: '12px 14px',
                  borderRadius: 10,
                  textDecoration: 'none',
                  color: active ? T.ink : T.cream,
                  background: active ? T.flameSoft : 'transparent',
                  fontWeight: 700,
                  minHeight: 44,
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <style>{`
          /* Visually hide screen-reader helpers — food-tile alts must not paint as blue link text */
          .sr-only,
          [data-cafe-international-preview] .sr-only {
            position: absolute !important;
            width: 1px !important;
            height: 1px !important;
            padding: 0 !important;
            margin: -1px !important;
            overflow: hidden !important;
            clip: rect(0, 0, 0, 0) !important;
            clip-path: inset(50%) !important;
            white-space: nowrap !important;
            border: 0 !important;
          }
          @media (min-width: 900px) {
            [data-cafe-desktop-nav] { display: flex !important; }
            [data-cafe-mobile-menu-btn] { display: none !important; }
            #cafe-preview-nav { display: none !important; }
            [data-cafe-mobile-dock] { display: none !important; }
          }
          @keyframes cafeFadeUp {
            from { opacity: 0; transform: translateY(14px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes cafeEmberGlow {
            0%, 100% { box-shadow: 0 18px 40px rgba(0,0,0,0.35), 0 0 0 0 rgba(232,160,106,0.0); }
            50% { box-shadow: 0 18px 40px rgba(0,0,0,0.35), 0 0 28px 0 rgba(232,160,106,0.18); }
          }
          [data-cafe-hero] { animation: cafeFadeUp 0.7s ease-out both; }
          [data-cafe-food-motion] { animation: cafeFadeUp 0.85s ease-out 0.12s both; }
          [data-cafe-journey] { animation: cafeFadeUp 0.8s ease-out 0.08s both; }
          [data-cafe-hero-glass] { animation: cafeEmberGlow 4.5s ease-in-out infinite; }
          [data-cafe-appetite-grid] a { transition: transform 0.25s ease, box-shadow 0.25s ease; }
          [data-cafe-appetite-grid] a:hover { transform: translateY(-4px); box-shadow: 0 16px 36px rgba(0,0,0,0.45); }
          @media (prefers-reduced-motion: reduce) {
            [data-cafe-hero],
            [data-cafe-food-motion],
            [data-cafe-journey],
            [data-cafe-hero-glass] { animation: none !important; }
            [data-cafe-appetite-grid] a { transition: none !important; }
            [data-cafe-appetite-grid] a:hover { transform: none !important; }
            [data-cafe-food-motion-video] { display: none !important; }
            [data-cafe-food-motion-fallback] { display: block !important; }
          }
        `}</style>
        <div
          data-cafe-desktop-nav
          style={{
            display: 'none',
            maxWidth: 1100,
            margin: '0 auto',
            padding: '0 16px 8px',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          {(nav || []).map((item) => {
            const active = item.href === activeHref;
            return (
              <Link
                key={`d-${item.href}`}
                href={item.href}
                style={{
                  padding: '10px 12px',
                  borderRadius: 999,
                  textDecoration: 'none',
                  color: active ? T.ink : T.creamMuted,
                  background: active ? T.flameSoft : 'rgba(20,14,12,0.45)',
                  border: active ? 'none' : `1px solid ${T.line}`,
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        <main
          style={{
            maxWidth: fullBleedHero ? 'none' : 1100,
            margin: '0 auto',
            padding: fullBleedHero ? '0 0 88px' : '8px 16px 88px',
          }}
        >
          {children}
        </main>

        <footer
          style={{
            borderTop: `1px solid ${T.line}`,
            padding: '28px 16px 100px',
            color: T.creamMuted,
            fontSize: 14,
            background: 'rgba(20,14,12,0.85)',
          }}
        >
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ fontFamily: T.fontDisplay, color: T.cream, fontSize: 18 }}>
              {String(truth?.public_name || 'Café International')}
            </div>
            <p style={{ margin: '8px 0 0', lineHeight: 1.5 }}>
              {String(truth?.address || '')}
              <br />
              {String(truth?.public_phone || '')}
            </p>
            <p style={{ margin: '12px 0 0', lineHeight: 1.5 }}>
              <Link href="/demo/cafe-international/visit" style={{ color: T.flameSoft }}>
                Visit · hours & directions
              </Link>
              {' · '}
              <Link href="/demo/cafe-international/takeaway" style={{ color: T.flameSoft }}>
                Takeaway
              </Link>
              {' · '}
              <Link href="/demo/cafe-international/contact" style={{ color: T.creamMuted }}>
                Contact
              </Link>
            </p>
            <p style={{ margin: '12px 0 0', fontSize: 12, opacity: 0.85 }}>
              Preview built by CorpFlowAI for owner review. Current live site remains{' '}
              {String(truth?.production_domain || '')}. Photography and food-motion from owner
              Drive assets. Menu prices from the live Menu-page Google Sheet (not the outdated
              Drive CSV).
            </p>
          </div>
        </footer>

        <div
          data-cafe-mobile-dock
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 50,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 8,
            padding: '10px 12px calc(10px + env(safe-area-inset-bottom))',
            background: 'rgba(20,14,12,0.94)',
            borderTop: `1px solid ${T.line}`,
            backdropFilter: 'blur(12px)',
          }}
        >
          <ActionButton href="/demo/cafe-international/menu">Menu</ActionButton>
          <ActionButton href="/demo/cafe-international/visit#book" primary>
            Book
          </ActionButton>
          <ActionButton href="/demo/cafe-international/takeaway" primary>
            Takeaway
          </ActionButton>
        </div>
      </div>
    </>
  );
}

export { ActionButton, CafeFoodMotion, T as CafeInternationalTheme };
