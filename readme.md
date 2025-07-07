README:
  Project: "Hybrid Task Manager"
  
  Description: |
    A minimalist, powerful plain-text task management system blending the strengths of Todo.txt (simplicity and metadata-richness) and TaskPaper (hierarchical clarity). Designed to be human-friendly, intuitive, scriptable, and platform-independent.
  
  Philosophy: |
    This system aims to:
    
    - Simplify task management: Using intuitive plain-text formatting.
    - Enhance clarity: Support structured, hierarchical tasks with clear visual indentations.
    - Increase flexibility: Rich metadata tagging (priorities, due dates, progress, and contexts).
    - Promote automation: Easy scripting and integration with other productivity tools.
    - Ensure portability: Accessible from any text editor, device, and operating system.
  
  Syntax:
    Tasks:
      Incomplete: "- [ ] Task description"
      Complete: "- [x] Task description"
      Example: |
        - [ ] Call Sarah about event planning
        - [x] Submit expense report

    Projects:
      Description: "Lines ending with ':' denote project areas or categories."
      Example: |
        Work:

    Subtasks:
      Description: "Indented tasks under parent tasks represent subtasks."
      Example: |
        - [ ] Organize workshop
            - [ ] Book venue
            - [x] Send initial invitations
    
    Notes:
      Description: "Plain lines indented beneath tasks or projects serve as notes."
      Example: |
        - [ ] Plan holiday party
            Consider outdoor options in case of nice weather
    
    Metadata Tags:
      Priority: "(priority:A|B|C...)"
      Due Date: "(due:YYYY-MM-DD)"
      Done Date: "(done:YYYY-MM-DD)"
      Follow-up Date: "(followup:YYYY-MM-DD)"
      On Hold Until: "(onhold:YYYY-MM-DD|text_condition)"
      Frequency: "(freq:daily|weekly:Mon,Wed|monthly:15|monthly:3rd Tue|yearly:06-24|custom:14d)"
      Last Done: "(lastdone:YYYY-MM-DD) (optional, for recurring tasks)"
      Example: |
        - [ ] Prepare quarterly report (priority:A due:2025-07-15)
        - [x] Submit expense report (done:2025-06-20 priority:B)
        - [ ] Follow up with client (priority:B followup:2025-07-10)
        - [ ] Review contract proposal (priority:A onhold:2025-07-20)
        - [ ] Wait for client approval (onhold:waiting for email from jalil)
        - [ ] Pay rent (freq:monthly:1 lastdone:2025-06-01)
        - [ ] Take medication (freq:daily lastdone:2025-06-24)
        - [ ] Team meeting (freq:weekly:Mon,Thu lastdone:2025-06-23)
        - [ ] Review goals (freq:custom:90d lastdone:2025-04-01)
        - [ ] Team lunch (freq:monthly:3rd Tue lastdone:2025-06-17)
        - [ ] Celebrate anniversary (freq:yearly:06-24 lastdone:2024-06-24)

      Multiple metadata tags can be included within a single set of parentheses, separated by spaces. Each tag should be in the format key:value.
      
      Follow-up System:
        The follow-up feature helps track tasks that require future attention after completion. This is perfect for tasks that are "done" but need a follow-up action later.
        
        How it works:
        - Add a `followup:YYYY-MM-DD` tag to any task to mark it for follow-up
        - Tasks with follow-up dates appear in a special "Follow-up Required" section
        - These tasks cannot be checked off via the dashboard checkbox (since they require follow-up)
        - Follow-up tasks are sorted by follow-up date (nearest first)
        - In the dashboard, follow-up tasks display a purple "Follow-up" tag for easy identification
        - Use the edit form to modify or remove follow-up dates
        
        Examples:
        - [ ] Submit proposal (priority:A done:2025-06-30 followup:2025-07-15) @Work
        - [ ] Send follow-up email (followup:2025-07-05) +ClientProject
        - [ ] Review meeting notes (done:2025-06-25 followup:2025-07-01)
        
        Use cases:
        - Tasks completed but requiring follow-up (e.g., "Submit application" → follow up in 2 weeks)
        - Scheduled check-ins or reviews
        - Time-delayed actions after task completion
        - Reminders to follow up on delegated work
      
      On Hold System:
        The on hold feature helps manage tasks that cannot be worked on until a specific date or condition is met. Tasks marked with `onhold:YYYY-MM-DD` or `onhold:text_condition` are temporarily suspended and grouped separately from active tasks.
        
        How it works:
        - Add an `onhold:YYYY-MM-DD` tag to put a task on hold until a specific date
        - Add an `onhold:text_condition` tag to put a task on hold until a condition is met (e.g., "waiting for email from john")
        - Date-based holds are automatically released when the date passes
        - Text-based holds remain active until manually removed
        - Tasks on hold appear in a special "On Hold" section between active and completed tasks
        - If a subtask is on hold, a copy of the parent task (showing only the on-hold subtask) appears in the "On Hold" section
        - On-hold tasks are sorted by onhold date (earliest release date first), with text conditions at the end
        - In the dashboard, onhold tasks display a special "On Hold" tag for easy identification
        - Use the edit form to modify or remove onhold dates/conditions when circumstances change
        
        Examples:
        - [ ] Review contract proposal (priority:A onhold:2025-07-20) @Office
        - [ ] Start new project (onhold:waiting for budget approval) +ProjectBeta
        - [ ] Schedule team retreat (priority:B onhold:2025-07-15) +TeamEvents
        - [ ] Update documentation (priority:C) +Docs @Computer
            - [ ] Review current docs
            - [ ] Add new API endpoints (onhold:waiting for dev team input)
        
        Use cases:
        - Tasks waiting for external dependencies (e.g., "Review proposal" → on hold until client responds)
        - Seasonal or time-sensitive tasks (e.g., "Plan holiday party" → on hold until November)
        - Tasks blocked by other work that must be completed first
        - Personal tasks that can't be started until a specific life event or date
        - Subtasks that are blocked while the main task can proceed
      
      Recurring Tasks:
        - Use the `freq:` tag to specify recurrence:
            - `daily` (every day)
            - `weekly:Mon,Wed` (specific days of the week)
            - `monthly:15` (specific day of the month)
            - `monthly:3rd Tue` (nth weekday of the month)
            - `yearly:06-24` (specific date each year)
            - `custom:14d` (every 14 days)
        - Optionally, use `lastdone:` to track the last completion date.
        - When a recurring task is completed, update the `lastdone:` date to the completion date.
        - Example:
            - [ ] Backup files (freq:weekly:Fri lastdone:2025-06-20)
            - [ ] Pay credit card bill (freq:monthly:5 lastdone:2025-06-05)
            - [ ] Team lunch (freq:monthly:3rd Thu lastdone:2025-06-19)

      Examples:
        - [ ] Prepare quarterly report (priority:A due:2025-07-15)
        - [x] Submit expense report (done:2025-06-20 priority:B)
        - [ ] Follow up on proposal (priority:A followup:2025-07-10)
        - [ ] Review contract proposal (priority:A onhold:2025-07-20)
        - [ ] Plan event (priority:C freq:monthly:1)
        - [ ] Water plants (freq:daily lastdone:2025-06-24)
        - [ ] Test smoke alarms (freq:yearly:06-24 lastdone:2024-06-24)
        - [ ] Review goals (freq:custom:90d lastdone:2025-04-01)
        - [ ] Complete project (done:2025-06-25 followup:2025-07-08) +ProjectAlpha

      Notes:
        - All metadata tags must be inside one set of parentheses, e.g. (priority:A due:2025-07-15 onhold:2025-07-22).
        - Tags can appear in any order within the parentheses.
        - The parser will extract all key:value pairs from the parentheses, so you can include as many as needed.
        - If you include multiple sets of parentheses, only the first will be parsed for metadata.
        - Avoid using spaces within values (e.g., use freq:monthly:3rd Tue not freq:monthly:3rd  Tue).
        - Follow-up dates and onhold dates should be in YYYY-MM-DD format for proper sorting and display.

    Context, Area, and Project Tags

        Context tags (`@`), area tags (`&`), and project tags (`+`) enhance clarity and usability by clearly indicating the context or environment needed, the life area involved, and categorizing tasks within their relevant projects.

      Context Tags (`@`)**:
        Describe the ideal environment or tool required to complete a task.
        
        Examples:
          `@Office`: Tasks to complete at work.
          `@Home`: Tasks best handled at home.
          `@Phone`: Tasks involving phone calls.
          `@Online`: Tasks requiring internet access.

      Area Tags (`&`)**:
        Represent broad life areas or domains of responsibility.
        
        Examples:
          `&Work`: Professional responsibilities and tasks.
          `&Personal`: Personal life and individual goals.
          `&Health`: Health and wellness related tasks.
          `&Finances`: Financial planning and money management.

      Project Tags (`+`)**:
        Categorize tasks within specific projects or focused initiatives.
  
        Examples:
          `+WebsiteRedesign`: Tasks related to redesigning the company website.
          `+VacationPlanning`: Tasks for planning an upcoming vacation.
          `+HomeSecurity`: Tasks related to improving home security.
          `+SkillDevelopment`: Tasks for learning new skills.

      Example**:
        - [ ] Finalize annual budget report +FinancialPlanning &Finances @Office
        - [ ] Schedule client follow-up call +SalesQ4 &Work @Phone
        - [ ] Prepare content for website +WebsiteRedesign &Work @Online
        - [ ] Organize garage +HomeOrganization &Personal @Home
  
  Getting Started:
    Prerequisites: |
      - Python 3.7 or higher
      - Node.js and npm (for web dashboard)
      - Git (recommended)
    
    Environment Setup: |
      **IMPORTANT: Before running any scripts or the dashboard, set up the Python virtual environment:**
      
      1. Create and configure the virtual environment:
         ```shell
         ./scripts/setup_environment.sh
         ```
         
         This script will:
         - Create a `.todo_env` virtual environment
         - Install all required Python dependencies (FastAPI, Google Calendar API, pandas, etc.)
         - Generate a `requirements.txt` file with all installed packages
      
      2. The environment will be automatically activated when you run the dashboard
      
      **Manual Environment Activation** (if needed):
      ```shell
      source .todo_env/bin/activate
      ```
      
      **Environment Dependencies Included**:
      - FastAPI & Uvicorn (web backend)
      - Google Calendar API libraries (google-api-python-client, google-auth-*)
      - Data processing (pandas, numpy, python-dateutil)
      - Development tools (black, flake8, pytest)
    
    Installation: |
      1. Clone or download the project to your desired directory
      2. Run the environment setup script (see Environment Setup above)
      3. Your system is now ready to use!
    
    Usage: |
      1. **Start the Web Dashboard** (Recommended):
         ```shell
         ./scripts/initialize_dashboard.sh
         ```
         This automatically:
         - Activates the `.todo_env` virtual environment
         - Starts the FastAPI backend server
         - Starts the React frontend development server
         - Displays URLs for both frontend and backend
      
      2. **Stop the Dashboard**:
         ```shell
         ./scripts/stop_dashboard.sh
         ```
      
      3. **Manual Script Usage** (with virtual environment):
         ```shell
         source .todo_env/bin/activate
         python scripts/[script_name].py
         ```
    
    Web Dashboard: |
      The project includes a modern web dashboard for task management with Google Calendar integration:
      
      Features:
      - View tasks organized by area headers and grouped by due dates
      - Filter by area, context, and project with labeled dropdown menus
      - Sort by priority, due date, or no sorting
      - Check off tasks and recurring tasks
      - **Follow-up System**: Tasks with follow-up dates are grouped in a special "Follow-up Required" section
        - Follow-up tasks display purple "Follow-up" tags for easy identification
        - Sorted by follow-up date (nearest first)
        - Cannot be checked off via checkbox (requires follow-up action)
        - Edit follow-up dates using the built-in task editor
      - Push tasks with due dates to Google Calendar
      - Statistics and task analysis
      - Responsive, clean UI
      
      **Quick Start** (Recommended):
      ```shell
      # First time setup
      ./scripts/setup_environment.sh
      
      # Start dashboard
      ./scripts/initialize_dashboard.sh
      ```
      
      **Manual Setup** (if needed):
      1. Ensure virtual environment is set up (see Environment Setup above)
      2. Backend (FastAPI):
         ```shell
         source .todo_env/bin/activate
         cd dashboard/backend
         uvicorn app:app --reload
         ```
      3. Frontend (React + TypeScript):
         ```shell
         cd dashboard/frontend
         npm install
         npm run dev
         ```
      
      **Google Calendar Integration**:
      - Place your `credentials.json` file in the `log_files/` directory
      - Run `python scripts/push_due_dates_to_calendar.py` to sync tasks with due dates
      - The script will automatically handle authentication and create calendar events
      
      Access at: http://localhost:5173 (frontend) and http://localhost:8000 (backend API)
    
    Recommended_Project_Structure: |
      todo_auto/
      ├── tasks.txt
      ├── recurring_tasks.txt
      ├── requirements.txt                 # Generated by setup script
      ├── .todo_env/                       # Python virtual environment
      ├── scripts/
      │   ├── setup_environment.sh         # Environment setup script
      │   ├── initialize_dashboard.sh      # Dashboard startup script
      │   ├── stop_dashboard.sh           # Dashboard stop script
      │   ├── push_due_dates_to_calendar.py
      │   └── [other utility scripts]
      ├── dashboard/
      │   ├── backend/ (FastAPI)
      │   └── frontend/ (React + TypeScript)
      ├── log_files/
      │   ├── credentials.json            # Google API credentials
      │   ├── token.json                  # Google API token (auto-generated)
      │   ├── backend.log                 # Backend logs
      │   └── frontend.log                # Frontend logs
      ├── outputs/ (automatically created)
      ├── archive_files/
      └── README.md
    
    Output Files: |
      Sorted tasks are automatically saved in the `outputs/` directory.
  
  
  Google Calendar Integration: |
    Automatically sync tasks with due dates to your Google Calendar.
    
    Setup:
    1. Ensure virtual environment is configured: `./scripts/setup_environment.sh`
    2. Obtain Google Calendar API credentials:
       - Go to the Google Cloud Console
       - Enable the Google Calendar API
       - Create credentials (OAuth 2.0 Client ID)
       - Download the credentials file as `credentials.json`
       - Place it in the `log_files/` directory
    
    Usage:
    ```shell
    # Activate environment and sync tasks
    source .todo_env/bin/activate
    python scripts/push_due_dates_to_calendar.py
    ```
    
    Features:
    - Automatically deletes old calendar events to avoid duplicates
    - Creates new events for all tasks with due dates in format `(due:YYYY-MM-DD)`
    - Handles authentication automatically after initial setup
    - Provides detailed logging of all operations
  
  Environment Management: |
    **Virtual Environment Benefits:**
    - Isolated Python dependencies
    - Consistent package versions across setups
    - No conflicts with system Python packages
    - Easy environment recreation
    
    **Common Commands:**
    ```shell
    # Set up environment (first time or reset)
    ./scripts/setup_environment.sh
    
    # Activate environment manually
    source .todo_env/bin/activate
    
    # Deactivate environment
    deactivate
    
    # View installed packages
    pip list
    
    # Update requirements file
    pip freeze > requirements.txt
    ```
    
    **Troubleshooting:**
    - If you get import errors, ensure the virtual environment is activated
    - If the environment is corrupted, delete `.todo_env/` and run setup again
    - The dashboard initialization script will check for the environment automatically

  Automation and Extensibility: |
    - Integrate tasks with calendars (.ics file generation).
    - Automate daily summaries or reminders using scheduled tasks (cron, Windows Task Scheduler).
  
  Licensing_and_Contribution: |
    This project is provided freely for personal use, modification, and extension.

  Conclusion: |
    Enjoy your productivity journey with clarity, simplicity, and effectiveness!

  CSV Export Tool: |
    Export your tasks to CSV format for analysis, reporting, or integration with other tools.
    
    Script: `make_csv.py`
    
    Features:
      - Parses tasks.txt and extracts all metadata and tags
      - Exports to CSV with separate columns for each field
      - Handles projects (+Project), areas (&Area), contexts (@Context), priorities, due dates, etc.
      - Maintains area information and task hierarchy (indent levels)
      - Leaves fields blank when no data is present
    
    Usage:
      **With virtual environment** (recommended):
        ```shell
        source .todo_env/bin/activate
        python3 scripts/make_csv.py
        ```
      
      Basic export:
        ```shell
        python3 scripts/make_csv.py
        ```
      
      Custom input/output files:
        ```shell
        python3 scripts/make_csv.py --input tasks.txt --output my_tasks.csv
        ```
      
      Verbose output (shows parsing details):
        ```shell
        python3 scripts/make_csv.py --verbose
        ```
      
      Help:
        ```shell
        python3 scripts/make_csv.py --help
        ```
    
    CSV Columns:
      - line_number: Original line number in tasks.txt
      - completed: True/False completion status
      - completion_date: Date when task was marked complete
      - priority: Task priority (A, B, C, etc.)
      - description: Task text without tags
      - area: Section/area the task belongs to
      - project: Primary +Project tag
      - extra_projects: Additional +Project tags
      - context: Primary @Context tag
      - extra_contexts: Additional @Context tags
      - due_date, created_date, done_date: Date metadata
      - recurring: Recurrence pattern
      - progress: Progress percentage
      - indent_level: Indentation depth for subtasks
      - Additional metadata fields as discovered
    
    Output: Creates `outputs/tasks_export.csv` by default, ready for import into spreadsheets or databases.