import json
import os
from datetime import datetime, timezone
from pathlib import Path

import requests
from groq import Groq

from core.engine.src.tenant_manager import SecurityTransgressionError, get_tenant_context
from core.services.vanguard_telemetry import emit_logic_failure

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
_LEAD_FALLBACK = REPO_ROOT / "vanguard" / "audit-trail" / "python_lead_capture.jsonl"


def sync_lead_to_factory(tenant_id: str, name: str, details: str) -> bool:
    """Forward lead to n8n when N8N_WEBHOOK_URL is set; else append JSONL under vanguard/."""
    webhook = (os.getenv("N8N_WEBHOOK_URL") or "").strip()
    payload = {
        "tenant_id": tenant_id,
        "name": name,
        "details": details,
        "captured_at": datetime.now(timezone.utc).isoformat(),
        "source": "core/services/response_engine.py",
    }
    if webhook:
        try:
            r = requests.post(webhook, json=payload, timeout=15)
            r.raise_for_status()
            return True
        except Exception as e:
            emit_logic_failure(
                source="core/services/response_engine.py:sync_lead_to_factory",
                severity="error",
                error=e,
                recommended_action="Verify N8N_WEBHOOK_URL or check n8n workflow availability.",
                cmp={"ticket_id": "n/a", "action": "lead-sync"},
            )
            return False

    try:
        _LEAD_FALLBACK.parent.mkdir(parents=True, exist_ok=True)
        with _LEAD_FALLBACK.open("a", encoding="utf-8") as f:
            f.write(json.dumps(payload, ensure_ascii=False) + "\n")
        return True
    except Exception as e:
        emit_logic_failure(
            source="core/services/response_engine.py:sync_lead_to_factory",
            severity="error",
            error=e,
            recommended_action="Set N8N_WEBHOOK_URL or ensure vanguard/audit-trail is writable.",
            cmp={"ticket_id": "n/a", "action": "lead-sync"},
        )
        return False


def get_tenant_response(tenant_id, user_query):
    try:
        tenant_ctx = get_tenant_context(str(tenant_id))
        base = tenant_ctx.tenant_root / "config"
        identity_path = base / "identity.json"
        kb_path = base / "knowledge_base.txt"

        identity_text = tenant_ctx.guarded_read_text(
            identity_path, source="core/services/response_engine.py:get_tenant_response:identity"
        )
        kb = tenant_ctx.guarded_read_text(
            kb_path, source="core/services/response_engine.py:get_tenant_response:knowledge_base"
        )
        id_data = json.loads(identity_text)

        chat = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {
                    "role": "system",
                    "content": f"You are {id_data.get('name')}. Context: {kb}. If the user gives their name/phone, end your response with 'SIGNAL_LEAD'",
                },
                {"role": "user", "content": user_query},
            ],
        )
        response = chat.choices[0].message.content

        if "SIGNAL_LEAD" in response:
            ok = sync_lead_to_factory(tenant_id, "New Web Lead", user_query)
            suffix = "(Lead captured ✅)" if ok else "(Lead capture failed; check telemetry)"
            return response.replace("SIGNAL_LEAD", suffix)

        return response
    except SecurityTransgressionError:
        raise
    except Exception as e:
        emit_logic_failure(
            source="core/services/response_engine.py:get_tenant_response",
            severity="fatal",
            error=e,
            recommended_action="Inspect tenant config files and validate GROQ_API_KEY + N8N_WEBHOOK_URL (optional).",
            cmp={"ticket_id": "n/a", "action": "tenant-response"},
        )
        return f"System error while processing request for tenant '{tenant_id}'."


if __name__ == "__main__":
    print(get_tenant_response("showroom_test", "My name is Anton and my number is 555-0199"))
