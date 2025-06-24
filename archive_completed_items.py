import datetime
import re
from collections import defaultdict

def archive_completed_tasks(tasks_file='tasks.txt', archive_file='archive.txt'):
    # Parse tasks using regex, similar to sort_tasks.py
    with open(tasks_file, 'r') as f:
        lines = f.readlines()

    area = None
    completed_by_area = defaultdict(list)
    output_lines = []
    parent_task = None
    parent_task_line = None
    parent_task_indent = None
    last_area_line = None

    for idx, line in enumerate(lines):
        stripped = line.rstrip('\n')
        area_match = re.match(r'^(\S.+):$', stripped)
        task_match = re.match(r'^(\s*)- \[( |x)\] (.+)', line)
        # Area header
        if area_match:
            area = area_match.group(1)
            last_area_line = line
            output_lines.append(line)
            parent_task = None
            parent_task_line = None
            parent_task_indent = None
            continue
        # Task or subtask
        if task_match:
            indent, completed, content = task_match.groups()
            is_completed = completed == 'x'
            if len(indent) == 4:
                parent_task = line
                parent_task_line = line
                parent_task_indent = indent
                if is_completed:
                    completed_by_area[area].append(line)
                else:
                    output_lines.append(line)
            elif len(indent) > 4:
                if is_completed:
                    # Add parent if not already present
                    if parent_task_line and (not completed_by_area[area] or completed_by_area[area][-1] != parent_task_line):
                        completed_by_area[area].append(parent_task_line)
                    completed_by_area[area].append(line)
                else:
                    output_lines.append(line)
            else:
                output_lines.append(line)
        else:
            output_lines.append(line)

    # If nothing to archive
    if not any(completed_by_area.values()):
        print('No completed tasks to archive.')
        return

    # Prepare archive entry with timestamp, sorted by area
    now = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    archive_entry = [f'Archived on {now}\n']
    for area in sorted(completed_by_area.keys()):
        if area and completed_by_area[area]:
            archive_entry.append(f'{area}:\n')
            for task in completed_by_area[area]:
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
    archive_completed_tasks()
