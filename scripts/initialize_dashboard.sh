#!/bin/bash

# Task Dashboard Initialization Script
# This script initializes and runs both backend and frontend components in the background
# Usage: ./initialize_dashboard.sh [--remote]

set -e  # Exit on any error

# Parse command line arguments
REMOTE_ACCESS=false
if [[ "$1" == "--remote" ]]; then
    REMOTE_ACCESS=true
    echo "🌐 Initializing Task Dashboard with Remote Access..."
else
    echo "🚀 Initializing Task Dashboard..."
fi

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
    if [ "$REMOTE_ACCESS" = true ]; then
        print_status "Starting FastAPI backend server with remote access..."
        nohup uvicorn app:app --host 0.0.0.0 --port 8000 > "$PROJECT_ROOT/log_files/backend.log" 2>&1 &
    else
        print_status "Starting FastAPI backend server (local only)..."
        nohup uvicorn app:app --host 127.0.0.1 --port 8000 > "$PROJECT_ROOT/log_files/backend.log" 2>&1 &
    fi
    
    BACKEND_PID=$!
    echo $BACKEND_PID > "$PROJECT_ROOT/log_files/backend.pid"
    
    print_success "Backend server started (PID: $BACKEND_PID)"
    print_status "Backend logs: $PROJECT_ROOT/log_files/backend.log"
    
    if [ "$REMOTE_ACCESS" = true ]; then
        print_status "Backend API: http://0.0.0.0:8000 (accessible remotely)"
        if [ -n "$TAILSCALE_IP" ] && [ "$TAILSCALE_IP" != "unknown" ]; then
            print_status "Remote access: http://$TAILSCALE_IP:8000"
        fi
    else
        print_status "Backend API: http://127.0.0.1:8000"
    fi
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
    if [ "$REMOTE_ACCESS" = true ]; then
        print_status "Starting React development server with remote access..."
        nohup npm run dev -- --host 0.0.0.0 --port 5173 > "$PROJECT_ROOT/log_files/frontend.log" 2>&1 &
    else
        print_status "Starting React development server (local only)..."
        nohup npm run dev > "$PROJECT_ROOT/log_files/frontend.log" 2>&1 &
    fi
    
    FRONTEND_PID=$!
    echo $FRONTEND_PID > "$PROJECT_ROOT/log_files/frontend.pid"
    
    print_success "Frontend server started (PID: $FRONTEND_PID)"
    print_status "Frontend logs: $PROJECT_ROOT/log_files/frontend.log"
}

# Check for Tailscale if remote access is requested
check_tailscale() {
    if [ "$REMOTE_ACCESS" = true ]; then
        print_status "Checking Tailscale for remote access..."
        
        # Check if Tailscale is installed
        if ! command -v tailscale &> /dev/null; then
            print_error "Tailscale not found. Please install it first:"
            print_status "  brew install tailscale"
            exit 1
        fi
        
        # Check if Tailscale is running and connected
        if ! tailscale status &> /dev/null; then
            print_warning "Tailscale not connected. Please run:"
            print_status "  sudo tailscale up"
            print_status "Remote access will not be available until Tailscale is connected."
            print_status "Continuing with local-only setup..."
            REMOTE_ACCESS=false
        else
            TAILSCALE_IP=$(tailscale ip -4 2>/dev/null || echo "unknown")
            print_success "Tailscale connected. Remote access will be available."
        fi
    fi
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
    check_tailscale
    setup_backend
    setup_frontend
    wait_for_servers
    
    echo ""
    if [ "$REMOTE_ACCESS" = true ]; then
        print_success "🎉 Task Dashboard is now running with Remote Access!"
    else
        print_success "🎉 Task Dashboard is now running!"
    fi
    echo ""
    echo "📊 Dashboard URLs:"
    
    if [ "$REMOTE_ACCESS" = true ]; then
        echo "   🌐 Local Access:"
        echo "     • Backend API: http://127.0.0.1:8000"
        echo "     • API Documentation: http://127.0.0.1:8000/docs"
        if [ -n "$FRONTEND_URL" ]; then
            echo "     • Frontend App: $FRONTEND_URL"
        else
            echo "     • Frontend App: Check logs for URL"
        fi
        
        echo ""
        echo "   🚀 Remote Access (via Tailscale):"
        if [ -n "$TAILSCALE_IP" ] && [ "$TAILSCALE_IP" != "unknown" ]; then
            echo "     • Backend API: http://$TAILSCALE_IP:8000"
            echo "     • Frontend App: http://$TAILSCALE_IP:5173"
        fi
        echo "     • Magic DNS: http://$(hostname -s):5173"
    else
        echo "   • Backend API: http://127.0.0.1:8000"
        echo "   • API Documentation: http://127.0.0.1:8000/docs"
        if [ -n "$FRONTEND_URL" ]; then
            echo "   • Frontend App: $FRONTEND_URL"
        else
            echo "   • Frontend App: Check $PROJECT_ROOT/log_files/frontend.log for URL"
        fi
        echo ""
        echo "   💡 For remote access, run: ./scripts/initialize_dashboard.sh --remote"
    fi
    
    echo ""
    echo "📝 Logs:"
    echo "   • Backend: $PROJECT_ROOT/log_files/backend.log"
    echo "   • Frontend: $PROJECT_ROOT/log_files/frontend.log"
    echo ""
    echo "🛑 To stop the dashboard:"
    echo "   ./scripts/stop_dashboard.sh"
    echo ""
    echo "🔍 To monitor logs:"
    echo "   tail -f log_files/backend.log"
    echo "   tail -f log_files/frontend.log"
    
    # Keep the script alive for LaunchAgent
    # This prevents LaunchAgent from killing child processes
    print_status "Dashboard initialized. Keeping processes alive..."
    while true; do
        # Check if backend is still running
        if [ -f "$PROJECT_ROOT/log_files/backend.pid" ]; then
            BACKEND_PID=$(cat "$PROJECT_ROOT/log_files/backend.pid")
            if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
                print_warning "Backend process died, restarting..."
                setup_backend
            fi
        fi
        
        # Check if frontend is still running
        if [ -f "$PROJECT_ROOT/log_files/frontend.pid" ]; then
            FRONTEND_PID=$(cat "$PROJECT_ROOT/log_files/frontend.pid")
            if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
                print_warning "Frontend process died, restarting..."
                setup_frontend
            fi
        fi
        
        # Wait 30 seconds before next check
        sleep 30
    done
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
