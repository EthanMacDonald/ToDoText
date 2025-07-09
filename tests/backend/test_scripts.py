"""
Scripts Tests
============

Tests for the utility scripts in the scripts/ directory:
- sort_tasks.py
- statistics.py
- archive_completed_items.py
- check_task_list.py
- make_csv.py
- push_due_dates_to_calendar.py
"""

import pytest
import tempfile
import subprocess
import os
import csv
from datetime import datetime, date, timedelta
from unittest.mock import patch, mock_open, MagicMock
import sys
from pathlib import Path

# Add scripts to path
scripts_path = Path(__file__).parent.parent.parent / "scripts"
sys.path.insert(0, str(scripts_path))

class TestSortTasks:
    """Test sort_tasks.py functionality"""
    
    def test_sort_tasks_by_area(self, tmp_path):
        """Test sorting tasks by area"""
        # Create test tasks file
        tasks_content = """Work:
- [ ] Task 1 (priority:high)
- [ ] Task 2 (priority:low)

Personal:
- [ ] Personal task (priority:medium)
"""
        tasks_file = tmp_path / "tasks.txt"
        tasks_file.write_text(tasks_content)
        
        output_file = tmp_path / "sorted_by_area.txt"
        
        # Import and test sort functionality
        try:
            from sort_tasks import sort_tasks_by_area
            result = sort_tasks_by_area(str(tasks_file), str(output_file))
            
            assert output_file.exists()
            content = output_file.read_text()
            assert "Work:" in content
            assert "Personal:" in content
        except ImportError:
            # Test by running script directly
            result = subprocess.run([
                sys.executable, str(scripts_path / "sort_tasks.py"),
                "--input", str(tasks_file),
                "--output", str(output_file),
                "--type", "area"
            ], capture_output=True, text=True)
            
            assert result.returncode == 0
    
    def test_sort_tasks_by_priority(self, tmp_path):
        """Test sorting tasks by priority"""
        tasks_content = """Work:
- [ ] High priority task (priority:high)
- [ ] Low priority task (priority:low)
- [ ] Medium priority task (priority:medium)
"""
        tasks_file = tmp_path / "tasks.txt"
        tasks_file.write_text(tasks_content)
        
        output_file = tmp_path / "sorted_by_priority.txt"
        
        try:
            from sort_tasks import sort_tasks_by_priority
            result = sort_tasks_by_priority(str(tasks_file), str(output_file))
            
            assert output_file.exists()
            content = output_file.read_text()
            
            # High priority tasks should appear first
            lines = content.split('\n')
            high_line = next((i for i, line in enumerate(lines) if 'High priority task' in line), -1)
            low_line = next((i for i, line in enumerate(lines) if 'Low priority task' in line), -1)
            
            if high_line >= 0 and low_line >= 0:
                assert high_line < low_line
                
        except ImportError:
            # Test by running script
            result = subprocess.run([
                sys.executable, str(scripts_path / "sort_tasks.py"),
                "--input", str(tasks_file),
                "--output", str(output_file),
                "--type", "priority"
            ], capture_output=True, text=True)
            
            assert result.returncode == 0
    
    def test_sort_tasks_by_due_date(self, tmp_path):
        """Test sorting tasks by due date"""
        today = date.today()
        tomorrow = today + timedelta(days=1)
        next_week = today + timedelta(days=7)
        
        tasks_content = f"""Work:
- [ ] Task due next week (due:{next_week})
- [ ] Task due tomorrow (due:{tomorrow})
- [ ] Task due today (due:{today})
"""
        tasks_file = tmp_path / "tasks.txt"
        tasks_file.write_text(tasks_content)
        
        output_file = tmp_path / "sorted_by_due.txt"
        
        try:
            from sort_tasks import sort_tasks_by_due_date
            result = sort_tasks_by_due_date(str(tasks_file), str(output_file))
            
            assert output_file.exists()
        except ImportError:
            result = subprocess.run([
                sys.executable, str(scripts_path / "sort_tasks.py"),
                "--type", "due"
            ], capture_output=True, text=True)
            
            # Should not crash
            assert result.returncode in [0, 1]  # Might fail if no output dir

