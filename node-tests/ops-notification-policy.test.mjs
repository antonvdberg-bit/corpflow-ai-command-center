import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  DISPATCHER_DIGEST_STALE_HOURS,
  OPEN_PR_WIP_CAP,
  buildHeartbeatAlertFingerprint,
  evaluateGithubHeartbeatSignals,
  filterHeartbeatAlertsByFingerprintDedupe,
  filterHeartbeatAlertsByHourDedupe,
  shouldEmitDeliveryCheckpointAlert,
  shouldPageBusinessOpsFinding,
  shouldPageHeartbeatAlert,
} from '../lib/server/ops-notification-policy.js';

describe('ops-notification-policy / shouldEmitDeliveryCheckpointAlert', () => {
  it('fires on first blocked verdict', () => {
    assert.equal(
      shouldEmitDeliveryCheckpointAlert({
        prevVerdict: null,
        deliveryVerdict: { ok: false, needs_attention: false },
      }),
      true,
    );
  });

  it('fires when verdict newly becomes blocked', () => {
    assert.equal(
      shouldEmitDeliveryCheckpointAlert({
        prevVerdict: { ok: true, needs_attention: false },
        deliveryVerdict: { ok: false, needs_attention: false },
      }),
      true,
    );
  });

  it('fires when needs_attention newly becomes true', () => {
    assert.equal(
      shouldEmitDeliveryCheckpointAlert({
        prevVerdict: { ok: false, needs_attention: false },
        deliveryVerdict: { ok: false, needs_attention: true },
      }),
      true,
    );
  });

  it('is silent when blocked state is unchanged', () => {
    assert.equal(
      shouldEmitDeliveryCheckpointAlert({
        prevVerdict: { ok: false, needs_attention: true },
        deliveryVerdict: { ok: false, needs_attention: true },
      }),
      false,
    );
  });

  it('is silent when delivery stays healthy', () => {
    assert.equal(
      shouldEmitDeliveryCheckpointAlert({
        prevVerdict: { ok: true, needs_attention: false },
        deliveryVerdict: { ok: true, needs_attention: false },
      }),
      false,
    );
  });

  it('does not invent alerts merely because corpflow_test publish succeeded (#679)', () => {
    const now = Date.parse('2026-07-29T12:00:00.000Z');
    const result = evaluateGithubHeartbeatSignals({
      now,
      comments: [
        {
          body: '### Dispatcher Digest — corpflow_test publish validated on lux.corpflowai.com',
          created_at: new Date(now - 1 * 60 * 60 * 1000).toISOString(),
        },
      ],
      prs: [{ number: 1, created_at: new Date(now - 2 * 60 * 60 * 1000).toISOString() }],
    });
    assert.equal(result.alert_count, 0);
  });
});

