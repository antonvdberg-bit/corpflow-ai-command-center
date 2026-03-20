import os.path
import json
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

# Use Absolute Paths to prevent "File Not Found" errors in the new structure
BASE_DIR = "/workspaces/corpflow-ai-command-center"
TOKEN_PATH = os.path.join(BASE_DIR, "core/engine/token.json")
SECRETS_PATH = os.path.join(BASE_DIR, "core/engine/client_secrets.json")
CACHE_PATH = os.path.join(BASE_DIR, "core/web/data_cache.json")

SAMPLE_SPREADSHEET_ID = '1GjTwZynhrV8dwBs651LRBDiEixOa8mIf-DTXlj3dXc0'
SCOPES = ['https://www.googleapis.com/auth/spreadsheets']

def main():
    if not os.path.exists(TOKEN_PATH):
        print(f"❌ Key Card missing at {TOKEN_PATH}. Please move it there.")
        return
    
    creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)
    service = build('sheets', 'v4', credentials=creds)
    
    # 1. Pull Data
    result = service.spreadsheets().values().get(
        spreadsheetId=SAMPLE_SPREADSHEET_ID, range='Sheet1!A1:G100').execute()
    
    # 2. Update Cache for the Showcase
    os.makedirs(os.path.dirname(CACHE_PATH), exist_ok=True)
    with open(CACHE_PATH, 'w') as f:
        json.dump(result.get('values', []), f)
        
    print(f"✅ ENGINE SYNC: Data mirrored to Core and Showcase.")

if __name__ == '__main__':
    main()
