import fs from 'fs';
import { PrismaClient } from '@prisma/client';

const DEFAULT_TELEMETRY_FILE = 'vanguard/audit-trail/telemetry-v1.jsonl';
const prisma = new PrismaClient();

function hasPostgres() {
  const pg = (process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.PRISMA_DATABASE_URL || '').toString().trim();
  return Boolean(pg);
}

function getTenantId() {
  // Tenant scoping is best-effort; many endpoints are root-scoped.
  return process.env.TENANT_ID || process.env.TENANT_SLUG || 'root';
}

function getFactoryId() {
  return process.env.FACTORY_ID || 'corpflow-factory';
}

function redactForTelemetry(value) {
  // Keep telemetry safe by removing obvious token-like substrings.
  const s = typeof value === 'string' ? value : String(value ?? '');
  return s
    .replace(/(Authorization:\s*)Bearer\s+[A-Za-z0-9\-_\.]+/gi, '$1Bearer [REDACTED]')
    .replace(/(Token\s+)[A-Za-z0-9\-_\.]+/gi, '$1[REDACTED]');
}

export function emitTelemetry(event) {
  const baseEvent = {
    schema_version: '1',
    occurred_at: new Date().toISOString(),
    factory_id: getFactoryId(),
    report_target: process.env.TELEMETRY_TARGET || 'file_local',
    tenant_id: getTenantId(),
    cmp: {
      ticket_id: event?.cmp?.ticket_id != null ? String(event.cmp.ticket_id) : 'n/a',
      action: event?.cmp?.action != null ? String(event.cmp.action) : 'unknown',
    },
    event_type: event.event_type,
    payload: event.payload || {},
  };

  // Postgres-first sink (best-effort). Never block the primary request path.
  if (hasPostgres()) {
    try {
      prisma.telemetryEvent
        .create({
          data: {
            occurredAt: new Date(baseEvent.occurred_at),
            tenantId: baseEvent.tenant_id ? String(baseEvent.tenant_id) : null,
            factoryId: baseEvent.factory_id ? String(baseEvent.factory_id) : null,
            eventType: String(baseEvent.event_type || 'unknown'),
            cmpTicketId: baseEvent?.cmp?.ticket_id ? String(baseEvent.cmp.ticket_id) : null,
            cmpAction: baseEvent?.cmp?.action ? String(baseEvent.cmp.action) : null,
            payload: baseEvent.payload || {},
          },
        })
        .catch(() => {});
    } catch (_) {}
  }

  // Legacy local JSONL sink (optional local-dev fallback).
  if (String(process.env.TELEMETRY_DISABLE_FILE_SINK || '').toLowerCase() !== 'true') {
    try {
      const telemetryFile = process.env.TELEMETRY_FILE_PATH || DEFAULT_TELEMETRY_FILE;
      fs.mkdirSync('vanguard/audit-trail', { recursive: true });
      fs.appendFileSync(telemetryFile, JSON.stringify(baseEvent) + '\n', 'utf8');
    } catch (_) {
      // Never block the primary request path because telemetry failed.
    }
  }

  // Optional remote sink (for CMP bubble integration).
  const endpoint = process.env.TELEMETRY_ENDPOINT_URL;
  if (endpoint) {
    try {
      // Node 18+ has fetch; if not available, swallow.
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(baseEvent),
      }).catch(() => {});
    } catch (_) {}
  }

  return baseEvent;
}

export function emitLogicFailure({
  source,
  severity = 'error',
  error,
  recommended_action,
  cmp,
  meta,
}) {
  const err = error ?? {};
  const error_message =
    err?.message != null ? redactForTelemetry(String(err.message)) : redactForTelemetry(String(err));
  const error_class = err?.name != null ? String(err.name) : 'Error';
  const stack_trace_redacted = err?.stack ? redactForTelemetry(String(err.stack)) : '';

  return emitTelemetry({
    event_type: 'logic_failure',
    cmp,
    payload: {
      source,
      severity,
      error_message,
      error_class,
      stack_trace_redacted,
      recommended_action: recommended_action || 'Check logs and retry with valid inputs.',
      meta: meta || {},
    },
  });
}

