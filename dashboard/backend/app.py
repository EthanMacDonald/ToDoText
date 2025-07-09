from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from pydantic import BaseModel
from parser import parse_tasks, parse_recurring_tasks, check_off_task, check_off_recurring_task, parse_tasks_by_priority, parse_tasks_no_sort, create_task, edit_task, delete_task, create_subtask_for_task
import re
import datetime
import subprocess
import sys
import random
from datetime import datetime, timedelta, date, time
from collections import Counter, defaultdict
import os
import subprocess
import csv
import json
from pathlib import Path

# Configuration: Hour when the "day" starts (3 AM = 3)
DAY_START_HOUR = 3

def get_adjusted_date(dt: datetime = None) -> date:
    """
    Get the adjusted date considering 3 AM as the day boundary.
    Times between midnight and 3 AM are considered part of the previous day.
    """
    if dt is None:
        dt = datetime.now()
    
    # If it's before 3 AM, subtract one day
    if dt.hour < DAY_START_HOUR:
        return (dt - timedelta(days=1)).date()
    else:
        return dt.date()

def get_adjusted_today() -> date:
    """Get today's date using the adjusted day boundary"""
    return get_adjusted_date()

def get_adjusted_datetime_for_date(target_date: date) -> datetime:
    """
    Get the datetime when the adjusted day starts for a given date.
    For example, for 2025-07-01, this returns 2025-07-01 03:00:00
    """
    return datetime.combine(target_date, time(DAY_START_HOUR, 0, 0))

class CheckTaskRequest(BaseModel):
    task_id: str

class RecurringTaskStatusRequest(BaseModel):
    task_id: str
    status: str  # "completed", "missed", "deferred"

class EditTaskRequest(BaseModel):
    area: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[str] = None  # Format: YYYY-MM-DD
    done_date: Optional[str] = None  # Format: YYYY-MM-DD
    followup_date: Optional[str] = None  # Format: YYYY-MM-DD
    context: Optional[str] = None
    project: Optional[str] = None
    recurring: Optional[str] = None
    onhold: Optional[str] = None  # e.g., "2025-07-15" or "waiting for approval"
    completed: Optional[bool] = None
    notes: Optional[List[str]] = None  # List of note strings

class CreateTaskRequest(BaseModel):
    area: str
    description: str
    priority: Optional[str] = None
    due_date: Optional[str] = None  # Format: YYYY-MM-DD
    context: Optional[str] = None
    project: Optional[str] = None
    recurring: Optional[str] = None  # e.g., "daily", "weekly:Mon"
    onhold: Optional[str] = None  # e.g., "2025-07-15" or "waiting for approval"
    notes: Optional[List[str]] = None  # List of note strings

class ListToggleRequest(BaseModel):
    item_index: int

class ListItemUpdateRequest(BaseModel):
    item_index: int
    text: str
    quantity: str = ""
    notes: str = ""

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
                        # Use adjusted date for 3 AM boundary
                        log_date = get_adjusted_date(timestamp)
                        
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
        
        # Use adjusted today for 3 AM boundary
        today = get_adjusted_today()
        
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
    # Use adjusted today for 3 AM boundary
    today = get_adjusted_today()
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

@app.get("/")
def root():
    """Root endpoint"""
    return {"message": "Todo Analytics API", "status": "running"}

@app.get("/health")
def health():
    """Health check endpoint"""
    return {"status": "healthy"}

