# sort_tasks.py

import re
import os
import datetime

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

            if area_match:
                current_area = area_match.group(1)
            elif task_match:
                indent, completed, content = task_match.groups()
                priority_match = re.search(r'\(priority:(\w+)\)', content)
                due_date_match = re.search(r'\(due:(\d{4}-\d{2}-\d{2})\)', content)

                task = {
                    'area': current_area,
                    'completed': completed == 'x',
                    'content': content,
                    'priority': priority_match.group(1) if priority_match else None,
                    'due': datetime.datetime.strptime(due_date_match.group(1), '%Y-%m-%d').date() if due_date_match else None,
                    'indent': len(indent)
                }
                tasks.append(task)
    return tasks

# Sorting tasks
def sort_tasks(tasks, key):
    if key == 'area':
        return sorted(tasks, key=lambda x: (x['area'] or '', x['indent']))
    elif key == 'due':
        return sorted(tasks, key=lambda x: (x['due'] or datetime.date.max, x['indent']))
    elif key == 'priority':
        priority_order = {'A': 1, 'B': 2, 'C': 3, None: 99}
        return sorted(tasks, key=lambda x: (priority_order.get(x['priority'], 99), x['indent']))
    else:
        return tasks

# Write sorted tasks to files
def write_sorted_tasks(tasks, key):
    os.makedirs('outputs', exist_ok=True)
    sorted_tasks = sort_tasks(tasks, key)
    filename = f'outputs/sorted_by_{key}.txt'

    with open(filename, 'w') as file:
        for task in sorted_tasks:
            status = '[x]' if task['completed'] else '[ ]'
            area = f"{task['area']}: " if task['area'] else ''
            file.write(f"{area}- {status} {task['content']}\n")

if __name__ == '__main__':
    tasks = parse_tasks('tasks.txt')
    for key in ['area', 'due', 'priority']:
        write_sorted_tasks(tasks, key)

    print("Tasks sorted and saved successfully.")