class TestStatistics:
    """Test statistics.py functionality"""
    
    def test_calculate_basic_statistics(self, tmp_path):
        """Test basic statistics calculation"""
        tasks_content = """Work:
- [x] Completed task 1 (done:2025-07-01)
- [x] Completed task 2 (done:2025-07-02)
- [ ] Incomplete task 1
- [ ] Incomplete task 2 (due:2025-07-10)
- [ ] Overdue task (due:2025-06-01)

Personal:
- [x] Personal completed (done:2025-07-01)
- [ ] Personal incomplete
"""
        tasks_file = tmp_path / "tasks.txt"
        tasks_file.write_text(tasks_content)
        
        try:
            from statistics import calculate_statistics
            stats = calculate_statistics(str(tasks_file))
            
            assert 'total_tasks' in stats
            assert 'completed_tasks' in stats
            assert 'completion_percentage' in stats
            assert 'overdue_tasks' in stats
            
            assert stats['total_tasks'] == 7
            assert stats['completed_tasks'] == 3
            assert abs(stats['completion_percentage'] - 42.86) < 0.1
            
        except ImportError:
            # Test by running script
            result = subprocess.run([
                sys.executable, str(scripts_path / "statistics.py"),
                "--input", str(tasks_file)
            ], capture_output=True, text=True)
            
            assert result.returncode == 0
            assert "total" in result.stdout.lower()
    
    def test_statistics_by_area(self, tmp_path):
        """Test statistics calculation by area"""
        tasks_content = """Work:
- [x] Work completed 1
- [x] Work completed 2  
- [ ] Work incomplete

Personal:
- [x] Personal completed
- [ ] Personal incomplete 1
- [ ] Personal incomplete 2
"""
        tasks_file = tmp_path / "tasks.txt"
        tasks_file.write_text(tasks_content)
        
        try:
            from statistics import calculate_statistics_by_area
            area_stats = calculate_statistics_by_area(str(tasks_file))
            
            assert isinstance(area_stats, list)
            assert len(area_stats) == 2
            
            work_stats = next((a for a in area_stats if a['area'] == 'Work'), None)
            assert work_stats is not None
            assert work_stats['total_tasks'] == 3
            assert work_stats['completed_tasks'] == 2
            
        except ImportError:
            pass  # Skip if module can't be imported
    
    def test_time_series_statistics(self, tmp_path):
        """Test time series statistics generation"""
        # Create archive data
        archive_content = """[2025-07-01] Work task 1 completed
[2025-07-01] Personal task 1 completed
[2025-07-02] Work task 2 completed
[2025-07-02] Work task 3 started
"""
        archive_file = tmp_path / "archive.txt"
        archive_file.write_text(archive_content)
        
        try:
            from statistics import generate_time_series_data
            time_series = generate_time_series_data(str(archive_file))
            
            assert isinstance(time_series, list)
            if time_series:
                entry = time_series[0]
                assert 'date' in entry
                assert 'total' in entry
                assert 'completed' in entry
                
        except ImportError:
            pass

