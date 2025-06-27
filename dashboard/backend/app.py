from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from pydantic import BaseModel
from parser import parse_tasks, parse_recurring_tasks, check_off_task, check_off_recurring_task, parse_tasks_by_priority, parse_tasks_no_sort, create_task, edit_task
import re
import datetime
import subprocess
import sys
import random
from datetime import datetime, timedelta, date
from collections import Counter, defaultdict
import os
import subprocess
import csv
import json
from pathlib import Path

class CheckTaskRequest(BaseModel):
    task_id: str

class RecurringTaskStatusRequest(BaseModel):
    task_id: str
    status: str  # "completed", "missed", "deferred"

class EditTaskRequest(BaseModel):
    area: str
    description: str
    priority: Optional[str] = None
    due_date: Optional[str] = None  # Format: YYYY-MM-DD
    context: Optional[str] = None
    project: Optional[str] = None
    recurring: Optional[str] = None
    completed: Optional[bool] = None

class CreateTaskRequest(BaseModel):
    area: str
    description: str
    priority: Optional[str] = None
    due_date: Optional[str] = None  # Format: YYYY-MM-DD
    context: Optional[str] = None
    project: Optional[str] = None
    recurring: Optional[str] = None  # e.g., "daily", "weekly:Mon"

def log_recurring_task_status(task_id: str, status: str, task_description: str) -> bool:
    """Log recurring task status to tracking file"""
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        log_file = os.path.join(current_dir, '../../archive_files/recurring_status_log.txt')
        
        # Create log entry with timestamp
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        log_entry = f"{timestamp} | {status.upper()} | {task_id} | {task_description}\n"
        
        # Append to log file
        with open(log_file, 'a', encoding='utf-8') as f:
            f.write(log_entry)
        
        return True
    except Exception as e:
        print(f"Error logging recurring task status: {e}")
        return False

