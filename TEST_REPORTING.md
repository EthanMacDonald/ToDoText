# Test Reporting System

The Todo Auto project now includes a comprehensive test reporting system that generates detailed logs and summaries for all test runs.

## 📊 Generated Reports

### Summary Files (tests/reports/)
- `test_summary.txt` - Overall test execution summary
- `backend_summary.txt` - Backend-specific test results  
- `frontend_summary.txt` - Frontend-specific test results
- `integration_summary.txt` - Integration test results
- `e2e_summary.txt` - End-to-end test results

### Log Files (tests/logs/)
- Individual test output logs
- Coverage reports
- Server startup logs
- Error details and debugging information

## 🎯 Quick Usage

### Run Tests and Generate Reports
```bash
# Run all tests and generate comprehensive reports
./scripts/run_tests.sh

# Run specific test categories
./scripts/run_tests.sh backend
./scripts/run_tests.sh frontend
./scripts/run_tests.sh integration
./scripts/run_tests.sh e2e

# Using npm scripts
npm run test:all
npm run test:backend:only
npm run test:frontend:only
```

### View Test Reports
```bash
# View main summary
./scripts/view_test_reports.sh summary
npm run reports:summary

# View specific category reports
./scripts/view_test_reports.sh backend
npm run reports:backend

# View all reports
./scripts/view_test_reports.sh all
npm run reports:all

# List available log files
./scripts/view_test_reports.sh logs
```

### Quick File Access
```bash
# View main summary directly
cat tests/reports/test_summary.txt

# View backend test details
cat tests/reports/backend_summary.txt

# Check specific test logs
cat tests/logs/test_stats.py.log
cat tests/logs/frontend_tests.log
```

## 📋 Report Contents

Each report includes:
- **Execution timestamps** - When tests started and completed
- **Pass/fail counts** - Detailed breakdown by category
- **Success percentages** - Overall and category-specific rates
- **Failed test details** - Error messages and debugging info
- **Performance metrics** - Test execution times
- **Coverage information** - Code coverage reports when available

## 🔄 Automatic Generation

Reports are automatically generated every time you run tests:
- Files are created in `tests/reports/` and `tests/logs/`
- Previous reports are overwritten with each new test run
- All output is captured and logged for later review
- Reports include both terminal output and detailed error logs

## 📁 File Organization

```
tests/
├── reports/           # Human-readable test summaries
│   ├── test_summary.txt
│   ├── backend_summary.txt
│   ├── frontend_summary.txt
│   ├── integration_summary.txt
│   └── e2e_summary.txt
└── logs/              # Detailed test output logs
    ├── test_*.log     # Individual test logs
    ├── *_coverage.log # Coverage reports
    └── *_tests.log    # Category-specific logs
```

## 🚀 Benefits

- **No more watching terminal output** - All results saved to files
- **Easy debugging** - Detailed error logs for failed tests
- **Historical tracking** - Previous run results available
- **Quick status checks** - Summary files show pass/fail at a glance
- **Integration ready** - Reports can be used by CI/CD systems

## 💡 Tips

- Use `npm run reports:summary` for a quick overview
- Check `tests/logs/` for detailed debugging information  
- Reports are excluded from git (see .gitignore)
- Run tests regularly to maintain fresh reports
- View reports in your preferred text editor or terminal
