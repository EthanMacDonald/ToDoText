#!/bin/bash

# Remove Auto-Start for Task Dashboard
# This script removes the macOS LaunchAgent that starts the dashboard on login

set -e

PLIST_NAME="com.taskmanager.dashboard.plist"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
PLIST_PATH="$LAUNCH_AGENTS_DIR/$PLIST_NAME"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

echo "🛑 Removing Task Dashboard Auto-Start..."

# Check if the service exists
if [ ! -f "$PLIST_PATH" ]; then
    print_warning "LaunchAgent not found at $PLIST_PATH"
    exit 0
fi

# Unload the service
print_status "Unloading LaunchAgent..."
launchctl unload "$PLIST_PATH" 2>/dev/null || true

# Remove the plist file
print_status "Removing configuration file..."
rm -f "$PLIST_PATH"

print_success "✅ Task Dashboard auto-start has been removed!"
print_status "The dashboard will no longer start automatically when you log in."
echo ""
echo "To manually start the dashboard, run:"
echo "  $PROJECT_ROOT/scripts/initialize_dashboard.sh"
