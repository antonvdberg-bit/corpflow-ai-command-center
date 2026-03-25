# Factory Inventory (Tools & Infra Bridge)
Generated: `2026-03-25`

This document organizes the repo’s runnable code/artifacts into three “Factory surfaces”:
1. Computed Logic (Python/JS)
2. Data Storage (Baserow / local JSON / DB)
3. Communication (API routes + automation shells)

For each entry, a **Standardized Invocation** is provided.

## Computed Logic (Python / JS)

### Agent Engine (Python)
| Artifact | Role | Standardized Invocation |
|---|---|---|
| `core/engine/agent.py` | Main GeminiAgent entrypoint | `python core/engine/agent.py --workspace "<WORKSPACE_PATH>" "<TASK>"` |
| `core/engine/src/agent.py` | Core Think-Act-Reflect agent implementation | `python core/engine/src/agent.py --workspace "<WORKSPACE_PATH>" "<TASK>"` |
| `core/engine/autonomous_agent.py` | Autonomous multi-step orchestrator | `python core/engine/autonomous_agent.py --workspace "<WORKSPACE_PATH>" "<TASK>"` |
| `core/engine/sync_sheets.py` | Factory sync runner (auditing loop) | `python core/engine/sync_sheets.py` |
| `core/engine/force_luxe_sync.py` | Tenant sync accelerator | `python core/engine/force_luxe_sync.py` |
| `core/engine/integrity_guard.py` | Pre-flight integrity checks | `python core/engine/integrity_guard.py` |
| `core/dispatch.py` | CLI dispatcher into response engine | `python core/dispatch.py "<TENANT_ID>" "<QUERY>"` |

### Local Tools (Python)
Tools are auto-discovered by the agent from `core/engine/src/tools/*.py` (public functions only).

| Tool module | Standardized Invocation |
|---|---|
| `core/engine/src/tools/example_tool.py` | `python -c "from core.engine.src.tools.example_tool import <FUNC_NAME>; print(<FUNC_NAME>(...))"` |
| `core/engine/src/tools/demo_tool.py` | `python -c "from core.engine.src.tools.demo_tool import <FUNC_NAME>; print(<FUNC_NAME>(...))"` |
| `core/engine/src/tools/openai_proxy.py` | `python -c "from core.engine.src.tools.openai_proxy import <FUNC_NAME>; print(<FUNC_NAME>(...))"` |
| `core/engine/src/tools/ollama_local.py` | `python -c "from core.engine.src.tools.ollama_local import <FUNC_NAME>; print(<FUNC_NAME>(...))"` |
| `core/engine/src/tools/memory_tools.py` | `python -c "from core.engine.src.tools.memory_tools import <FUNC_NAME>; print(<FUNC_NAME>(...))"` |
| `core/engine/src/tools/baserow_client_sync.py` | `python -c "from core.engine.src.tools.baserow_client_sync import get_client_config; print(get_client_config('<CLIENT_ID>'))"` |
| `core/engine/src/tools/execution_tool.py` | `python -c "from core.engine.src.tools.execution_tool import <FUNC_NAME>; print(<FUNC_NAME>(...))"` |
| `core/engine/src/tools/mcp_tools.py` | `python -c "from core.engine.src.tools.mcp_tools import list_mcp_servers; print(list_mcp_servers())"` |

### Services / Utilities (Python)
| Artifact | Role | Standardized Invocation |
|---|---|---|
| `core/services/response_engine.py` | Tenant-aware lead detection + Baserow write | `python core/services/response_engine.py` |
| `core/services/vercel_deployer.py` | Provision Vercel subdomains/domains | `python core/services/vercel_deployer.py` |
| `core/services/whatsapp_notifier.py` | WhatsApp lead alert (Twilio) | `python core/services/whatsapp_notifier.py` |
| `core/services/api_gateway.py` | API gateway utilities | `python core/services/api_gateway.py` |
| `core/services/notifier.py` | Admin notification hooks | `python core/services/notifier.py` |
| `core/services/booking_manager.py` | Google calendar booking (example) | `python core/services/booking_manager.py` |
| `core/onboarding/baserow_listener.py` | Provision tenants from Baserow | `python core/onboarding/baserow_listener.py` |
| `core/onboarding/onboard_client.py` | Create tenant workspace skeleton | `python core/onboarding/onboard_client.py` |
| `core/src/onboarding.py` | Legacy onboarding helper | `python core/src/onboarding.py` |
| `ai_gateway.py` | Gateway glue (see file) | `python ai_gateway.py` |
| `sync_conductor.py` | Poll external glue endpoint + update `brand-config.json` | `python sync_conductor.py` |
| `system_rebuild.py` | Rebuild/fix factory state | `python system_rebuild.py` |
| `add_columns.py` | Prisma/Baserow schema augmentation utility | `python add_columns.py` |
| `core/engine/src/sandbox/*` | Sandboxed execution primitives | `python core/engine/src/sandbox/local.py` |

