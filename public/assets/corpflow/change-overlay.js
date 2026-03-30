/**
 * CorpFlow client change overlay — thin loader for the CMP bubble on tenant sites.
 *
 * Embeds the same `/assets/cmp/bubble.js` surface with recommended defaults for a
 * published-site "request a change" entry point. Set real API host via data-corpflow-api-base.
 *
 * Usage (place before </body>):
 *   <script
 *     src="/assets/corpflow/change-overlay.js"
 *     defer
 *     data-corpflow-api-base="https://YOUR_VERCEL_APP.vercel.app"
 *     data-cmp-client-id="your_tenant_id"
 *     data-cmp-locale="es"
 *   ></script>
 */
(function () {
  'use strict';
  var s = document.currentScript;
  if (!s) s = document.querySelector('script[src*="change-overlay.js"]');
  var base = (s && s.getAttribute('data-corpflow-api-base')) || '';
  base = String(base).replace(/\/$/, '');
  var clientId = (s && s.getAttribute('data-cmp-client-id')) || '';
  var locale = (s && s.getAttribute('data-cmp-locale')) || '';
  var token =
    (s && s.getAttribute('data-cmp-session-token')) ||
    (s && s.getAttribute('data-cmp-admin-session-token')) ||
    '';

  var src = '/assets/cmp/bubble.js';
  if (base) {
    try {
      src = new URL('/assets/cmp/bubble.js', base + '/').toString();
    } catch (e) {
      src = base + '/assets/cmp/bubble.js';
    }
  }

  var sc = document.createElement('script');
  sc.src = src;
  sc.defer = true;
  if (base) sc.setAttribute('data-cmp-api-base', base);
  if (clientId) sc.setAttribute('data-cmp-client-id', clientId);
  if (locale) sc.setAttribute('data-cmp-locale', locale);
  if (token) sc.setAttribute('data-cmp-session-token', token);
  document.head.appendChild(sc);
})();
