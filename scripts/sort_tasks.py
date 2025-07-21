import re
import os
import datetime
import shutil

AREA_ORDER_KEY = ['Work', 'Personal', 'Health', 'Finances']

# Remove all files in the outputs directory if it exists
if os.path.exists('outputs'):
    shutil.rmtree('outputs')


def parse_tasks(file_path):
    tasks, current_area, current_task_group = [], None, {}
    with open(file_path, 'r') as file:
        for line_number, line in enumerate(file, 1):
            stripped = line.rstrip()
            if not stripped:
                continue

            area_match = re.match(r'^(\S.+):$', stripped)
            task_match = re.match(r'^(\s*)- \[( |x)\] (.+)', line)
            note_match = re.match(r'^(\s+)[^-\[].+', line)

            if area_match:
                current_area = area_match.group(1)
                tasks.append({'type': 'area', 'area': current_area, 'content': stripped})
            elif task_match:
                indent, completed, content = task_match.groups()
                # Extract metadata from all sets of parentheses
                all_meta = re.findall(r'\(([^)]*)\)', content)
                metadata = {}
                for meta_str in all_meta:
                    # Parse key:value pairs, handling spaces in values
                    parts = meta_str.split()
                    i = 0
                    while i < len(parts):
                        if ':' in parts[i]:
                            key, first_val = parts[i].split(':', 1)
                            value_parts = [first_val] if first_val else []
                            
                            # Look ahead to collect continuation of this value
                            j = i + 1
                            while j < len(parts) and ':' not in parts[j]:
                                value_parts.append(parts[j])
                                j += 1
                            
                            metadata[key] = ' '.join(value_parts)
                            i = j
                        else:
                            i += 1
                # Remove all metadata parentheses from content for display
                content_no_meta = re.sub(r'\([^)]*\)', '', content).strip()
                # Parse recognized metadata
                priority = metadata.get('priority')
                due = metadata.get('due')
                try:
                    due = datetime.datetime.strptime(due, '%Y-%m-%d').date() if due else None
                except Exception as e:
                    print(f"Error parsing due date on line {line_number}: {line.strip()}")
                    raise
                done_date = metadata.get('done')
                try:
                    done_date = datetime.datetime.strptime(done_date, '%Y-%m-%d').date() if done_date else None
                except Exception as e:
                    print(f"Error parsing done date on line {line_number}: {line.strip()}")
                    raise
                progress = metadata.get('progress')
                rec = metadata.get('rec')
                onhold = metadata.get('onhold')
                # Determine if onhold is active (future date or text condition)
                is_onhold_active = False
                if onhold:
                    try:
                        # Try to parse as date
                        onhold_date = datetime.datetime.strptime(onhold, '%Y-%m-%d').date()
                        today = datetime.date.today()
                        is_onhold_active = onhold_date > today
                        onhold = onhold_date if is_onhold_active else None  # Set to None if date has passed
                    except ValueError:
                        # Not a date, treat as text condition - always active
                        is_onhold_active = True
                # Extract all unique project and context tags from content
                project_tags = list(dict.fromkeys(re.findall(r'\+(\w+)', content_no_meta)))
                context_tags = list(dict.fromkeys(re.findall(r'@(\w+)', content_no_meta)))
                project = project_tags[0] if project_tags else 'NoProject'
                context = context_tags[0] if context_tags else 'NoContext'
                extra_projects = project_tags[1:] if len(project_tags) > 1 else []
                extra_contexts = context_tags[1:] if len(context_tags) > 1 else []

                task = {
                    'type': 'task',
                    'area': current_area,
                    'completed': completed == 'x',
                    'content': re.sub(r'([+@&]\w+)', '', content_no_meta).strip(),
                    'priority': priority,
                    'due': due,
                    'done_date': done_date,
                    'progress': progress,
                    'rec': rec,
                    'onhold': onhold if is_onhold_active else None,
                    'is_onhold_active': is_onhold_active,
                    'project': project,
                    'context': context,
                    'extra_projects': extra_projects,
                    'extra_contexts': extra_contexts,
                    'indent': indent,
                    'subtasks': [],
                    'notes': []
                }

                if len(indent) <= 4:
                    tasks.append(task)
                    current_task_group = task
                else:
                    current_task_group['subtasks'].append(task)

            elif note_match:
                note = {'type': 'note', 'content': stripped, 'indent': note_match.group(1)}
                current_task_group.setdefault('notes', []).append(note)
    return tasks


