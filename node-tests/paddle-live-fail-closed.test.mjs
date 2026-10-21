import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import test from 'node:test';

import {
  FACTORY_REQUEST_BODY_LIMIT,
  PADDLE_LIVE_WEBHOOK_PATH,
  isPaddleWebhookPath,
  preserveFactoryRequestBody,
} from '../lib/server/factory-request-body.js';
import { PADDLE_LIVE_BAD_PRICE_MAPPINGS } from '../lib/server/paddle-live/catalog.js';
import {
  assertLivePublicCheckoutAllowed,
  assertPaddleLiveConfig,
  getPaddleLiveConfig,
  isLivePublicCheckoutEnabled,
  publicLiveConfigView,
} from '../lib/server/paddle-live/config.js';
import { processPaddleLiveEvent } from '../lib/server/paddle-live/state.js';
import paddleLiveStatusHandler from '../lib/server/paddle-live/status.js';
import paddleLiveWebhookHandler from '../lib/server/paddle-live/webhook.js';
import { getPaddleSandboxConfig } from '../lib/server/paddle-sandbox/config.js';

const LIVE_WEBHOOK_SECRET = 'live_webhook_secret_for_tests_only';
const RAW_TRANSACTION =
  '{ "event_id" : "evt_live_raw_1" , "event_type" : "transaction.completed" , "occurred_at" : "2026-10-21T00:00:00.000Z" , "notification_id" : "ntf_live_raw_1" , "data" : { "id" : "txn_live_raw_1" , "status" : "completed" , "items" : [] , "payments" : [] } }';

const LIVE_PRICE_ENV = {
  PADDLE_LIVE_BAD_ONBOARD_EXISTING_PRICE_ID: 'pri_liveOnboardExisting',
  PADDLE_LIVE_BAD_REG_ONBOARD_BUNDLE_PRICE_ID: 'pri_liveRegOnboardBundle',
  PADDLE_LIVE_BAD_ANNUAL_RETURN_BO_CURRENT_PRICE_ID: 'pri_liveAnnualReturn',
  PADDLE_LIVE_BAD_BO_SIMPLE_PRICE_ID: 'pri_liveBoSimple',
  PADDLE_LIVE_BAD_DIRECTOR_APPT_RESIGN_PRICE_ID: 'pri_liveDirector',
  PADDLE_LIVE_BAD_ADDRESS_CHANGE_PRICE_ID: 'pri_liveAddressChange',
  PADDLE_LIVE_BAD_SHARE_CERT_VERIFIED_PRICE_ID: 'pri_liveShareCert',
  PADDLE_LIVE_BAD_NAME_RESERVATION_PRICE_ID: 'pri_liveNameReservation',
  PADDLE_LIVE_BAD_FYE_CHANGE_PRICE_ID: 'pri_liveFyeChange',
};

const TRACKED_ENV = [
  'PADDLE_RUNTIME_MODE',
  'NEXT_PUBLIC_PADDLE_ENV',
  'NEXT_PUBLIC_PADDLE_CLIENT_TOKEN',
  'NEXT_PUBLIC_PADDLE_PLATFORM_PRICE_ID',
  'NEXT_PUBLIC_PADDLE_IMPLEMENTATION_PRICE_ID',
  'PADDLE_API_KEY',
  'PADDLE_NOTIFICATION_WEBHOOK_SECRET',
  'PADDLE_LIVE_CLIENT_TOKEN',
  'PADDLE_LIVE_API_KEY',
  'PADDLE_LIVE_NOTIFICATION_WEBHOOK_SECRET',
  'PADDLE_LIVE_CHECKOUT_DOMAIN',
  'PADDLE_LIVE_PUBLIC_CHECKOUT',
  ...Object.keys(LIVE_PRICE_ENV),
];

function snapshotEnv() {
  return Object.fromEntries(TRACKED_ENV.map((key) => [key, process.env[key]]));
}

function restoreEnv(previous) {
  for (const [key, value] of Object.entries(previous)) {
    if (value == null) delete process.env[key];
    else process.env[key] = value;
  }
}

function clearLiveAndSandboxEnv() {
  for (const key of TRACKED_ENV) delete process.env[key];
}

function applySandboxProofEnv() {
  process.env.NEXT_PUBLIC_PADDLE_ENV = 'sandbox';
  process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN = 'test_sandbox_client_token';
  process.env.NEXT_PUBLIC_PADDLE_PLATFORM_PRICE_ID = 'pri_platformtest';
  process.env.NEXT_PUBLIC_PADDLE_IMPLEMENTATION_PRICE_ID = 'pri_implementationtest';
  process.env.PADDLE_API_KEY = 'pdl_sdbx_apikey_test_only';
  process.env.PADDLE_NOTIFICATION_WEBHOOK_SECRET = 'sandbox_webhook_secret_for_tests_only';
}

