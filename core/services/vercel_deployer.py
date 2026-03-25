import os, requests

def create_client_subdomain(client_slug):
    token = os.getenv("VERCEL_AUTH_TOKEN")
    project_id = os.getenv("VERCEL_PROJECT_ID") # Found in your Project Settings
    team_id = os.getenv("VERCEL_TEAM_ID")
    if not team_id:
        raise ValueError("VERCEL_TEAM_ID is not configured")
    
    url = f"https://api.vercel.com/v9/projects/{project_id}/domains?teamId={team_id}"
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"name": f"{client_slug}.corpflowai.com"}
    
    print(f"🚀 Deploying Subdomain: {client_slug}.corpflowai.com")
    response = requests.post(url, headers=headers, json=payload)
    
    if response.status_code == 200:
        return {"success": True, "url": f"https://{client_slug}.corpflowai.com"}
    else:
        return {"success": False, "error": response.json()}

if __name__ == "__main__":
    # Test run
    print(create_client_subdomain("serenity-demo"))
