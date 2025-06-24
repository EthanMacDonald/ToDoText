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

      Multiple metadata tags can be included within a single set of parentheses, separated by spaces. Each tag should be in the format key:value.
      
      Examples:
        - [ ] Prepare quarterly report (priority:A due:2025-07-15 progress:30%)
        - [x] Submit expense report (done:2025-06-20 priority:B)
        - [ ] Plan event (priority:C due:2025-08-01 rec:monthly)
      
      Notes:
        - All metadata tags must be inside one set of parentheses, e.g. (priority:A due:2025-07-15).
        - Tags can appear in any order within the parentheses.
        - The parser will extract all key:value pairs from the parentheses, so you can include as many as needed.
        - If you include multiple sets of parentheses, only the first will be parsed for metadata.
        - Avoid using spaces within values (e.g., use progress:30% not progress:30 %).

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