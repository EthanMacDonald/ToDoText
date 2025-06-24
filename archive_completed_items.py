import datetime
from collections import defaultdict

def archive_completed_tasks(tasks_file='tasks.txt', archive_file='archive.txt'):
    # Read all tasks
    with open(tasks_file, 'r') as f:
        lines = f.readlines()

    # Parse and group by area, and track parent tasks for completed subtasks
    area = None
    parent_task = None
    completed_by_area = defaultdict(list)
    completed_parents = defaultdict(set)
    incomplete = []
    for idx, line in enumerate(lines):
        stripped = line.lstrip()
        indent = len(line) - len(stripped)
        # Detect area/project
        if indent == 0 and stripped.endswith(':' ):
            area = stripped.strip()
            parent_task = None
            incomplete.append(line)
            continue
        # Detect parent task (1 indent level)
        if indent == 4 and stripped.startswith('- ['):
            parent_task = (area, line)
        # Completed subtask (2+ indent)
        if indent > 4 and stripped.startswith('- [x] '):
            if parent_task:
                completed_by_area[area].append(parent_task[1])
                completed_parents[area].add(parent_task[1])
            completed_by_area[area].append(line)
        # Completed top-level task
        elif indent == 4 and stripped.startswith('- [x] '):
            completed_by_area[area].append(line)
        # Incomplete or not a task
        elif not (stripped.startswith('- [x] ')):
            incomplete.append(line)

    # Remove duplicate parent tasks in archive
    for area in completed_by_area:
        seen = set()
        new_list = []
        for l in completed_by_area[area]:
            if l in completed_parents[area]:
                if l not in seen:
                    new_list.append(l)
                    seen.add(l)
            else:
                new_list.append(l)
        completed_by_area[area] = new_list

    # If nothing to archive
    if not any(completed_by_area.values()):
        print('No completed tasks to archive.')
        return

    # Prepare archive entry with timestamp, sorted by area
    now = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    archive_entry = [f'Archived on {now}\n']
    for area in sorted(completed_by_area.keys()):
        if area:
            archive_entry.append(f'{area}\n')
        archive_entry.extend(completed_by_area[area])
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

    # Write back incomplete tasks to tasks.txt
    with open(tasks_file, 'w') as f:
        f.writelines(incomplete)

    print('Archived completed tasks by area.')

if __name__ == '__main__':
    archive_completed_tasks()
