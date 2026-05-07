/**
 * LuxeMaurice-only minimal CRM in lead.qualification_json.lux_operator_workflow.
 * Not exposed on public concierge surfaces (operator APIs + /change only).
 */

/** @type {readonly string[]} */
export const LUX_LEAD_CRM_STAGES = Object.freeze([
  'new',
  'qualified',
  'viewing_requested',
  'follow_up',
  'closed',
  'lost',
]);

const STAGE_LABEL = {
  new: 'New',
  qualified: 'Qualified',
  viewing_requested: 'Viewing Requested',
  follow_up: 'Follow-up',
  closed: 'Closed',
  lost: 'Lost',
};

const MAX_NOTES = 100;
const MAX_STAGE_AUDIT = 80;
const MAX_ACTIVITY = 150;

/** Open leads with no touch for this long → `stale_lead` (computed). */
export const LUX_CRM_STALE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * @param {unknown} payload Session JWT payload (tenant).
 */
export function luxOperatorActorLabelFromPayload(payload) {
  if (!payload || String(payload.typ || '').toLowerCase() !== 'tenant') return 'unknown';
  const u = payload.username != null ? String(payload.username).trim() : '';
  if (u) return u.slice(0, 320);
  const uid = payload.user_id != null ? String(payload.user_id).trim() : '';
  if (uid) return `operator_id:${uid.slice(0, 64)}`;
  const rid = payload.row_id != null ? String(payload.row_id).trim() : '';
  if (rid) return `pin_session:${rid.slice(0, 64)}`;
  const tid = payload.tenant_id != null ? String(payload.tenant_id).trim() : '';
  return tid ? `tenant:${tid.slice(0, 64)}` : 'tenant_unknown';
}

/**
 * @param {unknown} s
 * @returns {string | null}
 */
export function normalizeLuxLeadCrmStage(s) {
  const v = s != null ? String(s).trim().toLowerCase().replace(/\s+/g, '_') : '';
  if (!v) return null;
  const map = {
    new: 'new',
    qualified: 'qualified',
    viewing_requested: 'viewing_requested',
    'viewing-requested': 'viewing_requested',
    viewingrequested: 'viewing_requested',
    follow_up: 'follow_up',
    'follow-up': 'follow_up',
    followup: 'follow_up',
    closed: 'closed',
    lost: 'lost',
  };
  const x = map[v] || (LUX_LEAD_CRM_STAGES.includes(v) ? v : null);
  return x || null;
}

/**
 * @param {string} stage
 */
export function luxLeadCrmStageLabel(stage) {
  const k = normalizeLuxLeadCrmStage(stage) || 'new';
  return STAGE_LABEL[k] || 'New';
}

function parseOwner(ow) {
  if (!ow.owner || typeof ow.owner !== 'object') return null;
  const un = ow.owner.username != null ? String(ow.owner.username).trim().slice(0, 200) : '';
  if (!un) return null;
  return {
    username: un,
    assigned_at: ow.owner.assigned_at != null ? String(ow.owner.assigned_at).trim().slice(0, 40) : null,
    assigned_by: ow.owner.assigned_by != null ? String(ow.owner.assigned_by).trim().slice(0, 320) : null,
  };
}

function parseStageAudit(ow) {
  const raw = Array.isArray(ow.stage_audit) ? ow.stage_audit : [];
  return raw
    .map((e) => {
      if (!e || typeof e !== 'object') return null;
      const at = e.at != null ? String(e.at).trim() : '';
      const operator_label = e.operator_label != null ? String(e.operator_label).trim().slice(0, 320) : '';
      const action = e.action != null ? String(e.action).trim() : '';
      const previous_stage = e.previous_stage != null ? String(e.previous_stage).trim() : '';
      const new_stage = e.new_stage != null ? String(e.new_stage).trim() : '';
      if (!at || action !== 'stage_changed') return null;
      return { at, operator_label: operator_label || 'unknown', action, previous_stage, new_stage };
    })
    .filter(Boolean)
    .slice(-MAX_STAGE_AUDIT);
}

