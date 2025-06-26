from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from pydantic import BaseModel
from parser import parse_tasks, parse_recurring_tasks, check_off_task, check_off_recurring_task, parse_tasks_by_priority, parse_tasks_no_sort, create_task, edit_task
import re
import datetime
from datetime import datetime, timedelta, date
from collections import Counter, defaultdict
import os

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
      - Daily tasks: Hide for that day only
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
                    # Only add +Area to top-level tasks (4 spaces indent), not subtasks
                    indent_match = re.match(r'^(\s*)- \[', task_line)
                    if indent_match and len(indent_match.group(1)) == 4:
                        archive_entry.append(f'{task_line} +{area}\n')
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
    """Compute statistics from the tasks"""
    # Read tasks file
    current_dir = os.path.dirname(os.path.abspath(__file__))
    tasks_file = os.path.join(current_dir, '../../tasks.txt')
    
    tasks = []
    with open(tasks_file, 'r') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#') or line.endswith(':'):
                continue
            task = {'raw': line}
            # Check for completed tasks
            task['completed'] = line.lower().startswith('- [x]')
            
            # Extract due dates
            due_match = re.search(r'due:(\d{4}-\d{2}-\d{2})', line)
            task['due'] = (
                datetime.strptime(due_match.group(1), '%Y-%m-%d').date()
                if due_match else None
            )
            
            # Extract priority
            prio_match = re.search(r'\b([A-Z])\b', line)
            task['priority'] = prio_match.group(1) if prio_match else None
            
            # Extract projects (+project)
            task['projects'] = re.findall(r'\+\w+', line)
            
            # Extract contexts (@context)
            task['contexts'] = re.findall(r'@\w+', line)
            
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
