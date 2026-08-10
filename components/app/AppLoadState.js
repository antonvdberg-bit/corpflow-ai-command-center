/**
 * Operator-facing loading / empty / error panels for Core and Tenant workspaces.
 * @param {{
 *   kind: 'loading' | 'empty' | 'error',
 *   title?: string,
 *   message?: string,
 *   testId?: string,
 * }} props
 */
export default function AppLoadState({ kind, title, message, testId }) {
  const defaults = {
    loading: {
      title: 'Loading workspace…',
      message: 'Fetching authorised requests through the application repository.',
      testId: 'app-loading',
    },
    empty: {
      title: 'No requests yet',
      message: 'No authorised request records match this view.',
      testId: 'app-empty',
    },
    error: {
      title: 'Could not load workspace',
      message: 'Something went wrong loading requests. Retry or sign in again.',
      testId: 'app-error-state',
    },
  };
  const d = defaults[kind] || defaults.error;
  const heading = title || d.title;
  const body = message || d.message;
  const id = testId || d.testId;

  return (
    <section
      className="cf-app-panel"
      data-testid={id}
      data-load-kind={kind}
      aria-busy={kind === 'loading' ? 'true' : undefined}
    >
      <h1 className="cf-app-h1">{heading}</h1>
      <p className={kind === 'error' ? 'cf-app-error' : 'cf-app-lead'}>{body}</p>
      {kind === 'loading' ? (
        <p className="cf-app-muted" data-testid="app-loading-indicator">
          Please wait…
        </p>
      ) : null}
    </section>
  );
}
