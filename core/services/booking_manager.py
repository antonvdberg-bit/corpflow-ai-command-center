import os
from generic_calendar import search, create

def get_available_slots(date_string):
    # This calls your live Google Calendar
    # date_string format: YYYYMMDD
    start = f"{date_string}T0900"
    end = f"{date_string}T1700"
    
    # Search for existing conflicts
    conflicts = search(
        calendar_ids=["antonvdberg@corpflowai.com"],
        start_datetime=start,
        end_datetime=end,
        provider="google_calendar"
    )
    
    # Simple logic: If no events, 10:00 AM is free.
    # In production, we'd loop through 1-hour blocks.
    if not conflicts.get('events'):
        return ["10:00 AM", "2:00 PM"]
    return ["3:30 PM"] # If there's a morning conflict

def book_appointment(name, service, start_time):
    # start_time format: YYYYMMDDTHHMM
    result = create(
        title=f"SPA BOOKING: {name} ({service})",
        start_datetime=start_time,
        duration="1h",
        calendar_id="antonvdberg@corpflowai.com",
        provider="google_calendar"
    )
    return result
