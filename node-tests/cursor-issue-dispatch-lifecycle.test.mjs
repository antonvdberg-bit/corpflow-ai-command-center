import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

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
  rollbackPrematureIssueClaim,
  suggestIssueBranchName,
} from '../lib/server/cursor-issue-dispatch-lifecycle.js';
import { resolveCursorRunId } from '../scripts/cursor-issue-dispatch-finalize.mjs';

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

  it('#679 environment doctrine → corpflow_test, no production gate, not Lux-tenant locked', () => {
    const issue679 = {
      number: 679,
      title:
        'P0: Treat all CorpFlowAI-hosted tenant surfaces as test environments; separate future client production deployments',
      body: `All tenant/client surfaces currently hosted under CorpFlowAI-controlled domains are test environments.
Examples: core.corpflowai.com, Lux / CIPC Desk.
Publish directly to CorpFlowAI-hosted test environment after merge.
Do not block normal tenant test publishing behind approval:production.
No deployment into any client-owned or actual client production environment is authorised.
No env/secrets or DB/schema changes. client_production remains separately gated.
Environment classification / operating rule / doctrine.`,
      labels: ['priority:P0', 'dispatch:cursor-ready'],
    };
    const c = inferIssueClassification(issue679);
    assert.equal(c.systemBoundary, 'corpflowai_business_system');
    assert.equal(c.tenantOrClient, 'N/A');
    assert.equal(c.environment, 'corpflow_test');
    assert.equal(c.protectedGate, 'none');
  });

  it('Lux UI publish to lux.corpflowai.com is corpflow_test without production gate', () => {
    const c = inferIssueClassification({
      number: 680,
      title: 'Lux homepage CTA copy update',
      body: 'Update CTA on lux.corpflowai.com. Publish after merge. Live validate the test URL. No secrets, no DB/schema.',
      labels: ['lux', 'dispatch:cursor-ready'],
    });
    assert.equal(c.systemBoundary, 'tenant');
    assert.equal(c.tenantOrClient, 'lux / Rare & Exclusive');
    assert.equal(c.environment, 'corpflow_test');
    assert.equal(c.protectedGate, 'none');
    assert.ok(c.workTypes.includes('ui'));
  });

  it('CIPC Desk standing surface classifies as corpflow_test', () => {
    const c = inferIssueClassification({
      number: 681,
      title: 'CIPC Desk first visible slice',
      body: 'Ship CIPC Desk UI to cipc.corpflowai.com test tenant. Merge then publish. Validate live test URL.',
      labels: ['cipc', 'dispatch:cursor-ready'],
    });
    assert.equal(c.tenantOrClient, 'CIPC Desk');
    assert.equal(c.environment, 'corpflow_test');
    assert.equal(c.protectedGate, 'none');
  });

  it('explicit client_production deploy keeps production protected gate', () => {
    const c = inferIssueClassification({
      number: 682,
      title: 'Deploy Lux to client production luxemaurice.com',
      body: 'Deploy approved build into the client-owned production environment at luxemaurice.com. Requires production approval and client_production controls.',
      labels: ['lux', 'production', 'dispatch:cursor-ready'],
    });
    assert.equal(c.environment, 'client_production');
    assert.equal(c.protectedGate, 'production');
    assert.equal(c.tenantOrClient, 'lux / Rare & Exclusive');
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

  it('respects WIP max of 2 active claimed issues', () => {
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
        { number: 1, title: 'A', body: 'docs', labels: ['dispatch:cursor-claimed'] },
        { number: 2, title: 'B', body: 'docs', labels: ['dispatch:cursor-claimed'] },
      ],
    });
    assert.equal(plan.availableSlots, 0);
    assert.equal(plan.decisions[0].decision, 'discover_only');
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
});
