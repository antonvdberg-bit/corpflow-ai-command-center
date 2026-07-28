import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  canRunConcurrently,
  formatDispatchDiscoveredComment,
  formatWorkClassificationComment,
  inferIssueClassification,
  planCursorIssueClaims,
  suggestIssueBranchName,
} from '../lib/server/cursor-issue-dispatch-lifecycle.js';

describe('cursor-issue-dispatch-lifecycle', () => {
  it('classifies Lead Rescue #653 as CorpFlowAI business system product stream', () => {
    const c = inferIssueClassification({
      number: 653,
      title: 'P0 Revenue Launch: Productise Lead Rescue into a sellable, demonstrable offer',
      body: 'Turn Lead Rescue into a quotable product. Docs + product page. No production deploy.',
      labels: ['revenue', 'priority:P0', 'dispatch:cursor-ready'],
    });
    assert.equal(c.systemBoundary, 'corpflowai_business_system');
    assert.equal(c.productWorkstream, 'lead-rescue');
    assert.equal(c.protectedGate, 'none');
    assert.equal(c.separateBranchRequired, true);
    assert.match(formatWorkClassificationComment(653, c), /Issue: #653/);
  });

  it('classifies Website Rescue #654 as a separate product workstream', () => {
    const c = inferIssueClassification({
      number: 654,
      title: 'P0 Revenue Launch: Productise Website Rescue into a sellable, demonstrable offer',
      body: 'Website Rescue product pack and demo. Reuse Premium Landing Page Rescue.',
      labels: ['revenue', 'priority:P0', 'dispatch:cursor-ready'],
    });
    assert.equal(c.productWorkstream, 'website-rescue');
    assert.notEqual(c.productWorkstream, 'lead-rescue');
  });

  it('does not claim sibling product streams concurrently by default', () => {
    const plan = planCursorIssueClaims({
      readyIssues: [
        {
          number: 653,
          title: 'Productise Lead Rescue',
          body: 'Lead Rescue sellable pack',
          labels: ['dispatch:cursor-ready', 'priority:P0'],
        },
        {
          number: 654,
          title: 'Productise Website Rescue',
          body: 'Website Rescue sellable pack',
          labels: ['dispatch:cursor-ready', 'priority:P0'],
        },
      ],
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

  it('formats discovery comments and branch names', () => {
    const c = inferIssueClassification({
      number: 653,
      title: 'Lead Rescue',
      body: 'Lead Rescue product',
      labels: [],
    });
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
});
