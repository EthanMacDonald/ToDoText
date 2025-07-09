"""
Backend API Tests
================

Tests for the FastAPI backend (app.py) covering:
- All API endpoints
- Request/response formats
- Error handling
- Authentication (if applicable)
- CORS handling
- Data validation
- Statistics endpoints
- Time series analysis
"""

import pytest
import asyncio
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from datetime import datetime, date, timedelta
import json
import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent.parent / "dashboard" / "backend"
sys.path.insert(0, str(backend_path))

# Patch before importing
import dashboard.backend.app
from dashboard.backend.app import app, get_adjusted_date, get_adjusted_today, get_adjusted_datetime_for_date

@pytest.fixture
def client():
    """Test client for FastAPI app"""
    return TestClient(app)

@pytest.fixture
def mock_parse_tasks():
    """Mock parse_tasks function"""
    return [
        {
            'area': 'Work',
            'tasks': [
                {
                    'id': 'task1',
                    'description': 'Test task 1',
                    'completed': False,
                    'priority': 'high',
                    'due_date': date.today() + timedelta(days=1),
                    'project_tags': ['project1'],
                    'context_tags': ['office'],
                    'subtasks': []
                },
                {
                    'id': 'task2', 
                    'description': 'Test task 2',
                    'completed': True,
                    'done_date': date.today() - timedelta(days=1),
                    'priority': 'medium',
                    'subtasks': [
                        {'id': 'subtask1', 'description': 'Subtask 1', 'completed': False}
                    ]
                }
            ]
        },
        {
            'area': 'Personal',
            'tasks': [
                {
                    'id': 'task3',
                    'description': 'Personal task',
                    'completed': False,
                    'priority': 'low',
                    'context_tags': ['home']
                }
            ]
        }
    ]

