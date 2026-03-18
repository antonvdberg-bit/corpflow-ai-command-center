import os
from twilio.rest import Client

def send_whatsapp_lead_alert(lead_name, service, phone):
    # Credentials from your .env
    account_sid = os.getenv('TWILIO_ACCOUNT_SID')
    auth_token = os.getenv('TWILIO_AUTH_TOKEN')
    from_whatsapp = 'whatsapp:+14155238886' # Twilio Sandbox Number
    to_whatsapp = f'whatsapp:{os.getenv("ADMIN_WHATSAPP_NUMBER")}'
    
    client = Client(account_sid, auth_token)
    
    message_body = (
        f"🔥 *New High-Value Lead!*\n\n"
        f"👤 *Name:* {lead_name}\n"
        f"💆 *Service:* {service}\n"
        f"📞 *Contact:* {phone}\n\n"
        f"Check your Baserow dashboard for details."
    )
    
    try:
        message = client.messages.create(
            body=message_body,
            from_=from_whatsapp,
            to=to_whatsapp
        )
        return message.sid
    except Exception as e:
        print(f"WhatsApp Error: {e}")
        return None
