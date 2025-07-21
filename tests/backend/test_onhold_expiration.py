"""Test on hold date expiration logic"""
import pytest
from datetime import date, datetime
from unittest.mock import patch
from dashboard.backend.parser import parse_tasks_raw


class TestOnHoldExpiration:
    """Test that tasks with expired on hold dates are treated as normal incomplete tasks"""
    
    def test_expired_onhold_date_becomes_incomplete(self):
        """Test that a task with an expired on hold date becomes incomplete status"""
        # Mock file content with a task that has an expired on hold date
        mock_content = """Work:
    - [ ] Test task with expired onhold date (priority:A onhold:2025-07-01)
    - [ ] Test task with future onhold date (priority:B onhold:2025-12-01)
    - [ ] Test task with text onhold condition (priority:C onhold:waiting for approval)
"""
        
        with patch('builtins.open', mock_open_with_content(mock_content)):
            with patch('dashboard.backend.parser.get_adjusted_today', return_value=date(2025, 7, 20)):
                areas = parse_tasks_raw()
        
        # Find the tasks from the first area
        work_area = areas[0]
        tasks = work_area['tasks']
        
        expired_task = None
        future_task = None
        text_task = None
        
        for task in tasks:
            if "expired onhold date" in task['description']:
                expired_task = task
            elif "future onhold date" in task['description']:
                future_task = task
            elif "text onhold condition" in task['description']:
                text_task = task
        
        # Verify the expired on hold task is now incomplete with no onhold_date
        assert expired_task is not None
        assert expired_task['status'] == 'incomplete'
        assert expired_task['onhold_date'] == '' or expired_task['onhold_date'] is None
        assert 'onhold' not in expired_task['metadata'] or expired_task['metadata']['onhold'] is None
        
        # Verify the future on hold task is still on hold
        assert future_task is not None
        assert future_task['status'] == 'onhold'
        assert future_task['onhold_date'] == '2025-12-01'
        assert future_task['metadata']['onhold'] == '2025-12-01'
        
        # Verify the text condition task is still on hold
        assert text_task is not None
        assert text_task['status'] == 'onhold'
        assert text_task['onhold_date'] == 'waiting for approval'
        assert text_task['metadata']['onhold'] == 'waiting for approval'
    
    def test_onhold_date_exactly_today_is_released(self):
        """Test that a task with on hold date equal to today is released"""
        mock_content = """Work:
    - [ ] Task due today (priority:A onhold:2025-07-20)
"""
        
        with patch('builtins.open', mock_open_with_content(mock_content)):
            with patch('dashboard.backend.parser.get_adjusted_today', return_value=date(2025, 7, 20)):
                areas = parse_tasks_raw()
        
        task = areas[0]['tasks'][0]
        assert task['status'] == 'incomplete'
        assert task['onhold_date'] == '' or task['onhold_date'] is None
    
    def test_onhold_date_tomorrow_stays_onhold(self):
        """Test that a task with on hold date in the future stays on hold"""
        mock_content = """Work:
    - [ ] Task due tomorrow (priority:A onhold:2025-07-21)
"""
        
        with patch('builtins.open', mock_open_with_content(mock_content)):
            with patch('dashboard.backend.parser.get_adjusted_today', return_value=date(2025, 7, 20)):
                areas = parse_tasks_raw()
        
        task = areas[0]['tasks'][0]
        assert task['status'] == 'onhold'
        assert task['onhold_date'] == '2025-07-21'


def mock_open_with_content(content):
    """Helper function to create a mock open that returns specific content"""
    from unittest.mock import mock_open
    return mock_open(read_data=content)
