## Google Calendar Sync Script

This Python script helps you synchronize your `tasks.txt` file (formatted with the Todo.txt/TaskPaper style) with your Google Calendar. It will clear all future events from your primary calendar and then re-add events based on the due dates specified in your `tasks.txt`.

### Features

* **Authentication:** Securely authenticates with your Google Calendar using OAuth 2.0.
* **Clear & Sync:** Deletes all existing future events from your primary Google Calendar before re-creating them based on your `tasks.txt`. This ensures your calendar always reflects your current task list.
* **Task Parsing:** Reads tasks from a `tasks.txt` file, identifying tasks with a `(due:YYYY-MM-DD)` tag.
* **Event Creation:** Creates all-day events in Google Calendar for tasks that have a specified due date.

### Prerequisites

Before running the script, ensure you have the following:

1.  **Python 3:** Installed on your system.
2.  **Required Python Libraries:**
    Install them using pip:
    ```bash
    pip install google-auth google-auth-oauthlib google-api-python-client
    ```
3.  **Google Cloud Project & API Credentials:**
    * Go to the [Google Cloud Console](https://console.cloud.google.com/).
    * Create a new project (or select an existing one).
    * Navigate to **APIs & Services > Dashboard**.
    * Enable the **Google Calendar API**.
    * Go to **APIs & Services > Credentials**.
    * Click **"CREATE CREDENTIALS"** and choose **"OAuth client ID"**.
    * Select **"Desktop app"** as the application type.
    * Download the `credentials.json` file. Place this file in the same directory as your `push_due_dates_to_calendar.py` script.

### Setup

1.  **Save the script:** Save the provided Python code as `push_due_dates_to_calendar.py` in your project directory.
2.  **Create `tasks.txt`:** Ensure you have a `tasks.txt` file in the same directory, formatted as described below:
    ```
    Work:
        - [ ] Finish project Alpha documentation (priority:A due:2025-06-25 progress:60%) +Documentation @Office
        - [ ] Schedule team retrospective meeting (due:2025-06-28) @Meeting
    Personal:
        - [ ] Plan annual vacation (due:2025-07-15)
    ```
    * Tasks should start with `- [ ]` (incomplete) or `- [x]` (complete).
    * Due dates should be in the format `(due:YYYY-MM-DD)`.
    * The script will only create/sync events for tasks with a `(due:YYYY-MM-DD)` tag.

### Usage

1.  **First Run (Authorization):**
    The first time you run the script, a web browser window will open, prompting you to authorize the application to access your Google Calendar. Follow the prompts to grant permission. A `token.json` file will be created in your script's directory to store your credentials for future runs.

2.  **Running the Script:**
    Open your terminal or command prompt, navigate to your project directory, and run:
    ```bash
    python push_due_dates_to_calendar.py
    ```

### How it Works

Upon execution:

1.  **Authentication:** The script will check for existing credentials (`token.json`). If not found or expired, it will guide you through the Google OAuth flow.
2.  **Clear Calendar:** It will connect to your Google Calendar and delete all future events (from the moment of execution onwards).
3.  **Read Tasks:** It reads `tasks.txt` and identifies tasks.
4.  **Create Events:** For each task that contains a `(due:YYYY-MM-DD)` tag, it creates an all-day event on your primary Google Calendar on that specified due date. Tasks without a due date will be skipped.

This process ensures that any tasks you remove from `tasks.txt` or change the due date for will be reflected in your calendar on the next run.