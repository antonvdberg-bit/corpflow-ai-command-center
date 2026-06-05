import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import leadRescueBotTurnHandler, {
  __internal,
} from '../lib/server/lead-rescue-bot/handler.js';
import {
  __resetRateLimiterForTests,
} from '../lib/server/lead-rescue-bot/rate-limiter.js';
import {
  LEAD_RESCUE_BOT_SYSTEM_PROMPT,
  LEAD_RESCUE_BOT_SYSTEM_PROMPT_VERSION,
} from '../lib/server/lead-rescue-bot/system-prompt.js';
import { buildSystemPromptWithKb } from '../lib/server/lead-rescue-bot/kb.js';
import {
  LEAD_RESCUE_BOT_TOOLS,
  LEAD_RESCUE_BOT_TOOL_NAME_ALLOWLIST,
} from '../lib/server/lead-rescue-bot/tools.js';

class MockRes {
  constructor() {
    this.statusCode = 200;
    this.headers = {};
    this.body = '';
    this.ended = false;
  }
  setHeader(k, v) {
    this.headers[k.toLowerCase()] = String(v);
  }
  end(s) {
    this.body += s || '';
    this.ended = true;
  }
  /** Compatibility with `res.status(...).json(...)` from existing handlers. */
  status(code) {
    this.statusCode = code;
    return this;
  }
  json(obj) {
    this.headers['content-type'] = 'application/json';
    this.end(JSON.stringify(obj));
    return this;
  }
  parsedBody() {
    if (!this.body) return null;
    try {
      return JSON.parse(this.body);
    } catch {
      return null;
    }
  }
}

function makeReq({ method = 'POST', host = 'corpflowai.com', origin = 'https://corpflowai.com', body = null } = {}) {
  return {
    method,
    headers: {
      'x-forwarded-host': host,
      origin,
      referer: `${origin}/lead-rescue`,
      'x-forwarded-for': '203.0.113.99',
    },
    body,
    socket: { remoteAddress: '203.0.113.99' },
  };
}

