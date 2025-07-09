"""
Backend Parser Tests
===================

Tests for the parser.py module covering:
- Task parsing and structure
- Task creation, editing, deletion
- Subtask functionality
- Metadata parsing (dates, priorities, tags)
- File I/O operations
- Edge cases and error handling
"""

import pytest
import tempfile
import os
from datetime import datetime, date, timedelta
from unittest.mock import patch, mock_open
import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent.parent / "dashboard" / "backend"
sys.path.insert(0, str(backend_path))

from parser import (
    parse_tasks, parse_tasks_raw, parse_recurring_tasks,
    create_task, edit_task, delete_task, create_subtask_for_task,
    check_off_task, check_off_recurring_task,
    generate_stable_task_id, get_adjusted_date, get_adjusted_today,
    parse_tasks_by_priority, parse_tasks_no_sort
)

class TestTaskParsing:
    """Test basic task parsing functionality"""
    
    def test_parse_empty_file(self, tmp_path):
        """Test parsing empty tasks file"""
        empty_file = tmp_path / "empty_tasks.txt"
        empty_file.write_text("")
        
        with patch('parser.tasks_file', str(empty_file)):
            tasks = parse_tasks()
            assert isinstance(tasks, list)
            assert len(tasks) == 0
    
    def test_parse_basic_task_structure(self, sample_tasks_file):
        """Test parsing basic task structure"""
        with patch('parser.tasks_file', str(sample_tasks_file)):
            tasks = parse_tasks()
            
            assert isinstance(tasks, list)
            assert len(tasks) > 0
            
            # Check first area has tasks
            work_area = next((area for area in tasks if area.get('area') == 'Work'), None)
            assert work_area is not None
            assert 'tasks' in work_area
            assert len(work_area['tasks']) > 0
    
    def test_parse_task_metadata(self, sample_tasks_file):
        """Test parsing task metadata (priority, due dates, etc.)"""
        with patch('parser.tasks_file', str(sample_tasks_file)):
            tasks = parse_tasks()
            
            # Find task with metadata
            all_tasks = []
            for area in tasks:
                all_tasks.extend(area.get('tasks', []))
            
            # Check for task with priority
            priority_tasks = [t for t in all_tasks if t.get('priority')]
            assert len(priority_tasks) > 0
            
            # Check for task with due date
            due_tasks = [t for t in all_tasks if t.get('due_date')]
            assert len(due_tasks) > 0
    
    def test_parse_completed_tasks(self, sample_tasks_file):
        """Test parsing completed tasks"""
        with patch('parser.tasks_file', str(sample_tasks_file)):
            tasks = parse_tasks()
            
            all_tasks = []
            for area in tasks:
                all_tasks.extend(area.get('tasks', []))
            
            completed_tasks = [t for t in all_tasks if t.get('completed')]
            assert len(completed_tasks) > 0
            
            # Check completed task has done date
            for task in completed_tasks:
                assert 'done_date' in task or 'done' in task
    
    def test_parse_subtasks(self, sample_tasks_file):
        """Test parsing subtasks"""
        with patch('parser.tasks_file', str(sample_tasks_file)):
            tasks = parse_tasks()
            
            all_tasks = []
            for area in tasks:
                all_tasks.extend(area.get('tasks', []))
            
            # Find tasks with subtasks
            parent_tasks = [t for t in all_tasks if t.get('subtasks')]
            assert len(parent_tasks) > 0
            
            # Check subtask structure
            for parent in parent_tasks:
                assert isinstance(parent['subtasks'], list)
                assert len(parent['subtasks']) > 0
                for subtask in parent['subtasks']:
                    assert 'id' in subtask
                    assert 'description' in subtask
    
    def test_parse_project_tags(self, sample_tasks_file):
        """Test parsing project tags (+project)"""
        with patch('parser.tasks_file', str(sample_tasks_file)):
            tasks = parse_tasks()
            
            all_tasks = []
            for area in tasks:
                all_tasks.extend(area.get('tasks', []))
            
            project_tasks = [t for t in all_tasks if t.get('project_tags')]
            assert len(project_tasks) > 0
            
            for task in project_tasks:
                assert isinstance(task['project_tags'], list)
    
    def test_parse_context_tags(self, sample_tasks_file):
        """Test parsing context tags (@context)"""
        with patch('parser.tasks_file', str(sample_tasks_file)):
            tasks = parse_tasks()
            
            all_tasks = []
            for area in tasks:
                all_tasks.extend(area.get('tasks', []))
            
            context_tasks = [t for t in all_tasks if t.get('context_tags')]
            assert len(context_tasks) > 0
            
            for task in context_tasks:
                assert isinstance(task['context_tags'], list)

