import os.path
import json
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

# Use Absolute Paths
BASE_DIR = "/workspaces/corpflow-ai-command-center"
TOKEN_PATH = os.path.join(BASE_DIR, "core/engine/token.json")
SPREADSHEET_ID = '1GjTwZynhrV8dwBs651LRBDiEixOa8mIf-DTXlj3dXc0'

def main():
    creds = Credentials.from_authorized_user_file(TOKEN_PATH, ['https://www.googleapis.com/auth/spreadsheets'])
    service = build('sheets', 'v4', credentials=creds)
    
    tasks = [
        ["Luxe Maurice", "GHL Solutions", "Design Lead Qualification Survey (South Africa Focus)", "Pending", "Critical", "Agent AI", "Luxe Maurice"],
        ["Luxe Maurice", "Nurture Logic", "Draft French Tax Optimization (IFI) Email Sequence", "Pending", "High", "Agent AI", "Luxe Maurice"],
        ["Luxe Maurice", "Showcase", "Deploy 'Bain Boeuf Private Collection' Stealth Page", "✅ Deployed", "Medium", "Agent AI", "Luxe Maurice"]
    ]
    
    service.spreadsheets().values().append(
        spreadsheetId=SPREADSHEET_ID,
        range='Sheet1!A1',
        valueInputOption='USER_ENTERED',
        insertDataOption='INSERT_ROWS',
        body={'values': tasks}
    ).execute()
    print("🚀 SUCCESS: Luxe Maurice tasks pushed to Spreadsheet.")

if __name__ == '__main__':
    main()
