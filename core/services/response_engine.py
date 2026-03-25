import os, json, requests
from pathlib import Path
from groq import Groq
from core.services.vanguard_telemetry import emit_logic_failure
from core.engine.src.tenant_manager import SecurityTransgressionError, get_tenant_context

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def sync_lead_to_baserow(tenant_id, name, details):
    # This sends the data back to your Baserow table
    url = f"{os.getenv('BASEROW_URL')}{os.getenv('BASEROW_TABLE_ID')}/?user_field_names=true"
    headers = {"Authorization": f"Token {os.getenv('BASEROW_TOKEN')}", "Content-Type": "application/json"}
    payload = {
        "Client Name": f"LEAD: {name}",
        "Onboarding Status": "Lead Captured",
        "Notes": details
    }
    try:
        requests.post(url, headers=headers, json=payload, timeout=10)
    except Exception as e:
        emit_logic_failure(
            source="core/services/response_engine.py:sync_lead_to_baserow",
            severity="error",
            error=e,
            recommended_action="Verify BASEROW_URL/BASEROW_TOKEN/BASEROW_TABLE_ID and Baserow connectivity.",
            cmp={"ticket_id": "n/a", "action": "lead-sync"},
        )
        return False
    return True

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

        # Use Llama 3.1 to talk and detect if a lead is present
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
            ok = sync_lead_to_baserow(tenant_id, "New Web Lead", user_query)
            suffix = "(Lead captured in CRM ✅)" if ok else "(Lead capture failed; check telemetry)"
            return response.replace("SIGNAL_LEAD", suffix)

        return response
    except SecurityTransgressionError:
        # Telemetry already emitted by tenant manager; auto-terminate session.
        raise
    except Exception as e:
        emit_logic_failure(
            source="core/services/response_engine.py:get_tenant_response",
            severity="fatal",
            error=e,
            recommended_action="Inspect tenant config files and validate GROQ_API_KEY + Baserow env vars.",
            cmp={"ticket_id": "n/a", "action": "tenant-response"},
        )
        return f"System error while processing request for tenant '{tenant_id}'."

if __name__ == "__main__":
    print(get_tenant_response("showroom_test", "My name is Anton and my number is 555-0199"))
