#!/bin/bash

# Stop Task Dashboard Script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🛑 Stopping Task Dashboard..."

# Stop backend
if [ -f "$PROJECT_ROOT/dashboard/backend/backend.pid" ]; then
    BACKEND_PID=$(cat "$PROJECT_ROOT/dashboard/backend/backend.pid")
    if kill -0 "$BACKEND_PID" 2>/dev/null; then
        kill "$BACKEND_PID"
        echo "✅ Backend stopped (PID: $BACKEND_PID)"
    else
        echo "⚠️  Backend process not running"
    fi
    rm -f "$PROJECT_ROOT/dashboard/backend/backend.pid"
else
    echo "⚠️  Backend PID file not found"
fi

# Stop frontend
if [ -f "$PROJECT_ROOT/dashboard/backend/frontend.pid" ]; then
    FRONTEND_PID=$(cat "$PROJECT_ROOT/dashboard/backend/frontend.pid")
    if kill -0 "$FRONTEND_PID" 2>/dev/null; then
        kill "$FRONTEND_PID"
        echo "✅ Frontend stopped (PID: $FRONTEND_PID)"
    else
        echo "⚠️  Frontend process not running"
    fi
    rm -f "$PROJECT_ROOT/dashboard/backend/frontend.pid"
else
    echo "⚠️  Frontend PID file not found"
fi

# Also try to kill any remaining processes by name
pkill -f "uvicorn app:app" 2>/dev/null && echo "✅ Killed remaining backend processes" || true
pkill -f "vite.*5173" 2>/dev/null && echo "✅ Killed remaining frontend processes" || true

# Clean up log files (optional)
if [ -f "$PROJECT_ROOT/log_files/backend.log" ]; then
    echo "📝 Backend logs saved at: $PROJECT_ROOT/log_files/backend.log"
fi

if [ -f "$PROJECT_ROOT/log_files/frontend.log" ]; then
    echo "📝 Frontend logs saved at: $PROJECT_ROOT/log_files/frontend.log"
fi

echo "🏁 Task Dashboard stopped"
