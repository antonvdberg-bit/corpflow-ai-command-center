import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildTechnicalLeadSummaryFromGaps,
  evaluateTechnicalLeadChecklistV1,
} from '../lib/cmp/_lib/technical-lead-observer.js';

test('evaluateTechnicalLeadChecklistV1: clean ticket has no gaps', () => {
  const { gaps, summary } = evaluateTechnicalLeadChecklistV1({
    dispatch_ok: true,
    pr_number: 3,
    automation_branch_name: 'cmp/t1',
    expected_branch_name: 'cmp/t1',
    github: {
      configured: true,
      pr_state: 'open',
      pr_fetch: { ok: true, status: 200 },
      compare: {
        ok: true,
        total_commits: 2,
        files_changed: 4,
        commit_messages: ['feat: page', 'fix: typo'],
      },
      check_runs: { ok: true, failed: 0, pending: 0, count: 2 },
    },
    vercel: { skipped: true, reason: 'vercel_token_or_project_id_missing' },
    factory_health: { skipped: true },
  });
  assert.equal(gaps.length, 0);
  assert.match(summary, /No checklist gaps/);
});

test('evaluateTechnicalLeadChecklistV1: dispatch failure is error gap', () => {
  const { gaps } = evaluateTechnicalLeadChecklistV1({
    dispatch_ok: false,
    pr_number: null,
    github: { configured: false, hint: 'x' },
    vercel: { skipped: true, reason: 'vercel_token_or_project_id_missing' },
    factory_health: {},
  });
  assert.ok(gaps.some((g) => g.id === 'dispatch_succeeded'));
});

test('evaluateTechnicalLeadChecklistV1: sandbox-only compare is warning', () => {
  const { gaps } = evaluateTechnicalLeadChecklistV1({
    dispatch_ok: true,
    pr_number: 2,
    github: {
      configured: true,
      pr_state: 'open',
      pr_fetch: { ok: true, status: 200 },
      compare: {
        ok: true,
        total_commits: 1,
        files_changed: 0,
        commit_messages: ['chore(cmp): sandbox branch'],
      },
      check_runs: { ok: true, failed: 0, pending: 0, count: 0 },
    },
    vercel: { skipped: true, reason: 'vercel_token_or_project_id_missing' },
    factory_health: { skipped: true },
  });
  assert.ok(gaps.some((g) => g.id === 'meaningful_pr_diff'));
});

test('evaluateTechnicalLeadChecklistV1: Vercel ERROR is error gap', () => {
  const { gaps } = evaluateTechnicalLeadChecklistV1({
    dispatch_ok: true,
    pr_number: 1,
    github: {
      configured: true,
      pr_state: 'open',
      pr_fetch: { ok: true, status: 200 },
      compare: { ok: true, total_commits: 2, files_changed: 3, commit_messages: ['a', 'b'] },
      check_runs: { ok: true, failed: 0, pending: 0, count: 1 },
    },
    vercel: {
      skipped: false,
      fetch_ok: true,
      branch: 'cmp/t1',
      deployments_for_branch: 1,
      latest: { uid: 'd1', readyState: 'ERROR', url: 'https://x.vercel.app', createdAt: null, githubCommitSha: null },
    },
    factory_health: { skipped: true },
  });
  assert.ok(gaps.some((g) => g.id === 'vercel_deploy_failed'));
});

test('buildTechnicalLeadSummaryFromGaps matches evaluate output shape', () => {
  const ev = {
    dispatch_ok: true,
    pr_number: 9,
    github: { configured: true, pr_state: 'open', pr_fetch: { ok: true }, compare: { ok: true, total_commits: 1, files_changed: 2, commit_messages: ['x'] }, check_runs: { ok: true, failed: 0, pending: 0, count: 1 } },
    vercel: { skipped: true, reason: 'x' },
    factory_health: {},
  };
  const { gaps, summary } = evaluateTechnicalLeadChecklistV1(ev);
  const s2 = buildTechnicalLeadSummaryFromGaps(gaps, ev.dispatch_ok, ev.pr_number);
  assert.equal(s2, summary);
});

test('evaluateTechnicalLeadChecklistV1: Vercel API failure is warning', () => {
  const { gaps } = evaluateTechnicalLeadChecklistV1({
    dispatch_ok: true,
    pr_number: 2,
    github: {
      configured: true,
      pr_state: 'open',
      pr_fetch: { ok: true, status: 200 },
      compare: { ok: true, total_commits: 1, files_changed: 1, commit_messages: ['x'] },
      check_runs: { ok: true, failed: 0, pending: 0, count: 0 },
    },
    vercel: { skipped: false, fetch_ok: false, fetch_status: 403, deployments_for_branch: 0, latest: null },
    factory_health: { skipped: true },
  });
  assert.ok(gaps.some((g) => g.id === 'vercel_api'));
});
