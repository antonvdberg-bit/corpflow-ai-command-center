/**
 * Living Word Mauritius \u2014 visual sandbox page (`/site-preview`).
 *
 * v1 visual refinement (2026-06-16):
 *
 *   - Per-section red `SandboxBanner` warning boxes were removed. The
 *     persistent fixed orange `TestEnvironmentRibbon` at the top of the
 *     viewport is now the single non-removable sandbox marker.
 *   - Layout was rebuilt with a hero, top nav, five-pillars row, get-involved
 *     grid, next-gen card row, sunday-service / location / contact strip, and
 *     a placeholder events block. The visual treatment (deep navy + warm
 *     gold + cream + system serif headings) intentionally resembles the
 *     public church site at livingwordmauritius.com so testers can
 *     meaningfully assess chatbot placement and site-context.
 *   - Strings that mirror PUBLISHED public facts from the live homepage
 *     (pastor / pillar names / verses / address / phone / email / service
 *     time / ministry names / age bands) are intentionally used per the
 *     refinement brief (\"recognisable facsimile\"). New facts are NOT
 *     invented; uncertain facts (specific upcoming dates, donation amounts,
 *     sermon titles) remain placeholder.
 *
 * Tenant-scoped, host-gated, `noindex,nofollow`. URL (only meaningful host):
 *
 *   https://living-word-mauritius.corpflowai.com/site-preview
 *
 * Any other host returns `notFound: true` from `getServerSideProps`. See
 * `artifacts/quality-audits/2026-06-11-living-word-mauritius/visual-sandbox-plan.md`
 * for the full plan and safety rationale.
 *
 * The chat widget loader script is included; it serves the no-op disabled
 * stub for `living-word-mauritius` until an explicit operator authorisation
 * flips `chat_widget_configs.enabled = true` for this tenant.
 */

import Head from 'next/head';

import {
  ABOUT,
  CONTACT,
  EVENTS_PLACEHOLDER,
  FOOTER,
  GET_INVOLVED,
  HERO,
  LOCATION,
  NAV,
  NEXT_GEN,
  NEXT_STEP,
  PILLARS,
  SUNDAY_SERVICE,
} from '../lib/sandbox/living-word-sandbox-content.js';
import { PLACEHOLDER_SCHEDULE } from '../lib/sandbox/living-word-schedule-shape.js';
import { TestEnvironmentRibbon } from '../lib/sandbox/test-environment-ribbon.js';

const TEST_RIBBON_MESSAGE =
  'TEST ENVIRONMENT \u2014 Not the live Living Word Mauritius website';

const ALLOWED_HOSTS = new Set(['living-word-mauritius.corpflowai.com']);

const SANDBOX_TENANT_ID = 'living-word-mauritius';

/**
 * Visual identity \u2014 deep navy + warm gold + cream + system serif headings.
 * Designed to feel like the public church site without copying any specific
 * brand asset (no logo file, no photographs, no exact-match colour codes).
 */
const COLOURS = {
  navy: '#0E1F3A',
  navyDeep: '#0A1830',
  navySoft: '#1E2F4D',
  gold: '#C9A961',
  goldSoft: '#E8D9A8',
  cream: '#F5F1EA',
  creamSoft: '#FAF7F1',
  white: '#FFFFFF',
  border: '#E5E0D5',
  text: '#1A1A1A',
  textMuted: '#6B6258',
  textOnDark: '#F5F1EA',
  textOnDarkMuted: '#B8B0A0',
};

const FONTS = {
  serif:
    'Georgia, "Times New Roman", "PT Serif", Cambria, serif',
  sans:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};

export async function getServerSideProps(ctx) {
  const rawHost = ctx?.req?.headers?.host || '';
  const host = String(rawHost).toLowerCase().split(':')[0];
  if (!ALLOWED_HOSTS.has(host)) {
    return { notFound: true };
  }
  return {
    props: {
      tenantId: SANDBOX_TENANT_ID,
      host,
      placeholderCount: PLACEHOLDER_SCHEDULE.length,
    },
  };
}

