import React from 'react';
import Link from 'next/link';
import CorpFlowPublicPhotoShell from '../components/public/CorpFlowPublicPhotoShell.js';
import { policyStyles as ps, trustStyles as ts } from '../components/PublicPolicyLayout.js';
import { buildPublicPageMeta } from '../lib/public/corpflow-public-market.js';
import { ENQUIRY_RECOVERY_DIAGNOSIS_HREF, ENQUIRY_RECOVERY_PRIMARY_CTA_LABEL, LEAD_RESCUE_PUBLIC_PAYMENT_LINE } from '../lib/public/enquiry-recovery-sprint.js';

const PILLARS = [
  {
    label: 'Review cadence',
    body: 'Every active engagement has at least one operator review per week. During a live delivery window, that becomes one review per business day. Reviews are scheduled by the operator, not the client - you do not have to chase us.',
  },
  {
    label: 'Monitoring',
    body: 'On a live engagement we monitor the agreed capture and follow-up path so drift is visible early. Exact channels and checks are defined in the written scope.',
  },
  {
    label: 'Payment after review',
    body: `No card or banking details are collected on this website. ${LEAD_RESCUE_PUBLIC_PAYMENT_LINE} Cancellation windows before setup begins are published on the refund-policy page.`,
  },
  {
    label: 'No revenue guarantees',
    body: 'We do not promise revenue, lead volume, or conversion lift. Our marketing pages avoid revenue claims and "X% uplift" language by policy.',
  },
];

export default function StandardsPage() {
  const meta = buildPublicPageMeta({
    title: 'Operational standards',
    description: 'How CorpFlowAI runs engagements: review cadence, monitoring, payment after review, no-guarantee positioning, and governance.',
    path: '/standards',
    ogImage: '/assets/visuals/corpflow-standards-hero.jpg',
  });

  return (
    <CorpFlowPublicPhotoShell meta={meta} visualKey="standards" maxWidth={960} headerCta={{ label: ENQUIRY_RECOVERY_PRIMARY_CTA_LABEL, href: ENQUIRY_RECOVERY_DIAGNOSIS_HREF }}>
      <h1 style={{ margin: '16px 0 8px', fontSize: 'clamp(28px, 4.6vw, 38px)', letterSpacing: '-0.03em', lineHeight: 1.15, color: '#eef6ff' }}>Operational standards</h1>
      <p style={ts.lead}>
        This page describes the operational standards we apply to every CorpFlowAI engagement. It is not a contract — final terms are confirmed in the written offer, invoice, or service agreement.
      </p>

      <section style={ps.section}>
        <p style={ts.sectionLabel}>The four pillars</p>
        <h2 style={ps.h2}>How an engagement is run</h2>
        <div style={ts.pillarGrid}>
          {PILLARS.map((p) => (
            <div key={p.label} style={ts.card}>
              <h3 style={ts.cardTitle}>{p.label}</h3>
              <p style={ts.cardBody}>{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      <hr style={ts.divider} />

      <section style={ps.section}>
        <p style={ts.sectionLabel}>What &ldquo;done&rdquo; means</p>
        <h2 style={ps.h2}>Live verification, not just health checks</h2>
        <p style={ps.p}>
          A change is only operationally complete when the customer-facing surface is verified live in production. CI green and a successful deploy are necessary, but they are not sufficient on their own.
        </p>
        <ul style={ps.ul}>
          <li>The deployment id and exact commit deployed</li>
          <li>The live URLs and flows tested after deployment</li>
          <li>Expected versus actual behaviour</li>
          <li>A final verdict: complete, partial, or failed</li>
        </ul>
      </section>

      <hr style={ts.divider} />

      <section style={ps.section}>
        <p style={ts.sectionLabel}>Governance</p>
        <h2 style={ps.h2}>Visual assets and AI provenance</h2>
        <p style={ps.p}>
          Buyer-facing assets are governed so their source, accessibility metadata, and allowed surfaces are known. Machine-generated assets are reviewed before publication.
        </p>
      </section>

      <section style={ps.section}>
        <h2 style={ps.h2}>Security posture</h2>
        <ul style={ps.ul}>
          <li><strong style={{ color: '#dbe7f5' }}>Tenant isolation.</strong> Tenant data is isolated server-side and public marketing pages do not expose private client records.</li>
          <li><strong style={{ color: '#dbe7f5' }}>Diagnosis first, payment second.</strong> The public website does not capture card or banking details. Commercial terms are confirmed in writing before payment.</li>
          <li><strong style={{ color: '#dbe7f5' }}>Least access.</strong> We ask for the minimum access needed for the agreed scope.</li>
          <li><strong style={{ color: '#dbe7f5' }}>No card data on CorpFlowAI servers.</strong> Payment capture, when offered, happens off the public marketing surface.</li>
        </ul>
      </section>

      <section style={ps.section}>
        <div style={ts.ctaRow}>
          <Link href="/lead-rescue" style={ts.ctaPrimary}>{ENQUIRY_RECOVERY_PRIMARY_CTA_LABEL} &rarr;</Link>
          <Link href="/process" style={ts.ctaSecondary}>See the engagement process</Link>
          <Link href="/contact" style={ts.ctaSecondary}>Ask a question first</Link>
        </div>
      </section>
    </CorpFlowPublicPhotoShell>
  );
}
