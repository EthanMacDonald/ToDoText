#!/usr/bin/env python3

import sys
import os

# Add the project root to Python path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../'))
sys.path.insert(0, project_root)

# Test the statistics function
from dashboard.backend.app import compute_task_statistics

try:
    stats = compute_task_statistics()
    print("Statistics computation successful!")
    print("Sample stats:")
    for key, value in list(stats.items())[:10]:  # Show first 10 items
        print(f"  {key}: {value}")
    print(f"Total stats: {len(stats)} items")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
