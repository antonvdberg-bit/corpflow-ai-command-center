/**
 * Pure extraction of the LuxeMaurice Content Population Sprint linkage block
 * surfaced by `ticket-get` as `ticket.lux_sprint_meta`.
 *
 * Lives in a dedicated module so unit tests can exercise it without dragging in
 * `lib/cmp/router.js`'s heavy import graph (Prisma, GitHub, Vercel, telemetry…).
 *
 * Sprint children carry:
 *   - `console_json.parent_sprint_ticket = cmqa2y2ga0000l704glnfro1f`
 *   - `console_json.parent_programme_ticket = cmo8mjijk0000jl04l1jz0v6d`
 *   - `console_json.lux_request_meta.sprint_code = 'C1'|'C2'|'C3'|'C4'`
 *
 * Returning `undefined` keeps the existing API stable for non-sprint tickets.
 */

const SPRINT_CODE_RE = /^C[1-9][0-9]?$/;

/**
 * @param {unknown} consoleJson
 * @returns {{ parent_sprint_ticket?: string, parent_programme_ticket?: string, sprint_code?: string } | undefined}
 */
export function extractLuxSprintMetaForApi(consoleJson) {
  const cj =
    consoleJson && typeof consoleJson === 'object' && !Array.isArray(consoleJson) ? consoleJson : {};
  const parentSprintTicket =
    cj.parent_sprint_ticket != null ? String(cj.parent_sprint_ticket).trim() : '';
  const parentProgrammeTicket =
    cj.parent_programme_ticket != null ? String(cj.parent_programme_ticket).trim() : '';
  const meta =
    cj.lux_request_meta && typeof cj.lux_request_meta === 'object' ? cj.lux_request_meta : {};
  const sprintCodeRaw = meta.sprint_code != null ? String(meta.sprint_code).trim().toUpperCase() : '';
  const sprintCode = SPRINT_CODE_RE.test(sprintCodeRaw) ? sprintCodeRaw : '';
  if (!parentSprintTicket && !sprintCode) return undefined;
  /** @type {{ parent_sprint_ticket?: string, parent_programme_ticket?: string, sprint_code?: string }} */
  const out = {};
  if (parentSprintTicket) out.parent_sprint_ticket = parentSprintTicket;
  if (parentProgrammeTicket) out.parent_programme_ticket = parentProgrammeTicket;
  if (sprintCode) out.sprint_code = sprintCode;
  return out;
}
