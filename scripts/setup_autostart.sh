#!/bin/bash

# Setup Auto-Start for Task Dashboard
# This script sets up a macOS LaunchAgent to start the dashboard on login

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
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

echo "🚀 Setting up Task Dashboard Auto-Start with Remote Access..."

# Check if virtual environment exists
if [ ! -d "$PROJECT_ROOT/.todo_env" ]; then
    print_error "Virtual environment '.todo_env' not found!"
    print_status "Please create the virtual environment first:"
    print_status "  python3 -m venv .todo_env"
    print_status "  source .todo_env/bin/activate"
    print_status "  pip install -r requirements.txt"
    exit 1
fi

print_status "Found virtual environment: $PROJECT_ROOT/.todo_env"

# Get Python version for PYTHONPATH
PYTHON_VERSION=$(cd "$PROJECT_ROOT" && source .todo_env/bin/activate && python -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
PYTHON_SITE_PACKAGES="$PROJECT_ROOT/.todo_env/lib/python${PYTHON_VERSION}/site-packages"

print_status "Detected Python version: $PYTHON_VERSION"
print_status "Using site-packages: $PYTHON_SITE_PACKAGES"

# Create LaunchAgents directory if it doesn't exist
mkdir -p "$LAUNCH_AGENTS_DIR"

# Unload existing service if it exists
if [ -f "$PLIST_PATH" ]; then
    print_status "Unloading existing service..."
    launchctl unload "$PLIST_PATH" 2>/dev/null || true
fi

# Create the LaunchAgent plist file
print_status "Creating LaunchAgent configuration..."
cat > "$PLIST_PATH" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.taskmanager.dashboard</string>
    
    <key>ProgramArguments</key>
    <array>
        <string>$PROJECT_ROOT/scripts/initialize_dashboard.sh</string>
        <string>--remote</string>
    </array>
    
    <key>RunAtLoad</key>
    <true/>
    
    <key>KeepAlive</key>
    <true/>
    
    <key>StandardOutPath</key>
    <string>$PROJECT_ROOT/log_files/autostart.log</string>
    
    <key>StandardErrorPath</key>
    <string>$PROJECT_ROOT/log_files/autostart.error.log</string>
    
    <key>WorkingDirectory</key>
    <string>$PROJECT_ROOT</string>
    
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin:/usr/local/sbin:$PROJECT_ROOT/.todo_env/bin</string>
        <key>VIRTUAL_ENV</key>
        <string>$PROJECT_ROOT/.todo_env</string>
        <key>PYTHONPATH</key>
        <string>$PYTHON_SITE_PACKAGES</string>
        <key>HOME</key>
        <string>$HOME</string>
    </dict>
    
    <key>ProcessType</key>
    <string>Background</string>
</dict>
</plist>
EOF

# Make the script executable
chmod +x "$PROJECT_ROOT/scripts/initialize_dashboard.sh"

# Load the LaunchAgent
print_status "Loading LaunchAgent..."
launchctl load "$PLIST_PATH"

# Test the LaunchAgent environment
print_status "Testing LaunchAgent setup..."
sleep 5

# Check if the service is loaded
if launchctl list | grep -q "com.taskmanager.dashboard"; then
    print_success "LaunchAgent loaded successfully"
else
    print_warning "LaunchAgent may not have loaded correctly"
fi

print_success "✅ Task Dashboard auto-start with remote access is now configured!"
print_status "The dashboard will automatically start with remote access when you log in."
echo ""
echo "📋 Management Commands:"
echo "  • Check status: launchctl list | grep com.taskmanager.dashboard"
echo "  • View logs: tail -f $PROJECT_ROOT/log_files/autostart.log"
echo "  • Stop service: launchctl unload $PLIST_PATH"
echo "  • Start service: launchctl load $PLIST_PATH"
echo "  • Restart service: launchctl unload $PLIST_PATH && launchctl load $PLIST_PATH"
echo ""
echo "🗂️  Configuration file: $PLIST_PATH"
echo "📝 Logs will be saved to: $PROJECT_ROOT/log_files/autostart.log"
echo ""
print_status "🌐 Remote Access Information:"
print_status "  • Dashboard will be accessible via Tailscale on all network interfaces"
print_status "  • Backend API: http://[TAILSCALE_IP]:8000"
print_status "  • Frontend: http://[TAILSCALE_IP]:5173"
print_status "  • Check your Tailscale IP with: tailscale ip -4"