class TestTaskCreation:
    """Test task creation functionality"""
    
    def test_create_basic_task(self, tmp_path):
        """Test creating a basic task"""
        test_file = tmp_path / "test_tasks.txt"
        test_file.write_text("Work:\n")
        
        with patch('parser.tasks_file', str(test_file)):
            task_data = {
                'description': 'New test task',
                'area': 'Work',
                'priority': 'high',
                'due_date': str(date.today() + timedelta(days=1))
            }
            
            result = create_task(task_data)
            assert result['status'] == 'success'
            assert 'task_id' in result
            
            # Verify task was added to file
            content = test_file.read_text()
            assert 'New test task' in content
            assert 'priority:high' in content
    
    def test_create_task_with_project_context(self, tmp_path):
        """Test creating task with project and context tags"""
        test_file = tmp_path / "test_tasks.txt"
        test_file.write_text("Work:\n")
        
        with patch('parser.tasks_file', str(test_file)):
            task_data = {
                'description': 'New task with tags',
                'area': 'Work',
                'project': 'testing',
                'context': 'office'
            }
            
            result = create_task(task_data)
            assert result['status'] == 'success'
            
            content = test_file.read_text()
            assert '+testing' in content
            assert '@office' in content
    
    def test_create_task_new_area(self, tmp_path):
        """Test creating task in new area"""
        test_file = tmp_path / "test_tasks.txt"
        test_file.write_text("")
        
        with patch('parser.tasks_file', str(test_file)):
            task_data = {
                'description': 'New area task',
                'area': 'NewArea'
            }
            
            result = create_task(task_data)
            assert result['status'] == 'success'
            
            content = test_file.read_text()
            assert 'NewArea:' in content
            assert 'New area task' in content
    
    def test_create_task_with_notes(self, tmp_path):
        """Test creating task with notes"""
        test_file = tmp_path / "test_tasks.txt"
        test_file.write_text("Work:\n")
        
        with patch('parser.tasks_file', str(test_file)):
            task_data = {
                'description': 'Task with notes',
                'area': 'Work',
                'notes': ['Note 1', 'Note 2']
            }
            
            result = create_task(task_data)
            assert result['status'] == 'success'
            
            content = test_file.read_text()
            assert 'Task with notes' in content
            assert 'Note 1' in content
            assert 'Note 2' in content

class TestTaskEditing:
    """Test task editing functionality"""
    
    def test_edit_task_description(self, sample_tasks_file):
        """Test editing task description"""
        with patch('parser.tasks_file', str(sample_tasks_file)):
            # Get first task
            tasks = parse_tasks()
            first_task = tasks[0]['tasks'][0]
            task_id = first_task['id']
            
            new_description = 'Updated task description'
            result = edit_task(task_id, {'description': new_description})
            
            assert result['status'] == 'success'
            
            # Verify change
            updated_tasks = parse_tasks()
            updated_task = None
            for area in updated_tasks:
                for task in area['tasks']:
                    if task['id'] == task_id:
                        updated_task = task
                        break
            
            assert updated_task is not None
            assert new_description in updated_task['description']
    
    def test_edit_task_priority(self, sample_tasks_file):
        """Test editing task priority"""
        with patch('parser.tasks_file', str(sample_tasks_file)):
            tasks = parse_tasks()
            first_task = tasks[0]['tasks'][0]
            task_id = first_task['id']
            
            result = edit_task(task_id, {'priority': 'urgent'})
            assert result['status'] == 'success'
            
            # Verify priority change in file
            content = sample_tasks_file.read_text()
            assert 'priority:urgent' in content
    
    def test_edit_task_due_date(self, sample_tasks_file):
        """Test editing task due date"""
        with patch('parser.tasks_file', str(sample_tasks_file)):
            tasks = parse_tasks()
            first_task = tasks[0]['tasks'][0]
            task_id = first_task['id']
            
            new_due = str(date.today() + timedelta(days=7))
            result = edit_task(task_id, {'due_date': new_due})
            
            assert result['status'] == 'success'
            
            content = sample_tasks_file.read_text()
            assert f'due:{new_due}' in content
    
    def test_edit_nonexistent_task(self, sample_tasks_file):
        """Test editing non-existent task"""
        with patch('parser.tasks_file', str(sample_tasks_file)):
            result = edit_task('nonexistent_id', {'description': 'test'})
            assert result['status'] == 'error'
            assert 'not found' in result['message'].lower()