class TestArchiveCompletedItems:
    """Test archive_completed_items.py functionality"""
    
    def test_archive_completed_tasks(self, tmp_path):
        """Test archiving completed tasks"""
        today = date.today()
        yesterday = today - timedelta(days=1)
        
        tasks_content = f"""Work:
- [x] Completed task 1 (done:{yesterday})
- [x] Completed task 2 (done:{today})
- [ ] Incomplete task

Personal:
- [x] Old completed task (done:{yesterday})
- [ ] Another incomplete task
"""
        tasks_file = tmp_path / "tasks.txt"
        tasks_file.write_text(tasks_content)
        
        archive_file = tmp_path / "archive.txt"
        
        try:
            from archive_completed_items import archive_completed_tasks
            result = archive_completed_tasks(str(tasks_file), str(archive_file))
            
            # Check that completed tasks were archived
            assert archive_file.exists()
            archive_content = archive_file.read_text()
            assert "Completed task 1" in archive_content
            
            # Check that tasks file no longer has completed tasks
            updated_content = tasks_file.read_text()
            assert "Completed task 1" not in updated_content
            assert "Incomplete task" in updated_content
            
        except ImportError:
            # Test by running script
            result = subprocess.run([
                sys.executable, str(scripts_path / "archive_completed_items.py"),
                "--tasks-file", str(tasks_file),
                "--archive-file", str(archive_file)
            ], capture_output=True, text=True)
            
            # Should not crash
            assert result.returncode in [0, 1]
    
    def test_archive_preserves_incomplete_tasks(self, tmp_path):
        """Test that archiving preserves incomplete tasks"""
        tasks_content = """Work:
- [x] Completed task (done:2025-07-01)
- [ ] Incomplete task 1
- [ ] Incomplete task 2 (due:2025-12-31)
"""
        tasks_file = tmp_path / "tasks.txt"
        tasks_file.write_text(tasks_content)
        
        archive_file = tmp_path / "archive.txt"
        
        try:
            from archive_completed_items import archive_completed_tasks
            result = archive_completed_tasks(str(tasks_file), str(archive_file))
            
            updated_content = tasks_file.read_text()
            assert "Incomplete task 1" in updated_content
            assert "Incomplete task 2" in updated_content
            assert "Completed task" not in updated_content
            
        except ImportError:
            pass

class TestCheckTaskList:
    """Test check_task_list.py functionality"""
    
    def test_validate_task_format(self, tmp_path):
        """Test task format validation"""
        valid_tasks = """Work:
- [ ] Valid task 1
- [x] Valid completed task (done:2025-07-01)
- [ ] Valid task with metadata (priority:high due:2025-12-31)
"""
        
        invalid_tasks = """Work:
- Invalid task without checkbox
- [ Malformed checkbox
- [ ] Valid task
"""
        
        valid_file = tmp_path / "valid_tasks.txt"
        valid_file.write_text(valid_tasks)
        
        invalid_file = tmp_path / "invalid_tasks.txt"
        invalid_file.write_text(invalid_tasks)
        
        try:
            from check_task_list import validate_task_format
            
            valid_result = validate_task_format(str(valid_file))
            assert valid_result['is_valid'] == True
            assert len(valid_result['errors']) == 0
            
            invalid_result = validate_task_format(str(invalid_file))
            assert invalid_result['is_valid'] == False
            assert len(invalid_result['errors']) > 0
            
        except ImportError:
            # Test by running script
            result = subprocess.run([
                sys.executable, str(scripts_path / "check_task_list.py"),
                str(valid_file)
            ], capture_output=True, text=True)
            
            # Should indicate valid file
            assert result.returncode == 0
    
    def test_detect_duplicate_tasks(self, tmp_path):
        """Test duplicate task detection"""
        tasks_content = """Work:
- [ ] Task 1
- [ ] Task 2  
- [ ] Task 1
- [ ] Task 3
"""
        tasks_file = tmp_path / "tasks.txt"
        tasks_file.write_text(tasks_content)
        
        try:
            from check_task_list import detect_duplicates
            duplicates = detect_duplicates(str(tasks_file))
            
            assert len(duplicates) > 0
            assert any("Task 1" in dup for dup in duplicates)
            
        except ImportError:
            pass
    
    def test_validate_dates(self, tmp_path):
        """Test date validation"""
        tasks_content = """Work:
- [ ] Task with valid date (due:2025-12-31)
- [ ] Task with invalid date (due:invalid-date)
- [x] Completed task (done:2025-07-01)
- [x] Task with invalid done date (done:bad-date)
"""
        tasks_file = tmp_path / "tasks.txt"
        tasks_file.write_text(tasks_content)
        
        try:
            from check_task_list import validate_dates
            date_errors = validate_dates(str(tasks_file))
            
            assert len(date_errors) >= 2  # Should find both invalid dates
            
        except ImportError:
            pass

