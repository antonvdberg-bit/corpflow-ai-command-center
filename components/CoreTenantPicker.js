/**
 * IM-3 (2026-06-16) — Core-host workspace picker.
 *
 * Canonical spec: docs/operations/OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md §10 IM-3.
 *
 * Approved scope (per Anton's IM-3 approval):
 *
 *   - Renders the picker UI ONLY on `core.corpflowai.com/change` for DB-backed
 *     logged-in users with ≥ 1 effective membership. The decision gate lives
 *     in `shouldRenderPicker` (lib/ui/core-tenant-picker-helpers.js) and is
 *     applied by `pages/change.js` BEFORE mounting this component — so this
 *     component does not have to re-implement the gate.
 *   - Consumes already-approved endpoints only:
 *       GET  /api/membership/effective    (IM-2)
 *       GET  /api/ui/context              (IM-2 / IM-4 — already fetched
 *                                          upstream and passed in as a prop;
 *                                          we DO NOT re-fetch from this file)
 *       POST /api/membership/switch       (IM-5)
 *       POST /api/membership/leave        (IM-5)
 *   - Reads `corpflow_csrf` cookie client-side; echoes it as
 *     `X-CorpFlow-CSRF` header on every state-changing POST.
 *   - NO database writes, NO audit writes, NO seeding, NO automation events
 *     (per IM-3 guardrail #2). The only state changes are server-side cookie
 *     re-issues performed by the already-approved IM-5 endpoints.
 *   - NO auto-redirect after switch / leave (per IM-3 guardrail #7 + the
 *     approved scope). Server-supplied `redirect_to` is rendered as an
 *     explicit link the user clicks.
 *   - Every error mode surfaces visibly via the `formatErrorMessage` helper
 *     (per IM-3 guardrail #6). No silent failures.
 *   - Accessibility: semantic <section> / <h2> / <ul> / <li> / <button>
 *     markup, ARIA live region for status, `aria-current="true"` on the
 *     row matching `acting_tenant_id`, disabled state on the currently-
 *     acting button, full keyboard operability (native <button> elements).
 *
 * NOT in scope (deferred to later packets):
 *
 *   - Audit writes (IM-7 owns those).
 *   - Server-side enforcement that scoped queries respect `acting_tenant_id`
 *     (IM-6 owns CMP enforcement).
 *   - Picker visibility on tenant hosts (IM-4 ships a navigation link only).
 *   - Login redirect resolver UX (IM-5 ships the server-side resolver).
 *
 * Render contract (the component file source is asserted by
 * node-tests/im-3-picker-render.test.mjs):
 *
 *   <section id="cf-core-tenant-picker"
 *            aria-labelledby="cf-core-tenant-picker-heading"
 *            data-cf-core-tenant-picker="true">
 *     <h2 id="cf-core-tenant-picker-heading">Your workspaces</h2>
 *     <div id="cf-core-tenant-picker-status"
 *          role="status"
 *          aria-live="polite">...</div>
 *     <ul id="cf-core-tenant-picker-list">
 *       <li data-cf-core-tenant-picker-row="<tenant_id>"
 *           aria-current="true|undefined">
 *         <button type="button" aria-label="Switch to <tenant_name>">...</button>
 *       </li>
 *       ...
 *     </ul>
 *     <button data-cf-core-tenant-picker-leave="true">Leave acting tenant</button>?
 *     <a data-cf-core-tenant-picker-open-redirect="true" href="<https://...>">
 *       Open <tenant_name> Change Console
 *     </a>?
 *   </section>
 */

import { useCallback, useEffect, useState } from 'react';
import {
  PICKER_SECTION_ID,
  PICKER_HEADING_ID,
  PICKER_HEADING_TEXT,
  PICKER_STATUS_ID,
  PICKER_LIST_ID,
  PICKER_DATA_ATTR,
  PICKER_ROW_DATA_ATTR,
  PICKER_CSRF_UNAVAILABLE_DATA_ATTR,
  PICKER_LEAVE_BUTTON_DATA_ATTR,
  PICKER_OPEN_REDIRECT_DATA_ATTR,
  PICKER_LIFECYCLE,
  PICKER_ROW_STATE,
  buildEffectiveMembershipsRequest,
  buildSwitchRequest,
  buildLeaveRequest,
  parseEffectiveMembershipsResponse,
  parseSwitchResponse,
  parseLeaveResponse,
  readCorpflowCsrfCookie,
  describeMembershipRow,
  shouldShowLeaveButton,
  describeOpenRedirectLink,
  formatErrorMessage,
} from '../lib/ui/core-tenant-picker-helpers.js';

