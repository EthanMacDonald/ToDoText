#!/usr/bin/env python3
"""
Test subtask creation with onhold field
"""

import requests
import json

API_URL = "http://localhost:8000"

def test_create_task_then_subtask_with_onhold():
    """Test creating a task and then adding a subtask with onhold field"""
    print("Testing subtask creation with onhold field...")
    
    # First create a parent task
    parent_payload = {
        "area": "TESTING",
        "description": "Parent task for onhold subtask test"
    }
    
    try:
        response = requests.post(f"{API_URL}/tasks/create", json=parent_payload)
        if response.status_code != 200:
            print(f"❌ Failed to create parent task: {response.status_code}")
            return False
        
        print("✅ Created parent task")
        
        # Get the tasks to find the parent task ID
        response = requests.get(f"{API_URL}/tasks")
        if response.status_code != 200:
            print(f"❌ Failed to retrieve tasks: {response.status_code}")
            return False
        
        tasks_data = response.json()
        parent_task_id = None
        
        # Find our parent task
        def find_task_in_groups(groups, description):
            for group in groups:
                if isinstance(group, dict) and 'tasks' in group:
                    for task in group['tasks']:
                        if task.get('description') == description:
                            return task.get('id')
                        # Check subtasks too
                        if task.get('subtasks'):
                            for subtask in task['subtasks']:
                                if subtask.get('description') == description:
                                    return subtask.get('id')
            return None
        
        parent_task_id = find_task_in_groups(tasks_data, "Parent task for onhold subtask test")
        
        if not parent_task_id:
            print("❌ Could not find parent task ID")
            return False
        
        print(f"✅ Found parent task ID: {parent_task_id}")
        
        # Now create subtask with onhold field
        subtask_payload = {
            "area": "TESTING",
            "description": "Subtask with onhold condition",
            "onhold": "2025-08-15",
            "priority": "B",
            "notes": ["This subtask is on hold until August"]
        }
        
        response = requests.post(f"{API_URL}/tasks/{parent_task_id}/subtasks", json=subtask_payload)
        if response.status_code == 200:
            print("✅ Successfully created subtask with onhold field")
            return True
        else:
            print(f"❌ Failed to create subtask with onhold: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend server. Make sure it's running on port 8000.")
        return False
    except Exception as e:
        print(f"❌ Error during test: {e}")
        return False

if __name__ == "__main__":
    print("=== Testing Subtask Creation with onhold Field ===")
    success = test_create_task_then_subtask_with_onhold()
    
    if success:
        print("\n✅ Subtask creation with onhold field is working correctly!")
    else:
        print("\n❌ Subtask creation with onhold field test failed.")
