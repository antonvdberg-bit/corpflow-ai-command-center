import React from 'react';
import Script from 'next/script';

/**
 * Plausible Auto snippet (the new bundled-config variant).
 *
 * The script identity (which Plausible "site" it reports into) is encoded
 * in the script URL itself (`pa-<hash>.js`). `data-domain` is a no-op for
 * Plausible Auto and is deliberately not set here.
 *
 * Host + path gating happens upstream (lib/analytics/index.js); this
 * component is purely the script mount.
 */

export const DEFAULT_PLAUSIBLE_AUTO_SRC =
  'https://plausible.io/js/pa-atDLaFbloSL8__2jS9sxi.js';

const PLAUSIBLE_INIT_SHIM = `
window.plausible = window.plausible || function () {
  (window.plausible.q = window.plausible.q || []).push(arguments);
};
window.plausible.init = window.plausible.init || function (i) {
  window.plausible.o = i || {};
};
window.plausible.init();
`.trim();

export default function PlausibleScript() {
  const src =
    (typeof process !== 'undefined' &&
      process.env &&
      process.env.NEXT_PUBLIC_PLAUSIBLE_SRC) ||
    DEFAULT_PLAUSIBLE_AUTO_SRC;

  return (
    <>
      <Script id="plausible-auto" src={src} strategy="afterInteractive" />
      <Script id="plausible-init" strategy="afterInteractive">
        {PLAUSIBLE_INIT_SHIM}
      </Script>
    </>
  );
}
