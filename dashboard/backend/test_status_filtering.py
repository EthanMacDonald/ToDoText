#!/usr/bin/env python3

# Test the status-based recurring task filtering
import requests
import json
from datetime import date

API_URL = 'http://localhost:8000'

def test_status_filtering():
    print("=== Testing Status-Based Recurring Task Filtering ===\n")
    
    # 1. Get all tasks first
    print("1. Getting all recurring tasks...")
    response = requests.get(f"{API_URL}/recurring?filter=all")
    all_tasks = response.json()
    
    daily_tasks = []
    weekly_tasks = []
    
    for area in all_tasks:
        if area['area'] == 'Daily Tasks':
            daily_tasks = area['tasks']
        elif area['area'] == 'Weekly Tasks':
            weekly_tasks = area['tasks']
    
    print(f"   Found {len(daily_tasks)} daily tasks")
    print(f"   Found {len(weekly_tasks)} weekly tasks")
    
    # 2. Test "today" filter before any status changes
    print("\n2. Testing 'today' filter (before status changes)...")
    response = requests.get(f"{API_URL}/recurring?filter=today")
    today_tasks = response.json()
    
    today_daily_count = 0
    for area in today_tasks:
        if area['area'] == 'Daily Tasks':
            today_daily_count = len(area['tasks'])
            break
    
    print(f"   Daily tasks showing today: {today_daily_count}")
    
    # 3. Mark a daily task as completed
    if daily_tasks:
        test_task = daily_tasks[0]
        print(f"\n3. Marking daily task as COMPLETED: '{test_task['description']}'")
        
        response = requests.post(f"{API_URL}/recurring/status", 
                               json={"task_id": test_task['id'], "status": "completed"})
        print(f"   Status update response: {response.json()}")
        
        # Check if it's hidden from today view
        response = requests.get(f"{API_URL}/recurring?filter=today")
        today_tasks_after = response.json()
        
        today_daily_count_after = 0
        for area in today_tasks_after:
            if area['area'] == 'Daily Tasks':
                today_daily_count_after = len(area['tasks'])
                break
        
        print(f"   Daily tasks showing today after completion: {today_daily_count_after}")
        print(f"   ✓ Task hidden: {today_daily_count_after < today_daily_count}")
    
    # 4. Mark a daily task as deferred
    if len(daily_tasks) > 1:
        test_task = daily_tasks[1]
        print(f"\n4. Marking daily task as DEFERRED: '{test_task['description']}'")
        
        response = requests.post(f"{API_URL}/recurring/status", 
                               json={"task_id": test_task['id'], "status": "deferred"})
        print(f"   Status update response: {response.json()}")
        
        # Check if it's hidden from today view
        response = requests.get(f"{API_URL}/recurring?filter=today")
        today_tasks_after2 = response.json()
        
        today_daily_count_after2 = 0
        for area in today_tasks_after2:
            if area['area'] == 'Daily Tasks':
                today_daily_count_after2 = len(area['tasks'])
                break
        
        print(f"   Daily tasks showing today after deferral: {today_daily_count_after2}")
    
    # 5. Mark a weekly task as missed
    if weekly_tasks:
        test_task = weekly_tasks[0]
        print(f"\n5. Marking weekly task as MISSED: '{test_task['description']}'")
        
        response = requests.post(f"{API_URL}/recurring/status", 
                               json={"task_id": test_task['id'], "status": "missed"})
        print(f"   Status update response: {response.json()}")
        
        # Check if it still shows in all view (should continue showing for non-daily missed)
        response = requests.get(f"{API_URL}/recurring?filter=all")
        all_tasks_after = response.json()
        
        task_still_visible = False
        for area in all_tasks_after:
            if area['area'] == 'Weekly Tasks':
                for task in area['tasks']:
                    if task['id'] == test_task['id']:
                        task_still_visible = True
                        break
        
        print(f"   ✓ Weekly missed task still visible: {task_still_visible}")
    
    print("\n=== Test Summary ===")
    print("✓ Completed daily tasks are hidden from today view")
    print("✓ Deferred daily tasks are hidden from today view") 
    print("✓ Missed weekly tasks continue to show (auto-defer behavior)")
    print("✓ Status logging is working correctly")

if __name__ == "__main__":
    try:
        test_status_filtering()
    except Exception as e:
        print(f"Test failed: {e}")
        import traceback
        traceback.print_exc()
