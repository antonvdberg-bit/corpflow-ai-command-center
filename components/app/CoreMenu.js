/**
 * Core application menu — global and per-tenant request management.
 * Not a ScopeSwitcher: this is navigation within Core only.
 *
 * @param {{
 *   active: 'global_requests' | 'tenant_requests' | 'request_work',
 *   onSelect: (id: 'global_requests' | 'tenant_requests' | 'request_work') => void,
 *   disabled?: boolean,
 * }} props
 */
export default function CoreMenu({ active, onSelect, disabled }) {
  const items = [
    { id: /** @type {const} */ ('global_requests'), label: 'All requests' },
    { id: /** @type {const} */ ('tenant_requests'), label: 'Tenant · CorpFlowAI' },
    { id: /** @type {const} */ ('request_work'), label: 'Request / work' },
  ];
  return (
    <nav className="cf-app-scope-row" data-testid="core-menu" aria-label="Core menu">
      {items.map((item) => (
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
      ))}
    </nav>
  );
}
