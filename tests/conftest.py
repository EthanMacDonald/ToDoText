"""
Comprehensive Test Suite for Todo Auto Project
==============================================

This test suite covers all functionality of the todo project including:
- Backend API endpoints
- Parser functions  
- Task management
- Recurring tasks
- Statistics and analytics
- Frontend components
- Integration tests
- End-to-end tests

Test Structure:
- tests/backend/: Backend Python tests
- tests/frontend/: Frontend React/TypeScript tests  
- tests/integration/: Integration tests
- tests/e2e/: End-to-end tests

Requirements:
- pytest
- pytest-asyncio
- httpx
- fastapi[test]
- @testing-library/react
- @testing-library/jest-dom
- jest
- playwright (for e2e)

Run tests with:
    pytest tests/backend/
    npm test (for frontend)
    pytest tests/integration/
    playwright test (for e2e)
"""

import pytest
import os
import sys
import tempfile
import shutil
from pathlib import Path
from datetime import datetime, date, timedelta
from typing import Dict, List, Any

# Add project directories to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root / "dashboard" / "backend"))
sys.path.insert(0, str(project_root / "scripts"))

# Test configuration
TEST_CONFIG = {
    "test_data_dir": project_root / "tests" / "test_data",
    "backup_dir": project_root / "tests" / "backups",
    "original_tasks_file": project_root / "tasks.txt",
    "original_recurring_file": project_root / "recurring_tasks.txt",
    "test_tasks_file": project_root / "tests" / "test_data" / "tasks.txt",
    "test_recurring_file": project_root / "tests" / "test_data" / "recurring_tasks.txt",
}

class TestDataManager:
    """Manages test data setup and cleanup"""
    
    def __init__(self):
        self.test_data_dir = TEST_CONFIG["test_data_dir"]
        self.backup_dir = TEST_CONFIG["backup_dir"]
        
    def setup_test_environment(self):
        """Set up clean test environment"""
        # Create directories
        self.test_data_dir.mkdir(parents=True, exist_ok=True)
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        
        # Backup original files
        if TEST_CONFIG["original_tasks_file"].exists():
            shutil.copy2(TEST_CONFIG["original_tasks_file"], self.backup_dir / "tasks_backup.txt")
        if TEST_CONFIG["original_recurring_file"].exists():
            shutil.copy2(TEST_CONFIG["original_recurring_file"], self.backup_dir / "recurring_backup.txt")
    
    def create_sample_tasks_file(self, content: str = None):
        """Create sample tasks.txt for testing"""
        if content is None:
            content = self.get_default_tasks_content()
        
        with open(TEST_CONFIG["test_tasks_file"], 'w') as f:
            f.write(content)
    
    def create_sample_recurring_file(self, content: str = None):
        """Create sample recurring_tasks.txt for testing"""
        if content is None:
            content = self.get_default_recurring_content()
            
        with open(TEST_CONFIG["test_recurring_file"], 'w') as f:
            f.write(content)
    
    def get_default_tasks_content(self) -> str:
        """Get default tasks.txt content for testing"""
        today = date.today()
        yesterday = today - timedelta(days=1)
        tomorrow = today + timedelta(days=1)
        
        return f"""Work:
- [ ] Complete project documentation (priority:high due:{tomorrow} project:docs)
- [x] Review code changes (done:{yesterday} project:review)
- [ ] Update API endpoints (priority:medium)
    - [ ] Add authentication
    - [ ] Update error handling
- [ ] Team meeting @office (due:{today})

Personal:
- [ ] Grocery shopping @errands (priority:low)
- [x] Exercise routine (done:{yesterday})
- [ ] Call family (due:{today} context:home)

Learning:
- [ ] Read technical book +learning (priority:medium)
- [ ] Complete online course +skills (due:{tomorrow})
    - [ ] Watch video 1
    - [ ] Complete assignment
"""

    def get_default_recurring_content(self) -> str:
        """Get default recurring_tasks.txt content for testing"""
        return """daily_exercise:Daily Exercise:daily
morning_meditation:Morning Meditation:daily
weekly_review:Weekly Review:weekly
monthly_planning:Monthly Planning:monthly
standup_meeting:Daily Standup:weekdays
"""

    def cleanup_test_environment(self):
        """Clean up test environment"""
        # Restore original files
        if (self.backup_dir / "tasks_backup.txt").exists():
            shutil.copy2(self.backup_dir / "tasks_backup.txt", TEST_CONFIG["original_tasks_file"])
        if (self.backup_dir / "recurring_backup.txt").exists():
            shutil.copy2(self.backup_dir / "recurring_backup.txt", TEST_CONFIG["original_recurring_file"])

# Pytest fixtures
@pytest.fixture(scope="session")
def test_data_manager():
    """Session-scoped test data manager"""
    manager = TestDataManager()
    manager.setup_test_environment()
    yield manager
    manager.cleanup_test_environment()

@pytest.fixture
def sample_tasks_file(test_data_manager):
    """Create sample tasks file for testing"""
    test_data_manager.create_sample_tasks_file()
    yield TEST_CONFIG["test_tasks_file"]

@pytest.fixture  
def sample_recurring_file(test_data_manager):
    """Create sample recurring tasks file for testing"""
    test_data_manager.create_sample_recurring_file()
    yield TEST_CONFIG["test_recurring_file"]

@pytest.fixture
def clean_test_files(test_data_manager):
    """Provide clean test files for each test"""
    test_data_manager.create_sample_tasks_file()
    test_data_manager.create_sample_recurring_file()
    yield
    # Cleanup happens automatically

# Utility functions for tests
def assert_task_structure(task: Dict[str, Any], required_fields: List[str] = None):
    """Assert that a task has the required structure"""
    if required_fields is None:
        required_fields = ['id', 'description', 'completed', 'area']
    
    for field in required_fields:
        assert field in task, f"Task missing required field: {field}"

def assert_api_response_structure(response: Dict[str, Any], expected_status: str = "success"):
    """Assert that an API response has the correct structure"""
    assert "status" in response
    assert response["status"] == expected_status
    if expected_status == "success":
        assert "data" in response

def create_test_task_data() -> Dict[str, Any]:
    """Create test task data"""
    return {
        "description": "Test task",
        "area": "Testing",
        "priority": "medium",
        "due_date": str(date.today() + timedelta(days=1)),
        "project": "test",
        "context": "testing"
    }

# Test markers
pytest_marks = {
    "unit": pytest.mark.unit,
    "integration": pytest.mark.integration,
    "e2e": pytest.mark.e2e,
    "slow": pytest.mark.slow,
    "api": pytest.mark.api,
    "parser": pytest.mark.parser,
    "frontend": pytest.mark.frontend,
    "statistics": pytest.mark.statistics,
    "recurring": pytest.mark.recurring,
}
