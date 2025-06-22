# check_syntax.py

import re
import datetime

# Syntax checking function
def check_syntax(file_path):
    errors = []
    current_area = None
    line_number = 0

    with open(file_path, 'r') as file:
        for line in file:
            line_number += 1
            stripped = line.rstrip()
            if not stripped:
                continue

            area_match = re.match(r'^(\S.+):$', stripped)
            task_match = re.match(r'^(\s*)- \[( |x)\] (.+)', line)

            if area_match:
                current_area = area_match.group(1)
                continue

            if task_match:
                indent, completed, content = task_match.groups()

                # Check for malformed metadata
                for meta in re.findall(r'\((\w+):(.*?)\)', content):
                    key, value = meta
                    if key == 'priority' and not re.match(r'^[A-Z]$', value):
                        errors.append((line_number, f"Invalid priority format: {value}"))
                    if key == 'due':
                        try:
                            datetime.datetime.strptime(value, '%Y-%m-%d')
                        except ValueError:
                            errors.append((line_number, f"Invalid date format for due date: {value}"))
                    if key == 'progress' and not re.match(r'^\d{1,3}%$', value):
                        errors.append((line_number, f"Invalid progress format: {value}"))
            else:
                errors.append((line_number, "Line does not match task or area format"))

    if errors:
        print("Syntax errors found:")
        for line_num, error in errors:
            print(f"Line {line_num}: {error}")
    else:
        print("No syntax errors found.")

if __name__ == '__main__':
    check_syntax('tasks.txt')
