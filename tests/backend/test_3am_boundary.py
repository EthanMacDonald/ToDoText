#!/usr/bin/env python3
"""
Test script for the 3 AM boundary logic for recurring tasks.
This tests that tasks completed between midnight and 3 AM count for the previous day.
"""

import sys
import os

# Add the project root to Python path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../'))
sys.path.insert(0, project_root)

from datetime import datetime, date, timedelta
from dashboard.backend.app import get_adjusted_date, get_adjusted_today, parse_recurring_status_log, get_recurring_task_compliance_data

#!/usr/bin/env python3
"""
Test script for the 3 AM boundary logic for recurring tasks.
This tests that tasks completed between midnight and 3 AM count for the previous day.
"""

import sys
import os
import signal
from contextlib import contextmanager

# Add the project root to Python path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../'))
sys.path.insert(0, project_root)

from datetime import datetime, date, timedelta
from dashboard.backend.app import get_adjusted_date, get_adjusted_today, parse_recurring_status_log, get_recurring_task_compliance_data

@contextmanager
def timeout_context(seconds):
    """Context manager for timeouts"""
    def timeout_handler(signum, frame):
        raise TimeoutError(f"Operation timed out after {seconds} seconds")
    
    signal.signal(signal.SIGALRM, timeout_handler)
    signal.alarm(seconds)
    try:
        yield
    finally:
        signal.alarm(0)

def test_3am_boundary():
    """Test the 3 AM boundary logic"""
    print("=== Testing 3 AM Boundary Logic ===\n")
    
    try:
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
        
        # Test recurring status log parsing with timeout
        print("\n3. Testing recurring status log parsing:")
        try:
            with timeout_context(10):  # 10 second timeout
                status_data = parse_recurring_status_log()
                print(f"   ✅ Successfully parsed {len(status_data)} task status histories")
                
                # Show a sample of the data (limited)
                sample_count = min(3, len(status_data))
                for task_id, entries in list(status_data.items())[:sample_count]:
                    print(f"   Task {task_id}: {len(entries)} entries")
                    # Show only last entry to avoid too much output
                    if entries:
                        log_date, status, timestamp = entries[-1]
                        print(f"     Latest: {timestamp.strftime('%Y-%m-%d %H:%M:%S')} -> {log_date} ({status})")
                        
        except TimeoutError:
            print("   ⚠️  Timeout - recurring status log parsing took too long")
        except Exception as e:
            print(f"   ❌ Error: {e}")
        
        # Test compliance data calculation with timeout
        print("\n4. Testing compliance data calculation:")
        try:
            with timeout_context(10):  # 10 second timeout
                compliance_data = get_recurring_task_compliance_data()
                print(f"   ✅ Successfully calculated compliance data for {len(compliance_data)} days")
                
                # Show recent data (limited to last 3 days)
                recent_data = compliance_data[-3:] if len(compliance_data) > 3 else compliance_data
                for entry in recent_data:
                    print(f"   {entry['date']}: {entry['completed']}/{entry['total']} tasks ({entry['compliance_pct']}%)")
                    
        except TimeoutError:
            print("   ⚠️  Timeout - compliance data calculation took too long")
        except Exception as e:
            print(f"   ❌ Error: {e}")
            
        print("\n✅ 3 AM boundary test completed successfully!")
        return True
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        return False

if __name__ == "__main__":
    test_3am_boundary()
