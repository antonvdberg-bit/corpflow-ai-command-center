import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

const pageStyle = {
  minHeight: '100vh',
  background: '#050505',
  color: '#eef6ff',
  fontFamily: 'IBM Plex Sans, ui-sans-serif, system-ui, sans-serif',
};
const shell = { maxWidth: 1200, margin: '0 auto', padding: '32px 20px 64px' };
const glass = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12,
  padding: 20,
  marginBottom: 16,
};
const input = {
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(0,0,0,0.35)',
  color: '#eef6ff',
  fontSize: 13,
  width: '100%',
  boxSizing: 'border-box',
};
const label = {
  display: 'block',
  fontSize: 11,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: '#8899aa',
  marginBottom: 6,
};
const btn = {
  padding: '10px 14px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.16)',
  background: 'rgba(80,140,255,0.18)',
  color: '#eef6ff',
  cursor: 'pointer',
  fontSize: 13,
  marginRight: 6,
  marginBottom: 6,
};
const btnMuted = { ...btn, background: 'rgba(255,255,255,0.06)' };
const grid2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 };
const th = {
  textAlign: 'left',
  fontSize: 10,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: '#8899aa',
  padding: '8px 6px',
  borderBottom: '1px solid rgba(255,255,255,0.08)',
};
const td = {
  padding: '10px 6px',
  borderBottom: '1px solid rgba(255,255,255,0.05)',
  fontSize: 13,
  verticalAlign: 'top',
};

const EMPTY_FORM = {
  legal_name: '',
  trading_name: '',
  registration_number: '',
  tax_number: '',
  public_email: '',
  public_phone: '',
  website: '',
  physical_address: '',
  registered_address: '',
  jurisdiction: 'MU',
  jurisdiction_other: '',
  is_synthetic: true,
};

const EMPTY_UPLOAD = {
  artifact_type: 'LOGO',
  logical_alias: 'brand.logo.primary',
  sensitivity_classification: 'PUBLIC',
  title: '',
};

const FALLBACK_JURISDICTIONS = [
  { code: 'MU', label: 'Mauritius' },
  { code: 'ZA', label: 'South Africa' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'US', label: 'United States' },
  { code: 'AE', label: 'United Arab Emirates' },
  { code: 'SG', label: 'Singapore' },
  { code: 'IN', label: 'India' },
  { code: 'FR', label: 'France' },
  { code: 'DE', label: 'Germany' },
  { code: 'AU', label: 'Australia' },
  { code: 'CA', label: 'Canada' },
  { code: 'IE', label: 'Ireland' },
  { code: 'NL', label: 'Netherlands' },
  { code: 'CH', label: 'Switzerland' },
  { code: 'HK', label: 'Hong Kong' },
  { code: 'OTHER', label: 'Other / custom jurisdiction' },
];

async function api(path, opts = {}) {
  const res = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: 'INVALID_JSON_RESPONSE', raw: text.slice(0, 200) };
  }
  return { res, data };
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const b64 = result.includes('base64,') ? result.split('base64,').pop() : result;
      resolve(b64 || '');
    };
    reader.onerror = () => reject(new Error('FILE_READ_FAILED'));
    reader.readAsDataURL(file);
  });
}

function stateBadgeStyle(state) {
  if (state === 'Current') return { background: 'rgba(34,197,94,0.2)', color: '#86efac' };
  if (state === 'Pending approval') return { background: 'rgba(234,179,8,0.2)', color: '#fde68a' };
  if (state === 'Superseded') return { background: 'rgba(148,163,184,0.2)', color: '#cbd5e1' };
  if (state === 'Withdrawn') return { background: 'rgba(248,113,113,0.2)', color: '#fecaca' };
  if (state === 'Archived') return { background: 'rgba(100,116,139,0.25)', color: '#94a3b8' };
  return { background: 'rgba(255,255,255,0.08)', color: '#cfe0ff' };
}

