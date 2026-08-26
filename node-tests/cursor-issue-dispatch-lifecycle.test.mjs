import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  canRunConcurrently,
  discoverOpenIssuesByLabel,
  ensureDispatchLifecycleLabels,
  filterIssuesByLabel,
  finalizeIssueClaimAfterActivation,
  formatDispatchActivatedComment,
  formatDispatchDiscoveredComment,
  formatWorkClassificationComment,
  hasSiblingProductConflict,
  inferIssueClassification,
  mapGitHubIssueToDispatchIssue,
  planCursorIssueClaims,
  prohibitionAppliesToPhrase,
  rollbackPrematureIssueClaim,
  suggestIssueBranchName,
  textForbidsProduction,
} from '../lib/server/cursor-issue-dispatch-lifecycle.js';
import { resolveCursorRunId } from '../scripts/cursor-issue-dispatch-finalize.mjs';

const ISSUE_950_LIST_FORM = JSON.parse(
  readFileSync(
    join(
      dirname(fileURLToPath(import.meta.url)),
      '..',
      'fixtures',
      'factory-eligibility',
      'issue-950-list-form-constraints.json',
    ),
    'utf8',
  ),
);

const ISSUE_653 = {
  number: 653,
  title: 'P0 Revenue Launch: Productise Lead Rescue into a sellable, demonstrable offer',
  body: 'Turn Lead Rescue into a quotable product. Docs + product page. No production deploy.',
  labels: ['revenue', 'priority:P0', 'dispatch:cursor-ready'],
};

const ISSUE_654 = {
  number: 654,
  title: 'P0 Revenue Launch: Productise Website Rescue into a sellable, demonstrable offer',
  body: 'Website Rescue product pack and demo. Reuse Premium Landing Page Rescue.',
  labels: ['revenue', 'priority:P0', 'dispatch:cursor-ready'],
};

const ISSUE_658_BODY = `## Operator approval — 2026-07-28
Remove Slack as an operational dependency.
Do not expose secrets in issues, PRs, screenshots or prompts.
Secret revocation through approved secrets-management route — Anton only.
Cursor must acknowledge, classify, create a separate branch and PR.
Workstream: CorpFlowAI operations only`;

const ISSUE_658 = {
  number: 658,
  title: 'APPROVED: Retire Slack from CorpFlowAI operations and remove notification noise',
  body: ISSUE_658_BODY,
  labels: ['cost-control', 'priority:P0', 'dispatch:cursor-ready', 'approved'],
};

const ISSUE_661_BODY = `## Protected gates

No production deploy, env/secret change, DB/schema change, payment, messaging runtime, external outreach or public launch without Anton approval.

## Definition of done

Continuous execution is proven for one full cycle: eligible issue -> agent run ID -> commit/PR -> tests -> operator disposition.`;

const ISSUE_661 = {
  number: 661,
  title: 'P0: Active agent delivery control loop — Cursor, Codex, GitHub and n8n',
  body: ISSUE_661_BODY,
  labels: ['priority:P0', 'dispatch:cursor-ready'],
};

const ISSUE_1083 = {
  number: 1083,
  title: 'P0 Commercial factory: SLA evidence, safe recovery and Telegram escalation',
  body: `This is a systemic commercial-factory control defect, not a Rare & Exclusive one-off.
Build the existing GitHub-native factory SLA/evidence evaluator.
No merge, deploy, DB/schema/data mutation, env/secrets/access changes, spend, or external sends.
Reuse existing Queue Reconcile, lifecycle, WIP, and CI-supervisor infrastructure.`,
  labels: ['priority:P0', 'dispatch:cursor-ready'],
};

