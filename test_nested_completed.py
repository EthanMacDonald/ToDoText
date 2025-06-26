#!/usr/bin/env python3

import sys
import os
import requests
import json

def format_task_with_tags(task):
    """Format task description with all metadata suffixes"""
    description = task.get('description', '')
    metadata_parts = []
    
    # Get metadata from both direct fields and metadata dict
    metadata = task.get('metadata', {})
    
    # Priority (if available)
    if task.get('priority') or metadata.get('priority'):
        priority = task.get('priority') or metadata.get('priority')
        metadata_parts.append(f"priority:{priority}")
    
    # Due date (if available)
    if task.get('due_date') or metadata.get('due'):
        due = task.get('due_date') or metadata.get('due')
        metadata_parts.append(f"due:{due}")
    
    # Progress (if available)
    if metadata.get('progress'):
        metadata_parts.append(f"progress:{metadata['progress']}")
    
    # Frequency/Recurrence (if available)
    if task.get('recurring') or metadata.get('freq'):
        freq = task.get('recurring') or metadata.get('freq')
        metadata_parts.append(f"freq:{freq}")
    
    # Last done (if available)
    if metadata.get('lastdone'):
        metadata_parts.append(f"lastdone:{metadata['lastdone']}")
    
    # Done date (if available and task is completed)
    if task.get('completed') and (task.get('done_date_obj') or metadata.get('done')):
        done_date = task.get('done_date_obj') or metadata.get('done')
        if isinstance(done_date, str):
            metadata_parts.append(f"done:{done_date}")
        else:
            # Handle date object
            metadata_parts.append(f"done:{done_date.strftime('%Y-%m-%d') if hasattr(done_date, 'strftime') else str(done_date)}")
    
    # Area (if available)
    if task.get('area'):
        metadata_parts.append(f"area:{task['area']}")
    
    # Context (with @ prefix)
    if task.get('context'):
        metadata_parts.append(f"@{task['context']}")
    
    # Project (with + prefix)
    if task.get('project'):
        metadata_parts.append(f"+{task['project']}")
    
    # Extra contexts and projects
    if task.get('extra_contexts'):
        for ctx in task['extra_contexts']:
            metadata_parts.append(f"@{ctx}")
    
    if task.get('extra_projects'):
        for proj in task['extra_projects']:
            metadata_parts.append(f"+{proj}")
    
    # Combine description with metadata
    if metadata_parts:
        return f"{description} ({' '.join(metadata_parts)})"
    return description

def show_tasks_with_hierarchy(tasks, level=0):
    """Recursively show tasks with proper indentation and tags"""
    indent = "  " * level
    for task in tasks:
        completion_status = " [DONE]" if task.get('completed') else ""
        print(f"{indent}{format_task_with_tags(task)}{completion_status}")
        if task.get('subtasks'):
            show_tasks_with_hierarchy(task['subtasks'], level + 1)

print("=== Testing with real data - showing context and project tags ===")

try:
    # Test due date sorting
    print("\n--- Due Date Sorted Structure ---")
    response = requests.get("http://localhost:8000/tasks?sort=due")
    if response.status_code == 200:
        data = response.json()
        for group in data:
            print(f"\nGroup: {group['title']}")
            show_tasks_with_hierarchy(group['tasks'], 1)
    else:
        print(f"Error: {response.status_code}")

    # Test priority sorting
    print("\n--- Priority Sorted Structure ---")
    response = requests.get("http://localhost:8000/tasks?sort=priority")
    if response.status_code == 200:
        data = response.json()
        for group in data:
            print(f"\nGroup: {group['title']}")
            show_tasks_with_hierarchy(group['tasks'], 1)
    else:
        print(f"Error: {response.status_code}")

except requests.exceptions.ConnectionError:
    print("Error: Could not connect to localhost:8000. Make sure the backend is running.")
except Exception as e:
    print(f"Error: {e}")
