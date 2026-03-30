/**
 * Initialize Baserow "Sovereign Factory" schema via REST API.
 *
 * Usage (PowerShell):
 *   $env:BASEROW_URL="https://YOUR_BASEROW_HOST"
 *   $env:BASEROW_TOKEN="..."
 *   $env:BASEROW_GROUP_ID="187534"
 *   node scripts/init_baserow_factory_schema.mjs
 */

const baseUrl = (process.env.BASEROW_URL || "https://api.baserow.io").replace(/\/$/, "");
const token = String(process.env.BASEROW_TOKEN || "").trim();
const groupId = String(process.env.BASEROW_GROUP_ID || "").trim();

if (!token) {
  console.error("Missing BASEROW_TOKEN");
  process.exit(1);
}
if (!groupId) {
  console.error("Missing BASEROW_GROUP_ID (workspace/group id)");
  process.exit(1);
}

const headers = {
  Authorization: `Token ${token}`,
  "Content-Type": "application/json",
};

async function request(path, init) {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: { ...headers, ...(init?.headers || {}) },
  });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const msg = typeof body === "object" && body && body.error ? String(body.error) : `HTTP_${res.status}`;
    throw new Error(`${msg} ${url} :: ${text.slice(0, 500)}`);
  }
  return body;
}

async function createDatabase(name) {
  return request(`/api/database/groups/${encodeURIComponent(groupId)}/`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

async function createTable(databaseId, name) {
  return request(`/api/database/tables/database/${encodeURIComponent(String(databaseId))}/`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

async function createField(tableId, field) {
  return request(`/api/database/fields/table/${encodeURIComponent(String(tableId))}/`, {
    method: "POST",
    body: JSON.stringify(field),
  });
}

async function main() {
  const db = await createDatabase("Sovereign Factory");
  const databaseId = db.id;

  const tenants = await createTable(databaseId, "Tenants");
  const components = await createTable(databaseId, "Components");

  const tenantsId = tenants.id;
  const componentsId = components.id;

  // Tenants fields (EXACT)
  await createField(tenantsId, { name: "tenant_id", type: "text" });
  await createField(tenantsId, { name: "host_slug", type: "text" });
  await createField(tenantsId, { name: "fqdn", type: "text" });
  await createField(tenantsId, {
    name: "lifecycle",
    type: "single_select",
    select_options: [
      { value: "Build", color: "blue" },
      { value: "Published", color: "green" },
    ],
  });
  await createField(tenantsId, {
    name: "tenant_status",
    type: "single_select",
    select_options: [
      { value: "Active", color: "green" },
      { value: "Maintenance", color: "orange" },
    ],
  });
  await createField(tenantsId, { name: "execution_only", type: "boolean" });
  await createField(tenantsId, { name: "sovereign_key", type: "text" });

  // Components fields (EXACT)
  await createField(componentsId, { name: "key", type: "text" });
  await createField(componentsId, { name: "content", type: "long_text" });
  await createField(componentsId, { name: "version", type: "number" });

  const out = {
    BASEROW_URL: baseUrl,
    BASEROW_TENANT_TABLE_ID: String(tenantsId),
    BASEROW_CMP_TABLE_ID: String(componentsId),
  };

  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(String(e?.message || e));
  process.exit(2);
});