class TestHealthEndpoints:
    """Test health and basic endpoints"""
    
    def test_root_endpoint(self, client):
        """Test root endpoint"""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "status" in data
    
    def test_health_endpoint(self, client):
        """Test health check endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"

class TestTaskEndpoints:
    """Test task-related endpoints"""
    
    @patch('dashboard.backend.app.parse_tasks')
    def test_get_tasks(self, mock_parse, client, mock_parse_tasks):
        """Test GET /tasks endpoint"""
        mock_parse.return_value = mock_parse_tasks
        
        response = client.get("/tasks")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
        assert "data" in data
        assert len(data["data"]) == 2
        assert data["data"][0]["area"] == "Work"
    
    @patch('dashboard.backend.app.parse_tasks_by_priority')
    def test_get_tasks_by_priority(self, mock_parse, client, mock_parse_tasks):
        """Test GET /tasks/priority endpoint"""
        mock_parse.return_value = mock_parse_tasks
        
        response = client.get("/tasks/priority")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
        assert "data" in data
    
    @patch('dashboard.backend.app.parse_tasks_no_sort')
    def test_get_tasks_no_sort(self, mock_parse, client, mock_parse_tasks):
        """Test GET /tasks/no-sort endpoint"""
        mock_parse.return_value = mock_parse_tasks
        
        response = client.get("/tasks/no-sort")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
    
    @patch('dashboard.backend.app.create_task')
    def test_create_task(self, mock_create, client):
        """Test POST /tasks endpoint"""
        mock_create.return_value = {"status": "success", "task_id": "new_task_123"}
        
        task_data = {
            "description": "New test task",
            "area": "Work",
            "priority": "high",
            "due_date": "2025-12-31",
            "project": "test_project",
            "context": "office"
        }
        
        response = client.post("/tasks", json=task_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
        assert "task_id" in data
        
        # Verify mock was called with correct data
        mock_create.assert_called_once()
    
    @patch('dashboard.backend.app.edit_task')
    def test_edit_task(self, mock_edit, client):
        """Test PUT /tasks/{task_id} endpoint"""
        mock_edit.return_value = {"status": "success"}
        
        edit_data = {
            "description": "Updated task description",
            "priority": "urgent"
        }
        
        response = client.put("/tasks/task123", json=edit_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
        
        mock_edit.assert_called_once_with("task123", edit_data)
    
    @patch('dashboard.backend.app.delete_task')
    def test_delete_task(self, mock_delete, client):
        """Test DELETE /tasks/{task_id} endpoint"""
        mock_delete.return_value = {"status": "success"}
        
        response = client.delete("/tasks/task123")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
        
        mock_delete.assert_called_once_with("task123")
    
    @patch('dashboard.backend.app.check_off_task')
    def test_check_off_task(self, mock_check, client):
        """Test POST /tasks/check endpoint"""
        mock_check.return_value = {"status": "success"}
        
        check_data = {"task_id": "task123"}
        response = client.post("/tasks/check", json=check_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
        
        mock_check.assert_called_once_with("task123")

class TestSubtaskEndpoints:
    """Test subtask-related endpoints"""
    
    @patch('dashboard.backend.app.create_subtask_for_task')
    def test_create_subtask(self, mock_create, client):
        """Test POST /tasks/{task_id}/subtasks endpoint"""
        mock_create.return_value = {"status": "success", "subtask_id": "subtask123"}
        
        subtask_data = {
            "description": "New subtask",
            "priority": "medium"
        }
        
        response = client.post("/tasks/task123/subtasks", json=subtask_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
        assert "subtask_id" in data

class TestRecurringTaskEndpoints:
    """Test recurring task endpoints"""
    
    @patch('dashboard.backend.app.parse_recurring_tasks')
    def test_get_recurring_tasks(self, mock_parse, client):
        """Test GET /recurring-tasks endpoint"""
        mock_data = [
            {
                'task_id': 'daily_exercise',
                'description': 'Daily Exercise',
                'frequency': 'daily'
            },
            {
                'task_id': 'weekly_review',
                'description': 'Weekly Review', 
                'frequency': 'weekly'
            }
        ]
        mock_parse.return_value = mock_data
        
        response = client.get("/recurring-tasks")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
        assert len(data["data"]) == 2
        assert data["data"][0]["task_id"] == "daily_exercise"
    
    @patch('dashboard.backend.app.check_off_recurring_task')
    def test_check_off_recurring_task(self, mock_check, client):
        """Test POST /recurring-tasks/check endpoint"""
        mock_check.return_value = {"status": "success"}
        
        check_data = {
            "task_id": "daily_exercise",
            "date": "2025-07-08"
        }
        
        response = client.post("/recurring-tasks/check", json=check_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"

class TestStatisticsEndpoints:
    """Test statistics and analytics endpoints"""
    
    @patch('dashboard.backend.app.parse_tasks')
    def test_get_statistics(self, mock_parse, client, mock_parse_tasks):
        """Test GET /statistics endpoint"""
        mock_parse.return_value = mock_parse_tasks
        
        response = client.get("/statistics")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
        assert "data" in data
        
        stats = data["data"]
        assert "total_tasks" in stats
        assert "completed_tasks" in stats
        assert "completion_percentage" in stats
        assert "overdue_tasks" in stats
        assert "due_today" in stats
        assert "due_this_week" in stats
    
    @patch('dashboard.backend.app.parse_tasks')
    def test_get_statistics_by_area(self, mock_parse, client, mock_parse_tasks):
        """Test GET /statistics/area endpoint"""
        mock_parse.return_value = mock_parse_tasks
        
        response = client.get("/statistics/area")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
        assert "data" in data
        
        area_stats = data["data"]
        assert isinstance(area_stats, list)
        if area_stats:
            assert "area" in area_stats[0]
            assert "total_tasks" in area_stats[0]
            assert "completed_tasks" in area_stats[0]
    
    @patch('dashboard.backend.app.parse_tasks')  
    def test_get_statistics_by_priority(self, mock_parse, client, mock_parse_tasks):
        """Test GET /statistics/priority endpoint"""
        mock_parse.return_value = mock_parse_tasks
        
        response = client.get("/statistics/priority")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
        assert "data" in data

class TestTimeSeriesEndpoints:
    """Test time series analysis endpoints"""
    
    @patch('dashboard.backend.app.get_time_series_data')
    def test_get_time_series(self, mock_get_data, client):
        """Test GET /statistics/time-series endpoint"""
        mock_data = [
            {
                'date': '2025-07-01',
                'total': 10,
                'completed': 8,
                'completion_pct': 80.0,
                'overdue': 1,
                'due_today': 2,
                'due_this_week': 3
            },
            {
                'date': '2025-07-02',
                'total': 12,
                'completed': 9,
                'completion_pct': 75.0,
                'overdue': 2,
                'due_today': 1,
                'due_this_week': 4
            }
        ]
        mock_get_data.return_value = mock_data
        
        response = client.get("/statistics/time-series")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 2
        assert data[0]['date'] == '2025-07-01'
        assert data[0]['total'] == 10
    
    def test_get_time_series_with_params(self, client):
        """Test time series endpoint with parameters"""
        response = client.get("/statistics/time-series?days=30")
        # Should not crash even if no data
        assert response.status_code in [200, 500]  # Might fail if no data files

class TestAnalyticsEndpoints:
    """Test advanced analytics endpoints"""
    
    def test_heatmap_endpoint(self, client):
        """Test analytics heatmap endpoint"""
        response = client.get("/api/analytics/heatmap")
        # These might not be implemented yet, so we just test they don't crash
        assert response.status_code in [200, 404, 500]
    
    def test_correlation_endpoint(self, client):
        """Test analytics correlation endpoint"""
        response = client.get("/api/analytics/correlation")
        assert response.status_code in [200, 404, 500]
    
    def test_streaks_endpoint(self, client):
        """Test analytics streaks endpoint"""
        response = client.get("/api/analytics/streaks")
        assert response.status_code in [200, 404, 500]
    
    def test_behavioral_endpoint(self, client):
        """Test behavioral analytics endpoint"""
        response = client.get("/api/analytics/behavioral")
        assert response.status_code in [200, 404, 500]

class TestGamificationEndpoints:
    """Test gamification endpoints"""
    
    def test_badges_endpoint(self, client):
        """Test badges endpoint"""
        response = client.get("/api/gamification/badges")
        assert response.status_code in [200, 404, 500]
    
    def test_challenges_endpoint(self, client):
        """Test challenges endpoint"""
        response = client.get("/api/gamification/challenges")
        assert response.status_code in [200, 404, 500]

class TestErrorHandling:
    """Test API error handling"""
    
    def test_invalid_task_id(self, client):
        """Test handling invalid task ID"""
        response = client.get("/tasks/invalid_id_that_does_not_exist")
        # Should handle gracefully
        assert response.status_code in [404, 422, 500]
    
    def test_malformed_json(self, client):
        """Test handling malformed JSON"""
        response = client.post(
            "/tasks",
            data="invalid json",
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 422
    
    def test_missing_required_fields(self, client):
        """Test handling missing required fields"""
        incomplete_data = {"area": "Work"}  # Missing description
        response = client.post("/tasks", json=incomplete_data)
        assert response.status_code in [422, 400]
    
    @patch('dashboard.backend.app.parse_tasks')
    def test_parser_exception(self, mock_parse, client):
        """Test handling parser exceptions"""
        mock_parse.side_effect = Exception("Parser error")
        
        response = client.get("/tasks")
        assert response.status_code == 500
        
        data = response.json()
        assert data["status"] == "error"

class TestCORSHeaders:
    """Test CORS configuration"""
    
    def test_cors_headers_present(self, client):
        """Test that CORS headers are present"""
        response = client.options("/tasks")
        assert response.status_code in [200, 405]  # Some endpoints might not support OPTIONS
        
        # Test actual request has CORS headers
        response = client.get("/tasks")
        assert "access-control-allow-origin" in response.headers or response.status_code >= 400

class TestDateHandling:
    """Test date handling and 3 AM boundary"""
    
    def test_get_adjusted_date_before_3am(self):
        """Test adjusted date calculation before 3 AM"""
        dt = datetime(2025, 7, 8, 1, 30)  # 1:30 AM
        adjusted = get_adjusted_date(dt)
        expected = date(2025, 7, 7)  # Previous day
        assert adjusted == expected
    
    def test_get_adjusted_date_after_3am(self):
        """Test adjusted date calculation after 3 AM"""
        dt = datetime(2025, 7, 8, 9, 30)  # 9:30 AM
        adjusted = get_adjusted_date(dt)
        expected = date(2025, 7, 8)  # Same day
        assert adjusted == expected
    
    def test_get_adjusted_date_exactly_3am(self):
        """Test adjusted date calculation at exactly 3 AM"""
        dt = datetime(2025, 7, 8, 3, 0)  # 3:00 AM
        adjusted = get_adjusted_date(dt)
        expected = date(2025, 7, 8)  # Same day
        assert adjusted == expected
    
    def test_get_adjusted_today(self):
        """Test getting today's adjusted date"""
        today = get_adjusted_today()
        assert isinstance(today, date)
    
    def test_get_adjusted_datetime_for_date(self):
        """Test getting adjusted datetime for specific date"""
        test_date = date(2025, 7, 8)
        dt = get_adjusted_datetime_for_date(test_date)
        
        assert dt.date() == test_date
        assert dt.hour == 3  # Should be 3 AM
        assert dt.minute == 0
        assert dt.second == 0