function parseActivity(ow) {
  const raw = Array.isArray(ow.activity) ? ow.activity : [];
  return raw
    .map((e) => {
      if (!e || typeof e !== 'object') return null;
      const at = e.at != null ? String(e.at).trim() : '';
      const actor_label = e.actor_label != null ? String(e.actor_label).trim().slice(0, 320) : '';
      const kind = e.kind != null ? String(e.kind).trim().slice(0, 64) : '';
      if (!at || !kind) return null;
      const detail = e.detail && typeof e.detail === 'object' ? e.detail : {};
      return { at, actor_label: actor_label || 'unknown', kind, detail };
    })
    .filter(Boolean)
    .slice(-MAX_ACTIVITY);
}

function appendActivity(activity, entry) {
  return [...activity, entry].slice(-MAX_ACTIVITY);
}

/**
 * @param {string} nowIso
 */
export function defaultLuxOperatorWorkflow(nowIso) {
  return {
    stage: 'new',
    stage_updated_at: nowIso,
    internal_notes: [],
    follow_up_status: null,
    next_action_at: null,
    next_action_note: null,
    owner: null,
    stage_audit: [],
    activity: [{ at: nowIso, actor_label: 'concierge_web', kind: 'lead_created', detail: {} }],
  };
}

/**
 * @param {unknown} qj qualification_json root
 */
export function parseLuxOperatorWorkflow(qj) {
  const root = qj && typeof qj === 'object' ? qj : {};
  const ow = root.lux_operator_workflow && typeof root.lux_operator_workflow === 'object' ? root.lux_operator_workflow : {};
  const stage = normalizeLuxLeadCrmStage(ow.stage) || 'new';
  const rawNotes = Array.isArray(ow.internal_notes) ? ow.internal_notes : [];
  const internal_notes = rawNotes
    .map((n) => {
      if (!n || typeof n !== 'object') return null;
      const at = n.at != null ? String(n.at).trim() : '';
      const text = n.text != null ? String(n.text).trim() : '';
      if (!at || !text) return null;
      return { at, text: text.slice(0, 4000) };
    })
    .filter(Boolean)
    .slice(-MAX_NOTES);
  const stage_updated_at = ow.stage_updated_at != null ? String(ow.stage_updated_at).trim() : null;
  const follow_up_status =
    ow.follow_up_status != null && String(ow.follow_up_status).trim()
      ? String(ow.follow_up_status).trim().slice(0, 500)
      : null;
  let next_action_at = ow.next_action_at != null ? String(ow.next_action_at).trim().slice(0, 80) : '';
  if (next_action_at) {
    const trial = new Date(next_action_at);
    if (Number.isNaN(trial.getTime())) next_action_at = '';
  } else next_action_at = '';
  const next_action_note =
    ow.next_action_note != null && String(ow.next_action_note).trim()
      ? String(ow.next_action_note).trim().slice(0, 1000)
      : null;
  return {
    stage,
    stage_updated_at: stage_updated_at || null,
    internal_notes,
    follow_up_status,
    next_action_at: next_action_at || null,
    next_action_note,
    owner: parseOwner(ow),
    stage_audit: parseStageAudit(ow),
    activity: parseActivity(ow),
  };
}

/**
 * Lightweight CRM health flags (computed only — not a separate persisted model).
 * @param {ReturnType<typeof parseLuxOperatorWorkflow>} ow
 * @param {{ lead_updated_at?: Date | string | null, now?: Date }} opts
 */
export function computeLuxLeadCrmSignals(ow, opts) {
  const now = opts?.now instanceof Date ? opts.now : new Date();
  const nowMs = now.getTime();

  let overdue_follow_up = false;
  if (ow.next_action_at) {
    const t = new Date(ow.next_action_at).getTime();
    if (!Number.isNaN(t) && t < nowMs) overdue_follow_up = true;
  }

  const terminal = ow.stage === 'closed' || ow.stage === 'lost';
  let stale_lead = false;
  if (!terminal && opts?.lead_updated_at != null) {
    try {
      const u = opts.lead_updated_at instanceof Date ? opts.lead_updated_at : new Date(opts.lead_updated_at);
      const uMs = u.getTime();
      if (!Number.isNaN(uMs) && nowMs - uMs > LUX_CRM_STALE_MS) stale_lead = true;
    } catch {
      /* ignore */
    }
  }

  const untouched_new = ow.stage === 'new' && ow.internal_notes.length === 0;

  return { overdue_follow_up, stale_lead, untouched_new };
}