function NavBar() {
  return (
    <nav
      aria-label="Sandbox sections"
      style={{
        background: COLOURS.navyDeep,
        color: COLOURS.textOnDark,
        borderBottom: `1px solid ${COLOURS.navySoft}`,
        padding: '14px 24px',
        font: `500 14px/1.4 ${FONTS.sans}`,
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 24,
        }}
      >
        <span
          style={{
            font: `700 18px/1.2 ${FONTS.serif}`,
            color: COLOURS.gold,
            letterSpacing: 0.4,
            marginRight: 'auto',
          }}
        >
          Living Word Mauritius
        </span>
        {NAV.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            style={{
              color: COLOURS.textOnDark,
              textDecoration: 'none',
              padding: '4px 0',
              borderBottom: '1px solid transparent',
            }}
          >
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

function HeroSection() {
  return (
    <section
      id="hero"
      style={{
        position: 'relative',
        background:
          `linear-gradient(135deg, ${COLOURS.navy} 0%, ${COLOURS.navyDeep} 100%)`,
        color: COLOURS.textOnDark,
        padding: '80px 24px 96px',
        textAlign: 'center',
        borderBottom: `4px solid ${COLOURS.gold}`,
      }}
    >
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <p
          style={{
            margin: '0 0 16px',
            fontSize: 13,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: COLOURS.gold,
            font: `600 13px/1.2 ${FONTS.sans}`,
          }}
        >
          {HERO.eyebrow}
        </p>
        <h1
          style={{
            margin: '0 0 20px',
            font: `400 56px/1.1 ${FONTS.serif}`,
            color: COLOURS.textOnDark,
            letterSpacing: 0.5,
          }}
        >
          {HERO.title}
        </h1>
        <p
          style={{
            margin: '0 auto 28px',
            maxWidth: 640,
            font: `400 17px/1.6 ${FONTS.sans}`,
            color: COLOURS.textOnDarkMuted,
          }}
        >
          {HERO.tagline}
        </p>
        <div
          style={{
            display: 'inline-flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span
            aria-disabled="true"
            style={{
              display: 'inline-block',
              background: COLOURS.gold,
              color: COLOURS.navyDeep,
              padding: '14px 28px',
              borderRadius: 4,
              font: `600 14px/1 ${FONTS.sans}`,
              letterSpacing: 1,
              textTransform: 'uppercase',
              opacity: 0.85,
              cursor: 'default',
            }}
          >
            {HERO.ctaLabel}
          </span>
          <span
            style={{
              font: `400 12px/1.4 ${FONTS.sans}`,
              color: COLOURS.textOnDarkMuted,
              maxWidth: 420,
            }}
          >
            {HERO.ctaSubtext}
          </span>
        </div>
      </div>
    </section>
  );
}

function SectionHeading({ eyebrow, title }) {
  return (
    <header style={{ textAlign: 'center', marginBottom: 32 }}>
      {eyebrow ? (
        <p
          style={{
            margin: '0 0 8px',
            font: `600 12px/1.2 ${FONTS.sans}`,
            color: COLOURS.gold,
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}
        >
          {eyebrow}
        </p>
      ) : null}
      <h2
        style={{
          margin: 0,
          font: `400 32px/1.2 ${FONTS.serif}`,
          color: COLOURS.navy,
          letterSpacing: 0.3,
        }}
      >
        {title}
      </h2>
    </header>
  );
}

function AboutSection() {
  return (
    <section
      id="about"
      style={{
        background: COLOURS.creamSoft,
        padding: '72px 24px',
        borderBottom: `1px solid ${COLOURS.border}`,
      }}
    >
      <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
        <SectionHeading eyebrow="Welcome" title={ABOUT.heading} />
        <p
          style={{
            margin: '0 0 16px',
            font: `400 18px/1.7 ${FONTS.sans}`,
            color: COLOURS.text,
          }}
        >
          {ABOUT.body}
        </p>
        <p
          style={{
            margin: 0,
            font: `400 13px/1.5 ${FONTS.sans}`,
            color: COLOURS.textMuted,
            fontStyle: 'italic',
          }}
        >
          {ABOUT.source}
        </p>
      </div>
    </section>
  );
}

function PillarsSection() {
  return (
    <section
      id="pillars"
      style={{
        background: COLOURS.white,
        padding: '72px 24px',
        borderBottom: `1px solid ${COLOURS.border}`,
      }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <SectionHeading eyebrow="Five pillars" title="What we stand for" />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 16,
            marginTop: 8,
          }}
        >
          {PILLARS.map((p) => (
            <article
              key={p.id}
              style={{
                background: COLOURS.creamSoft,
                border: `1px solid ${COLOURS.border}`,
                borderTop: `3px solid ${COLOURS.gold}`,
                padding: '24px 20px',
                textAlign: 'center',
              }}
            >
              <h3
                style={{
                  margin: '0 0 12px',
                  font: `400 22px/1.2 ${FONTS.serif}`,
                  color: COLOURS.navy,
                  letterSpacing: 0.3,
                }}
              >
                {p.title}
              </h3>
              <p
                style={{
                  margin: '0 0 12px',
                  font: `600 11px/1.2 ${FONTS.sans}`,
                  color: COLOURS.gold,
                  letterSpacing: 1.5,
                  textTransform: 'uppercase',
                }}
              >
                {p.verseRef}
              </p>
              <p
                style={{
                  margin: 0,
                  font: `400 13px/1.55 ${FONTS.serif}`,
                  color: COLOURS.textMuted,
                  fontStyle: 'italic',
                }}
              >
                {p.verse}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function GetInvolvedSection() {
  return (
    <section
      id="get-involved"
      style={{
        background: COLOURS.cream,
        padding: '72px 24px',
        borderBottom: `1px solid ${COLOURS.border}`,
      }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <SectionHeading eyebrow="Get involved" title="Blessed to be a blessing" />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 18,
          }}
        >
          {GET_INVOLVED.map((g) => (
            <article
              key={g.id}
              style={{
                background: COLOURS.white,
                border: `1px solid ${COLOURS.border}`,
                padding: '24px 22px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <h3
                style={{
                  margin: 0,
                  font: `400 22px/1.2 ${FONTS.serif}`,
                  color: COLOURS.navy,
                }}
              >
                {g.title}
              </h3>
              <p
                style={{
                  margin: 0,
                  font: `400 14px/1.6 ${FONTS.sans}`,
                  color: COLOURS.text,
                  flex: 1,
                }}
              >
                {g.body}
              </p>
              {g.chatCta ? (
                <p
                  style={{
                    margin: 0,
                    font: `600 12px/1.4 ${FONTS.sans}`,
                    color: COLOURS.gold,
                    letterSpacing: 0.5,
                  }}
                >
                  &rarr; {g.chatCta}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function NextGenSection() {
  return (
    <section
      id="next-gen"
      style={{
        background: COLOURS.navy,
        color: COLOURS.textOnDark,
        padding: '72px 24px',
        borderBottom: `4px solid ${COLOURS.gold}`,
      }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <header style={{ textAlign: 'center', marginBottom: 32 }}>
          <p
            style={{
              margin: '0 0 8px',
              font: `600 12px/1.2 ${FONTS.sans}`,
              color: COLOURS.gold,
              letterSpacing: 2,
              textTransform: 'uppercase',
            }}
          >
            Next generation
          </p>
          <h2
            style={{
              margin: 0,
              font: `400 32px/1.2 ${FONTS.serif}`,
              color: COLOURS.textOnDark,
              letterSpacing: 0.3,
            }}
          >
            Building futures in faith
          </h2>
        </header>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 18,
          }}
        >
          {NEXT_GEN.map((n) => (
            <article
              key={n.id}
              style={{
                background: COLOURS.navyDeep,
                border: `1px solid ${COLOURS.navySoft}`,
                borderLeft: `3px solid ${COLOURS.gold}`,
                padding: '24px 22px',
              }}
            >
              <h3
                style={{
                  margin: '0 0 6px',
                  font: `400 22px/1.2 ${FONTS.serif}`,
                  color: COLOURS.textOnDark,
                }}
              >
                {n.title}
              </h3>
              <p
                style={{
                  margin: '0 0 12px',
                  font: `600 11px/1.2 ${FONTS.sans}`,
                  color: COLOURS.gold,
                  letterSpacing: 1.5,
                  textTransform: 'uppercase',
                }}
              >
                {n.ageBand}
              </p>
              <p
                style={{
                  margin: 0,
                  font: `400 14px/1.6 ${FONTS.sans}`,
                  color: COLOURS.textOnDarkMuted,
                }}
              >
                {n.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ServiceLocationContactSection() {
  const cardStyle = {
    background: COLOURS.white,
    border: `1px solid ${COLOURS.border}`,
    borderTop: `3px solid ${COLOURS.gold}`,
    padding: '28px 26px',
  };
  const cardHeading = {
    margin: '0 0 12px',
    font: `400 22px/1.2 ${FONTS.serif}`,
    color: COLOURS.navy,
  };
  const cardLine = {
    margin: '0 0 8px',
    font: `400 15px/1.55 ${FONTS.sans}`,
    color: COLOURS.text,
  };
  const cardSource = {
    margin: '12px 0 0',
    font: `400 12px/1.4 ${FONTS.sans}`,
    color: COLOURS.textMuted,
    fontStyle: 'italic',
  };
  return (
    <section
      id="service"
      style={{
        background: COLOURS.creamSoft,
        padding: '72px 24px',
        borderBottom: `1px solid ${COLOURS.border}`,
      }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <SectionHeading eyebrow="Sunday" title="Join us this Sunday" />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 18,
          }}
        >
          <article style={cardStyle}>
            <h3 style={cardHeading}>{SUNDAY_SERVICE.heading}</h3>
            <p style={cardLine}>{SUNDAY_SERVICE.serviceTime}</p>
            <p style={cardSource}>{SUNDAY_SERVICE.source}</p>
          </article>
          <article style={cardStyle} id="location">
            <h3 style={cardHeading}>{LOCATION.heading}</h3>
            <p style={cardLine}>
              <strong>{LOCATION.venue}</strong>
            </p>
            <p style={cardLine}>{LOCATION.address}</p>
            <p style={cardSource}>{LOCATION.source}</p>
          </article>
          <article style={cardStyle} id="contact">
            <h3 style={cardHeading}>{CONTACT.heading}</h3>
            <p style={cardLine}>{CONTACT.email}</p>
            <p style={cardLine}>{CONTACT.phone}</p>
            <p style={cardSource}>{CONTACT.note}</p>
          </article>
        </div>
      </div>
    </section>
  );
}

function EventsSection({ entries }) {
  return (
    <section
      id="events"
      style={{
        background: COLOURS.white,
        padding: '72px 24px',
        borderBottom: `1px solid ${COLOURS.border}`,
      }}
    >
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <SectionHeading eyebrow="Schedule fixtures" title={EVENTS_PLACEHOLDER.heading} />
        <p
          style={{
            margin: '0 0 24px',
            font: `400 15px/1.65 ${FONTS.sans}`,
            color: COLOURS.textMuted,
            textAlign: 'center',
          }}
        >
          {EVENTS_PLACEHOLDER.body}
        </p>
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            border: `1px solid ${COLOURS.border}`,
          }}
        >
          {entries.map((e, idx) => (
            <li
              key={e.id}
              style={{
                display: 'flex',
                gap: 18,
                alignItems: 'center',
                padding: '16px 20px',
                background: idx % 2 === 0 ? COLOURS.creamSoft : COLOURS.white,
                borderTop: idx === 0 ? 'none' : `1px solid ${COLOURS.border}`,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  flex: '0 0 auto',
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: COLOURS.gold,
                  opacity: 0.75,
                }}
              />
              <div style={{ flex: 1 }}>
                <p
                  style={{
                    margin: '0 0 2px',
                    font: `600 15px/1.3 ${FONTS.serif}`,
                    color: COLOURS.navy,
                  }}
                >
                  {e.title}
                </p>
                <p
                  style={{
                    margin: 0,
                    font: `400 12px/1.4 ${FONTS.sans}`,
                    color: COLOURS.textMuted,
                  }}
                >
                  {e.category} &middot; {e.recurrence} &middot; placeholder fixture (not a real listing)
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function NextStepSection() {
  return (
    <section
      id="next-step"
      style={{
        background: COLOURS.cream,
        padding: '72px 24px',
        borderBottom: `1px solid ${COLOURS.border}`,
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <SectionHeading eyebrow="Next step" title={NEXT_STEP.heading} />
        <p
          style={{
            margin: 0,
            font: `400 16px/1.7 ${FONTS.sans}`,
            color: COLOURS.text,
          }}
        >
          {NEXT_STEP.body}
        </p>
      </div>
    </section>
  );
}

function FooterSection({ tenantId, host, placeholderCount }) {
  return (
    <footer
      style={{
        background: COLOURS.navyDeep,
        color: COLOURS.textOnDark,
        padding: '48px 24px 56px',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <p
          style={{
            margin: '0 0 12px',
            font: `400 24px/1.2 ${FONTS.serif}`,
            color: COLOURS.gold,
            letterSpacing: 0.4,
          }}
        >
          {FOOTER.brand}
        </p>
        <p
          style={{
            margin: '0 0 18px',
            font: `400 14px/1.6 ${FONTS.sans}`,
            color: COLOURS.textOnDarkMuted,
          }}
        >
          {FOOTER.sandboxNote}
        </p>
        <p
          style={{
            margin: '0 0 12px',
            font: `400 12px/1.5 ${FONTS.sans}`,
            color: COLOURS.textOnDarkMuted,
          }}
        >
          tenant <code>{tenantId}</code> &middot; host <code>{host}</code> &middot;{' '}
          {placeholderCount} placeholder schedule entries &middot; widget
          kill-switch is independent of this page
        </p>
        <p
          style={{
            margin: 0,
            font: `400 11px/1.5 ${FONTS.sans}`,
            color: COLOURS.textOnDarkMuted,
          }}
        >
          {FOOTER.copyrightLine}
        </p>
      </div>
    </footer>
  );
}

export default function SitePreviewPage({ tenantId, host, placeholderCount }) {
  return (
    <>
      <Head>
        <title>Living Word Mauritius \u2014 CorpFlow sandbox (test environment)</title>
        <meta name="robots" content="noindex,nofollow" />
        <meta
          name="description"
          content="CorpFlow test environment for Living Word Mauritius. Not the church website."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script
          async
          src="/api/chat-widget/loader.js"
          data-flow="default"
          data-position="bottom-right"
        />
      </Head>

      {/*
        Persistent high-visibility test-environment ribbon. Fixed at the top of
        the viewport, non-dismissible, sits above the chat widget panel
        (z-index 2147483640 vs widget panel 2147483601). See
        lib/sandbox/test-environment-ribbon.js for the posture rule.
      */}
      <TestEnvironmentRibbon message={TEST_RIBBON_MESSAGE} />

      <div
        style={{
          background: COLOURS.cream,
          color: COLOURS.text,
          font: `15px/1.55 ${FONTS.sans}`,
          minHeight: '100vh',
          /*
            Top padding clears the fixed ribbon. 80px handles the 2-line wrap
            case on narrow mobile viewports (~320px wide) where the ribbon
            text wraps to two lines at 14px font.
          */
          paddingTop: 80,
        }}
      >
        <NavBar />
        <HeroSection />
        <AboutSection />
        <PillarsSection />
        <GetInvolvedSection />
        <NextGenSection />
        <ServiceLocationContactSection />
        <EventsSection entries={PLACEHOLDER_SCHEDULE} />
        <NextStepSection />
        <FooterSection
          tenantId={tenantId}
          host={host}
          placeholderCount={placeholderCount}
        />
      </div>
    </>
  );
}
