#!/usr/bin/env python3

# Test the edit function
import sys
sys.path.append('/Users/ethan/working_files/NOTES/todo_auto/dashboard/backend')

from app import EditTaskRequest, edit_task

# Create a mock request to test editing
class MockRequest:
    def __init__(self, **kwargs):
        for key, value in kwargs.items():
            setattr(self, key, value)

# Test editing a task (you'll need to get a real task ID from your tasks)
try:
    # First, let's see what tasks exist by parsing them
    from parser import parse_tasks_raw
    
    raw_tasks = parse_tasks_raw()
    print("Available tasks for testing:")
    
    # Find some tasks to edit
    task_count = 0
    for item in raw_tasks:
        if item['type'] == 'area':
            for task in item['tasks']:
                if task_count < 3:  # Show first 3 tasks
                    print(f"  ID: {task['id']}")
                    print(f"  Description: {task['description']}")
                    print(f"  Area: {task['area']}")
                    print(f"  Completed: {task['completed']}")
                    print()
                    task_count += 1
    
    if task_count > 0:
        print("You can test the edit function by using one of these task IDs")
    else:
        print("No tasks found to test with")
        
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
