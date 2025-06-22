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
      Completion Date: "(done:YYYY-MM-DD)"
      Progress: "(progress:X%)"
      Recurrence: "(rec:daily|weekly|monthly)"
      Example: |
        - [ ] Prepare quarterly report (priority:A due:2025-07-15 progress:30%)

    Context and Project Tags:
      Context: "@Context"
      Additional Project: "+ProjectName"
      Example: |
        - [ ] Finish annual budget +Finance @HomeOffice
  
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
    
    Recommended_Project_Structure: |
      hybrid-task-manager/
      ├── tasks.txt
      ├── task_manager.py
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