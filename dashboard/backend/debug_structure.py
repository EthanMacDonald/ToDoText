#!/usr/bin/env python3

import sys
sys.path.append('/Users/ethan/working_files/NOTES/todo_auto/dashboard/backend')

from parser import parse_recurring_tasks

try:
    tasks = parse_recurring_tasks()
    print(f"Found {len(tasks)} items from parse_recurring_tasks()")
    
    for i, item in enumerate(tasks[:5]):  # Show first 5 items
        print(f"\nItem {i+1}:")
        print(f"  Type: {item.get('type', 'unknown')}")
        if item.get('type') == 'area':
            print(f"  Area: {item.get('area', 'unknown')}")
            print(f"  Tasks in area: {len(item.get('tasks', []))}")
        else:
            print(f"  Description: {item.get('description', 'unknown')}")
            print(f"  Recurring: {item.get('recurring', 'unknown')}")
            
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