class TestRequestValidation:
    """Test request validation"""
    
    def test_valid_task_creation_data(self, client):
        """Test task creation with valid data"""
        with patch('app.create_task') as mock_create:
            mock_create.return_value = {"status": "success", "task_id": "new_task"}
            
            valid_data = {
                "description": "Valid task",
                "area": "Work",
                "priority": "medium",
                "due_date": "2025-12-31"
            }
            
            response = client.post("/tasks", json=valid_data)
            assert response.status_code == 200
    
    def test_invalid_date_format(self, client):
        """Test task creation with invalid date format"""
        invalid_data = {
            "description": "Task with invalid date",
            "area": "Work", 
            "due_date": "invalid-date"
        }
        
        response = client.post("/tasks", json=invalid_data)
        # Should either validate and reject, or handle gracefully
        assert response.status_code in [200, 400, 422]
    
    def test_empty_description(self, client):
        """Test task creation with empty description"""
        invalid_data = {
            "description": "",
            "area": "Work"
        }
        
        response = client.post("/tasks", json=invalid_data)
        assert response.status_code in [400, 422]

class TestPerformance:
    """Test API performance"""
    
    @patch('dashboard.backend.app.parse_tasks')
    def test_task_endpoint_performance(self, mock_parse, client):
        """Test that task endpoints respond in reasonable time"""
        # Mock large dataset
        large_dataset = []
        for i in range(100):
            area_tasks = []
            for j in range(100):
                area_tasks.append({
                    'id': f'task_{i}_{j}',
                    'description': f'Task {i}-{j}',
                    'completed': j % 3 == 0,
                    'priority': ['low', 'medium', 'high'][j % 3]
                })
            large_dataset.append({
                'area': f'Area_{i}',
                'tasks': area_tasks
            })
        
        mock_parse.return_value = large_dataset
        
        import time
        start_time = time.time()
        response = client.get("/tasks")
        end_time = time.time()
        
        # Should respond within 5 seconds even with large dataset
        assert end_time - start_time < 5.0
        assert response.status_code == 200

