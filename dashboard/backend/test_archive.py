#!/usr/bin/env python3

# Test the archive function
from app import archive_completed_tasks

try:
    result = archive_completed_tasks()
    print("Archive function test:")
    print(f"Success: {result['success']}")
    print(f"Message: {result['message']}")
    print(f"Archived count: {result['archived_count']}")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
