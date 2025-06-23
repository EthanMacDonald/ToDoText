import datetime
import os.path
import re

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# If modifying these scopes, delete the file token.json.
SCOPES = ["https://www.googleapis.com/auth/calendar"] # Use this scope for creating and updating events

def authenticate_google_calendar():
    """Authenticates with Google Calendar API and returns the service object."""
    creds = None
    if os.path.exists("token.json"):
        creds = Credentials.from_authorized_user_file("token.json", SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                "credentials.json", SCOPES
            )
            creds = flow.run_local_server(port=0)
        with open("token.json", "w") as token:
            token.write(creds.to_json())
    try:
        service = build("calendar", "v3", credentials=creds)
        return service
    except HttpError as error:
        print(f"An error occurred during authentication: {error}")
        return None

def get_tasks_from_file(file_path="tasks.txt"):
    """Parses tasks from the tasks.txt file."""
    tasks = []
    with open(file_path, 'r') as file:
        for line in file:
            # Revised regex: allows any amount of leading whitespace before the hyphen.
            task_match = re.match(r'^\s*- \[( |x)\] (.+)', line)
            if task_match:
                content = task_match.group(2).strip() # group(2) now captures the task content
                tasks.append(content)
    return tasks

def create_google_calendar_event(service, summary, event_date, description=None):
    """
    Creates a new all-day event on the primary Google Calendar.
    Args:
        service: Google Calendar API service object.
        summary: The title of the event.
        event_date: A datetime.date object for the date of the event.
        description: Optional, a longer description for the event.
    """
    event = {
        'summary': summary,
        'start': {
            'date': event_date.isoformat(),
        },
        'end': {
            'date': (event_date + datetime.timedelta(days=1)).isoformat(), # All-day event ends next day
        },
        'description': description,
    }
    try:
        event = service.events().insert(calendarId='primary', body=event).execute()
        print(f"Event created: {event.get('htmlLink')}")
        return event
    except HttpError as error:
        print(f"An error occurred while creating event '{summary}': {error}")
        return None

def update_calendar_event_due_date(service, task_summary, new_due_date):
    # This function is kept for reference but not used in the main block below
    # if you are focused on creation.
    try:
        now = datetime.datetime.utcnow().isoformat(timespec='milliseconds') + 'Z'
        events_result = (
            service.events()
            .list(
                calendarId="primary",
                timeMin=now,
                maxResults=100,
                singleEvents=True,
                orderBy="startTime",
            )
            .execute()
        )
        events = events_result.get("items", [])

        if not events:
            print(f"No upcoming events found in Google Calendar from '{now}' onwards.")
            return

        found_event = None
        for event in events:
            event_summary_in_calendar = event.get("summary", "").split(' (priority:')[0].strip()

            if event_summary_in_calendar == task_summary:
                found_event = event
                break

        if found_event:
            if 'date' in found_event['end']:
                found_event['end']['date'] = new_due_date.isoformat()
            elif 'dateTime' in found_event['end']:
                existing_datetime_str = found_event['end']['dateTime']
                existing_datetime = datetime.datetime.fromisoformat(existing_datetime_str)
                new_datetime = datetime.datetime.combine(new_due_date, existing_datetime.time(), existing_datetime.tzinfo)
                found_event['end']['dateTime'] = new_datetime.isoformat()


            updated_event = service.events().update(
                calendarId="primary", eventId=found_event['id'], body=found_event
            ).execute()
            print(f"Event updated: {updated_event.get('htmlLink')}")
        else:
            print(f"No event found in Google Calendar with summary matching: '{task_summary}'")

    except HttpError as error:
        print(f"An error occurred: {error}")


if __name__ == "__main__":
    calendar_service = authenticate_google_calendar()
    if calendar_service:
        tasks_from_file = get_tasks_from_file("tasks.txt")
        print("Tasks from tasks.txt:")
        
        for i, task_full_string in enumerate(tasks_from_file):
            print(f"{i+1}. {task_full_string}")

            # Extract due date using regex
            due_date_match = re.search(r'\(due:(\d{4}-\d{2}-\d{2})\)', task_full_string)
            
            # Extract clean task summary by removing known metadata patterns
            task_summary_clean = re.sub(
                r'\s*(\(priority:[A-Z]\)|\(due:\d{4}-\d{2}-\d{2}\)|\(progress:\d{1,3}%\)|\(rec:[\w\s]+\)|\(done:\d{4}-\d{2}-\d{2}\)|\+\w+|@\w+)',
                '',
                task_full_string
            ).strip()

            if due_date_match:
                due_date_str = due_date_match.group(1)
                try:
                    event_date = datetime.date.fromisoformat(due_date_str)
                    print(f"\nAttempting to create event for task: '{task_summary_clean}' due on {event_date}")
                    create_google_calendar_event(calendar_service, task_summary_clean, event_date, task_full_string)
                except ValueError as e:
                    print(f"Error parsing due date '{due_date_str}' for task '{task_full_string}': {e}")
            else:
                print(f"\nSkipping task '{task_full_string}' as no due date found to create a calendar event.")