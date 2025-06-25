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
                    for pair in re.findall(r'(\w+:[^\s)]+)', meta_str):
                        key, value = pair.split(':', 1)
                        metadata[key] = value
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
                    'content': re.sub(r'([+@]\w+)', '', content_no_meta).strip(),
                    'priority': priority,
                    'due': due,
                    'done_date': done_date,
                    'progress': progress,
                    'rec': rec,
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
            tags.append(f"+{task['area']}")
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
                    sorted_tasks = sorted(tasks_to_sort, key=lambda x: (
                        (priority_order.get(x['priority'], 99), x['content']) if secondary_key == 'priority' else (
                            not x['completed'], x['due'] is None, x['due'] or datetime.date.max)
                    ))
                    current_group = None
                    for task in sorted_tasks:
                        group = 'Done' if task['completed'] and secondary_key == 'due' else (
                            task['priority'] or 'No Priority' if secondary_key == 'priority' else task['due'] or 'No Due Date')
                        if group != current_group:
                            current_group = group
                            group_str = group.strftime('%Y-%m-%d') if isinstance(group, datetime.date) else group
                            f.write(f"  {group_str}:\n")
                        status = '[x]' if task['completed'] else '[ ]'
                        meta_str = build_metadata_str(task)
                        tags_str = build_tags_str(task, primary_task=True)
                        content = task['content']
                        # Sort subtasks for secondary sort
                        if secondary_key == 'due':
                            subtasks_sorted = sorted(task['subtasks'], key=lambda x: (not x['completed'], x.get('due') is None, x.get('due') or datetime.date.max, x['content']))
                        elif secondary_key == 'priority':
                            subtasks_sorted = sorted(task['subtasks'], key=lambda x: (priority_order.get(x.get('priority'), 99), x['content']))
                        else:
                            subtasks_sorted = task['subtasks']
                        f.write(f"{task['indent']}- {status} {content}{meta_str}{tags_str}\n")
                        for note in task.get('notes', []):
                            f.write(f"{note['indent']}{note['content']}\n")
                        for subtask in subtasks_sorted:
                            sub_status = '[x]' if subtask['completed'] else '[ ]'
                            sub_meta_str = build_metadata_str(subtask)
                            sub_tags_str = build_tags_str(subtask, primary_task=False)
                            f.write(f"{subtask['indent']}- {sub_status} {subtask['content']}{sub_meta_str}{sub_tags_str}\n")
                else:
                    sorted_area_tasks = sorted(tasks_to_sort, key=sorting_fn)
                    for task in sorted_area_tasks:
                        status = '[x]' if task['completed'] else '[ ]'
                        meta_str = build_metadata_str(task)
                        tags_str = build_tags_str(task, primary_task=True)
                        content = task['content']
                        # Sort subtasks for area/priority sorts
                        if secondary_key == 'priority':
                            subtasks_sorted = sorted(task['subtasks'], key=lambda x: (priority_order.get(x.get('priority'), 99), x['content']))
                        else:
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