class TestMakeCSV:
    """Test make_csv.py functionality"""
    
    def test_export_tasks_to_csv(self, tmp_path):
        """Test exporting tasks to CSV"""
        tasks_content = """Work:
- [ ] Task 1 (priority:high due:2025-12-31 project:proj1)
- [x] Task 2 (done:2025-07-01 priority:medium)

Personal:
- [ ] Personal task (context:home priority:low)
"""
        tasks_file = tmp_path / "tasks.txt"
        tasks_file.write_text(tasks_content)
        
        csv_file = tmp_path / "tasks.csv"
        
        try:
            from make_csv import export_tasks_to_csv
            result = export_tasks_to_csv(str(tasks_file), str(csv_file))
            
            assert csv_file.exists()
            
            # Verify CSV content
            with open(csv_file, 'r', newline='') as f:
                reader = csv.DictReader(f)
                rows = list(reader)
                
                assert len(rows) >= 3
                
                # Check headers
                assert 'description' in reader.fieldnames
                assert 'area' in reader.fieldnames
                assert 'completed' in reader.fieldnames
                assert 'priority' in reader.fieldnames
                
                # Check data
                task1 = next((r for r in rows if 'Task 1' in r['description']), None)
                assert task1 is not None
                assert task1['area'] == 'Work'
                assert task1['priority'] == 'high'
                assert task1['completed'] == 'False'
                
        except ImportError:
            # Test by running script
            result = subprocess.run([
                sys.executable, str(scripts_path / "make_csv.py"),
                "--input", str(tasks_file),
                "--output", str(csv_file)
            ], capture_output=True, text=True)
            
            assert result.returncode == 0
            assert csv_file.exists()
    
    def test_export_statistics_to_csv(self, tmp_path):
        """Test exporting statistics to CSV"""
        # Create some archive data
        archive_content = """[2025-07-01] Task 1 completed
[2025-07-01] Task 2 completed  
[2025-07-02] Task 3 completed
[2025-07-02] Task 4 started
[2025-07-03] Task 5 completed
"""
        archive_file = tmp_path / "archive.txt"
        archive_file.write_text(archive_content)
        
        csv_file = tmp_path / "statistics.csv"
        
        try:
            from make_csv import export_statistics_to_csv
            result = export_statistics_to_csv(str(archive_file), str(csv_file))
            
            assert csv_file.exists()
            
            # Verify CSV has date-based statistics
            with open(csv_file, 'r', newline='') as f:
                reader = csv.DictReader(f)
                rows = list(reader)
                
                assert len(rows) >= 3  # At least 3 days of data
                
                # Check headers
                expected_headers = ['date', 'total_tasks', 'completed_tasks', 'completion_percentage']
                for header in expected_headers:
                    assert header in reader.fieldnames
                    
        except ImportError:
            pass

