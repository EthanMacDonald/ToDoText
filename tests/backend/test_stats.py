#!/usr/bin/env python3

import sys
import os

# Add the project root to Python path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../'))
sys.path.insert(0, project_root)

# Test the statistics function
from dashboard.backend.app import compute_task_statistics

#!/usr/bin/env python3

import sys
import os
import signal
from contextlib import contextmanager

# Add the project root to Python path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../'))
sys.path.insert(0, project_root)

# Test the statistics function
from dashboard.backend.app import compute_task_statistics

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

def test_statistics():
    """Test statistics computation with timeout"""
    print("=== Testing Statistics Computation ===")
    
    try:
        with timeout_context(30):  # 30 second timeout
            stats = compute_task_statistics()
            print("✅ Statistics computation successful!")
            print("Sample stats:")
            for key, value in list(stats.items())[:5]:  # Show first 5 items
                print(f"  {key}: {value}")
            print(f"Total stats: {len(stats)} items")
            return True
    except TimeoutError:
        print("⚠️  Statistics computation timed out")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_statistics()
