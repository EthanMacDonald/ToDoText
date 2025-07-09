#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from dashboard.backend.parser import parse_tasks

def test_followup_sorting():
    """Test that follow-up tasks are sorted by date"""
    tasks = parse_tasks()
    
    # Find the follow-up group
    followup_group = None
    for group in tasks:
        if group.get('title') == 'Follow-up Required':
            followup_group = group
            break
    
    if not followup_group:
        print("No follow-up group found")
        return
    
    print("Follow-up Required group tasks:")
    for i, task in enumerate(followup_group.get('tasks', [])):
        print(f"{i+1}. {task.get('description', '')} (followup: {task.get('followup_date', '')})")
    
    # Check if sorted correctly
    followup_dates = []
    for task in followup_group.get('tasks', []):
        followup_date = task.get('followup_date', '')
        if followup_date:
            followup_dates.append(followup_date)
        else:
            followup_dates.append('9999-12-31')  # Put no date at the end
    
    print(f"\nDates in order: {followup_dates}")
    print(f"Are they sorted? {followup_dates == sorted(followup_dates)}")

if __name__ == "__main__":
    test_followup_sorting()
