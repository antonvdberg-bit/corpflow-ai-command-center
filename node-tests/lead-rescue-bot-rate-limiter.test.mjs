import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import {
  __resetRateLimiterForTests,
  checkRateLimit,
  recordTurn,
} from '../lib/server/lead-rescue-bot/rate-limiter.js';

describe('lead-rescue-bot/rate-limiter — per-IP buckets', () => {
  beforeEach(() => {
    __resetRateLimiterForTests();
    process.env.CORPFLOW_LEAD_RESCUE_BOT_MAX_SESSIONS_PER_IP_PER_HOUR = '3';
    process.env.CORPFLOW_LEAD_RESCUE_BOT_MAX_TURNS_PER_SESSION = '5';
  });

  afterEach(() => {
    delete process.env.CORPFLOW_LEAD_RESCUE_BOT_MAX_SESSIONS_PER_IP_PER_HOUR;
    delete process.env.CORPFLOW_LEAD_RESCUE_BOT_MAX_TURNS_PER_SESSION;
  });

  it('allows the first turn of a brand-new IP/session', () => {
    const d = checkRateLimit({
      ip: '203.0.113.10',
      sessionId: 'sess-a-aaaaaaaa',
      isFirstTurn: true,
      nowMs: 1_000_000,
    });
    assert.equal(d.allowed, true);
    assert.equal(d.reason, 'ok');
    assert.equal(d.sessionsInLastHour, 0);
  });

  it('caps sessions per IP per hour', () => {
    const ip = '203.0.113.20';
    const now = 1_000_000;
    for (let i = 0; i < 3; i++) {
      const sid = `sess-cap-${i}-xxxxxxx`;
      const d = checkRateLimit({ ip, sessionId: sid, isFirstTurn: true, nowMs: now });
      assert.equal(d.allowed, true, `expected session ${i} to be allowed`);
      recordTurn({ ip, sessionId: sid, isFirstTurn: true, nowMs: now });
    }
    const fourth = checkRateLimit({
      ip,
      sessionId: 'sess-cap-4-xxxxxxxx',
      isFirstTurn: true,
      nowMs: now,
    });
    assert.equal(fourth.allowed, false);
    assert.equal(fourth.reason, 'sessions_per_ip_per_hour');
  });

  it('caps turns per session', () => {
    const ip = '203.0.113.30';
    const sid = 'sess-turns-xxxxxxx';
    const now = 1_000_000;
    {
      const d = checkRateLimit({ ip, sessionId: sid, isFirstTurn: true, nowMs: now });
      assert.equal(d.allowed, true);
      recordTurn({ ip, sessionId: sid, isFirstTurn: true, nowMs: now });
    }
    for (let i = 1; i < 5; i++) {
      const d = checkRateLimit({ ip, sessionId: sid, isFirstTurn: false, nowMs: now + i });
      assert.equal(d.allowed, true, `expected turn ${i} to be allowed`);
      recordTurn({ ip, sessionId: sid, isFirstTurn: false, nowMs: now + i });
    }
    const sixth = checkRateLimit({
      ip,
      sessionId: sid,
      isFirstTurn: false,
      nowMs: now + 6,
    });
    assert.equal(sixth.allowed, false);
    assert.equal(sixth.reason, 'turns_per_session');
  });

  it('forgets sessions older than 1 hour', () => {
    const ip = '203.0.113.40';
    const sid1 = 'sess-old-aaaaaaa';
    const t0 = 1_000_000;
    {
      const d = checkRateLimit({ ip, sessionId: sid1, isFirstTurn: true, nowMs: t0 });
      assert.equal(d.allowed, true);
      recordTurn({ ip, sessionId: sid1, isFirstTurn: true, nowMs: t0 });
    }
    {
      const d = checkRateLimit({
        ip,
        sessionId: 'sess-old-bbbbbbb',
        isFirstTurn: true,
        nowMs: t0,
      });
      assert.equal(d.allowed, true);
      recordTurn({ ip, sessionId: 'sess-old-bbbbbbb', isFirstTurn: true, nowMs: t0 });
    }
    {
      const d = checkRateLimit({
        ip,
        sessionId: 'sess-old-ccccccc',
        isFirstTurn: true,
        nowMs: t0,
      });
      assert.equal(d.allowed, true);
      recordTurn({ ip, sessionId: 'sess-old-ccccccc', isFirstTurn: true, nowMs: t0 });
    }
    const stillBlocked = checkRateLimit({
      ip,
      sessionId: 'sess-old-dddddddd',
      isFirstTurn: true,
      nowMs: t0 + 30 * 60 * 1000,
    });
    assert.equal(stillBlocked.allowed, false);
    const oneHourLater = checkRateLimit({
      ip,
      sessionId: 'sess-old-eeeeeeee',
      isFirstTurn: true,
      nowMs: t0 + 61 * 60 * 1000,
    });
    assert.equal(oneHourLater.allowed, true);
  });

  it('separates buckets between IPs', () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 3; i++) {
      const sid = `sess-ip1-${i}-xxxxxx`;
      recordTurn({ ip: '203.0.113.50', sessionId: sid, isFirstTurn: true, nowMs: t0 });
    }
    const ip1 = checkRateLimit({
      ip: '203.0.113.50',
      sessionId: 'sess-ip1-new-xxx',
      isFirstTurn: true,
      nowMs: t0,
    });
    assert.equal(ip1.allowed, false);
    const ip2 = checkRateLimit({
      ip: '203.0.113.51',
      sessionId: 'sess-ip2-new-xxx',
      isFirstTurn: true,
      nowMs: t0,
    });
    assert.equal(ip2.allowed, true);
  });
});
