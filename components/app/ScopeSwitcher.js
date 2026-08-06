/**
 * @param {{
 *   available: Array<{ scope: 'core'|'tenant', label: string, tenant_id: string | null }>,
 *   selected: 'core'|'tenant',
 *   onSelect: (scope: 'core'|'tenant') => void,
 *   disabled?: boolean,
 * }} props
 */
export default function ScopeSwitcher({ available, selected, onSelect, disabled }) {
  const scopes = Array.isArray(available) ? available : [];
  return (
    <div className="cf-app-scope-row" data-testid="scope-switcher">
      {scopes.map((s) => (
        <button
          key={s.scope}
          type="button"
          className="cf-app-scope-btn"
          data-active={selected === s.scope ? 'true' : 'false'}
          data-testid={`scope-${s.scope}`}
          disabled={disabled}
          onClick={() => onSelect(s.scope)}
        >
          {s.label}
        </button>
      ))}
      {!scopes.length ? (
        <p className="cf-app-muted">No authorised scopes for this session.</p>
      ) : null}
    </div>
  );
}
