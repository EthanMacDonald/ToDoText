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
                tasks.append({'type': 'note', 'content': stripped, 'indent': note_match.group(1)})
    return tasks

# Sorting tasks
def sort_tasks(tasks, key):
    if key == 'area':
        sorted_tasks = []
        areas_dict = {}
        current_area = None

        for task in tasks:
            if task['type'] == 'area':
                current_area = task['area']
                areas_dict[current_area] = [task]
            elif current_area:
                areas_dict[current_area].append(task)

        ordered_areas = AREA_ORDER_KEY + sorted([area for area in areas_dict if area not in AREA_ORDER_KEY])

        for area in ordered_areas:
            if area in areas_dict:
                sorted_tasks.extend(areas_dict[area])

        return sorted_tasks

    elif key == 'due':
        tasks_with_due = [t for t in tasks if t['type'] == 'task' and t['due']]
        tasks_without_due = [t for t in tasks if t['type'] != 'task' or not t['due']]
        sorted_tasks = sorted(tasks_with_due, key=lambda x: x['due']) + tasks_without_due
        return sorted_tasks

    elif key == 'priority':
        priority_order = {'A': 1, 'B': 2, 'C': 3, None: 99}
        tasks_with_priority = [t for t in tasks if t['type'] == 'task']
        sorted_tasks = sorted(tasks_with_priority, key=lambda x: priority_order.get(x['priority'], 99))
        return sorted_tasks

    else:
        return tasks

# Write sorted tasks to files
def write_sorted_tasks(tasks, key):
    os.makedirs('outputs', exist_ok=True)
    sorted_tasks = sort_tasks(tasks, key)
    filename = f'outputs/sorted_by_{key}.txt'

    with open(filename, 'w') as file:
        current_area = None
        for task in sorted_tasks:
            if key == 'area' and task['type'] == 'area':
                file.write(f"{task['content']}\n")
                current_area = task['area']
            elif task['type'] == 'task':
                status = '[x]' if task['completed'] else '[ ]'
                area_metadata = f" +{task['area']}" if key != 'area' else ""
                file.write(f"{task['indent']}- {status} {task['content']}{area_metadata}\n")
            elif task['type'] == 'note':
                file.write(f"{task['indent']}{task['content']}\n")

if __name__ == '__main__':
    tasks = parse_tasks('tasks.txt')
    for key in ['area', 'due', 'priority']:
        write_sorted_tasks(tasks, key)

    print("Tasks sorted and saved successfully.")
