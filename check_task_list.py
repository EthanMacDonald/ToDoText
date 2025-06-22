# check_syntax.py

import re
import datetime

# Syntax checking function with error reporting and note handling
def check_syntax(file_path):
    line_number = 0

    valid_keys = ['priority', 'due', 'progress', 'rec', 'done']

    with open(file_path, 'r') as file:
        lines = file.readlines()

    for idx, line in enumerate(lines):
        line_number += 1
        stripped = line.rstrip()
        if not stripped:
            continue

        area_match = re.match(r'^(\S.+):$', stripped)
        task_match = re.match(r'^(\s*)- \[( |x)\] (.+)', line)
        note_match = re.match(r'^\s+[^-\[].+', line)

        if area_match or task_match or note_match:
            if task_match:
                indent, completed, content = task_match.groups()
                meta_matches = re.findall(r'\(([^:]+):([^\s\)]+)\)', content)

                for key, value in meta_matches:
                    key, value = key.strip(), value.strip()
                    if key not in valid_keys:
                        print(f"Line {line_number}: Invalid metadata key '{key}'. Suggestion: use one of {valid_keys}.")

                    if key == 'priority' and not re.match(r'^[A-Z]$', value):
                        print(f"Line {line_number}: Invalid priority '{value}'. Suggestion: use a single uppercase letter (A-Z).")
                    if key == 'due':
                        try:
                            datetime.datetime.strptime(value, '%Y-%m-%d')
                        except ValueError:
                            print(f"Line {line_number}: Invalid due date '{value}'. Suggestion: use format YYYY-MM-DD.")
                    if key == 'progress' and not re.match(r'^\d{1,3}%$', value):
                        print(f"Line {line_number}: Invalid progress '{value}'. Suggestion: use a percentage between 0% and 100%.")
        else:
            print(f"Line {line_number}: Does not match task, note, or area format. Suggestion: Ensure line starts with '-', '[ ]' or '[x]', or is properly indented as a note.")

if __name__ == '__main__':
    check_syntax('tasks.txt')