function applyCompleteLiveEnv() {
  process.env.PADDLE_RUNTIME_MODE = 'live';
  process.env.PADDLE_LIVE_CLIENT_TOKEN = 'live_test_client_token_only';
  process.env.PADDLE_LIVE_API_KEY = 'pdl_live_apikey_test_only';
  process.env.PADDLE_LIVE_NOTIFICATION_WEBHOOK_SECRET = LIVE_WEBHOOK_SECRET;
  process.env.PADDLE_LIVE_CHECKOUT_DOMAIN = 'businessadmindesk.co.za';
  Object.assign(process.env, LIVE_PRICE_ENV);
}

function withEnv(setup, fn) {
  const previous = snapshotEnv();
  clearLiveAndSandboxEnv();
  setup();
  return Promise.resolve()
    .then(fn)
    .finally(() => restoreEnv(previous));
}

function fakePrisma() {
  const rows = [];
  return {
    rows,
    automationEvent: {
      findUnique: async ({ where }) =>
        rows.find(
          (row) =>
            row.tenantScope === where.automation_events_scope_idem.tenantScope &&
            row.idempotencyKey === where.automation_events_scope_idem.idempotencyKey,
        ) || null,
      create: async ({ data }) => {
        const row = { id: `row_${rows.length + 1}`, ...data };
        rows.push(row);
        return { id: row.id };
      },
    },
  };
}

function mockRes() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

function streamFrom(raw, headers = {}) {
  const req = Readable.from([Buffer.isBuffer(raw) ? raw : Buffer.from(raw)]);
  req.headers = headers;
  req.method = 'POST';
  return req;
}

function sign(rawBody, secret = LIVE_WEBHOOK_SECRET, ts = Math.floor(Date.now() / 1000)) {
  const h1 = createHmac('sha256', secret).update(`${ts}:${rawBody}`).digest('hex');
  return `ts=${ts};h1=${h1}`;
}

test('approved Live catalogue is nine one-time ZAR packages and excludes sandbox USD products', () => {
  assert.equal(PADDLE_LIVE_BAD_PRICE_MAPPINGS.length, 9);
  assert.deepEqual(
    PADDLE_LIVE_BAD_PRICE_MAPPINGS.map((row) => [row.item_code, row.amountZar]),
    [
      ['BAD-ONBOARD-EXISTING', 199],
      ['BAD-REG-ONBOARD-BUNDLE', 299],
      ['BAD-ANNUAL-RETURN-BO-CURRENT', 99],
      ['BAD-BO-SIMPLE', 249],
      ['BAD-DIRECTOR-APPT-RESIGN', 199],
      ['BAD-ADDRESS-CHANGE', 69],
      ['BAD-SHARE-CERT-VERIFIED', 99],
      ['BAD-NAME-RESERVATION', 99],
      ['BAD-FYE-CHANGE', 199],
    ],
  );
  const source = readFileSync(join(process.cwd(), 'lib/server/paddle-live/catalog.js'), 'utf8');
  assert.doesNotMatch(source, /CorpFlowAI Platform|Implementation & Configuration|pri_platformtest/);
});

test('default configuration keeps Sandbox intact and Live fail-closed', async () => {
  await withEnv(
    () => {
      applySandboxProofEnv();
    },
    () => {
      const sandbox = getPaddleSandboxConfig();
      const live = getPaddleLiveConfig();
      assert.equal(sandbox.configured, true);
      assert.equal(sandbox.environment, 'sandbox');
      assert.equal(live.configured, false);
      assert.ok(live.errors.includes('live_mode_not_selected'));
      assert.equal(live.publicCheckoutEnabled, false);
      assert.equal(live.erpnextWrites, false);
      assert.equal(isLivePublicCheckoutEnabled(), false);
      assert.throws(() => assertLivePublicCheckoutAllowed(), /PADDLE_LIVE_PUBLIC_CHECKOUT_NOT_AUTHORIZED/);
      assert.throws(() => assertPaddleLiveConfig(live), /PADDLE_LIVE_NOT_CONFIGURED/);
    },
  );
});

test('missing Live credentials fail closed', async () => {
  await withEnv(
    () => {
      applySandboxProofEnv();
      process.env.PADDLE_RUNTIME_MODE = 'live';
    },
    () => {
      const live = getPaddleLiveConfig();
      assert.equal(live.configured, false);
      assert.ok(live.errors.includes('live_client_token_required'));
      assert.ok(live.errors.includes('live_api_key_required'));
      assert.ok(live.errors.includes('live_webhook_secret_required'));
      assert.ok(live.errors.includes('live_checkout_domain_required'));
      assert.ok(live.errors.includes('live_price_ids_incomplete'));
      assert.equal(live.apiKey, '');
      assert.equal(live.webhookSecret, '');
    },
  );
});