const CONTAINER_STYLE = {
  marginBottom: 16,
  padding: '12px 16px',
  borderRadius: 10,
  border: '1px solid rgba(148, 163, 184, 0.35)',
  background: 'rgba(15, 23, 42, 0.55)',
  color: '#e2e8f0',
  fontSize: 13,
};

const HEADING_STYLE = {
  margin: 0,
  marginBottom: 8,
  fontSize: 13,
  fontWeight: 800,
  letterSpacing: '0.04em',
  color: '#e0f2fe',
};

const STATUS_STYLE = {
  margin: 0,
  marginBottom: 8,
  fontSize: 12,
  color: '#bae6fd',
  minHeight: 16,
};

const STATUS_ERROR_STYLE = {
  ...STATUS_STYLE,
  color: '#fecaca',
};

const LIST_STYLE = {
  margin: 0,
  padding: 0,
  listStyle: 'none',
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
};

const ROW_STYLE = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid rgba(148,163,184,0.20)',
  background: 'rgba(2,6,23,0.35)',
};

const ROW_ACTIVE_STYLE = {
  ...ROW_STYLE,
  border: '1px solid rgba(56,189,248,0.55)',
  background: 'rgba(56,189,248,0.10)',
};

const ROW_NAME_STYLE = {
  fontWeight: 700,
  color: '#e2e8f0',
};

const ROW_META_STYLE = {
  fontSize: 11,
  color: '#94a3b8',
  marginTop: 2,
};

const SWITCH_BUTTON_STYLE = {
  padding: '6px 10px',
  borderRadius: 6,
  border: '1px solid #38bdf8',
  background: 'transparent',
  color: '#e0f2fe',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
};

const SWITCH_BUTTON_DISABLED_STYLE = {
  ...SWITCH_BUTTON_STYLE,
  border: '1px solid #334155',
  color: '#94a3b8',
  cursor: 'not-allowed',
};

const LEAVE_BUTTON_STYLE = {
  marginTop: 10,
  padding: '6px 10px',
  borderRadius: 6,
  border: '1px solid #f59e0b',
  background: 'transparent',
  color: '#fde68a',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
};

const REDIRECT_LINK_STYLE = {
  display: 'inline-block',
  marginTop: 10,
  color: '#bae6fd',
  textDecoration: 'underline',
  fontWeight: 600,
};

/**
 * The component is intentionally controlled by a single `lifecycle` state
 * + a `rowState` map keyed by tenant_id. We do not use a reducer here
 * because the state graph is small (4 lifecycle values × per-row state)
 * and using useState keeps the test surface aligned with the existing
 * `pages/change.js` patterns (no new reducer abstraction to learn).
 *
 * Props:
 *   - `actingTenantId`: passed in from `/api/ui/context` (already fetched
 *     by `pages/change.js`). We do NOT re-fetch context here.
 *   - `effectiveMembershipsCount`: same source — used only to decide
 *     whether the IM-3 gate is satisfied (the parent re-checks before
 *     mounting, so we treat it as a sanity-check, not a primary gate).
 *
 * Anything outside the contract above is NOT a render concern — it
 * belongs in the helpers module so it can be tested without a DOM.
 */
