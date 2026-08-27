# #1194 launch enquiry → Action Queue triage evidence

Proof-mode only. No live enquiry submit, no production write, no external send.

| Item | Value |
|------|--------|
| Current `main` | `b731411734edb01b7dbb8d7e20247c5a7805983a` |
| Lead Rescue fixture | `syn-1171-lr-enquiry` (Luca Lagoon Desk) |
| Website Rescue fixture | `syn-1171-wr-enquiry` (Mira Pages Studio) |
| Route sequence | buyer-enquiry fixture → `/app/queue?proof=1` → `/app/prospects/<id>?proof=1` |
| Machine evidence | `triage-evidence.json` |

Desktop (1440×900) and mobile (390×844) screenshots were captured against the local proof server (`scripts/issue-1194-local-proof-server.mjs`). Tenant screenshots show Requests & Progress / Service & change only — no Action Queue.
