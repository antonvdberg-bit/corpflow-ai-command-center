/**
 * Vercel **Hobby** rejects crons that run more than once per day (see deploy error:
 * "Hobby accounts are limited to daily cron jobs").
 *
 * Conservative rule: each job's minute and hour must be a single fixed value
 * (e.g. `0 4 * * *`), not `*`, step syntax like star-slash-N, lists, or ranges.
 */

/**
 * @param {string} schedule - 5-field cron string
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export function isHobbySafeCronSchedule(schedule) {
  const trimmed = String(schedule || '').trim();
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length !== 5) {
    return { ok: false, reason: `expected 5 cron fields, got ${parts.length}: ${JSON.stringify(trimmed)}` };
  }
  const [min, hour] = parts;
  const fixedMin = /^\d{1,2}$/.test(min) && Number(min) >= 0 && Number(min) <= 59;
  const fixedHour = /^\d{1,2}$/.test(hour) && Number(hour) >= 0 && Number(hour) <= 23;
  if (!fixedMin || !fixedHour) {
    return {
      ok: false,
      reason: `Hobby requires a single daily run: minute and hour must be fixed integers (e.g. 0 4 * * *), not '*' or step schedules. Got minute='${min}' hour='${hour}'`,
    };
  }
  return { ok: true };
}

/**
 * @param {unknown} vercelJson - parsed vercel.json
 * @returns {{ ok: true } | { ok: false, errors: string[] }}
 */
export function validateVercelJsonCronsForHobby(vercelJson) {
  const errors = [];
  const crons = vercelJson && typeof vercelJson === 'object' ? vercelJson.crons : null;
  if (!Array.isArray(crons)) {
    return { ok: true };
  }
  for (let i = 0; i < crons.length; i++) {
    const c = crons[i];
    const path = c && c.path != null ? String(c.path) : `(index ${i})`;
    const schedule = c && c.schedule != null ? String(c.schedule) : '';
    const r = isHobbySafeCronSchedule(schedule);
    if (!r.ok) {
      errors.push(`${path}: ${r.reason}`);
    }
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true };
}
