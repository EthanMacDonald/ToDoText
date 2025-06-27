#!/bin/bash

# Hybrid Task Manager - Remote Access Startup Script
# This script starts the dashboard configured for remote access via Tailscale

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

echo "🚀 Starting Hybrid Task Manager for Remote Access..."

# Check if Tailscale is installed
if ! command -v tailscale &> /dev/null; then
    echo "❌ Tailscale not found. Please install it first:"
    echo "   brew install tailscale"
    exit 1
fi

# Check if Tailscale is running and connected
if ! tailscale status &> /dev/null; then
    echo "⚠️  Tailscale not connected. Please run:"
    echo "   sudo tailscale up"
    echo "   Then re-run this script."
    exit 1
fi

# Get Tailscale IP
TAILSCALE_IP=$(tailscale ip -4 2>/dev/null || echo "unknown")

# Kill any existing instances
echo "🧹 Cleaning up existing processes..."
pkill -f "uvicorn app:app" 2>/dev/null || true
pkill -f "vite.*5173" 2>/dev/null || true
sleep 2

# Start backend
echo "🔧 Starting backend (FastAPI)..."
cd "$PROJECT_ROOT/dashboard/backend"
uvicorn app:app --host 0.0.0.0 --port 8000 --reload > "$PROJECT_ROOT/log_files/backend.log" 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > backend.pid

# Wait a moment for backend to start
sleep 3

# Start frontend
echo "🎨 Starting frontend (React + TypeScript)..."
cd "$PROJECT_ROOT/dashboard/frontend"
npm run dev -- --host 0.0.0.0 --port 5173 > "$PROJECT_ROOT/log_files/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > "$PROJECT_ROOT/dashboard/backend/frontend.pid"

echo ""
echo "✅ Dashboard started successfully!"
echo ""
echo "📱 Access from Tailscale devices:"
if [ "$TAILSCALE_IP" != "unknown" ]; then
    echo "   🌐 http://$TAILSCALE_IP:5173"
fi
echo "   🏠 http://$(hostname -s):5173 (Magic DNS)"
echo ""
echo "🖥️  Local access:"
echo "   🌐 http://localhost:5173"
echo ""
echo "📋 Process IDs:"
echo "   Backend: $BACKEND_PID"
echo "   Frontend: $FRONTEND_PID"
echo ""
echo "📊 View logs:"
echo "   tail -f $PROJECT_ROOT/log_files/backend.log"
echo "   tail -f $PROJECT_ROOT/log_files/frontend.log"
echo ""
echo "🛑 To stop the dashboard:"
echo "   $PROJECT_ROOT/scripts/stop_dashboard.sh"
echo ""

# Return to original directory
cd "$PROJECT_ROOT"
