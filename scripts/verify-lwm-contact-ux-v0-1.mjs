#!/usr/bin/env node
/**
 * Live verification helper — Living Word contact UX v0.1 full path + post-submit actions.
 */
import './bootstrap-repo-env.mjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BASE = 'https://living-word-mauritius.corpflowai.com';
const ORIGIN = BASE;
const H = { 'Content-Type': 'application/json', Origin: ORIGIN };

async function j(url, body) {
  const r = await fetch(url, { method: 'POST', headers: H, body: JSON.stringify(body) });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

async function step(threadId, payload) {
  return j(`${BASE}/api/chat-widget/step`, { thread_id: threadId, ...payload });
}

async function main() {
  await prisma.chatWidgetRateLimit.deleteMany({ where: { tenantId: 'living-word-mauritius' } });

  const start = await j(`${BASE}/api/chat-widget/start`, {
    source_host: 'living-word-mauritius.corpflowai.com',
    source_path: '/site-preview',
  });
  const tid = start.body.thread_id;
  const report = { ok: true, thread_id: tid, steps: [] };

  const walk = [
    { choice: 'contact-first-name', expect: 'contact-surname' },
  ];
  let s = await step(tid, { choice: 'contact-first-name' });
  report.steps.push({ op: 'choice contact-first-name', got: s.body.next?.id });

  s = await step(tid, { input: 'Sandbox' });
  report.steps.push({ op: 'first_name', got: s.body.next?.id, expect: 'contact-surname' });

  s = await step(tid, { input: 'ContactUX' });
  report.steps.push({ op: 'surname', got: s.body.next?.id, expect: 'contact-email' });

  s = await step(tid, { input: 'contact.ux.v01@corpflow-test.invalid' });
  report.steps.push({ op: 'email', got: s.body.next?.id, expect: 'contact-whatsapp' });

  s = await step(tid, { input: '+230 5000 0101' });
  report.steps.push({ op: 'whatsapp', got: s.body.next?.id, expect: 'contact-preferred-method' });

  s = await step(tid, { choice: 'contact-pref-whatsapp' });
  report.steps.push({ op: 'preferred whatsapp', got: s.body.next?.id });

  s = await step(tid, { next: 'contact-message' });
  report.steps.push({ op: 'continue to message', got: s.body.next?.id });

  s = await step(tid, { input: 'CorpFlow contact UX v0.1 safe test lead — safe to ignore.' });
  report.steps.push({
    op: 'message+submit',
    got: s.body.next?.id,
    submitted: s.body.submitted,
    completed: s.body.completed,
    prompt: (s.body.next?.prompt || '').slice(0, 80),
  });

  s = await step(tid, { choice: 'welcome' });
  report.steps.push({ op: 'back to menu', got: s.body.next?.id });

  const thread = await prisma.chatWidgetThread.findFirst({
    where: { id: tid, tenantId: 'living-word-mauritius' },
    select: {
      leadName: true,
      leadSurname: true,
      leadEmail: true,
      leadPhone: true,
      preferredContactMethod: true,
      leadMessage: true,
      status: true,
      currentNode: true,
    },
  });
  report.thread = thread;

  const evt = await prisma.automationEvent.findFirst({
    where: {
      tenantId: 'living-word-mauritius',
      idempotencyKey: `chat-widget-thread:${tid}`,
    },
    select: { id: true, payload: true },
  });
  report.event_id = evt?.id;
  report.event_lead = evt?.payload?.lead;

  const nonLwm = await prisma.chatWidgetThread.count({ where: { tenantId: { not: 'living-word-mauritius' } } });
  report.non_lwm_threads = nonLwm;

  const submitStep = report.steps.find((x) => x.op === 'message+submit');
  if (!submitStep || submitStep.got !== 'request-complete') report.ok = false;
  if (!report.event_lead?.whatsapp_or_mobile) report.ok = false;
  if (report.event_lead?.preferred_contact_method !== 'whatsapp') report.ok = false;

  console.log(JSON.stringify(report, null, 2));
  await prisma.$disconnect();
  process.exit(report.ok ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
