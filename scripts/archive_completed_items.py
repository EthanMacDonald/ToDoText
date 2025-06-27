import datetime
import re
from collections import defaultdict

area_as_suffix = True  # Set this to True for suffix mode, False for header mode
AREA_ORDER_KEY = ['Work', 'Personal', 'Health', 'Finances']

def archive_completed_tasks(tasks_file='../tasks.txt', archive_file='../archive_files/archive.txt', area_as_suffix=area_as_suffix):
    # Parse tasks using regex, similar to sort_tasks.py
    with open(tasks_file, 'r') as f:
        lines = f.readlines()

    area = None
    completed_tasks = []
    output_lines = []
    parent_task = None
    parent_task_line = None
    parent_task_indent = None
    parent_task_completed = False
    parent_task_idx = None
    parent_task_area = None
    parent_written = set()

    for idx, line in enumerate(lines):
        stripped = line.rstrip('\n')
        area_match = re.match(r'^(\S.+):$', stripped)
        task_match = re.match(r'^(\s*)- \[( |x)\] (.+)', line)
        # Area header
        if area_match:
            area = area_match.group(1)
            output_lines.append(line)
            parent_task = None
            parent_task_line = None
            parent_task_indent = None
            parent_task_completed = False
            parent_task_idx = None
            parent_task_area = area
            continue
        # Task or subtask
        if task_match:
            indent, completed, content = task_match.groups()
            is_completed = completed == 'x'
            if len(indent) == 4:
                parent_task = line
                parent_task_line = line
                parent_task_indent = indent
                parent_task_completed = is_completed
                parent_task_idx = len(completed_tasks)
                parent_task_area = area
                if is_completed:
                    completed_tasks.append((line, area))
                else:
                    output_lines.append(line)
            elif len(indent) > 4:
                # Subtask
                if is_completed:
                    # If parent is not completed and not already written, write parent first
                    if not parent_task_completed and parent_task_line and parent_task_line not in parent_written:
                        completed_tasks.append((parent_task_line, parent_task_area))
                        parent_written.add(parent_task_line)
                    completed_tasks.append((line, parent_task_area))
                else:
                    output_lines.append(line)
            else:
                output_lines.append(line)
        else:
            output_lines.append(line)

    # If nothing to archive
    if not completed_tasks:
        print('No completed tasks to archive.')
        return

    # Prepare archive entry with timestamp
    now = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    archive_entry = [f'Archived on {now}\n']
    if area_as_suffix:
        for task, area in completed_tasks:
            if task.strip():
                task_line = task.rstrip('\n')
                # Only add &Area to top-level tasks (4 spaces indent), not subtasks
                indent_match = re.match(r'^(\s*)- \[', task_line)
                if indent_match and len(indent_match.group(1)) == 4:
                    archive_entry.append(f'{task_line} &{area}\n')
                else:
                    archive_entry.append(f'{task_line}\n')
        archive_entry.append('\n')  # Add an empty line at the end
    else:
        # Sort areas by AREA_ORDER_KEY, then alphabetically for others
        grouped = defaultdict(list)
        for task, area in completed_tasks:
            grouped[area].append(task)
        ordered_areas = AREA_ORDER_KEY + sorted(set(grouped.keys()) - set(AREA_ORDER_KEY), key=lambda x: str(x))
        for area in ordered_areas:
            if area in grouped:
                archive_entry.append(f'{area}:\n')
                for task in grouped[area]:
                    archive_entry.append(task if task.endswith('\n') else task + '\n')
                archive_entry.append('\n')

    # Prepend to archive file (write new at top)
    try:
        with open(archive_file, 'r') as f:
            old_content = f.read()
    except FileNotFoundError:
        old_content = ''
    with open(archive_file, 'w') as f:
        f.writelines(archive_entry)
        f.write(old_content)

    # Write back incomplete tasks to tasks.txt (including area headers)
    with open(tasks_file, 'w') as f:
        f.writelines(output_lines)

    print('Archived completed tasks by area.')

if __name__ == '__main__':
    archive_completed_tasks(area_as_suffix=area_as_suffix)