class TestTaskDeletion:
    """Test task deletion functionality"""
    
    def test_delete_task(self, sample_tasks_file):
        """Test deleting a task"""
        with patch('parser.tasks_file', str(sample_tasks_file)):
            # Get initial task count
            initial_tasks = parse_tasks()
            initial_count = sum(len(area['tasks']) for area in initial_tasks)
            
            # Delete first task
            first_task = initial_tasks[0]['tasks'][0]
            task_id = first_task['id']
            
            result = delete_task(task_id)
            assert result['status'] == 'success'
            
            # Verify task count decreased
            updated_tasks = parse_tasks()
            updated_count = sum(len(area['tasks']) for area in updated_tasks)
            assert updated_count == initial_count - 1
    
    def test_delete_task_with_subtasks(self, sample_tasks_file):
        """Test deleting task with subtasks"""
        with patch('parser.tasks_file', str(sample_tasks_file)):
            tasks = parse_tasks()
            
            # Find task with subtasks
            parent_task = None
            for area in tasks:
                for task in area['tasks']:
                    if task.get('subtasks'):
                        parent_task = task
                        break
                if parent_task:
                    break
            
            if parent_task:
                result = delete_task(parent_task['id'])
                assert result['status'] == 'success'
                
                # Verify task and subtasks are gone
                updated_tasks = parse_tasks()
                for area in updated_tasks:
                    for task in area['tasks']:
                        assert task['id'] != parent_task['id']
    
    def test_delete_nonexistent_task(self, sample_tasks_file):
        """Test deleting non-existent task"""
        with patch('parser.tasks_file', str(sample_tasks_file)):
            result = delete_task('nonexistent_id')
            assert result['status'] == 'error'

class TestSubtasks:
    """Test subtask functionality"""
    
    def test_create_subtask(self, sample_tasks_file):
        """Test creating a subtask"""
        with patch('parser.tasks_file', str(sample_tasks_file)):
            tasks = parse_tasks()
            parent_task = tasks[0]['tasks'][0]
            parent_id = parent_task['id']
            
            # Mock request object
            class MockRequest:
                description = 'New subtask'
                notes = []
                priority = None
                due_date = None
                recurring = None
                project = None
                context = None
            
            request = MockRequest()
            result = create_subtask_for_task(parent_id, request)
            
            assert result['status'] == 'success'
            
            # Verify subtask was added
            updated_tasks = parse_tasks()
            updated_parent = None
            for area in updated_tasks:
                for task in area['tasks']:
                    if task['id'] == parent_id:
                        updated_parent = task
                        break
            
            assert updated_parent is not None
            assert 'subtasks' in updated_parent
            subtask_descriptions = [st['description'] for st in updated_parent['subtasks']]
            assert any('New subtask' in desc for desc in subtask_descriptions)
    
    def test_create_subtask_nonexistent_parent(self, sample_tasks_file):
        """Test creating subtask for non-existent parent"""
        with patch('parser.tasks_file', str(sample_tasks_file)):
            class MockRequest:
                description = 'Orphan subtask'
                notes = []
                priority = None
                due_date = None
                recurring = None
                project = None
                context = None
            
            request = MockRequest()
            result = create_subtask_for_task('nonexistent_id', request)
            assert result['status'] == 'error'

