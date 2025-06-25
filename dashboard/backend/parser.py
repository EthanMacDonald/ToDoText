import re
import uuid
from datetime import datetime, date
from typing import List, Dict, Any, Optional

tasks_file = '../../tasks.txt'
recurring_file = '../../recurring_tasks.txt'

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
                        'id': str(uuid.uuid4()),
                        'type': 'task',
                        'description': clean_content,
                        'completed': completed == 'x',
                        'area': area,
                        'context': context_tags[0] if context_tags else '',
                        'project': project_tags[0] if project_tags else '',
                        'due_date': due_date.strftime('%Y-%m-%d') if due_date else '',
                        'priority': metadata.get('priority', ''),
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
    # Extract all tasks from the parsed structure
    def extract_tasks(items):
        tasks = []
        for item in items:
            if item['type'] == 'area':
                tasks.extend(extract_tasks(item['tasks']))
            elif item['type'] == 'task':
                tasks.append(item)
        return tasks
    
    all_tasks = extract_tasks(parsed_data)
    
    # Group by completion and due date
    completed_tasks = [t for t in all_tasks if t['completed']]
    incomplete_tasks = [t for t in all_tasks if not t['completed']]
    
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
    
    # Add completed tasks group
    if completed_tasks:
        result.append({
            'type': 'group',
            'title': 'Done',
            'tasks': add_hierarchy_to_tasks(completed_tasks)
        })
    
    # Add due date groups
    for due_date in sorted_due_dates:
        result.append({
            'type': 'group', 
            'title': due_date,
            'tasks': add_hierarchy_to_tasks(due_groups[due_date])
        })
    
    # Add no due date group
    if no_due_tasks:
        result.append({
            'type': 'group',
            'title': 'No Due Date',
            'tasks': add_hierarchy_to_tasks(no_due_tasks)
        })
    
    return result

def add_hierarchy_to_tasks(task_list: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Add subtasks back to their parent tasks and return only top-level tasks"""
    # Find all top-level tasks (indent_level 0 or 1, since our top-level tasks are at level 1)
    top_level_tasks = [t for t in task_list if t['indent_level'] <= 1]
    
    # Sort by priority and content for consistent ordering
    priority_order = {'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, '': 99}
    top_level_tasks.sort(key=lambda x: (
        priority_order.get(x.get('priority', ''), 99),
        x['description']
    ))
    
    return top_level_tasks

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
                task_stack = []
                
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
                        'id': str(uuid.uuid4()),
                        'type': 'recurring_task',
                        'description': clean_content,
                        'completed': completed == 'x',
                        'area': area,
                        'context': context_tags[0] if context_tags else '',
                        'project': project_tags[0] if project_tags else '',
                        'recurring': metadata.get('every', ''),
                        'indent_level': indent_level,
                        'subtasks': [],
                        'metadata': metadata
                    }
                    
                    # Handle nesting
                    while task_stack and task_stack[-1]['indent_level'] >= indent_level:
                        task_stack.pop()
                    
                    if indent_level > 0 and task_stack:
                        task_stack[-1]['subtasks'].append(task)
                    else:
                        tasks.append(task)
                    
                    task_stack.append(task)
                    
                except Exception as e:
                    print(f"Error parsing recurring task on line {line_number}: {line.strip()} - {e}")
                    continue
    
    return tasks

def check_off_task(task_id: str) -> bool:
    """Check off a task - implementation needed for actual file modification"""
    # TODO: Implement actual task checking in file
    return True

def check_off_recurring_task(task_id: str) -> bool:
    """Check off a recurring task - implementation needed for actual file modification"""
    # TODO: Implement actual recurring task checking in file
    return True

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
