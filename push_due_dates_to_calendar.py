import datetime
import os.path
import re

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# If modifying these scopes, delete the file token.json.
# 'https://www.googleapis.com/auth/calendar' grants read/write access.
# 'https://www.googleapis.com/auth/calendar.readonly' grants read-only access.
SCOPES = ["https://www.googleapis.com/auth/calendar"] # Use this scope for updating events

def authenticate_google_calendar():
    """Authenticates with Google Calendar API and returns the service object."""
    creds = None
    # The file token.json stores the user's access and refresh tokens, and is
    # created automatically when the authorization flow completes for the first
    # time.
    if os.path.exists("token.json"):
        creds = Credentials.from_authorized_user_file("token.json", SCOPES)
    # If there are no (valid) credentials available, let the user log in.
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                "credentials.json", SCOPES
            )
            creds = flow.run_local_server(port=0)
        # Save the credentials for the next run
        with open("token.json", "w") as token:
            token.write(creds.to_json())
    try:
        service = build("calendar", "v3", credentials=creds)
        return service
    except HttpError as error:
        print(f"An error occurred: {error}")
        return None

def get_tasks_from_file(file_path="tasks.txt"):
    """Parses tasks from the tasks.txt file."""
    tasks = []
    with open(file_path, 'r') as file:
        for line in file:
            task_match = re.match(r'^(\s*)- \[( |x)\] (.+)', line)
            if task_match:
                content = task_match.group(3)
                tasks.append(content)
    return tasks

def update_calendar_event_due_date(service, task_summary, new_due_date):
    """
    Updates the due date of a Google Calendar event.
    Args:
        service: Google Calendar API service object.
        task_summary: The summary (title) of the event to update.
        new_due_date: A datetime.date object for the new due date.
    """
    try:
        # List events from the primary calendar
        now = datetime.datetime.now(datetime.timezone.utc).isoformat() + "Z"  # 'Z' indicates UTC time
        events_result = (
            service.events()
            .list(
                calendarId="primary",
                timeMin=now,
                maxResults=100,  # Adjust as needed to find your event
                singleEvents=True,
                orderBy="startTime",
            )
            .execute()
        )
        events = events_result.get("items", [])

        if not events:
            print("No upcoming events found.")
            return

        found_event = None
        for event in events:
            if event.get("summary") == task_summary:
                found_event = event
                break

        if found_event:
            # Update the event's end date
            # For all-day events, use 'date' instead of 'dateTime'
            found_event['end']['date'] = new_due_date.isoformat()

            # If it's a timed event, you might need to preserve the time and only change the date
            # Example for timed event:
            # if 'dateTime' in found_event['end']:
            #     existing_time = datetime.datetime.fromisoformat(found_event['end']['dateTime']).time()
            #     new_datetime = datetime.datetime.combine(new_due_date, existing_time)
            #     found_event['end']['dateTime'] = new_datetime.isoformat()
            # else:
            #     found_event['end']['date'] = new_due_date.isoformat() # All-day event

            updated_event = service.events().update(
                calendarId="primary", eventId=found_event['id'], body=found_event
            ).execute()
            print(f"Event updated: {updated_event.get('htmlLink')}")
        else:
            print(f"No event found with summary: '{task_summary}'")

    except HttpError as error:
        print(f"An error occurred: {error}")

if __name__ == "__main__":
    calendar_service = authenticate_google_calendar()
    if calendar_service:
        # Example usage:
        # 1. Get tasks from your local file (tasks.txt)
        tasks_from_file = get_tasks_from_file("tasks.txt")
        print("Tasks from tasks.txt:")
        for i, task in enumerate(tasks_from_file):
            print(f"{i+1}. {task}")

        # You would typically have logic here to select which task to update
        # and parse the new due date from user input or your task management system.
        # For demonstration, let's pick a task and a new date manually.

        # Example: Update "Finish project Alpha documentation" to 2025-07-10
        task_to_update = "Finish project Alpha documentation (priority:A due:2025-06-25 progress:60%) +Documentation @Office"
        # Extract just the summary part for matching with calendar events
        task_summary_for_calendar = "Finish project Alpha documentation"
        new_date = datetime.date(2025, 7, 10)

        # Make sure the task summary matches exactly what's in your Google Calendar event
        # You might need to adjust task_summary_for_calendar based on how you create events.
        update_calendar_event_due_date(calendar_service, task_summary_for_calendar, new_date)

        # You can add more logic here to iterate through your tasks and update their corresponding
        # Google Calendar events.