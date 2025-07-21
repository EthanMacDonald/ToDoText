#!/usr/bin/env python3

import sys
sys.path.append('/Users/ethan/working_files/NOTES/todo_auto/dashboard/backend')

from app import get_recurring_tasks_by_filter
from datetime import datetime

def debug_filtering():
    print("=== Debug Recurring Task Filtering Internal ===")
    print(f"Today: {datetime.now().strftime('%A, %Y-%m-%d')}")
    print()
    
    try:
        print("Testing 'all' filter internally...")
        all_tasks = get_recurring_tasks_by_filter("all")
        print(f"All filter returned: {len(all_tasks)} areas")
        
        for area in all_tasks:
            if area.get('type') == 'area':
                print(f"Area: {area.get('area')} - {len(area.get('tasks', []))} tasks")
        
        print("\nTesting 'today' filter internally...")
        today_tasks = get_recurring_tasks_by_filter("today")
        print(f"Today filter returned: {len(today_tasks)} areas")
        
        for area in today_tasks:
            if area.get('type') == 'area':
                print(f"Area: {area.get('area')} - {len(area.get('tasks', []))} tasks")
                for task in area.get('tasks', [])[:2]:  # Show first 2 tasks
                    print(f"  - {task.get('description', '')[:40]}... (recurring: {task.get('recurring', '')})")
    
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_filtering()
