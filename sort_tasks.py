import re
import os
import datetime

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
                project_match = re.search(r'\+(\w+)', content)
                context_match = re.search(r'@(\w+)', content)

                task = {
                    'type': 'task',
                    'area': current_area,
                    'completed': completed == 'x',
                    'content': content,
                    'priority': priority_match.group(1) if priority_match else None,
                    'due': datetime.datetime.strptime(due_date_match.group(1), '%Y-%m-%d').date() if due_date_match else None,
                    'project': project_match.group(1) if project_match else 'NoProject',
                    'context': context_match.group(1) if context_match else 'NoContext',
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

# Helper sorting functions
def sort_by_key(tasks, primary_key, secondary_key):
    groups = {}
    for task in tasks:
        if task['type'] == 'task' and len(task['indent']) == 4:
            key = task.get(primary_key)
            groups.setdefault(key, []).append(task)

    priority_order = {'A': 1, 'B': 2, 'C': 3, None: 99}

    sorted_tasks = []
    for key, group_tasks in sorted(groups.items()):
        for task in group_tasks:
            if secondary_key == 'due':
                task['subtasks'] = sorted(task['subtasks'], key=lambda x: x.get('due') or datetime.date.max)
                task['earliest'] = min([task.get('due') or datetime.date.max] + [st.get('due') or datetime.date.max for st in task['subtasks']])
            elif secondary_key == 'priority':
                task['subtasks'] = sorted(task['subtasks'], key=lambda x: priority_order.get(x.get('priority')))
                task['highest_priority'] = min([priority_order.get(task.get('priority'))] + [priority_order.get(st.get('priority')) for st in task['subtasks']])

        if secondary_key == 'due':
            group_tasks.sort(key=lambda x: x['earliest'])
        elif secondary_key == 'priority':
            group_tasks.sort(key=lambda x: x['highest_priority'])

        sorted_tasks.extend(group_tasks)

    return sorted_tasks

# Write sorted tasks to files
def write_sorted_tasks(tasks, primary_key, secondary_key):
    os.makedirs('outputs', exist_ok=True)

    sorted_tasks = sort_by_key(tasks, primary_key, secondary_key)

    filename = f'outputs/sorted_by_{primary_key}_then_{secondary_key}.txt'

    with open(filename, 'w') as file:
        for task in sorted_tasks:
            status = '[x]' if task['completed'] else '[ ]'
            metadata = f" +{task['project']} @{task['context']}"
            file.write(f"{task['indent']}- {status} {task['content']}{metadata}\n")
            for note in task['notes']:
                file.write(f"{note['indent']}{note['content']}\n")
            for subtask in task['subtasks']:
                sub_status = '[x]' if subtask['completed'] else '[ ]'
                sub_metadata = f" +{subtask['project']} @{subtask['context']}"
                file.write(f"{subtask['indent']}- {sub_status} {subtask['content']}{sub_metadata}\n")

if __name__ == '__main__':
    tasks = parse_tasks('tasks.txt')

    write_sorted_tasks(tasks, 'project', 'due')
    write_sorted_tasks(tasks, 'project', 'priority')
    write_sorted_tasks(tasks, 'context', 'due')
    write_sorted_tasks(tasks, 'context', 'priority')

    print("Tasks sorted and saved successfully.")
