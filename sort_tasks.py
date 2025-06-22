import re
import os
import datetime

# Define custom ordering for areas (priority order)
AREA_ORDER_KEY = ['Work', 'Personal', 'Health', 'Finances']

# Parsing tasks
def parse_tasks(file_path):
    tasks = []
    current_area = None
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
                    'indent': indent
                }
                tasks.append(task)
            elif note_match:
                tasks.append({'type': 'note', 'content': stripped, 'indent': note_match.group(1), 'due': None, 'priority': None})
    return tasks

# Sorting tasks
def sort_tasks(tasks, key, secondary_key=None):
    if key == 'area':
        areas_dict = {}
        current_area = None

        for task in tasks:
            if task['type'] == 'area':
                current_area = task['area']
                areas_dict[current_area] = [task]
            elif current_area:
                areas_dict[current_area].append(task)

        ordered_areas = AREA_ORDER_KEY + sorted([area for area in areas_dict if area not in AREA_ORDER_KEY])
        sorted_tasks = []

        for area in ordered_areas:
            if area in areas_dict:
                area_tasks = areas_dict[area]
                header, items = area_tasks[0], area_tasks[1:]
                if secondary_key == 'due':
                    items = sorted(items, key=lambda x: (x.get('due') or datetime.date.max))
                elif secondary_key == 'priority':
                    priority_order = {'A': 1, 'B': 2, 'C': 3, None: 99}
                    items = sorted(items, key=lambda x: priority_order.get(x.get('priority'), 99))
                sorted_tasks.extend([header] + items + [{'type': 'spacer'}])

        return sorted_tasks[:-1]  # remove last spacer

    elif key == 'due':
        tasks_with_due = [t for t in tasks if t['type'] == 'task' and t['due']]
        tasks_without_due = [t for t in tasks if t['type'] != 'task' or not t['due']]
        return sorted(tasks_with_due, key=lambda x: x['due']) + tasks_without_due

    elif key == 'priority':
        priority_order = {'A': 1, 'B': 2, 'C': 3, None: 99}
        tasks_with_priority = [t for t in tasks if t['type'] == 'task']
        return sorted(tasks_with_priority, key=lambda x: priority_order.get(x['priority'], 99))

    return tasks

# Write sorted tasks to files
def write_sorted_tasks(tasks, key, secondary_key=None):
    os.makedirs('outputs', exist_ok=True)
    sorted_tasks = sort_tasks(tasks, key, secondary_key)
    filename = f'outputs/sorted_by_{key}' + (f'_then_{secondary_key}' if secondary_key else '') + '.txt'

    with open(filename, 'w') as file:
        for task in sorted_tasks:
            if task['type'] == 'area':
                file.write(f"{task['content']}\n")
            elif task['type'] == 'task':
                status = '[x]' if task['completed'] else '[ ]'
                area_metadata = f" +{task['area']}" if key != 'area' else ""
                file.write(f"{task['indent']}- {status} {task['content']}{area_metadata}\n")
            elif task['type'] == 'note':
                file.write(f"{task['indent']}{task['content']}\n")
            elif task['type'] == 'spacer':
                file.write("\n")

if __name__ == '__main__':
    tasks = parse_tasks('tasks.txt')
    write_sorted_tasks(tasks, 'area')
    write_sorted_tasks(tasks, 'due')
    write_sorted_tasks(tasks, 'priority')
    write_sorted_tasks(tasks, 'area', 'due')
    write_sorted_tasks(tasks, 'area', 'priority')

    print("Tasks sorted and saved successfully.")
