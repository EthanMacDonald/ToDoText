#!/usr/bin/env python3

import sys
import os
sys.path.append('/Users/ethan/working_files/NOTES/todo_auto/dashboard/backend')

from parser import toggle_task_in_lines, parse_tasks_raw

def test_indentation_preservation():
    """Test that toggle_task_in_lines preserves indentation correctly"""
    
    # Test data with different indentation levels
    test_lines = [
        "Work:\n",
        "- [ ] Top level task (priority:A due:2025-07-15) +Reports @Office\n",
        "    - [ ] First level subtask\n",
        "        - [ ] Second level subtask\n",
        "            - [ ] Third level subtask\n"
    ]
    
    # Test each indentation level
    test_cases = [
        {"indent_level": 0, "description": "Top level task", "area": "Work"},
        {"indent_level": 1, "description": "First level subtask", "area": "Work"},
        {"indent_level": 2, "description": "Second level subtask", "area": "Work"}, 
        {"indent_level": 3, "description": "Third level subtask", "area": "Work"}
    ]
    
    for test_case in test_cases:
        # Make a copy of the test lines
        lines_copy = test_lines.copy()
        
        print(f"Testing indent level {test_case['indent_level']}")
        print(f"Before: {repr(lines_copy[test_case['indent_level'] + 1])}")
        
        # Toggle the task
        success = toggle_task_in_lines(lines_copy, test_case)
        
        if success:
            print(f"After:  {repr(lines_copy[test_case['indent_level'] + 1])}")
            
            # Check that indentation is preserved
            original_indent = test_lines[test_case['indent_level'] + 1].split('- [')[0]
            new_indent = lines_copy[test_case['indent_level'] + 1].split('- [')[0]
            
            if original_indent == new_indent:
                print("✓ Indentation preserved correctly")
            else:
                print(f"✗ Indentation changed: '{original_indent}' -> '{new_indent}'")
        else:
            print("✗ Failed to toggle task")
        
        print()

if __name__ == "__main__":
    test_indentation_preservation()
