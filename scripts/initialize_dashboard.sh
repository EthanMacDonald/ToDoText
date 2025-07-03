#!/bin/bash

# Task Dashboard Initialization Script
# This script initializes and runs both backend and frontend components in the background

set -e  # Exit on any error

echo "🚀 Initializing Task Dashboard..."

# Get the script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_ROOT/dashboard/backend"
FRONTEND_DIR="$PROJECT_ROOT/dashboard/frontend"

# Initialize virtual environment for this script
initialize_virtual_env() {
    print_status "Initializing virtual environment..."
    
    # Check if .todo_env exists
    if [ ! -d "$PROJECT_ROOT/.todo_env" ]; then
        print_error "Virtual environment '.todo_env' not found"
        print_status "Please create the virtual environment first:"
        print_status "  python3 -m venv .todo_env"
        print_status "  source .todo_env/bin/activate"
        print_status "  pip install -r requirements.txt"
        exit 1
    fi
    
    # Activate the virtual environment
    print_status "Activating virtual environment: .todo_env"
    source "$PROJECT_ROOT/.todo_env/bin/activate"
    
    if [ $? -eq 0 ]; then
        print_success "Successfully activated .todo_env"
        print_status "Using Python: $(which python)"
    else
        print_error "Failed to activate .todo_env"
        exit 1
    fi
}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required files exist, create them if they don't
check_required_files() {
    print_status "Checking required files..."
    
    local files=("tasks.txt" "recurring_tasks.txt" "archive_files/archive.txt")
    
    for file in "${files[@]}"; do
        if [ ! -f "$PROJECT_ROOT/$file" ]; then
            print_warning "$file not found, creating empty file..."
            touch "$PROJECT_ROOT/$file"
        else
            print_success "$file exists"
        fi
    done
}

# Setup and start backend
setup_backend() {
    print_status "Setting up backend..."
    
    if [ ! -d "$BACKEND_DIR" ]; then
        print_error "Backend directory not found: $BACKEND_DIR"
        exit 1
    fi
    
    # Ensure virtual environment is activated
    if [ -z "$VIRTUAL_ENV" ]; then
        print_error "Virtual environment not properly activated"
        exit 1
    fi
    
    cd "$BACKEND_DIR"
    
    # Start backend server in background
    print_status "Starting FastAPI backend server..."
    nohup uvicorn app:app --reload --host 127.0.0.1 --port 8000 > "$PROJECT_ROOT/log_files/backend.log" 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > "$PROJECT_ROOT/log_files/backend.pid"
    
    print_success "Backend server started (PID: $BACKEND_PID)"
    print_status "Backend logs: $PROJECT_ROOT/log_files/backend.log"
    print_status "Backend API: http://127.0.0.1:8000"
    print_status "API docs: http://127.0.0.1:8000/docs"
}

# Setup and start frontend
setup_frontend() {
    print_status "Setting up frontend..."
    
    if [ ! -d "$FRONTEND_DIR" ]; then
        print_error "Frontend directory not found: $FRONTEND_DIR"
        exit 1
    fi
    
    cd "$FRONTEND_DIR"
    
    # Check if package.json exists
    if [ ! -f "package.json" ]; then
        print_status "Initializing React TypeScript project..."
        npm create vite@latest . -- --template react-ts
    fi
    
    # Install dependencies
    print_status "Installing Node.js dependencies..."
    npm install
    
    # Start frontend server in background
    print_status "Starting React development server..."
    nohup npm run dev > "$PROJECT_ROOT/log_files/frontend.log" 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > "$PROJECT_ROOT/log_files/frontend.pid"
    
    print_success "Frontend server started (PID: $FRONTEND_PID)"
    print_status "Frontend logs: $PROJECT_ROOT/log_files/frontend.log"
}

# Wait for servers to start and get frontend URL
wait_for_servers() {
    print_status "Waiting for servers to start..."
    sleep 5
    
    # Check if backend is running
    if curl -s http://127.0.0.1:8000/docs > /dev/null; then
        print_success "Backend is running at http://127.0.0.1:8000"
    else
        print_warning "Backend may still be starting up..."
    fi
    
    # Extract frontend URL from logs
    sleep 3
    if [ -f "$PROJECT_ROOT/log_files/frontend.log" ]; then
        FRONTEND_URL=$(grep -o "http://localhost:[0-9]*" "$PROJECT_ROOT/log_files/frontend.log" | head -1)
        if [ -n "$FRONTEND_URL" ]; then
            print_success "Frontend is running at $FRONTEND_URL"
        else
            print_warning "Frontend URL not detected, check logs: $PROJECT_ROOT/log_files/frontend.log"
        fi
    fi
}



# Main execution
main() {
    cd "$PROJECT_ROOT"
    
    # Initialize virtual environment first
    initialize_virtual_env
    
    # Check dependencies
    if ! command -v python3 &> /dev/null; then
        print_error "python3 is required but not installed"
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        print_error "node is required but not installed"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is required but not installed"
        exit 1
    fi
    
    # Check if virtual environment is properly activated
    if [ -z "$VIRTUAL_ENV" ]; then
        print_error "Virtual environment '.todo_env' not properly activated!"
        exit 1
    fi
    
    print_success "Using virtual environment: $VIRTUAL_ENV"
    
    # Setup process
    check_required_files
    setup_backend
    setup_frontend
    wait_for_servers
    
    echo ""
    print_success "🎉 Task Dashboard is now running!"
    echo ""
    echo "📊 Dashboard URLs:"
    echo "   • Backend API: http://127.0.0.1:8000"
    echo "   • API Documentation: http://127.0.0.1:8000/docs"
    if [ -n "$FRONTEND_URL" ]; then
        echo "   • Frontend App: $FRONTEND_URL"
    else
        echo "   • Frontend App: Check $PROJECT_ROOT/log_files/frontend.log for URL"
    fi
    echo ""
    echo "📝 Logs:"
    echo "   • Backend: $PROJECT_ROOT/log_files/backend.log"
    echo "   • Frontend: $PROJECT_ROOT/log_files/frontend.log"
    echo ""
    echo "🛑 To stop the dashboard:"
    echo "   ./stop_dashboard.sh"
    echo ""
    echo "🔍 To monitor logs:"
    echo "   tail -f log_files/backend.log"
    echo "   tail -f log_files/frontend.log"
}

# Trap to cleanup on script exit
cleanup() {
    if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
        print_warning "Cleaning up background processes..."
    fi
}

trap cleanup EXIT

# Run main function
main "$@"
