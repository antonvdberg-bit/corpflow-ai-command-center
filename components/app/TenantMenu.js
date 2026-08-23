import { TENANT_NAV_ITEMS } from '../../lib/app/constants.js';

/**
 * Tenant application navigation (#1006).
 * In-shell: Requests & Progress. Existing capability: /change.
 *
 * @param {{
 *   active?: string,
 *   onSelect?: (id: string) => void,
 *   disabled?: boolean,
 * }} props
 */
export default function TenantMenu({ active = 'requests_progress', onSelect, disabled }) {
  return (
    <nav className="cf-app-scope-row" data-testid="tenant-menu" aria-label="Tenant menu">
      {TENANT_NAV_ITEMS.map((item) => {
        const href = item.href ? String(item.href) : '';
        if (href) {
          return (
            <a
              key={item.id}
              href={href}
              className="cf-app-scope-btn"
              data-active={active === item.id ? 'true' : 'false'}
              data-testid={`tenant-menu-${item.id}`}
            >
              {item.label}
            </a>
          );
        }
        return (
          <button
            key={item.id}
            type="button"
            className="cf-app-scope-btn"
            data-active={active === item.id ? 'true' : 'false'}
            data-testid={`tenant-menu-${item.id}`}
            disabled={disabled}
            onClick={() => onSelect && onSelect(item.id)}
          >
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
