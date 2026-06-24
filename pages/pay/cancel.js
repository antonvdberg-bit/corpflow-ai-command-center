import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { PrismaClient } from '@prisma/client';

import { processMpgsBrowserCancel } from '../../lib/server/payments/mpgs-payment-api.js';

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

export default function PayCancelPage({ outcome }) {
  return (
    <div style={styles.page}>
      <Head>
        <title>Payment not completed · CorpFlowAI</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <main style={styles.shell}>
        <h1 style={styles.h1}>Payment not completed</h1>
        <p style={styles.p}>
          You left the bank payment page before completing payment. No charge was verified on our side. If you still
          intend to pay, contact CorpFlowAI and we can re-issue a payment link from your approved invoice record.
        </p>
        {outcome?.attemptReference ? (
          <p style={styles.meta}>Reference: {outcome.attemptReference}</p>
        ) : null}
        <p style={styles.meta}>
          <Link href="/contact" style={styles.link}>
            Contact page
          </Link>
          {' · '}
          <a href="mailto:support@corpflowai.com" style={styles.link}>
            support@corpflowai.com
          </a>
        </p>
      </main>
    </div>
  );
}

export async function getServerSideProps({ query }) {
  const attemptRef = String(query?.order_ref || query?.attempt_ref || query?.orderId || '').trim();

  if (!attemptRef) {
    return { props: { outcome: { ok: false, attemptReference: null } } };
  }

  const prisma = new PrismaClient();
  try {
    const outcome = await processMpgsBrowserCancel(prisma, { attemptRef });
    return {
      props: {
        outcome: {
          ok: outcome.ok,
          attemptReference: outcome.attemptReference || attemptRef,
          cancelled: Boolean(outcome.cancelled),
        },
      },
    };
  } catch {
    return { props: { outcome: { ok: false, attemptReference: attemptRef } } };
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}
