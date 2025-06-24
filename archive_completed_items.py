import datetime

def archive_completed_tasks(tasks_file='tasks.txt', archive_file='archive.txt'):
    # Read all tasks
    with open(tasks_file, 'r') as f:
        lines = f.readlines()

    # Separate completed and incomplete tasks based on markdown checkbox syntax
    completed = []
    incomplete = []
    for line in lines:
        stripped = line.lstrip()
        if stripped.startswith('- [x] '):
            completed.append(line)
        else:
            incomplete.append(line)

    if not completed:
        print('No completed tasks to archive.')
        return

    # Prepare archive entry with timestamp
    now = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    archive_entry = [f'Archived on {now}\n'] + completed + ['\n']

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

    print(f'Archived {len(completed)} completed tasks.')

if __name__ == '__main__':
    archive_completed_tasks()
