/**
 * Tenant workflow operator helpers — list + status updates (no outbound IO).
 */

import { LWM_TENANT_ID } from './constants.js';

/** @type {readonly string[]} */
export const OPERATOR_STEP_TERMINAL_STATUSES = Object.freeze(['completed', 'cancelled']);

/**
 * @param {unknown} v
 * @returns {Record<string, unknown>}
 */
function asObject(v) {
  return v && typeof v === 'object' && !Array.isArray(v) ? /** @type {Record<string, unknown>} */ (v) : {};
}

/**
 * @param {Date | string | null | undefined} d
 * @returns {string | null}
 */
export function isoOrNull(d) {
  if (!d) return null;
  if (d instanceof Date) return d.toISOString();
  const s = String(d);
  return s || null;
}

/**
 * @param {{
 *   id: string;
 *   tenantId: string;
 *   workflowRunId: string;
 *   stepKey: string;
 *   stepType: string;
 *   title: string;
 *   status: string;
 *   dataJson?: unknown;
 *   createdAt: Date | string;
 *   updatedAt: Date | string;
 *   run?: {
 *     workflowKey: string;
 *     workflowVersion: number;
 *     sourceEventId: string;
 *     sourceThreadId?: string | null;
 *     status: string;
 *   } | null;
 * }} row
 * @returns {Record<string, unknown>}
 */
export function serializeWorkflowStepForOperator(row) {
  const data = asObject(row.dataJson);
  const run = row.run || null;
  return {
    id: row.id,
    tenant_id: row.tenantId,
    workflow_run_id: row.workflowRunId,
    step_key: row.stepKey,
    step_type: row.stepType,
    title: row.title,
    status: row.status,
    created_at: isoOrNull(row.createdAt),
    updated_at: isoOrNull(row.updatedAt),
    workflow_key: run?.workflowKey ?? null,
    workflow_version: run?.workflowVersion ?? null,
    workflow_run_status: run?.status ?? null,
    source_event_id: data.event_id ?? run?.sourceEventId ?? null,
    source_thread_id: data.thread_id ?? run?.sourceThreadId ?? null,
    lead: {
      first_name: data.first_name ?? null,
      surname: data.surname ?? null,
      full_name: data.full_name ?? null,
      email: data.email ?? null,
      whatsapp_or_mobile: data.whatsapp_or_mobile ?? null,
      preferred_contact_method: data.preferred_contact_method ?? null,
      recommended_channel: data.recommended_channel ?? null,
      message_excerpt: data.message_excerpt ?? null,
    },
    origin: {
      source_host: data.source_host ?? null,
      source_path: data.source_path ?? null,
    },
  };
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{
 *   tenantId?: string;
 *   status?: string;
 *   workflowKey?: string;
 *   limit?: number;
 * }} opts
 * @returns {Promise<{ ok: true; count: number; steps: Record<string, unknown>[] } | { ok: false; error: string; message: string }>}
 */
export async function loadTenantWorkflowStepsForOperator(prisma, opts = {}) {
  const tenantId = opts.tenantId != null ? String(opts.tenantId).trim() : LWM_TENANT_ID;
  if (!tenantId) {
    return { ok: false, error: 'tenant_id_required', message: 'tenant_id is required.' };
  }

  const statusRaw = opts.status != null ? String(opts.status).trim().toLowerCase() : 'open';
  const limit = Math.min(200, Math.max(1, Number(opts.limit) || 50));
  const workflowKey = opts.workflowKey != null ? String(opts.workflowKey).trim() : '';

  /** @type {Record<string, unknown>} */
  const where = { tenantId };
  if (statusRaw && statusRaw !== 'all') where.status = statusRaw;
  if (workflowKey) where.run = { workflowKey: workflowKey };

  try {
    const rows = await prisma.workflowStep.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        tenantId: true,
        workflowRunId: true,
        stepKey: true,
        stepType: true,
        title: true,
        status: true,
        dataJson: true,
        createdAt: true,
        updatedAt: true,
        run: {
          select: {
            workflowKey: true,
            workflowVersion: true,
            sourceEventId: true,
            sourceThreadId: true,
            status: true,
          },
        },
      },
    });

    const steps = rows.map((row) => serializeWorkflowStepForOperator(row));
    return { ok: true, count: steps.length, steps };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: 'workflow_steps_load_failed', message: msg };
  }
}