/**
 * @param {Record<string, unknown>} qualificationJson
 * @param {{
 *   stage?: string | null,
 *   note?: string | null,
 *   follow_up_status?: string | null,
 *   assign_owner?: string | null,
 *   next_action_at?: string | null,
 *   next_action_note?: string | null,
 * }} patch assign_owner: undefined = skip; null or '' = clear
 * @param {string} actorLabel
 * @param {string} nowIso
 */
export function mergeLuxOperatorWorkflowPatch(qualificationJson, patch, actorLabel, nowIso) {
  const qj = qualificationJson && typeof qualificationJson === 'object' ? { ...qualificationJson } : {};
  const prev = parseLuxOperatorWorkflow(qj);
  const actor = String(actorLabel || 'unknown').trim().slice(0, 320) || 'unknown';

  const next = {
    stage: prev.stage,
    stage_updated_at: prev.stage_updated_at || nowIso,
    internal_notes: [...prev.internal_notes],
    follow_up_status: prev.follow_up_status,
    next_action_at: prev.next_action_at,
    next_action_note: prev.next_action_note,
    owner: prev.owner ? { ...prev.owner } : null,
    stage_audit: [...prev.stage_audit],
    activity: [...prev.activity],
  };

  let scheduleChanged = false;
  if (patch.next_action_at !== undefined) {
    const v = patch.next_action_at;
    const prevAt = prev.next_action_at || null;
    if (v === null || v === '') {
      if (prevAt) {
        next.next_action_at = null;
        scheduleChanged = true;
      }
    } else {
      const d = new Date(String(v));
      if (!Number.isNaN(d.getTime())) {
        const iso = d.toISOString();
        if (iso !== prevAt) {
          next.next_action_at = iso;
          scheduleChanged = true;
        }
      }
    }
  }
  if (patch.next_action_note !== undefined) {
    const v = patch.next_action_note;
    const nn = v === null || v === '' ? null : String(v).trim().slice(0, 1000) || null;
    const prevN = prev.next_action_note || '';
    const nextN = nn || '';
    if (prevN !== nextN) {
      next.next_action_note = nn;
      scheduleChanged = true;
    }
  }
  if (scheduleChanged) {
    next.activity = appendActivity(next.activity, {
      at: nowIso,
      actor_label: actor,
      kind: 'next_action_updated',
      detail: {
        next_action_at: next.next_action_at,
        next_action_note_preview: next.next_action_note ? String(next.next_action_note).slice(0, 120) : '',
      },
    });
  }

  if (patch.stage != null && String(patch.stage).trim()) {
    const ns = normalizeLuxLeadCrmStage(patch.stage);
    if (ns && ns !== prev.stage) {
      next.stage = ns;
      next.stage_updated_at = nowIso;
      next.stage_audit.push({
        at: nowIso,
        operator_label: actor,
        action: 'stage_changed',
        previous_stage: prev.stage,
        new_stage: ns,
      });
      next.stage_audit = next.stage_audit.slice(-MAX_STAGE_AUDIT);
      next.activity = appendActivity(next.activity, {
        at: nowIso,
        actor_label: actor,
        kind: 'stage_changed',
        detail: { from: prev.stage, to: ns },
      });
    }
  }

  if (patch.follow_up_status !== undefined) {
    const f = patch.follow_up_status;
    const prevF = prev.follow_up_status || '';
    const nextF = f === null || f === '' ? null : String(f).trim().slice(0, 500) || null;
    next.follow_up_status = nextF;
    const prevStr = prevF != null ? String(prevF) : '';
    const nextStr = nextF != null ? String(nextF) : '';
    if (prevStr !== nextStr) {
      next.activity = appendActivity(next.activity, {
        at: nowIso,
        actor_label: actor,
        kind: 'follow_up_updated',
        detail: { status: nextStr },
      });
    }
  }

  if (patch.note != null && String(patch.note).trim()) {
    const text = String(patch.note).trim().slice(0, 4000);
    next.internal_notes.push({ at: nowIso, text });
    next.internal_notes = next.internal_notes.slice(-MAX_NOTES);
    next.activity = appendActivity(next.activity, {
      at: nowIso,
      actor_label: actor,
      kind: 'note_added',
      detail: { preview: text.slice(0, 200) },
    });
  }

  if (patch.assign_owner !== undefined) {
    const raw = patch.assign_owner == null ? '' : String(patch.assign_owner).trim().slice(0, 200);
    const prevUn = prev.owner?.username || '';
    if (!raw) {
      if (prev.owner) {
        next.owner = null;
        next.activity = appendActivity(next.activity, {
          at: nowIso,
          actor_label: actor,
          kind: 'owner_cleared',
          detail: { previous_owner: prevUn },
        });
      }
    } else if (raw !== prevUn) {
      next.owner = { username: raw, assigned_at: nowIso, assigned_by: actor };
      next.activity = appendActivity(next.activity, {
        at: nowIso,
        actor_label: actor,
        kind: 'owner_assigned',
        detail: { owner_username: raw },
      });
    }
  }

  // Preserve stage audit if only note/follow/owner (already copied); if stage didn't change, stage_audit unchanged except stage branch
  qj.lux_operator_workflow = {
    stage: next.stage,
    stage_updated_at: next.stage_updated_at,
    internal_notes: next.internal_notes,
    follow_up_status: next.follow_up_status,
    next_action_at: next.next_action_at,
    next_action_note: next.next_action_note,
    owner: next.owner,
    stage_audit: next.stage_audit,
    activity: next.activity,
  };
  return qj;
}

