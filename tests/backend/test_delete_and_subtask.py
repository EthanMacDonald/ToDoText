#!/usr/bin/env python3

"""
Test script for delete task and add subtask functionality
"""

import requests
import json
import sys

BASE_URL = "http://localhost:5000"

def test_delete_task():
    """Test deleting a task"""
    print("Testing delete task functionality...")
    
    # First, create a test task to delete
    create_data = {
        "description": "Test task to delete",
        "area": "Test",
        "priority": "F",
        "notes": ["This is a test task that will be deleted"]
    }
    
    try:
        # Create task
        response = requests.post(f"{BASE_URL}/tasks", json=create_data)
        if response.status_code != 200:
            print(f"Failed to create test task: {response.text}")
            return False
            
        task_data = response.json()
        task_id = task_data.get('id')
        print(f"Created test task with ID: {task_id}")
        
        # Delete task
        response = requests.delete(f"{BASE_URL}/tasks/{task_id}")
        if response.status_code == 200:
            print("✅ Delete task test passed!")
            return True
        else:
            print(f"❌ Delete task test failed: {response.text}")
            return False
            
    except requests.ConnectionError:
        print("❌ Backend server not running. Please start it first.")
        return False
    except Exception as e:
        print(f"❌ Delete task test failed with error: {e}")
        return False

def test_add_subtask():
    """Test adding a subtask to an existing task"""
    print("Testing add subtask functionality...")
    
    # First, create a parent task
    create_data = {
        "description": "Parent task for subtask test",
        "area": "Test",
        "priority": "F",
        "notes": []
    }
    
    try:
        # Create parent task
        response = requests.post(f"{BASE_URL}/tasks", json=create_data)
        if response.status_code != 200:
            print(f"Failed to create parent task: {response.text}")
            return False
            
        parent_data = response.json()
        parent_id = parent_data.get('id')
        print(f"Created parent task with ID: {parent_id}")
        
        # Add subtask
        subtask_data = {
            "description": "Test subtask",
            "notes": ["This is a test subtask", "With multiple notes"]
        }
        
        response = requests.post(f"{BASE_URL}/tasks/{parent_id}/subtasks", json=subtask_data)
        if response.status_code == 200:
            print("✅ Add subtask test passed!")
            
            # Clean up - delete the parent task (which should also delete the subtask)
            requests.delete(f"{BASE_URL}/tasks/{parent_id}")
            return True
        else:
            print(f"❌ Add subtask test failed: {response.text}")
            # Clean up
            requests.delete(f"{BASE_URL}/tasks/{parent_id}")
            return False
            
    except requests.ConnectionError:
        print("❌ Backend server not running. Please start it first.")
        return False
    except Exception as e:
        print(f"❌ Add subtask test failed with error: {e}")
        return False

def main():
    print("Testing delete and add subtask functionality...")
    print("=" * 50)
    
    # Test both functions
    delete_success = test_delete_task()
    print()
    subtask_success = test_add_subtask()
    
    print()
    print("=" * 50)
    if delete_success and subtask_success:
        print("✅ All tests passed!")
        sys.exit(0)
    else:
        print("❌ Some tests failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()