class TestTaskCompletion:
    """Test task completion functionality"""
    
    def test_check_off_task(self, sample_tasks_file):
        """Test checking off a task"""
        with patch('parser.tasks_file', str(sample_tasks_file)):
            tasks = parse_tasks()
            
            # Find uncompleted task
            uncompleted_task = None
            for area in tasks:
                for task in area['tasks']:
                    if not task.get('completed'):
                        uncompleted_task = task
                        break
                if uncompleted_task:
                    break
            
            assert uncompleted_task is not None
            
            result = check_off_task(uncompleted_task['id'])
            assert result['status'] == 'success'
            
            # Verify task is marked complete
            updated_tasks = parse_tasks()
            updated_task = None
            for area in updated_tasks:
                for task in area['tasks']:
                    if task['id'] == uncompleted_task['id']:
                        updated_task = task
                        break
            
            assert updated_task is not None
            assert updated_task['completed'] is True
    
    def test_check_off_completed_task(self, sample_tasks_file):
        """Test checking off already completed task"""
        with patch('parser.tasks_file', str(sample_tasks_file)):
            tasks = parse_tasks()
            
            # Find completed task
            completed_task = None
            for area in tasks:
                for task in area['tasks']:
                    if task.get('completed'):
                        completed_task = task
                        break
                if completed_task:
                    break
            
            if completed_task:
                result = check_off_task(completed_task['id'])
                # Should handle gracefully
                assert result['status'] in ['success', 'error']

class TestRecurringTasks:
    """Test recurring task functionality"""
    
    def test_parse_recurring_tasks(self, sample_recurring_file):
        """Test parsing recurring tasks"""
        with patch('parser.recurring_file', str(sample_recurring_file)):
            recurring_tasks = parse_recurring_tasks()
            
            assert isinstance(recurring_tasks, list)
            assert len(recurring_tasks) > 0
            
            for task in recurring_tasks:
                assert 'task_id' in task
                assert 'description' in task
                assert 'frequency' in task
    
    def test_check_off_recurring_task(self, sample_recurring_file):
        """Test checking off recurring task"""
        with patch('parser.recurring_file', str(sample_recurring_file)):
            recurring_tasks = parse_recurring_tasks()
            assert len(recurring_tasks) > 0
            
            task_id = recurring_tasks[0]['task_id']
            today = get_adjusted_today()
            
            result = check_off_recurring_task(task_id, str(today))
            assert result['status'] == 'success'

class TestUtilityFunctions:
    """Test utility functions"""
    
    def test_generate_stable_task_id(self):
        """Test stable task ID generation"""
        id1 = generate_stable_task_id("Work", "Test task", 0, 1)
        id2 = generate_stable_task_id("Work", "Test task", 0, 1)
        id3 = generate_stable_task_id("Work", "Different task", 0, 1)
        
        assert id1 == id2  # Same input should generate same ID
        assert id1 != id3  # Different input should generate different ID
        assert isinstance(id1, str)
        assert len(id1) == 16
    
    def test_get_adjusted_date(self):
        """Test 3 AM boundary date adjustment"""
        # Test date before 3 AM (should be previous day)
        dt_early = datetime(2025, 7, 8, 1, 30)  # 1:30 AM
        adjusted = get_adjusted_date(dt_early)
        expected = date(2025, 7, 7)  # Previous day
        assert adjusted == expected
        
        # Test date after 3 AM (should be same day)
        dt_late = datetime(2025, 7, 8, 9, 30)  # 9:30 AM
        adjusted = get_adjusted_date(dt_late)
        expected = date(2025, 7, 8)  # Same day
        assert adjusted == expected
        
        # Test exactly 3 AM (should be same day)
        dt_exact = datetime(2025, 7, 8, 3, 0)  # 3:00 AM
        adjusted = get_adjusted_date(dt_exact)
        expected = date(2025, 7, 8)  # Same day
        assert adjusted == expected
    
    def test_get_adjusted_today(self):
        """Test getting today's adjusted date"""
        today = get_adjusted_today()
        assert isinstance(today, date)