test('missing Live price IDs fail closed even when credentials exist', async () => {
  await withEnv(
    () => {
      applySandboxProofEnv();
      process.env.PADDLE_RUNTIME_MODE = 'live';
      process.env.PADDLE_LIVE_CLIENT_TOKEN = 'live_test_client_token_only';
      process.env.PADDLE_LIVE_API_KEY = 'pdl_live_apikey_test_only';
      process.env.PADDLE_LIVE_NOTIFICATION_WEBHOOK_SECRET = LIVE_WEBHOOK_SECRET;
      process.env.PADDLE_LIVE_CHECKOUT_DOMAIN = 'businessadmindesk.co.za';
    },
    () => {
      const live = getPaddleLiveConfig();
      assert.equal(live.configured, false);
      assert.ok(live.errors.includes('live_price_ids_incomplete'));
      assert.equal(live.prices.filter((row) => row.mapped).length, 0);
    },
  );
});

test('Sandbox credentials and price IDs cannot be used in Live mode', async () => {
  await withEnv(
    () => {
      applySandboxProofEnv();
      process.env.PADDLE_RUNTIME_MODE = 'live';
      process.env.PADDLE_LIVE_CLIENT_TOKEN = 'test_sandbox_client_token';
      process.env.PADDLE_LIVE_API_KEY = 'pdl_sdbx_apikey_test_only';
      process.env.PADDLE_LIVE_NOTIFICATION_WEBHOOK_SECRET = 'sandbox_webhook_secret_for_tests_only';
      process.env.PADDLE_LIVE_CHECKOUT_DOMAIN = 'businessadmindesk.co.za';
      for (const key of Object.keys(LIVE_PRICE_ENV)) {
        process.env[key] = 'pri_platformtest';
      }
    },
    () => {
      const live = getPaddleLiveConfig();
      assert.equal(live.configured, false);
      assert.ok(live.errors.includes('live_client_token_prefix_required'));
      assert.ok(live.errors.includes('sandbox_client_token_in_live_slot'));
      assert.ok(live.errors.includes('live_client_token_matches_sandbox'));
      assert.ok(live.errors.includes('live_api_key_prefix_required'));
      assert.ok(live.errors.includes('sandbox_api_key_in_live_slot'));
      assert.ok(live.errors.includes('live_api_key_matches_sandbox'));
      assert.ok(live.errors.includes('live_webhook_secret_matches_sandbox'));
      assert.ok(live.errors.includes('sandbox_price_ids_cannot_map_live'));
    },
  );
});

test('complete Live config still keeps public checkout and ERPNext writes disabled', async () => {
  await withEnv(
    () => {
      applySandboxProofEnv();
      applyCompleteLiveEnv();
      process.env.PADDLE_LIVE_PUBLIC_CHECKOUT = 'true';
    },
    () => {
      const sandbox = getPaddleSandboxConfig();
      const live = getPaddleLiveConfig();
      assert.equal(sandbox.configured, true);
      assert.equal(live.configured, false);
      assert.ok(live.errors.includes('public_checkout_override_ignored'));
      assert.equal(isLivePublicCheckoutEnabled(), false);
      assert.equal(live.erpnextWrites, false);
      assert.equal(live.retainPwCustomer, false);
    },
  );
});

test('complete Live config without a public-checkout override is configured and still unactivated', async () => {
  await withEnv(
    () => {
      applySandboxProofEnv();
      applyCompleteLiveEnv();
    },
    () => {
      const live = getPaddleLiveConfig();
      assert.equal(live.configured, true);
      assert.equal(live.errors.length, 0);
      assert.equal(live.publicCheckoutAuthorized, false);
      assert.equal(live.publicCheckoutEnabled, false);
      assert.equal(live.erpnextWrites, false);
      assert.equal(live.prices.every((row) => row.mapped), true);
      const view = publicLiveConfigView(live);
      assert.equal(view.public_checkout_enabled, false);
      assert.doesNotMatch(JSON.stringify(view), /pdl_live_apikey|live_test_client_token|pri_liveOnboardExisting/);
    },
  );
});

