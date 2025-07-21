#!/usr/bin/env python3

# Simple test to debug the recurring task filtering
import requests
import json
from datetime import datetime

def test_debug():
    base_url = "http://localhost:8000"
    
    print("=== Debug Recurring Task Filtering ===")
    print(f"Today: {datetime.now().strftime('%A, %Y-%m-%d')}")
    print(f"Weekday: {datetime.now().weekday()} (Monday=0, Sunday=6)")
    print()
    
    # Test with today filter
    print("Testing 'today' filter...")
    response = requests.get(f"{base_url}/recurring?filter=today")
    
    if response.status_code == 200:
        data = response.json()
        print(f"Response: {len(data)} items")
        
        if len(data) == 0:
            print("Empty response - let's check 'all' filter...")
            
            response_all = requests.get(f"{base_url}/recurring?filter=all")
            if response_all.status_code == 200:
                all_data = response_all.json()
                
                # Count daily and Sunday tasks
                daily_count = 0
                sunday_count = 0
                
                for task in all_data:
                    if task.get('recurring') == 'daily':
                        daily_count += 1
                        print(f"Daily task found: {task.get('description', '')[:50]}...")
                    elif task.get('recurring') == 'weekly:Sun':
                        sunday_count += 1
                        print(f"Sunday task found: {task.get('description', '')[:50]}...")
                
                print(f"\nFound {daily_count} daily tasks and {sunday_count} Sunday weekly tasks")
                print("These should be showing in the 'today' filter.")
    else:
        print(f"Error: {response.status_code} - {response.text}")

if __name__ == "__main__":
    test_debug()
