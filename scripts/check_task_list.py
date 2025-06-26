# check_syntax.py

import re
import datetime

# Syntax checking function with error reporting, note handling, and spacing check
def check_syntax(file_path):
    line_number = 0
    valid_keys = ['priority', 'due', 'progress', 'rec', 'done']

    with open(file_path, 'r') as file:
        lines = file.readlines()

    indent_stack = []

    for idx, line in enumerate(lines):
        line_number += 1
        stripped = line.rstrip()
        if not stripped:
            continue

        area_match = re.match(r'^(\s*)(\S.+):$', line)
        task_match = re.match(r'^(\s*)- \[( |x)\] (.+)', line)
        note_match = re.match(r'^(\s+)[^-\[].+', line)

        if area_match:
            area_indent = len(area_match.group(1))
            indent_stack = [area_indent]

        elif task_match:
            indent, completed, content = task_match.groups()
            current_indent = len(indent)

            while len(indent_stack) > 1 and current_indent <= indent_stack[-1]:
                indent_stack.pop()

            expected_indent = indent_stack[-1] + 4

            if current_indent != expected_indent:
                if current_indent < expected_indent:
                    print(f"Line {line_number}: Task under-indented. Should be indented exactly 4 spaces from its parent.")
                else:
                    print(f"Line {line_number}: Task over-indented. Should be indented exactly 4 spaces from its parent.")

            if current_indent % 4 != 0:
                print(f"Line {line_number}: Incorrect indentation spacing. Suggestion: Use multiples of 4 spaces.")

            indent_stack.append(current_indent)

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

        elif note_match:
            indent = note_match.group(1)
            current_indent = len(indent)

            if not indent_stack or current_indent <= indent_stack[-1]:
                print(f"Line {line_number}: Note indentation error. Should be indented further than its parent task.")

            if current_indent % 4 != 0:
                print(f"Line {line_number}: Incorrect indentation spacing for note. Suggestion: Use multiples of 4 spaces.")

        else:
            print(f"Line {line_number}: Does not match task, note, or area format. Suggestion: Ensure line starts with '-', '[ ]' or '[x]', or is properly indented as a note.")

if __name__ == '__main__':
    check_syntax('../tasks.txt')
