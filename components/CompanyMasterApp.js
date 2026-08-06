import React, { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

const pageStyle = {
  minHeight: '100vh',
  background: '#050505',
  color: '#eef6ff',
  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
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
const label = { display: 'block', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8899aa', marginBottom: 6 };
const btn = {
  padding: '10px 14px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.16)',
  background: 'rgba(80,140,255,0.18)',
  color: '#eef6ff',
  cursor: 'pointer',
  fontSize: 13,
};
const btnMuted = { ...btn, background: 'rgba(255,255,255,0.06)' };
const grid2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 };
const th = { textAlign: 'left', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8899aa', padding: '8px 6px', borderBottom: '1px solid rgba(255,255,255,0.08)' };
const td = { padding: '10px 6px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 13, verticalAlign: 'top' };

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
  tenant_id: '',
  jurisdiction: 'MU',
  company_type: 'PRIVATE_COMPANY',
  lifecycle_status: 'DRAFT',
  verification_status: 'UNVERIFIED',
  approval_status: 'NOT_REQUESTED',
  is_synthetic: true,
};

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

/**
 * @param {{ initialCompanies?: Array<object>|null, initialError?: object|null, signedIn?: boolean, username?: string|null }} props
 */
export default function CompanyMasterApp(props = {}) {
  const [companies, setCompanies] = useState(Array.isArray(props.initialCompanies) ? props.initialCompanies : []);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [message, setMessage] = useState(props.initialError?.message || null);
  const [error, setError] = useState(props.initialError?.error || null);
  const [busy, setBusy] = useState(false);
  const [resolveResult, setResolveResult] = useState(null);
  const [uploadMeta, setUploadMeta] = useState({
    artifact_type: 'LOGO',
    logical_alias: 'brand.logo.primary',
    sensitivity_classification: 'PUBLIC',
    publication_status: 'NOT_ASSESSED',
    title: '',
  });

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

  const loadCompany = useCallback(async (companyId) => {
    if (!companyId) return;
    setBusy(true);
    const { res, data } = await api(`/api/company-master/companies/${encodeURIComponent(companyId)}`);
    setBusy(false);
    if (!res.ok) {
      setError(data?.error || 'LOAD_FAILED');
      setMessage(data?.message || data?.code || 'Could not load company');
      return;
    }
    setSelectedId(companyId);
    setDetail(data);
    const c = data.company || {};
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
      tenant_id: c.tenant_id || '',
      jurisdiction: c.jurisdiction || 'MU',
      company_type: c.company_type || 'PRIVATE_COMPANY',
      lifecycle_status: c.lifecycle_status || 'DRAFT',
      verification_status: c.verification_status || 'UNVERIFIED',
      approval_status: c.approval_status || 'NOT_REQUESTED',
      is_synthetic: c.is_synthetic === true,
    });
    setMessage(`Loaded ${companyId}`);
    setError(null);
    setResolveResult(null);
  }, []);

  useEffect(() => {
    if (!Array.isArray(props.initialCompanies)) {
      refreshList().catch(() => {});
    }
  }, [props.initialCompanies, refreshList]);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onCreate(e) {
    e.preventDefault();
    setBusy(true);
    const { res, data } = await api('/api/company-master/companies', {
      method: 'POST',
      body: JSON.stringify(form),
    });
    setBusy(false);
    if (!res.ok) {
      setError(data?.error || data?.code || 'CREATE_FAILED');
      setMessage(JSON.stringify(data));
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
    const { res, data } = await api(`/api/company-master/companies/${encodeURIComponent(selectedId)}`, {
      method: 'PATCH',
      body: JSON.stringify(form),
    });
    setBusy(false);
    if (!res.ok) {
      setError(data?.error || data?.code || 'UPDATE_FAILED');
      setMessage(JSON.stringify(data));
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
          publication_status: uploadMeta.publication_status,
          title: uploadMeta.title || file.name,
          file_name: file.name,
          content_type: file.type || 'application/octet-stream',
          data_base64,
        }),
      });
      setBusy(false);
      if (!res.ok) {
        setError(data?.error || data?.code || 'UPLOAD_FAILED');
        setMessage(JSON.stringify(data));
        return;
      }
      setMessage(`Uploaded artifact ${data.artifact.id} v${data.artifact.version_number}`);
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
      setMessage(JSON.stringify(data));
      return;
    }
    setMessage(`Approved ${artifactId}`);
    await loadCompany(selectedId);
  }

  async function onResolve() {
    if (!selectedId) return;
    const { res, data } = await api(
      `/api/company-master/resolve?company_id=${encodeURIComponent(selectedId)}&alias=${encodeURIComponent('brand.logo.primary')}`,
    );
    setResolveResult({ ok: res.ok, data });
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
    await refreshList();
  }

  const artifacts = detail?.artifacts || [];

  return (
    <div style={pageStyle}>
      <Head>
        <title>Company Master</title>
      </Head>
      <div style={shell}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'baseline', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#8899aa' }}>CorpFlowAI</div>
            <h1 style={{ margin: '6px 0 0', fontSize: 28, fontWeight: 600 }}>Company Master</h1>
            <p style={{ margin: '8px 0 0', color: '#99aabb', maxWidth: 640, lineHeight: 1.45 }}>
              Authoritative company identity, facts and artifact references. Structured data in Postgres; binaries in the existing Postgres BYTEA artifact store.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link href="/change" style={{ ...btnMuted, textDecoration: 'none' }}>/change</Link>
            <button type="button" style={btnMuted} onClick={() => refreshList()} disabled={busy}>Refresh</button>
            <button type="button" style={btnMuted} onClick={() => onCleanupSynthetic()} disabled={busy}>Cleanup synthetic</button>
          </div>
        </div>

        {(error || message) && (
          <div style={{ ...glass, borderColor: error ? 'rgba(255,100,100,0.35)' : 'rgba(255,255,255,0.08)' }}>
            {error && <div style={{ color: '#ffb4b4', marginBottom: 6 }}>Error: {error}</div>}
            {message && <div style={{ color: '#cfe0ff', whiteSpace: 'pre-wrap', fontSize: 13 }}>{message}</div>}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16 }}>
          <div style={glass}>
            <div style={{ fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8899aa', marginBottom: 12 }}>Companies</div>
            {companies.length === 0 && <div style={{ color: '#778899', fontSize: 13 }}>No companies yet.</div>}
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
                      background: selectedId === c.company_id ? 'rgba(80,140,255,0.22)' : 'rgba(255,255,255,0.04)',
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{c.legal_name}</div>
                    <div style={{ fontSize: 11, color: '#99aabb', marginTop: 4 }}>{c.company_id}</div>
                    <div style={{ fontSize: 11, color: '#778899', marginTop: 2 }}>{c.lifecycle_status} · {c.is_synthetic ? 'synthetic' : 'live-candidate'}</div>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <form style={glass} onSubmit={selectedId ? onSave : onCreate}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
                <div style={{ fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8899aa' }}>
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
                        setResolveResult(null);
                      }}
                    >
                      New
                    </button>
                  )}
                  <button type="submit" style={btn} disabled={busy}>{selectedId ? 'Save' : 'Create'}</button>
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
                  ['tenant_id', 'Tenant ID (optional)'],
                  ['jurisdiction', 'Jurisdiction'],
                  ['company_type', 'Company type'],
                  ['lifecycle_status', 'Lifecycle status'],
                  ['verification_status', 'Verification status'],
                  ['approval_status', 'Approval status'],
                ].map(([key, lab]) => (
                  <div key={key}>
                    <label style={label} htmlFor={`cm-${key}`}>{lab}</label>
                    <input id={`cm-${key}`} style={input} value={form[key] || ''} onChange={(e) => setField(key, e.target.value)} />
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12 }}>
                <label style={label} htmlFor="cm-physical">Physical address</label>
                <textarea id="cm-physical" style={{ ...input, minHeight: 64 }} value={form.physical_address || ''} onChange={(e) => setField('physical_address', e.target.value)} />
              </div>
              <div style={{ marginTop: 12 }}>
                <label style={label} htmlFor="cm-registered">Registered address</label>
                <textarea id="cm-registered" style={{ ...input, minHeight: 64 }} value={form.registered_address || ''} onChange={(e) => setField('registered_address', e.target.value)} />
              </div>
              {!selectedId && (
                <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12, fontSize: 13, color: '#cfe0ff' }}>
                  <input type="checkbox" checked={form.is_synthetic === true} onChange={(e) => setField('is_synthetic', e.target.checked)} />
                  Synthetic test company (safe to cleanup)
                </label>
              )}
            </form>

            {selectedId && (
              <>
                <div style={glass}>
                  <div style={{ fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8899aa', marginBottom: 12 }}>Upload artifact</div>
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
                            next.publication_status = 'NOT_ASSESSED';
                          } else if (artifact_type === 'REGISTRATION_CERTIFICATE') {
                            next.logical_alias = 'legal.registration_certificate.current';
                            next.sensitivity_classification = 'CONFIDENTIAL';
                            next.publication_status = 'RESTRICTED';
                          } else if (artifact_type === 'TAX_CERTIFICATE') {
                            next.logical_alias = 'legal.tax_certificate.current';
                            next.sensitivity_classification = 'CONFIDENTIAL';
                            next.publication_status = 'RESTRICTED';
                          } else if (artifact_type === 'BRAND_IMAGE') {
                            next.logical_alias = 'brand.image.primary';
                            next.sensitivity_classification = 'PUBLIC';
                            next.publication_status = 'NOT_ASSESSED';
                          } else {
                            next.logical_alias = 'document.other.current';
                            next.sensitivity_classification = 'INTERNAL';
                            next.publication_status = 'INTERNAL_ONLY';
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
                      <label style={label}>Logical alias</label>
                      <input style={input} value={uploadMeta.logical_alias} onChange={(e) => setUploadMeta({ ...uploadMeta, logical_alias: e.target.value })} />
                    </div>
                    <div>
                      <label style={label}>Sensitivity</label>
                      <select style={input} value={uploadMeta.sensitivity_classification} onChange={(e) => setUploadMeta({ ...uploadMeta, sensitivity_classification: e.target.value })}>
                        <option>PUBLIC</option>
                        <option>INTERNAL</option>
                        <option>CONFIDENTIAL</option>
                        <option>HIGHLY_RESTRICTED</option>
                      </select>
                    </div>
                    <div>
                      <label style={label}>Publication</label>
                      <select style={input} value={uploadMeta.publication_status} onChange={(e) => setUploadMeta({ ...uploadMeta, publication_status: e.target.value })}>
                        <option>NOT_ASSESSED</option>
                        <option>INTERNAL_ONLY</option>
                        <option>APPROVED_PUBLIC</option>
                        <option>RESTRICTED</option>
                        <option>WITHDRAWN</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <label style={label}>Title</label>
                    <input style={input} value={uploadMeta.title} onChange={(e) => setUploadMeta({ ...uploadMeta, title: e.target.value })} />
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
                    <div style={{ fontSize: 12, color: '#778899', marginTop: 8 }}>PNG, JPEG, SVG, PDF. Size limit reuses Change Console upload max.</div>
                  </div>
                </div>

                <div style={glass}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                    <div style={{ fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8899aa' }}>Artifacts / versions</div>
                    <button type="button" style={btnMuted} onClick={onResolve} disabled={busy}>Resolve brand.logo.primary</button>
                  </div>
                  {resolveResult && (
                    <pre style={{ fontSize: 12, overflow: 'auto', background: 'rgba(0,0,0,0.35)', padding: 12, borderRadius: 8, marginBottom: 12 }}>
                      {JSON.stringify(resolveResult.data, null, 2)}
                    </pre>
                  )}
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={th}>Alias</th>
                        <th style={th}>Ver</th>
                        <th style={th}>Type</th>
                        <th style={th}>Lifecycle</th>
                        <th style={th}>Current</th>
                        <th style={th}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {artifacts.map((a) => (
                        <tr key={a.id}>
                          <td style={td}>
                            <div>{a.logical_alias}</div>
                            <div style={{ fontSize: 11, color: '#778899' }}>{a.id}</div>
                          </td>
                          <td style={td}>v{a.version_number}</td>
                          <td style={td}>{a.artifact_type}</td>
                          <td style={td}>{a.lifecycle_status}<div style={{ fontSize: 11, color: '#778899' }}>{a.approval_status}</div></td>
                          <td style={td}>{a.is_current ? 'yes' : 'no'}</td>
                          <td style={td}>
                            {a.approval_status !== 'APPROVED' && (
                              <button type="button" style={btn} onClick={() => onApprove(a.id)} disabled={busy}>Approve</button>
                            )}
                            {a.approval_status === 'APPROVED' && a.publication_status !== 'RESTRICTED' && (
                              <a href={a.retrieval_reference} style={{ ...btnMuted, textDecoration: 'none', display: 'inline-block' }}>Download</a>
                            )}
                          </td>
                        </tr>
                      ))}
                      {artifacts.length === 0 && (
                        <tr><td style={td} colSpan={6}>No artifacts yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
