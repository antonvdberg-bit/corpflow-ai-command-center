import { CORE_NAV_ITEMS } from '../../lib/app/constants.js';
import { appendProofQuery } from '../../lib/app/workspace-context.js';

/**
 * Core application navigation.
 * Overview lands on /app/core (#1159). Delivery links to the canonical
 * Operating Workspace summary (#1005). Operations remains a compatibility
 * link to /change. My Work, Prospects, Clients, Commercial, Workbench,
 * Pipeline, Action Queue, and Delivery are dedicated Operating Workspace
 * routes (#772 / #995 / #996 / #997 / #999 / #1004 / #1005).
 * Proof query is preserved on `/app` hrefs so the staff journey does not
 * dead-end at login when using the local/preview harness (#1176).
 *
 * @param {{
 *   active: string,
 *   onSelect: (id: string) => void,
 *   disabled?: boolean,
 *   proofWanted?: boolean,
 * }} props
 */
export default function CoreMenu({ active, onSelect, disabled, proofWanted }) {
  return (
    <nav className="cf-app-scope-row" data-testid="core-menu" aria-label="Core menu">
      {CORE_NAV_ITEMS.map((item) =>
        item.href ? (
          <a
            key={item.id}
            className="cf-app-scope-btn"
            data-active={active === item.id ? 'true' : 'false'}
            data-testid={`core-menu-${item.id}`}
            href={appendProofQuery(item.href, proofWanted)}
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
