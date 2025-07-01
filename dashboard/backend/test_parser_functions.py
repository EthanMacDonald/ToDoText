#!/usr/bin/env python3

"""
Direct test of parser functions for delete task and add subtask functionality
"""

import sys
import os
sys.path.append('/Users/ethan/working_files/NOTES/todo_auto/dashboard/backend')

from parser import delete_task, create_subtask_for_task, parse_tasks

# Simple mock request class for testing
class MockSubtaskRequest:
    def __init__(self, description, notes=None):
        self.description = description
        self.notes = notes or []
        self.priority = None
        self.due_date = None
        self.recurring = None
        self.project = None
        self.context = None

def get_all_tasks_flat(grouped_tasks):
    """Extract all tasks from grouped structure into a flat list"""
    all_tasks = []
    for group in grouped_tasks:
        if 'tasks' in group:
            for task in group['tasks']:
                all_tasks.append(task)
                # Also add subtasks
                if 'subtasks' in task:
                    all_tasks.extend(task['subtasks'])
    return all_tasks

def test_delete_functionality():
    """Test the delete task functionality"""
    print("Testing delete task functionality...")
    
    # Read current tasks
    grouped_tasks = parse_tasks()
    all_tasks = get_all_tasks_flat(grouped_tasks)
    initial_count = len(all_tasks)
    print(f"Initial task count: {initial_count}")
    
    if initial_count == 0:
        print("❌ No tasks to test delete functionality")
        return False
    
    # Find the first task to delete
    first_task = all_tasks[0]
    task_id = first_task['id']
    print(f"Attempting to delete task ID: {task_id} - '{first_task['description']}'")
    
    # Create backup of tasks.txt
    import shutil
    shutil.copy('/Users/ethan/working_files/NOTES/todo_auto/tasks.txt', 
                '/Users/ethan/working_files/NOTES/todo_auto/tasks_backup.txt')
    
    try:
        # Delete the task
        result = delete_task(task_id)
        if result:
            # Verify the task was deleted
            updated_grouped_tasks = parse_tasks()
            updated_all_tasks = get_all_tasks_flat(updated_grouped_tasks)
            final_count = len(updated_all_tasks)
            
            if final_count < initial_count:
                print("✅ Delete task test passed!")
                print(f"   Task count reduced from {initial_count} to {final_count}")
                return True
            else:
                print(f"❌ Delete task test failed: expected less than {initial_count} tasks, got {final_count}")
                return False
        else:
            print("❌ Delete task function returned False")
            return False
            
    except Exception as e:
        print(f"❌ Delete task test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        # Restore backup
        shutil.move('/Users/ethan/working_files/NOTES/todo_auto/tasks_backup.txt',
                    '/Users/ethan/working_files/NOTES/todo_auto/tasks.txt')

def test_add_subtask_functionality():
    """Test the add subtask functionality"""
    print("Testing add subtask functionality...")
    
    # Read current tasks
    grouped_tasks = parse_tasks()
    all_tasks = get_all_tasks_flat(grouped_tasks)
    
    if len(all_tasks) == 0:
        print("❌ No tasks to test add subtask functionality")
        return False
    
    # Find a task without subtasks to add to (or use first task)
    parent_task = None
    for task in all_tasks:
        if not task.get('subtasks') or len(task.get('subtasks', [])) == 0:
            parent_task = task
            break
    
    if not parent_task:
        parent_task = all_tasks[0]  # Use first task if all have subtasks
    
    parent_id = parent_task['id']
    print(f"Adding subtask to task ID: {parent_id} - '{parent_task['description']}'")
    
    # Create backup of tasks.txt
    import shutil
    shutil.copy('/Users/ethan/working_files/NOTES/todo_auto/tasks.txt', 
                '/Users/ethan/working_files/NOTES/todo_auto/tasks_backup.txt')
    
    try:
        # Add subtask
        subtask_description = "Test subtask from automated test"
        subtask_notes = ["This is a test note", "Added by automated test"]
        
        # Create a mock request object
        subtask_request = MockSubtaskRequest(subtask_description, subtask_notes)
        
        result = create_subtask_for_task(parent_id, subtask_request)
        
        if result:
            # Verify the subtask was added
            updated_grouped_tasks = parse_tasks()
            updated_all_tasks = get_all_tasks_flat(updated_grouped_tasks)
            
            # Find the parent task in updated tasks
            parent_task_updated = None
            for task in updated_all_tasks:
                if task['id'] == parent_id:
                    parent_task_updated = task
                    break
            
            if parent_task_updated and parent_task_updated.get('subtasks'):
                # Check if our subtask was added
                added_subtask = None
                for subtask in parent_task_updated['subtasks']:
                    if subtask['description'] == subtask_description:
                        added_subtask = subtask
                        break
                
                if added_subtask:
                    print("✅ Add subtask test passed!")
                    print(f"   Added subtask: {added_subtask['description']}")
                    if added_subtask.get('notes'):
                        print(f"   With notes: {[note['content'] for note in added_subtask['notes']]}")
                    return True
                else:
                    print("❌ Add subtask test failed: subtask not found in parent")
                    print(f"   Parent subtasks: {[st['description'] for st in parent_task_updated['subtasks']]}")
                    return False
            else:
                print("❌ Add subtask test failed: no subtasks found in parent task")
                return False
        else:
            print("❌ Add subtask function returned False")
            return False
            
    except Exception as e:
        print(f"❌ Add subtask test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        # Restore backup
        shutil.move('/Users/ethan/working_files/NOTES/todo_auto/tasks_backup.txt',
                    '/Users/ethan/working_files/NOTES/todo_auto/tasks.txt')

def main():
    print("Testing delete and add subtask functionality directly...")
    print("=" * 60)
    
    # Test both functions
    subtask_success = test_add_subtask_functionality()
    print()
    delete_success = test_delete_functionality()
    
    print()
    print("=" * 60)
    if delete_success and subtask_success:
        print("✅ All tests passed!")
        sys.exit(0)
    else:
        print("❌ Some tests failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()
