/**
 * CMP Supplier Onboarding Wizard (Scaffold UI)
 *
 * Collects supplier configuration (Twilio / WhatsApp / etc.) and persists it
 * into `vanguard/secrets-manifest.json` via:
 *   POST /api/cmp/router?action=supplier-onboard
 *
 * This UI stores NO raw secrets in client-side storage.
 * It only sends env-var names and non-secret metadata.
 */
(function () {
  'use strict';

  var ADMIN_TOKEN_KEY = 'cmp_admin_session_token';

  function getCmpApiBase() {
    try {
      var s = document.currentScript;
      if (!s) s = document.querySelector('script[src*="onboarding-wizard.js"]');
      var apiBase = (s && s.getAttribute('data-cmp-api-base')) || '';
      apiBase = String(apiBase).replace(/\/$/, '');
      return apiBase;
    } catch (e) {
      return '';
    }
  }

  function apiUrl(path) {
    var base = getCmpApiBase();
    if (base) return base + path;
    return path;
  }

  function cmpActionUrl(action) {
    return apiUrl('/api/cmp/router?action=' + encodeURIComponent(action));
  }

  function getAdminSessionToken() {
    try {
      return localStorage.getItem(ADMIN_TOKEN_KEY) || '';
    } catch (e) {
      return '';
    }
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = String(text);
    return n;
  }

  function render(targetEl) {
    var apiBase = getCmpApiBase();
    var adminToken = getAdminSessionToken();

    if (!targetEl) return;
    targetEl.innerHTML = '';

    var wrap = el('div', 'cmp-wizard');
    wrap.style.cssText =
      'max-width:720px;padding:16px;border:1px solid rgba(148,163,184,.25);background:#0b1220;color:#e2e8f0;border-radius:14px;font-family:system-ui';

    wrap.appendChild(el('h3', null, 'Supplier Onboarding Wizard'));
    wrap.appendChild(
      el('p', null, 'Saves supplier config to Vanguard for the selected tenant.')
    );

    var form = el('form', null);
    form.style.cssText = 'display:grid;gap:10px;margin-top:12px;';

    function field(label, inputEl) {
      var row = el('div', null);
      row.appendChild(el('div', null, label));
      row.appendChild(inputEl);
      return row;
    }

    var clientIdInput = document.createElement('input');
    clientIdInput.name = 'client_id';
    clientIdInput.placeholder = 'client_id (tenant slug, e.g. luxe-maurice)';
    clientIdInput.style.cssText = 'width:100%;padding:10px;border-radius:10px;border:1px solid rgba(148,163,184,.25);background:#020617;color:#e2e8f0;';

    var subUserIdInput = document.createElement('input');
    subUserIdInput.name = 'sub_user_id';
    subUserIdInput.placeholder = 'sub_user_id';
    subUserIdInput.style.cssText = clientIdInput.style.cssText;

    var supplierKeyInput = document.createElement('input');
    supplierKeyInput.name = 'supplier_key';
    supplierKeyInput.placeholder = 'supplier_key (e.g. twilio, whatsapp)';
    supplierKeyInput.style.cssText = clientIdInput.style.cssText;

    var callbackUrlInput = document.createElement('input');
    callbackUrlInput.name = 'callback_url';
    callbackUrlInput.placeholder = 'callback_url (optional)';
    callbackUrlInput.style.cssText = clientIdInput.style.cssText;

    var accountSidEnv = document.createElement('input');
    accountSidEnv.name = 'account_sid_env';
    accountSidEnv.placeholder = 'TWILIO_ACCOUNT_SID (env-var name)';
    accountSidEnv.value = 'TWILIO_ACCOUNT_SID';
    accountSidEnv.style.cssText = clientIdInput.style.cssText;

    var authTokenEnv = document.createElement('input');
    authTokenEnv.name = 'auth_token_env';
    authTokenEnv.placeholder = 'TWILIO_AUTH_TOKEN (env-var name)';
    authTokenEnv.value = 'TWILIO_AUTH_TOKEN';
    authTokenEnv.style.cssText = clientIdInput.style.cssText;

    var adminWhatsappEnv = document.createElement('input');
    adminWhatsappEnv.name = 'admin_whatsapp_number_env';
    adminWhatsappEnv.placeholder = 'ADMIN_WHATSAPP_NUMBER (env-var name)';
    adminWhatsappEnv.value = 'ADMIN_WHATSAPP_NUMBER';
    adminWhatsappEnv.style.cssText = clientIdInput.style.cssText;

    var notes = document.createElement('textarea');
    notes.name = 'notes';
    notes.placeholder = 'Optional notes (non-secret).';
    notes.rows = 3;
    notes.style.cssText =
      'width:100%;padding:10px;border-radius:10px;border:1px solid rgba(148,163,184,.25);background:#020617;color:#e2e8f0;resize:vertical;';

    var submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.textContent = 'Save Supplier Access';
    submitBtn.style.cssText =
      'padding:12px 16px;border-radius:10px;border:none;font-weight:800;cursor:pointer;background:linear-gradient(145deg,#38bdf8,#0ea5e9);color:#0b1220;margin-top:8px;';

    var statusEl = el('div', null, '');
    statusEl.style.cssText = 'min-height:20px;color:#94a3b8;';

    form.appendChild(field('Client (client_id)', clientIdInput));
    form.appendChild(field('Sub-user (sub_user_id)', subUserIdInput));
    form.appendChild(field('Supplier Key', supplierKeyInput));
    form.appendChild(field('Callback URL (optional)', callbackUrlInput));
    form.appendChild(field('Twilio Account SID env name', accountSidEnv));
    form.appendChild(field('Twilio Auth Token env name', authTokenEnv));
    form.appendChild(field('Admin WhatsApp Number env name', adminWhatsappEnv));
    form.appendChild(field('Notes', notes));
    form.appendChild(submitBtn);
    form.appendChild(statusEl);

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();

      statusEl.textContent = 'Saving…';

      var body = {
        client_id: clientIdInput.value.trim(),
        sub_user_id: subUserIdInput.value.trim(),
        supplier_key: supplierKeyInput.value.trim(),
        supplier_config: {
          callback_url: callbackUrlInput.value.trim() || undefined,
          twilio: {
            account_sid_env: accountSidEnv.value.trim() || undefined,
            auth_token_env: authTokenEnv.value.trim() || undefined,
          },
          whatsapp: {
            admin_whatsapp_number_env: adminWhatsappEnv.value.trim() || undefined,
          },
          notes: notes.value.trim() || undefined,
        },
      };

      var headers = {
        'Content-Type': 'application/json',
        'x-session-token': adminToken || '',
        'x-subuser-id': body.sub_user_id || '',
      };

      fetch(cmpActionUrl('supplier-onboard'), {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body),
      })
        .then(function (r) {
          return r.json().then(function (j) {
            if (!r.ok) throw new Error(j.error || 'Save failed');
            return j;
          });
        })
        .then(function () {
          statusEl.textContent = 'Supplier access saved (best-effort).';
        })
        .catch(function (e) {
          statusEl.textContent = 'Error: ' + (e && e.message ? e.message : String(e));
          statusEl.style.color = '#f87171';
        });
    });

    wrap.appendChild(form);
    targetEl.appendChild(wrap);
  }

  function mountIfPossible() {
    // Optional: attach to any page element with id.
    var target = document.getElementById('cmpSupplierOnboarding');
    if (target) {
      render(target);
      return;
    }

    // If not found, do nothing (so embedding pages can choose placement).
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountIfPossible);
  } else {
    mountIfPossible();
  }
})();

