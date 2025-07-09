#!/usr/bin/env python3

import sys
import os

# Add the project root to Python path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../'))
sys.path.insert(0, project_root)

# Test the archive function
from dashboard.backend.app import archive_completed_tasks

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