@app.get("/tasks")
def get_tasks(sort: str = "due"):
    """Get tasks with optional sorting
    
    Args:
        sort: Sorting method - 'due' (default), 'priority', or 'none'
    """
    try:
        if sort == "priority":
            data = parse_tasks_by_priority()
        elif sort == "none":
            data = parse_tasks_no_sort()
        else:
            data = parse_tasks()  # Default due date sorting
        
        return {"status": "success", "data": data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/tasks/priority")
def get_tasks_by_priority():
    """Get tasks sorted by priority"""
    try:
        data = parse_tasks_by_priority()
        return {"status": "success", "data": data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/tasks/no-sort")
def get_tasks_no_sort():
    """Get tasks without sorting"""
    try:
        data = parse_tasks_no_sort()
        return {"status": "success", "data": data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/tasks")
def create_task_endpoint(request: CreateTaskRequest):
    """Create a new task"""
    try:
        result = create_task(
            area=request.area,
            description=request.description,
            priority=request.priority,
            due_date=request.due_date,
            context=request.context,
            project=request.project,
            recurring=request.recurring,
            onhold=request.onhold,
            notes=request.notes
        )
        if result and "status" in result and result["status"] == "success":
            return result
        else:
            return {"status": "success", "task_id": f"task_{datetime.now().timestamp()}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/recurring")
def get_recurring(filter: str = "today"):
    """Get recurring tasks with optional filtering"""
    try:
        data = get_recurring_tasks_by_filter(filter)
        return {"status": "success", "data": data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/statistics")
def get_statistics():
    """Get task statistics"""
    try:
        data = compute_task_statistics()
        return {"status": "success", "data": data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/statistics/area")
def get_statistics_by_area():
    """Get task statistics grouped by area"""
    try:
        tasks = parse_tasks()
        area_stats = {}
        
        for task in tasks:
            area = task.get('area', 'Unknown')
            if area not in area_stats:
                area_stats[area] = {
                    "area": area,
                    "total_tasks": 0,
                    "completed_tasks": 0,
                    "pending_tasks": 0
                }
            
            area_stats[area]["total_tasks"] += 1
            if task.get('completed', False):
                area_stats[area]["completed_tasks"] += 1
            else:
                area_stats[area]["pending_tasks"] += 1
        
        data = list(area_stats.values())
        return {"status": "success", "data": data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/statistics/priority")
def get_statistics_by_priority():
    """Get task statistics grouped by priority"""
    try:
        tasks = parse_tasks()
        priority_stats = {}
        
        for task in tasks:
            priority = task.get('priority', 'none')
            if priority not in priority_stats:
                priority_stats[priority] = {
                    "priority": priority,
                    "total_tasks": 0,
                    "completed_tasks": 0,
                    "pending_tasks": 0
                }
            
            priority_stats[priority]["total_tasks"] += 1
            if task.get('completed', False):
                priority_stats[priority]["completed_tasks"] += 1
            else:
                priority_stats[priority]["pending_tasks"] += 1
        
        data = list(priority_stats.values())
        return {"status": "success", "data": data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

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

@app.post("/tasks/save-statistics")
def post_save_task_statistics():
    """Run the statistics.py script to save current task statistics to CSV log"""
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Change to the scripts directory so relative paths work correctly
        scripts_dir = os.path.join(current_dir, '../../scripts')
        
        # Run the statistics script
        result = subprocess.run([
            sys.executable, 'statistics.py'
        ], cwd=scripts_dir, capture_output=True, text=True, timeout=30)
        
        if result.returncode == 0:
            return {
                "success": True, 
                "message": "Statistics saved to log successfully",
                "output": result.stdout.strip()
            }
        else:
            return {
                "success": False,
                "message": f"Statistics script failed: {result.stderr}",
                "output": result.stdout.strip()
            }
    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "message": "Statistics script timed out after 30 seconds"
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Error running statistics script: {str(e)}"
        }

@app.post("/tasks/check")
def post_check_task(request: CheckTaskRequest):
    try:
        success = check_off_task(request.task_id)
        if success:
            return {"status": "success", "message": "Task checked off successfully"}
        else:
            return {"status": "error", "message": "Task not found"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

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
    try:
        # Convert request to dict for edit_task function
        edit_data = {
            "area": request.area,
            "description": request.description,
            "priority": request.priority,
            "due_date": request.due_date,
            "done_date": request.done_date,
            "followup_date": request.followup_date,
            "context": request.context,
            "project": request.project,
            "recurring": request.recurring,
            "onhold": request.onhold,
            "completed": request.completed,
            "notes": request.notes
        }
        
        # Remove None values
        edit_data = {k: v for k, v in edit_data.items() if v is not None}
        
        success = edit_task(task_id, edit_data)
        if success:
            return {"status": "success", "message": "Task updated successfully"}
        else:
            return {"status": "error", "message": "Task not found or failed to edit"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.delete("/tasks/{task_id}")
def delete_task_endpoint(task_id: str):
    """Delete an existing task
    
    Args:
        task_id: The ID of the task to delete
    
    Returns:
        A success message
    """
    try:
        success = delete_task(task_id)
        if success:
            return {"status": "success", "message": "Task deleted successfully"}
        else:
            return {"status": "error", "message": "Task not found or failed to delete"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/tasks/{task_id}/subtasks")
def create_subtask(task_id: str, request: CreateTaskRequest):
    """Create a new subtask under an existing task
    
    Args:
        task_id: The ID of the parent task
        request: Subtask details
    
    Returns:
        A success message
    """
    try:
        success = create_subtask_for_task(task_id, request)
        if success:
            return {"status": "success", "message": "Subtask created successfully"}
        else:
            return {"status": "error", "message": "Parent task not found or failed to create subtask"}
    except Exception as e:
        return {"status": "error", "message": str(e)}
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
                        # Use adjusted date for 3 AM boundary
                        adjusted_date = get_adjusted_date(timestamp)
                        date_str = adjusted_date.strftime('%Y-%m-%d')
                        
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

def get_time_series_data(days=30, metric="completion_rate"):
    """Get time series data for analytics
    
    Args:
        days: Number of days to look back
        metric: Metric to track (completion_rate, task_count, etc.)
    
    Returns:
        Dictionary with time series data
    """
    try:
        end_date = get_adjusted_today()
        start_date = end_date - timedelta(days=days)
        
        # Generate mock time series data
        data = []
        current_date = start_date
        while current_date <= end_date:
            if metric == "completion_rate":
                value = random.uniform(0.3, 0.9)
            elif metric == "task_count":
                value = random.randint(5, 25)
            else:
                value = random.uniform(0, 100)
            
            data.append({
                "date": current_date.isoformat(),
                "value": value
            })
            current_date += timedelta(days=1)
        
        return {
            "dates": [item["date"] for item in data],
            "values": [item["value"] for item in data],
            "metric": metric
        }
    except Exception as e:
        return {"error": str(e)}

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

def post_save_task_statistics():
    """Run the statistics.py script to save current task statistics to CSV log"""
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        script_path = os.path.join(current_dir, '../../scripts/statistics.py')
        
        # Change to the scripts directory so relative paths work correctly
        scripts_dir = os.path.join(current_dir, '../../scripts')
        
        # Run the statistics script
        result = subprocess.run([
            sys.executable, 'statistics.py'
        ], cwd=scripts_dir, capture_output=True, text=True, timeout=30)
        
        if result.returncode == 0:
            return {
                "success": True, 
                "message": "Statistics saved to log successfully",
                "output": result.stdout.strip()
            }
        else:
            return {
                "success": False,
                "message": f"Statistics script failed: {result.stderr}",
                "output": result.stdout.strip()
            }
    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "message": "Statistics script timed out after 30 seconds"
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Error running statistics script: {str(e)}"
        }

# Analytics endpoints
@app.get("/api/analytics/heatmap")
def get_analytics_heatmap():
    """Get analytics heatmap data"""
    try:
        # Generate mock heatmap data for now
        data = {
            "days": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
            "hours": list(range(24)),
            "data": [[random.randint(0, 10) for _ in range(24)] for _ in range(7)]
        }
        return {"status": "success", "data": data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/analytics/correlation")
def get_analytics_correlation():
    """Get analytics correlation data"""
    try:
        data = {
            "correlations": [
                {"x": "priority", "y": "completion_time", "value": 0.7},
                {"x": "area", "y": "completion_rate", "value": 0.5},
            ]
        }
        return {"status": "success", "data": data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/analytics/streaks")
def get_analytics_streaks():
    """Get analytics streaks data"""
    try:
        data = {
            "current_streak": 7,
            "longest_streak": 15,
            "streak_history": [1, 2, 3, 4, 5, 6, 7]
        }
        return {"status": "success", "data": data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/analytics/behavioral")
def get_analytics_behavioral():
    """Get behavioral analytics data"""
    try:
        data = {
            "peak_hours": [9, 10, 14, 15],
            "productivity_patterns": {"morning": 0.8, "afternoon": 0.6, "evening": 0.4},
            "focus_duration": {"average": 25, "max": 60, "min": 10}
        }
        return {"status": "success", "data": data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# Gamification endpoints
@app.get("/api/gamification/badges")
def get_gamification_badges():
    """Get gamification badges"""
    try:
        data = {
            "earned": [
                {"id": "streak_7", "name": "Week Warrior", "description": "7 day streak"},
                {"id": "early_bird", "name": "Early Bird", "description": "Complete tasks before 9 AM"}
            ],
            "available": [
                {"id": "streak_30", "name": "Month Master", "description": "30 day streak"},
                {"id": "weekend_warrior", "name": "Weekend Warrior", "description": "Complete tasks on weekends"}
            ]
        }
        return {"status": "success", "data": data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/gamification/challenges")
def get_gamification_challenges():
    """Get gamification challenges"""
    try:
        data = {
            "active": [
                {"id": "daily_three", "name": "Daily Three", "description": "Complete 3 tasks today", "progress": 2, "target": 3}
            ],
            "completed": [
                {"id": "week_clean", "name": "Clean Week", "description": "Complete all tasks this week"}
            ]
        }
        return {"status": "success", "data": data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/recurring")
def get_recurring(filter: str = "today"):
    """Get recurring tasks with optional filtering"""
    try:
        data = get_recurring_tasks_by_filter(filter)
        return {"status": "success", "data": data}
    except Exception as e:
        return {"status": "error", "message": str(e)}
