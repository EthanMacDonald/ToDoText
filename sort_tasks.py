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
        if secondary_key == 'priority':
            return priority_order.get(t.get('priority'), 99)
        return 0

    grouped_tasks = {}
    for task in tasks:
        if task['type'] == 'task':
            key = task.get(sort_key, 'NoKey') or 'NoKey'
            grouped_tasks.setdefault(key, []).append(task)

    ordered_areas = AREA_ORDER_KEY + sorted(set(grouped_tasks.keys()) - set(AREA_ORDER_KEY), key=lambda x: str(x))

    with open(filename, 'w') as f:
        for area in ordered_areas:
            if area in grouped_tasks:
                f.write(f"{area}:\n")
                sorted_area_tasks = sorted(grouped_tasks[area], key=sorting_fn)
                for task in sorted_area_tasks:
                    status = '[x]' if task['completed'] else '[ ]'
                    metadata = f" +{task['project']} @{task['context']}"
                    content = re.sub(r'\[.*?\]\s*', '', task['content'])  # Remove area tags from content
                    f.write(f"{task['indent']}- {status} {content}{metadata}\n")
                    for note in task.get('notes', []):
                        f.write(f"{note['indent']}{note['content']}\n")
                    for subtask in task['subtasks']:
                        sub_status = '[x]' if subtask['completed'] else '[ ]'
                        f.write(f"{subtask['indent']}- {sub_status} {subtask['content']}\n")
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
