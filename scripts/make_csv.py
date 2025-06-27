#!/usr/bin/env python3
"""
CSV Export Script for Todo Tasks

This script parses tasks.txt and exports tasks to a CSV file with metadata and tags as columns.
"""

import re
import csv
from datetime import datetime
from typing import Dict, List, Optional, Any
import argparse


def parse_task_line(line: str) -> Optional[Dict[str, Any]]:
    """Parse a single task line and extract all components"""
    
    # Skip empty lines and area headers
    stripped = line.strip()
    if not stripped or stripped.startswith('## '):
        return None
    
    # Task pattern: optional completion (x), optional date, priority in parens, description, metadata in parens, tags
    task_pattern = r'^(\s*)(x\s+)?(\d{4}-\d{2}-\d{2}\s+)?(?:\(([A-Z])\)\s+)?(.+?)(?:\s+\(([^)]+)\))?\s*$'
    
    match = re.match(task_pattern, line)
    if not match:
        return None
    
    indent, completed, completion_date, priority, description_and_tags, metadata_str = match.groups()
    
    # Initialize task data
    task_data = {
        'completed': bool(completed),
        'completion_date': completion_date.strip() if completion_date else '',
        'priority': priority or '',
        'description': '',
        'project': '',
        'extra_projects': '',
        'context': '',
        'extra_contexts': '',
        'area': '',
        'due_date': '',
        'created_date': '',
        'done_date': '',
        'recurring': '',
        'progress': '',
        'indent_level': len(indent) if indent else 0
    }
    
    # Parse metadata (content within parentheses)
    if metadata_str:
        for item in metadata_str.split():
            if ':' in item:
                key, value = item.split(':', 1)
                if key == 'due':
                    task_data['due_date'] = value
                elif key == 'created':
                    task_data['created_date'] = value
                elif key == 'done':
                    task_data['done_date'] = value
                elif key == 'every':
                    task_data['recurring'] = value
                elif key == 'progress':
                    task_data['progress'] = value
                elif key == 'priority':
                    task_data['priority'] = value
                else:
                    # Store any other metadata
                    task_data[key] = value
    
    # Parse description and tags
    if description_and_tags:
        # Extract projects (+Project), contexts (@Context), and areas (&Area)
        projects = re.findall(r'\+(\w+)', description_and_tags)
        contexts = re.findall(r'@(\w+)', description_and_tags)
        areas = re.findall(r'&(\w+)', description_and_tags)
        
        # Set primary project and context
        if projects:
            task_data['project'] = projects[0]
            if len(projects) > 1:
                task_data['extra_projects'] = ' '.join(projects[1:])
        
        if contexts:
            task_data['context'] = contexts[0]
            if len(contexts) > 1:
                task_data['extra_contexts'] = ' '.join(contexts[1:])
        
        if areas:
            task_data['area_tag'] = areas[0]
            if len(areas) > 1:
                task_data['extra_areas'] = ' '.join(areas[1:])
        
        # Clean description by removing tags
        description = description_and_tags
        description = re.sub(r'\+\w+', '', description)  # Remove projects
        description = re.sub(r'@\w+', '', description)   # Remove contexts
        description = re.sub(r'&\w+', '', description)   # Remove areas
        description = re.sub(r'\s+', ' ', description).strip()  # Clean whitespace
        
        task_data['description'] = description
    
    return task_data


def get_current_area(line: str) -> Optional[str]:
    """Extract area name from area header line"""
    area_match = re.match(r'^## (.+)$', line.strip())
    return area_match.group(1) if area_match else None


def parse_tasks_file(file_path: str) -> List[Dict[str, Any]]:
    """Parse the entire tasks.txt file and return list of task dictionaries"""
    tasks = []
    current_area = ''
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            for line_num, line in enumerate(f, 1):
                # Check for area header
                area = get_current_area(line)
                if area:
                    current_area = area
                    continue
                
                # Parse task line
                task_data = parse_task_line(line)
                if task_data:
                    task_data['area'] = current_area
                    task_data['line_number'] = line_num
                    tasks.append(task_data)
                    
    except FileNotFoundError:
        print(f"Error: File '{file_path}' not found.")
        return []
    except Exception as e:
        print(f"Error reading file: {e}")
        return []
    
    return tasks


def export_to_csv(tasks: List[Dict[str, Any]], output_file: str) -> None:
    """Export tasks to CSV file"""
    
    if not tasks:
        print("No tasks to export.")
        return
    
    # Define CSV columns in logical order
    columns = [
        'line_number',
        'completed',
        'completion_date',
        'priority',
        'description',
        'area',
        'project',
        'extra_projects',
        'context',
        'extra_contexts',
        'due_date',
        'created_date',
        'done_date',
        'recurring',
        'progress',
        'indent_level'
    ]
    
    # Add any additional metadata columns that might exist
    all_keys = set()
    for task in tasks:
        all_keys.update(task.keys())
    
    additional_columns = sorted(all_keys - set(columns))
    columns.extend(additional_columns)
    
    try:
        with open(output_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=columns)
            
            # Write header
            writer.writeheader()
            
            # Write tasks
            for task in tasks:
                # Ensure all columns exist in task dict (fill with empty string if missing)
                row = {col: task.get(col, '') for col in columns}
                writer.writerow(row)
                
        print(f"Successfully exported {len(tasks)} tasks to '{output_file}'")
        
    except Exception as e:
        print(f"Error writing CSV file: {e}")


def main():
    """Main function"""
    parser = argparse.ArgumentParser(description='Export tasks.txt to CSV format')
    parser.add_argument('--input', '-i', default='../tasks.txt', 
                       help='Input tasks file (default: ../tasks.txt)')
    parser.add_argument('--output', '-o', default='../outputs/tasks_export.csv',
                       help='Output CSV file (default: outputs/tasks_export.csv)')
    parser.add_argument('--verbose', '-v', action='store_true',
                       help='Show detailed output')
    
    args = parser.parse_args()
    
    print(f"Parsing tasks from '{args.input}'...")
    tasks = parse_tasks_file(args.input)
    
    if args.verbose:
        print(f"Found {len(tasks)} tasks")
        if tasks:
            print("Sample task data:")
            sample_task = tasks[0]
            for key, value in sample_task.items():
                if value:  # Only show non-empty fields
                    print(f"  {key}: {value}")
    
    if tasks:
        export_to_csv(tasks, args.output)
    else:
        print("No tasks found to export.")


if __name__ == '__main__':
    main()