describe('lead-rescue-bot/system-prompt — locked v1 floor', () => {
  it('exposes a stable version string', () => {
    assert.equal(typeof LEAD_RESCUE_BOT_SYSTEM_PROMPT_VERSION, 'string');
    assert.match(LEAD_RESCUE_BOT_SYSTEM_PROMPT_VERSION, /^v1\.0\.0-/);
  });

  it('contains the doctrine non-negotiables verbatim', () => {
    assert.match(LEAD_RESCUE_BOT_SYSTEM_PROMPT, /USD 150 launch pilot/);
    assert.match(LEAD_RESCUE_BOT_SYSTEM_PROMPT, /No revenue guarantee/);
    assert.match(LEAD_RESCUE_BOT_SYSTEM_PROMPT, /No card, IBAN, SWIFT/);
    assert.match(LEAD_RESCUE_BOT_SYSTEM_PROMPT, /scroll_to_intake/);
    assert.match(LEAD_RESCUE_BOT_SYSTEM_PROMPT, /prefill_intake_form/);
    assert.match(LEAD_RESCUE_BOT_SYSTEM_PROMPT, /NEVER submits the form/);
  });

  it('buildSystemPromptWithKb appends the offer + allowed + forbidden + out-of-scope blocks', () => {
    const full = buildSystemPromptWithKb(LEAD_RESCUE_BOT_SYSTEM_PROMPT);
    assert.match(full, /OFFER \(verbatim,/);
    assert.match(full, /ALLOWED CLAIMS/);
    assert.match(full, /FORBIDDEN CLAIMS/);
    assert.match(full, /EXPLICITLY OUT OF SCOPE/);
    assert.match(full, /Guaranteed more sales/);
  });
});

describe('lead-rescue-bot/tools — exactly 2 client-side tools', () => {
  it('exposes exactly scroll_to_intake + prefill_intake_form', () => {
    assert.equal(LEAD_RESCUE_BOT_TOOLS.length, 2);
    const names = LEAD_RESCUE_BOT_TOOLS.map((t) => t.name).sort();
    assert.deepEqual(names, ['prefill_intake_form', 'scroll_to_intake']);
  });

  it('every tool has additionalProperties:false and strict:true', () => {
    for (const t of LEAD_RESCUE_BOT_TOOLS) {
      assert.equal(t.strict, true, `${t.name} must be strict:true`);
      assert.equal(
        /** @type {any} */ (t.parameters).additionalProperties,
        false,
        `${t.name} must have additionalProperties:false`,
      );
    }
  });

  it('allowlist matches the published tools', () => {
    assert.equal(LEAD_RESCUE_BOT_TOOL_NAME_ALLOWLIST.size, 2);
    for (const t of LEAD_RESCUE_BOT_TOOLS) {
      assert.ok(
        LEAD_RESCUE_BOT_TOOL_NAME_ALLOWLIST.has(t.name),
        `allowlist must include ${t.name}`,
      );
    }
  });
});

describe('lead-rescue-bot/handler — internal validators', () => {
  it('validateMessages rejects empty / non-array', () => {
    assert.equal(__internal.validateMessages(null), null);
    assert.equal(__internal.validateMessages([]), null);
    assert.equal(__internal.validateMessages('not an array'), null);
  });

  it('validateMessages requires a final user-role message', () => {
    const r = __internal.validateMessages([
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'hello!' },
    ]);
    assert.equal(r, null);
  });

  it('validateMessages clamps oversized inputs', () => {
    const long = 'a'.repeat(1001);
    const r = __internal.validateMessages([{ role: 'user', content: long }]);
    assert.equal(r, null);
  });

  it('validateMessages accepts a clean history', () => {
    const r = __internal.validateMessages([
      { role: 'user', content: 'Hi, can you help with leads?' },
      { role: 'assistant', content: 'Of course, tell me your situation.' },
      { role: 'user', content: 'I run a small B&B in Mauritius.' },
    ]);
    assert.ok(Array.isArray(r));
    assert.equal(r.length, 3);
  });

  it('sanitizeToolCalls drops unknown tool names', () => {
    const r = __internal.sanitizeToolCalls([
      { name: 'eval_arbitrary_code', call_id: 'c1', arguments: '{}' },
      { name: 'scroll_to_intake', call_id: 'c2', arguments: '{}' },
    ]);
    assert.equal(r.length, 1);
    assert.equal(r[0].name, 'scroll_to_intake');
  });

  it('sanitizeToolCalls drops unknown fields in prefill_intake_form arguments', () => {
    const r = __internal.sanitizeToolCalls([
      {
        name: 'prefill_intake_form',
        call_id: 'c1',
        arguments: JSON.stringify({
          business_name: 'Acme',
          email: 'a@b.com',
          credit_card_number: '4111111111111111',
          admin_override: true,
        }),
      },
    ]);
    assert.equal(r.length, 1);
    assert.deepEqual(Object.keys(r[0].arguments).sort(), ['business_name', 'email']);
  });

  it('isHostAllowed permits apex + www, denies other hosts', () => {
    assert.equal(__internal.isHostAllowed('corpflowai.com'), true);
    assert.equal(__internal.isHostAllowed('www.corpflowai.com'), true);
    assert.equal(__internal.isHostAllowed('lux.corpflowai.com'), false);
    assert.equal(__internal.isHostAllowed('evil.example.com'), false);
    assert.equal(__internal.isHostAllowed(''), false);
  });

  it('isOriginAcceptable rejects cross-origin requests', () => {
    const reqOk = makeReq({ origin: 'https://corpflowai.com' });
    assert.equal(__internal.isOriginAcceptable(reqOk, 'corpflowai.com'), true);
    const reqBad = makeReq({ origin: 'https://evil.example.com' });
    assert.equal(__internal.isOriginAcceptable(reqBad, 'corpflowai.com'), false);
  });
});

