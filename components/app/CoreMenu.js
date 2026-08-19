import { CORE_NAV_ITEMS } from '../../lib/app/constants.js';

/**
 * Core application navigation.
 * Links Delivery / Operations to existing /change (compatibility route).
 * My Work, Prospects, and Pipeline are dedicated Operating Workspace routes (#772 / #997).
 *
 * @param {{
 *   active: string,
 *   onSelect: (id: string) => void,
 *   disabled?: boolean,
 * }} props
 */
export default function CoreMenu({ active, onSelect, disabled }) {
  return (
    <nav className="cf-app-scope-row" data-testid="core-menu" aria-label="Core menu">
      {CORE_NAV_ITEMS.map((item) =>
        item.href ? (
          <a
            key={item.id}
            className="cf-app-scope-btn"
            data-active={active === item.id ? 'true' : 'false'}
            data-testid={`core-menu-${item.id}`}
            href={item.href}
          >
            {item.label}
          </a>
        ) : (
          <button
            key={item.id}
            type="button"
            className="cf-app-scope-btn"
            data-active={active === item.id ? 'true' : 'false'}
            data-testid={`core-menu-${item.id}`}
            disabled={disabled}
            onClick={() => onSelect(item.id)}
          >
            {item.label}
          </button>
        ),
      )}
    </nav>
  );
}
