import os.path
import json
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

SAMPLE_SPREADSHEET_ID = '1GjTwZynhrV8dwBs651LRBDiEixOa8mIf-DTXlj3dXc0'
SCOPES = ['https://www.googleapis.com/auth/spreadsheets']

def main():
    creds = Credentials.from_authorized_user_file('core/engine/token.json', SCOPES)
    service = build('sheets', 'v4', credentials=creds)
    
    # Adding the Luxe Maurice Prospect Row
    instruction = [
        ["Luxe Maurice", "HNW Concierge", "Build a 'Hidden' lead qualifier that asks for Investment Budget (>375k USD) and Residency intent.", "Pending", "Critical", "Agent AI", "Luxe Maurice"]
    ]
    
    service.spreadsheets().values().append(
        spreadsheetId=SAMPLE_SPREADSHEET_ID,
        range='Sheet1!A1',
        valueInputOption='RAW',
        insertDataOption='INSERT_ROWS',
        body={'values': instruction}
    ).execute()
    
    print("💎 PROSPECT SECURED: Luxe Maurice 'Hidden' logic added to Master Controller.")

if __name__ == '__main__':
    main()
