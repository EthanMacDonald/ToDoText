#!/usr/bin/env python3

import requests
import json
import sys
import os

# Add the project root to Python path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../'))
sys.path.insert(0, project_root)

from dashboard.backend.parser import parse_tasks_raw

try:
    # Get a task to edit
    raw_tasks = parse_tasks_raw()
    test_task = None
    
    for item in raw_tasks:
        if item['type'] == 'area':
            for task in item['tasks']:
                if not task['completed']:
                    test_task = task
                    break
            if test_task:
                break
    
    if test_task:
        print(f"Testing HTTP edit endpoint with task:")
        print(f"  ID: {test_task['id']}")
        print(f"  Description: {test_task['description']}")
        print(f"  Area: {test_task['area']}")
        
        # Create the edit payload
        payload = {
            "area": test_task['area'],
            "description": test_task['description'],
            "priority": test_task['priority'] if test_task['priority'] else None,
            "due_date": test_task['due_date'] if test_task['due_date'] else None,
            "context": "HTTPTestContext",  # Add test context
            "project": test_task['project'] if test_task['project'] else None,
            "recurring": test_task['recurring'] if test_task['recurring'] else None,
            "completed": test_task['completed']
        }
        
        print(f"Payload: {json.dumps(payload, indent=2)}")
        
        # Make the HTTP request
        url = f"http://localhost:8000/tasks/{test_task['id']}"
        response = requests.put(url, json=payload, headers={'Content-Type': 'application/json'})
        
        print(f"Response status: {response.status_code}")
        print(f"Response text: {response.text}")
        
    else:
        print("No tasks found to test with")
        
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
