# Auto-Start Dashboard on Computer Startup

This guide explains how to configure your Task Dashboard to automatically start when your computer boots up or when you log in. **The dashboard now uses Python virtual environment management for Python dependencies.**

## Prerequisites

- **Python Virtual Environment**: The dashboard requires the `.todo_env` virtual environment
- **Node.js**: Required for the frontend React application
- **Both Python and Node.js** must be accessible in your PATH

## Quick Setup (Recommended)

### Option 1: LaunchAgent (Starts on Login)
Run the automated setup script:
```bash
./scripts/setup_autostart.sh
```

This will:
- Create a macOS LaunchAgent that starts the dashboard when you log in
- Configure automatic restart if the dashboard crashes
- Set up logging for troubleshooting
- Handle environment variables and paths properly

### To Remove Auto-Start:
```bash
./scripts/remove_autostart.sh
```

## Manual Setup Options

### 1. LaunchAgent (Recommended for Personal Use)

**What it does:** Starts the dashboard when you log in to your user account.

**Pros:**
- Runs in your user context (access to your files)
- Automatically restarts if it crashes
- Easy to manage and troubleshoot
- Proper logging support

**Setup:**
1. Create the LaunchAgent file at `~/Library/LaunchAgents/com.taskmanager.dashboard.plist`
2. Use the automated script above, or manually create the configuration

**Management Commands:**
```bash
# Check if service is running
launchctl list | grep com.taskmanager.dashboard

# View logs
tail -f log_files/autostart.log

# Stop service
launchctl unload ~/Library/LaunchAgents/com.taskmanager.dashboard.plist

# Start service
launchctl load ~/Library/LaunchAgents/com.taskmanager.dashboard.plist

# Restart service
launchctl unload ~/Library/LaunchAgents/com.taskmanager.dashboard.plist && launchctl load ~/Library/LaunchAgents/com.taskmanager.dashboard.plist
```

### 2. macOS Login Items

**What it does:** Uses the built-in macOS Login Items feature.

**Pros:**
- Very simple to set up
- Managed through System Preferences
- No command line required

**Setup:**
1. Open System Preferences → Users & Groups → Login Items
2. Click the "+" button
3. Navigate to and select `scripts/initialize_dashboard.sh`
4. Make sure "Hide" is unchecked if you want to see the terminal window

**Cons:**
- Less control over restart behavior
- May not handle crashes as gracefully

### 3. LaunchDaemon (System-Wide Service)

**What it does:** Starts at boot time before any user logs in.

**Pros:**
- Available immediately at boot
- Works even if no user is logged in
- More robust for server-like usage

**Cons:**
- Requires admin privileges to set up
- May not have access to user-specific files
- More complex troubleshooting

**Setup:**
1. Create `/Library/LaunchDaemons/com.taskmanager.dashboard.plist` (requires sudo)
2. Configure it to run as your user account
3. Load with `sudo launchctl load /Library/LaunchDaemons/com.taskmanager.dashboard.plist`

### 4. Cron Job

**What it does:** Uses cron's @reboot feature to start the dashboard.

**Setup:**
```bash
# Edit crontab
crontab -e

# Add this line:
@reboot /path/to/your/todo_auto/scripts/initialize_dashboard.sh
```

**Pros:**
- Simple and familiar
- Cross-platform approach

**Cons:**
- Less macOS-native
- May not handle user login context properly
- Limited restart capabilities

## Environment Setup

The dashboard initialization script now automatically:
1. **Detects virtual environment** - Checks for `.todo_env` directory
2. **Activates .todo_env** - Uses the virtual environment with all required packages
3. **Validates environment** - Ensures required packages are available
4. **Sets up proper paths** - Configures environment variables for autostart

### Virtual Environment Requirements
The script requires a `.todo_env` virtual environment with all dependencies installed:
- FastAPI and uvicorn for the backend
- Google Calendar API packages
- All other requirements from `requirements.txt`

### Manual Setup (if needed)
If the virtual environment doesn't exist, create it:
```bash
# Create virtual environment
python3 -m venv .todo_env

# Activate it
source .todo_env/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Manual Testing
Before setting up autostart, test the dashboard manually:
```bash
# Test the initialization script
./scripts/initialize_dashboard.sh

# If successful, you should see:
# ✅ Successfully activated .todo_env
# ✅ Backend server started
# ✅ Frontend server started
```

## Troubleshooting Auto-Start

### Check Service Status
```bash
# For LaunchAgent
launchctl list | grep com.taskmanager.dashboard

# Check if processes are running
ps aux | grep -E "(uvicorn|vite)" | grep -v grep
```

### View Logs
```bash
# Auto-start logs
tail -f log_files/autostart.log
tail -f log_files/autostart.error.log

# Dashboard logs
tail -f log_files/backend.log
tail -f log_files/frontend.log
```

### Common Issues

**Service won't start:**
1. Check that the script is executable: `chmod +x scripts/initialize_dashboard.sh`
2. Verify `.todo_env` virtual environment exists and is properly set up
3. Ensure virtual environment has all required packages installed
4. Check environment variables (especially PATH)

**Virtual environment issues:**
1. Verify virtual environment exists: `ls -la .todo_env`
2. Test manual activation: `source .todo_env/bin/activate`
3. Check if required packages are installed: `pip list`
4. Reinstall packages if needed: `pip install -r requirements.txt`

**Dashboard starts but isn't accessible:**
1. Check if ports 8000 and 5173 are available
2. Verify firewall settings
3. Check if other services are using those ports
4. Ensure virtual environment has FastAPI and uvicorn installed

**Service starts but crashes:**
1. Check logs for virtual environment related errors
2. Verify virtual environment path is correct in the script
3. Test running the script manually: `./scripts/initialize_dashboard.sh`
4. Check if all required Python packages are installed

### Testing the Setup

1. **Test the script manually:**
   ```bash
   ./scripts/initialize_dashboard.sh
   ```

2. **Test the LaunchAgent:**
   ```bash
   launchctl unload ~/Library/LaunchAgents/com.taskmanager.dashboard.plist
   launchctl load ~/Library/LaunchAgents/com.taskmanager.dashboard.plist
   ```

3. **Check the dashboard:**
   - Visit `http://localhost:5173` in your browser
   - Verify both frontend and backend are responding

## Security Considerations

- **Local Access Only:** The default configuration only allows local access
- **Remote Access:** If you need remote access, use the `start_dashboard_remote.sh` script instead
- **Firewall:** Consider firewall settings if you have strict security requirements
- **Updates:** Auto-start won't automatically update the dashboard code

## Recommended Workflow

1. **Start with LaunchAgent:** Use the automated setup script for most use cases
2. **Test thoroughly:** Log out and back in to verify it works
3. **Monitor logs:** Check logs periodically to ensure everything is running smoothly
4. **Regular maintenance:** Update the dashboard code as needed

The LaunchAgent approach is recommended for most users as it provides the best balance of reliability, ease of use, and proper macOS integration.
