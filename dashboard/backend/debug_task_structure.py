#!/usr/bin/env python3

"""
Debug script to check task structure
"""

import sys
import os
sys.path.append('/Users/ethan/working_files/NOTES/todo_auto/dashboard/backend')

from parser import parse_tasks
import json

def main():
    print("Checking task structure...")
    
    tasks = parse_tasks()
    
    if tasks:
        print(f"Found {len(tasks)} tasks")
        print("\nFirst task structure:")
        print(json.dumps(tasks[0], indent=2, default=str))
        
        print("\nSample task keys:")
        print(list(tasks[0].keys()))
    else:
        print("No tasks found")

if __name__ == "__main__":
    main()
