#!/usr/bin/env python3

# Test the statistics function
from app import compute_task_statistics

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