describe('ops-notification-policy / #684 exception-only synthetic matrix', () => {
  const now = Date.parse('2026-07-30T12:00:00.000Z');
  const freshDigest = [
    {
      body: '### Dispatcher Digest — fresh',
      created_at: new Date(now - 1 * 60 * 60 * 1000).toISOString(),
    },
  ];

  it('1. open PR only → no Telegram', () => {
    const result = evaluateGithubHeartbeatSignals({
      now,
      comments: freshDigest,
      prs: [{ number: 42, created_at: new Date(now - 2 * 60 * 60 * 1000).toISOString() }],
    });
    assert.equal(result.alert_count, 0);
    assert.ok(result.all_signals.some((a) => a.kind === 'open_pr_observed'));
  });

  it('2. green CI / healthy state → no Telegram', () => {
    const result = evaluateGithubHeartbeatSignals({
      now,
      comments: freshDigest,
      prs: [{ number: 7, created_at: new Date(now - 1 * 60 * 60 * 1000).toISOString() }],
      decisionInboxItems: [],
      recoveryEvents: [],
    });
    assert.equal(result.alert_count, 0);
  });

  it('3. needs:anton protected approval → one immediate Telegram', () => {
    const result = evaluateGithubHeartbeatSignals({
      now,
      comments: freshDigest,
      prs: [],
      decisionInboxItems: [
        {
          number: 684,
          labels: ['needs:anton', 'approval:merge'],
          html_url: 'https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/684',
          workstream: 'ops / notifier',
          approval_type: 'approval:merge',
          target_sha: 'abc123',
          why: 'protected merge decision required',
          exact_action: 'Post ANTON DURABLE APPROVAL for merge',
          recommendation: 'approve after reviewing PR',
          consequence: 'exception notifier stays on old WIP rules',
          has_decision_packet: true,
        },
      ],
    });
    assert.equal(result.alert_count, 1);
    assert.equal(result.alerts[0].kind, 'needs_anton');
    assert.equal(result.alerts[0].anton, true);
    assert.equal(shouldPageHeartbeatAlert(result.alerts[0]), true);
  });

  it('4. same unchanged condition one hour later → no repeat', () => {
    const item = {
      number: 684,
      labels: ['needs:anton', 'approval:merge'],
      target_sha: 'abc123',
      has_decision_packet: true,
      why: 'protected merge decision required',
      exact_action: 'approve merge',
      recommendation: 'approve',
      consequence: 'blocked',
      workstream: 'ops',
      html_url: 'https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/684',
    };
    const first = evaluateGithubHeartbeatSignals({
      now,
      comments: freshDigest,
      decisionInboxItems: [item],
    });
    const deduped = filterHeartbeatAlertsByFingerprintDedupe(first.alerts, {}, now);
    assert.equal(deduped.alerts.length, 1);
    const oneHourLater = filterHeartbeatAlertsByFingerprintDedupe(
      first.alerts,
      deduped.seenKeys,
      now + 60 * 60 * 1000,
    );
    assert.equal(oneHourLater.alerts.length, 0);
  });

  it('5. changed SHA or new decision → one new alert', () => {
    const base = {
      number: 684,
      labels: ['needs:anton', 'approval:merge'],
      target_sha: 'abc123',
      has_decision_packet: true,
      why: 'protected merge decision required',
      exact_action: 'approve merge',
      recommendation: 'approve',
      consequence: 'blocked',
      workstream: 'ops',
      html_url: 'https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/684',
    };
    const firstEval = evaluateGithubHeartbeatSignals({
      now,
      comments: freshDigest,
      decisionInboxItems: [base],
    });
    const afterFirst = filterHeartbeatAlertsByFingerprintDedupe(firstEval.alerts, {}, now);
    const changed = evaluateGithubHeartbeatSignals({
      now: now + 60 * 60 * 1000,
      comments: freshDigest,
      decisionInboxItems: [{ ...base, target_sha: 'def456' }],
    });
    const afterChange = filterHeartbeatAlertsByFingerprintDedupe(
      changed.alerts,
      afterFirst.seenKeys,
      now + 60 * 60 * 1000,
    );
    assert.equal(afterChange.alerts.length, 1);
    assert.notEqual(
      buildHeartbeatAlertFingerprint(firstEval.alerts[0]),
      buildHeartbeatAlertFingerprint(changed.alerts[0]),
    );
  });

  it('6. recoverable failure → autonomous recovery, no alert', () => {
    const result = evaluateGithubHeartbeatSignals({
      now,
      comments: freshDigest,
      recoveryEvents: [
        {
          issueOrPr: '#661',
          recoverable: true,
          recovered: true,
          antonRequired: false,
          why: 'CI flake; auto-retried',
          evidence: 'retry:2',
        },
      ],
    });
    assert.equal(result.alert_count, 0);
    assert.ok(result.all_signals.some((a) => a.kind === 'recoverable_failure' && a.anton === false));
  });

  it('7. failed recovery requiring Anton → one alert', () => {
    const result = evaluateGithubHeartbeatSignals({
      now,
      comments: freshDigest,
      recoveryEvents: [
        {
          issueOrPr: '#661',
          recoverable: false,
          recovered: false,
          antonRequired: true,
          why: 'autonomous recovery exhausted',
          exact_action: 'Inspect failed supervisor run and decide',
          recommendation: 'approve repair path or re-scope',
          consequence: 'CI repair remains stuck',
          workstream: 'ops / dispatcher',
          link: 'https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/661',
          evidence: 'recovery:failed:sha999',
          decisionType: 'recovery_failed',
        },
      ],
    });
    assert.equal(result.alert_count, 1);
    assert.equal(result.alerts[0].kind, 'recovery_failed_needs_anton');
    assert.equal(result.alerts[0].anton, true);
  });

  it('does not page on WIP cap alone (#684)', () => {
    const result = evaluateGithubHeartbeatSignals({
      now,
      comments: freshDigest,
      prs: Array.from({ length: OPEN_PR_WIP_CAP + 2 }, (_, i) => ({
        number: i + 1,
        created_at: new Date(now - (i + 1) * 60 * 60 * 1000).toISOString(),
      })),
    });
    assert.equal(result.alert_count, 0);
    assert.ok(result.all_signals.some((a) => a.kind === 'wip_cap' && a.anton === false));
  });

  it('does not page on stale digest alone (#684 Anton-required gate)', () => {
    const result = evaluateGithubHeartbeatSignals({
      now,
      comments: [
        {
          body: '### Dispatcher Digest — old',
          created_at: new Date(
            now - (DISPATCHER_DIGEST_STALE_HOURS + 1) * 60 * 60 * 1000,
          ).toISOString(),
        },
      ],
      prs: [],
    });
    assert.equal(result.alert_count, 0);
    assert.ok(result.all_signals.some((a) => a.kind === 'digest_stale' && a.anton === false));
  });
});

