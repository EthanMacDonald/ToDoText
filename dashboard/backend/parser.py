import re
import uuid
from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional

import os

# Get the absolute path to the tasks.txt file
current_dir = os.path.dirname(os.path.abspath(__file__))
tasks_file = os.path.join(current_dir, '../../tasks.txt')
recurring_file = os.path.join(current_dir, '../../recurring_tasks.txt')

def get_adjusted_date(dt: datetime) -> date:
    """Get the adjusted date for 3 AM boundary (tasks completed before 3 AM count for previous day)"""
    if dt.hour < 3:
        return (dt - timedelta(days=1)).date()
    return dt.date()

def get_adjusted_today() -> date:
    """Get today's date adjusted for 3 AM boundary"""
    return get_adjusted_date(datetime.now())

def generate_stable_task_id(area, description, indent_level, line_number):
    """Generate a stable task ID based on task content and position"""
    import hashlib
    content = f"{area}:{description}:{indent_level}:{line_number}"
    return hashlib.md5(content.encode()).hexdigest()[:16]

def parse_tasks_raw() -> List[Dict[str, Any]]:
    """Parse tasks into raw nested structure"""
    tasks = []
    area = None
    task_stack = []  # Stack to track parent tasks at different indent levels
    
    with open(tasks_file, 'r') as f:
        for line_number, line in enumerate(f, 1):
            stripped = line.rstrip()
            if not stripped:
                continue
                
            area_match = re.match(r'^(\S.+):$', stripped)
            task_match = re.match(r'^(\s*)- \[( |x|%)\] (.+)', line)
            note_match = re.match(r'^(\s+)[^-\[].+', line)
            
            if area_match:
                area = area_match.group(1)
                # Add area header to structure
                tasks.append({
                    'type': 'area',
                    'area': area,
                    'content': stripped,
                    'tasks': []
                })
                task_stack = []  # Reset task stack for new area
                
            elif task_match:
                try:
                    indent, completed, content = task_match.groups()
                    indent_level = len(indent) // 4
                    
                    # Skip malformed content (like just "?")
                    if not content.strip() or content.strip() == '?':
                        print(f"Skipping malformed task on line {line_number}: {line.strip()}")
                        continue
                    
                    # Extract metadata from all sets of parentheses
                    all_meta = re.findall(r'\(([^)]*)\)', content)
                    metadata = {}
                    for meta_str in all_meta:
                        for pair in re.findall(r'(\w+:[^\s)]+)', meta_str):
                            key, value = pair.split(':', 1)
                            metadata[key] = value
                    
                    # Remove all metadata parentheses from content for display
                    content_no_meta = re.sub(r'\([^)]*\)', '', content).strip()
                    
                    # Parse dates safely
                    due_date = None
                    if metadata.get('due'):
                        try:
                            due_date = datetime.strptime(metadata['due'], '%Y-%m-%d').date()
                        except ValueError:
                            print(f"Invalid due date on line {line_number}: {metadata['due']}")
                    
                    done_date = None
                    if metadata.get('done'):
                        try:
                            done_date = datetime.strptime(metadata['done'], '%Y-%m-%d').date()
                        except ValueError:
                            print(f"Invalid done date on line {line_number}: {metadata['done']}")
                    elif metadata.get('done_date'):
                        try:
                            done_date = datetime.strptime(metadata['done_date'], '%Y-%m-%d').date()
                        except ValueError:
                            print(f"Invalid done_date on line {line_number}: {metadata['done_date']}")
                    
                    # Extract project and context tags
                    project_tags = list(dict.fromkeys(re.findall(r'\+(\w+)', content_no_meta)))
                    context_tags = list(dict.fromkeys(re.findall(r'@(\w+)', content_no_meta)))
                    
                    # Clean content by removing tags
                    clean_content = re.sub(r'([+@&]\w+)', '', content_no_meta).strip()
                    
                    # Determine task status
                    onhold_value = metadata.get('onhold', '')
                    is_onhold_active = False
                    
                    if onhold_value:
                        # Check if onhold is a date that has passed
                        try:
                            onhold_date = datetime.strptime(onhold_value, '%Y-%m-%d').date()
                            today = get_adjusted_today()
                            is_onhold_active = onhold_date > today
                        except ValueError:
                            # Not a date, treat as text condition - always active
                            is_onhold_active = True
                    
                    if completed == '%':
                        task_status = 'followup'
                        is_completed = False  # Follow-up tasks are not truly completed
                    elif completed == 'x':
                        if metadata.get('followup') or metadata.get('followup_date'):
                            task_status = 'followup'
                            is_completed = True  # Task is completed, but still needs follow-up
                        else:
                            task_status = 'done'
                            is_completed = True
                    elif metadata.get('followup') or metadata.get('followup_date'):
                        # Task has follow-up date but is not checked - it's in follow-up state
                        task_status = 'followup'
                        is_completed = False
                    elif is_onhold_active:
                        # Task is on hold (either future date or text condition)
                        task_status = 'onhold'
                        is_completed = False
                    else:
                        task_status = 'incomplete'
                        is_completed = False
                    
                    task = {
                        'id': generate_stable_task_id(area, clean_content, indent_level, line_number),
                        'type': 'task',
                        'description': clean_content,
                        'completed': is_completed,
                        'status': task_status,
                        'area': area,
                        'context': context_tags[0] if context_tags else '',
                        'project': project_tags[0] if project_tags else '',
                        'due_date': due_date.strftime('%Y-%m-%d') if due_date else '',
                        'done_date': done_date.strftime('%Y-%m-%d') if done_date else '',
                        'priority': metadata.get('priority', ''),
                        'recurring': metadata.get('every', ''),
                        'followup_date': metadata.get('followup_date', metadata.get('followup', '')),
                        'onhold_date': metadata.get('onhold', ''),
                        'indent_level': indent_level,
                        'subtasks': [],
                        'notes': [],
                        'due_date_obj': due_date,  # Keep for sorting
                        'done_date_obj': done_date,
                        'extra_projects': project_tags[1:] if len(project_tags) > 1 else [],
                        'extra_contexts': context_tags[1:] if len(context_tags) > 1 else [],
                        'metadata': metadata
                    }
                    
                    # Maintain task stack for proper nesting
                    # Remove tasks from stack that are at same or deeper level
                    while task_stack and task_stack[-1]['indent_level'] >= indent_level:
                        task_stack.pop()
                    
                    # If this is a subtask (indent > 1), add to parent
                    if indent_level > 1 and task_stack:
                        parent = task_stack[-1]
                        parent['subtasks'].append(task)
                    else:
                        # Top-level task (indent 0 or 1), add to current area or main tasks
                        if tasks and tasks[-1]['type'] == 'area':
                            tasks[-1]['tasks'].append(task)
                        else:
                            tasks.append(task)
                    
                    # Add to stack for potential children
                    task_stack.append(task)
                    
                except Exception as e:
                    print(f"Error parsing task on line {line_number}: {line.strip()} - {e}")
                    continue
                    
            elif note_match and task_stack:
                # Add note to the current task
                note = {
                    'type': 'note',
                    'content': stripped,
                    'indent': note_match.group(1)
                }
                task_stack[-1]['notes'].append(note)
    
    return tasks

def parse_tasks() -> List[Dict[str, Any]]:
    """Parse tasks and build nested structure with proper parent-child relationships"""
    raw_tasks = parse_tasks_raw()
    return build_sorted_structure(raw_tasks)

