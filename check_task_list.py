# check_syntax.py

import re
import datetime

# Helper functions for corrections
def correct_priority(value):
    corrected = input(f"Priority '{value}' invalid. Enter correct priority (A-Z): ")
    return corrected if re.match(r'^[A-Z]$', corrected) else value

def correct_due_date(value):
    corrected = input(f"Due date '{value}' invalid. Enter correct date (YYYY-MM-DD): ")
    try:
        datetime.datetime.strptime(corrected, '%Y-%m-%d')
        return corrected
    except ValueError:
        return value

def correct_progress(value):
    corrected = input(f"Progress '{value}' invalid. Enter correct progress (0-100%): ")
    return corrected if re.match(r'^\d{1,3}%$', corrected) else value

# Syntax checking function with correction options and note handling
def check_and_correct_syntax(file_path):
    corrected_lines = []
    line_number = 0

    with open(file_path, 'r') as file:
        lines = file.readlines()

    for idx, line in enumerate(lines):
        line_number += 1
        stripped = line.rstrip()
        if not stripped:
            corrected_lines.append(line)
            continue

        area_match = re.match(r'^(\S.+):$', stripped)
        task_match = re.match(r'^(\s*)- \[( |x)\] (.+)', line)
        note_match = re.match(r'^\s+[^-\[].+', line)

        if area_match or task_match or note_match:
            if task_match:
                indent, completed, content = task_match.groups()
                meta_matches = re.findall(r'\((\w+):([^\s\)]+)\)', content)

                for key, value in meta_matches:
                    value = value.strip()
                    if key == 'priority' and not re.match(r'^[A-Z]$', value):
                        new_value = correct_priority(value)
                        content = re.sub(rf'\(priority:{re.escape(value)}\)', f'(priority:{new_value})', content)
                    if key == 'due':
                        try:
                            datetime.datetime.strptime(value, '%Y-%m-%d')
                        except ValueError:
                            new_value = correct_due_date(value)
                            content = re.sub(rf'\(due:{re.escape(value)}\)', f'(due:{new_value})', content)
                    if key == 'progress' and not re.match(r'^\d{1,3}%$', value):
                        new_value = correct_progress(value)
                        content = re.sub(rf'\(progress:{re.escape(value)}\)', f'(progress:{new_value})', content)

                corrected_line = f"{indent}- [{completed}] {content}\n"
                corrected_lines.append(corrected_line)
            else:
                corrected_lines.append(line)
        else:
            print(f"Line {line_number} does not match task, note, or area format: {line.strip()}")
            action = input("Type 'delete' to remove this line, 'keep' to keep as-is, or enter corrected line: ")
            if action == 'delete':
                continue
            elif action == 'keep':
                corrected_lines.append(line)
            else:
                corrected_lines.append(f"{action}\n")

    with open(file_path, 'w') as file:
        file.writelines(corrected_lines)

    print("Syntax checking and corrections completed.")

if __name__ == '__main__':
    check_and_correct_syntax('tasks.txt')
