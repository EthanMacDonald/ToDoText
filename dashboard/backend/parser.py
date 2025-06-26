import re
import uuid
from datetime import datetime, date
from typing import List, Dict, Any, Optional

tasks_file = '../../tasks.txt'
recurring_file = '../../recurring_tasks.txt'

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
            task_match = re.match(r'^(\s*)- \[( |x)\] (.+)', line)
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
                    
                    # Extract project and context tags
                    project_tags = list(dict.fromkeys(re.findall(r'\+(\w+)', content_no_meta)))
                    context_tags = list(dict.fromkeys(re.findall(r'@(\w+)', content_no_meta)))
                    
                    # Clean content by removing tags
                    clean_content = re.sub(r'([+@]\w+)', '', content_no_meta).strip()
                    
                    task = {
                        'id': generate_stable_task_id(area, clean_content, indent_level, line_number),
                        'type': 'task',
                        'description': clean_content,
                        'completed': completed == 'x',
                        'area': area,
                        'context': context_tags[0] if context_tags else '',
                        'project': project_tags[0] if project_tags else '',
                        'due_date': due_date.strftime('%Y-%m-%d') if due_date else '',
                        'priority': metadata.get('priority', ''),
                        'recurring': metadata.get('every', ''),
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
    
    # Separate completed tasks and incomplete tasks
    completed_tasks = [t for t in all_tasks if t['completed']]
    incomplete_tasks = [t for t in all_tasks if not t['completed']]
    
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

def add_hierarchy_to_tasks(task_list: List[Dict[str, Any]], include_completed_subtasks: bool = False) -> List[Dict[str, Any]]:
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
            if include_completed or not subtask['completed']:
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
    
    # Sort by priority and content for consistent ordering
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
                    clean_content = re.sub(r'([+@]\w+)', '', content_no_meta).strip()
                    
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
        task_match = re.match(r'^(\s*)- \[( |x)\] (.+)', line)
        if task_match and in_correct_area:
            indent, completed, content = task_match.groups()
            
            # Check if this is the right indentation level
            if len(indent) != len(expected_indent):
                continue
                
            # Remove metadata and tags from content for comparison
            content_no_meta = re.sub(r'\([^)]*\)', '', content).strip()
            clean_content = re.sub(r'([+@]\w+)', '', content_no_meta).strip()
            
            # Compare with the task description
            if clean_content == description:
                # Found the task! Toggle its completion status
                new_status = ' ' if completed == 'x' else 'x'
                new_line = line.replace(f'[{completed}]', f'[{new_status}]', 1)
                
                # If marking as complete, add done date metadata
                if new_status == 'x' and 'done:' not in new_line:
                    # Find a good place to insert the done date
                    # Look for existing metadata parentheses
                    if re.search(r'\([^)]*\)', new_line):
                        # Add to existing metadata
                        new_line = re.sub(r'\(([^)]*)\)', rf'(\1 done:{date.today().strftime("%Y-%m-%d")})', new_line, 1)
                    else:
                        # Add new metadata at the end before any tags
                        content_part = new_line.split('] ', 1)[1] if '] ' in new_line else new_line
                        # Insert before the first tag or at the end
                        tag_match = re.search(r'([+@]\w+)', content_part)
                        if tag_match:
                            insert_pos = tag_match.start()
                            content_before = content_part[:insert_pos].rstrip()
                            content_after = content_part[insert_pos:]
                            new_content = f"{content_before} (done:{date.today().strftime('%Y-%m-%d')}) {content_after}"
                        else:
                            new_content = f"{content_part.rstrip()} (done:{date.today().strftime('%Y-%m-%d')})"
                        
                        new_line = new_line.split('] ', 1)[0] + '] ' + new_content
                        if not new_line.endswith('\n'):
                            new_line += '\n'
                
                # If marking as incomplete, remove done date metadata
                elif new_status == ' ' and 'done:' in new_line:
                    # Remove the done date from metadata
                    # First try to remove from existing metadata parentheses
                    def clean_metadata(match):
                        content = match.group(1)
                        # Remove done date and clean up
                        content = re.sub(r'\s*done:\d{4}-\d{2}-\d{2}\s*', ' ', content)
                        content = re.sub(r'^\s+|\s+$', '', content)  # trim
                        content = re.sub(r'\s+', ' ', content)  # normalize spaces
                        if content.strip():
                            return f'({content})'
                        else:
                            return ''  # Remove empty parentheses
                    
                    new_line = re.sub(r'\(([^)]*done:[^)]*)\)', clean_metadata, new_line)
                    # Clean up any extra spaces that might be left
                    new_line = re.sub(r'\s+', ' ', new_line)
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
    
    # Separate completed tasks and incomplete tasks
    completed_tasks = [t for t in all_tasks if t['completed']]
    incomplete_tasks = [t for t in all_tasks if not t['completed']]
    
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
