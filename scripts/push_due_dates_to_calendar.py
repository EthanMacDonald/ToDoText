import datetime
import os.path
import re

# IMPORTANT: Ensure these Google API client libraries are installed
# If you get ModuleNotFoundError, run:
# pip install google-auth google-auth-oauthlib google-api-python-client
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError


# If modifying these scopes, delete the file token.json.
# This scope allows full read/write access to your calendar.
SCOPES = ["https://www.googleapis.com/auth/calendar"]


def authenticate_google_calendar():
    """Authenticates with Google Calendar API and returns the service object."""
    creds = None
    # The file token.json stores the user's access and refresh tokens, and is
    # created automatically when the authorization flow completes for the first
    # time.
    if os.path.exists("../log_files/token.json"):
        creds = Credentials.from_authorized_user_file("../log_files/token.json", SCOPES)
    # If there are no (valid) credentials available, let the user log in.
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            # The client_secrets.json file should be in the same directory.
            flow = InstalledAppFlow.from_client_secrets_file(
                "../log_files/credentials.json", SCOPES
            )
            creds = flow.run_local_server(port=0)
        # Save the credentials for the next run
        with open("../log_files/token.json", "w") as token:
            token.write(creds.to_json())
    try:
        service = build("calendar", "v3", credentials=creds)
        print("Google Calendar authentication successful.")
        return service
    except HttpError as error:
        print(f"An error occurred during authentication: {error}")
        return None


def get_tasks_from_file(file_path="../tasks.txt"):
    """
    Parses tasks from the tasks.txt file.
    Only extracts lines formatted as tasks (starting with '- [ ]' or '- [x]').
    """
    tasks = []
    try:
        with open(file_path, 'r') as file:
            for line in file:
                # Regex to match lines like: "- [ ] Task content" or "    - [x] Subtask content"
                # It captures the content after the checkbox.
                task_match = re.match(r'^\s*- \[( |x)\] (.+)', line)
                if task_match:
                    content = task_match.group(2).strip() # group(2) contains the task description
                    tasks.append(content)
                # else:
                    # print(f"Skipping non-task line: {line.strip()}") # Uncomment for debugging ignored lines
    except FileNotFoundError:
        print(f"Error: tasks.txt not found at {file_path}")
    return tasks


def create_google_calendar_event(service, summary, event_date, description=None, calendar_id="1c0c5ca1306ca8067d26e1116a504ccc7b172cc6ca4db242c376ef5842c905dc@group.calendar.google.com"):
    """
    Creates a new all-day event on the specified Google Calendar.
    Args:
        service: Google Calendar API service object.
        summary: The title of the event.
        event_date: A datetime.date object for the date of the event.
        description: Optional, a longer description for the event.
        calendar_id: The ID of the calendar to add the event to. Defaults to 'primary'.
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
        event = service.events().insert(calendarId=calendar_id, body=event).execute()
        print(f"Event created: {event.get('htmlLink')}")
        return event
    except HttpError as error:
        print(f"An error occurred while creating event '{summary}': {error}")
        return None


def delete_all_future_events(service, calendar_id="1c0c5ca1306ca8067d26e1116a504ccc7b172cc6ca4db242c376ef5842c905dc@group.calendar.google.com"):
    """
    Deletes all events from the specified calendar from the current moment onwards.
    It fetches up to 2500 events. If you have more, you might need pagination.
    """
    print(f"\nAttempting to delete all future events from calendar: {calendar_id}")
    try:
        # Fetch events from now into the future
        now = datetime.datetime.utcnow().isoformat(timespec='milliseconds') + "Z"
        events_result = (
            service.events()
            .list(
                calendarId=calendar_id,
                timeMin=now,
                maxResults=2500,  # Max results per query. Adjust if you have many events.
                singleEvents=True, # Expand recurring events into individual instances
                orderBy="startTime",
            )
            .execute()
        )
        events = events_result.get("items", [])

        if not events:
            print("No future events found in the calendar to delete.")
            return

        print(f"Found {len(events)} future events to delete...")
        for event in events:
            try:
                service.events().delete(calendarId=calendar_id, eventId=event["id"]).execute()
                print(f"  Deleted event: '{event.get('summary')}' (ID: {event.get('id')})")
            except HttpError as e:
                # Handle cases where an event might have already been deleted or is inaccessible
                print(f"  Could not delete event '{event.get('summary')}' (ID: {event.get('id')}): {e}")
        print("Finished attempting to delete future events.")

    except HttpError as error:
        print(f"An error occurred while listing/deleting events: {error}")

if __name__ == "__main__":
    calendar_service = authenticate_google_calendar()
    if calendar_service:
        # STEP 1: Delete all relevant events from the calendar
        # This clears out old tasks that might have been removed from tasks.txt
        delete_all_future_events(calendar_service)

        # STEP 2: Read tasks from your tasks.txt file
        tasks_from_file = get_tasks_from_file("../tasks.txt")
        if not tasks_from_file:
            print("No tasks found in tasks.txt.  Exiting.")
        else:
            print("\nProcessing tasks from tasks.txt to add to calendar (if due date is present):")
            for i, task_full_string in enumerate(tasks_from_file):
                print(f"{i+1}. {task_full_string}")

                # Extract due date using regex pattern (e.g., "(due:YYYY-MM-DD)")
                due_date_match = re.search(r'\(due:(\d{4}-\d{2}-\d{2})\)', task_full_string)

                # Extract clean task summary by removing known metadata patterns
                task_summary_clean = re.sub(
                    r'\s*(\(priority:[A-Z]\)|\(due:\d{4}-\d{2}-\d{2}\)|\(progress:\d{1,3}%\)|\(rec:[\w\s]+\)|\(done:\d{4}-\d{2}-\d{2}\)|\+\w+|@\w+)',
                    '',
                    task_full_string
                ).strip()

                if due_date_match:  # Only create events IF a due date is found
                    due_date_str = due_date_match.group(1)
                    try:
                        event_date = datetime.date.fromisoformat(due_date_str)
                        print(f"  - Creating event for: '{task_summary_clean}' due on {event_date}")
                        # Use the full task string as a description for more context in the calendar event
                        create_google_calendar_event(calendar_service, task_summary_clean, event_date, task_full_string)
                    except ValueError as e:
                        print(f"  - Error parsing due date '{due_date_str}' for task '{task_full_string}': {e}")
                    except Exception as e:
                        print(f"  - An unexpected error occurred while creating event for '{task_summary_clean}': {e}")
                else:  # Explicitly skip tasks without due dates
                    print(f"  - Skipping task '{task_full_string}' because it has no due date.")