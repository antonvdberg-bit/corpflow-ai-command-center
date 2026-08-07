/**
 * Core application navigation.
 * Links Delivery / Operations to existing /change (compatibility route).
 *
 * @param {{
 *   active: string,
 *   onSelect: (id: string) => void,
 *   disabled?: boolean,
 * }} props
 */
export default function CoreMenu({ active, onSelect, disabled }) {
  const items = [
    { id: 'my_work', label: 'My Work', kind: 'nav' },
    { id: 'tenants', label: 'Tenants', kind: 'nav' },
    { id: 'requests', label: 'Requests', kind: 'nav' },
    { id: 'delivery', label: 'Delivery', kind: 'link', href: '/change' },
    { id: 'approvals', label: 'Approvals', kind: 'nav' },
    { id: 'releases', label: 'Releases', kind: 'nav' },
    { id: 'operations', label: 'Operations', kind: 'link', href: '/change' },
  ];
  return (
    <nav className="cf-app-scope-row" data-testid="core-menu" aria-label="Core menu">
      {items.map((item) =>
        item.kind === 'link' ? (
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
