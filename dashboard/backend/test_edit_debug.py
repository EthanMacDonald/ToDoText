#!/usr/bin/env python3

# Test the edit function with debug output
import sys
sys.path.append('/Users/ethan/working_files/NOTES/todo_auto/dashboard/backend')

from parser import parse_tasks_raw, edit_task

# Create a mock request to test editing
class MockRequest:
    def __init__(self, **kwargs):
        for key, value in kwargs.items():
            setattr(self, key, value)

try:
    # First, let's see what tasks exist by parsing them
    raw_tasks = parse_tasks_raw()
    print("Available tasks for testing:")
    
    # Find the first task to edit
    test_task = None
    for item in raw_tasks:
        if item['type'] == 'area':
            for task in item['tasks']:
                if not task['completed']:  # Find an incomplete task
                    test_task = task
                    break
            if test_task:
                break
    
    if test_task:
        print(f"Found test task:")
        print(f"  ID: {test_task['id']}")
        print(f"  Description: {test_task['description']}")
        print(f"  Area: {test_task['area']}")
        print(f"  Context: {test_task['context']}")
        print()
        
        # Create a mock edit request
        edit_request = MockRequest(
            task_id=test_task['id'],
            area=test_task['area'],
            description=test_task['description'],
            priority=test_task['priority'],
            due_date=test_task['due_date'],
            context="TestContext",  # Add a test context
            project=test_task['project'],
            recurring=test_task['recurring'],
            completed=test_task['completed']
        )
        
        print("Testing edit with new context...")
        result = edit_task(edit_request)
        print(f"Edit result: {result}")
    else:
        print("No tasks found to test with")
        
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