### Computed Logic (Node / JS)
| Artifact | Role | Standardized Invocation |
|---|---|---|
| `api/cmp/router.js` | CMP action router (Vercel serverless) | `npx next dev` then call `POST /api/cmp/ticket-create` etc. |
| `api/cmp/_lib/*.js` | CMP costing/impact helpers | `node api/cmp/_lib/<FILE>.js` (module-style) |
| `api/provision.js` | Tenant provisioning + Baserow table provisioning | `npx next dev` then `POST /api/provision` |
| `api/audit.js` | Audit / DB stability handler (Prisma) | `npx next dev` then `POST /api/audit` |
| `api/webhook.js` | Incoming webhook (Telegram via bot token) | `npx next dev` then `POST /api/webhook` |
| `api/index.js` / `api/main.js` / `api/config.js` | Misc API handlers | `npx next dev` then call respective routes |
| `pages/index.js` | Web entry UI | `npx next dev` |
| `scripts/onboard_luxe.js` | Tenant onboarding script via Prisma | `node scripts/onboard_luxe.js` |
| `scanner.js` / `public/scanner.js` | Local scanners / tunnel blocks (UI + scripts) | `node scanner.js` |

## Data Storage (Baserow / Local JSON / DB)

### Baserow Storage Surfaces
| Artifact | Standardized Invocation |
|---|---|
| `api/cmp/_lib/baserow.js` | Baserow row CRUD wrapper (used by CMP routes) |
| `core/onboarding/baserow_listener.py` | `python core/onboarding/baserow_listener.py` |
| `core/engine/src/tools/baserow_client_sync.py` | `python -c "from core.engine.src.tools.baserow_client_sync import get_client_config; print(get_client_config('<CLIENT_ID>'))"` |
| `api/provision.js` | `npx next dev` then `POST /api/provision` |
| `core/services/response_engine.py` | `python core/services/response_engine.py` |

### Local / Filesystem Storage (JSON / Markdown)
| Artifact | Standardized Invocation |
|---|---|
| `memory/agent_memory.md` | Memory is written automatically by the agent |
| `memory/agent_summary.md` | Memory summary checkpoint |
| `agent_memory.json` | Legacy/alternate memory artifact (if used elsewhere) |
| `brand-config.json` | Updated by `sync_conductor.py` |
| `data_cache.json` | Updated by `auditor.sh` / sync jobs |
| `recovery_vault.json` | Journal recovery when DB calls fail |
| `feedback-db.json` | Feedback storage (if used by routes) |
| `client_manifest.json` | Client routing manifest |
| `db/*.db` | SQLite artifacts (avoid in prod if constrained) |
| `luxe_core.db`, `luxe_intelligence.db` | Local intelligence DB |

### Prisma / Relational DB
| Artifact | Standardized Invocation |
|---|---|
| `prisma/*` | `npx prisma generate` then use Prisma client in API routes |
| `api/audit.js` | `npx next dev` then `POST /api/audit` |
| `api/provision.js` | `npx next dev` then `POST /api/provision` |

## Communication (API Routes + Automation Shells)

### API Routes (Next/Vercel)
| Route surface | Standardized Invocation |
|---|---|
| `/api/cmp/*` (Vercel rewrites to `api/cmp/router.js`) | Run: `npx next dev` then call: `POST /api/cmp/ticket-create`, `GET /api/cmp/ticket-get?id=...`, `POST /api/cmp/costing-preview`, `POST /api/cmp/approve-build`, `POST /api/cmp/ai-interview` |
| `/api/provision` | Run: `npx next dev` then call `POST /api/provision` |
| `/api/audit` | Run: `npx next dev` then call `POST /api/audit` |
| `/api/webhook` | Run: `npx next dev` then call `POST /api/webhook` |
| FastAPI `/api/chat` + `/api/health` (`api/index.py`) | Run: `python -m uvicorn api.index:app --reload` |

### Automation Shell Scripts
| Script | Role | Standardized Invocation |
|---|---|---|
| `deploy.sh` | Deploy/publish | `bash deploy.sh` |
| `core/engine/install.sh` | Install prerequisites | `bash core/engine/install.sh` |
| `auditor.sh` | Protected sync + showcase update | `bash auditor.sh` |
| `run_heartbeat.sh` | Heartbeat loop (sync sheets + auditor) | `bash run_heartbeat.sh` |
| `start_demo.sh` | Launch demo | `bash start_demo.sh` |
| `launch_demo.sh` | Launch demo (variant) | `bash launch_demo.sh` |
| `start_onboarding.sh` | Start onboarding | `bash start_onboarding.sh` |
| `status_hud.sh` | Display HUD | `bash status_hud.sh` |

