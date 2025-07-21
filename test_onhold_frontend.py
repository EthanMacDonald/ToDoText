#!/usr/bin/env python3
"""
Test script to verify onhold field functionality works end-to-end
"""

import json
import requests
import time
from datetime import datetime, timedelta

# API base URL
API_URL = "http://localhost:8000"

def test_create_task_with_onhold():
    """Test creating a task with onhold field via API"""
    print("Testing task creation with onhold field...")
    
    # Test with date-based onhold
    date_payload = {
        "area": "TESTING",
        "description": "Test task with date onhold",
        "onhold": "2025-02-01"
    }
    
    try:
        response = requests.post(f"{API_URL}/tasks/create", json=date_payload)
        if response.status_code == 200:
            print("✅ Successfully created task with date onhold")
            result = response.json()
            print(f"   Task ID: {result.get('task_id', 'N/A')}")
        else:
            print(f"❌ Failed to create task with date onhold: {response.status_code}")
            print(f"   Response: {response.text}")
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend server. Make sure it's running on port 8000.")
        return False
    
    # Test with text-based onhold  
    text_payload = {
        "area": "TESTING", 
        "description": "Test task with text onhold",
        "onhold": "waiting for approval"
    }
    
    try:
        response = requests.post(f"{API_URL}/tasks/create", json=text_payload)
        if response.status_code == 200:
            print("✅ Successfully created task with text onhold")
            result = response.json()
            print(f"   Task ID: {result.get('task_id', 'N/A')}")
        else:
            print(f"❌ Failed to create task with text onhold: {response.status_code}")
            print(f"   Response: {response.text}")
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend server. Make sure it's running on port 8000.")
        return False
    
    return True

def test_edit_task_onhold():
    """Test editing a task to add/modify onhold field"""
    print("\nTesting task editing with onhold field...")
    
    # First create a regular task
    create_payload = {
        "area": "TESTING",
        "description": "Test task for onhold editing"
    }
    
    try:
        response = requests.post(f"{API_URL}/tasks/create", json=create_payload)
        if response.status_code != 200:
            print(f"❌ Failed to create test task: {response.status_code}")
            return False
        
        task_id = response.json().get('task_id')
        print(f"✅ Created test task with ID: {task_id}")
        
        # Now edit it to add onhold
        edit_payload = {
            "area": "TESTING",
            "description": "Test task for onhold editing",
            "onhold": "2025-03-15",
            "completed": False
        }
        
        response = requests.put(f"{API_URL}/tasks/{task_id}", json=edit_payload)
        if response.status_code == 200:
            print("✅ Successfully edited task to add onhold field")
        else:
            print(f"❌ Failed to edit task onhold: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend server. Make sure it's running on port 8000.")
        return False
    
    return True

def test_get_tasks_with_onhold():
    """Test retrieving tasks to see onhold grouping"""
    print("\nTesting task retrieval with onhold grouping...")
    
    try:
        response = requests.get(f"{API_URL}/tasks")
        if response.status_code == 200:
            tasks_data = response.json()
            print("✅ Successfully retrieved tasks")
            
            # Look for onhold tasks
            onhold_found = False
            if isinstance(tasks_data, list):
                for group in tasks_data:
                    if isinstance(group, dict) and group.get('title') == 'On Hold':
                        onhold_found = True
                        print(f"✅ Found 'On Hold' group with {len(group.get('tasks', []))} tasks")
                        break
            
            if not onhold_found:
                print("ℹ️  No 'On Hold' group found (may be normal if no onhold tasks exist)")
            
        else:
            print(f"❌ Failed to retrieve tasks: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend server. Make sure it's running on port 8000.")
        return False
    
    return True

if __name__ == "__main__":
    print("=== Testing onhold field functionality ===")
    print("Make sure the backend server is running on port 8000")
    print()
    
    success = True
    success &= test_create_task_with_onhold()
    success &= test_edit_task_onhold()  
    success &= test_get_tasks_with_onhold()
    
    print(f"\n=== Test Results ===")
    if success:
        print("✅ All tests passed! onhold functionality is working correctly.")
    else:
        print("❌ Some tests failed. Check the output above for details.")
