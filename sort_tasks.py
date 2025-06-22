import re
import os
import datetime

# Define custom ordering for areas (priority order)
AREA_ORDER_KEY = ['Work', 'Personal', 'Health', 'Finances']

# Parsing tasks
def parse_tasks(file_path):
    tasks = []
    current_area = None
    current_task_group = []

    with open(file_path, 'r') as file:
        for line in file:
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
                priority_match = re.search(r'\(priority:(\w+)\)', content)
                due_date_match = re.search(r'\(due:(\d{4}-\d{2}-\d{2})\)', content)

                task = {
                    'type': 'task',
                    'area': current_area,
                    'completed': completed == 'x',
                    'content': content,
                    'priority': priority_match.group(1) if priority_match else None,
                    'due': datetime.datetime.strptime(due_date_match.group(1), '%Y-%m-%d').date() if due_date_match else None,
                    'indent': indent,
                    'subtasks': [],
                    'notes': []
                }

                if len(indent) == 4:
                    tasks.append(task)
                    current_task_group = task
                elif len(indent) > 4:
                    current_task_group['subtasks'].append(task)

            elif note_match:
                note = {'type': 'note', 'content': stripped, 'indent': note_match.group(1)}
                current_task_group['notes'].append(note)

    return tasks

# Sorting tasks by due date, keeping task groups together
def sort_by_due(tasks):
    task_groups = []
    current_group = None

    for task in tasks:
        if task['type'] == 'task' and len(task['indent']) == 4:
            current_group = task
            task_groups.append(current_group)

    for group in task_groups:
        group['earliest_due'] = group['due'] or datetime.date.max
        for subtask in group['subtasks']:
            if subtask['due'] and subtask['due'] < group['earliest_due']:
                group['earliest_due'] = subtask['due']

        group['subtasks'] = sorted(group['subtasks'], key=lambda x: x['due'] or datetime.date.max)

    task_groups.sort(key=lambda x: x['earliest_due'])

    sorted_tasks = []
    for group in task_groups:
        sorted_tasks.append(group)
        sorted_tasks.extend(group['notes'])
        sorted_tasks.extend(group['subtasks'])

    return sorted_tasks

# Write sorted tasks to files
def write_sorted_tasks(tasks, key):
    os.makedirs('outputs', exist_ok=True)

    if key == 'due':
        sorted_tasks = sort_by_due(tasks)
    else:
        sorted_tasks = tasks

    filename = f'outputs/sorted_by_{key}.txt'

    with open(filename, 'w') as file:
        for task in sorted_tasks:
            if task['type'] == 'area':
                file.write(f"{task['content']}\n")
            elif task['type'] == 'task':
                status = '[x]' if task['completed'] else '[ ]'
                area_metadata = f" +{task['area']}"
                file.write(f"{task['indent']}- {status} {task['content']}{area_metadata}\n")
            elif task['type'] == 'note':
                file.write(f"{task['indent']}{task['content']}\n")

if __name__ == '__main__':
    tasks = parse_tasks('tasks.txt')
    write_sorted_tasks(tasks, 'due')

    print("Tasks sorted and saved successfully.")
