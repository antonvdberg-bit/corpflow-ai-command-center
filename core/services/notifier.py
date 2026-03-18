import os, requests

def send_admin_notification(lead_name, lead_phone):
    # We will use a simple Webhook or Email for the 'Blitz'
    # Since you have Google Workspace, we can send a high-priority email
    print(f"🔔 NOTIFICATION: New Lead Captured! {lead_name} - {lead_phone}")
    
    # Placeholder for Pushbullet/Twilio/Pushover if you want mobile pings
    # For now, we'll log it to the console which Vercel tracks in real-time
    return True

if __name__ == "__main__":
    send_admin_notification("Test Sarah", "555-0199")