def parse_recurring_status_log():
    """Parse the recurring status log file and return status data"""
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        log_file = os.path.join(current_dir, '../../archive_files/recurring_status_log.txt')
        
        status_data = {}  # {task_id: [(date, status, timestamp), ...]}
        
        if not os.path.exists(log_file):
            return status_data
        
        with open(log_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                
                # Parse format: "YYYY-MM-DD HH:MM:SS | STATUS | TASK_ID | TASK_DESCRIPTION"
                parts = line.split(' | ')
                if len(parts) >= 4:
                    timestamp_str = parts[0]
                    status = parts[1].upper()
                    task_id = parts[2]
                    
                    # Parse timestamp
                    try:
                        timestamp = datetime.strptime(timestamp_str, '%Y-%m-%d %H:%M:%S')
                        log_date = timestamp.date()
                        
                        if task_id not in status_data:
                            status_data[task_id] = []
                        
                        status_data[task_id].append((log_date, status, timestamp))
                    except ValueError:
                        continue
        
        # Sort entries by timestamp for each task
        for task_id in status_data:
            status_data[task_id].sort(key=lambda x: x[2])
        
        return status_data
        
    except Exception as e:
        print(f"Error parsing status log: {e}")
        return {}

def get_task_status_for_date(task_id: str, check_date: date, status_data: dict):
    """Get the latest status for a task on a specific date"""
    if task_id not in status_data:
        return None
    
    # Find the latest status entry for this date or before
    latest_status = None
    latest_timestamp = None
    
    for log_date, status, timestamp in status_data[task_id]:
        if log_date == check_date:
            if latest_timestamp is None or timestamp > latest_timestamp:
                latest_status = status
                latest_timestamp = timestamp
    
    return latest_status

def should_show_recurring_task(task, current_date: date, status_data: dict):
    """
    Returns True if task should be visible on current_date
    
    Logic:
    - COMPLETED: Hide until next recurrence
    - MISSED: 
      - Daily tasks: Hide for current day only
      - Non-daily: Keep showing (auto-defer)
    - DEFERRED:
      - All tasks: Hide for current day (will show again tomorrow or next occurrence)
    """
    task_id = task.get('id')
    recurring = task.get('recurring', '')
    
    if not task_id:
        return True  # Show if no ID
    
    # Get status for current date
    current_status = get_task_status_for_date(task_id, current_date, status_data)
    
    if current_status is None:
        return True  # Show if no status recorded
    
    is_daily = recurring == 'daily'
    
    if current_status == 'COMPLETED':
        # Hide completed tasks until next recurrence
        return False
    
    elif current_status == 'MISSED':
        if is_daily:
            # Daily tasks: hide for current day only
            return False
        else:
            # Non-daily tasks: keep showing (auto-defer until completed)
            return True
    
    elif current_status == 'DEFERRED':
        # All tasks (daily and non-daily): hide for current day
        # They will show again on their next occurrence or tomorrow (for daily)
        return False
    
    return True

def get_recurring_tasks_by_filter(filter_type: str = "today"):
    """Get recurring tasks filtered by time period and status"""
    try:
        all_recurring = parse_recurring_tasks()
        
        if filter_type == "all":
            return all_recurring
        
        today = date.today()
        
        # Parse status log
        status_data = parse_recurring_status_log()
        
        def should_show_task(task, filter_type):
            """Determine if a task should be shown based on its recurrence pattern and status"""
            # First check if task should be visible based on status
            if not should_show_recurring_task(task, today, status_data):
                return False
            
            recurring = task.get('recurring', '')
            if not recurring:
                return False
            
            # Parse the recurrence pattern
            if recurring == 'daily':
                return True  # Daily tasks always show (if not hidden by status)
            
            elif recurring.startswith('weekly:'):
                day_part = recurring.split(':')[1] if ':' in recurring else ''
                if day_part:
                    # Map day names to weekday numbers (Monday=0, Sunday=6)
                    day_map = {'Mon': 0, 'Tue': 1, 'Wed': 2, 'Thu': 3, 'Fri': 4, 'Sat': 5, 'Sun': 6}
                    target_weekday = day_map.get(day_part)
                    if target_weekday is not None:
                        if filter_type == "today":
                            return today.weekday() == target_weekday
                        elif filter_type == "next7days":
                            # Check if the target weekday occurs in the next 7 days
                            for i in range(7):
                                check_date = today + timedelta(days=i)
                                if check_date.weekday() == target_weekday:
                                    return True
                            return False
                return False
            
            elif recurring.startswith('monthly:'):
                day_part = recurring.split(':')[1] if ':' in recurring else ''
                if day_part.isdigit():
                    target_day = int(day_part)
                    if filter_type == "today":
                        return today.day == target_day
                    elif filter_type == "next7days":
                        # Check if the target day occurs in the next 7 days
                        for i in range(7):
                            check_date = today + timedelta(days=i)
                            if check_date.day == target_day:
                                return True
                        return False
                return False
            
            elif recurring.startswith('yearly:'):
                date_part = recurring.split(':')[1] if ':' in recurring else ''
                if '-' in date_part:
                    try:
                        month, day = map(int, date_part.split('-'))
                        target_date = date(today.year, month, day)
                        if filter_type == "today":
                            return today == target_date
                        elif filter_type == "next7days":
                            days_until = (target_date - today).days
                            return 0 <= days_until <= 6
                    except ValueError:
                        pass
                return False
            
            elif recurring.startswith('custom:'):
                # Custom intervals like "183d" - these are typically longer periods
                # For simplicity, only show them in "all" view
                return False
            
            return False
        
        # Filter tasks within each area
        filtered_areas = []
        for area_group in all_recurring:
            if area_group.get('type') == 'area':
                filtered_tasks = []
                for task in area_group.get('tasks', []):
                    if should_show_task(task, filter_type):
                        filtered_tasks.append(task)
                
                # Only include area if it has tasks to show
                if filtered_tasks:
                    filtered_area = area_group.copy()
                    filtered_area['tasks'] = filtered_tasks
                    filtered_areas.append(filtered_area)
        
        return filtered_areas
        
    except Exception as e:
        print(f"Error filtering recurring tasks: {e}")
        return []

def archive_completed_tasks():
    """Archive completed tasks using the same logic as archive_completed_items.py"""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    tasks_file = os.path.join(current_dir, '../../tasks.txt')
    archive_file = os.path.join(current_dir, '../../archive_files/archive.txt')
    
    area_as_suffix = True
    AREA_ORDER_KEY = ['Work', 'Personal', 'Health', 'Finances']
    
    try:
        # Parse tasks using regex, similar to sort_tasks.py
        with open(tasks_file, 'r') as f:
            lines = f.readlines()

        area = None
        completed_tasks = []
        output_lines = []
        parent_task = None
        parent_task_line = None
        parent_task_indent = None
        parent_task_completed = False
        parent_task_idx = None
        parent_task_area = None
        parent_written = set()

        for idx, line in enumerate(lines):
            stripped = line.rstrip('\n')
            area_match = re.match(r'^(\S.+):$', stripped)
            task_match = re.match(r'^(\s*)- \[( |x)\] (.+)', line)
            # Area header
            if area_match:
                area = area_match.group(1)
                output_lines.append(line)
                parent_task = None
                parent_task_line = None
                parent_task_indent = None
                parent_task_completed = False
                parent_task_idx = None
                parent_task_area = area
                continue
            # Task or subtask
            if task_match:
                indent, completed, content = task_match.groups()
                is_completed = completed == 'x'
                if len(indent) == 4:
                    parent_task = line
                    parent_task_line = line
                    parent_task_indent = indent
                    parent_task_completed = is_completed
                    parent_task_idx = len(completed_tasks)
                    parent_task_area = area
                    if is_completed:
                        completed_tasks.append((line, area))
                    else:
                        output_lines.append(line)
                elif len(indent) > 4:
                    # Subtask
                    if is_completed:
                        # If parent is not completed and not already written, write parent first
                        if not parent_task_completed and parent_task_line and parent_task_line not in parent_written:
                            completed_tasks.append((parent_task_line, parent_task_area))
                            parent_written.add(parent_task_line)
                        completed_tasks.append((line, parent_task_area))
                    else:
                        output_lines.append(line)
                else:
                    output_lines.append(line)
            else:
                output_lines.append(line)

        # If nothing to archive
        if not completed_tasks:
            return {"success": True, "message": "No completed tasks to archive.", "archived_count": 0}

        # Prepare archive entry with timestamp
        now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        archive_entry = [f'Archived on {now}\n']
        if area_as_suffix:
            for task, area in completed_tasks:
                if task.strip():
                    task_line = task.rstrip('\n')
                    # Only add &Area to top-level tasks (4 spaces indent), not subtasks
                    indent_match = re.match(r'^(\s*)- \[', task_line)
                    if indent_match and len(indent_match.group(1)) == 4:
                        archive_entry.append(f'{task_line} &{area}\n')
                    else:
                        archive_entry.append(f'{task_line}\n')
            archive_entry.append('\n')  # Add an empty line at the end
        else:
            # Sort areas by AREA_ORDER_KEY, then alphabetically for others
            grouped = defaultdict(list)
            for task, area in completed_tasks:
                grouped[area].append(task)
            ordered_areas = AREA_ORDER_KEY + sorted(set(grouped.keys()) - set(AREA_ORDER_KEY), key=lambda x: str(x))
            for area in ordered_areas:
                if area in grouped:
                    archive_entry.append(f'{area}:\n')
                    for task in grouped[area]:
                        archive_entry.append(task if task.endswith('\n') else task + '\n')
                    archive_entry.append('\n')

        # Prepend to archive file (write new at top)
        try:
            with open(archive_file, 'r') as f:
                old_content = f.read()
        except FileNotFoundError:
            old_content = ''
        with open(archive_file, 'w') as f:
            f.writelines(archive_entry)
            f.write(old_content)

        # Write back incomplete tasks to tasks.txt (including area headers)
        with open(tasks_file, 'w') as f:
            f.writelines(output_lines)

        return {"success": True, "message": f"Archived {len(completed_tasks)} completed tasks.", "archived_count": len(completed_tasks)}
        
    except Exception as e:
        return {"success": False, "message": f"Error archiving tasks: {str(e)}", "archived_count": 0}

def compute_task_statistics():
    """Compute statistics from the tasks, including subtasks with inherited metadata"""
    # Read tasks file
    current_dir = os.path.dirname(os.path.abspath(__file__))
    tasks_file = os.path.join(current_dir, '../../tasks.txt')
    
    tasks = []
    current_area = None
    parent_stack = []  # Stack to track parent tasks and their metadata
    
    with open(tasks_file, 'r') as f:
        for line in f:
            original_line = line
            line = line.rstrip()
            if not line or line.startswith('#'):
                continue
                
            # Check for area header
            area_match = re.match(r'^(\S.+):$', line)
            if area_match:
                current_area = area_match.group(1)
                parent_stack = []  # Reset parent stack for new area
                continue
                
            # Check for task
            task_match = re.match(r'^(\s*)- \[( |x)\] (.+)', original_line)
            if not task_match:
                continue
                
            indent, completed, content = task_match.groups()
            indent_level = len(indent) // 4
            
            # Create task object
            task = {'raw': line}
            task['completed'] = completed.lower() == 'x'
            task['area'] = current_area
            task['indent_level'] = indent_level
            
            # Extract metadata from the current task
            due_match = re.search(r'due:(\d{4}-\d{2}-\d{2})', content)
            task['due'] = (
                datetime.strptime(due_match.group(1), '%Y-%m-%d').date()
                if due_match else None
            )
            
            prio_match = re.search(r'priority:([A-F])', content)
            task['priority'] = prio_match.group(1) if prio_match else None
            
            # Also check for standalone priority letters
            if not task['priority']:
                standalone_prio_match = re.search(r'\b([A-F])\b', content)
                task['priority'] = standalone_prio_match.group(1) if standalone_prio_match else None
            
            task['projects'] = re.findall(r'\+(\w+)', content)
            task['contexts'] = re.findall(r'@(\w+)', content)
            
            # Update parent stack based on indentation
            while parent_stack and parent_stack[-1]['indent_level'] >= indent_level:
                parent_stack.pop()
            
            # If this is a subtask, inherit metadata from parent
            if indent_level > 1 and parent_stack:
                parent = parent_stack[-1]
                
                # Inherit metadata only if not explicitly set on subtask
                if not task['due'] and parent.get('due'):
                    task['due'] = parent['due']
                    
                if not task['priority'] and parent.get('priority'):
                    task['priority'] = parent['priority']
                    
                if not task['projects'] and parent.get('projects'):
                    task['projects'] = parent['projects']
                    
                if not task['contexts'] and parent.get('contexts'):
                    task['contexts'] = parent['contexts']
            
            # Add to parent stack for potential children
            if indent_level >= 1:  # Only add actual tasks to stack
                parent_stack.append(task)
            
            tasks.append(task)
    
    # Compute statistics
    today = datetime.now().date()
    stats = {}
    stats['total'] = len(tasks)
    stats['completed'] = sum(t['completed'] for t in tasks)
    stats['incomplete'] = stats['total'] - stats['completed']
    stats['completion_pct'] = (
        100 * stats['completed'] / stats['total'] if stats['total'] else 0
    )
    
    # By priority
    prio_counter = Counter(t['priority'] for t in tasks if t['priority'])
    for prio, count in prio_counter.items():
        stats[f'priority_{prio}'] = count
    
    # By project
    project_counter = Counter(p for t in tasks for p in t['projects'])
    for proj, count in project_counter.items():
        stats[f'project_{proj}'] = count
    
    # By context
    context_counter = Counter(c for t in tasks for c in t['contexts'])
    for ctx, count in context_counter.items():
        stats[f'context_{ctx}'] = count
    
    # Due dates
    stats['with_due_date'] = sum(1 for t in tasks if t['due'])
    stats['overdue'] = sum(1 for t in tasks if t['due'] and not t['completed'] and t['due'] < today)
    stats['due_today'] = sum(1 for t in tasks if t['due'] == today and not t['completed'])
    stats['due_this_week'] = sum(1 for t in tasks if t['due'] and not t['completed'] and 0 <= (t['due'] - today).days < 7)
    
    return stats

app = FastAPI()

# Allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/tasks")
def get_tasks(sort: str = "due"):
    """Get tasks with optional sorting
    
    Args:
        sort: Sorting method - 'due' (default), 'priority', or 'none'
    """
    if sort == "priority":
        return parse_tasks_by_priority()
    elif sort == "none":
        return parse_tasks_no_sort()
    else:
        return parse_tasks()  # Default due date sorting

@app.get("/recurring")
def get_recurring(filter: str = "today"):
    """Get recurring tasks with optional filtering"""
    return get_recurring_tasks_by_filter(filter)

@app.get("/statistics")
def get_statistics():
    """Get task statistics"""
    return compute_task_statistics()

@app.get("/statistics/time-series")
def get_statistics_time_series_endpoint():
    """Get historical statistics time series"""
    return get_statistics_time_series()

@app.get("/recurring/compliance")
def get_recurring_compliance():
    """Get recurring task compliance data over time"""
    return get_recurring_task_compliance_data()

@app.get("/recurring/compliance/individual")
def get_individual_compliance(task_id: str = None, days: int = None):
    """Get compliance data for individual recurring tasks"""
    return get_individual_recurring_task_compliance(task_id, days)

@app.get("/statistics/time-series/filtered")
def get_filtered_time_series(days: int = None):
    """Get filtered time series statistics"""
    return get_statistics_time_series_filtered(days)

@app.post("/tasks/archive")
def post_archive_completed_tasks():
    """Archive all completed tasks"""
    result = archive_completed_tasks()
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result["message"])
    return result

@app.post("/tasks/check")
def post_check_task(request: CheckTaskRequest):
    success = check_off_task(request.task_id)
    if not success:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"success": True}

@app.post("/recurring/check")
def post_check_recurring(request: CheckTaskRequest):
    success = check_off_recurring_task(request.task_id)
    if not success:
        raise HTTPException(status_code=404, detail="Recurring task not found")
    return {"success": True}

