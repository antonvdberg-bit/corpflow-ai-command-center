import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  DISPATCHER_DIGEST_STALE_HOURS,
  evaluateGithubHeartbeatSignals,
  filterHeartbeatAlertsByHourDedupe,
  shouldEmitDeliveryCheckpointAlert,
  shouldPageBusinessOpsFinding,
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
    // Heartbeat evaluator has no "published to lux/core" signal — only digest/WIP exceptions.
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

describe('ops-notification-policy / evaluateGithubHeartbeatSignals', () => {
  const now = Date.parse('2026-07-28T12:00:00.000Z');

  it('is silent on healthy state (no digest stale, WIP within cap)', () => {
    const result = evaluateGithubHeartbeatSignals({
      now,
      comments: [
        {
          body: '### Dispatcher Digest — fresh',
          created_at: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
        },
      ],
      prs: [{ number: 1, created_at: new Date(now - 8 * 60 * 60 * 1000).toISOString() }],
    });
    assert.equal(result.alert_count, 0);
    assert.equal(result.alerts.length, 0);
  });

  it('pages on stale dispatcher digest (exception)', () => {
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
    assert.equal(result.alert_count, 1);
    assert.equal(result.alerts[0].kind, 'digest_stale');
  });

  it('pages when open PR count exceeds WIP cap (exception)', () => {
    const result = evaluateGithubHeartbeatSignals({
      now,
      comments: [
        {
          body: '### Dispatcher Digest — fresh',
          created_at: new Date(now - 1 * 60 * 60 * 1000).toISOString(),
        },
      ],
      prs: [
        { number: 1, created_at: new Date(now - 1 * 60 * 60 * 1000).toISOString() },
        { number: 2, created_at: new Date(now - 2 * 60 * 60 * 1000).toISOString() },
        { number: 3, created_at: new Date(now - 3 * 60 * 60 * 1000).toISOString() },
      ],
    });
    assert.equal(result.alert_count, 1);
    assert.equal(result.alerts[0].kind, 'wip_cap');
  });

  it('does not page on open PR age alone (routine noise retired #658)', () => {
    const result = evaluateGithubHeartbeatSignals({
      now,
      comments: [
        {
          body: '### Dispatcher Digest — fresh',
          created_at: new Date(now - 1 * 60 * 60 * 1000).toISOString(),
        },
      ],
      prs: [
        { number: 42, created_at: new Date(now - 24 * 60 * 60 * 1000).toISOString() },
      ],
    });
    assert.equal(result.alert_count, 0);
    assert.ok(!result.all_signals.some((a) => a.kind === 'pr_ci_unsurfaced'));
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

describe('ops-notification-policy / filterHeartbeatAlertsByHourDedupe', () => {
  const now = Date.parse('2026-07-28T12:30:00.000Z');
  const alert = {
    kind: 'digest_stale',
    target: '#493',
    severity: 'error',
    why: 'stale',
    next: 'post digest',
    anton: false,
  };

  it('allows the first page in an hour bucket', () => {
    const first = filterHeartbeatAlertsByHourDedupe([alert], {}, now);
    assert.equal(first.alerts.length, 1);
    assert.equal(first.alerts[0].kind, 'digest_stale');
  });

  it('suppresses the same kind×target within the same hour (exactly-once)', () => {
    const first = filterHeartbeatAlertsByHourDedupe([alert], {}, now);
    const second = filterHeartbeatAlertsByHourDedupe([alert], first.seenKeys, now + 5 * 60 * 1000);
    assert.equal(second.alerts.length, 0);
  });

  it('allows a new page after the hour bucket rolls', () => {
    const first = filterHeartbeatAlertsByHourDedupe([alert], {}, now);
    const nextHour = filterHeartbeatAlertsByHourDedupe(
      [alert],
      first.seenKeys,
      now + 60 * 60 * 1000,
    );
    assert.equal(nextHour.alerts.length, 1);
  });
});