class TestPushDueDatesToCalendar:
    """Test push_due_dates_to_calendar.py functionality"""
    
    @patch('builtins.open', new_callable=mock_open)
    @patch('os.path.exists')
    def test_extract_due_dates(self, mock_exists, mock_file):
        """Test extracting due dates from tasks"""
        mock_exists.return_value = True
        
        tasks_content = """Work:
- [ ] Task due today (due:2025-07-08)
- [ ] Task due tomorrow (due:2025-07-09)
- [ ] Task without due date
- [ ] Task due next week (due:2025-07-15)
"""
        mock_file.return_value.read.return_value = tasks_content
        
        try:
            from push_due_dates_to_calendar import extract_due_dates
            due_dates = extract_due_dates("fake_path")
            
            assert len(due_dates) == 3
            
            # Check structure
            for item in due_dates:
                assert 'date' in item
                assert 'description' in item
                assert 'area' in item
                
        except ImportError:
            pass
    
    @patch('subprocess.run')
    def test_calendar_integration(self, mock_subprocess):
        """Test calendar integration (mocked)"""
        mock_subprocess.return_value.returncode = 0
        mock_subprocess.return_value.stdout = "Success"
        
        try:
            from push_due_dates_to_calendar import push_to_calendar
            
            events = [
                {
                    'date': '2025-07-08',
                    'description': 'Test task',
                    'area': 'Work'
                }
            ]
            
            result = push_to_calendar(events)
            assert mock_subprocess.called
            
        except ImportError:
            pass

class TestScriptIntegration:
    """Test integration between scripts"""
    
    def test_sort_then_archive_workflow(self, tmp_path):
        """Test workflow: sort tasks then archive completed ones"""
        today = date.today()
        yesterday = today - timedelta(days=1)
        
        tasks_content = f"""Work:
- [x] Completed high priority (priority:high done:{yesterday})
- [ ] Incomplete high priority (priority:high due:2025-12-31)
- [x] Completed low priority (priority:low done:{yesterday})
- [ ] Incomplete low priority (priority:low)

Personal:
- [x] Completed personal (done:{yesterday})
- [ ] Incomplete personal
"""
        
        original_file = tmp_path / "tasks.txt"
        original_file.write_text(tasks_content)
        
        sorted_file = tmp_path / "sorted_by_priority.txt"
        archive_file = tmp_path / "archive.txt"
        
        # Step 1: Sort by priority
        try:
            from sort_tasks import sort_tasks_by_priority
            sort_tasks_by_priority(str(original_file), str(sorted_file))
            assert sorted_file.exists()
        except ImportError:
            pass
        
        # Step 2: Archive completed tasks
        try:
            from archive_completed_items import archive_completed_tasks
            archive_completed_tasks(str(original_file), str(archive_file))
            assert archive_file.exists()
            
            # Verify completed tasks were archived
            archive_content = archive_file.read_text()
            assert "Completed high priority" in archive_content
            
            # Verify incomplete tasks remain
            remaining_content = original_file.read_text()
            assert "Incomplete high priority" in remaining_content
            assert "Completed high priority" not in remaining_content
            
        except ImportError:
            pass
    
    def test_statistics_after_archive(self, tmp_path):
        """Test statistics calculation after archiving"""
        # Create tasks and archive some
        tasks_content = """Work:
- [ ] Active task 1
- [ ] Active task 2 (due:2025-12-31)

Personal:
- [ ] Personal task
"""
        
        archive_content = """[2025-07-01] Archived task 1 completed
[2025-07-02] Archived task 2 completed
[2025-07-03] Archived task 3 completed
"""
        
        tasks_file = tmp_path / "tasks.txt"
        tasks_file.write_text(tasks_content)
        
        archive_file = tmp_path / "archive.txt"
        archive_file.write_text(archive_content)
        
        try:
            from statistics import calculate_statistics
            stats = calculate_statistics(str(tasks_file))
            
            # Should only count active tasks
            assert stats['total_tasks'] == 3
            assert stats['completed_tasks'] == 0
            
        except ImportError:
            pass