@app.post("/tasks/create")
def post_create_task(request: CreateTaskRequest):
    """Create a new task and add it to the tasks.txt file
    
    Args:
        request: Task details
    
    Returns:
        A success message
    """
    success = create_task(request)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to create task")
    return {"success": True}

@app.put("/tasks/{task_id}")
def put_edit_task(task_id: str, request: EditTaskRequest):
    """Edit an existing task
    
    Args:
        task_id: The ID of the task to edit
        request: Updated task details
    
    Returns:
        A success message
    """
    # Create a new object with the task_id added
    class EditTaskRequestWithId:
        def __init__(self, task_id: str, request: EditTaskRequest):
            self.task_id = task_id
            self.area = request.area
            self.description = request.description
            self.priority = request.priority
            self.due_date = request.due_date
            self.context = request.context
            self.project = request.project
            self.recurring = request.recurring
            self.completed = request.completed
    
    edit_request_with_id = EditTaskRequestWithId(task_id, request)
    success = edit_task(edit_request_with_id)
    if not success:
        raise HTTPException(status_code=404, detail="Task not found or failed to edit")
    return {"success": True}

@app.post("/recurring/status")
def post_recurring_status(request: RecurringTaskStatusRequest):
    """Set status for a recurring task and log it"""
    try:
        # First get the task details to log the description
        recurring_tasks = parse_recurring_tasks()
        task_description = None
        
        # Find the task description
        def find_task_in_groups(groups, target_id):
            for group in groups:
                if group.get('type') == 'area':
                    for task in group.get('tasks', []):
                        if task.get('id') == target_id:
                            return task.get('description', 'Unknown task')
                        # Check subtasks
                        if task.get('subtasks'):
                            for subtask in task['subtasks']:
                                if subtask.get('id') == target_id:
                                    return subtask.get('description', 'Unknown subtask')
            return None
        
        task_description = find_task_in_groups(recurring_tasks, request.task_id)
        if not task_description:
            raise HTTPException(status_code=404, detail="Recurring task not found")
        
        # Log the status
        success = log_recurring_task_status(request.task_id, request.status, task_description)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to log task status")
        
        return {"success": True, "message": f"Task marked as {request.status}"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing status update: {str(e)}")

@app.post("/git/commit")
def post_git_commit(message: str):
    """Run git commit script for task files"""
    try:
        # Navigate to the tasks directory
        current_dir = os.path.dirname(os.path.abspath(__file__))
        tasks_dir = os.path.join(current_dir, '../../')
        
        # Git commit command
        command = ['git', 'commit', '-m', message]
        
        # Run the command
        result = subprocess.run(command, cwd=tasks_dir, text=True, capture_output=True)
        
        # Check for errors
        if result.returncode != 0:
            raise Exception(f"Git commit failed: {result.stderr.strip()}")
        
        return {"success": True, "message": "Changes committed to git"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/git/commit-tasks")
async def commit_task_files():
    """Run the git commit script for task files"""
    try:
        # Get the absolute path to the script
        current_dir = os.path.dirname(os.path.abspath(__file__))
        script_path = os.path.join(current_dir, '../../scripts/commit_task_files.sh')
        
        # Change to the project root directory before running the script
        project_root = os.path.join(current_dir, '../..')
        
        # Run the script
        result = subprocess.run(
            ['bash', script_path],
            cwd=project_root,
            capture_output=True,
            text=True,
            timeout=30  # 30 second timeout
        )
        
        if result.returncode == 0:
            return {
                "success": True,
                "message": "Task files committed successfully",
                "output": result.stdout
            }
        else:
            return {
                "success": False,
                "message": "Git commit failed",
                "error": result.stderr,
                "output": result.stdout
            }
            
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=408, detail="Git commit script timed out")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error running git commit: {str(e)}")

def read_statistics_csv():
    """Read historical statistics from CSV file"""
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        csv_file = os.path.join(current_dir, '../../archive_files/task_statistics.csv')
        
        if not os.path.exists(csv_file):
            return []
        
        data = []
        current_headers = None
        
        with open(csv_file, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            
        i = 0
        while i < len(lines):
            line = lines[i].strip()
            if not line:
                i += 1
                continue
                
            # Check if this line is a header (starts with 'timestamp')
            if line.startswith('timestamp,'):
                current_headers = line.split(',')
                i += 1
                continue
            
            # If we have headers, try to parse data rows
            if current_headers:
                values = line.split(',')
                if len(values) == len(current_headers):
                    row = dict(zip(current_headers, values))
                    
                    # Skip if timestamp is 'timestamp' (duplicate header)
                    if row.get('timestamp') == 'timestamp':
                        i += 1
                        continue
                    
                    # Parse timestamp
                    try:
                        timestamp = datetime.strptime(row['timestamp'], '%Y-%m-%d %H:%M:%S')
                        row['timestamp'] = timestamp
                        
                        # Convert numeric fields
                        for key, value in row.items():
                            if key != 'timestamp' and value and isinstance(value, str):
                                # Check if it's a number (including negative and decimal)
                                if value.replace('.', '').replace('-', '').isdigit():
                                    row[key] = float(value) if '.' in value else int(value)
                        
                        data.append(row)
                    except ValueError:
                        pass
            
            i += 1
        
        # Sort by timestamp
        data.sort(key=lambda x: x['timestamp'])
        return data
        
    except Exception as e:
        print(f"Error reading statistics CSV: {e}")
        return []

def get_recurring_task_compliance_data():
    """Calculate recurring task compliance over time"""
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        log_file = os.path.join(current_dir, '../../archive_files/recurring_status_log.txt')
        
        if not os.path.exists(log_file):
            return []
        
        # Parse the log file
        daily_stats = defaultdict(lambda: {'completed': 0, 'missed': 0, 'deferred': 0, 'total': 0})
        
        with open(log_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                
                parts = line.split(' | ')
                if len(parts) >= 4:
                    timestamp_str = parts[0]
                    status = parts[1].upper()
                    task_id = parts[2]
                    
                    try:
                        timestamp = datetime.strptime(timestamp_str, '%Y-%m-%d %H:%M:%S')
                        date_str = timestamp.strftime('%Y-%m-%d')
                        
                        daily_stats[date_str]['total'] += 1
                        if status == 'COMPLETED':
                            daily_stats[date_str]['completed'] += 1
                        elif status == 'MISSED':
                            daily_stats[date_str]['missed'] += 1
                        elif status == 'DEFERRED':
                            daily_stats[date_str]['deferred'] += 1
                            
                    except ValueError:
                        continue
        
        # Convert to list and calculate compliance percentage
        compliance_data = []
        for date_str, stats in sorted(daily_stats.items()):
            total = stats['total']
            completed = stats['completed']
            compliance_pct = (completed / total * 100) if total > 0 else 0
            
            compliance_data.append({
                'date': date_str,
                'completed': completed,
                'missed': stats['missed'],
                'deferred': stats['deferred'],
                'total': total,
                'compliance_pct': round(compliance_pct, 2)
            })
        
        return compliance_data
        
    except Exception as e:
        print(f"Error calculating compliance data: {e}")
        return []

def get_statistics_time_series():
    """Get statistics time series data from CSV"""
    data = read_statistics_csv()
    
    # Group by date (in case there are multiple entries per day)
    daily_data = defaultdict(list)
    for row in data:
        date_str = row['timestamp'].strftime('%Y-%m-%d')
        daily_data[date_str].append(row)
    
    # Take the latest entry for each day and format for charting
    time_series = []
    for date_str in sorted(daily_data.keys()):
        latest_entry = max(daily_data[date_str], key=lambda x: x['timestamp'])
        
        time_series.append({
            'date': date_str,
            'total': latest_entry.get('total', 0),
            'completed': latest_entry.get('completed', 0),
            'incomplete': latest_entry.get('incomplete', 0),
            'completion_pct': latest_entry.get('completion_pct', 0),
            'with_due_date': latest_entry.get('with_due_date', 0),
            'overdue': latest_entry.get('overdue', 0),
            'due_today': latest_entry.get('due_today', 0),
            'due_this_week': latest_entry.get('due_this_week', 0)
        })
    
    return time_series

@app.get("/statistics/time-series")
def get_statistics_time_series_endpoint():
    """Get time-series statistics data for charts"""
    try:
        # Get compliance data
        compliance_data = get_recurring_task_compliance_data()
        
        # Get general statistics time series
        general_time_series = get_statistics_time_series()
        
        # Combine data: for each date, add compliance stats to the general stats
        combined_data = {}
        for entry in general_time_series:
            date_str = entry['date']
            combined_data[date_str] = {
                'date': date_str,
                'total': entry['total'],
                'completed': entry['completed'],
                'incomplete': entry['incomplete'],
                'completion_pct': entry['completion_pct'],
                'with_due_date': entry['with_due_date'],
                'overdue': entry['overdue'],
                'due_today': entry['due_today'],
                'due_this_week': entry['due_this_week'],
                'compliance': next((c for c in compliance_data if c['date'] == date_str), None)
            }
        
        # Convert back to sorted list
        combined_list = sorted(combined_data.values(), key=lambda x: x['date'])
        
        return combined_list
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-sample-data")
def generate_sample_data():
    """Generate sample historical data for demonstration purposes"""
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        csv_file = os.path.join(current_dir, '../../archive_files/task_statistics.csv')
        
        # Generate data for the past 30 days
        import random
        from datetime import datetime, timedelta
        
        base_date = datetime.now() - timedelta(days=30)
        sample_data = []
        
        for i in range(30):
            date = base_date + timedelta(days=i)
            total_tasks = random.randint(50, 200)
            completed = random.randint(5, total_tasks // 3)
            incomplete = total_tasks - completed
            completion_pct = (completed / total_tasks) * 100
            with_due_date = random.randint(10, total_tasks // 2)
            overdue = random.randint(0, with_due_date // 4)
            due_today = random.randint(0, 5)
            due_this_week = random.randint(due_today, 15)
            
            sample_data.append({
                'timestamp': date.strftime('%Y-%m-%d %H:%M:%S'),
                'total': total_tasks,
                'completed': completed,
                'incomplete': incomplete,
                'completion_pct': round(completion_pct, 2),
                'with_due_date': with_due_date,
                'overdue': overdue,
                'due_today': due_today,
                'due_this_week': due_this_week
            })
        
        # Write to CSV (append mode)
        with open(csv_file, 'a', encoding='utf-8') as f:
            if sample_data:
                # Check if file is empty to write header
                if os.path.getsize(csv_file) == 0:
                    f.write('timestamp,total,completed,incomplete,completion_pct,with_due_date,overdue,due_today,due_this_week\n')
                
                for entry in sample_data:
                    f.write(f"{entry['timestamp']},{entry['total']},{entry['completed']},{entry['incomplete']},{entry['completion_pct']},{entry['with_due_date']},{entry['overdue']},{entry['due_today']},{entry['due_this_week']}\n")
        
        return {"success": True, "message": f"Generated {len(sample_data)} sample data points"}
        
    except Exception as e:
        return {"success": False, "message": f"Error generating sample data: {str(e)}"}

def get_individual_recurring_task_compliance(task_id: str = None, days: int = None):
    """Get compliance data for individual recurring tasks"""
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        log_file = os.path.join(current_dir, '../../archive_files/recurring_status_log.txt')
        
        if not os.path.exists(log_file):
            return []
        
        # Parse the log file
        task_stats = defaultdict(lambda: defaultdict(lambda: {'completed': 0, 'missed': 0, 'deferred': 0, 'total': 0}))
        task_descriptions = {}
        
        # Calculate date cutoff if days is specified
        cutoff_date = None
        if days:
            cutoff_date = datetime.now() - timedelta(days=days)
        
        with open(log_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                
                parts = line.split(' | ')
                if len(parts) >= 4:
                    timestamp_str = parts[0]
                    status = parts[1].upper()
                    task_id_log = parts[2]
                    task_description = parts[3]
                    
                    try:
                        timestamp = datetime.strptime(timestamp_str, '%Y-%m-%d %H:%M:%S')
                        
                        # Apply date filter if specified
                        if cutoff_date and timestamp < cutoff_date:
                            continue
                            
                        date_str = timestamp.strftime('%Y-%m-%d')
                        
                        # Store task description
                        task_descriptions[task_id_log] = task_description
                        
                        # Filter by specific task if requested
                        if task_id and task_id_log != task_id:
                            continue
                        
                        task_stats[task_id_log][date_str]['total'] += 1
                        if status == 'COMPLETED':
                            task_stats[task_id_log][date_str]['completed'] += 1
                        elif status == 'MISSED':
                            task_stats[task_id_log][date_str]['missed'] += 1
                        elif status == 'DEFERRED':
                            task_stats[task_id_log][date_str]['deferred'] += 1
                            
                    except ValueError:
                        continue
        
        # Convert to the desired format
        if task_id:
            # Return data for specific task
            if task_id not in task_stats:
                return []
            
            result = []
            for date_str, stats in sorted(task_stats[task_id].items()):
                total = stats['total']
                completed = stats['completed']
                compliance_pct = (completed / total * 100) if total > 0 else 0
                
                result.append({
                    'date': date_str,
                    'task_id': task_id,
                    'task_description': task_descriptions.get(task_id, 'Unknown'),
                    'completed': completed,
                    'missed': stats['missed'],
                    'deferred': stats['deferred'],
                    'total': total,
                    'compliance_pct': round(compliance_pct, 2)
                })
            return result
        else:
            # Return summary data for all tasks
            result = []
            for task_id_key, date_data in task_stats.items():
                # Calculate overall stats for this task
                total_completed = sum(day['completed'] for day in date_data.values())
                total_missed = sum(day['missed'] for day in date_data.values())
                total_deferred = sum(day['deferred'] for day in date_data.values())
                total_all = total_completed + total_missed + total_deferred
                overall_compliance = (total_completed / total_all * 100) if total_all > 0 else 0
                
                result.append({
                    'task_id': task_id_key,
                    'task_description': task_descriptions.get(task_id_key, 'Unknown'),
                    'total_completed': total_completed,
                    'total_missed': total_missed,
                    'total_deferred': total_deferred,
                    'total_entries': total_all,
                    'overall_compliance_pct': round(overall_compliance, 2),
                    'first_date': min(date_data.keys()) if date_data else None,
                    'last_date': max(date_data.keys()) if date_data else None
                })
            
            # Sort by compliance percentage (descending)
            result.sort(key=lambda x: x['overall_compliance_pct'], reverse=True)
            return result
        
    except Exception as e:
        print(f"Error getting individual task compliance: {e}")
        return []

def get_statistics_time_series_filtered(days: int = None):
    """Get statistics time series data with optional day filter"""
    data = read_statistics_csv()
    
    # Apply date filter if specified
    if days:
        cutoff_date = datetime.now() - timedelta(days=days)
        data = [row for row in data if row['timestamp'] >= cutoff_date]
    
    # Group by date (in case there are multiple entries per day)
    daily_data = defaultdict(list)
    for row in data:
        date_str = row['timestamp'].strftime('%Y-%m-%d')
        daily_data[date_str].append(row)
    
    # Take the latest entry for each day and format for charting
    time_series = []
    for date_str in sorted(daily_data.keys()):
        latest_entry = max(daily_data[date_str], key=lambda x: x['timestamp'])
        
        time_series.append({
            'date': date_str,
            'total': latest_entry.get('total', 0),
            'completed': latest_entry.get('completed', 0),
            'incomplete': latest_entry.get('incomplete', 0),
            'completion_pct': latest_entry.get('completion_pct', 0),
            'with_due_date': latest_entry.get('with_due_date', 0),
            'overdue': latest_entry.get('overdue', 0),
            'due_today': latest_entry.get('due_today', 0),
            'due_this_week': latest_entry.get('due_this_week', 0)
        })
    
    return time_series

def get_task_performance_heatmap(days: int = 365):
    """Generate task performance heatmap data for calendar visualization"""
    try:
        # Get compliance data for recurring tasks
        compliance_data = get_recurring_task_compliance_data()
        
        # Get general statistics
        stats_data = get_statistics_time_series_filtered(days)
        
        # Create heatmap data structure
        heatmap_data = []
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=days)
        
        # Create dict for quick lookup
        compliance_dict = {item['date']: item for item in compliance_data}
        stats_dict = {item['date']: item for item in stats_data}
        
        current_date = start_date
        while current_date <= end_date:
            date_str = current_date.strftime('%Y-%m-%d')
            
            # Get compliance for this date
            compliance = compliance_dict.get(date_str, {})
            stats = stats_dict.get(date_str, {})
            
            # Calculate overall performance score (0-100)
            performance_score = 0
            factors = 0
            
            # Factor 1: Recurring task compliance
            if compliance.get('total', 0) > 0:
                performance_score += compliance.get('compliance_pct', 0)
                factors += 1
            
            # Factor 2: General task completion rate
            if stats.get('total', 0) > 0:
                performance_score += stats.get('completion_pct', 0)
                factors += 1
            
            # Factor 3: Overdue task penalty
            overdue_penalty = 0
            if stats.get('overdue', 0) > 0 and stats.get('total', 0) > 0:
                overdue_penalty = min(50, (stats.get('overdue', 0) / stats.get('total', 0)) * 100)
            
            # Calculate final score
            if factors > 0:
                performance_score = (performance_score / factors) - overdue_penalty
                performance_score = max(0, min(100, performance_score))
            
            heatmap_data.append({
                'date': date_str,
                'performance_score': round(performance_score, 2),
                'recurring_compliance': compliance.get('compliance_pct', 0),
                'task_completion': stats.get('completion_pct', 0),
                'overdue_count': stats.get('overdue', 0),
                'total_tasks': stats.get('total', 0),
                'recurring_total': compliance.get('total', 0)
            })
            
            current_date += timedelta(days=1)
        
        return heatmap_data
        
    except Exception as e:
        print(f"Error generating heatmap data: {e}")
        return []

def get_day_of_week_analysis(days: int = 90):
    """Analyze task performance by day of the week"""
    try:
        # Get compliance data
        compliance_data = get_recurring_task_compliance_data()
        stats_data = get_statistics_time_series_filtered(days)
        
        # Initialize day-of-week counters
        weekday_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        weekday_stats = {day: {'compliance': [], 'completion': [], 'total_tasks': [], 'overdue': []} for day in weekday_names}
        
        # Process compliance data
        for item in compliance_data:
            try:
                date_obj = datetime.strptime(item['date'], '%Y-%m-%d').date()
                if (datetime.now().date() - date_obj).days <= days:
                    weekday_name = weekday_names[date_obj.weekday()]
                    if item.get('total', 0) > 0:
                        weekday_stats[weekday_name]['compliance'].append(item.get('compliance_pct', 0))
            except ValueError:
                continue
        
        # Process general stats
        for item in stats_data:
            try:
                date_obj = datetime.strptime(item['date'], '%Y-%m-%d').date()
                weekday_name = weekday_names[date_obj.weekday()]
                if item.get('total', 0) > 0:
                    weekday_stats[weekday_name]['completion'].append(item.get('completion_pct', 0))
                    weekday_stats[weekday_name]['total_tasks'].append(item.get('total', 0))
                    weekday_stats[weekday_name]['overdue'].append(item.get('overdue', 0))
            except ValueError:
                continue
        
        # Calculate averages
        analysis_result = []
        for day in weekday_names:
            stats = weekday_stats[day]
            
            avg_compliance = sum(stats['compliance']) / len(stats['compliance']) if stats['compliance'] else 0
            avg_completion = sum(stats['completion']) / len(stats['completion']) if stats['completion'] else 0
            avg_total_tasks = sum(stats['total_tasks']) / len(stats['total_tasks']) if stats['total_tasks'] else 0
            avg_overdue = sum(stats['overdue']) / len(stats['overdue']) if stats['overdue'] else 0
            
            analysis_result.append({
                'day': day,
                'avg_compliance_pct': round(avg_compliance, 2),
                'avg_completion_pct': round(avg_completion, 2),
                'avg_total_tasks': round(avg_total_tasks, 1),
                'avg_overdue': round(avg_overdue, 1),
                'data_points': len(stats['completion']),
                'overall_performance': round((avg_compliance + avg_completion) / 2, 2)
            })
        
        return analysis_result
        
    except Exception as e:
        print(f"Error in day-of-week analysis: {e}")
        return []

def get_task_correlation_analysis(days: int = 90):
    """Analyze which tasks are often completed together"""
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        log_file = os.path.join(current_dir, '../../archive_files/recurring_status_log.txt')
        
        if not os.path.exists(log_file):
            return []
        
        # Get tasks completed on the same day
        daily_completions = defaultdict(set)
        task_descriptions = {}
        
        cutoff_date = datetime.now() - timedelta(days=days)
        
        with open(log_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                
                parts = line.split(' | ')
                if len(parts) >= 4:
                    timestamp_str = parts[0]
                    status = parts[1].upper()
                    task_id = parts[2]
                    task_description = parts[3]
                    
                    try:
                        timestamp = datetime.strptime(timestamp_str, '%Y-%m-%d %H:%M:%S')
                        if timestamp < cutoff_date:
                            continue
                            
                        if status == 'COMPLETED':
                            date_str = timestamp.strftime('%Y-%m-%d')
                            daily_completions[date_str].add(task_id)
                            task_descriptions[task_id] = task_description
                    except ValueError:
                        continue
        
        # Calculate correlation matrix
        task_ids = list(task_descriptions.keys())
        correlations = []
        
        for i, task1 in enumerate(task_ids):
            for j, task2 in enumerate(task_ids):
                if i >= j:  # Avoid duplicates and self-correlation
                    continue
                
                # Count days both tasks were completed
                both_completed = 0
                task1_completed = 0
                task2_completed = 0
                total_days = len(daily_completions)
                
                for date_str, completed_tasks in daily_completions.items():
                    task1_done = task1 in completed_tasks
                    task2_done = task2 in completed_tasks
                    
                    if task1_done and task2_done:
                        both_completed += 1
                    if task1_done:
                        task1_completed += 1
                    if task2_done:
                        task2_completed += 1
                
                # Calculate correlation coefficient (Jaccard similarity)
                if task1_completed + task2_completed - both_completed > 0:
                    correlation = both_completed / (task1_completed + task2_completed - both_completed)
                else:
                    correlation = 0
                
                if correlation > 0.1:  # Only include meaningful correlations
                    correlations.append({
                        'task1_id': task1,
                        'task1_description': task_descriptions[task1],
                        'task2_id': task2,
                        'task2_description': task_descriptions[task2],
                        'correlation': round(correlation, 3),
                        'both_completed_days': both_completed,
                        'task1_completed_days': task1_completed,
                        'task2_completed_days': task2_completed,
                        'total_days_analyzed': total_days
                    })
        
        # Sort by correlation strength
        correlations.sort(key=lambda x: x['correlation'], reverse=True)
        return correlations[:20]  # Top 20 correlations
        
    except Exception as e:
        print(f"Error in correlation analysis: {e}")
        return []

def get_priority_vs_completion_analysis():
    """Analyze completion rates by task priority"""
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        tasks_file = os.path.join(current_dir, '../../tasks.txt')
        
        priority_stats = defaultdict(lambda: {'total': 0, 'completed': 0})
        
        with open(tasks_file, 'r') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#') or line.endswith(':'):
                    continue
                
                # Check if task is completed
                is_completed = line.lower().startswith('- [x]')
                
                # Extract priority (A, B, C)
                prio_match = re.search(r'\b([A-C])\b', line)
                priority = prio_match.group(1) if prio_match else 'No Priority'
                
                priority_stats[priority]['total'] += 1
                if is_completed:
                    priority_stats[priority]['completed'] += 1
        
        # Calculate completion rates
        analysis_result = []
        for priority in ['A', 'B', 'C', 'No Priority']:
            if priority in priority_stats:
                stats = priority_stats[priority]
                completion_rate = (stats['completed'] / stats['total'] * 100) if stats['total'] > 0 else 0
                
                analysis_result.append({
                    'priority': priority,
                    'total_tasks': stats['total'],
                    'completed_tasks': stats['completed'],
                    'incomplete_tasks': stats['total'] - stats['completed'],
                    'completion_rate': round(completion_rate, 2)
                })
        
        return analysis_result
        
    except Exception as e:
        print(f"Error in priority analysis: {e}")
        return []

def get_streak_analysis():
    """Calculate current and best streaks for recurring tasks"""
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        log_file = os.path.join(current_dir, '../../archive_files/recurring_status_log.txt')
        
        if not os.path.exists(log_file):
            return []
        
        # Parse log data by task
        task_data = defaultdict(list)
        task_descriptions = {}
        
        with open(log_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                
                parts = line.split(' | ')
                if len(parts) >= 4:
                    timestamp_str = parts[0]
                    status = parts[1].upper()
                    task_id = parts[2]
                    task_description = parts[3]
                    
                    try:
                        timestamp = datetime.strptime(timestamp_str, '%Y-%m-%d %H:%M:%S')
                        date_str = timestamp.strftime('%Y-%m-%d');
                        
                        task_data[task_id].append({
                            'date': date_str,
                            'status': status,
                            'timestamp': timestamp
                        })
                        task_descriptions[task_id] = task_description
                    except ValueError:
                        continue
        
        # Calculate streaks for each task
        streak_results = []
        
        for task_id, entries in task_data.items():
            # Sort by date
            entries.sort(key=lambda x: x['timestamp'])
            
            # Group by date (take latest status per day)
            daily_status = {}
            for entry in entries:
                daily_status[entry['date']] = entry['status']
            
            # Calculate streaks
            current_streak = 0
            best_streak = 0
            temp_streak = 0
            
            # Get all dates from first entry to today
            if entries:
                start_date = datetime.strptime(min(daily_status.keys()), '%Y-%m-%d').date()
                end_date = datetime.now().date()
                
                current_date = start_date
                streak_active = True
                
                while current_date <= end_date:
                    date_str = current_date.strftime('%Y-%m-%d')
                    status = daily_status.get(date_str)
                    
                    if status == 'COMPLETED':
                        temp_streak += 1
                        if streak_active:
                            current_streak = temp_streak
                    else:
                        if temp_streak > best_streak:
                            best_streak = temp_streak
                        if status in ['MISSED', 'DEFERRED']:
                            streak_active = False
                        temp_streak = 0
                    
                    current_date += timedelta(days=1)
                
                # Final check for best streak
                if temp_streak > best_streak:
                    best_streak = temp_streak
            
            # Calculate completion rate
            total_entries = len(daily_status)
            completed_entries = sum(1 for status in daily_status.values() if status == 'COMPLETED')
            completion_rate = (completed_entries / total_entries * 100) if total_entries > 0 else 0
            
            streak_results.append({
                'task_id': task_id,
                'task_description': task_descriptions[task_id],
                'current_streak': current_streak,
                'best_streak': best_streak,
                'completion_rate': round(completion_rate, 2),
                'total_entries': total_entries,
                'completed_entries': completed_entries
            })
        
        # Sort by current streak (descending)
        streak_results.sort(key=lambda x: x['current_streak'], reverse=True)
        return streak_results
        
    except Exception as e:
        print(f"Error in streak analysis: {e}")
        return []

def get_performance_badges():
    """Award performance badges based on various criteria"""
    try:
        # Get data for badge calculations
        streak_data = get_streak_analysis()
        compliance_data = get_individual_recurring_task_compliance()
        priority_data = get_priority_vs_completion_analysis()
        
        badges = []
        
        # Streak-based badges
        for task in streak_data:
            if task['current_streak'] >= 30:
                badges.append({
                    'type': 'streak',
                    'level': 'platinum',
                    'title': 'Consistency Master',
                    'description': f"30+ day streak on '{task['task_description']}'",
                    'task_id': task['task_id'],
                    'value': task['current_streak']
                })
            elif task['current_streak'] >= 14:
                badges.append({
                    'type': 'streak',
                    'level': 'gold',
                    'title': 'Habit Builder',
                    'description': f"14+ day streak on '{task['task_description']}'",
                    'task_id': task['task_id'],
                    'value': task['current_streak']
                })
            elif task['current_streak'] >= 7:
                badges.append({
                    'type': 'streak',
                    'level': 'silver',
                    'title': 'Week Warrior',
                    'description': f"7+ day streak on '{task['task_description']}'",
                    'task_id': task['task_id'],
                    'value': task['current_streak']
                })
        
        # Compliance-based badges
        for task in compliance_data:
            if task['overall_compliance_pct'] >= 95 and task['total_entries'] >= 10:
                badges.append({
                    'type': 'compliance',
                    'level': 'platinum',
                    'title': 'Perfectionist',
                    'description': f"95%+ compliance on '{task['task_description']}'",
                    'task_id': task['task_id'],
                    'value': task['overall_compliance_pct']
                })
            elif task['overall_compliance_pct'] >= 85 and task['total_entries'] >= 10:
                badges.append({
                    'type': 'compliance',
                    'level': 'gold',
                    'title': 'High Achiever',
                    'description': f"85%+ compliance on '{task['task_description']}'",
                    'task_id': task['task_id'],
                    'value': task['overall_compliance_pct']
                })
            elif task['overall_compliance_pct'] >= 70 and task['total_entries'] >= 10:
                badges.append({
                    'type': 'compliance',
                    'level': 'silver',
                    'title': 'Consistent Performer',
                    'description': f"70%+ compliance on '{task['task_description']}'",
                    'task_id': task['task_id'],
                    'value': task['overall_compliance_pct']
                })
        
        # Priority completion badges
        high_priority_task = next((p for p in priority_data if p['priority'] == 'A'), None)
        if high_priority_task and high_priority_task['completion_rate'] >= 80:
            badges.append({
                'type': 'priority',
                'level': 'gold',
                'title': 'Priority Master',
                'description': f"80%+ completion rate on Priority A tasks",
                'task_id': None,
                'value': high_priority_task['completion_rate']
            })
        
        # Overall performance badges
        total_tasks = sum(task['total_entries'] for task in compliance_data)
        if total_tasks >= 100:
            badges.append({
                'type': 'volume',
                'level': 'gold',
                'title': 'Task Veteran',
                'description': f"Completed {total_tasks}+ recurring task instances",
                'task_id': None,
                'value': total_tasks
            })
        
        # Sort badges by level priority
        level_order = {'platinum': 0, 'gold': 1, 'silver': 2, 'bronze': 3}
        badges.sort(key=lambda x: (level_order.get(x['level'], 4), -x['value']))
        
        return badges
        
    except Exception as e:
        print(f"Error generating badges: {e}")
        return []

def get_comparative_time_series(task_ids: list, days: int = 30):
    """Compare multiple recurring tasks' compliance over time"""
    try:
        comparison_data = []
        
        for task_id in task_ids:
            task_data = get_individual_recurring_task_compliance(task_id, days)
            if task_data:
                comparison_data.append({
                    'task_id': task_id,
                    'task_description': task_data[0]['task_description'],
                    'data': task_data
                })
        
        # Create unified date range
        all_dates = set()
        for task in comparison_data:
            for entry in task['data']:
                all_dates.add(entry['date'])
        
        # Fill in missing dates with 0 values
        unified_data = []
        for date_str in sorted(all_dates):
            date_entry = {'date': date_str}
            
            for task in comparison_data:
                task_id = task['task_id']
                # Find data for this date
                day_data = next((d for d in task['data'] if d['date'] == date_str), None)
                if day_data:
                    date_entry[f"{task_id}_compliance"] = day_data['compliance_pct']
                    date_entry[f"{task_id}_description"] = day_data['task_description']
                else:
                    date_entry[f"{task_id}_compliance"] = 0
                    date_entry[f"{task_id}_description"] = task['task_description']
            
            unified_data.append(date_entry)
        
        return {
            'data': unified_data,
            'tasks': [{'task_id': task['task_id'], 'description': task['task_description']} for task in comparison_data]
        }
        
    except Exception as e:
        print(f"Error in comparative analysis: {e}")
        return {'data': [], 'tasks': []}

def get_behavioral_metrics(days: int = 30):
    """Calculate behavioral metrics like procrastination and completion velocity"""
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        log_file = os.path.join(current_dir, '../../archive_files/recurring_status_log.txt')
        tasks_file = os.path.join(current_dir, '../../tasks.txt')
        
        metrics = {
            'procrastination_score': 0,
            'completion_velocity': 0,
            'task_difficulty_distribution': {},
            'peak_performance_hours': [],
            'consistency_score': 0
        }
        
        # Analyze recurring task completion patterns
        if os.path.exists(log_file):
            cutoff_date = datetime.now() - timedelta(days=days)
            hourly_completions = defaultdict(int)
            daily_completions = defaultdict(int)
            deferred_vs_completed = {'deferred': 0, 'completed': 0}
            
            with open(log_file, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    
                    parts = line.split(' | ')
                    if len(parts) >= 4:
                        timestamp_str = parts[0]
                        status = parts[1].upper()
                        
                        try:
                            timestamp = datetime.strptime(timestamp_str, '%Y-%m-%d %H:%M:%S')
                            if timestamp < cutoff_date:
                                continue
                            
                            hour = timestamp.hour
                            date_str = timestamp.strftime('%Y-%m-%d')
                            
                            if status == 'COMPLETED':
                                hourly_completions[hour] += 1
                                daily_completions[date_str] += 1
                                deferred_vs_completed['completed'] += 1
                            elif status == 'DEFERRED':
                                deferred_vs_completed['deferred'] += 1
                                
                        except ValueError:
                            continue
            
            # Calculate procrastination score (higher deferred rate = more procrastination)
            total_actions = deferred_vs_completed['completed'] + deferred_vs_completed['deferred']
            if total_actions > 0:
                metrics['procrastination_score'] = round(
                    (deferred_vs_completed['deferred'] / total_actions) * 100, 2
                )
            
            # Calculate completion velocity (tasks per day)
            if daily_completions:
                metrics['completion_velocity'] = round(
                    sum(daily_completions.values()) / len(daily_completions), 2
                )
            
            # Find peak performance hours
            if hourly_completions:
                max_completions = max(hourly_completions.values())
                metrics['peak_performance_hours'] = [
                    hour for hour, count in hourly_completions.items() 
                    if count >= max_completions * 0.8  # Within 80% of peak
                ]
            
            # Calculate consistency score (standard deviation of daily completions)
            if len(daily_completions) > 1:
                completion_values = list(daily_completions.values())
                mean_completions = sum(completion_values) / len(completion_values)
                variance = sum((x - mean_completions) ** 2 for x in completion_values) / len(completion_values)
                std_dev = variance ** 0.5
                # Convert to consistency score (lower std dev = higher consistency)
                metrics['consistency_score'] = round(max(0, 100 - (std_dev / mean_completions) * 100), 2)
        
        # Analyze task difficulty from current tasks
        if os.path.exists(tasks_file):
            priority_counts = defaultdict(int)
            
            with open(tasks_file, 'r') as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith('#') or line.endswith(':'):
                        continue
                    
                    # Extract priority as difficulty indicator
                    prio_match = re.search(r'\b([A-C])\b', line)
                    if prio_match:
                        priority_counts[prio_match.group(1)] += 1
                    else:
                        priority_counts['No Priority'] += 1
            
            total_tasks = sum(priority_counts.values())
            if total_tasks > 0:
                metrics['task_difficulty_distribution'] = {
                    priority: round((count / total_tasks) * 100, 2)
                    for priority, count in priority_counts.items()
                }
        
        return metrics
        
    except Exception as e:
        print(f"Error calculating behavioral metrics: {e}")
        return metrics

def get_leaderboard_data():
    """Generate leaderboard data for gamification"""
    try:
        # This would typically compare multiple users, but for single-user setup,
        # we'll create categories and rankings based on different metrics
        
        streak_data = get_streak_analysis()
        compliance_data = get_individual_recurring_task_compliance()
        behavioral_data = get_behavioral_metrics()
        
        leaderboards = {
            'streaks': {
                'title': 'Longest Current Streaks',
                'entries': [
                    {
                        'rank': i + 1,
                        'name': task['task_description'],
                        'value': task['current_streak'],
                        'metric': 'days'
                    }
                    for i, task in enumerate(sorted(streak_data, key=lambda x: x['current_streak'], reverse=True)[:10])
                ]
            },
            'compliance': {
                'title': 'Highest Compliance Rates',
                'entries': [
                    {
                        'rank': i + 1,
                        'name': task['task_description'],
                        'value': task['overall_compliance_pct'],
                        'metric': '%'
                    }
                    for i, task in enumerate(sorted(compliance_data, key=lambda x: x['overall_compliance_pct'], reverse=True)[:10])
                ]
            },
            'volume': {
                'title': 'Most Completed Tasks',
                'entries': [
                    {
                        'rank': i + 1,
                        'name': task['task_description'],
                        'value': task['total_completed'],
                        'metric': 'tasks'
                    }
                    for i, task in enumerate(sorted(compliance_data, key=lambda x: x['total_completed'], reverse=True)[:10])
                ]
            }
        }
        
        return leaderboards
        
    except Exception as e:
        print(f"Error generating leaderboard: {e}")
        return {}

def get_challenge_modes():
    """Define and track progress on various productivity challenges"""
    try:
        current_stats = compute_task_statistics()
        streak_data = get_streak_analysis()
        behavioral_data = get_behavioral_metrics()
        
        challenges = [
            {
                'id': 'perfect_week',
                'title': 'Perfect Week Challenge',
                'description': 'Complete all recurring tasks for 7 consecutive days',
                'target': 7,
                'current': max([task['current_streak'] for task in streak_data] + [0]),
                'progress': min(100, (max([task['current_streak'] for task in streak_data] + [0]) / 7) * 100),
                'type': 'streak',
                'difficulty': 'medium',
                'reward': 'Week Warrior Badge'
            },
            {
                'id': 'zero_overdue',
                'title': 'Zero Overdue Challenge',
                'description': 'Maintain zero overdue tasks for 30 days',
                'target': 30,
                'current': 0 if current_stats.get('overdue', 0) > 0 else 1,  # Simplified tracking
                'progress': 0 if current_stats.get('overdue', 0) > 0 else 100,
                'type': 'maintenance',
                'difficulty': 'hard',
                'reward': 'Organization Master Badge'
            },
            {
                'id': 'high_priority_focus',
                'title': 'Priority A Focus',
                'description': 'Complete 90% of Priority A tasks this month',
                'target': 90,
                'current': 75,  # Would calculate from actual data
                'progress': 83.3,  # (75/90)*100
                'type': 'completion',
                'difficulty': 'medium',
                'reward': 'Priority Master Badge'
            },
            {
                'id': 'consistency_champion',
                'title': 'Consistency Champion',
                'description': 'Achieve 85% consistency score for 14 days',
                'target': 85,
                'current': behavioral_data.get('consistency_score', 0),
                'progress': min(100, (behavioral_data.get('consistency_score', 0) / 85) * 100),
                'type': 'behavioral',
                'difficulty': 'hard',
                'reward': 'Consistency Master Badge'
            },
            {
                'id': 'speed_demon',
                'title': 'Speed Demon',
                'description': 'Achieve completion velocity of 5+ tasks per day',
                'target': 5,
                'current': behavioral_data.get('completion_velocity', 0),
                'progress': min(100, (behavioral_data.get('completion_velocity', 0) / 5) * 100),
                'type': 'velocity',
                'difficulty': 'easy',
                'reward': 'Speed Badge'
            }
        ]
        
        # Add status to each challenge
        for challenge in challenges:
            if challenge['progress'] >= 100:
                challenge['status'] = 'completed'
            elif challenge['progress'] >= 50:
                challenge['status'] = 'in_progress'
            else:
                challenge['status'] = 'not_started'
        
        return challenges
        
    except Exception as e:
        print(f"Error generating challenges: {e}")
        return []

def add_moving_average_to_time_series(data: list, window: int = 7, field: str = 'completion_pct'):
    """Add moving average to time series data"""
    try:
        if len(data) < window:
            return data
        
        # Calculate moving average
        for i in range(len(data)):
            if i >= window - 1:
                # Get the window of values
                window_values = []
                for j in range(i - window + 1, i + 1):
                    if field in data[j] and data[j][field] is not None:
                        window_values.append(data[j][field])
                
                # Calculate average
                if window_values:
                    data[i][f'{field}_ma_{window}'] = round(sum(window_values) / len(window_values), 2)
                else:
                    data[i][f'{field}_ma_{window}'] = None
            else:
                data[i][f'{field}_ma_{window}'] = None
        
        return data
        
    except Exception as e:
        print(f"Error adding moving average: {e}")
        return data

def add_trend_line_to_time_series(data: list, field: str = 'completion_pct'):
    """Add linear trend line to time series data"""
    try:
        if len(data) < 2:
            return data
        
        # Prepare data for linear regression
        x_values = []
        y_values = []
        
        for i, point in enumerate(data):
            if field in point and point[field] is not None:
                x_values.append(i)
                y_values.append(point[field])
        
        if len(x_values) < 2:
            return data
        
        # Calculate linear regression (y = mx + b)
        n = len(x_values)
        sum_x = sum(x_values)
        sum_y = sum(y_values)
        sum_xy = sum(x * y for x, y in zip(x_values, y_values))
        sum_x2 = sum(x * x for x in x_values)
        
        # Calculate slope and intercept
        denominator = n * sum_x2 - sum_x * sum_x
        if denominator != 0:
            slope = (n * sum_xy - sum_x * sum_y) / denominator
            intercept = (sum_y - slope * sum_x) / n
            
            # Add trend values to each data point
            for i, point in enumerate(data):
                point[f'{field}_trend'] = round(slope * i + intercept, 2)
        
        return data
        
    except Exception as e:
        print(f"Error adding trend line: {e}")
        return data

# Additional analytics endpoints

@app.get("/api/statistics/time-series/filtered")
async def api_get_filtered_time_series(days: int = None):
    """Get filtered time series statistics"""
    try:
        data = get_statistics_time_series_filtered(days)
        return {"success": True, "data": data}
    except Exception as e:
        return {"success": False, "error": str(e), "data": []}

@app.get("/api/analytics/heatmap")
async def api_get_heatmap(days: int = 365):
    """Get task performance heatmap data"""
    try:
        data = get_task_performance_heatmap(days)
        return {"success": True, "data": data}
    except Exception as e:
        return {"success": False, "error": str(e), "data": []}

@app.get("/api/analytics/day-of-week")
async def api_get_day_of_week_analysis(days: int = 90):
    """Get day-of-week performance analysis"""
    try:
        data = get_day_of_week_analysis(days)
        return {"success": True, "data": data}
    except Exception as e:
        return {"success": False, "error": str(e), "data": []}

@app.get("/api/analytics/correlation")
async def api_get_correlation_analysis(days: int = 90):
    """Get task correlation analysis"""
    try:
        data = get_task_correlation_analysis(days)
        return {"success": True, "data": data}
    except Exception as e:
        return {"success": False, "error": str(e), "data": []}

@app.get("/api/analytics/priority-completion")
async def api_get_priority_analysis():
    """Get priority vs completion analysis"""
    try:
        data = get_priority_vs_completion_analysis()
        return {"success": True, "data": data}
    except Exception as e:
        return {"success": False, "error": str(e), "data": []}

@app.get("/api/analytics/streaks")
async def api_get_streak_analysis():
    """Get streak analysis for recurring tasks"""
    try:
        data = get_streak_analysis()
        return {"success": True, "data": data}
    except Exception as e:
        return {"success": False, "error": str(e), "data": []}

@app.get("/api/gamification/badges")
async def api_get_badges():
    """Get earned performance badges"""
    try:
        data = get_performance_badges()
        return {"success": True, "data": data}
    except Exception as e:
        return {"success": False, "error": str(e), "data": []}

@app.get("/api/analytics/comparative")
async def api_get_comparative_analysis(task_ids: str, days: int = 30):
    """Compare multiple tasks over time"""
    try:
        # Parse comma-separated task IDs
        task_id_list = [tid.strip() for tid in task_ids.split(',') if tid.strip()]
        data = get_comparative_time_series(task_id_list, days)
        return {"success": True, "data": data}
    except Exception as e:
        return {"success": False, "error": str(e), "data": {"data": [], "tasks": []}}

@app.get("/api/analytics/behavioral")
async def api_get_behavioral_metrics(days: int = 30):
    """Get behavioral metrics and patterns"""
    try:
        data = get_behavioral_metrics(days)
        return {"success": True, "data": data}
    except Exception as e:
        return {"success": False, "error": str(e), "data": {}}

@app.get("/api/gamification/leaderboard")
async def api_get_leaderboard():
    """Get leaderboard data"""
    try:
        data = get_leaderboard_data()
        return {"success": True, "data": data}
    except Exception as e:
        return {"success": False, "error": str(e), "data": {}}

@app.get("/api/gamification/challenges")
async def api_get_challenges():
    """Get available challenges and progress"""
    try:
        data = get_challenge_modes()
        return {"success": True, "data": data}
    except Exception as e:
        return {"success": False, "error": str(e), "data": []}

@app.get("/api/statistics/time-series/enhanced")
async def api_get_enhanced_time_series(days: int = None, moving_average: int = 7, include_trend: bool = True):
    """Get time series with moving averages and trend lines"""
    try:
        data = get_statistics_time_series_filtered(days)
        
        if moving_average > 1:
            data = add_moving_average_to_time_series(data, moving_average, 'completion_pct')
        
        if include_trend:
            data = add_trend_line_to_time_series(data, 'completion_pct')
        
        return {"success": True, "data": data}
    except Exception as e:
        return {"success": False, "error": str(e), "data": []}

@app.get("/api/recurring/compliance/enhanced")
async def api_get_enhanced_compliance(task_id: str = None, days: int = 30, moving_average: int = 7, include_trend: bool = True):
    """Get compliance data with moving averages and trend lines"""
    try:
        if task_id:
            data = get_individual_recurring_task_compliance(task_id, days)
        else:
            data = get_recurring_task_compliance_data()
            # Filter by days if specified
            if days and data:
                cutoff_date = datetime.now() - timedelta(days=days)
                data = [item for item in data if datetime.strptime(item['date'], '%Y-%m-%d') >= cutoff_date]
        
        if moving_average > 1 and data:
            data = add_moving_average_to_time_series(data, moving_average, 'compliance_pct')
        
        if include_trend and data:
            data = add_trend_line_to_time_series(data, 'compliance_pct')
        
        return {"success": True, "data": data}
    except Exception as e:
        return {"success": False, "error": str(e), "data": []}

# Helper endpoint to list available recurring task IDs for comparative analysis
@app.get("/api/recurring/task-list")
async def api_get_recurring_task_list():
    """Get list of all recurring task IDs and descriptions"""
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        log_file = os.path.join(current_dir, '../../archive_files/recurring_status_log.txt')
        
        task_descriptions = {}
        
        if os.path.exists(log_file):
            with open(log_file, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    
                    parts = line.split(' | ')
                    if len(parts) >= 4:
                        task_id = parts[2]
                        task_description = parts[3]
                        task_descriptions[task_id] = task_description
        
        task_list = [{"task_id": tid, "description": desc} for tid, desc in task_descriptions.items()]
        return {"success": True, "data": task_list}
    except Exception as e:
        return {"success": False, "error": str(e), "data": []}

# Lists management endpoints
LISTS_DIR = Path("../../lists")

@app.get("/lists")
async def get_available_lists():
    """Get all available list files"""
    if not LISTS_DIR.exists():
        LISTS_DIR.mkdir(exist_ok=True)
        return []
    
    lists = []
    for file_path in LISTS_DIR.glob("*.txt"):
        # Read first few lines to get any title/description
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
                
            # Count total and completed items
            total_items = 0
            completed_items = 0
            title = file_path.stem.replace('_', ' ').title()
            
            for line in lines:
                line = line.strip()
                if line.startswith('# ') and 'title' not in locals():
                    title = line[2:].strip()
                elif line.startswith('- ['):
                    total_items += 1
                    if line.startswith('- [x]') or line.startswith('- [X]'):
                        completed_items += 1
            
            completion_pct = (completed_items / total_items * 100) if total_items > 0 else 0
            
            lists.append({
                "name": file_path.stem,
                "title": title,
                "filename": file_path.name,
                "total_items": total_items,
                "completed_items": completed_items,
                "completion_percentage": round(completion_pct, 1)
            })
        except Exception as e:
            print(f"Error reading list {file_path}: {e}")
            continue
    
    return lists

@app.get("/lists/{list_name}")
async def get_list_items(list_name: str):
    """Get items from a specific list"""
    file_path = LISTS_DIR / f"{list_name}.txt"
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="List not found")
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        items = []
        title = list_name.replace('_', ' ').title()
        current_area = None
        
        for i, line in enumerate(lines):
            original_line = line
            line = line.strip()
            
            # Extract title from comments
            if line.startswith('# ') and len(items) == 0:
                title = line[2:].strip()
                continue
            
            # Skip comments and empty lines
            if line.startswith('#') or not line:
                continue
            
            # Check for area headers (lines ending with colon, not indented)
            if line.endswith(':') and not original_line.startswith('    ') and not original_line.startswith('\t'):
                current_area = line[:-1]  # Remove the colon
                items.append({
                    "id": i,
                    "text": current_area,
                    "completed": False,
                    "line_number": i,
                    "is_area_header": True,
                    "area": current_area
                })
                continue
            
            # Parse checkbox items (must be indented)
            if line.startswith('- [') and (original_line.startswith('    ') or original_line.startswith('\t')):
                completed = line.startswith('- [x]') or line.startswith('- [X]')
                # Extract item text (everything after the checkbox)
                text = re.sub(r'^- \[[ xX]\]\s*', '', line)
                
                items.append({
                    "id": i,
                    "text": text,
                    "completed": completed,
                    "line_number": i,
                    "is_area_header": False,
                    "area": current_area
                })
        
        # Count only checkbox items for progress
        checkbox_items = [item for item in items if not item.get("is_area_header", False)]
        total_items = len(checkbox_items)
        completed_items = sum(1 for item in checkbox_items if item["completed"])
        completion_pct = (completed_items / total_items * 100) if total_items > 0 else 0
        
        return {
            "name": list_name,
            "title": title,
            "items": items,
            "total_items": total_items,
            "completed_items": completed_items,
            "completion_percentage": round(completion_pct, 1)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading list: {str(e)}")

@app.post("/lists/{list_name}/toggle")
async def toggle_list_item(list_name: str, request: dict):
    """Toggle completion status of a list item"""
    file_path = LISTS_DIR / f"{list_name}.txt"
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="List not found")
    
    item_index = request.get("item_index")
    if item_index is None:
        raise HTTPException(status_code=400, detail="item_index required")
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        # Get the actual checkbox items (not including comments/empty lines/area headers)
        checkbox_lines = []
        for i, line in enumerate(lines):
            original_line = line
            stripped_line = line.strip()
            # Only count indented checkbox items
            if stripped_line.startswith('- [') and (original_line.startswith('    ') or original_line.startswith('\t')):
                checkbox_lines.append(i)
        
        # Make sure the item_index is valid
        if item_index < 0 or item_index >= len(checkbox_lines):
            raise HTTPException(status_code=400, detail="Invalid item index")
        
        # Get the actual line number to toggle
        line_to_toggle = checkbox_lines[item_index]
        line = lines[line_to_toggle].strip()
        
        if line.startswith('- [x]') or line.startswith('- [X]'):
            # Mark as incomplete
            lines[line_to_toggle] = lines[line_to_toggle].replace('- [x]', '- [ ]').replace('- [X]', '- [ ]')
        elif line.startswith('- [ ]'):
            # Mark as complete  
            lines[line_to_toggle] = lines[line_to_toggle].replace('- [ ]', '- [x]')
        
        # Write back to file
        with open(file_path, 'w', encoding='utf-8') as f:
            f.writelines(lines)
        
        return {"success": True, "message": "Item toggled successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating list: {str(e)}")

@app.post("/lists/{list_name}/reset")
async def reset_list(list_name: str):
    """Reset all items in a list to unchecked"""
    file_path = LISTS_DIR / f"{list_name}.txt"
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="List not found")
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        # Reset all checkboxes to unchecked
        for i, line in enumerate(lines):
            if line.strip().startswith('- [x]') or line.strip().startswith('- [X]'):
                lines[i] = line.replace('- [x]', '- [ ]').replace('- [X]', '- [ ]')
        
        # Write back to file
        with open(file_path, 'w', encoding='utf-8') as f:
            f.writelines(lines)
        
        return {"success": True, "message": "List reset successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error resetting list: {str(e)}")

@app.post("/calendar/push-due-dates")
async def push_due_dates_to_calendar():
    """Push tasks with due dates to Google Calendar"""
    try:
        # Path to the calendar script (corrected to project root scripts/)
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        script_path = os.path.join(project_root, 'scripts', 'push_due_dates_to_calendar.py')
        
        # Run the calendar script
        result = subprocess.run([
            sys.executable, script_path
        ], capture_output=True, text=True, cwd=project_root)
        
        if result.returncode == 0:
            return {"success": True, "message": "Due dates pushed to calendar successfully"}
        else:
            error_msg = result.stderr.strip() if result.stderr else "Unknown error"
            return {"success": False, "message": f"Calendar push failed: {error_msg}"}
            
    except Exception as e:
        return {"success": False, "message": f"Error pushing to calendar: {str(e)}"}