def sort_and_write(tasks, sort_key, secondary_key=None):
    os.makedirs('outputs', exist_ok=True)
    filename = f'outputs/sorted_by_{sort_key}' + (f'_then_{secondary_key}' if secondary_key else '') + '.txt'

    priority_order = {'A': 1, 'B': 2, 'C': 3, None: 99}

    def sorting_fn(t):
        return priority_order.get(t.get('priority'), 99)

    def build_metadata_str(task):
        meta = []
        if task.get('priority'):
            meta.append(f"priority:{task['priority']}")
        if task.get('due'):
            meta.append(f"due:{task['due']}")
        if task.get('done_date'):
            meta.append(f"done:{task['done_date']}")
        if task.get('progress'):
            meta.append(f"progress:{task['progress']}")
        if task.get('rec'):
            meta.append(f"rec:{task['rec']}")
        if task.get('onhold'):
            meta.append(f"onhold:{task['onhold']}")
        return f" ({' '.join(meta)})" if meta else ''

    def build_tags_str(task, primary_task=False):
        tags = []
        # Only unique project and context tags
        if task['project'] != 'NoProject':
            tags.append(f"+{task['project']}")
        for p in task.get('extra_projects', []):
            if p != task['project']:
                tags.append(f"+{p}")
        if task['context'] != 'NoContext':
            tags.append(f"@{task['context']}")
        for c in task.get('extra_contexts', []):
            if c != task['context']:
                tags.append(f"@{c}")
        # Only add area tag for primary tasks (not subtasks) and not when sorting by area
        if primary_task and sort_key != 'area' and 'area' in task and task['area']:
            tags.append(f"&{task['area']}")
        return ' ' + ' '.join(dict.fromkeys(tags)) if tags else ''

    grouped_tasks = {}
    for task in tasks:
        if task['type'] == 'task':
            key = task.get(sort_key, 'NoKey') or 'NoKey'
            grouped_tasks.setdefault(key, []).append(task)

    ordered_keys = AREA_ORDER_KEY + sorted(set(grouped_tasks.keys()) - set(AREA_ORDER_KEY), key=lambda x: str(x))

    with open(filename, 'w') as f:
        if sort_key == 'due':
            done_tasks = sorted([t for tl in grouped_tasks.values() for t in tl if t['completed']], key=lambda x: x['done_date'] or datetime.date.max)
            if done_tasks:
                f.write("Done:\n")
                for task in done_tasks:
                    status = '[x]'
                    meta_str = build_metadata_str(task)
                    tags_str = build_tags_str(task, primary_task=True)
                    content = task['content']
                    # Sort subtasks by completion, due date, then content
                    subtasks_sorted = sorted(task['subtasks'], key=lambda x: (not x['completed'], x.get('due') is None, x.get('due') or datetime.date.max, x['content']))
                    f.write(f"{task['indent']}- {status} {content}{meta_str}{tags_str}\n")
                    for note in task.get('notes', []):
                        f.write(f"{note['indent']}{note['content']}\n")
                    for subtask in subtasks_sorted:
                        sub_status = '[x]' if subtask['completed'] else '[ ]'
                        sub_meta_str = build_metadata_str(subtask)
                        sub_tags_str = build_tags_str(subtask, primary_task=False)
                        f.write(f"{subtask['indent']}- {sub_status} {subtask['content']}{sub_meta_str}{sub_tags_str}\n")
                f.write("\n")

        for key in ordered_keys:
            if key in grouped_tasks:
                f.write(f"{key}:\n")
                tasks_to_sort = grouped_tasks[key]

                if secondary_key in ['priority', 'due']:
                    # Group tasks by completion status and onhold status
                    incomplete_tasks = [x for x in tasks_to_sort if not x['completed'] and not x.get('is_onhold_active')]
                    onhold_tasks = [x for x in tasks_to_sort if x.get('is_onhold_active')]
                    completed_tasks = [x for x in tasks_to_sort if x['completed']]
                    
                    # Sort each group separately
                    if secondary_key == 'priority':
                        incomplete_sorted = sorted(incomplete_tasks, key=lambda x: (priority_order.get(x['priority'], 99), x['content']))
                        # Sort onhold tasks: dates first (by date), then text conditions (alphabetically)
                        def onhold_sort_key(task):
                            onhold_val = task.get('onhold')
                            if onhold_val is None:
                                return (2, '', priority_order.get(task['priority'], 99), task['content'])
                            elif isinstance(onhold_val, datetime.date):
                                return (0, onhold_val, priority_order.get(task['priority'], 99), task['content'])
                            else:
                                return (1, str(onhold_val), priority_order.get(task['priority'], 99), task['content'])
                        onhold_sorted = sorted(onhold_tasks, key=onhold_sort_key)
                        completed_sorted = sorted(completed_tasks, key=lambda x: (priority_order.get(x['priority'], 99), x['content']))
                    else:  # due
                        incomplete_sorted = sorted(incomplete_tasks, key=lambda x: (x['due'] is None, x['due'] or datetime.date.max, x['content']))
                        # Sort onhold tasks: dates first (by date), then text conditions (alphabetically)
                        def onhold_sort_key(task):
                            onhold_val = task.get('onhold')
                            if onhold_val is None:
                                return (2, '', task['due'] is None, task['due'] or datetime.date.max, task['content'])
                            elif isinstance(onhold_val, datetime.date):
                                return (0, onhold_val, task['due'] is None, task['due'] or datetime.date.max, task['content'])
                            else:
                                return (1, str(onhold_val), task['due'] is None, task['due'] or datetime.date.max, task['content'])
                        onhold_sorted = sorted(onhold_tasks, key=onhold_sort_key)
                        completed_sorted = sorted(completed_tasks, key=lambda x: (x['due'] is None, x['due'] or datetime.date.max, x['content']))
                    
                    # Write incomplete tasks first
                    for task in incomplete_sorted:
                        status = '[ ]'
                        meta_str = build_metadata_str(task)
                        tags_str = build_tags_str(task, primary_task=True)
                        content = task['content']
                        f.write(f"{task['indent']}- {status} {content}{meta_str}{tags_str}\n")
                        for note in task.get('notes', []):
                            f.write(f"{note['indent']}{note['content']}\n")
                        for subtask in task['subtasks']:
                            sub_status = '[x]' if subtask['completed'] else '[ ]'
                            sub_meta_str = build_metadata_str(subtask)
                            sub_tags_str = build_tags_str(subtask, primary_task=False)
                            f.write(f"{subtask['indent']}- {sub_status} {subtask['content']}{sub_meta_str}{sub_tags_str}\n")
                    
                    # Write onhold tasks with header
                    if onhold_tasks:
                        f.write(f"  On Hold:\n")
                        for task in onhold_sorted:
                            status = '[ ]'
                            meta_str = build_metadata_str(task)
                            tags_str = build_tags_str(task, primary_task=True)
                            content = task['content']
                            f.write(f"{task['indent']}- {status} {content}{meta_str}{tags_str}\n")
                            for note in task.get('notes', []):
                                f.write(f"{note['indent']}{note['content']}\n")
                            for subtask in task['subtasks']:
                                sub_status = '[x]' if subtask['completed'] else '[ ]'
                                sub_meta_str = build_metadata_str(subtask)
                                sub_tags_str = build_tags_str(subtask, primary_task=False)
                                f.write(f"{subtask['indent']}- {sub_status} {subtask['content']}{sub_meta_str}{sub_tags_str}\n")
                    
                    # Write completed tasks with header
                    if completed_tasks:
                        f.write(f"  Done:\n")
                        for task in completed_sorted:
                            status = '[x]'
                            meta_str = build_metadata_str(task)
                            tags_str = build_tags_str(task, primary_task=True)
                            content = task['content']
                            f.write(f"{task['indent']}- {status} {content}{meta_str}{tags_str}\n")
                            for note in task.get('notes', []):
                                f.write(f"{note['indent']}{note['content']}\n")
                            for subtask in task['subtasks']:
                                sub_status = '[x]' if subtask['completed'] else '[ ]'
                                sub_meta_str = build_metadata_str(subtask)
                                sub_tags_str = build_tags_str(subtask, primary_task=False)
                                f.write(f"{subtask['indent']}- {sub_status} {subtask['content']}{sub_meta_str}{sub_tags_str}\n")
                else:
                    # Group tasks by completion status and onhold status for primary sorts too
                    incomplete_tasks = [x for x in tasks_to_sort if not x['completed'] and not x.get('is_onhold_active')]
                    onhold_tasks = [x for x in tasks_to_sort if x.get('is_onhold_active')]
                    completed_tasks = [x for x in tasks_to_sort if x['completed']]
                    
                    # Sort each group
                    incomplete_sorted = sorted(incomplete_tasks, key=sorting_fn)
                    # Sort onhold tasks: dates first (by date), then text conditions (alphabetically)
                    def onhold_sort_key(task):
                        onhold_val = task.get('onhold')
                        if onhold_val is None:
                            return (2, '', sorting_fn(task))  # No onhold value
                        elif isinstance(onhold_val, datetime.date):
                            return (0, onhold_val, sorting_fn(task))  # Date-based onhold
                        else:
                            return (1, str(onhold_val), sorting_fn(task))  # Text-based onhold
                    onhold_sorted = sorted(onhold_tasks, key=onhold_sort_key)
                    completed_sorted = sorted(completed_tasks, key=sorting_fn)
                    
                    # Write incomplete tasks first
                    for task in incomplete_sorted:
                        status = '[ ]'
                        meta_str = build_metadata_str(task)
                        tags_str = build_tags_str(task, primary_task=True)
                        content = task['content']
                        subtasks_sorted = sorted(task['subtasks'], key=sorting_fn)
                        f.write(f"{task['indent']}- {status} {content}{meta_str}{tags_str}\n")
                        for note in task.get('notes', []):
                            f.write(f"{note['indent']}{note['content']}\n")
                        for subtask in subtasks_sorted:
                            sub_status = '[x]' if subtask['completed'] else '[ ]'
                            sub_meta_str = build_metadata_str(subtask)
                            sub_tags_str = build_tags_str(subtask, primary_task=False)
                            f.write(f"{subtask['indent']}- {sub_status} {subtask['content']}{sub_meta_str}{sub_tags_str}\n")
                    
                    # Write onhold tasks with header
                    if onhold_tasks:
                        f.write(f"  On Hold:\n")
                        for task in onhold_sorted:
                            status = '[ ]'
                            meta_str = build_metadata_str(task)
                            tags_str = build_tags_str(task, primary_task=True)
                            content = task['content']
                            subtasks_sorted = sorted(task['subtasks'], key=sorting_fn)
                            f.write(f"{task['indent']}- {status} {content}{meta_str}{tags_str}\n")
                            for note in task.get('notes', []):
                                f.write(f"{note['indent']}{note['content']}\n")
                            for subtask in subtasks_sorted:
                                sub_status = '[x]' if subtask['completed'] else '[ ]'
                                sub_meta_str = build_metadata_str(subtask)
                                sub_tags_str = build_tags_str(subtask, primary_task=False)
                                f.write(f"{subtask['indent']}- {sub_status} {subtask['content']}{sub_meta_str}{sub_tags_str}\n")
                    
                    # Write completed tasks with header
                    if completed_tasks:
                        f.write(f"  Done:\n")
                        for task in completed_sorted:
                            status = '[x]'
                            meta_str = build_metadata_str(task)
                            tags_str = build_tags_str(task, primary_task=True)
                            content = task['content']
                            subtasks_sorted = sorted(task['subtasks'], key=sorting_fn)
                            f.write(f"{task['indent']}- {status} {content}{meta_str}{tags_str}\n")
                            for note in task.get('notes', []):
                                f.write(f"{note['indent']}{note['content']}\n")
                            for subtask in subtasks_sorted:
                                sub_status = '[x]' if subtask['completed'] else '[ ]'
                                sub_meta_str = build_metadata_str(subtask)
                                sub_tags_str = build_tags_str(subtask, primary_task=False)
                                f.write(f"{subtask['indent']}- {sub_status} {subtask['content']}{sub_meta_str}{sub_tags_str}\n")
                f.write("\n")


if __name__ == '__main__':
    tasks = parse_tasks('tasks.txt')

    sort_combinations = [
        ('area', None), ('due', None), ('priority', None),
        ('area', 'due'), ('area', 'priority'),
        ('project', 'due'), ('project', 'priority'),
        ('context', 'due'), ('context', 'priority')
    ]

    for sort_key, secondary_key in sort_combinations:
        sort_and_write(tasks, sort_key, secondary_key)

    print("All task files sorted and saved successfully.")