describe('ops-notification-policy / shouldPageBusinessOpsFinding', () => {
  it('pages urgent findings only', () => {
    assert.equal(shouldPageBusinessOpsFinding({ severity: 'urgent', safeToIgnore: false }), true);
    assert.equal(
      shouldPageBusinessOpsFinding({ severity: 'warning', antonNeeded: true, safeToIgnore: false }),
      false,
    );
    assert.equal(shouldPageBusinessOpsFinding({ severity: 'urgent', safeToIgnore: true }), false);
  });
});

describe('ops-notification-policy / fingerprint dedupe (#684)', () => {
  const now = Date.parse('2026-07-30T12:30:00.000Z');
  const alert = {
    kind: 'needs_anton',
    target: '#684',
    severity: 'error',
    why: 'approval needed',
    next: 'approve',
    anton: true,
    decisionType: 'approval:merge',
    evidence: 'sha:abc',
    blockerState: 'needs_anton',
  };

  it('allows the first page for a fingerprint', () => {
    const first = filterHeartbeatAlertsByFingerprintDedupe([alert], {}, now);
    assert.equal(first.alerts.length, 1);
  });

  it('suppresses the same fingerprint within the same hour', () => {
    const first = filterHeartbeatAlertsByFingerprintDedupe([alert], {}, now);
    const second = filterHeartbeatAlertsByFingerprintDedupe(
      [alert],
      first.seenKeys,
      now + 5 * 60 * 1000,
    );
    assert.equal(second.alerts.length, 0);
  });

  it('still suppresses after the hour bucket rolls (no hourly repeat)', () => {
    const first = filterHeartbeatAlertsByFingerprintDedupe([alert], {}, now);
    const nextHour = filterHeartbeatAlertsByFingerprintDedupe(
      [alert],
      first.seenKeys,
      now + 60 * 60 * 1000,
    );
    assert.equal(nextHour.alerts.length, 0);
  });

  it('legacy hour-dedupe export uses fingerprint behaviour', () => {
    const first = filterHeartbeatAlertsByHourDedupe([alert], {}, now);
    const nextHour = filterHeartbeatAlertsByHourDedupe(
      [alert],
      first.seenKeys,
      now + 60 * 60 * 1000,
    );
    assert.equal(nextHour.alerts.length, 0);
  });

  it('ignores anton:false alerts even if present', () => {
    const noisy = { ...alert, anton: false, kind: 'wip_cap' };
    const out = filterHeartbeatAlertsByFingerprintDedupe([noisy], {}, now);
    assert.equal(out.alerts.length, 0);
  });
});
