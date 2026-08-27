# #1184 Delivery Workspace ERPNext continuity — operator evidence

Fresh current-main recapture on `b731411734edb01b7dbb8d7e20247c5a7805983a`. `/api/app/*` is intercepted with the same handlers Vercel serves via `api/factory_router.js` (local Next does not apply `vercel.json` rewrites).

```bash
NEXT_PORT=3000 NODE_ENV=development node scripts/capture-delivery-erpnext-continuity-1156.mjs
```

| File | What it shows |
|------|----------------|
| `operator-desktop-1440.png` | `/app/delivery?proof=1` at 1440×900. Synthetic row linked to `PROJ-0001` / `ISS-2026-00001`. Ada / Bea / Wren **Not linked**. |
| `operator-desktop-1440-drilldown.png` | Same + `?item=erpnext:cf1097-synthetic-delivery`. Reference panel shows Project/Issue + Change/Clients links. |
| `operator-mobile-390.png` | Same list at 390×844. |
| `operator-mobile-390-drilldown.png` | Same drilldown at 390×844. |
| `operator-evidence.json` | Expected vs actual + proof API + live GET (identifiers/status/HTTP only). |

Proof mode uses the recorded #1097 read-back for status (`recorded_1097_readback`). A separate live GET in this environment returned HTTP 200, status **Open**, `mutated: false`, `status_source: erpnext_get`. No ERPNext write. No secrets in this folder.
