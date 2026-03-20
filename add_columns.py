import os.path
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

SAMPLE_SPREADSHEET_ID = '1GjTwZynhrV8dwBs651LRBDiEixOa8mIf-DTXlj3dXc0'
SCOPES = ['https://www.googleapis.com/auth/spreadsheets']

def main():
    creds = Credentials.from_authorized_user_file('token.json', SCOPES)
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
    
    service = build('sheets', 'v4', credentials=creds)
    
    # Define the new headers we want to add to columns E and F
    values = [["Priority", "Assigned Agent"]]
    body = {'values': values}
    
    # Update the header row (A1 notation: E1:F1)
    result = service.spreadsheets().values().update(
        spreadsheetId=SAMPLE_SPREADSHEET_ID, 
        range='Sheet1!E1:F1',
        valueInputOption='RAW', 
        body=body).execute()
        
    print("✅ SUCCESS: Added 'Priority' and 'Assigned Agent' columns to your Spreadsheet!")

if __name__ == '__main__':
    main()
