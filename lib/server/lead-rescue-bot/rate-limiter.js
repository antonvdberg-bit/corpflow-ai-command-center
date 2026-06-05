/**
 * AI Lead Rescue assistant — per-IP rate limiter (in-memory, best-effort).
 *
 * Layer 3 of the six-layer guardrail floor mandated by
 * `docs/strategy/AI_LEAD_RESCUE_CHATBOT_VOICEBOT_OPTIONS_AUDIT_V1.md` § 5 Q14.
 *
 * Posture:
 * - Defends against accidental + casual abuse (form spammers, naive scripts).
 *   A determined abuser can rotate IPs; that's why the real cost ceiling is the
 *   OpenAI Platform usage alert at $20 / mo (operator-set by Anton on Day 1).
 * - In-memory (Map) is best-effort on Vercel serverless — different invocations
 *   may land on different instances. v1 accepts this; v2 can move to Postgres
 *   if abuse patterns warrant.
 * - Hard cap envs (defaults from audit § 8):
 *     CORPFLOW_LEAD_RESCUE_BOT_MAX_TURNS_PER_SESSION       (default 30)
 *     CORPFLOW_LEAD_RESCUE_BOT_MAX_SESSIONS_PER_IP_PER_HOUR (default 6)
 *
 * The handler also enforces a per-turn input length cap (1000 chars) — see
 * `./handler.js`.
 */

import { cfg } from '../runtime-config.js';

const ONE_HOUR_MS = 60 * 60 * 1000;

/**
 * @typedef {Object} IpBucket
 * @property {number[]} sessionStartTimestamps   — ms epoch when this IP opened a session
 * @property {Map<string, number>} sessionTurnCounts  — sessionId → turn count
 */

/** @type {Map<string, IpBucket>} */
const ipBuckets = new Map();

/**
 * Last clean-up sweep. We sweep at most every 5 minutes when any limiter call
 * happens, to avoid the Map growing unbounded on a long-lived Lambda.
 */
let lastSweepAt = 0;
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;

/** @returns {number} */
function maxSessionsPerIpPerHour() {
  const raw = String(cfg('CORPFLOW_LEAD_RESCUE_BOT_MAX_SESSIONS_PER_IP_PER_HOUR', '') || '').trim();
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 6;
}

/** @returns {number} */
function maxTurnsPerSession() {
  const raw = String(cfg('CORPFLOW_LEAD_RESCUE_BOT_MAX_TURNS_PER_SESSION', '') || '').trim();
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 30;
}

/**
 * @param {number} now
 * @returns {void}
 */
function maybeSweep(now) {
  if (now - lastSweepAt < SWEEP_INTERVAL_MS) return;
  lastSweepAt = now;
  for (const [ip, bucket] of ipBuckets.entries()) {
    bucket.sessionStartTimestamps = bucket.sessionStartTimestamps.filter(
      (t) => now - t < ONE_HOUR_MS,
    );
    if (
      bucket.sessionStartTimestamps.length === 0 &&
      bucket.sessionTurnCounts.size === 0
    ) {
      ipBuckets.delete(ip);
    }
  }
}

/**
 * @param {string} ip
 * @returns {IpBucket}
 */
function getBucket(ip) {
  let b = ipBuckets.get(ip);
  if (!b) {
    b = { sessionStartTimestamps: [], sessionTurnCounts: new Map() };
    ipBuckets.set(ip, b);
  }
  return b;
}

/**
 * @typedef {Object} RateLimitDecision
 * @property {boolean} allowed
 * @property {'ok' | 'sessions_per_ip_per_hour' | 'turns_per_session'} reason
 * @property {number} sessionsInLastHour
 * @property {number} turnsInSession
 * @property {number} sessionsLimit
 * @property {number} turnsLimit
 */

/**
 * Decide whether to allow a new turn for (ip, sessionId). Idempotent on read —
 * the count is INCREMENTED only by `recordTurn` (call this AFTER an allowed
 * decision actually goes through).
 *
 * @param {Object} args
 * @param {string} args.ip          — caller IP (already normalised)
 * @param {string} args.sessionId   — opaque per-tab session id
 * @param {boolean} args.isFirstTurn — true if this is the first turn of the session (open chat)
 * @param {number} [args.nowMs]     — for tests; defaults to Date.now()
 * @returns {RateLimitDecision}
 */
export function checkRateLimit({ ip, sessionId, isFirstTurn, nowMs }) {
  const now = typeof nowMs === 'number' ? nowMs : Date.now();
  maybeSweep(now);

  const sessionsLimit = maxSessionsPerIpPerHour();
  const turnsLimit = maxTurnsPerSession();

  const bucket = getBucket(String(ip || 'unknown'));

  // Prune stale session starts (older than 1h) before counting.
  bucket.sessionStartTimestamps = bucket.sessionStartTimestamps.filter(
    (t) => now - t < ONE_HOUR_MS,
  );

  const sessionsInLastHour = bucket.sessionStartTimestamps.length;
  const turnsInSession = bucket.sessionTurnCounts.get(String(sessionId)) || 0;

  if (isFirstTurn && sessionsInLastHour >= sessionsLimit) {
    return {
      allowed: false,
      reason: 'sessions_per_ip_per_hour',
      sessionsInLastHour,
      turnsInSession,
      sessionsLimit,
      turnsLimit,
    };
  }

  if (!isFirstTurn && turnsInSession >= turnsLimit) {
    return {
      allowed: false,
      reason: 'turns_per_session',
      sessionsInLastHour,
      turnsInSession,
      sessionsLimit,
      turnsLimit,
    };
  }

  return {
    allowed: true,
    reason: 'ok',
    sessionsInLastHour,
    turnsInSession,
    sessionsLimit,
    turnsLimit,
  };
}

/**
 * Record that a turn actually went through (after `checkRateLimit` returned
 * `allowed: true`). Increments the session-turn counter and, if this was the
 * first turn, records the session-start timestamp for the per-hour cap.
 *
 * @param {Object} args
 * @param {string} args.ip
 * @param {string} args.sessionId
 * @param {boolean} args.isFirstTurn
 * @param {number} [args.nowMs]
 * @returns {void}
 */
export function recordTurn({ ip, sessionId, isFirstTurn, nowMs }) {
  const now = typeof nowMs === 'number' ? nowMs : Date.now();
  const bucket = getBucket(String(ip || 'unknown'));
  const sid = String(sessionId);
  if (isFirstTurn) {
    bucket.sessionStartTimestamps.push(now);
  }
  bucket.sessionTurnCounts.set(sid, (bucket.sessionTurnCounts.get(sid) || 0) + 1);
}

/**
 * @internal — test only. Clears all buckets. Do NOT call from runtime code.
 */
export function __resetRateLimiterForTests() {
  ipBuckets.clear();
  lastSweepAt = 0;
}
