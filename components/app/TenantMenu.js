/**
 * Tenant application navigation.
 * Existing capability routes may be linked rather than rebuilt.
 *
 * @param {{
 *   active?: string,
 *   onSelect?: (id: string) => void,
 *   disabled?: boolean,
 * }} props
 */
export default function TenantMenu({ active = 'requests_progress', onSelect, disabled }) {
  const items = [
    { id: 'home', label: 'Home / Overview' },
    { id: 'my_work', label: 'My Work' },
    { id: 'requests_progress', label: 'Requests & Progress' },
    { id: 'documents', label: 'Documents' },
    { id: 'reports', label: 'Reports' },
    { id: 'support', label: 'Support' },
  ];
  return (
    <nav className="cf-app-scope-row" data-testid="tenant-menu" aria-label="Tenant menu">
      {items.map((item) => (
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
      ))}
    </nav>
  );
}
