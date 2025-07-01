#!/usr/bin/env python3
"""
Test script for the 3 AM boundary logic for recurring tasks.
This tests that tasks completed between midnight and 3 AM count for the previous day.
"""

from datetime import datetime, date, timedelta
from app import get_adjusted_date, get_adjusted_today, parse_recurring_status_log, get_recurring_task_compliance_data

def test_3am_boundary():
    """Test the 3 AM boundary logic"""
    print("=== Testing 3 AM Boundary Logic ===\n")
    
    # Test the basic adjustment function
    print("1. Testing get_adjusted_date function:")
    test_cases = [
        datetime(2025, 7, 1, 0, 30),   # 12:30 AM - should be previous day
        datetime(2025, 7, 1, 1, 30),   # 1:30 AM - should be previous day  
        datetime(2025, 7, 1, 2, 59),   # 2:59 AM - should be previous day
        datetime(2025, 7, 1, 3, 0),    # 3:00 AM - should be same day
        datetime(2025, 7, 1, 3, 1),    # 3:01 AM - should be same day
        datetime(2025, 7, 1, 15, 30),  # 3:30 PM - should be same day
        datetime(2025, 7, 1, 23, 59),  # 11:59 PM - should be same day
    ]
    
    for test_dt in test_cases:
        adjusted = get_adjusted_date(test_dt)
        expected_day = "previous" if test_dt.hour < 3 else "same"
        print(f"  {test_dt.strftime('%Y-%m-%d %H:%M')} -> {adjusted} ({expected_day} day)")
    
    print(f"\n2. Current adjusted today: {get_adjusted_today()}")
    print(f"   Current actual today:   {date.today()}")
    print(f"   Current time:           {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Test if we can parse the recurring status log with the new logic
    print("\n3. Testing recurring status log parsing:")
    try:
        status_data = parse_recurring_status_log()
        print(f"   Successfully parsed {len(status_data)} task status histories")
        
        # Show a sample of the data
        for task_id, entries in list(status_data.items())[:3]:
            print(f"   Task {task_id}: {len(entries)} entries")
            for log_date, status, timestamp in entries[-2:]:  # Show last 2 entries
                print(f"     {timestamp.strftime('%Y-%m-%d %H:%M:%S')} -> {log_date} ({status})")
                
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test compliance data calculation
    print("\n4. Testing compliance data calculation:")
    try:
        compliance_data = get_recurring_task_compliance_data()
        print(f"   Successfully calculated compliance data for {len(compliance_data)} days")
        
        # Show recent data
        for entry in compliance_data[-5:]:  # Show last 5 days
            print(f"   {entry['date']}: {entry['completed']}/{entry['total']} tasks ({entry['compliance_pct']}%)")
            
    except Exception as e:
        print(f"   Error: {e}")

if __name__ == "__main__":
    test_3am_boundary()
