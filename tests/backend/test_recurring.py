#!/usr/bin/env python3

# Test the recurring tasks parsing
import sys
import os

# Add the project root to Python path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../'))
sys.path.insert(0, project_root)

from dashboard.backend.parser import parse_recurring_tasks

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