export default function CoreTenantPicker({ actingTenantId = null, effectiveMembershipsCount = null }) {
  const [lifecycle, setLifecycle] = useState(PICKER_LIFECYCLE.INITIAL);
  const [memberships, setMemberships] = useState([]);
  const [statusMessage, setStatusMessage] = useState('Loading your workspaces…');
  const [statusKind, setStatusKind] = useState('info');
  const [rowStates, setRowStates] = useState({});
  const [openRedirect, setOpenRedirect] = useState(null);
  const [csrfAvailable, setCsrfAvailable] = useState(true);
  // Echo from server after a successful switch (so the row reflects the
  // newest acting tenant without re-fetching context). null until first
  // successful action.
  const [overrideActingTenantId, setOverrideActingTenantId] = useState(null);

  const effectiveActingTenantId = overrideActingTenantId !== null ? overrideActingTenantId : actingTenantId;

  /**
   * Load memberships on mount. Wrapped in `useCallback` so the effect's
   * dependency array stays stable and ESLint can verify it. The fetch
   * itself runs in `useEffect` so it never executes during SSR (Next.js
   * server render path) — guardrail #5 keeps tenant-host HTML clean.
   */
  const loadMemberships = useCallback(async () => {
    setLifecycle(PICKER_LIFECYCLE.LOADING_MEMBERSHIPS);
    setStatusMessage('Loading your workspaces…');
    setStatusKind('info');
    try {
      const [url, init] = buildEffectiveMembershipsRequest();
      const res = await fetch(url, init);
      let body = null;
      try {
        body = await res.json();
      } catch (_jsonErr) {
        body = null;
      }
      const parsed = parseEffectiveMembershipsResponse({ status: res.status, body });
      if (parsed.kind === 'ok') {
        setMemberships(parsed.memberships);
        setLifecycle(PICKER_LIFECYCLE.READY);
        setStatusMessage(
          parsed.memberships.length === 0
            ? 'You have no active workspaces.'
            : `Showing ${parsed.memberships.length} workspace${parsed.memberships.length === 1 ? '' : 's'}.`,
        );
        setStatusKind('info');
        return;
      }
      setLifecycle(PICKER_LIFECYCLE.MEMBERSHIPS_ERROR);
      setStatusMessage(formatErrorMessage(parsed.kind === 'unknown_error' ? 'memberships_load_failed' : parsed.kind));
      setStatusKind('error');
    } catch (_netErr) {
      setLifecycle(PICKER_LIFECYCLE.MEMBERSHIPS_ERROR);
      setStatusMessage(formatErrorMessage('network_error'));
      setStatusKind('error');
    }
  }, []);

  useEffect(() => {
    setCsrfAvailable(readCorpflowCsrfCookie() != null);
    loadMemberships();
  }, [loadMemberships]);

  const handleSwitch = useCallback(
    async (tenantId, tenantName) => {
      const csrfToken = readCorpflowCsrfCookie();
      if (!csrfToken) {
        setCsrfAvailable(false);
        setStatusMessage(formatErrorMessage('csrf_unavailable'));
        setStatusKind('error');
        return;
      }
      setRowStates((prev) => ({ ...prev, [tenantId]: PICKER_ROW_STATE.SUBMITTING }));
      setStatusMessage(`Switching to ${tenantName || tenantId}…`);
      setStatusKind('info');
      setOpenRedirect(null);
      try {
        const [url, init] = buildSwitchRequest({ tenantId, csrfToken });
        const res = await fetch(url, init);
        let body = null;
        try {
          body = await res.json();
        } catch (_jsonErr) {
          body = null;
        }
        const parsed = parseSwitchResponse({ status: res.status, body });
        if (parsed.kind === 'success') {
          setRowStates((prev) => ({ ...prev, [tenantId]: PICKER_ROW_STATE.SUCCESS }));
          setOverrideActingTenantId(parsed.actingTenantId);
          setStatusMessage(
            parsed.tenantName
              ? `Now acting on ${parsed.tenantName}. Open the workspace below.`
              : 'Workspace switched. Open the workspace below.',
          );
          setStatusKind('info');
          setOpenRedirect(
            describeOpenRedirectLink({
              redirectTo: parsed.redirectTo,
              tenantName: parsed.tenantName,
              isLeave: false,
            }),
          );
          return;
        }
        setRowStates((prev) => ({ ...prev, [tenantId]: PICKER_ROW_STATE.ERROR }));
        setStatusMessage(formatErrorMessage(parsed.kind));
        setStatusKind('error');
      } catch (_netErr) {
        setRowStates((prev) => ({ ...prev, [tenantId]: PICKER_ROW_STATE.ERROR }));
        setStatusMessage(formatErrorMessage('network_error'));
        setStatusKind('error');
      }
    },
    [],
  );

  const handleLeave = useCallback(async () => {
    const csrfToken = readCorpflowCsrfCookie();
    if (!csrfToken) {
      setCsrfAvailable(false);
      setStatusMessage(formatErrorMessage('csrf_unavailable'));
      setStatusKind('error');
      return;
    }
    setStatusMessage('Leaving acting tenant…');
    setStatusKind('info');
    setOpenRedirect(null);
    try {
      const [url, init] = buildLeaveRequest({ csrfToken });
      const res = await fetch(url, init);
      let body = null;
      try {
        body = await res.json();
      } catch (_jsonErr) {
        body = null;
      }
      const parsed = parseLeaveResponse({ status: res.status, body });
      if (parsed.kind === 'success') {
        setOverrideActingTenantId(null);
        setStatusMessage('You are no longer acting on a tenant.');
        setStatusKind('info');
        setOpenRedirect(
          describeOpenRedirectLink({
            redirectTo: parsed.redirectTo,
            tenantName: null,
            isLeave: true,
          }),
        );
        // Clear any submitting row state so the UI returns to idle.
        setRowStates({});
        return;
      }
      setStatusMessage(formatErrorMessage(parsed.kind));
      setStatusKind('error');
    } catch (_netErr) {
      setStatusMessage(formatErrorMessage('network_error'));
      setStatusKind('error');
    }
  }, []);

  // Sanity gate (the parent enforces the primary gate via shouldRenderPicker;
  // this is a belt-and-braces check). If a future caller mounts us with
  // bad props, we render nothing instead of leaking a partial UI.
  if (
    effectiveMembershipsCount !== null
    && (!Number.isInteger(effectiveMembershipsCount) || effectiveMembershipsCount < 1)
  ) {
    return null;
  }

  const showLeave = shouldShowLeaveButton(effectiveActingTenantId);

  return (
    <section
      id={PICKER_SECTION_ID}
      aria-labelledby={PICKER_HEADING_ID}
      {...{ [PICKER_DATA_ATTR]: 'true' }}
      style={CONTAINER_STYLE}
    >
      <h2 id={PICKER_HEADING_ID} style={HEADING_STYLE}>
        {PICKER_HEADING_TEXT}
      </h2>
      <div
        id={PICKER_STATUS_ID}
        role="status"
        aria-live="polite"
        style={statusKind === 'error' ? STATUS_ERROR_STYLE : STATUS_STYLE}
      >
        {statusMessage}
      </div>
      {csrfAvailable ? null : (
        <div
          {...{ [PICKER_CSRF_UNAVAILABLE_DATA_ATTR]: 'true' }}
          style={STATUS_ERROR_STYLE}
        >
          {formatErrorMessage('csrf_unavailable')}
        </div>
      )}
      {lifecycle === PICKER_LIFECYCLE.READY && memberships.length > 0 ? (
        <ul id={PICKER_LIST_ID} style={LIST_STYLE}>
          {memberships.map((m) => {
            const row = describeMembershipRow(m, effectiveActingTenantId);
            const rowKey = `tenant-${m.tenant_id}`;
            const rowSubmitting = rowStates[m.tenant_id] === PICKER_ROW_STATE.SUBMITTING;
            const disabled = row.switchButtonDisabled || rowSubmitting || !csrfAvailable;
            const buttonAriaLabel = rowSubmitting
              ? `Switching to ${m.tenant_name || m.tenant_id}`
              : row.switchButtonAriaLabel;
            const buttonLabel = rowSubmitting ? 'Switching…' : row.switchButtonLabel;
            const liProps = { key: rowKey, style: row.isCurrentlyActing ? ROW_ACTIVE_STYLE : ROW_STYLE };
            // aria-current goes only on the active row.
            if (row.ariaCurrent) liProps['aria-current'] = row.ariaCurrent;
            liProps[PICKER_ROW_DATA_ATTR] = m.tenant_id;
            return (
              <li {...liProps}>
                <div>
                  <div style={ROW_NAME_STYLE}>
                    {m.tenant_name && m.tenant_name !== m.tenant_id
                      ? `${m.tenant_name}`
                      : m.tenant_id}
                  </div>
                  <div style={ROW_META_STYLE}>
                    {[
                      m.role ? `role: ${m.role}` : null,
                      m.capability ? `capability: ${m.capability}` : null,
                      m.source ? `source: ${m.source}` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={disabled}
                  aria-label={buttonAriaLabel}
                  aria-disabled={disabled ? 'true' : 'false'}
                  style={disabled ? SWITCH_BUTTON_DISABLED_STYLE : SWITCH_BUTTON_STYLE}
                  onClick={() => handleSwitch(m.tenant_id, m.tenant_name || m.tenant_id)}
                >
                  {buttonLabel}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
      {showLeave ? (
        <button
          type="button"
          {...{ [PICKER_LEAVE_BUTTON_DATA_ATTR]: 'true' }}
          style={LEAVE_BUTTON_STYLE}
          aria-label="Leave acting tenant and return to Core"
          disabled={!csrfAvailable}
          aria-disabled={!csrfAvailable ? 'true' : 'false'}
          onClick={handleLeave}
        >
          Leave acting tenant
        </button>
      ) : null}
      {openRedirect ? (
        <a
          {...{ [PICKER_OPEN_REDIRECT_DATA_ATTR]: 'true' }}
          href={openRedirect.href}
          aria-label={openRedirect.ariaLabel}
          style={REDIRECT_LINK_STYLE}
          // rel=noopener — defensive even for same-org URLs.
          rel="noopener"
        >
          {openRedirect.label}
        </a>
      ) : null}
    </section>
  );
}