function jurisdictionForForm(stored, list) {
  const s = String(stored || '').trim();
  if (!s) return { jurisdiction: 'MU', jurisdiction_other: '' };
  if (s.toUpperCase().startsWith('OTHER:')) {
    return { jurisdiction: 'OTHER', jurisdiction_other: s.slice(6).trim() };
  }
  const hit = list.find((j) => j.code === s.toUpperCase());
  if (hit) return { jurisdiction: hit.code, jurisdiction_other: '' };
  return { jurisdiction: 'OTHER', jurisdiction_other: s };
}

function payloadJurisdiction(form) {
  if (form.jurisdiction === 'OTHER') {
    const custom = String(form.jurisdiction_other || '').trim();
    return custom ? `OTHER:${custom}` : 'OTHER';
  }
  return form.jurisdiction;
}

/**
 * @param {{ initialCompanies?: Array<object>|null, initialError?: object|null, signedIn?: boolean, username?: string|null }} props
 */
export default function CompanyMasterApp(props = {}) {
  const [companies, setCompanies] = useState(
    Array.isArray(props.initialCompanies) ? props.initialCompanies : []
  );
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [message, setMessage] = useState(props.initialError?.message || null);
  const [error, setError] = useState(props.initialError?.error || null);
  const [busy, setBusy] = useState(false);
  const [currentLogo, setCurrentLogo] = useState(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState(null);
  const [jurisdictions, setJurisdictions] = useState(FALLBACK_JURISDICTIONS);
  const [jurisdictionFilter, setJurisdictionFilter] = useState('');
  const [uploadMeta, setUploadMeta] = useState(EMPTY_UPLOAD);
  const [showAdminDebug, setShowAdminDebug] = useState(false);
  const [debugResolve, setDebugResolve] = useState(null);

  const refreshList = useCallback(async () => {
    const { res, data } = await api('/api/company-master/companies');
    if (!res.ok) {
      setError(data?.error || 'LIST_FAILED');
      setMessage(data?.hint || data?.detail || 'Could not list companies');
      return;
    }
    setCompanies(Array.isArray(data.companies) ? data.companies : []);
    setError(null);
  }, []);

  const loadCurrentLogo = useCallback(async (companyId) => {
    if (!companyId) {
      setCurrentLogo(null);
      return;
    }
    const { res, data } = await api(
      `/api/company-master/resolve?company_id=${encodeURIComponent(companyId)}&alias=${encodeURIComponent('brand.logo.primary')}`
    );
    if (!res.ok || !data?.asset) {
      setCurrentLogo(null);
      return;
    }
    setCurrentLogo(data.asset);
  }, []);

  const loadCompany = useCallback(
    async (companyId) => {
      if (!companyId) return;
      setBusy(true);
      const { res, data } = await api(
        `/api/company-master/companies/${encodeURIComponent(companyId)}`
      );
      setBusy(false);
      if (!res.ok) {
        setError(data?.error || 'LOAD_FAILED');
        setMessage(data?.message || data?.code || 'Could not load company');
        return;
      }
      setSelectedId(companyId);
      setDetail(data);
      const c = data.company || {};
      const jur = jurisdictionForForm(c.jurisdiction, jurisdictions);
      setForm({
        legal_name: c.legal_name || '',
        trading_name: c.trading_name || '',
        registration_number: c.registration_number || '',
        tax_number: c.tax_number || '',
        public_email: c.public_email || '',
        public_phone: c.public_phone || '',
        website: c.website || '',
        physical_address: c.physical_address || '',
        registered_address: c.registered_address || '',
        jurisdiction: jur.jurisdiction,
        jurisdiction_other: jur.jurisdiction_other,
        is_synthetic: c.is_synthetic === true,
      });
      setMessage(`Loaded ${companyId}`);
      setError(null);
      setDebugResolve(null);
      await loadCurrentLogo(companyId);
    },
    [jurisdictions, loadCurrentLogo]
  );

  useEffect(() => {
    if (!Array.isArray(props.initialCompanies)) {
      refreshList().catch(() => {});
    }
    api('/api/company-master/jurisdictions')
      .then(({ res, data }) => {
        if (res.ok && Array.isArray(data.jurisdictions) && data.jurisdictions.length) {
          setJurisdictions(data.jurisdictions);
        }
      })
      .catch(() => {});
  }, [props.initialCompanies, refreshList]);

  useEffect(() => {
    let revoked = false;
    let objectUrl = null;
    async function loadPreview() {
      if (logoPreviewUrl) {
        URL.revokeObjectURL(logoPreviewUrl);
        setLogoPreviewUrl(null);
      }
      const ref = currentLogo?.retrieval_reference;
      if (!ref || String(ref).startsWith('pending')) return;
      try {
        const res = await fetch(ref, { credentials: 'include' });
        if (!res.ok || revoked) return;
        const blob = await res.blob();
        if (revoked) return;
        objectUrl = URL.createObjectURL(blob);
        setLogoPreviewUrl(objectUrl);
      } catch {
        /* preview optional */
      }
    }
    loadPreview();
    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when logo asset changes
  }, [currentLogo?.asset_id, currentLogo?.retrieval_reference]);

  const filteredJurisdictions = useMemo(() => {
    const q = jurisdictionFilter.trim().toLowerCase();
    if (!q) return jurisdictions;
    return jurisdictions.filter(
      (j) => j.label.toLowerCase().includes(q) || j.code.toLowerCase().includes(q)
    );
  }, [jurisdictionFilter, jurisdictions]);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onCreate(e) {
    e.preventDefault();
    setBusy(true);
    const body = {
      legal_name: form.legal_name,
      trading_name: form.trading_name,
      registration_number: form.registration_number,
      tax_number: form.tax_number,
      public_email: form.public_email,
      public_phone: form.public_phone,
      website: form.website,
      physical_address: form.physical_address,
      registered_address: form.registered_address,
      jurisdiction: payloadJurisdiction(form),
      is_synthetic: form.is_synthetic === true,
    };
    const { res, data } = await api('/api/company-master/companies', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!res.ok) {
      setError(data?.error || data?.code || 'CREATE_FAILED');
      setMessage(data?.message || data?.code || 'Create failed');
      return;
    }
    setMessage(`Created ${data.company.company_id}`);
    await refreshList();
    await loadCompany(data.company.company_id);
  }

  async function onSave(e) {
    e.preventDefault();
    if (!selectedId) return;
    setBusy(true);
    const body = {
      legal_name: form.legal_name,
      trading_name: form.trading_name,
      registration_number: form.registration_number,
      tax_number: form.tax_number,
      public_email: form.public_email,
      public_phone: form.public_phone,
      website: form.website,
      physical_address: form.physical_address,
      registered_address: form.registered_address,
      jurisdiction: payloadJurisdiction(form),
    };
    const { res, data } = await api(
      `/api/company-master/companies/${encodeURIComponent(selectedId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(body),
      }
    );
    setBusy(false);
    if (!res.ok) {
      setError(data?.error || data?.code || 'UPDATE_FAILED');
      setMessage(data?.message || data?.code || 'Update failed');
      return;
    }
    setMessage(`Saved ${selectedId}`);
    await refreshList();
    await loadCompany(selectedId);
  }

  async function onUpload(file) {
    if (!selectedId || !file) return;
    setBusy(true);
    try {
      const data_base64 = await fileToBase64(file);
      const { res, data } = await api('/api/company-master/artifacts/upload', {
        method: 'POST',
        body: JSON.stringify({
          company_id: selectedId,
          artifact_type: uploadMeta.artifact_type,
          logical_alias: uploadMeta.logical_alias,
          sensitivity_classification: uploadMeta.sensitivity_classification,
          title: uploadMeta.title || file.name,
          file_name: file.name,
          content_type: file.type || 'application/octet-stream',
          data_base64,
        }),
      });
      setBusy(false);
      if (!res.ok) {
        setError(data?.error || data?.code || 'UPLOAD_FAILED');
        setMessage(data?.message || data?.code || 'Upload failed');
        return;
      }
      setMessage(`Uploaded artifact ${data.artifact.id} v${data.artifact.version_number} (pending approval)`);
      await loadCompany(selectedId);
    } catch (err) {
      setBusy(false);
      setError('UPLOAD_FAILED');
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }

  async function onApprove(artifactId) {
    setBusy(true);
    const { res, data } = await api('/api/company-master/artifacts/approve', {
      method: 'POST',
      body: JSON.stringify({ artifact_id: artifactId }),
    });
    setBusy(false);
    if (!res.ok) {
      setError(data?.error || data?.code || 'APPROVE_FAILED');
      setMessage(data?.message || data?.code || 'Approve failed');
      return;
    }
    setMessage(`Approved ${artifactId}`);
    await loadCompany(selectedId);
  }

  async function onRemovePending(artifactId) {
    if (!window.confirm('Remove this pending upload? The file will be deleted.')) return;
    setBusy(true);
    const { res, data } = await api('/api/company-master/artifacts/remove-pending', {
      method: 'POST',
      body: JSON.stringify({ artifact_id: artifactId }),
    });
    setBusy(false);
    if (!res.ok) {
      setError(data?.error || data?.code || 'REMOVE_FAILED');
      setMessage(data?.message || data?.code || 'Remove failed');
      return;
    }
    setMessage('Pending artifact removed.');
    await loadCompany(selectedId);
  }

  async function onWithdraw(artifactId) {
    if (!window.confirm('Withdraw this artifact? It will no longer be current.')) return;
    setBusy(true);
    const { res, data } = await api('/api/company-master/artifacts/withdraw', {
      method: 'POST',
      body: JSON.stringify({ artifact_id: artifactId }),
    });
    setBusy(false);
    if (!res.ok) {
      setError(data?.error || data?.code || 'WITHDRAW_FAILED');
      setMessage(data?.message || data?.code || 'Withdraw failed');
      return;
    }
    setMessage('Artifact withdrawn.');
    await loadCompany(selectedId);
  }

  async function onArchive(artifactId) {
    if (!window.confirm('Archive this artifact? History is retained.')) return;
    setBusy(true);
    const { res, data } = await api('/api/company-master/artifacts/archive', {
      method: 'POST',
      body: JSON.stringify({ artifact_id: artifactId }),
    });
    setBusy(false);
    if (!res.ok) {
      setError(data?.error || data?.code || 'ARCHIVE_FAILED');
      setMessage(data?.message || data?.code || 'Archive failed');
      return;
    }
    setMessage('Artifact archived.');
    await loadCompany(selectedId);
  }

  async function onCleanupSynthetic() {
    setBusy(true);
    const { res, data } = await api('/api/company-master/synthetic-cleanup', {
      method: 'POST',
      body: JSON.stringify({ prefix: 'cmp_synthetic_' }),
    });
    setBusy(false);
    if (!res.ok) {
      setError(data?.error || 'CLEANUP_FAILED');
      return;
    }
    setMessage(`Cleaned ${data.deleted_count} synthetic companies`);
    setSelectedId(null);
    setDetail(null);
    setForm(EMPTY_FORM);
    setCurrentLogo(null);
    await refreshList();
  }

  async function onAdminDebugResolve() {
    if (!selectedId) return;
    const { res, data } = await api(
      `/api/company-master/resolve?company_id=${encodeURIComponent(selectedId)}&alias=${encodeURIComponent('brand.logo.primary')}`
    );
    setDebugResolve({ ok: res.ok, data });
  }

  function prepareReplace() {
    setUploadMeta({
      artifact_type: 'LOGO',
      logical_alias: 'brand.logo.primary',
      sensitivity_classification: 'PUBLIC',
      title: '',
    });
  }

  const artifacts = detail?.artifacts || [];

  function rowActions(a) {
    const state = a.human_state || '';
    const pending = state === 'Pending approval' || a.lifecycle_status === 'UPLOADED';
    const current = state === 'Current' || (a.is_current === true && a.approval_status === 'APPROVED');
    const superseded = state === 'Superseded';
    const withdrawn = state === 'Withdrawn';
    const archived = state === 'Archived';
    const canDownload =
      a.retrieval_reference &&
      a.publication_status !== 'RESTRICTED' &&
      a.sensitivity_classification !== 'CONFIDENTIAL' &&
      a.sensitivity_classification !== 'HIGHLY_RESTRICTED';

    const actions = [];
    if (pending) {
      actions.push(
        <button key="rm" type="button" style={btnMuted} disabled={busy} onClick={() => onRemovePending(a.id)}>
          Remove
        </button>
      );
      actions.push(
        <button key="ap" type="button" style={btn} disabled={busy} onClick={() => onApprove(a.id)}>
          Approve
        </button>
      );
    }
    if (current) {
      if (canDownload || a.publication_status === 'RESTRICTED') {
        actions.push(
          <a
            key="dl"
            href={a.retrieval_reference}
            style={{ ...btnMuted, textDecoration: 'none', display: 'inline-block' }}
          >
            Download
          </a>
        );
      }
      actions.push(
        <button key="rep" type="button" style={btnMuted} disabled={busy} onClick={prepareReplace}>
          Replace
        </button>
      );
      actions.push(
        <button key="wd" type="button" style={btnMuted} disabled={busy} onClick={() => onWithdraw(a.id)}>
          Withdraw
        </button>
      );
      actions.push(
        <button key="ar" type="button" style={btnMuted} disabled={busy} onClick={() => onArchive(a.id)}>
          Archive
        </button>
      );
    }
    if (superseded || withdrawn || archived) {
      actions.push(
        <a
          key="dl2"
          href={a.retrieval_reference}
          style={{ ...btnMuted, textDecoration: 'none', display: 'inline-block' }}
        >
          Download
        </a>
      );
      if (superseded && !archived) {
        actions.push(
          <button key="ar2" type="button" style={btnMuted} disabled={busy} onClick={() => onArchive(a.id)}>
            Archive
          </button>
        );
      }
    }
    return actions;
  }

  return (
    <div style={pageStyle} data-testid="company-master-app">
      <Head>
        <title>Company Master</title>
      </Head>
      <div style={shell}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 16,
            alignItems: 'baseline',
            marginBottom: 20,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: '#8899aa',
              }}
            >
              CorpFlowAI
            </div>
            <h1 style={{ margin: '6px 0 0', fontSize: 28, fontWeight: 600 }}>Company Master</h1>
            <p style={{ margin: '8px 0 0', color: '#99aabb', maxWidth: 640, lineHeight: 1.45 }}>
              Authoritative company identity, facts and artifact references. Tenant ownership and
              publication status are system-controlled.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link href="/change" style={{ ...btnMuted, textDecoration: 'none' }}>
              /change
            </Link>
            <button type="button" style={btnMuted} onClick={() => refreshList()} disabled={busy}>
              Refresh
            </button>
            <button type="button" style={btnMuted} onClick={() => onCleanupSynthetic()} disabled={busy}>
              Cleanup synthetic
            </button>
          </div>
        </div>

        {(error || message) && (
          <div
            style={{
              ...glass,
              borderColor: error ? 'rgba(255,100,100,0.35)' : 'rgba(255,255,255,0.08)',
            }}
          >
            {error && <div style={{ color: '#ffb4b4', marginBottom: 6 }}>Error: {error}</div>}
            {message && (
              <div style={{ color: '#cfe0ff', whiteSpace: 'pre-wrap', fontSize: 13 }}>{message}</div>
            )}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16 }}>
          <div style={glass}>
            <div
              style={{
                fontSize: 12,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: '#8899aa',
                marginBottom: 12,
              }}
            >
              Companies
            </div>
            {companies.length === 0 && (
              <div style={{ color: '#778899', fontSize: 13 }}>No companies yet.</div>
            )}
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {companies.map((c) => (
                <li key={c.company_id} style={{ marginBottom: 8 }}>
                  <button
                    type="button"
                    onClick={() => loadCompany(c.company_id)}
                    style={{
                      ...btnMuted,
                      width: '100%',
                      textAlign: 'left',
                      background:
                        selectedId === c.company_id
                          ? 'rgba(80,140,255,0.22)'
                          : 'rgba(255,255,255,0.04)',
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{c.legal_name}</div>
                    <div style={{ fontSize: 11, color: '#99aabb', marginTop: 4 }}>{c.company_id}</div>
                    <div style={{ fontSize: 11, color: '#778899', marginTop: 2 }}>
                      {c.jurisdiction || '—'} · {c.is_synthetic ? 'synthetic' : 'live-candidate'}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <form style={glass} onSubmit={selectedId ? onSave : onCreate}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  marginBottom: 14,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: '#8899aa',
                  }}
                >
                  {selectedId ? `Edit ${selectedId}` : 'Create company'}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {selectedId && (
                    <button
                      type="button"
                      style={btnMuted}
                      onClick={() => {
                        setSelectedId(null);
                        setDetail(null);
                        setForm(EMPTY_FORM);
                        setCurrentLogo(null);
                        setDebugResolve(null);
                      }}
                    >
                      New
                    </button>
                  )}
                  <button type="submit" style={btn} disabled={busy}>
                    {selectedId ? 'Save' : 'Create'}
                  </button>
                </div>
              </div>

              <div style={grid2}>
                {[
                  ['legal_name', 'Legal name'],
                  ['trading_name', 'Trading name'],
                  ['registration_number', 'Registration number'],
                  ['tax_number', 'Tax number'],
                  ['public_email', 'Public email'],
                  ['public_phone', 'Public phone'],
                  ['website', 'Website'],
                ].map(([key, lab]) => (
                  <div key={key}>
                    <label style={label} htmlFor={`cm-${key}`}>
                      {lab}
                    </label>
                    <input
                      id={`cm-${key}`}
                      style={input}
                      value={form[key] || ''}
                      onChange={(e) => setField(key, e.target.value)}
                    />
                  </div>
                ))}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={label} htmlFor="cm-jurisdiction-filter">
                    Jurisdiction
                  </label>
                  <input
                    id="cm-jurisdiction-filter"
                    type="search"
                    placeholder="Search countries…"
                    style={{ ...input, marginBottom: 8 }}
                    value={jurisdictionFilter}
                    onChange={(e) => setJurisdictionFilter(e.target.value)}
                  />
                  <select
                    id="cm-jurisdiction"
                    aria-label="Jurisdiction"
                    style={input}
                    value={form.jurisdiction}
                    onChange={(e) => setField('jurisdiction', e.target.value)}
                  >
                    {filteredJurisdictions.map((j) => (
                      <option key={j.code} value={j.code}>
                        {j.label} ({j.code})
                      </option>
                    ))}
                  </select>
                  {form.jurisdiction === 'OTHER' ? (
                    <input
                      aria-label="Custom jurisdiction"
                      style={{ ...input, marginTop: 8 }}
                      placeholder="Custom jurisdiction (required)"
                      value={form.jurisdiction_other}
                      onChange={(e) => setField('jurisdiction_other', e.target.value)}
                    />
                  ) : null}
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <label style={label} htmlFor="cm-physical">
                  Physical address
                </label>
                <textarea
                  id="cm-physical"
                  style={{ ...input, minHeight: 64 }}
                  value={form.physical_address || ''}
                  onChange={(e) => setField('physical_address', e.target.value)}
                />
              </div>
              <div style={{ marginTop: 12 }}>
                <label style={label} htmlFor="cm-registered">
                  Registered address
                </label>
                <textarea
                  id="cm-registered"
                  style={{ ...input, minHeight: 64 }}
                  value={form.registered_address || ''}
                  onChange={(e) => setField('registered_address', e.target.value)}
                />
              </div>
              {!selectedId && (
                <label
                  style={{
                    display: 'flex',
                    gap: 8,
                    alignItems: 'center',
                    marginTop: 12,
                    fontSize: 13,
                    color: '#cfe0ff',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={form.is_synthetic === true}
                    onChange={(e) => setField('is_synthetic', e.target.checked)}
                  />
                  Synthetic test company (safe to cleanup)
                </label>
              )}
            </form>

            {selectedId && (
              <>
                <div style={glass} data-testid="current-primary-logo">
                  <div
                    style={{
                      fontSize: 12,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: '#8899aa',
                      marginBottom: 12,
                    }}
                  >
                    Current primary logo
                  </div>
                  {currentLogo ? (
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                      {logoPreviewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={logoPreviewUrl}
                          alt="Current primary logo"
                          style={{
                            maxWidth: 160,
                            maxHeight: 100,
                            objectFit: 'contain',
                            borderRadius: 8,
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.1)',
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 120,
                            height: 80,
                            borderRadius: 8,
                            background: 'rgba(255,255,255,0.04)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12,
                            color: '#778899',
                          }}
                        >
                          No preview
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ fontWeight: 600 }}>
                          {currentLogo.title || currentLogo.original_filename || currentLogo.asset_id}
                        </div>
                        <div style={{ fontSize: 13, color: '#99aabb', marginTop: 4 }}>
                          Version {currentLogo.version_number} · {currentLogo.approval_status} · Current
                        </div>
                        <div style={{ fontSize: 12, color: '#778899', marginTop: 4 }}>
                          Uploaded{' '}
                          {currentLogo.uploaded_at
                            ? new Date(currentLogo.uploaded_at).toLocaleString()
                            : currentLogo.effective_from
                              ? new Date(currentLogo.effective_from).toLocaleString()
                              : '—'}
                        </div>
                        <div style={{ marginTop: 10 }}>
                          {currentLogo.retrieval_reference ? (
                            <a
                              href={currentLogo.retrieval_reference}
                              style={{ ...btnMuted, textDecoration: 'none', display: 'inline-block' }}
                            >
                              Download
                            </a>
                          ) : null}
                          <button type="button" style={btn} disabled={busy} onClick={prepareReplace}>
                            Replace
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p style={{ color: '#778899', fontSize: 14, margin: 0 }}>
                      No current primary logo. Upload and approve a logo below.
                    </p>
                  )}
                </div>

                <div style={glass}>
                  <div
                    style={{
                      fontSize: 12,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: '#8899aa',
                      marginBottom: 12,
                    }}
                  >
                    Upload artifact
                  </div>
                  <div style={grid2}>
                    <div>
                      <label style={label}>Artifact type</label>
                      <select
                        style={input}
                        value={uploadMeta.artifact_type}
                        onChange={(e) => {
                          const artifact_type = e.target.value;
                          const next = { ...uploadMeta, artifact_type };
                          if (artifact_type === 'LOGO') {
                            next.logical_alias = 'brand.logo.primary';
                            next.sensitivity_classification = 'PUBLIC';
                          } else if (artifact_type === 'REGISTRATION_CERTIFICATE') {
                            next.logical_alias = 'legal.registration_certificate.current';
                            next.sensitivity_classification = 'CONFIDENTIAL';
                          } else if (artifact_type === 'TAX_CERTIFICATE') {
                            next.logical_alias = 'legal.tax_certificate.current';
                            next.sensitivity_classification = 'CONFIDENTIAL';
                          } else if (artifact_type === 'BRAND_IMAGE') {
                            next.logical_alias = 'brand.image.primary';
                            next.sensitivity_classification = 'PUBLIC';
                          } else {
                            next.logical_alias = 'document.other.current';
                            next.sensitivity_classification = 'INTERNAL';
                          }
                          setUploadMeta(next);
                        }}
                      >
                        <option value="LOGO">Primary / brand logo</option>
                        <option value="BRAND_IMAGE">Additional brand asset</option>
                        <option value="REGISTRATION_CERTIFICATE">Registration certificate</option>
                        <option value="TAX_CERTIFICATE">Tax / compliance document</option>
                        <option value="OTHER_COMPANY_DOCUMENT">Other company document</option>
                      </select>
                    </div>
                    <div>
                      <label style={label}>Logical purpose</label>
                      <input
                        style={input}
                        value={uploadMeta.logical_alias}
                        onChange={(e) =>
                          setUploadMeta({ ...uploadMeta, logical_alias: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label style={label}>Sensitivity</label>
                      <select
                        style={input}
                        value={uploadMeta.sensitivity_classification}
                        onChange={(e) =>
                          setUploadMeta({
                            ...uploadMeta,
                            sensitivity_classification: e.target.value,
                          })
                        }
                      >
                        <option>PUBLIC</option>
                        <option>INTERNAL</option>
                        <option>CONFIDENTIAL</option>
                        <option>HIGHLY_RESTRICTED</option>
                      </select>
                    </div>
                    <div>
                      <label style={label}>Title</label>
                      <input
                        style={input}
                        value={uploadMeta.title}
                        onChange={(e) => setUploadMeta({ ...uploadMeta, title: e.target.value })}
                      />
                    </div>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml,application/pdf,.png,.jpg,.jpeg,.svg,.pdf"
                      disabled={busy}
                      onChange={(e) => {
                        const f = e.target.files && e.target.files[0];
                        if (f) onUpload(f);
                        e.target.value = '';
                      }}
                    />
                    <div style={{ fontSize: 12, color: '#778899', marginTop: 8 }}>
                      PNG, JPEG, SVG, PDF. Visibility for public use is set by the system — uploaders
                      cannot self-publish.
                    </div>
                  </div>
                </div>

                <div style={glass}>
                  <div
                    style={{
                      fontSize: 12,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: '#8899aa',
                      marginBottom: 12,
                    }}
                  >
                    Artifacts / versions
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={th}>Type / title</th>
                        <th style={th}>Ver</th>
                        <th style={th}>Uploaded</th>
                        <th style={th}>Status</th>
                        <th style={th}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {artifacts.map((a) => {
                        const state = a.human_state || a.lifecycle_status || '—';
                        const badge = stateBadgeStyle(state);
                        return (
                          <tr key={a.id}>
                            <td style={td}>
                              <div style={{ fontWeight: 600 }}>
                                {a.title || a.original_filename || a.logical_alias}
                              </div>
                              <div style={{ fontSize: 11, color: '#778899' }}>
                                {a.artifact_type} · {a.logical_alias}
                              </div>
                            </td>
                            <td style={td}>v{a.version_number}</td>
                            <td style={td}>
                              {a.uploaded_at ? new Date(a.uploaded_at).toLocaleString() : '—'}
                            </td>
                            <td style={td}>
                              <span
                                style={{
                                  ...badge,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  padding: '3px 8px',
                                  borderRadius: 999,
                                  display: 'inline-block',
                                }}
                              >
                                {state}
                              </span>
                              <div style={{ fontSize: 11, color: '#778899', marginTop: 4 }}>
                                {a.is_current ? 'Current' : 'Not current'} · {a.approval_status}
                              </div>
                            </td>
                            <td style={td}>{rowActions(a)}</td>
                          </tr>
                        );
                      })}
                      {artifacts.length === 0 && (
                        <tr>
                          <td style={td} colSpan={5}>
                            No artifacts yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <details
                  style={{ ...glass, color: '#778899' }}
                  onToggle={(e) => setShowAdminDebug(e.target.open)}
                >
                  <summary style={{ cursor: 'pointer', fontSize: 12 }}>
                    Admin debug (resolver details — not for ordinary use)
                  </summary>
                  {showAdminDebug ? (
                    <div style={{ marginTop: 12 }}>
                      <button
                        type="button"
                        style={btnMuted}
                        disabled={busy}
                        onClick={() => onAdminDebugResolve()}
                      >
                        Load resolver payload
                      </button>
                      {debugResolve ? (
                        <pre
                          style={{
                            fontSize: 11,
                            overflow: 'auto',
                            background: 'rgba(0,0,0,0.35)',
                            padding: 12,
                            borderRadius: 8,
                            marginTop: 10,
                          }}
                        >
                          {JSON.stringify(debugResolve.data, null, 2)}
                        </pre>
                      ) : null}
                    </div>
                  ) : null}
                </details>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
