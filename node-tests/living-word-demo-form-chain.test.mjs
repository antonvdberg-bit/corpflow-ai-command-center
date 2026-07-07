import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  DEMO_LABEL,
  _resetDemoFormChainStoreForTests,
  buildForm2Path,
  buildForm2Url,
  createForm1Session,
  getSessionByToken,
  isAllowedDemoRecipient,
  validateForm1Body,
  validateForm2Body,
} from '../lib/server/living-word/demo-form-chain.js';
import {
  buildDemoForm2EmailPayload,
  deliverDemoForm2Email,
} from '../lib/server/living-word/demo-form-chain-email.js';

const ENV_KEYS = ['N8N_EMAIL_WEBHOOK_URL', 'N8N_EMAIL_WEBHOOK_SECRET', 'EMAIL_FROM'];

function snapshotEnv() {
  const before = {};
  for (const k of ENV_KEYS) before[k] = process.env[k];
  return () => {
    for (const k of ENV_KEYS) {
      if (before[k] === undefined) delete process.env[k];
      else process.env[k] = before[k];
    }
  };
}

const validForm1 = () => ({
  first_name: 'Test',
  last_name: 'Alpha',
  email: 'test.alpha@example.test',
  phone: '+23050000001',
  member_type: 'member',
  ready_to_serve: true,
  consent_demo: true,
});

const validForm2 = () => ({
  email_confirm: 'test.alpha@example.test',
  address_line_1: '1 Demo Street',
  city: 'Port Louis',
  preferred_communication: 'email',
  interested_in_serving: true,
  ready_to_serve: true,
  consent_acknowledged: true,
});

beforeEach(() => {
  _resetDemoFormChainStoreForTests();
});

describe('TEST DEMO label', () => {
  it('DEMO_LABEL is present for form pages', () => {
    assert.match(DEMO_LABEL, /LIVING WORD/);
    assert.match(DEMO_LABEL, /TEST DEMO/);
  });
});

describe('isAllowedDemoRecipient', () => {
  it('allows @example.test', () => {
    assert.equal(isAllowedDemoRecipient('test.alpha@example.test'), true);
  });

  it('rejects real-looking domains', () => {
    assert.equal(isAllowedDemoRecipient('person@gmail.com'), false);
  });
});

describe('validateForm1Body', () => {
  it('accepts valid TEST DEMO form 1', () => {
    const r = validateForm1Body(validForm1());
    assert.equal(r.ok, true);
  });

  it('requires consent_demo', () => {
    const r = validateForm1Body({ ...validForm1(), consent_demo: false });
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.equal(r.error, 'consent_required');
  });

  it('rejects non-demo email', () => {
    const r = validateForm1Body({ ...validForm1(), email: 'real@church.org' });
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.equal(r.error, 'demo_recipient_not_allowed');
  });
});

describe('validateForm2Body', () => {
  it('accepts valid form 2 without whatsapp/sms comm pref', () => {
    const r = validateForm2Body(validForm2());
    assert.equal(r.ok, true);
  });

  it('rejects whatsapp comm preference', () => {
    const r = validateForm2Body({ ...validForm2(), preferred_communication: 'whatsapp' });
    assert.equal(r.ok, false);
  });
});

describe('Form 1 submit creates Form 2 link', () => {
  it('createForm1Session returns token and buildForm2Path includes it', () => {
    const validated = validateForm1Body(validForm1());
    assert.equal(validated.ok, true);
    if (!validated.ok) return;
    const { token } = createForm1Session(validated.data);
    assert.ok(token.length >= 16);
    const path = buildForm2Path(token);
    assert.match(path, /^\/living-word\/form-2\?token=/);
    const session = getSessionByToken(token);
    assert.ok(session);
    assert.equal(session.form1.email, 'test.alpha@example.test');
  });

  it('buildForm2Url joins base and path', () => {
    const { token } = createForm1Session(validForm1());
    const url = buildForm2Url('https://living-word-mauritius.corpflowai.com', token);
    assert.match(url, /^https:\/\/living-word-mauritius\.corpflowai\.com\/living-word\/form-2\?token=/);
  });
});

describe('buildDemoForm2EmailPayload', () => {
  it('contains Form 2 hyperlink and TEST DEMO label', () => {
    const payload = buildDemoForm2EmailPayload({
      email: 'test.alpha@example.test',
      firstName: 'Test',
      form2Url: 'https://example.test/living-word/form-2?token=abc',
      fromAddress: 'support@corpflowai.com',
    });
    assert.equal(payload.test_demo, true);
    assert.equal(payload.test_demo_label, DEMO_LABEL);
    assert.match(String(payload.subject), /TEST DEMO/);
    assert.equal(payload.form2_url, 'https://example.test/living-word/form-2?token=abc');
    assert.match(String(payload.text), /form-2\?token=abc/);
    assert.equal(payload.no_whatsapp, true);
    assert.equal(payload.no_sms, true);
    assert.equal(payload.no_ghl, true);
    assert.equal(payload.canonical_write, false);
  });
});

describe('deliverDemoForm2Email', () => {
  it('marks BLOCKED_PENDING_EXISTING_EMAIL_PATH when webhook unset', async () => {
    const restore = snapshotEnv();
    delete process.env.N8N_EMAIL_WEBHOOK_URL;
    delete process.env.CORPFLOW_PASSWORD_RESET_WEBHOOK_URL;
    try {
      const r = await deliverDemoForm2Email({
        email: 'test.alpha@example.test',
        firstName: 'Test',
        form2Url: 'https://host/living-word/form-2?token=tok',
      });
      assert.equal(r.status, 'BLOCKED_PENDING_EXISTING_EMAIL_PATH');
      assert.equal(r.configured, false);
      assert.equal(r.ok, false);
      assert.ok(r.preview);
      assert.match(String(r.preview.test_demo_label), /TEST DEMO/);
    } finally {
      restore();
    }
  });

  it('sends via existing path when configured', async () => {
    const restore = snapshotEnv();
    process.env.N8N_EMAIL_WEBHOOK_URL = 'https://n8n.example/webhook/email';
    process.env.N8N_EMAIL_WEBHOOK_SECRET = 'secret';
    process.env.EMAIL_FROM = 'support@corpflowai.com';
    try {
      const r = await deliverDemoForm2Email({
        email: 'test.alpha@example.test',
        firstName: 'Test',
        form2Url: 'https://host/living-word/form-2?token=tok',
        fetchImpl: async () => ({ ok: true, status: 200 }),
      });
      assert.equal(r.status, 'sent');
      assert.equal(r.ok, true);
    } finally {
      restore();
    }
  });

  it('does not call external path for disallowed recipient', async () => {
    let called = false;
    const r = await deliverDemoForm2Email({
      email: 'real@church.org',
      firstName: 'X',
      form2Url: 'https://host/form-2',
      fetchImpl: async () => {
        called = true;
        return { ok: true, status: 200 };
      },
    });
    assert.equal(r.status, 'demo_recipient_rejected');
    assert.equal(called, false);
  });
});