/**
 * Build API list/detail shape + chronological activity (oldest → newest).
 * @param {ReturnType<typeof parseLuxOperatorWorkflow>} ow
 * @param {{ lead_created_at?: string | Date | null, lead_updated_at?: string | Date | null }} [opts]
 */
export function luxOperatorWorkflowForApiList(ow, opts) {
  const notes = ow.internal_notes || [];
  const latest = notes.length ? notes[notes.length - 1] : null;
  let activity = [...(ow.activity || [])];
  const hasCreated = activity.some((a) => a.kind === 'lead_created');
  if (!hasCreated && opts?.lead_created_at) {
    try {
      const d = opts.lead_created_at instanceof Date ? opts.lead_created_at : new Date(opts.lead_created_at);
      const iso = d.toISOString();
      activity = [{ at: iso, actor_label: 'concierge_web', kind: 'lead_created', detail: {} }, ...activity];
    } catch {
      /* ignore */
    }
  }
  activity.sort((a, b) => String(a.at).localeCompare(String(b.at)));
  const signals = computeLuxLeadCrmSignals(ow, { lead_updated_at: opts?.lead_updated_at ?? null });
  return {
    stage: ow.stage,
    stage_label: luxLeadCrmStageLabel(ow.stage),
    stage_updated_at: ow.stage_updated_at,
    follow_up_status: ow.follow_up_status,
    next_action_at: ow.next_action_at,
    next_action_note: ow.next_action_note,
    overdue_follow_up: signals.overdue_follow_up,
    stale_lead: signals.stale_lead,
    untouched_new: signals.untouched_new,
    latest_note: latest,
    internal_notes: notes.slice(-25),
    owner: ow.owner,
    stage_audit: (ow.stage_audit || []).slice(-25),
    activity,
  };
}

export function activityKindLabel(kind) {
  const k = String(kind || '');
  const map = {
    lead_created: 'Lead created',
    stage_changed: 'Stage changed',
    note_added: 'Note added',
    follow_up_updated: 'Follow-up updated',
    owner_assigned: 'Owner assigned',
    owner_cleared: 'Owner cleared',
    next_action_updated: 'Next action scheduled',
  };
  return map[k] || k || 'Activity';
}