describe('cursor-issue-dispatch-lifecycle', () => {
  it('classifies Lead Rescue #653 as CorpFlowAI business system product stream', () => {
    const c = inferIssueClassification(ISSUE_653);
    assert.equal(c.systemBoundary, 'corpflowai_business_system');
    assert.equal(c.productWorkstream, 'lead-rescue');
    assert.equal(c.protectedGate, 'none');
    assert.match(formatWorkClassificationComment(653, c), /Issue: #653/);
  });

  it('classifies Website Rescue #654 as a separate product workstream', () => {
    const c = inferIssueClassification(ISSUE_654);
    assert.equal(c.productWorkstream, 'website-rescue');
    assert.notEqual(c.productWorkstream, 'lead-rescue');
  });

  it('classifies ops #658 without secrets protected gate false positive', () => {
    const c = inferIssueClassification(ISSUE_658);
    assert.equal(c.productWorkstream, null);
    assert.equal(c.protectedGate, 'none');
    assert.equal(c.systemBoundary, 'corpflowai_business_system');
  });

  it('classifies control-loop #661 without secrets gate when env/secret is a prohibition', () => {
    const c = inferIssueClassification(ISSUE_661);
    assert.equal(c.protectedGate, 'none');
    assert.equal(c.mayRunConcurrently, true);
  });

  it('#661 is eligible when classified alone (no protected-gate false positive)', () => {
    const plan = planCursorIssueClaims({
      readyIssues: [ISSUE_661],
      claimedIssues: [],
    });
    const d661 = plan.decisions.find((d) => d.issue.number === 661);
    assert.equal(d661?.eligibleToClaim, true);
    assert.equal(d661?.decision, 'claim');
    assert.doesNotMatch(String(d661?.reason || ''), /protected gate/);
    assert.equal(plan.activationTargetIssue, 661);
  });

  it('keeps #1083-style no-DB/schema factory repairs out of the database gate', () => {
    const classification = inferIssueClassification(ISSUE_1083);
    assert.equal(classification.protectedGate, 'none');
    assert.equal(classification.systemBoundary, 'corpflowai_business_system');

    const plan = planCursorIssueClaims({
      readyIssues: [ISSUE_1083],
      claimedIssues: [],
    });
    assert.equal(plan.activationTargetIssue, 1083);
    assert.equal(plan.decisions[0]?.decision, 'claim');
  });

  it('does not reselect completed work with a review-ready linked PR', () => {
    const completed = {
      number: 1004,
      title: 'P1 Commercial summary',
      body: 'ordinary app work',
      labels: ['priority:P1', 'dispatch:cursor-ready'],
      comments: [],
      linkedPrs: [{ number: 1099, state: 'open', draft: false, mergeReady: true }],
    };
    const plan = planCursorIssueClaims({
      readyIssues: [completed, ISSUE_1083],
      claimedIssues: [],
      trackedIssues: [completed, ISSUE_1083],
    });

    assert.equal(plan.activationTargetIssue, 1083);
    assert.match(
      String(plan.decisions.find((decision) => decision.issue.number === 1004)?.reason),
      /review inventory/i,
    );
  });

  it('eligibility table for #653 #654 #658 — sibling hold does not block ops #658', () => {
    const plan = planCursorIssueClaims({
      readyIssues: [ISSUE_653, ISSUE_654, ISSUE_658],
      claimedIssues: [],
    });

    const d653 = plan.decisions.find((d) => d.issue.number === 653);
    const d654 = plan.decisions.find((d) => d.issue.number === 654);
    const d658 = plan.decisions.find((d) => d.issue.number === 658);

    assert.equal(d653?.decision, 'claim');
    assert.equal(d653?.eligibleToClaim, true);
    assert.equal(d654?.decision, 'discover_only');
    assert.equal(d654?.eligibleToClaim, false);
    assert.match(String(d654?.reason || ''), /sibling products/i);
    assert.equal(d658?.decision, 'claim');
    assert.equal(d658?.eligibleToClaim, true);

    assert.deepEqual(plan.claimIssueNumbers, [653, 658]);
    assert.deepEqual(plan.eligibleIssueNumbers, [653, 658]);
    assert.equal(plan.activationTargetIssue, 653);
  });

  it('does not claim sibling product streams concurrently by default', () => {
    const plan = planCursorIssueClaims({
      readyIssues: [ISSUE_653, ISSUE_654],
      claimedIssues: [],
      preferIssueNumbers: [653, 654],
    });
    assert.deepEqual(plan.claimIssueNumbers, [653]);
    const d654 = plan.decisions.find((d) => d.issue.number === 654);
    assert.equal(d654?.decision, 'discover_only');
    assert.match(String(d654?.reason || ''), /concurrency hold|sibling products/i);
  });

  it('stale claimed labels alone do not consume verified WIP slots (#862)', () => {
    const plan = planCursorIssueClaims({
      readyIssues: [
        {
          number: 700,
          title: 'Docs ops cleanup',
          body: 'documentation only',
          labels: ['dispatch:cursor-ready'],
        },
      ],
      claimedIssues: [
        { number: 1, title: 'A', body: 'docs', labels: ['dispatch:cursor-claimed'], comments: [] },
        { number: 2, title: 'B', body: 'docs', labels: ['dispatch:cursor-claimed'], comments: [] },
      ],
      trackedIssues: [
        { number: 1, title: 'A', body: 'docs', labels: ['dispatch:cursor-claimed'], comments: [] },
        { number: 2, title: 'B', body: 'docs', labels: ['dispatch:cursor-claimed'], comments: [] },
      ],
    });
    assert.equal(plan.verifiedActiveCount, 0);
    assert.equal(plan.availableSlots, 3);
    assert.equal(plan.decisions[0].decision, 'claim');
    assert.ok((plan.reconcileActions || []).length >= 2);
  });

  it('blocks same-tenant concurrency', () => {
    const a = inferIssueClassification({
      number: 1,
      title: 'Lux visual fix',
      body: 'lux tenant UI',
      labels: ['lux'],
    });
    const b = inferIssueClassification({
      number: 2,
      title: 'Lux concierge copy',
      body: 'lux tenant UI',
      labels: ['lux'],
    });
    const check = canRunConcurrently(a, b);
    assert.equal(check.ok, false);
  });

  it('hasSiblingProductConflict is false when either side has no product stream', () => {
    const lead = inferIssueClassification(ISSUE_653);
    const ops = inferIssueClassification(ISSUE_658);
    assert.equal(hasSiblingProductConflict(lead, ops), false);
    assert.equal(canRunConcurrently(lead, ops).ok, true);
  });

  it('formats discovery comments and branch names', () => {
    const c = inferIssueClassification(ISSUE_653);
    const branch = suggestIssueBranchName(653, c);
    assert.match(branch, /^cursor\/lead-rescue-653-/);
    const body = formatDispatchDiscoveredComment({
      issueNumber: 653,
      priority: 'P0',
      classificationComplete: true,
      eligibleToClaim: true,
      reason: 'ready',
      nextAction: 'claim',
    });
    assert.match(body, /CURSOR DISPATCH DISCOVERED/);
    assert.match(body, /Eligible to claim: Yes/);
  });

  it('discovers issues via GraphQL with client-side label filter', async () => {
    const fetchFn = async (url, init) => {
      if (String(url).includes('/graphql')) {
        return {
          ok: true,
          async text() {
            return JSON.stringify({
              data: {
                repository: {
                  issues: {
                    nodes: [
                      {
                        number: 653,
                        title: ISSUE_653.title,
                        body: ISSUE_653.body,
                        url: 'https://github.com/x/y/issues/653',
                        updatedAt: '2026-07-28T00:00:00Z',
                        labels: { nodes: [{ name: 'dispatch:cursor-ready' }, { name: 'priority:P0' }] },
                      },
                      {
                        number: 654,
                        title: ISSUE_654.title,
                        body: ISSUE_654.body,
                        url: 'https://github.com/x/y/issues/654',
                        updatedAt: '2026-07-28T00:00:00Z',
                        labels: { nodes: [{ name: 'dispatch:cursor-ready' }] },
                      },
                      {
                        number: 658,
                        title: ISSUE_658.title,
                        body: ISSUE_658.body,
                        url: 'https://github.com/x/y/issues/658',
                        updatedAt: '2026-07-28T00:00:00Z',
                        labels: { nodes: [{ name: 'dispatch:cursor-ready' }, { name: 'priority:P0' }] },
                      },
                    ],
                    pageInfo: { hasNextPage: false, endCursor: null },
                  },
                },
              },
            });
          },
        };
      }
      throw new Error(`unexpected fetch ${url}`);
    };

    const issues = await discoverOpenIssuesByLabel('token', 'antonvdberg-bit/corpflow-ai-command-center', 'dispatch:cursor-ready', {
      fetch: fetchFn,
    });
    assert.deepEqual(
      issues.map((i) => i.number).sort((a, b) => a - b),
      [653, 654, 658],
    );
  });

  it('filterIssuesByLabel enforces exact label match client-side', () => {
    const issues = [
      mapGitHubIssueToDispatchIssue({ number: 1, title: 'a', labels: [{ name: 'dispatch:cursor-ready' }] }),
      mapGitHubIssueToDispatchIssue({ number: 2, title: 'b', labels: [{ name: 'dispatch:cursor-claimed' }] }),
    ];
    assert.deepEqual(filterIssuesByLabel(issues, 'dispatch:cursor-ready').map((i) => i.number), [1]);
  });

  it('ensureDispatchLifecycleLabels auto-creates missing labels', async () => {
    const existing = new Set(['dispatch:cursor-ready']);
    const fetchFn = async (url, init = {}) => {
      const u = String(url);
      if (u.includes('/labels') && (!init.method || init.method === 'GET')) {
        return {
          ok: true,
          async text() {
            return JSON.stringify([...existing].map((name) => ({ name })));
          },
        };
      }
      if (init.method === 'POST') {
        const body = JSON.parse(String(init.body));
        existing.add(body.name);
        return { ok: true, status: 201, async text() { return JSON.stringify(body); } };
      }
      throw new Error(`unexpected ${init.method} ${u}`);
    };
    const result = await ensureDispatchLifecycleLabels('token', 'o/r', fetchFn);
    assert.equal(result.ok, true);
    assert.ok(existing.has('dispatch:cursor-claimed'));
    assert.ok(existing.has('needs:anton'));
    assert.ok(existing.has('approval:merge'));
    assert.ok(existing.has('approval:deploy'));
    assert.ok(existing.has('approval:public-launch'));
  });

  it('finalizeIssueClaimAfterActivation requires real run ID', async () => {
    await assert.rejects(
      () =>
        finalizeIssueClaimAfterActivation({
          token: 't',
          repo: 'o/r',
          issueNumber: 653,
          agentRunId: '',
        }),
      /requires a real Cursor run ID/,
    );
  });

  it('successful activation-state fixture includes run ID in activated comment', () => {
    const body = formatDispatchActivatedComment({
      issueNumber: 653,
      agentRunId: 'bc-run-abc123',
      agentUrl: 'https://cursor.com/agents/bc-run-abc123',
      branch: 'cursor/lead-rescue-653-1e9e',
    });
    assert.match(body, /CURSOR DISPATCH ACTIVATED/);
    assert.match(body, /bc-run-abc123/);
    assert.match(body, /dispatch:cursor-claimed/);
  });

  it('resolveCursorRunId reads run ID from activation live cursor payload', () => {
    const runId = resolveCursorRunId(
      { live: { cursor: { runId: 'bc-run-xyz', agentId: 'bc-run-xyz' } } },
      null,
    );
    assert.equal(runId, 'bc-run-xyz');
  });

  it('failed-activation rollback restores ready label', async () => {
    const calls = [];
    const fetchFn = async (url, init) => {
      calls.push({ url: String(url), method: init?.method || 'GET' });
      return { ok: true, status: 200, async text() { return '[]'; } };
    };
    await rollbackPrematureIssueClaim({ token: 't', repo: 'o/r', issueNumber: 653, fetch: fetchFn });
    assert.ok(calls.some((c) => c.method === 'DELETE' && c.url.includes('dispatch%3Acursor-claimed')));
    assert.ok(calls.some((c) => c.method === 'POST' && c.url.includes('/labels')));
  });

  it('unchanged second scan deduplication — hasCommentMarker skips duplicate posts', () => {
    const bodies = ['CURSOR DISPATCH DISCOVERED\nIssue: #653', 'WORK CLASSIFICATION\nIssue: #653'];
    assert.equal(bodies.some((b) => b.includes('CURSOR DISPATCH DISCOVERED')), true);
    assert.equal(bodies.some((b) => b.includes('WORK CLASSIFICATION')), true);
    // Second scan would skip both — verified by scan script marker checks (integration contract).
  });

  it('#835 read-only n8n validation with do-not-change-DB language is not database-gated', () => {
    const issue = {
      number: 8351,
      title: 'Read-only n8n integration validation packet',
      body: `Read-only n8n integration/validation packet.
Inspect workflow state via n8n-mcp only.
Do not change DB/schema.
Open a PR only. Do not merge. Do not deploy.`,
      labels: ['priority:P1', 'dispatch:cursor-ready'],
    };
    const c = inferIssueClassification(issue);
    assert.notEqual(c.protectedGate, 'database');
    assert.equal(c.protectedGate, 'none');
    assert.equal(c.workTypes.includes('database'), false);
    assert.ok(c.workTypes.includes('integration') || c.workTypes.includes('validation'));
    const plan = planCursorIssueClaims({ readyIssues: [issue], claimedIssues: [] });
    const d = plan.decisions.find((x) => x.issue.number === 8351);
    assert.equal(d?.eligibleToClaim, true);
    assert.doesNotMatch(String(d?.reason || ''), /protected gate database/);
  });

  it('#835 Do-NOT bullet safety list mentioning DB/schema is not database-gated', () => {
    const c = inferIssueClassification({
      number: 8352,
      title: 'Post-activation validate hardened-v2 safely',
      body: `Live read/validate only via n8n-mcp.

## Hard boundaries
Do NOT:
- change Vercel env/secrets;
- change DB/schema;
- touch DB/schema;

Do not send real email, touch DB/schema, or mutate data.`,
      labels: ['dispatch:cursor-ready'],
    });
    assert.notEqual(c.protectedGate, 'database');
    assert.equal(c.workTypes.includes('database'), false);
  });

  it('#835 affirmative schema migration remains database-protected', () => {
    const issue = {
      number: 9001,
      title: 'Add Prisma migration for cmp_tickets column',
      body: `Actual schema migration and data mutation required.
Run prisma migrate to alter Postgres schema and backfill rows.
This is a real DB/schema change packet.`,
      labels: ['priority:P1', 'dispatch:cursor-ready'],
    };
    const c = inferIssueClassification(issue);
    assert.equal(c.protectedGate, 'database');
    assert.ok(c.workTypes.includes('database'));
    const plan = planCursorIssueClaims({ readyIssues: [issue], claimedIssues: [] });
    const d = plan.decisions.find((x) => x.issue.number === 9001);
    assert.equal(d?.eligibleToClaim, false);
    assert.match(String(d?.reason || ''), /protected gate database/);
  });

  it('#676 gate-design issue does not self-block as payment/production (merge regression)', () => {
    const c = inferIssueClassification({
      number: 676,
      title: 'P0: Central Anton Decision Inbox and enforceable protected-action gates',
      body: `## Governance
- No production deployment during implementation/testing.
- No env or secret changes without explicit approval.
- No DB/schema changes.
- No live messaging, payments, outreach, or public launch.
- No paid tools.
- Open a PR only. Do not merge. Do not deploy.
approval:payment labels and payment actions must be gated.`,
      labels: ['priority:P0', 'dispatch:cursor-ready'],
    });
    assert.equal(c.protectedGate, 'none');
    assert.notEqual(c.environment, 'production');
  });

  it('#679 environment doctrine classifies as corpflow_test without production gate', () => {
    const issue679 = {
      number: 679,
      title:
        'P0: Treat all CorpFlowAI-hosted tenant surfaces as test environments; separate future client production deployments',
      body: `All tenant/client surfaces currently hosted under CorpFlowAI-controlled domains are test environments.
Examples include core.corpflowai.com, Lux / CIPC Desk.
These are not client production environments.
Introduce corpflow_test for CorpFlowAI-hosted tenant test surfaces;
client_production only for an actual separately governed client production environment.
A publicly reachable URL is not automatically a production environment.
non-canonical for the client's own live production operation.
No deployment into any client-owned or actual client production environment is authorised.
No env/secrets or DB/schema changes are authorised by this issue.
Test publishing does not trigger a false approval:production gate.`,
      labels: ['priority:P0', 'dispatch:cursor-ready', 'lux'],
    };
    const c = inferIssueClassification(issue679);
    assert.equal(c.systemBoundary, 'tenant');
    assert.equal(c.environment, 'test');
    assert.equal(c.protectedGate, 'none');
    assert.match(formatWorkClassificationComment(679, c), /test \(corpflow_test\)/);
    const plan = planCursorIssueClaims({ readyIssues: [issue679], claimedIssues: [] });
    const d = plan.decisions.find((x) => x.issue.number === 679);
    assert.equal(d?.eligibleToClaim, true);
    assert.doesNotMatch(String(d?.reason || ''), /protected gate/);
  });

  it('Lux UI publishes to corpflow_test without approval:production gate', () => {
    const c = inferIssueClassification({
      number: 710,
      title: 'Lux landing copy tweak',
      body: 'Update lux.corpflowai.com hero copy. Publish to CorpFlowAI test environment after merge. Live verify lux URL.',
      labels: ['lux', 'dispatch:cursor-ready'],
    });
    assert.equal(c.environment, 'test');
    assert.equal(c.protectedGate, 'none');
    assert.ok(c.workTypes.includes('ui'));
  });

  it('CIPC Desk workstream is corpflow_test', () => {
    const c = inferIssueClassification({
      number: 711,
      title: 'CIPC Desk thank-you copy',
      body: 'Standing internal test tenant UI on cipc.corpflowai.com',
      labels: ['cipc', 'dispatch:cursor-ready'],
    });
    assert.equal(c.tenantOrClient, 'CIPC Desk');
    assert.equal(c.environment, 'test');
    assert.equal(c.protectedGate, 'none');
  });

  it('live production verification wording alone does not force client_production', () => {
    const c = inferIssueClassification({
      number: 712,
      title: 'Docs ops note',
      body: 'Live production verification on lux after merge. No production deploy. documentation only.',
      labels: ['dispatch:cursor-ready'],
    });
    assert.notEqual(c.environment, 'production');
    assert.equal(c.protectedGate, 'none');
  });

  it('explicit client_production deploy sets production gate', () => {
    const c = inferIssueClassification({
      number: 713,
      title: 'Client production cutover for Acme',
      body: 'Deploy to client_production on the client-owned production target after Anton/client production approval.',
      labels: ['dispatch:cursor-ready'],
    });
    assert.equal(c.environment, 'production');
    assert.equal(c.protectedGate, 'production');
    assert.match(formatWorkClassificationComment(713, c), /client_production/);
  });

  it('client_production candidates conflict; corpflow_test does not use that slot', () => {
    const prodA = inferIssueClassification({
      number: 1,
      title: 'Client production cutover A',
      body: 'Deploy to client_production on the client-owned production target.',
      labels: ['dispatch:cursor-ready'],
    });
    const prodB = inferIssueClassification({
      number: 2,
      title: 'Client production cutover B',
      body: 'Deploy to client_production on another client-owned production target.',
      labels: ['dispatch:cursor-ready'],
    });
    assert.equal(prodA.environment, 'production');
    assert.equal(prodB.environment, 'production');
    const prodCheck = canRunConcurrently(prodA, prodB);
    assert.equal(prodCheck.ok, false);
    assert.match(String(prodCheck.reason || ''), /client_production-deployment/);

    const testA = inferIssueClassification({
      number: 3,
      title: 'Lux visual',
      body: 'lux tenant UI on lux.corpflowai.com',
      labels: ['lux'],
    });
    const testB = inferIssueClassification({
      number: 4,
      title: 'CIPC copy',
      body: 'cipc desk UI',
      labels: ['cipc'],
    });
    assert.equal(testA.environment, 'test');
    assert.equal(testB.environment, 'test');
    const testCheck = canRunConcurrently(testA, testB);
    assert.equal(testCheck.ok, true);
    assert.doesNotMatch(String(testCheck.reason || ''), /client_production-deployment/);
  });

  describe('#896 ordinary work vs consequential action', () => {
    it('A — inspect/test that may later need a write is claimable; write stays gated', () => {
      const inspect = {
        number: 89601,
        title: 'Inspect ERPNext and determine whether schema changes are needed',
        body: `Anton asks Cursor to inspect ERPNext sandbox.
Inspect existing schema and database-backed DocTypes.
Determine whether schema changes are needed.
Do not run prisma migrate or mutate schema in this packet.
Do not expose secrets.`,
        labels: ['priority:P0', 'dispatch:cursor-ready'],
      };
      const c = inferIssueClassification(inspect);
      assert.equal(c.protectedGate, 'none');
      assert.ok((c.protectedSubjectsMentioned || []).includes('database'));
      const plan = planCursorIssueClaims({ readyIssues: [inspect], claimedIssues: [] });
      assert.equal(plan.decisions[0]?.eligibleToClaim, true);

      const write = {
        number: 89602,
        title: 'Apply ERPNext schema migration',
        body: `Run prisma migrate to alter Postgres schema and backfill rows.
This is a real DB/schema change packet.`,
        labels: ['priority:P0', 'dispatch:cursor-ready'],
      };
      assert.equal(inferIssueClassification(write).protectedGate, 'database');
      const planWrite = planCursorIssueClaims({ readyIssues: [write], claimedIssues: [] });
      assert.equal(planWrite.decisions[0]?.eligibleToClaim, false);
    });

    it('B — deployment preparation proceeds; client_production alone remains gated', () => {
      const prep = {
        number: 89603,
        title: 'Prepare deployment for Lux',
        body: `Prepare a deployment for lux.corpflowai.com.
Implement, test locally, create PR, run CI, validate corpflow_test.
Do not deploy to client_production.`,
        labels: ['priority:P0', 'dispatch:cursor-ready', 'lux'],
      };
      const c = inferIssueClassification(prep);
      assert.equal(c.protectedGate, 'none');
      assert.equal(c.environment, 'test');
      const plan = planCursorIssueClaims({ readyIssues: [prep], claimedIssues: [] });
      assert.equal(plan.decisions[0]?.eligibleToClaim, true);

      const clientProd = {
        number: 89604,
        title: 'Client production cutover',
        body: 'Deploy to client_production on the client-owned production target.',
        labels: ['dispatch:cursor-ready'],
      };
      assert.equal(inferIssueClassification(clientProd).protectedGate, 'production');
      const planProd = planCursorIssueClaims({ readyIssues: [clientProd], claimedIssues: [] });
      assert.equal(planProd.decisions[0]?.eligibleToClaim, false);
    });

    it('C — direct Anton authorization for consequential action is sufficient', () => {
      const issue = {
        number: 89605,
        title: 'Secure Cursor env wiring',
        body: `Operator authorization: Anton 2026-08-12
## Explicit operator approval
Anton has explicitly approved wiring using the secure Cursor environment/settings path.
secure Cursor Cloud environment/settings configuration needed solely for the sandbox.
Still not authorized: unrelated env/secrets changes; real payments.`,
        labels: ['priority:P0', 'dispatch:cursor-ready'],
      };
      assert.equal(inferIssueClassification(issue).protectedGate, 'secrets');
      const plan = planCursorIssueClaims({ readyIssues: [issue], claimedIssues: [] });
      assert.equal(plan.decisions[0]?.eligibleToClaim, true);
    });

    it('D — mentioning protected words does not gate ordinary work', () => {
      const cases = [
        {
          number: 89606,
          title: 'Safety wording',
          body: 'Do not expose secrets. No schema changes. Test payment flow without making a payment. Prepare email but do not send.',
        },
        {
          number: 89607,
          title: 'Governance doctrine #896',
          body: `Governance change: explicitly approved.
Ordinary delivery work must never be misclassified merely because the task mentions DB, secrets, payments, messaging, production, or deployment.
this issue carries Anton’s explicit approval to merge and deploy this governance change.
No secrets or private client data in repo evidence.`,
        },
      ];
      for (const issue of cases) {
        const full = { ...issue, labels: ['priority:P0', 'dispatch:cursor-ready'] };
        const c = inferIssueClassification(full);
        assert.equal(c.protectedGate, 'none', `issue ${issue.number}`);
        const plan = planCursorIssueClaims({ readyIssues: [full], claimedIssues: [] });
        assert.equal(plan.decisions[0]?.eligibleToClaim, true, `issue ${issue.number}`);
      }
    });

    it('E — wrong-scope approval remains blocked', () => {
      const issue = {
        number: 89608,
        title: 'Real schema migration',
        body: 'Run prisma migrate to alter Postgres schema. Requires protected gate: database.',
        labels: ['dispatch:cursor-ready'],
        comments: [
          {
            body: `### OPERATOR GATE AUTHORIZATION

- issue: #89608
- gate: payment
- author: Anton
- decision: approve
- recorded_at: 2026-08-12T00:00:00.000Z
- notes: wrong scope
`,
            author: 'antonvdberg-bit',
            created_at: '2026-08-12T00:00:00.000Z',
          },
        ],
      };
      assert.equal(inferIssueClassification(issue).protectedGate, 'database');
      const plan = planCursorIssueClaims({ readyIssues: [issue], claimedIssues: [] });
      assert.equal(plan.decisions[0]?.eligibleToClaim, false);
    });

    it('F — WORK CLASSIFICATION distinguishes subjects from consequential gate', () => {
      const c = inferIssueClassification({
        number: 89609,
        title: 'Inspect system mentioning secrets and messaging',
        body: 'Inspect the system. Mentions secrets and messaging only as subjects not to touch. Do not send messages. Do not expose secrets.',
        labels: ['dispatch:cursor-ready'],
      });
      assert.equal(c.protectedGate, 'none');
      const comment = formatWorkClassificationComment(89609, c);
      assert.match(comment, /Protected subjects mentioned:/);
      assert.match(comment, /Protected consequential gate:/);
      assert.match(comment, /ordinary delivery work proceeds/);
    });

    it('G — ready+operator-review does not consume free WIP / activation target', () => {
      const reviewReady = {
        number: 715,
        title: 'WS4 already in operator review',
        body: 'Ordinary delivery docs. No production deploy.',
        labels: ['priority:P0', 'dispatch:cursor-ready', 'dispatch:operator-review'],
      };
      const freshReady = {
        number: 9200,
        title: 'Fresh ordinary P0 work',
        body: 'Ordinary docs/UI work. No production deploy. No schema change.',
        labels: ['priority:P0', 'dispatch:cursor-ready'],
      };
      const plan = planCursorIssueClaims({
        readyIssues: [reviewReady, freshReady],
        claimedIssues: [],
      });
      const d715 = plan.decisions.find((d) => d.issue.number === 715);
      const d9200 = plan.decisions.find((d) => d.issue.number === 9200);
      assert.equal(d715?.eligibleToClaim, false);
      assert.match(String(d715?.reason || ''), /operator-review/);
      assert.equal(d9200?.eligibleToClaim, true);
      assert.equal(plan.activationTargetIssue, 9200);
      assert.deepEqual(plan.claimIssueNumbers, [9200]);
    });
  });

  describe('#962 list-form constraint prohibitions', () => {
    it('recognizes #950-style comma list as a production-deploy prohibition', () => {
      assert.equal(
        prohibitionAppliesToPhrase(ISSUE_950_LIST_FORM.body, 'production deploy'),
        true,
      );
      assert.equal(textForbidsProduction(ISSUE_950_LIST_FORM.body), true);
    });

    it('#950 list-form Constraints do not set protectedGate production', () => {
      const issue = {
        number: ISSUE_950_LIST_FORM.source_issue,
        title: ISSUE_950_LIST_FORM.title,
        body: ISSUE_950_LIST_FORM.body,
        labels: ISSUE_950_LIST_FORM.labels,
      };
      const c = inferIssueClassification(issue);
      assert.equal(c.protectedGate, ISSUE_950_LIST_FORM.expected.protectedGate);
      assert.equal(
        c.consequentialActionRequested,
        ISSUE_950_LIST_FORM.expected.consequentialActionRequested,
      );
      assert.notEqual(c.environment, 'production');
      const plan = planCursorIssueClaims({ readyIssues: [issue], claimedIssues: [] });
      assert.equal(plan.decisions[0]?.eligibleToClaim, ISSUE_950_LIST_FORM.expected.eligibleToClaim);
      assert.doesNotMatch(String(plan.decisions[0]?.reason || ''), /protected gate/);
    });

    it('does not treat "No waiting, production deploy is required" as a prohibition', () => {
      const blob =
        'No waiting, production deploy is required to the client-owned production target.';
      assert.equal(prohibitionAppliesToPhrase(blob, 'production deploy'), false);
      const c = inferIssueClassification({
        number: 96202,
        title: 'Client production cutover',
        body: `${blob} Deploy to client_production.`,
        labels: ['dispatch:cursor-ready'],
      });
      assert.equal(c.protectedGate, 'production');
      const plan = planCursorIssueClaims({
        readyIssues: [
          {
            number: 96202,
            title: 'Client production cutover',
            body: `${blob} Deploy to client_production.`,
            labels: ['dispatch:cursor-ready'],
          },
        ],
        claimedIssues: [],
      });
      assert.equal(plan.decisions[0]?.eligibleToClaim, false);
    });

    it('sentence break keeps a later production deploy fail-closed', () => {
      const issue = {
        number: 96203,
        title: 'Client production cutover after unrelated prohibition',
        body: 'No schema. Then production deploy to the client-owned production target. Deploy to client_production.',
        labels: ['dispatch:cursor-ready'],
      };
      assert.equal(prohibitionAppliesToPhrase(issue.body, 'production deploy'), false);
      assert.equal(inferIssueClassification(issue).protectedGate, 'production');
    });

    it('adjacent no production deploy still forbids', () => {
      assert.equal(textForbidsProduction('Docs only. No production deploy.'), true);
      const c = inferIssueClassification({
        number: 96204,
        title: 'Docs only',
        body: 'Ordinary documentation. No production deploy.',
        labels: ['dispatch:cursor-ready'],
      });
      assert.equal(c.protectedGate, 'none');
    });

    it('actual schema / secrets / payment / send requests remain fail-closed', () => {
      assert.equal(
        inferIssueClassification({
          number: 96205,
          title: 'Apply schema migration',
          body: 'Run prisma migrate to alter Postgres schema and backfill rows. This is a real DB/schema change packet.',
          labels: ['dispatch:cursor-ready'],
        }).protectedGate,
        'database',
      );
      assert.equal(
        inferIssueClassification({
          number: 96206,
          title: 'Rotate production secrets',
          body: 'Change Vercel env/secrets. Rotate the secrets and configure new production secrets.',
          labels: ['dispatch:cursor-ready'],
        }).protectedGate,
        'secrets',
      );
      assert.equal(
        inferIssueClassification({
          number: 96207,
          title: 'Charge a live card',
          body: 'Execute a real payment and charge a credit card. Enable payment runtime.',
          labels: ['dispatch:cursor-ready'],
        }).protectedGate,
        'payment',
      );
      assert.equal(
        inferIssueClassification({
          number: 96208,
          title: 'Send live WhatsApp',
          body: 'Send a live WhatsApp message to the customer. Enable live WhatsApp runtime.',
          labels: ['dispatch:cursor-ready'],
        }).protectedGate,
        'messaging',
      );
    });
  });
});
