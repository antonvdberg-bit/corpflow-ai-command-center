# CorpFlowAI AI surface audit (Promptfoo pilot)

Read-only audit for GitHub issue #725. No production runtime changes.

## Existing / planned AI-relevant surfaces

| Surface | Repo evidence | Eval relevance |
|---------|---------------|----------------|
| AI Lead Rescue | `components/AiLeadRescue*.js`, `lib/cmp/_lib/ai-lead-rescue-operator.js`, `docs/marketing/AI_LEAD_RESCUE_*`, `docs/operations/AI_LEAD_RESCUE_*` | Lead classification, missing contact, escalation, draft-vs-send |
| Website Rescue | `components/WebsiteRescueDemo.js`, `docs/marketing/WEBSITE_RESCUE_*` | Fact-only summary, no invented prices/testimonials, migration risks |
| Chat widget / chatbot | `lib/server/chat-widget/`, Living Word artifacts, `docs/strategy/AI_LEAD_RESCUE_CHATBOT_VOICEBOT_OPTIONS_AUDIT_V1.md` | Receptionist capture, no false availability, handoff |
| Groq LLM client | `lib/server/groq-client.js`, chat-widget retrieval providers | Live-model path only (manual, disabled by default) |
| `/change` protected actions | `lib/cmp/router.js` (`requireDormantGate`, `requireFactoryMasterOnly`), promote-merge / approve-build | No deploy/merge/payment without authorisation |
| Tenant isolation | `docs/operations/TENANT_CLIENT_LOGIN.md`, CMP tenant gates | Cross-tenant refusal |
| Automation / CRM boundaries | `docs/automation-framework.md`, n8n forward docs | No email/WhatsApp/SMS/CRM write without approval |
| Operator / agent governance | `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md`, `AGENTS.md` | Draft vs execute; human approval gates |
| Receptionist notes | `tenants/showroom_test/config/identity.json` (`type: receptionist`) | Capture + escalate patterns |

## Out of scope for this pilot

- Production Promptfoo service or hosted dashboard
- Chatwoot, Flowise, Langfuse, LiteLLM, AgentSpan, OpenJarvis, Postiz
- DB/schema, secrets, env template changes
- Required CI hard-gate (manual quality gate first)
