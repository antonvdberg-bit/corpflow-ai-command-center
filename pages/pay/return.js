import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { PrismaClient } from '@prisma/client';

import { processMpgsBrowserReturn } from '../../lib/server/payments/mpgs-payment-api.js';

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #06111f 0%, #0b1f33 45%, #101827 100%)',
    color: '#eef6ff',
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
    padding: '48px 20px',
  },
  shell: { maxWidth: 720, margin: '0 auto' },
  h1: { fontSize: 32, margin: '0 0 12px' },
  p: { color: '#aebfd1', lineHeight: 1.7 },
  meta: { marginTop: 20, fontSize: 13, color: '#9fb2c8' },
  link: { color: '#7dd3fc' },
};

export default function PayReturnPage({ outcome }) {
  const verified = outcome?.verifiedPaid;
  const title = verified ? 'Payment verified — operator review pending' : 'Payment pending verification';

  return (
    <div style={styles.page}>
      <Head>
        <title>{title} · CorpFlowAI</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <main style={styles.shell}>
        <h1 style={styles.h1}>{title}</h1>
        <p style={styles.p}>
          {verified
            ? 'Thank you. Your payment was confirmed with our bank gateway server-side. CorpFlowAI will review the payment record and contact you about next steps. Setup work starts only after operator review — not from this browser page alone.'
            : 'We received your return from the payment page. Your payment is not marked complete from the browser redirect alone — we confirm status with the bank gateway server-side. If you completed payment, we will verify shortly.'}
        </p>
        {outcome?.attemptReference ? (
          <p style={styles.meta}>Reference: {outcome.attemptReference}</p>
        ) : null}
        <p style={styles.meta}>
          Questions:{' '}
          <a href="mailto:support@corpflowai.com" style={styles.link}>
            support@corpflowai.com
          </a>
          {' · '}
          <a href="tel:+23059014284" style={styles.link}>
            +230 5901 4284
          </a>
          .{' '}
          <Link href="/contact" style={styles.link}>
            Contact page
          </Link>
        </p>
      </main>
    </div>
  );
}

export async function getServerSideProps({ query }) {
  const attemptRef = String(query?.order_ref || query?.attempt_ref || query?.orderId || '').trim();
  const resultIndicator = query?.resultIndicator || query?.result_indicator || null;

  if (!attemptRef) {
    return {
      props: {
        outcome: {
          ok: false,
          error: 'missing_attempt_ref',
          verifiedPaid: false,
          attemptReference: null,
        },
      },
    };
  }

  const prisma = new PrismaClient();
  try {
    const outcome = await processMpgsBrowserReturn(prisma, { attemptRef, resultIndicator });
    return {
      props: {
        outcome: {
          ok: outcome.ok,
          verifiedPaid: Boolean(outcome.verifiedPaid),
          attemptReference: outcome.attemptReference || attemptRef,
          recordReference: outcome.recordReference || null,
          status: outcome.status || null,
          paidFromRedirectOnly: false,
        },
      },
    };
  } catch {
    return {
      props: {
        outcome: {
          ok: false,
          error: 'verification_error',
          verifiedPaid: false,
          attemptReference: attemptRef,
        },
      },
    };
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}
