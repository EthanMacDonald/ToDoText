#!/usr/bin/env python3

# Test the recurring tasks parsing
import sys
sys.path.append('/Users/ethan/working_files/NOTES/todo_auto/dashboard/backend')

from parser import parse_recurring_tasks

try:
    recurring_tasks = parse_recurring_tasks()
    print(f"Found {len(recurring_tasks)} recurring task groups:")
    
    for group in recurring_tasks:
        if group['type'] == 'area':
            print(f"\nArea: {group['area']}")
            print(f"  Tasks: {len(group['tasks'])}")
            for i, task in enumerate(group['tasks'][:3]):  # Show first 3 tasks
                print(f"    {i+1}. {task['description']}")
                print(f"       Recurring: {task['recurring']}")
                print(f"       ID: {task['id']}")
        
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