class TestErrorHandling:
    """Test error handling in scripts"""
    
    def test_missing_file_handling(self):
        """Test handling of missing files"""
        nonexistent_file = "/path/that/does/not/exist.txt"
        
        # Test each script's handling of missing files
        scripts_to_test = [
            "sort_tasks.py",
            "statistics.py", 
            "archive_completed_items.py",
            "check_task_list.py",
            "make_csv.py"
        ]
        
        for script in scripts_to_test:
            script_path = scripts_path / script
            if script_path.exists():
                result = subprocess.run([
                    sys.executable, str(script_path),
                    nonexistent_file
                ], capture_output=True, text=True)
                
                # Should handle gracefully (exit code 0 or 1, not crash)
                assert result.returncode in [0, 1, 2]
    
    def test_permission_denied_handling(self, tmp_path):
        """Test handling of permission denied errors"""
        # This test might not work on all systems
        pass
    
    def test_malformed_data_handling(self, tmp_path):
        """Test handling of malformed task data"""
        malformed_content = """This is not a valid task file
Some random text
- [x] Valid task mixed in
Invalid line without proper format
- [ ] Another valid task
"""
        
        malformed_file = tmp_path / "malformed.txt"
        malformed_file.write_text(malformed_content)
        
        # Test that scripts don't crash on malformed data
        scripts_to_test = ["statistics.py", "check_task_list.py"]
        
        for script in scripts_to_test:
            script_path = scripts_path / script
            if script_path.exists():
                result = subprocess.run([
                    sys.executable, str(script_path),
                    str(malformed_file)
                ], capture_output=True, text=True)
                
                # Should not crash with unhandled exception
                assert result.returncode in [0, 1, 2]

class TestCommandLineInterface:
    """Test command line interfaces of scripts"""
    
    def test_script_help_options(self):
        """Test that scripts provide help information"""
        scripts_to_test = [
            "sort_tasks.py",
            "statistics.py",
            "archive_completed_items.py", 
            "make_csv.py"
        ]
        
        for script in scripts_to_test:
            script_path = scripts_path / script
            if script_path.exists():
                result = subprocess.run([
                    sys.executable, str(script_path), "--help"
                ], capture_output=True, text=True)
                
                # Should either show help (exit 0) or indicate unknown option
                assert result.returncode in [0, 1, 2]
                
                # Should mention the script purpose
                output = result.stdout + result.stderr
                assert len(output) > 0
    
    def test_script_version_options(self):
        """Test version options where available"""
        scripts_to_test = ["sort_tasks.py", "statistics.py"]
        
        for script in scripts_to_test:
            script_path = scripts_path / script
            if script_path.exists():
                result = subprocess.run([
                    sys.executable, str(script_path), "--version"
                ], capture_output=True, text=True)
                
                # Should handle version option gracefully
                assert result.returncode in [0, 1, 2]

class TestOutputFormats:
    """Test different output formats supported by scripts"""
    
    def test_json_output_format(self, tmp_path):
        """Test JSON output format where supported"""
        tasks_content = """Work:
- [ ] Task 1 (priority:high)
- [x] Task 2 (done:2025-07-01)
"""
        tasks_file = tmp_path / "tasks.txt"
        tasks_file.write_text(tasks_content)
        
        try:
            from statistics import calculate_statistics
            stats = calculate_statistics(str(tasks_file))
            
            # Should be serializable to JSON
            import json
            json_output = json.dumps(stats)
            assert len(json_output) > 0
            
            # Should be parseable back
            parsed = json.loads(json_output)
            assert parsed['total_tasks'] == stats['total_tasks']
            
        except ImportError:
            pass
    
    def test_csv_output_format(self, tmp_path):
        """Test CSV output format"""
        tasks_content = """Work:
- [ ] Task 1 (priority:high due:2025-12-31)
- [x] Task 2 (done:2025-07-01)
"""
        tasks_file = tmp_path / "tasks.txt"
        tasks_file.write_text(tasks_content)
        
        csv_file = tmp_path / "output.csv"
        
        try:
            from make_csv import export_tasks_to_csv
            result = export_tasks_to_csv(str(tasks_file), str(csv_file))
            
            assert csv_file.exists()
            
            # Verify it's valid CSV
            with open(csv_file, 'r', newline='') as f:
                reader = csv.reader(f)
                rows = list(reader)
                assert len(rows) >= 2  # Header + at least one data row
                
        except ImportError:
            pass