describe('lead-rescue-bot/handler — kill switch + guards (no OpenAI call)', () => {
  beforeEach(() => {
    __resetRateLimiterForTests();
    delete process.env.CORPFLOW_LEAD_RESCUE_BOT_SERVER_ENABLED;
  });

  it('returns 503 when the kill switch is OFF (default)', async () => {
    const req = makeReq({ body: { session_id: 'sess-killsw-aaaaaaaa', is_first_turn: true, messages: [{ role: 'user', content: 'hi' }] } });
    const res = new MockRes();
    await leadRescueBotTurnHandler(req, res);
    assert.equal(res.statusCode, 503);
    assert.match(res.body, /BOT_DISABLED/);
  });

  it('returns 405 on non-POST', async () => {
    process.env.CORPFLOW_LEAD_RESCUE_BOT_SERVER_ENABLED = 'true';
    const req = makeReq({ method: 'GET' });
    const res = new MockRes();
    await leadRescueBotTurnHandler(req, res);
    assert.equal(res.statusCode, 405);
    delete process.env.CORPFLOW_LEAD_RESCUE_BOT_SERVER_ENABLED;
  });

  it('returns 403 when host is not apex', async () => {
    process.env.CORPFLOW_LEAD_RESCUE_BOT_SERVER_ENABLED = 'true';
    const req = makeReq({ host: 'evil.example.com', origin: 'https://evil.example.com' });
    const res = new MockRes();
    await leadRescueBotTurnHandler(req, res);
    assert.equal(res.statusCode, 403);
    assert.match(res.body, /HOST_NOT_ALLOWED/);
    delete process.env.CORPFLOW_LEAD_RESCUE_BOT_SERVER_ENABLED;
  });

  it('returns 403 when origin is cross-site (even if host is apex)', async () => {
    process.env.CORPFLOW_LEAD_RESCUE_BOT_SERVER_ENABLED = 'true';
    const req = makeReq({ origin: 'https://evil.example.com' });
    const res = new MockRes();
    await leadRescueBotTurnHandler(req, res);
    assert.equal(res.statusCode, 403);
    assert.match(res.body, /ORIGIN_NOT_ALLOWED/);
    delete process.env.CORPFLOW_LEAD_RESCUE_BOT_SERVER_ENABLED;
  });

  it('returns 400 on invalid session_id', async () => {
    process.env.CORPFLOW_LEAD_RESCUE_BOT_SERVER_ENABLED = 'true';
    const req = makeReq({ body: { session_id: 'sh!', is_first_turn: true, messages: [{ role: 'user', content: 'hi' }] } });
    const res = new MockRes();
    await leadRescueBotTurnHandler(req, res);
    assert.equal(res.statusCode, 400);
    assert.match(res.body, /INVALID_SESSION_ID/);
    delete process.env.CORPFLOW_LEAD_RESCUE_BOT_SERVER_ENABLED;
  });

  it('returns 400 on invalid messages shape', async () => {
    process.env.CORPFLOW_LEAD_RESCUE_BOT_SERVER_ENABLED = 'true';
    const req = makeReq({ body: { session_id: 'sess-valid-aaaaaaaa', is_first_turn: true, messages: 'not an array' } });
    const res = new MockRes();
    await leadRescueBotTurnHandler(req, res);
    assert.equal(res.statusCode, 400);
    assert.match(res.body, /INVALID_MESSAGES/);
    delete process.env.CORPFLOW_LEAD_RESCUE_BOT_SERVER_ENABLED;
  });

  it('short-circuits to PII-block refusal when user pastes a credit card (no OpenAI call)', async () => {
    process.env.CORPFLOW_LEAD_RESCUE_BOT_SERVER_ENABLED = 'true';
    let fetchCalled = false;
    const origFetch = global.fetch;
    global.fetch = async () => {
      fetchCalled = true;
      throw new Error('fetch should not be called when input filter blocks');
    };
    try {
      const req = makeReq({
        body: {
          session_id: 'sess-pii-aaaaaaaaa',
          is_first_turn: true,
          messages: [{ role: 'user', content: 'My card is 4111 1111 1111 1111, can I pay now?' }],
        },
      });
      const res = new MockRes();
      await leadRescueBotTurnHandler(req, res);
      assert.equal(res.statusCode, 200);
      assert.equal(fetchCalled, false, 'OpenAI fetch must not happen when input filter blocks');
      const parsed = res.parsedBody();
      assert.ok(parsed, 'response must be JSON');
      assert.equal(parsed.refusal_class, 'banking_data_in_input');
      assert.match(parsed.assistant_text, /banking|card|account/i);
      assert.equal(parsed.tool_calls[0].name, 'scroll_to_intake');
    } finally {
      global.fetch = origFetch;
      delete process.env.CORPFLOW_LEAD_RESCUE_BOT_SERVER_ENABLED;
    }
  });

  it('returns rate-limited refusal on the 4th session from the same IP (with cap = 3)', async () => {
    process.env.CORPFLOW_LEAD_RESCUE_BOT_SERVER_ENABLED = 'true';
    process.env.CORPFLOW_LEAD_RESCUE_BOT_MAX_SESSIONS_PER_IP_PER_HOUR = '3';
    process.env.OPENAI_API_KEY = 'sk-test-key-for-rate-limit-only-not-real';

    const origFetch = global.fetch;
    global.fetch = async () => {
      return new Response(
        JSON.stringify({
          id: 'resp_test',
          output: [
            {
              type: 'message',
              role: 'assistant',
              content: [{ type: 'output_text', text: 'Hi, how can I help with AI Lead Rescue?' }],
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    };

    try {
      for (let i = 0; i < 3; i++) {
        const req = makeReq({
          body: {
            session_id: `sess-ratelimit-${i}-x`,
            is_first_turn: true,
            messages: [{ role: 'user', content: `Hello session ${i}` }],
          },
        });
        const res = new MockRes();
        await leadRescueBotTurnHandler(req, res);
        assert.equal(res.statusCode, 200, `session ${i} should be allowed`);
        const p = res.parsedBody();
        assert.equal(p.refusal_class, null);
      }
      const overflowReq = makeReq({
        body: {
          session_id: 'sess-ratelimit-4-x',
          is_first_turn: true,
          messages: [{ role: 'user', content: 'one more session' }],
        },
      });
      const overflowRes = new MockRes();
      await leadRescueBotTurnHandler(overflowReq, overflowRes);
      assert.equal(overflowRes.statusCode, 429);
      const p = overflowRes.parsedBody();
      assert.equal(p.refusal_class, 'rate_limited');
    } finally {
      global.fetch = origFetch;
      delete process.env.CORPFLOW_LEAD_RESCUE_BOT_SERVER_ENABLED;
      delete process.env.CORPFLOW_LEAD_RESCUE_BOT_MAX_SESSIONS_PER_IP_PER_HOUR;
      delete process.env.OPENAI_API_KEY;
      __resetRateLimiterForTests();
    }
  });

  it('happy path: returns assistant_text + parsed tool_calls', async () => {
    process.env.CORPFLOW_LEAD_RESCUE_BOT_SERVER_ENABLED = 'true';
    process.env.OPENAI_API_KEY = 'sk-test-happy-path-only-not-real';

    const origFetch = global.fetch;
    global.fetch = async () => {
      return new Response(
        JSON.stringify({
          id: 'resp_happy',
          output: [
            {
              type: 'message',
              role: 'assistant',
              content: [
                {
                  type: 'output_text',
                  text: "We review every intake within two business hours. I can take you to the intake form now.",
                },
              ],
            },
            {
              type: 'function_call',
              name: 'prefill_intake_form',
              call_id: 'call_1',
              arguments: JSON.stringify({
                business_name: 'Acme BnB',
                email: 'owner@acme-bnb.example',
              }),
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    };

    try {
      const req = makeReq({
        body: {
          session_id: 'sess-happy-aaaaaaaa',
          is_first_turn: true,
          messages: [{ role: 'user', content: 'I want to start. My biz is Acme BnB, owner@acme-bnb.example.' }],
        },
      });
      const res = new MockRes();
      await leadRescueBotTurnHandler(req, res);
      assert.equal(res.statusCode, 200);
      const p = res.parsedBody();
      assert.equal(p.refusal_class, null);
      assert.match(p.assistant_text, /two business hours/);
      assert.equal(p.tool_calls.length, 1);
      assert.equal(p.tool_calls[0].name, 'prefill_intake_form');
      assert.deepEqual(p.tool_calls[0].arguments, {
        business_name: 'Acme BnB',
        email: 'owner@acme-bnb.example',
      });
    } finally {
      global.fetch = origFetch;
      delete process.env.CORPFLOW_LEAD_RESCUE_BOT_SERVER_ENABLED;
      delete process.env.OPENAI_API_KEY;
      __resetRateLimiterForTests();
    }
  });

  it('output-filter post-check: swaps assistant text for refusal when model promises revenue', async () => {
    process.env.CORPFLOW_LEAD_RESCUE_BOT_SERVER_ENABLED = 'true';
    process.env.OPENAI_API_KEY = 'sk-test-output-filter-only-not-real';

    const origFetch = global.fetch;
    global.fetch = async () => {
      return new Response(
        JSON.stringify({
          id: 'resp_bad',
          output: [
            {
              type: 'message',
              role: 'assistant',
              content: [{ type: 'output_text', text: 'I guarantee more revenue within 30 days.' }],
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    };

    try {
      const req = makeReq({
        body: {
          session_id: 'sess-bad-aaaaaaaaa',
          is_first_turn: true,
          messages: [{ role: 'user', content: 'Will I make more money?' }],
        },
      });
      const res = new MockRes();
      await leadRescueBotTurnHandler(req, res);
      assert.equal(res.statusCode, 200);
      const p = res.parsedBody();
      assert.equal(p.refusal_class, 'guarantee_attempted');
      assert.doesNotMatch(p.assistant_text, /guarantee more revenue/i);
    } finally {
      global.fetch = origFetch;
      delete process.env.CORPFLOW_LEAD_RESCUE_BOT_SERVER_ENABLED;
      delete process.env.OPENAI_API_KEY;
      __resetRateLimiterForTests();
    }
  });
});
