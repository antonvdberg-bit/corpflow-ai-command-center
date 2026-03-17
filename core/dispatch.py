import sys
from core.services.response_engine import get_tenant_response

def handle_request():
    if len(sys.argv) < 3:
        print("Usage: python3 -m core.dispatch <tenant_id> <query>")
        return

    tenant_id = sys.argv[1]
    query = " ".join(sys.argv[2:])
    
    response = get_tenant_response(tenant_id, query)
    print(response)

if __name__ == "__main__":
    handle_request()
