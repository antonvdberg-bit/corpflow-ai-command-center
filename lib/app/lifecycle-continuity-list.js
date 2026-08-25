/**
 * #1072 — load a staff-only lifecycle continuity trace from existing
 * Prospect Operations + Company Master projections. No schema.
 */

import { loadClientDetail, loadClientsList } from './clients-list.js';
import { loadProspectDetail } from './prospect-operations-list.js';
import {
  SYNTHETIC_LIFECYCLE_CLIENT_ID,
  SYNTHETIC_LIFECYCLE_PROSPECT_ID,
  buildLifecyclePayload,
  linkedClientRef,
  matchClientForProspect,
  projectLifecycleTrace,
} from './lifecycle-continuity.js';

/**
 * @param {Record<string, unknown>} prospect
 * @param {{
 *   proofMode?: boolean,
 *   forceFixture?: boolean,
 *   nodeEnv?: string,
 *   prisma?: import('@prisma/client').PrismaClient,
 * }} [opts]
 */
export async function attachLifecycleToProspect(prospect, opts = {}) {
  if (!prospect || typeof prospect !== 'object') return prospect;
  const loaded = await loadClientsList(opts);
  const clients = loaded.ok ? loaded.clients : [];
  const client = matchClientForProspect(prospect, clients);
  const linked = linkedClientRef(client);
  const lifecycle = projectLifecycleTrace({
    prospect: { ...prospect, linked_client: linked },
    client,
    proofMode: opts.proofMode === true,
  });
  return {
    ...prospect,
    linked_client: linked,
    lifecycle,
  };
}

/**
 * @param {Record<string, unknown>} client
 * @param {{
 *   proofMode?: boolean,
 *   forceFixture?: boolean,
 *   nodeEnv?: string,
 *   prisma?: import('@prisma/client').PrismaClient,
 * }} [opts]
 */
export async function attachLifecycleToClient(client, opts = {}) {
  if (!client || typeof client !== 'object') return client;
  const related = Array.isArray(client.related_prospects) ? client.related_prospects : [];
  const firstId = String(related[0]?.id || '').trim();
  let prospect = null;
  if (firstId) {
    const loaded = await loadProspectDetail({
      id: firstId,
      proofMode: opts.proofMode,
      forceFixture: opts.forceFixture,
      nodeEnv: opts.nodeEnv,
      prisma: opts.prisma,
    });
    if (loaded.ok) prospect = loaded.prospect;
  }
  const lifecycle = projectLifecycleTrace({
    prospect,
    client,
    proofMode: opts.proofMode === true,
  });
  return {
    ...client,
    lifecycle,
  };
}

/**
 * @param {{
 *   prospectId?: string,
 *   companyId?: string,
 *   proofMode?: boolean,
 *   forceFixture?: boolean,
 *   nodeEnv?: string,
 *   prisma?: import('@prisma/client').PrismaClient,
 * }} [opts]
 */
export async function loadLifecycleTrace(opts = {}) {
  let prospectId = String(opts.prospectId || '').trim();
  let companyId = String(opts.companyId || '').trim();
  if (!prospectId && !companyId && opts.proofMode === true) {
    prospectId = SYNTHETIC_LIFECYCLE_PROSPECT_ID;
    companyId = SYNTHETIC_LIFECYCLE_CLIENT_ID;
  }
  if (!prospectId && !companyId) {
    return {
      ok: false,
      error: 'id_required',
      http_status: 400,
      data_source: 'none',
    };
  }

  if (companyId && !prospectId) {
    const clientLoaded = await loadClientDetail({
      id: companyId,
      proofMode: opts.proofMode,
      forceFixture: opts.forceFixture,
      nodeEnv: opts.nodeEnv,
      prisma: opts.prisma,
    });
    if (!clientLoaded.ok) {
      return {
        ok: false,
        error: clientLoaded.error,
        http_status: clientLoaded.http_status || 500,
        data_source: clientLoaded.data_source,
      };
    }
    const related = Array.isArray(clientLoaded.client.related_prospects)
      ? clientLoaded.client.related_prospects
      : [];
    prospectId = String(related[0]?.id || '').trim();
    const prospectLoaded = prospectId
      ? await loadProspectDetail({
          id: prospectId,
          proofMode: opts.proofMode,
          forceFixture: opts.forceFixture,
          nodeEnv: opts.nodeEnv,
          prisma: opts.prisma,
        })
      : { ok: false, prospect: null, data_source: clientLoaded.data_source };
    const prospect = prospectLoaded.ok ? prospectLoaded.prospect : null;
    const trace = projectLifecycleTrace({
      prospect,
      client: clientLoaded.client,
      proofMode: opts.proofMode === true,
    });
    return {
      ok: true,
      data_source: clientLoaded.data_source,
      payload: buildLifecyclePayload({
        trace,
        data_source: clientLoaded.data_source,
        proof_mode: opts.proofMode === true,
      }),
    };
  }

  const prospectLoaded = await loadProspectDetail({
    id: prospectId,
    proofMode: opts.proofMode,
    forceFixture: opts.forceFixture,
    nodeEnv: opts.nodeEnv,
    prisma: opts.prisma,
  });
  if (!prospectLoaded.ok) {
    return {
      ok: false,
      error: prospectLoaded.error,
      http_status: prospectLoaded.http_status || 500,
      data_source: prospectLoaded.data_source,
    };
  }
  const clientsLoaded = await loadClientsList(opts);
  const clients = clientsLoaded.ok ? clientsLoaded.clients : [];
  const client =
    (companyId && clients.find((row) => String(row.company_id) === companyId)) ||
    matchClientForProspect(prospectLoaded.prospect, clients);
  const trace = projectLifecycleTrace({
    prospect: prospectLoaded.prospect,
    client,
    proofMode: opts.proofMode === true,
  });
  return {
    ok: true,
    data_source: prospectLoaded.data_source,
    payload: buildLifecyclePayload({
      trace,
      data_source: prospectLoaded.data_source,
      proof_mode: opts.proofMode === true,
    }),
  };
}