def build_sorted_structure(parsed_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Build a sorted structure that groups tasks by due date and maintains hierarchy"""
    # Extract all tasks from the parsed structure, including subtasks
    def extract_all_tasks(items):
        tasks = []
        for item in items:
            if item['type'] == 'area':
                tasks.extend(extract_all_tasks(item['tasks']))
            elif item['type'] == 'task':
                tasks.append(item)
                # Also extract subtasks
                if item.get('subtasks'):
                    tasks.extend(extract_all_tasks(item['subtasks']))
        return tasks
    
    all_tasks = extract_all_tasks(parsed_data)
    
    # Separate tasks by status: incomplete, onhold, follow-up, and completed
    incomplete_tasks = [t for t in all_tasks if t['status'] == 'incomplete']
    onhold_tasks = [t for t in all_tasks if t['status'] == 'onhold']
    followup_tasks = [t for t in all_tasks if t['status'] == 'followup']
    completed_tasks = [t for t in all_tasks if t['status'] == 'done']
    
    # Also include parent tasks that have completed subtasks in the Done group
    def find_completed_subtask_hierarchies(items):
        """Find all parent tasks that have completed subtasks and create copies with only completed subtasks"""
        hierarchies = []
        
        def has_completed_subtasks_recursively(task):
            """Check if task has any completed subtasks at any depth"""
            if task.get('subtasks'):
                for subtask in task['subtasks']:
                    if subtask['completed'] or has_completed_subtasks_recursively(subtask):
                        return True
            return False
        
        def create_completed_only_copy(task):
            """Create a copy of task containing only completed subtasks (recursively)"""
            import copy
            task_copy = copy.deepcopy(task)
            
            if task_copy.get('subtasks'):
                completed_subtasks = []
                for subtask in task_copy['subtasks']:
                    if subtask['completed']:
                        # Include the completed subtask
                        completed_subtasks.append(subtask)
                    elif has_completed_subtasks_recursively(subtask):
                        # Include incomplete subtask but filter its children
                        filtered_subtask = create_completed_only_copy(subtask)
                        if filtered_subtask['subtasks']:  # Only add if it has completed children
                            completed_subtasks.append(filtered_subtask)
                
                task_copy['subtasks'] = completed_subtasks
            
            return task_copy
        
        for item in items:
            if item['type'] == 'area':
                for task in item['tasks']:
                    if not task['completed'] and has_completed_subtasks_recursively(task):
                        filtered_task = create_completed_only_copy(task)
                        if filtered_task['subtasks']:  # Only add if it actually has completed subtasks
                            hierarchies.append(filtered_task)
            elif item['type'] == 'task' and not item['completed'] and has_completed_subtasks_recursively(item):
                filtered_task = create_completed_only_copy(item)
                if filtered_task['subtasks']:
                    hierarchies.append(filtered_task)
        
        return hierarchies
    
    parent_tasks_with_completed_subtasks = find_completed_subtask_hierarchies(parsed_data)
    
    # Find parent tasks that have onhold subtasks and create copies
    def find_onhold_subtask_hierarchies(items):
        """Find all parent tasks that have onhold subtasks and create copies with only onhold subtasks"""
        hierarchies = []
        
        def has_onhold_subtasks_recursively(task):
            """Check if task has any onhold subtasks at any depth"""
            if task.get('subtasks'):
                for subtask in task['subtasks']:
                    if subtask['status'] == 'onhold' or has_onhold_subtasks_recursively(subtask):
                        return True
            return False
        
        def create_onhold_only_copy(task):
            """Create a copy of task containing only onhold subtasks (recursively)"""
            import copy
            task_copy = copy.deepcopy(task)
            
            if task_copy.get('subtasks'):
                onhold_subtasks = []
                for subtask in task_copy['subtasks']:
                    if subtask['status'] == 'onhold':
                        # Include the onhold subtask
                        onhold_subtasks.append(subtask)
                    elif has_onhold_subtasks_recursively(subtask):
                        # Include incomplete subtask but filter its children
                        filtered_subtask = create_onhold_only_copy(subtask)
                        if filtered_subtask['subtasks']:  # Only add if it has onhold children
                            onhold_subtasks.append(filtered_subtask)
                
                task_copy['subtasks'] = onhold_subtasks
            
            return task_copy
        
        for item in items:
            if item['type'] == 'area':
                for task in item['tasks']:
                    if task['status'] != 'onhold' and has_onhold_subtasks_recursively(task):
                        filtered_task = create_onhold_only_copy(task)
                        if filtered_task['subtasks']:  # Only add if it actually has onhold subtasks
                            hierarchies.append(filtered_task)
            elif item['type'] == 'task' and task['status'] != 'onhold' and has_onhold_subtasks_recursively(item):
                filtered_task = create_onhold_only_copy(item)
                if filtered_task['subtasks']:
                    hierarchies.append(filtered_task)
        
        return hierarchies
    
    parent_tasks_with_onhold_subtasks = find_onhold_subtask_hierarchies(parsed_data)
    
    # Sort completed tasks by done date
    completed_tasks.sort(key=lambda x: x.get('done_date_obj') or date.max)
    
    # Group incomplete tasks by due date
    due_groups = {}
    no_due_tasks = []
    
    for task in incomplete_tasks:
        if task.get('due_date_obj'):
            due_str = task['due_date_obj'].strftime('%Y-%m-%d')
            if due_str not in due_groups:
                due_groups[due_str] = []
            due_groups[due_str].append(task)
        else:
            no_due_tasks.append(task)
    
    # Sort due date groups
    sorted_due_dates = sorted(due_groups.keys())
    
    # Build final structure
    result = []
    
    # Add due date groups first
    for due_date in sorted_due_dates:
        result.append({
            'type': 'group', 
            'title': due_date,
            'tasks': add_hierarchy_to_tasks(due_groups[due_date], include_completed_subtasks=False)
        })
     # Add no due date group
    if no_due_tasks:
        result.append({
            'type': 'group',
            'title': 'No Due Date',
            'tasks': add_hierarchy_to_tasks(no_due_tasks, include_completed_subtasks=False)
        })

    # Add on hold tasks group (sorted by onhold date, upcoming first)
    if onhold_tasks or parent_tasks_with_onhold_subtasks:
        # Combine onhold tasks and parent tasks with onhold subtasks
        all_onhold_tasks = onhold_tasks + parent_tasks_with_onhold_subtasks
        
        # Parse onhold dates and sort - prioritize upcoming dates over past ones
        def parse_onhold_date(task):
            onhold_str = task.get('onhold_date', '')
            if onhold_str:
                try:
                    onhold_date = datetime.strptime(onhold_str, '%Y-%m-%d').date()
                    today = date.today()
                    
                    # Prioritize upcoming dates: put them first, then past dates
                    if onhold_date >= today:
                        # Future/today dates: sort normally (earliest first)
                        return (0, onhold_date)
                    else:
                        # Past dates: sort by reverse date (most recent past first)
                        return (1, -onhold_date.toordinal())
                except ValueError:
                    pass
            return (2, 0)  # Put tasks with invalid dates at the end
        
        all_onhold_tasks.sort(key=parse_onhold_date)
        
        result.append({
            'type': 'group',
            'title': 'On Hold',
            'tasks': add_hierarchy_to_tasks(all_onhold_tasks, include_completed_subtasks=False, preserve_order=True, include_onhold_subtasks=True)
        })

    # Add follow-up tasks group (sorted by follow-up date, upcoming first)
    if followup_tasks:
        # Parse follow-up dates and sort - prioritize upcoming dates over past ones
        def parse_followup_date(task):
            followup_str = task.get('followup_date', '')
            if followup_str:
                try:
                    followup_date = datetime.strptime(followup_str, '%Y-%m-%d').date()
                    today = date.today()
                    
                    # Prioritize upcoming dates: put them first, then past dates
                    if followup_date >= today:
                        # Future/today dates: sort normally (earliest first)
                        return (0, followup_date)
                    else:
                        # Past dates: sort by reverse date (most recent past first)
                        return (1, -followup_date.toordinal())
                except ValueError:
                    pass
            return (2, 0)  # Put tasks with invalid dates at the end
        
        followup_tasks.sort(key=parse_followup_date)
        
        result.append({
            'type': 'group',
            'title': 'Follow-up Required',
            'tasks': add_hierarchy_to_tasks(followup_tasks, include_completed_subtasks=False, preserve_order=True)
        })
    
    # Add completed tasks group at the bottom
    if completed_tasks or parent_tasks_with_completed_subtasks:
        # Combine completed tasks and parent tasks with completed subtasks
        done_group_tasks = completed_tasks + parent_tasks_with_completed_subtasks
        result.append({
            'type': 'group',
            'title': 'Done',
            'tasks': add_hierarchy_to_tasks(done_group_tasks, include_completed_subtasks=True)
        })
    
    return result

def add_hierarchy_to_tasks(task_list: List[Dict[str, Any]], include_completed_subtasks: bool = False, preserve_order: bool = False, include_onhold_subtasks: bool = False) -> List[Dict[str, Any]]:
    """Add subtasks back to their parent tasks and return only top-level tasks"""
    # Find all top-level tasks (indent_level 0 or 1, since our top-level tasks are at level 1)
    top_level_tasks = [t for t in task_list if t['indent_level'] <= 1]
    
    # Create a deep copy of tasks to avoid modifying the original data
    import copy
    result_tasks = []
    
    def filter_subtasks_recursively(subtasks, include_completed):
        """Recursively filter subtasks based on completion status"""
        filtered = []
        for subtask in subtasks:
            # For active tasks, exclude onhold subtasks (they appear in onhold group)
            # For onhold group, include onhold subtasks
            if subtask['status'] == 'onhold' and not include_completed and not include_onhold_subtasks:
                continue  # Skip onhold subtasks in active task groups
            elif include_completed or not subtask['completed'] or (include_onhold_subtasks and subtask['status'] == 'onhold'):
                subtask_copy = copy.deepcopy(subtask)
                if subtask_copy.get('subtasks'):
                    subtask_copy['subtasks'] = filter_subtasks_recursively(subtask_copy['subtasks'], include_completed)
                filtered.append(subtask_copy)
        return filtered
    
    for task in top_level_tasks:
        task_copy = copy.deepcopy(task)
        
        if task_copy.get('subtasks'):
            task_copy['subtasks'] = filter_subtasks_recursively(task_copy['subtasks'], include_completed_subtasks)
        
        result_tasks.append(task_copy)
    
    # Sort by priority and content for consistent ordering (unless preserve_order is True)
    if not preserve_order:
        priority_order = {'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, '': 99}
        result_tasks.sort(key=lambda x: (
            priority_order.get(x.get('priority', ''), 99),
            x['description']
        ))
    
    return result_tasks

def parse_recurring_tasks() -> List[Dict[str, Any]]:
    """Parse recurring tasks with similar structure"""
    tasks = []
    area = None
    task_stack = []
    
    with open(recurring_file, 'r') as f:
        for line_number, line in enumerate(f, 1):
            stripped = line.rstrip()
            if not stripped:
                continue
                
            area_match = re.match(r'^(\S.+):$', stripped)
            task_match = re.match(r'^(\s*)- \[( |x)\] (.+)', line)
            
            if area_match:
                area = area_match.group(1)
                # Add area header to structure
                tasks.append({
                    'type': 'area',
                    'area': area,
                    'content': stripped,
                    'tasks': []
                })
                task_stack = []  # Reset task stack for new area
                
            elif task_match:
                try:
                    indent, completed, content = task_match.groups()
                    indent_level = len(indent) // 4
                    
                    # Skip malformed content
                    if not content.strip() or content.strip() == '?':
                        print(f"Skipping malformed recurring task on line {line_number}: {line.strip()}")
                        continue
                    
                    # Extract metadata
                    all_meta = re.findall(r'\(([^)]*)\)', content)
                    metadata = {}
                    for meta_str in all_meta:
                        for pair in re.findall(r'(\w+:[^\s)]+)', meta_str):
                            key, value = pair.split(':', 1)
                            metadata[key] = value
                    
                    content_no_meta = re.sub(r'\([^)]*\)', '', content).strip()
                    
                    # Extract tags
                    project_tags = list(dict.fromkeys(re.findall(r'\+(\w+)', content_no_meta)))
                    context_tags = list(dict.fromkeys(re.findall(r'@(\w+)', content_no_meta)))
                    clean_content = re.sub(r'([+@&]\w+)', '', content_no_meta).strip()
                    
                    task = {
                        'id': generate_stable_task_id(area, clean_content, indent_level, line_number),
                        'type': 'recurring_task',
                        'description': clean_content,
                        'completed': completed == 'x',
                        'area': area,
                        'context': context_tags[0] if context_tags else '',
                        'project': project_tags[0] if project_tags else '',
                        'due_date': '',  # Recurring tasks typically don't have due dates
                        'priority': metadata.get('priority', ''),
                        'recurring': metadata.get('every', ''),
                        'indent_level': indent_level,
                        'subtasks': [],
                        'notes': [],
                        'due_date_obj': None,
                        'done_date_obj': '',
                        'extra_projects': project_tags[1:] if len(project_tags) > 1 else [],
                        'extra_contexts': context_tags[1:] if len(context_tags) > 1 else [],
                        'metadata': metadata
                    }
                    
                    # Handle nesting
                    while task_stack and task_stack[-1]['indent_level'] >= indent_level:
                        task_stack.pop()
                    
                    if indent_level > 0 and task_stack:
                        task_stack[-1]['subtasks'].append(task)
                    else:
                        # Top-level task, add to current area or main tasks
                        if tasks and tasks[-1]['type'] == 'area':
                            tasks[-1]['tasks'].append(task)
                        else:
                            tasks.append(task)
                    
                    task_stack.append(task)
                    
                except Exception as e:
                    print(f"Error parsing recurring task on line {line_number}: {line.strip()} - {e}")
                    continue
    
    return tasks

def check_off_task(task_id: str) -> bool:
    """Check off a task - toggle its completion status in the file"""
    try:
        # First, parse all tasks to find the one with the matching ID
        raw_tasks = parse_tasks_raw()
        task_to_toggle = find_task_by_id(raw_tasks, task_id)
        
        if not task_to_toggle:
            print(f"Task with ID {task_id} not found")
            return False
            
        # Read the current file content
        with open(tasks_file, 'r') as f:
            lines = f.readlines()
        
        # Find and toggle the task
        success = toggle_task_in_lines(lines, task_to_toggle)
        
        if success:
            # Write the modified content back to the file
            with open(tasks_file, 'w') as f:
                f.writelines(lines)
            print(f"Successfully toggled task: {task_to_toggle['description']}")
            return True
        else:
            print(f"Failed to find task in file: {task_to_toggle['description']}")
            return False
            
    except Exception as e:
        print(f"Error toggling task {task_id}: {e}")
        return False

def check_off_recurring_task(task_id: str) -> bool:
    """Check off a recurring task - toggle its completion status in the file"""
    try:
        # First, parse all recurring tasks to find the one with the matching ID
        raw_tasks = parse_recurring_tasks()
        task_to_toggle = find_task_by_id(raw_tasks, task_id)
        
        if not task_to_toggle:
            print(f"Recurring task with ID {task_id} not found")
            return False
            
        # Read the current file content
        with open(recurring_file, 'r') as f:
            lines = f.readlines()
        
        # Find and toggle the task
        success = toggle_task_in_lines(lines, task_to_toggle)
        
        if success:
            # Write the modified content back to the file
            with open(recurring_file, 'w') as f:
                f.writelines(lines)
            print(f"Successfully toggled recurring task: {task_to_toggle['description']}")
            return True
        else:
            print(f"Failed to find recurring task in file: {task_to_toggle['description']}")
            return False
            
    except Exception as e:
        print(f"Error toggling recurring task {task_id}: {e}")
        return False

def find_task_by_id(tasks_structure, target_id):
    """Recursively find a task by its ID in the parsed structure"""
    def search_in_items(items):
        for item in items:
            if item.get('type') == 'task' and item.get('id') == target_id:
                return item
            elif item.get('type') == 'area' and item.get('tasks'):
                result = search_in_items(item['tasks'])
                if result:
                    return result
            elif item.get('subtasks'):
                result = search_in_items(item['subtasks'])
                if result:
                    return result
        return None
    
    return search_in_items(tasks_structure)

def toggle_task_in_lines(lines, task_info):
    """Find and toggle a task's completion status in the file lines"""
    # We need to find the task by matching its content and context
    area = task_info.get('area')
    description = task_info.get('description', '').strip()
    indent_level = task_info.get('indent_level', 0)
    
    # Calculate the expected indentation
    expected_indent = '    ' * indent_level  # 4 spaces per level
    
    # Look for the area first if this is a top-level task
    current_area = None
    in_correct_area = False
    
    for i, line in enumerate(lines):
        stripped = line.rstrip()
        
        # Track current area
        area_match = re.match(r'^(\S.+):$', stripped)
        if area_match:
            current_area = area_match.group(1)
            in_correct_area = (area is None or current_area == area)
            continue
            
        # Look for task lines
        task_match = re.match(r'^(\s*)- \[( |x|%)\] (.+)', line)
        if task_match and in_correct_area:
            indent, completed, content = task_match.groups()
            
            # Check if this is the right indentation level
            # Calculate indent level from actual indent (same logic as parser)
            actual_indent_level = len(indent) // 4
            if actual_indent_level != indent_level:
                continue
                
            # Remove metadata and tags from content for comparison
            content_no_meta = re.sub(r'\([^)]*\)', '', content).strip()
            clean_content = re.sub(r'([+@]\w+)', '', content_no_meta).strip()
            
            # Compare with the task description
            if clean_content == description:
                # Found the task! Handle toggle based on current status and follow-up metadata
                new_line = line  # Initialize new_line with current line
                
                # Check if task has follow-up metadata
                has_followup = 'followup:' in line or 'followup_date:' in line
                
                if completed == ' ':  # Unchecked task
                    # Mark as completed and add done date (regardless of follow-up status)
                    new_line = line.replace('[ ]', '[x]', 1)
                    
                    # If this task has follow-up metadata, remove it when completing
                    if has_followup:
                        # Remove follow-up metadata
                        def clean_followup_metadata(match):
                            content = match.group(1)
                            # Remove follow-up date but keep other metadata
                            content = re.sub(r'\s*followup:\d{4}-\d{2}-\d{2}\s*', ' ', content)
                            content = re.sub(r'\s*followup_date:\d{4}-\d{2}-\d{2}\s*', ' ', content)
                            content = re.sub(r'^\s+|\s+$', '', content)  # trim
                            content = re.sub(r'\s+', ' ', content)  # normalize spaces
                            if content.strip():
                                return f'({content})'
                            else:
                                return ''  # Remove empty parentheses
                        
                        new_line = re.sub(r'\(([^)]*)\)', clean_followup_metadata, new_line)
                        # Clean up any extra spaces that might be left
                        new_line = re.sub(r'\s+', ' ', new_line)
                    
                    # Add done date if not present (use adjusted date for 3 AM boundary)
                    done_date = get_adjusted_today().strftime('%Y-%m-%d')
                    if 'done:' not in new_line:
                        if re.search(r'\([^)]*\)', new_line):
                            # Add to existing metadata
                            new_line = re.sub(r'\(([^)]*)\)', rf'(\1 done:{done_date})', new_line, 1)
                            # Clean up double spaces
                            new_line = re.sub(r'\(\s+', '(', new_line)
                            new_line = re.sub(r'\s+\)', ')', new_line)
                            new_line = re.sub(r'\s+', ' ', new_line)
                        else:
                            # Add new metadata at the end before any tags
                            # Find the position right after ']' to preserve exact spacing
                            bracket_pos = new_line.find(']')
                            if bracket_pos != -1:
                                # Find the start of content (after the space(s) following ']')
                                content_start = bracket_pos + 1
                                while content_start < len(new_line) and new_line[content_start] == ' ':
                                    content_start += 1
                                
                                prefix = new_line[:content_start]  # Includes indentation, checkbox, and original spacing
                                content_part = new_line[content_start:].rstrip('\n')
                                
                                # Insert before the first tag or at the end
                                tag_match = re.search(r'([+@]\w+)', content_part)
                                if tag_match:
                                    insert_pos = tag_match.start()
                                    content_before = content_part[:insert_pos].rstrip()
                                    content_after = content_part[insert_pos:]
                                    new_content = f"{content_before} (done:{done_date}) {content_after}"
                                else:
                                    new_content = f"{content_part.rstrip()} (done:{done_date})"
                                
                                new_line = prefix + new_content
                            else:
                                # Fallback to original logic if ']' not found
                                content_part = new_line.split('] ', 1)[1] if '] ' in new_line else new_line
                                tag_match = re.search(r'([+@]\w+)', content_part)
                                if tag_match:
                                    insert_pos = tag_match.start()
                                    content_before = content_part[:insert_pos].rstrip()
                                    content_after = content_part[insert_pos:]
                                    new_content = f"{content_before} (done:{done_date}) {content_after}"
                                else:
                                    new_content = f"{content_part.rstrip()} (done:{done_date})"
                                
                                new_line = new_line.split('] ', 1)[0] + '] ' + new_content
                    
                    if not new_line.endswith('\n'):
                        new_line += '\n'
                            
                elif completed == 'x':  # Completed task
                    # Uncheck completed task and remove done date
                    new_line = line.replace('[x]', '[ ]', 1)
                    
                    # Remove done date metadata
                    def clean_metadata(match):
                        content = match.group(1)
                        # Remove done date but keep other metadata
                        content = re.sub(r'\s*done:\d{4}-\d{2}-\d{2}\s*', ' ', content)
                        content = re.sub(r'^\s+|\s+$', '', content)  # trim
                        content = re.sub(r'\s+', ' ', content)  # normalize spaces
                        if content.strip():
                            return f'({content})'
                        else:
                            return ''  # Remove empty parentheses
                    
                    new_line = re.sub(r'\(([^)]*)\)', clean_metadata, new_line)
                    # Clean up any extra spaces that might be left
                    new_line = re.sub(r'\s+', ' ', new_line)
                    if not new_line.endswith('\n'):
                        new_line += '\n'
                        
                elif completed == '%':  # Follow-up task (legacy)
                    # Convert legacy follow-up format to unchecked with follow-up metadata
                    new_line = line.replace('[%]', '[ ]', 1)
                    if not new_line.endswith('\n'):
                        new_line += '\n'
                
                lines[i] = new_line
                return True
    
    return False

def extract_context(content: str) -> str:
    """Legacy function for backward compatibility"""
    match = re.search(r'(@\w+)', content)
    return match.group(1) if match else ''

def extract_project(content: str) -> str:
    """Legacy function for backward compatibility"""
    match = re.search(r'(\+\w+)', content)
    return match.group(1) if match else ''

def extract_due(content: str) -> str:
    """Legacy function for backward compatibility"""
    match = re.search(r'due:(\d{4}-\d{2}-\d{2})', content)
    return match.group(1) if match else ''

def extract_priority(content: str) -> str:
    """Legacy function for backward compatibility"""
    match = re.search(r'priority:([A-F])', content)
    return match.group(1) if match else ''

def extract_recurring(content: str) -> str:
    """Legacy function for backward compatibility"""
    match = re.search(r'every:(\w+)', content)
    return match.group(1) if match else ''

def parse_tasks_by_priority() -> List[Dict[str, Any]]:
    """Parse tasks and build structure sorted by priority"""
    raw_tasks = parse_tasks_raw()
    return build_priority_sorted_structure(raw_tasks)

def parse_tasks_no_sort() -> List[Dict[str, Any]]:
    """Parse tasks and build structure with no sorting (grouped by area)"""
    raw_tasks = parse_tasks_raw()
    return build_area_sorted_structure(raw_tasks)

def build_priority_sorted_structure(parsed_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Build a structure grouped by priority"""
    # Extract all tasks from the parsed structure, including subtasks
    def extract_all_tasks(items):
        tasks = []
        for item in items:
            if item['type'] == 'area':
                tasks.extend(extract_all_tasks(item['tasks']))
            elif item['type'] == 'task':
                tasks.append(item)
                # Also extract subtasks
                if item.get('subtasks'):
                    tasks.extend(extract_all_tasks(item['subtasks']))
        return tasks
    
    all_tasks = extract_all_tasks(parsed_data)
    
    # Separate tasks by status: incomplete, follow-up, and completed  
    incomplete_tasks = [t for t in all_tasks if not t.get('followup_date') and not t['completed']]
    followup_tasks = [t for t in all_tasks if t.get('followup_date')]  # Any task with follow-up date
    completed_tasks = [t for t in all_tasks if t['completed'] and not t.get('followup_date')]  # Only truly completed tasks
    
    # Also include parent tasks that have completed subtasks in the Done group
    def find_completed_subtask_hierarchies_priority(items):
        """Find all parent tasks that have completed subtasks and create copies with only completed subtasks"""
        hierarchies = []
        
        def has_completed_subtasks_recursively(task):
            """Check if task has any completed subtasks at any depth"""
            if task.get('subtasks'):
                for subtask in task['subtasks']:
                    if subtask['completed'] or has_completed_subtasks_recursively(subtask):
                        return True
            return False
        
        def create_completed_only_copy(task):
            """Create a copy of task containing only completed subtasks (recursively)"""
            import copy
            task_copy = copy.deepcopy(task)
            
            if task_copy.get('subtasks'):
                completed_subtasks = []
                for subtask in task_copy['subtasks']:
                    if subtask['completed']:
                        # Include the completed subtask
                        completed_subtasks.append(subtask)
                    elif has_completed_subtasks_recursively(subtask):
                        # Include incomplete subtask but filter its children
                        filtered_subtask = create_completed_only_copy(subtask)
                        if filtered_subtask['subtasks']:  # Only add if it has completed children
                            completed_subtasks.append(filtered_subtask)
                
                task_copy['subtasks'] = completed_subtasks
            
            return task_copy
        
        for item in items:
            if item['type'] == 'area':
                for task in item['tasks']:
                    if not task['completed'] and has_completed_subtasks_recursively(task):
                        filtered_task = create_completed_only_copy(task)
                        if filtered_task['subtasks']:  # Only add if it actually has completed subtasks
                            hierarchies.append(filtered_task)
            elif item['type'] == 'task' and not item['completed'] and has_completed_subtasks_recursively(item):
                filtered_task = create_completed_only_copy(item)
                if filtered_task['subtasks']:
                    hierarchies.append(filtered_task)
        
        return hierarchies
    
    parent_tasks_with_completed_subtasks = find_completed_subtask_hierarchies_priority(parsed_data)
    
    # Sort completed tasks by priority
    priority_order = {'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6}
    completed_tasks.sort(key=lambda x: (
        priority_order.get(x.get('priority', ''), 99),
        x['description']
    ))
    
    # Group incomplete tasks by priority
    priority_groups = {}
    no_priority_tasks = []
    
    for task in incomplete_tasks:
        priority = task.get('priority', '')
        if priority:
            if priority not in priority_groups:
                priority_groups[priority] = []
            priority_groups[priority].append(task)
        else:
            no_priority_tasks.append(task)
    
    # Sort priority groups
    sorted_priorities = sorted(priority_groups.keys(), key=lambda x: priority_order.get(x, 99))
    
    # Build final structure
    result = []
    
    # Add priority groups first
    for priority in sorted_priorities:
        result.append({
            'type': 'group', 
            'title': f'Priority {priority}',
            'tasks': add_hierarchy_to_tasks(priority_groups[priority], include_completed_subtasks=False)
        })
    
    # Add no priority group
    if no_priority_tasks:
        result.append({
            'type': 'group',
            'title': 'No Priority',
            'tasks': add_hierarchy_to_tasks(no_priority_tasks, include_completed_subtasks=False)
        })
    
    # Add follow-up tasks group (sorted by follow-up date, upcoming first)
    if followup_tasks:
        # Parse follow-up dates and sort - prioritize upcoming dates over past ones
        def parse_followup_date(task):
            followup_str = task.get('followup_date', '')
            if followup_str:
                try:
                    followup_date = datetime.strptime(followup_str, '%Y-%m-%d').date()
                    today = date.today()
                    
                    # Prioritize upcoming dates: put them first, then past dates
                    if followup_date >= today:
                        # Future/today dates: sort normally (earliest first)
                        return (0, followup_date)
                    else:
                        # Past dates: sort by reverse date (most recent past first)
                        return (1, -followup_date.toordinal())
                except ValueError:
                    pass
            return (2, 0)  # Put tasks with invalid dates at the end
        
        followup_tasks.sort(key=parse_followup_date)
        
        result.append({
            'type': 'group',
            'title': 'Follow-up Required',
            'tasks': add_hierarchy_to_tasks(followup_tasks, include_completed_subtasks=False, preserve_order=True)
        })
    
    # Add completed tasks group at the bottom
    if completed_tasks or parent_tasks_with_completed_subtasks:
        # Combine completed tasks and parent tasks with completed subtasks
        done_group_tasks = completed_tasks + parent_tasks_with_completed_subtasks
        result.append({
            'type': 'group',
            'title': 'Done',
            'tasks': add_hierarchy_to_tasks(done_group_tasks, include_completed_subtasks=True)
        })
    
    return result

def build_area_sorted_structure(parsed_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Build a structure grouped by area (no additional sorting)"""
    result = []
    
    for item in parsed_data:
        if item['type'] == 'area' and item['tasks']:
            # Sort tasks within area by priority for consistency
            sorted_tasks = add_hierarchy_to_tasks(item['tasks'])
            
            result.append({
                'type': 'group',
                'title': item['area'],
                'tasks': sorted_tasks
            })
    
    return result

def create_task(task_request) -> bool:
    """Create a new task and add it to the tasks.txt file"""
    try:
        # Build the task line
        task_line = f"    - [ ] {task_request.description}"
        
        # Build metadata string
        metadata_parts = []
        if task_request.priority:
            metadata_parts.append(f"priority:{task_request.priority}")
        if task_request.due_date:
            metadata_parts.append(f"due:{task_request.due_date}")
        if task_request.recurring:
            metadata_parts.append(f"every:{task_request.recurring}")
        
        if metadata_parts:
            task_line += f" ({' '.join(metadata_parts)})"
        
        # Add context and project tags
        if task_request.project:
            task_line += f" +{task_request.project}"
        if task_request.context:
            task_line += f" @{task_request.context}"
        
        task_line += "\n"
        
        # Read the current file
        with open(tasks_file, 'r') as f:
            lines = f.readlines()
        
        # Find the correct area and insert the task
        area_found = False
        insert_index = -1
        
        for i, line in enumerate(lines):
            stripped = line.rstrip()
            # Check if this line is the target area
            if stripped == f"{task_request.area}:":
                area_found = True
                # Find the end of this area (next area or end of file)
                for j in range(i + 1, len(lines)):
                    next_stripped = lines[j].rstrip()
                    # If we hit another area (line ending with ':' and not indented)
                    if next_stripped and not next_stripped.startswith(' ') and next_stripped.endswith(':'):
                        insert_index = j
                        break
                else:
                    # No next area found, insert at end
                    insert_index = len(lines)
                break
        
        if not area_found:
            # Area doesn't exist, create it at the end
            if lines and not lines[-1].endswith('\n'):
                lines.append('\n')
            lines.append(f"\n{task_request.area}:\n")
            lines.append(task_line)
            insert_index = len(lines) - 1  # Set insert_index for notes
        else:
            # Insert the task in the found area
            lines.insert(insert_index, task_line)
        
        # Add notes if provided
        if hasattr(task_request, 'notes') and task_request.notes:
            for note in task_request.notes:
                if note.strip():  # Only add non-empty notes
                    note_line = f"        {note.strip()}\n"
                    insert_index += 1
                    lines.insert(insert_index, note_line)
        
        # Write back to file
        with open(tasks_file, 'w') as f:
            f.writelines(lines)
        
        print(f"Successfully created task: {task_request.description} in area: {task_request.area}")
        return True
        
    except Exception as e:
        print(f"Error creating task: {e}")
        return False

def edit_task(task_request) -> bool:
    """Edit an existing task in the tasks.txt file"""
    try:
        # Read the current file
        with open(tasks_file, 'r') as f:
            lines = f.readlines()
        
        # Find the task by ID
        task_found = False
        current_area = None
        
        for i, line in enumerate(lines):
            stripped = line.rstrip()
            
            # Track current area
            area_match = re.match(r'^(\S.+):$', stripped)
            if area_match:
                current_area = area_match.group(1)
                continue
            
            # Check if this is a task line
            task_match = re.match(r'^(\s*)- \[( |x)\] (.+)', line)
            if task_match:
                indent, completed, content = task_match.groups()
                indent_level = len(indent) // 4
                
                # Extract metadata and clean content to generate ID
                all_meta = re.findall(r'\(([^)]*)\)', content)
                content_no_meta = re.sub(r'\([^)]*\)', '', content).strip()
                project_tags = list(dict.fromkeys(re.findall(r'\+(\w+)', content_no_meta)))
                context_tags = list(dict.fromkeys(re.findall(r'@(\w+)', content_no_meta)))
                clean_content = re.sub(r'([+@]\w+)', '', content_no_meta).strip()
                
                # Generate ID to match
                task_id = generate_stable_task_id(current_area, clean_content, indent_level, i + 1)
                
                if task_id == task_request.task_id:
                    task_found = True
                    
                    # Build the new task line
                    new_task_line = f"{indent}- [{'x' if task_request.completed else ' '}] {task_request.description}"
                    
                    # Build metadata string
                    metadata_parts = []
                    if task_request.priority:
                        metadata_parts.append(f"priority:{task_request.priority}")
                    if task_request.due_date:
                        metadata_parts.append(f"due:{task_request.due_date}")
                    if task_request.done_date:
                        metadata_parts.append(f"done:{task_request.done_date}")
                    if task_request.followup_date:
                        metadata_parts.append(f"followup:{task_request.followup_date}")
                    if task_request.recurring:
                        metadata_parts.append(f"every:{task_request.recurring}")
                    
                    if metadata_parts:
                        new_task_line += f" ({' '.join(metadata_parts)})"
                    
                    # Add context and project tags
                    if task_request.project:
                        new_task_line += f" +{task_request.project}"
                    if task_request.context:
                        new_task_line += f" @{task_request.context}"
                    
                    new_task_line += "\n"
                    
                    # Handle area change if needed
                    if task_request.area != current_area:
                        # Remove from current location
                        lines.pop(i)
                        
                        # Find the new area and insert there
                        area_found = False
                        insert_index = -1
                        
                        for j, area_line in enumerate(lines):
                            area_stripped = area_line.rstrip()
                            if area_stripped == f"{task_request.area}:":
                                area_found = True
                                # Find the end of this area
                                for k in range(j + 1, len(lines)):
                                    next_stripped = lines[k].rstrip()
                                    if next_stripped and not next_stripped.startswith(' ') and next_stripped.endswith(':'):
                                        insert_index = k
                                        break
                                else:
                                    insert_index = len(lines)
                                break
                        
                        if not area_found:
                            # Area doesn't exist, create it
                            if lines and not lines[-1].endswith('\n'):
                                lines.append('\n')
                            lines.append(f"\n{task_request.area}:\n")
                            lines.append(new_task_line)
                        else:
                            # Insert with proper indentation (4 spaces for top-level task)
                            if not new_task_line.startswith('    '):
                                new_task_line = '    ' + new_task_line.lstrip()
                            lines.insert(insert_index, new_task_line)
                    else:
                        # Same area, just replace the line and handle notes
                        lines[i] = new_task_line
                        
                        # Remove existing notes for this task (lines that follow with more indentation)
                        notes_to_remove = []
                        j = i + 1
                        while j < len(lines):
                            next_line = lines[j]
                            # If next line has more indentation and is not a subtask, it's likely a note
                            if next_line.startswith('        ') and not re.match(r'^\s*- \[[ x%]\]', next_line):
                                notes_to_remove.append(j)
                                j += 1
                            else:
                                break
                        
                        # Remove notes in reverse order to maintain indices
                        for note_idx in reversed(notes_to_remove):
                            lines.pop(note_idx)
                        
                        # Add new notes if provided
                        if hasattr(task_request, 'notes') and task_request.notes:
                            insert_pos = i + 1
                            for note in task_request.notes:
                                if note.strip():  # Only add non-empty notes
                                    note_line = f"        {note.strip()}\n"
                                    lines.insert(insert_pos, note_line)
                                    insert_pos += 1
                    
                    break
        
        if not task_found:
            print(f"Task with ID {task_request.task_id} not found")
            return False
        
        # Write back to file
        with open(tasks_file, 'w') as f:
            f.writelines(lines)
        
        print(f"Successfully edited task: {task_request.description}")
        return True
        
    except Exception as e:
        print(f"Error editing task: {e}")
        import traceback
        traceback.print_exc()
        return False

def mark_task_for_followup(task_id: str, followup_date: str) -> bool:
    """Mark a completed task for follow-up - converts [x] to [%] and adds followup metadata"""
    try:
        # First, parse all tasks to find the one with the matching ID
        raw_tasks = parse_tasks_raw()
        task_to_modify = find_task_by_id(raw_tasks, task_id)
        
        if not task_to_modify:
            print(f"Task with ID {task_id} not found")
            return False
        
        # Check if task is currently completed ([x])
        if task_to_modify.get('status') != 'done':
            print(f"Task {task_id} is not completed, cannot mark for follow-up")
            return False
            
        # Read the current file content
        with open(tasks_file, 'r') as f:
            lines = f.readlines()
        
        # Find and modify the task
        success = mark_followup_in_lines(lines, task_to_modify, followup_date)
        
        if success:
            # Write the modified content back to the file
            with open(tasks_file, 'w') as f:
                f.writelines(lines)
            print(f"Successfully marked task for follow-up: {task_to_modify['description']}")
            return True
        else:
            print(f"Failed to find task in file: {task_to_modify['description']}")
            return False
            
    except Exception as e:
        print(f"Error marking task {task_id} for follow-up: {e}")
        return False

def verify_followup_task(task_id: str) -> bool:
    """Verify follow-up completion - converts [%] to [x] and removes followup metadata"""
    try:
        # First, parse all tasks to find the one with the matching ID
        raw_tasks = parse_tasks_raw()
        task_to_modify = find_task_by_id(raw_tasks, task_id)
        
        if not task_to_modify:
            print(f"Task with ID {task_id} not found")
            return False
        
        # Check if task is currently in follow-up status
        if task_to_modify.get('status') != 'followup':
            print(f"Task {task_id} is not in follow-up status, cannot verify")
            return False
            
        # Read the current file content
        with open(tasks_file, 'r') as f:
            lines = f.readlines()
        
        # Find and modify the task
        success = verify_followup_in_lines(lines, task_to_modify)
        
        if success:
            # Write the modified content back to the file
            with open(tasks_file, 'w') as f:
                f.writelines(lines)
            print(f"Successfully verified follow-up for task: {task_to_modify['description']}")
            return True
        else:
            print(f"Failed to find task in file: {task_to_modify['description']}")
            return False
            
    except Exception as e:
        print(f"Error verifying follow-up for task {task_id}: {e}")
        return False

def mark_followup_in_lines(lines, task_info, followup_date):
    """Find and mark a task for follow-up in the file lines"""
    area = task_info.get('area')
    description = task_info.get('description', '').strip()
    indent_level = task_info.get('indent_level', 0)
    
    # Calculate the expected indentation
    expected_indent = '    ' * indent_level  # 4 spaces per level
    
    # Look for the area first if this is a top-level task
    current_area = None
    in_correct_area = False
    
    for i, line in enumerate(lines):
        stripped = line.rstrip()
        
        # Track current area
        area_match = re.match(r'^(\S.+):$', stripped)
        if area_match:
            current_area = area_match.group(1)
            in_correct_area = (area is None or current_area == area)
            continue
            
        # Look for task lines
        task_match = re.match(r'^(\s*)- \[x\] (.+)', line)
        if task_match and in_correct_area:
            indent, content = task_match.groups()
            
            # Check if this is the right indentation level
            if len(indent) != len(expected_indent):
                continue
                
            # Remove metadata and tags from content for comparison
            content_no_meta = re.sub(r'\([^)]*\)', '', content).strip()
            clean_content = re.sub(r'([+@]\w+)', '', content_no_meta).strip()
            
            # Compare with the task description
            if clean_content == description:
                # Found the task! Convert [x] to [%] and add followup metadata
                new_line = line.replace('[x]', '[%]', 1)
                
                # Add followup date metadata
                if re.search(r'\([^)]*\)', new_line):
                    # Add to existing metadata
                    new_line = re.sub(r'\(([^)]*)\)', rf'(\1 followup:{followup_date})', new_line, 1)
                else:
                    # Add new metadata at the end before any tags
                    content_part = new_line.split('] ', 1)[1] if '] ' in new_line else new_line
                    # Insert before the first tag or at the end
                    tag_match = re.search(r'([+@]\w+)', content_part)
                    if tag_match:
                        insert_pos = tag_match.start()
                        content_before = content_part[:insert_pos].rstrip()
                        content_after = content_part[insert_pos:]
                        new_content = f"{content_before} (followup:{followup_date}) {content_after}"
                    else:
                        new_content = f"{content_part.rstrip()} (followup:{followup_date})"
                    
                    new_line = new_line.split('] ', 1)[0] + '] ' + new_content
                    if not new_line.endswith('\n'):
                        new_line += '\n'
                
                lines[i] = new_line
                return True
    
    return False

def verify_followup_in_lines(lines, task_info):
    """Find and verify follow-up for a task in the file lines"""
    area = task_info.get('area')
    description = task_info.get('description', '').strip()
    indent_level = task_info.get('indent_level', 0)
    
    # Calculate the expected indentation
    expected_indent = '    ' * indent_level  # 4 spaces per level
    
    # Look for the area first if this is a top-level task
    current_area = None
    in_correct_area = False
    
    for i, line in enumerate(lines):
        stripped = line.rstrip()
        
        # Track current area
        area_match = re.match(r'^(\S.+):$', stripped)
        if area_match:
            current_area = area_match.group(1)
            in_correct_area = (area is None or current_area == area)
            continue
            
        # Look for task lines with [%] status
        task_match = re.match(r'^(\s*)- \[%\] (.+)', line)
        if task_match and in_correct_area:
            indent, content = task_match.groups()
            
            # Check if this is the right indentation level
            if len(indent) != len(expected_indent):
                continue
                
            # Remove metadata and tags from content for comparison
            content_no_meta = re.sub(r'\([^)]*\)', '', content).strip()
            clean_content = re.sub(r'([+@]\w+)', '', content_no_meta).strip()
            
            # Compare with the task description
            if clean_content == description:
                # Found the task! Convert [%] to [x] and remove followup metadata
                new_line = line.replace('[%]', '[x]', 1)
                
                # Remove followup date from metadata
                def clean_metadata(match):
                    content = match.group(1)
                    # Remove followup date and clean up
                    content = re.sub(r'\s*followup:\d{4}-\d{2}-\d{2}\s*', ' ', content)
                    content = re.sub(r'^\s+|\s+$', '', content)  # trim
                    content = re.sub(r'\s+', ' ', content)  # normalize spaces
                    if content.strip():
                        return f'({content})'
                    else:
                        return ''  # Remove empty parentheses
                
                new_line = re.sub(r'\(([^)]*followup:[^)]*)\)', clean_metadata, new_line)
                # Clean up any extra spaces that might be left
                new_line = re.sub(r'\s+', ' ', new_line)
                if not new_line.endswith('\n'):
                    new_line += '\n'
                
                lines[i] = new_line
                return True
    
    return False

def delete_task(task_id: str) -> bool:
    """Delete a task and all its subtasks and notes from the tasks.txt file"""
    try:
        # Read the current file
        with open(tasks_file, 'r') as f:
            lines = f.readlines()
        
        # Find the task by ID
        task_found = False
        current_area = None
        lines_to_remove = []
        
        for i, line in enumerate(lines):
            stripped = line.rstrip()
            
            # Track current area
            area_match = re.match(r'^(\S.+):$', stripped)
            if area_match:
                current_area = area_match.group(1)
                continue
            
            # Check if this is a task line
            task_match = re.match(r'^(\s*)- \[( |x|%)\] (.+)', line)
            if task_match:
                indent, completed, content = task_match.groups()
                indent_level = len(indent) // 4
                
                # Extract metadata and clean content to generate ID
                all_meta = re.findall(r'\(([^)]*)\)', content)
                content_no_meta = re.sub(r'\([^)]*\)', '', content).strip()
                project_tags = list(dict.fromkeys(re.findall(r'\+(\w+)', content_no_meta)))
                context_tags = list(dict.fromkeys(re.findall(r'@(\w+)', content_no_meta)))
                clean_content = re.sub(r'([+@]\w+)', '', content_no_meta).strip()
                
                # Generate ID to match
                test_task_id = generate_stable_task_id(current_area, clean_content, indent_level, i + 1)
                
                if test_task_id == task_id:
                    task_found = True
                    lines_to_remove.append(i)
                    
                    # Find and mark all notes and subtasks for deletion
                    j = i + 1
                    while j < len(lines):
                        next_line = lines[j]
                        next_stripped = next_line.rstrip()
                        
                        # If it's an area header, stop
                        if next_stripped and not next_stripped.startswith(' ') and next_stripped.endswith(':'):
                            break
                        
                        # If it's a task at the same or higher level, stop
                        if next_stripped.startswith('    - ['):
                            next_task_match = re.match(r'^(\s*)- \[', next_line)
                            if next_task_match:
                                next_indent_level = len(next_task_match.group(1)) // 4
                                if next_indent_level <= indent_level:
                                    break
                        
                        # If it's indented more than the task, it's a subtask or note - mark for deletion
                        if next_line.startswith(' ' * ((indent_level + 1) * 4)):
                            lines_to_remove.append(j)
                        elif next_stripped == '':
                            # Empty line - check if next line is still part of this task's content
                            if j + 1 < len(lines) and lines[j + 1].startswith(' ' * ((indent_level + 1) * 4)):
                                lines_to_remove.append(j)
                            else:
                                break
                        else:
                            break
                        
                        j += 1
                    
                    break
        
        if not task_found:
            print(f"Task with ID {task_id} not found")
            return False
        
        # Remove lines in reverse order to maintain indices
        for line_idx in reversed(sorted(lines_to_remove)):
            lines.pop(line_idx)
        
        # Write back to file
        with open(tasks_file, 'w') as f:
            f.writelines(lines)
        
        print(f"Successfully deleted task with ID: {task_id}")
        return True
        
    except Exception as e:
        print(f"Error deleting task: {e}")
        import traceback
        traceback.print_exc()
        return False

def create_subtask_for_task(parent_task_id: str, subtask_request) -> bool:
    """Create a new subtask under an existing task"""
    try:
        # Read the current file
        with open(tasks_file, 'r') as f:
            lines = f.readlines()
        
        # Find the parent task by ID
        parent_found = False
        current_area = None
        
        for i, line in enumerate(lines):
            stripped = line.rstrip()
            
            # Track current area
            area_match = re.match(r'^(\S.+):$', stripped)
            if area_match:
                current_area = area_match.group(1)
                continue
            
            # Check if this is a task line
            task_match = re.match(r'^(\s*)- \[( |x|%)\] (.+)', line)
            if task_match:
                indent, completed, content = task_match.groups()
                indent_level = len(indent) // 4
                
                # Extract metadata and clean content to generate ID
                all_meta = re.findall(r'\(([^)]*)\)', content)
                content_no_meta = re.sub(r'\([^)]*\)', '', content).strip()
                project_tags = list(dict.fromkeys(re.findall(r'\+(\w+)', content_no_meta)))
                context_tags = list(dict.fromkeys(re.findall(r'@(\w+)', content_no_meta)))
                clean_content = re.sub(r'([+@]\w+)', '', content_no_meta).strip()
                
                # Generate ID to match
                test_task_id = generate_stable_task_id(current_area, clean_content, indent_level, i + 1)
                
                if test_task_id == parent_task_id:
                    parent_found = True
                    
                    # Build the subtask line with one more level of indentation
                    subtask_indent = '    ' * (indent_level + 1)
                    subtask_line = f"{subtask_indent}- [ ] {subtask_request.description}"
                    
                    # Build metadata string
                    metadata_parts = []
                    if subtask_request.priority:
                        metadata_parts.append(f"priority:{subtask_request.priority}")
                    if subtask_request.due_date:
                        metadata_parts.append(f"due:{subtask_request.due_date}")
                    if subtask_request.recurring:
                        metadata_parts.append(f"every:{subtask_request.recurring}")
                    
                    if metadata_parts:
                        subtask_line += f" ({' '.join(metadata_parts)})"
                    
                    # Add context and project tags
                    if subtask_request.project:
                        subtask_line += f" +{subtask_request.project}"
                    if subtask_request.context:
                        subtask_line += f" @{subtask_request.context}"
                    
                    subtask_line += "\n"
                    
                    # Find the end of this task's content (after notes and existing subtasks)
                    insert_index = i + 1
                    while insert_index < len(lines):
                        next_line = lines[insert_index]
                        next_stripped = next_line.rstrip()
                        
                        # If it's an area header, stop
                        if next_stripped and not next_stripped.startswith(' ') and next_stripped.endswith(':'):
                            break
                        
                        # If it's a task at the same or higher level, stop
                        if next_stripped.startswith('    - ['):
                            next_task_match = re.match(r'^(\s*)- \[', next_line)
                            if next_task_match:
                                next_indent_level = len(next_task_match.group(1)) // 4
                                if next_indent_level <= indent_level:
                                    break
                        
                        # If it's still part of this task's content, continue
                        if next_line.startswith(' ' * ((indent_level + 1) * 4)) or next_stripped == '':
                            insert_index += 1
                        else:
                            break
                    
                    # Insert the subtask
                    lines.insert(insert_index, subtask_line)
                    
                    # Add notes if provided
                    if hasattr(subtask_request, 'notes') and subtask_request.notes:
                        for note in subtask_request.notes:
                            if note.strip():  # Only add non-empty notes
                                note_line = f"{subtask_indent}    {note.strip()}\n"
                                insert_index += 1
                                lines.insert(insert_index, note_line)
                    
                    break
        
        if not parent_found:
            print(f"Parent task with ID {parent_task_id} not found")
            return False
        
        # Write back to file
        with open(tasks_file, 'w') as f:
            f.writelines(lines)
        
        print(f"Successfully created subtask: {subtask_request.description} under parent: {parent_task_id}")
        return True
        
    except Exception as e:
        print(f"Error creating subtask: {e}")
        import traceback
        traceback.print_exc()
        return False