test('Live webhook preserves signature verification, idempotency, and no ERPNext write', async () => {
  await withEnv(
    () => {
      applySandboxProofEnv();
      applyCompleteLiveEnv();
    },
    async () => {
      const req = streamFrom(RAW_TRANSACTION, {
        'content-type': 'application/json',
        'paddle-signature': sign(RAW_TRANSACTION),
      });
      const outcome = await preserveFactoryRequestBody(req, PADDLE_LIVE_WEBHOOK_PATH);
      assert.equal(outcome.ok, true);
      const prisma = fakePrisma();
      const res = mockRes();
      await paddleLiveWebhookHandler(req, res, { prisma });
      assert.equal(res.statusCode, 200);
      assert.equal(res.body.ok, true);
      assert.equal(res.body.live_activation, false);
      assert.equal(res.body.erpnext_write, false);
      assert.equal(res.body.public_checkout, false);
      assert.equal(prisma.rows.length, 1);
      assert.equal(prisma.rows[0].source, 'paddle-live-webhook');
      assert.equal(prisma.rows[0].payload.erpnext_write, false);

      const replay = streamFrom(RAW_TRANSACTION, {
        'content-type': 'application/json',
        'paddle-signature': sign(RAW_TRANSACTION),
      });
      await preserveFactoryRequestBody(replay, PADDLE_LIVE_WEBHOOK_PATH);
      const replayRes = mockRes();
      await paddleLiveWebhookHandler(replay, replayRes, { prisma });
      assert.equal(replayRes.body.deduped, true);
      assert.equal(prisma.rows.length, 1);

      const failed = await processPaddleLiveEvent(
        fakePrisma(),
        {
          eventId: 'evt_fail',
          eventType: 'transaction.payment_failed',
          data: { id: 'txn_fail', status: 'failed' },
        },
        'paddle-live-unactivated-account',
      );
      assert.equal(failed.accepted, true);
      assert.equal(failed.erpnext_write, false);
    },
  );
});

test('incomplete Live configuration rejects the Live webhook without processing', async () => {
  await withEnv(
    () => {
      applySandboxProofEnv();
    },
    async () => {
      const req = streamFrom(RAW_TRANSACTION, {
        'content-type': 'application/json',
        'paddle-signature': sign(RAW_TRANSACTION),
      });
      await preserveFactoryRequestBody(req, PADDLE_LIVE_WEBHOOK_PATH);
      const prisma = fakePrisma();
      const res = mockRes();
      await paddleLiveWebhookHandler(req, res, { prisma });
      assert.equal(res.statusCode, 503);
      assert.equal(res.body.error, 'live_not_configured');
      assert.equal(prisma.rows.length, 0);
    },
  );
});

test('Live status never enables checkout and factory routing keeps Sandbox separate', async () => {
  await withEnv(
    () => {
      applySandboxProofEnv();
    },
    async () => {
      const res = mockRes();
      await paddleLiveStatusHandler({ method: 'GET' }, res);
      assert.equal(res.statusCode, 200);
      assert.equal(res.body.configured, false);
      assert.equal(res.body.public_checkout_enabled, false);
      assert.equal(res.body.erpnext_writes, false);

      const factory = readFileSync(join(process.cwd(), 'api/factory_router.js'), 'utf8');
      assert.match(factory, /paddleSandboxWebhookHandler/);
      assert.match(factory, /paddleLiveWebhookHandler/);
      assert.match(factory, /paddle\/live\/webhook/);
      assert.match(factory, /bodyParser:\s*false/);
      assert.equal(isPaddleWebhookPath('paddle/webhook'), true);
      assert.equal(isPaddleWebhookPath('paddle/live/webhook'), true);
      assert.equal(FACTORY_REQUEST_BODY_LIMIT, '1mb');

      const sandboxPage = readFileSync(join(process.cwd(), 'pages/billing/paddle-sandbox.js'), 'utf8');
      assert.match(sandboxPage, /environment !== 'sandbox'/);
      assert.match(sandboxPage, /token\?\.startsWith\('test_'\)/);
      assert.equal(existsSync(join(process.cwd(), 'pages/billing/paddle-live.js')), false);

      const pricing = readFileSync(join(process.cwd(), 'pages/pricing.js'), 'utf8');
      assert.doesNotMatch(pricing, /paddle-live|Checkout.open|Pay now/);
      if (existsSync(join(process.cwd(), 'components/BusinessAdminDeskPublicPricingPage.js'))) {
        const badPricing = readFileSync(
          join(process.cwd(), 'components/BusinessAdminDeskPublicPricingPage.js'),
          'utf8',
        );
        assert.match(badPricing, /Online checkout is not available/);
        assert.doesNotMatch(badPricing, /initializePaddle|Checkout.open/);
      }

      const liveTree = [
        'lib/server/paddle-live/config.js',
        'lib/server/paddle-live/webhook.js',
        'lib/server/paddle-live/state.js',
      ]
        .map((path) => readFileSync(join(process.cwd(), path), 'utf8'))
        .join('\n');
      assert.doesNotMatch(liveTree, /pwCustomer/);
      assert.doesNotMatch(liveTree, /from ['"].*erpnext/i);
      assert.match(liveTree, /PADDLE_LIVE_ERPNEXT_WRITES = false|erpnext_write: false/);
    },
  );
});
