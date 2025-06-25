#!/bin/bash

# Stop Task Dashboard Script
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🛑 Stopping Task Dashboard..."

# Stop backend
if [ -f "$PROJECT_ROOT/backend.pid" ]; then
    BACKEND_PID=$(cat "$PROJECT_ROOT/backend.pid")
    if kill -0 "$BACKEND_PID" 2>/dev/null; then
        kill "$BACKEND_PID"
        echo "✅ Backend stopped (PID: $BACKEND_PID)"
    else
        echo "⚠️  Backend process not running"
    fi
    rm -f "$PROJECT_ROOT/backend.pid"
else
    echo "⚠️  Backend PID file not found"
fi

# Stop frontend
if [ -f "$PROJECT_ROOT/frontend.pid" ]; then
    FRONTEND_PID=$(cat "$PROJECT_ROOT/frontend.pid")
    if kill -0 "$FRONTEND_PID" 2>/dev/null; then
        kill "$FRONTEND_PID"
        echo "✅ Frontend stopped (PID: $FRONTEND_PID)"
    else
        echo "⚠️  Frontend process not running"
    fi
    rm -f "$PROJECT_ROOT/frontend.pid"
else
    echo "⚠️  Frontend PID file not found"
fi

# Clean up log files (optional)
if [ -f "$PROJECT_ROOT/backend.log" ]; then
    echo "📝 Backend logs saved at: $PROJECT_ROOT/backend.log"
fi

if [ -f "$PROJECT_ROOT/frontend.log" ]; then
    echo "📝 Frontend logs saved at: $PROJECT_ROOT/frontend.log"
fi

echo "🏁 Task Dashboard stopped"
