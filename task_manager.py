import re
import os
import datetime
from tkinter import Tk, Button, Label, filedialog, messagebox, simpledialog, Listbox, END, SINGLE, Scrollbar, RIGHT, Y, LEFT, BOTH

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
                metadata = dict(re.findall(r'\((\w+):(.*?)\)', content))
                tags = re.findall(r'[@+](\w+)', content)
                priority_match = re.search(r'\(priority:(\w+)\)', content)
                due_date_match = re.search(r'\(due:(\d{4}-\d{2}-\d{2})\)', content)
                progress_match = re.search(r'\(progress:(\d+)%\)', content)

                task = {
                    'area': current_area,
                    'completed': completed == 'x',
                    'content': content,
                    'priority': priority_match.group(1) if priority_match else None,
                    'due': datetime.datetime.strptime(due_date_match.group(1), '%Y-%m-%d').date() if due_date_match else None,
                    'progress': int(progress_match.group(1)) if progress_match else None,
                    'tags': tags,
                    'indent': len(indent)
                }
                tasks.append(task)
    return tasks

# Sorting functions
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

# Write sorted tasks to file
def write_tasks(tasks, filename):
    os.makedirs('outputs', exist_ok=True)
    with open(os.path.join('outputs', filename), 'w') as file:
        for task in tasks:
            status = '[x]' if task['completed'] else '[ ]'
            area = f"{task['area']}: " if task['area'] else ''
            file.write(f"{area}- {status} {task['content']}\n")

# Update original file with changes
def update_original_file(tasks, file_path):
    lines = []
    current_area = None
    for task in tasks:
        status = '[x]' if task['completed'] else '[ ]'
        indent = ' ' * task['indent']
        line = f"{indent}- {status} {task['content']}\n"
        if task['area'] != current_area:
            lines.append(f"{task['area']}:\n")
            current_area = task['area']
        lines.append(line)
    with open(file_path, 'w') as file:
        file.writelines(lines)

# GUI Functions
def load_and_sort(key):
    global tasks, file_path
    file_path = filedialog.askopenfilename(initialdir='.', title='Select task file', filetypes=(('Text Files', '*.txt'),))
    if not file_path:
        return

    tasks = parse_tasks(file_path)
    sorted_tasks = sort_tasks(tasks, key)

    output_filename = f'sorted_by_{key}.txt'
    write_tasks(sorted_tasks, output_filename)
    messagebox.showinfo("Success", f"Tasks sorted by {key} and saved to outputs/{output_filename}")

    task_listbox.delete(0, END)
    for idx, task in enumerate(sorted_tasks):
        status = '✓' if task['completed'] else '✗'
        task_listbox.insert(END, f"[{status}] {task['content']}")

# Task interactions
def toggle_completion():
    selected = task_listbox.curselection()
    if not selected:
        return
    idx = selected[0]
    tasks[idx]['completed'] = not tasks[idx]['completed']
    status = '✓' if tasks[idx]['completed'] else '✗'
    task_listbox.delete(idx)
    task_listbox.insert(idx, f"[{status}] {tasks[idx]['content']}")


def add_progress():
    selected = task_listbox.curselection()
    if not selected:
        return
    idx = selected[0]
    progress = simpledialog.askinteger("Progress", "Enter progress %:", minvalue=0, maxvalue=100)
    if progress is not None:
        tasks[idx]['content'] = re.sub(r'\(progress:\d+%\)', '', tasks[idx]['content']).strip()
        tasks[idx]['content'] += f" (progress:{progress}%)"
        task_listbox.delete(idx)
        status = '✓' if tasks[idx]['completed'] else '✗'
        task_listbox.insert(idx, f"[{status}] {tasks[idx]['content']}")


def save_changes():
    update_original_file(tasks, file_path)
    messagebox.showinfo("Saved", "Changes saved to original task file.")

# GUI setup
def setup_gui():
    global task_listbox
    root = Tk()
    root.title('Enhanced Task Manager')

    Label(root, text='Sort Tasks By:', font=('Arial', 14)).pack(pady=10)

    Button(root, text='Area', command=lambda: load_and_sort('area'), width=20).pack(pady=5)
    Button(root, text='Due Date', command=lambda: load_and_sort('due'), width=20).pack(pady=5)
    Button(root, text='Priority', command=lambda: load_and_sort('priority'), width=20).pack(pady=5)

    task_listbox = Listbox(root, selectmode=SINGLE, width=60)
    task_listbox.pack(pady=5, fill=BOTH, expand=True)

    Button(root, text='Toggle Completion', command=toggle_completion, width=20).pack(pady=5)
    Button(root, text='Add Progress', command=add_progress, width=20).pack(pady=5)
    Button(root, text='Save Changes', command=save_changes, width=20).pack(pady=5)

    root.mainloop()

# Main Execution
if __name__ == '__main__':
    tasks = []
    file_path = ''
    setup_gui()
