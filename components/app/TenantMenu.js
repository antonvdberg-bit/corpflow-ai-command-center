import { TENANT_NAV_ITEMS } from '../../lib/app/constants.js';

/**
 * Tenant application navigation (#1073).
 * Requests & Progress stays in-shell. Service & change is a real link to /change.
 *
 * @param {{
 *   active?: string,
 *   onSelect?: (id: string) => void,
 *   disabled?: boolean,
 *   changeHref?: string | null,
 * }} props
 */
export default function TenantMenu({
  active = 'requests_progress',
  onSelect,
  disabled,
  changeHref,
}) {
  const items = TENANT_NAV_ITEMS;
  return (
    <nav className="cf-app-scope-row" data-testid="tenant-menu" aria-label="Tenant journey">
      {items.map((item) => {
        const isChange = item.id === 'service_change';
        const href = isChange ? String(changeHref || item.href || '/change') : null;
        if (href) {
          return (
            <a
              key={item.id}
              className="cf-app-scope-btn"
              data-active={active === item.id ? 'true' : 'false'}
              data-testid={`tenant-menu-${item.id}`}
              href={href}
              aria-disabled={disabled ? 'true' : undefined}
              onClick={(e) => {
                if (disabled) e.preventDefault();
              }}
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
