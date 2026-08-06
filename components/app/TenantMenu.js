/**
 * Tenant application menu — Requests & Progress.
 * Not a ScopeSwitcher: Tenant has no Core entry.
 *
 * @param {{
 *   active?: 'requests_progress',
 *   disabled?: boolean,
 * }} props
 */
export default function TenantMenu({ active = 'requests_progress', disabled }) {
  return (
    <nav className="cf-app-scope-row" data-testid="tenant-menu" aria-label="Tenant menu">
      <button
        type="button"
        className="cf-app-scope-btn"
        data-active={active === 'requests_progress' ? 'true' : 'false'}
        data-testid="tenant-menu-requests_progress"
        disabled={disabled}
      >
        Requests &amp; Progress
      </button>
    </nav>
  );
}
