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
      Frequency: "(freq:daily|weekly:Mon,Wed|monthly:15|monthly:3rd Tue|yearly:06-24|custom:14d)"
      Last Done: "(lastdone:YYYY-MM-DD) (optional, for recurring tasks)"
      Example: |
        - [ ] Prepare quarterly report (priority:A)
        - [ ] Pay rent (freq:monthly:1 lastdone:2025-06-01)
        - [ ] Take medication (freq:daily lastdone:2025-06-24)
        - [ ] Team meeting (freq:weekly:Mon,Thu lastdone:2025-06-23)
        - [ ] Review goals (freq:custom:90d lastdone:2025-04-01)
        - [ ] Team lunch (freq:monthly:3rd Tue lastdone:2025-06-17)
        - [ ] Celebrate anniversary (freq:yearly:06-24 lastdone:2024-06-24)

      Multiple metadata tags can be included within a single set of parentheses, separated by spaces. Each tag should be in the format key:value.
      
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
        - [ ] Prepare quarterly report (priority:A)
        - [x] Submit expense report (done:2025-06-20 priority:B)
        - [ ] Plan event (priority:C freq:monthly:1)
        - [ ] Water plants (freq:daily lastdone:2025-06-24)
        - [ ] Test smoke alarms (freq:yearly:06-24 lastdone:2024-06-24)
        - [ ] Review goals (freq:custom:90d lastdone:2025-04-01)

      Notes:
        - All metadata tags must be inside one set of parentheses, e.g. (priority:A freq:monthly:1).
        - Tags can appear in any order within the parentheses.
        - The parser will extract all key:value pairs from the parentheses, so you can include as many as needed.
        - If you include multiple sets of parentheses, only the first will be parsed for metadata.
        - Avoid using spaces within values (e.g., use freq:monthly:3rd Tue not freq:monthly:3rd  Tue).

    Context and Project Tags

        Context tags (`@`) and project tags (`+`) enhance clarity and usability by clearly indicating the context or environment needed and categorizing tasks within their relevant projects.

      Context Tags (`@`)**:
        Describe the ideal environment or tool required to complete a task.
        
        Examples:
          `@Office`: Tasks to complete at work.
          `@Home`: Tasks best handled at home.
          `@Phone`: Tasks involving phone calls.
          `@Online`: Tasks requiring internet access.

      Project Tags (`+`)**:
        Categorize tasks within specific projects or broader categories.
  
        Examples:
          `+Finance`: Tasks related to financial planning and budgets.
          `+Documentation`: Tasks involving documentation creation or updates.
          `+Marketing`: Tasks associated with marketing campaigns.
          `+Personal`: Tasks related to personal goals and activities.

      Example**:
        - [ ] Finalize annual budget report +Finance @Office
        - [ ] Schedule client follow-up call +Sales @Phone
        - [ ] Prepare content for website +Marketing @Online
        - [ ] Organize garage @Home
  
  Getting Started:
    Installation: |
      - Ensure Python 3 is installed.
      - Download the provided scripts into your desired working directory.
    
    Usage: |
      1. Launch GUI:
         ```shell
         python task_manager.py
         ```
      2. Load your tasks file (e.g., `tasks.txt`).
      3. Manage Tasks via GUI:
         - Sort by Area, Due Date, Priority.
         - Mark tasks complete/incomplete.
         - Update progress.
         - Save updates directly to your task file.
    
    Web Dashboard: |
      The project includes a modern web dashboard for task management:
      
      Features:
      - View tasks organized by area headers
      - Filter by area, context, and project with labeled dropdown menus
      - Sort by priority, due date, or no sorting
      - Check off tasks and recurring tasks
      - Responsive, clean UI
      
      Setup:
      1. Backend (FastAPI):
         ```shell
         cd dashboard/backend
         pip install -r requirements.txt
         uvicorn app:app --reload
         ```
      2. Frontend (React + TypeScript):
         ```shell
         cd dashboard/frontend
         npm install
         npm run dev
         ```
      
      Access at: http://localhost:5173
    
    Recommended_Project_Structure: |
      hybrid-task-manager/
      ├── tasks.txt
      ├── recurring_tasks.txt
      ├── task_manager.py
      ├── dashboard/
      │   ├── backend/ (FastAPI)
      │   └── frontend/ (React + TypeScript)
      ├── outputs/ (automatically created)
      └── README.md
    
    Output Files: |
      Sorted tasks are automatically saved in the `outputs/` directory.
  
  Automation and Extensibility: |
    - Integrate tasks with calendars (.ics file generation).
    - Automate daily summaries or reminders using scheduled tasks (cron, Windows Task Scheduler).
  
  Licensing_and_Contribution: |
    This project is provided freely for personal use, modification, and extension.

  Conclusion: |
    Enjoy your productivity journey with clarity, simplicity, and effectiveness!