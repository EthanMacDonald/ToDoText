#!/usr/bin/env python3
"""Test script to verify onhold field functionality through the API."""

import requests
import json
from datetime import datetime, timedelta

API_URL = "http://localhost:8000"

def test_create_task_with_onhold():
    """Test creating a task with onhold field."""
    
    # Test data
    test_task = {
        "area": "Testing",
        "description": "Test task with onhold field",
        "priority": "B",
        "onhold": "2024-12-31"  # Date in the future
    }
    
    print("Testing task creation with onhold field...")
    print(f"Payload: {json.dumps(test_task, indent=2)}")
    
    try:
        response = requests.post(f"{API_URL}/tasks/create", json=test_task)
        print(f"Response status: {response.status_code}")
        
        if response.ok:
            result = response.json()
            print(f"Success! Task created: {json.dumps(result, indent=2)}")
            
            # Get the task ID to edit it
            task_id = result.get('id') or result.get('task_id')
            
            if task_id:
                print(f"\nTesting task edit with onhold field for task {task_id}...")
                
                edit_payload = {
                    "area": "Testing", 
                    "description": "Test task with onhold field - EDITED",
                    "onhold": "waiting for approval"  # Text condition
                }
                
                edit_response = requests.put(f"{API_URL}/tasks/{task_id}", json=edit_payload)
                print(f"Edit response status: {edit_response.status_code}")
                
                if edit_response.ok:
                    edit_result = edit_response.json()
                    print(f"Edit success! {json.dumps(edit_result, indent=2)}")
                else:
                    print(f"Edit failed: {edit_response.text}")
                
                # Get current tasks to see the onhold grouping
                print(f"\nGetting all tasks to verify onhold grouping...")
                tasks_response = requests.get(f"{API_URL}/tasks")
                
                if tasks_response.ok:
                    tasks_data = tasks_response.json()
                    print("Current task groups:")
                    for group_name, tasks in tasks_data.items():
                        if isinstance(tasks, list) and tasks:
                            print(f"  {group_name}: {len(tasks)} tasks")
                            if group_name.lower() == "on hold":
                                print(f"    On Hold tasks found: {[t.get('description', 'No description') for t in tasks]}")
                else:
                    print(f"Failed to get tasks: {tasks_response.text}")
            
        else:
            print(f"Failed to create task: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"Error connecting to API: {e}")
        print("Make sure the backend server is running on http://localhost:8000")

def test_subtask_with_onhold():
    """Test creating a subtask with onhold field."""
    
    print("\n" + "="*50)
    print("Testing subtask creation with onhold field...")
    
    # First create a parent task
    parent_task = {
        "area": "Testing",
        "description": "Parent task for subtask test"
    }
    
    try:
        response = requests.post(f"{API_URL}/tasks/create", json=parent_task)
        if response.ok:
            result = response.json()
            parent_id = result.get('id') or result.get('task_id')
            print(f"Parent task created with ID: {parent_id}")
            
            # Now create a subtask with onhold
            subtask_data = {
                "description": "Test subtask with onhold",
                "notes": ["This is a test subtask"],
                "onhold": "2024-12-25"  # Christmas hold
            }
            
            print(f"Creating subtask with onhold: {json.dumps(subtask_data, indent=2)}")
            
            subtask_response = requests.post(f"{API_URL}/tasks/{parent_id}/subtasks", json=subtask_data)
            print(f"Subtask response status: {subtask_response.status_code}")
            
            if subtask_response.ok:
                subtask_result = subtask_response.json()
                print(f"Subtask created successfully: {json.dumps(subtask_result, indent=2)}")
            else:
                print(f"Subtask creation failed: {subtask_response.text}")
        else:
            print(f"Failed to create parent task: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"Error in subtask test: {e}")

if __name__ == "__main__":
    print("=" * 50)
    print("ONHOLD FIELD UI VERIFICATION TEST")
    print("=" * 50)
    
    test_create_task_with_onhold()
    test_subtask_with_onhold()
    
    print("\n" + "=" * 50)
    print("Test complete! Check the dashboard UI to verify the onhold field is visible and working.")
    print("The tasks created should appear in the 'On Hold' section if the backend is working correctly.")
    print("=" * 50)
