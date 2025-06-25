import re
import uuid
from datetime import datetime
from typing import List, Dict, Any

tasks_file = '../../tasks.txt'
recurring_file = '../../recurring_tasks.txt'

def parse_tasks() -> List[Dict[str, Any]]:
    tasks = []
    area = None
    with open(tasks_file, 'r') as f:
        for line in f:
            area_match = re.match(r'^(\S.+):$', line)
            task_match = re.match(r'^(\s*)- \[( |x)\] (.+)', line)
            if area_match:
                area = area_match.group(1)
            elif task_match:
                indent, completed, content = task_match.groups()
                task = {
                    'id': str(uuid.uuid4()),
                    'description': content,
                    'completed': completed == 'x',
                    'area': area,
                    'context': extract_context(content),
                    'project': extract_project(content),
                    'due_date': extract_due(content),
                    'priority': extract_priority(content)
                }
                tasks.append(task)
    return tasks

def parse_recurring_tasks() -> List[Dict[str, Any]]:
    tasks = []
    area = None
    with open(recurring_file, 'r') as f:
        for line in f:
            area_match = re.match(r'^(\S.+):$', line)
            task_match = re.match(r'^(\s*)- \[( |x)\] (.+)', line)
            if area_match:
                area = area_match.group(1)
            elif task_match:
                indent, completed, content = task_match.groups()
                task = {
                    'id': str(uuid.uuid4()),
                    'description': content,
                    'completed': completed == 'x',
                    'area': area,
                    'context': extract_context(content),
                    'project': extract_project(content),
                    'recurring': extract_recurring(content)
                }
                tasks.append(task)
    return tasks

def check_off_task(task_id: str) -> bool:
    # For demo: not implemented, always return True
    return True

def check_off_recurring_task(task_id: str) -> bool:
    # For demo: not implemented, always return True
    return True

def extract_context(content: str) -> str:
    match = re.search(r'(@\w+)', content)
    return match.group(1) if match else ''

def extract_project(content: str) -> str:
    match = re.search(r'(\+\w+)', content)
    return match.group(1) if match else ''

def extract_due(content: str) -> str:
    match = re.search(r'due:(\d{4}-\d{2}-\d{2})', content)
    return match.group(1) if match else ''

def extract_priority(content: str) -> str:
    match = re.search(r'\(A|B|C\)', content)
    return match.group(1) if match else ''

def extract_recurring(content: str) -> str:
    match = re.search(r'every:(\w+)', content)
    return match.group(1) if match else ''