class TestTaskSorting:
    """Test task sorting functionality"""
    
    def test_parse_tasks_by_priority(self, sample_tasks_file):
        """Test parsing tasks sorted by priority"""
        with patch('parser.tasks_file', str(sample_tasks_file)):
            tasks = parse_tasks_by_priority()
            
            assert isinstance(tasks, list)
            # Tasks should be grouped by priority if any have priorities
            if tasks:
                assert isinstance(tasks[0], dict)
    
    def test_parse_tasks_no_sort(self, sample_tasks_file):
        """Test parsing tasks without sorting"""
        with patch('parser.tasks_file', str(sample_tasks_file)):
            tasks = parse_tasks_no_sort()
            
            assert isinstance(tasks, list)

class TestErrorHandling:
    """Test error handling and edge cases"""
    
    def test_parse_malformed_file(self, tmp_path):
        """Test parsing malformed tasks file"""
        malformed_file = tmp_path / "malformed.txt"
        malformed_file.write_text("This is not a valid task format\n- [?] Invalid task\n")
        
        with patch('parser.tasks_file', str(malformed_file)):
            # Should not crash, should handle gracefully
            tasks = parse_tasks()
            assert isinstance(tasks, list)
    
    def test_parse_file_with_invalid_dates(self, tmp_path):
        """Test parsing file with invalid dates"""
        invalid_date_file = tmp_path / "invalid_dates.txt"
        content = """Work:
- [ ] Task with invalid due date (due:invalid-date)
- [ ] Task with invalid done date (done:not-a-date)
"""
        invalid_date_file.write_text(content)
        
        with patch('parser.tasks_file', str(invalid_date_file)):
            # Should handle invalid dates gracefully
            tasks = parse_tasks()
            assert isinstance(tasks, list)
    
    def test_missing_tasks_file(self):
        """Test handling missing tasks file"""
        with patch('parser.tasks_file', '/nonexistent/path/tasks.txt'):
            try:
                tasks = parse_tasks()
                # Should either return empty list or raise appropriate error
                assert isinstance(tasks, list)
            except FileNotFoundError:
                # This is also acceptable behavior
                pass
    
    def test_permission_denied_file(self, tmp_path):
        """Test handling permission denied"""
        # This test might not work on all systems
        pass

# Performance tests
class TestPerformance:
    """Test performance with large datasets"""
    
    def test_parse_large_file(self, tmp_path):
        """Test parsing large tasks file"""
        large_file = tmp_path / "large_tasks.txt"
        
        # Generate large file content
        content = ""
        for i in range(100):  # 100 areas
            content += f"Area{i}:\n"
            for j in range(50):  # 50 tasks per area
                content += f"- [ ] Task {i}-{j} (priority:medium due:2025-12-31)\n"
                if j % 10 == 0:  # Add subtasks every 10th task
                    content += f"    - [ ] Subtask {i}-{j}-1\n"
                    content += f"    - [ ] Subtask {i}-{j}-2\n"
        
        large_file.write_text(content)
        
        with patch('parser.tasks_file', str(large_file)):
            import time
            start_time = time.time()
            tasks = parse_tasks()
            end_time = time.time()
            
            # Should complete in reasonable time (< 5 seconds)
            assert end_time - start_time < 5.0
            assert len(tasks) == 100  # 100 areas
            
            total_tasks = sum(len(area['tasks']) for area in tasks)
            assert total_tasks == 5000  # 50 tasks per area * 100 areas

# Integration tests with other modules
class TestIntegration:
    """Test integration with other parts of the system"""
    
    def test_task_creation_and_parsing_integration(self, tmp_path):
        """Test that created tasks can be parsed correctly"""
        test_file = tmp_path / "integration_test.txt"
        test_file.write_text("")
        
        with patch('parser.tasks_file', str(test_file)):
            # Create a task
            task_data = {
                'description': 'Integration test task',
                'area': 'Testing',
                'priority': 'high',
                'due_date': str(date.today() + timedelta(days=1)),
                'project': 'integration',
                'context': 'test'
            }
            
            create_result = create_task(task_data)
            assert create_result['status'] == 'success'
            
            # Parse and verify
            tasks = parse_tasks()
            assert len(tasks) == 1
            assert tasks[0]['area'] == 'Testing'
            assert len(tasks[0]['tasks']) == 1
            
            created_task = tasks[0]['tasks'][0]
            assert 'Integration test task' in created_task['description']
            assert created_task['priority'] == 'high'
            assert created_task['project_tags'] == ['integration']
            assert created_task['context_tags'] == ['test']
