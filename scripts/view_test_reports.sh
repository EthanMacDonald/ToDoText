#!/bin/bash

# Test Report Viewer Script
# Displays test results from the generated report files

echo "🔍 Todo Auto Test Reports Viewer"
echo "================================"
echo ""

REPORTS_DIR="tests/reports"
LOGS_DIR="tests/logs"

# Function to display a report file
show_report() {
    local file="$1"
    local title="$2"
    
    if [[ -f "$file" ]]; then
        echo "📊 $title"
        echo "$(printf '=%.0s' {1..50})"
        cat "$file"
        echo ""
        echo "$(printf '=%.0s' {1..50})"
        echo ""
    else
        echo "❌ $title report not found: $file"
        echo ""
    fi
}

# Check if reports directory exists
if [[ ! -d "$REPORTS_DIR" ]]; then
    echo "❌ Reports directory not found: $REPORTS_DIR"
    echo "Please run the test suite first: ./scripts/run_tests.sh"
    exit 1
fi

# Show menu if no arguments provided
if [[ $# -eq 0 ]]; then
    echo "Available reports:"
    echo "1. all      - Show all reports"
    echo "2. summary  - Show main test summary"
    echo "3. backend  - Show backend test results"
    echo "4. frontend - Show frontend test results"
    echo "5. integration - Show integration test results"
    echo "6. e2e      - Show E2E test results"
    echo "7. logs     - List available log files"
    echo ""
    echo "Usage: $0 [report_type]"
    echo "Example: $0 summary"
    exit 0
fi

case "$1" in
    "all")
        show_report "$REPORTS_DIR/test_summary.txt" "MAIN TEST SUMMARY"
        show_report "$REPORTS_DIR/backend_summary.txt" "BACKEND TESTS"
        show_report "$REPORTS_DIR/frontend_summary.txt" "FRONTEND TESTS"
        show_report "$REPORTS_DIR/integration_summary.txt" "INTEGRATION TESTS"
        show_report "$REPORTS_DIR/e2e_summary.txt" "E2E TESTS"
        ;;
    "summary")
        show_report "$REPORTS_DIR/test_summary.txt" "MAIN TEST SUMMARY"
        ;;
    "backend")
        show_report "$REPORTS_DIR/backend_summary.txt" "BACKEND TEST RESULTS"
        ;;
    "frontend")
        show_report "$REPORTS_DIR/frontend_summary.txt" "FRONTEND TEST RESULTS"
        ;;
    "integration")
        show_report "$REPORTS_DIR/integration_summary.txt" "INTEGRATION TEST RESULTS"
        ;;
    "e2e")
        show_report "$REPORTS_DIR/e2e_summary.txt" "E2E TEST RESULTS"
        ;;
    "logs")
        echo "📁 Available Log Files:"
        echo "======================="
        if [[ -d "$LOGS_DIR" ]]; then
            ls -la "$LOGS_DIR/"
        else
            echo "No log files found in $LOGS_DIR"
        fi
        echo ""
        ;;
    *)
        echo "❌ Unknown report type: $1"
        echo "Run '$0' without arguments to see available options."
        exit 1
        ;;
esac

# Show quick stats
if [[ -f "$REPORTS_DIR/test_summary.txt" ]]; then
    echo "📈 Quick Stats:"
    echo "==============="
    grep -E "(Total Tests|Passed Tests|Failed Tests|Success Rate)" "$REPORTS_DIR/test_summary.txt" 2>/dev/null || echo "Stats not available"
    echo ""
fi

echo "💡 Tip: View logs with 'cat tests/logs/[filename]' or '$0 logs'"