/**
 * Derive workflow run status after a step terminal transition.
 *
 * @param {string} stepStatus
 * @returns {'completed' | 'cancelled'}
 */
export function deriveRunStatusFromStepTerminal(stepStatus) {
  return stepStatus === 'cancelled' ? 'cancelled' : 'completed';
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{
 *   tenantId: string;
 *   stepId: string;
 *   status: 'completed' | 'cancelled';
 * }} opts
 * @returns {Promise<
 *   | { ok: true; step: Record<string, unknown>; run: { id: string; status: string } }
 *   | { ok: false; error: string; message: string; http_status?: number }
 * >}
 */
export async function patchTenantWorkflowStepStatus(prisma, opts) {
  const tenantId = String(opts.tenantId || '').trim();
  const stepId = String(opts.stepId || '').trim();
  const status = String(opts.status || '').trim().toLowerCase();

  if (!tenantId || !stepId) {
    return {
      ok: false,
      error: 'missing_fields',
      message: 'tenant_id and step_id are required.',
      http_status: 400,
    };
  }
  if (!OPERATOR_STEP_TERMINAL_STATUSES.includes(status)) {
    return {
      ok: false,
      error: 'invalid_status',
      message: 'status must be completed or cancelled.',
      http_status: 400,
    };
  }

  const existing = await prisma.workflowStep.findFirst({
    where: { id: stepId, tenantId },
    select: {
      id: true,
      tenantId: true,
      workflowRunId: true,
      status: true,
    },
  });

  if (!existing) {
    return {
      ok: false,
      error: 'step_not_found',
      message: 'Workflow step not found for tenant.',
      http_status: 404,
    };
  }

  if (existing.status === status) {
    const run = await prisma.workflowRun.findFirst({
      where: { id: existing.workflowRunId, tenantId },
      select: { id: true, status: true },
    });
    const full = await prisma.workflowStep.findFirst({
      where: { id: stepId, tenantId },
      include: {
        run: {
          select: {
            workflowKey: true,
            workflowVersion: true,
            sourceEventId: true,
            sourceThreadId: true,
            status: true,
          },
        },
      },
    });
    return {
      ok: true,
      step: serializeWorkflowStepForOperator(full),
      run: { id: run?.id || existing.workflowRunId, status: run?.status || status },
    };
  }

  const runStatus = deriveRunStatusFromStepTerminal(status);

  try {
    await prisma.$transaction([
      prisma.workflowStep.updateMany({
        where: { id: stepId, tenantId },
        data: { status },
      }),
      prisma.workflowRun.updateMany({
        where: { id: existing.workflowRunId, tenantId },
        data: {
          status: runStatus,
          currentStepKey: null,
        },
      }),
    ]);

    const full = await prisma.workflowStep.findFirst({
      where: { id: stepId, tenantId },
      include: {
        run: {
          select: {
            workflowKey: true,
            workflowVersion: true,
            sourceEventId: true,
            sourceThreadId: true,
            status: true,
          },
        },
      },
    });

    const run = await prisma.workflowRun.findFirst({
      where: { id: existing.workflowRunId, tenantId },
      select: { id: true, status: true },
    });

    return {
      ok: true,
      step: serializeWorkflowStepForOperator(full),
      run: { id: run?.id || existing.workflowRunId, status: run?.status || runStatus },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      error: 'workflow_step_patch_failed',
      message: msg,
      http_status: 500,
    };
  }
}