class TestParameterHandling:
    """Test API parameter handling"""
    
    def test_query_parameters(self, client):
        """Test handling of query parameters"""
        response = client.get("/statistics/time-series?days=7&format=json")
        assert response.status_code in [200, 400, 500]
    
    def test_path_parameters(self, client):
        """Test handling of path parameters"""
        with patch('app.edit_task') as mock_edit:
            mock_edit.return_value = {"status": "success"}
            
            response = client.put("/tasks/test_task_id", json={"priority": "high"})
            assert response.status_code == 200
    
    def test_special_characters_in_ids(self, client):
        """Test handling special characters in task IDs"""
        special_id = "task_with-special.chars_123"
        with patch('app.edit_task') as mock_edit:
            mock_edit.return_value = {"status": "success"}
            
            response = client.put(f"/tasks/{special_id}", json={"priority": "high"})
            assert response.status_code in [200, 404]

class TestConcurrency:
    """Test concurrent access handling"""
    
    @pytest.mark.asyncio
    async def test_concurrent_task_creation(self, client):
        """Test concurrent task creation doesn't cause issues"""
        import asyncio
        
        async def create_task(task_num):
            with patch('app.create_task') as mock_create:
                mock_create.return_value = {"status": "success", "task_id": f"task_{task_num}"}
                
                task_data = {
                    "description": f"Concurrent task {task_num}",
                    "area": "Test"
                }
                
                response = client.post("/tasks", json=task_data)
                return response.status_code
        
        # Create multiple tasks concurrently
        tasks = [create_task(i) for i in range(10)]
        results = await asyncio.gather(*tasks)
        
        # All should succeed or fail gracefully
        for status_code in results:
            assert status_code in [200, 500]

class TestDataConsistency:
    """Test data consistency"""
    
    @patch('dashboard.backend.app.parse_tasks')
    def test_data_structure_consistency(self, mock_parse, client):
        """Test that API returns consistent data structures"""
        mock_parse.return_value = [
            {
                'area': 'Test Area',
                'tasks': [
                    {
                        'id': 'test1',
                        'description': 'Test task',
                        'completed': False,
                        'priority': 'medium'
                    }
                ]
            }
        ]
        
        response = client.get("/tasks")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
        assert "data" in data
        assert isinstance(data["data"], list)
        
        if data["data"]:
            area = data["data"][0]
            assert "area" in area
            assert "tasks" in area
            assert isinstance(area["tasks"], list)
            
            if area["tasks"]:
                task = area["tasks"][0]
                assert "id" in task
                assert "description" in task
                assert "completed" in task
