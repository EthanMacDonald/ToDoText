# Remote Access Setup Guide

This guide explains how to securely access your Hybrid Task Manager dashboard from anywhere using Tailscale.

## Overview

Tailscale creates a secure mesh network between your devices, allowing you to access your task dashboard remotely without exposing it to the public internet. It's free for personal use (up to 3 users, 100 devices) and requires zero network configuration.

## Prerequisites

- Task dashboard running on your primary machine (Mac/Linux/Windows)
- Devices you want to access the dashboard from (phone, laptop, etc.)
- Tailscale account (free at https://tailscale.com)

## Setup Instructions

### 1. Install Tailscale on Host Machine (where dashboard runs)

#### macOS:
```bash
# Install via Homebrew
brew install tailscale

# Start the Tailscale daemon
sudo brew services start tailscale

# Connect to your Tailscale network
sudo tailscale up
```

#### Linux:
```bash
# Install Tailscale
curl -fsSL https://tailscale.com/install.sh | sh

# Start and connect
sudo tailscale up
```

#### Windows:
- Download installer from https://tailscale.com/download/windows
- Run installer and follow prompts
- Sign in when prompted

### 2. Configure Dashboard for Remote Access

Update your dashboard startup commands to listen on all interfaces:

#### Backend (FastAPI):
```bash
cd dashboard/backend
# Instead of: uvicorn app:app --reload
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

#### Frontend (React + TypeScript):
```bash
cd dashboard/frontend
# Instead of: npm run dev
npm run dev -- --host 0.0.0.0 --port 5173
```

### 3. Install Tailscale on Remote Devices

#### Mobile (iOS/Android):
- Download "Tailscale" app from App Store/Google Play
- Sign in with same account used on host machine
- Enable connection

#### Other Computers:
- Visit https://tailscale.com/download
- Download appropriate installer
- Install and sign in with same account

### 4. Find Your Machine's Tailscale IP

On your host machine:
```bash
# Get your Tailscale IP address
tailscale ip -4

# Example output: 100.64.1.100
```

### 5. Access Dashboard Remotely

From any Tailscale-connected device, visit:
- `http://[TAILSCALE-IP]:5173` (replace with your actual IP)
- Example: `http://100.64.1.100:5173`

Or use Magic DNS (friendly names):
- `http://[MACHINE-NAME]:5173`
- Example: `http://ethan-macbook:5173`

## Advanced Configuration

### Enable Magic DNS (Recommended)
Magic DNS allows you to use friendly machine names instead of IP addresses.

```bash
# Enable Magic DNS
tailscale up --accept-dns
```

### Tailscale Serve (HTTPS with Zero Config)
For automatic HTTPS without certificates:

```bash
# Serve your dashboard with automatic HTTPS
tailscale serve --bg --https=443 http://localhost:5173

# Access via: https://machine-name.tailnet-name.ts.net
```

### Access Controls
Restrict which devices can connect to your machine:

```bash
# Enable shields-up mode (blocks incoming connections by default)
tailscale up --shields-up

# Or configure granular ACLs in Tailscale admin console
```

## Troubleshooting

### Dashboard not accessible
1. **Check if dashboard is running:**
   ```bash
   # Verify backend is running
   curl http://localhost:8000/api/tasks
   
   # Verify frontend is running
   curl http://localhost:5173
   ```

2. **Check Tailscale status:**
   ```bash
   tailscale status
   ```

3. **Verify host binding:**
   - Ensure dashboard is bound to `0.0.0.0`, not `localhost` or `127.0.0.1`
   - Check firewall settings on host machine

### Connection issues
1. **Restart Tailscale:**
   ```bash
   sudo tailscale down
   sudo tailscale up
   ```

2. **Check network connectivity:**
   ```bash
   # Ping from remote device
   ping [TAILSCALE-IP]
   ```

3. **Verify same Tailscale account:**
   - All devices must be signed into the same Tailscale account
   - Check device list at https://login.tailscale.com/admin/machines

### Performance optimization
1. **Enable direct connections:**
   ```bash
   # Ensure UPnP/NAT-PMP is enabled on your router
   tailscale netcheck
   ```

2. **Use subnet routing (if needed):**
   ```bash
   # Share your local network
   tailscale up --advertise-routes=192.168.1.0/24
   ```

## Security Best Practices

1. **Regular key rotation:**
   - Tailscale automatically rotates keys
   - Monitor device list regularly

2. **Remove unused devices:**
   - Delete old/unused devices from admin console
   - Use device approval for new connections

3. **Network segmentation:**
   - Use Tailscale ACLs for granular access control
   - Consider separate tailnets for different purposes

4. **Monitor access:**
   - Review connection logs in Tailscale admin console
   - Enable notifications for new device connections

## Cost Information

### Tailscale Pricing:
- **Free Personal**: Up to 3 users, 100 devices, all core features
- **Personal Pro**: $5/month, unlimited personal use
- **Business**: $6/user/month for teams

### Total Cost for Personal Use:
- **Task Manager**: $0 (self-hosted, open source)
- **Tailscale**: $0 (free tier sufficient for most personal use)
- **Total**: $0/month

## Alternative Solutions

If you prefer not to use Tailscale:

### 1. Self-hosted VPN (Free but complex):
- WireGuard: Fastest, modern protocol
- OpenVPN: Widely supported, established

### 2. SSH Tunneling (Free, technical):
```bash
# From remote machine
ssh -L 5173:localhost:5173 user@your-home-ip
```

### 3. Cloud Deployment (Paid):
- Deploy to Railway, Render, or DigitalOcean
- Add authentication layer
- Costs $5-20/month

## Automated Startup Scripts

### macOS/Linux Startup Script:
Create `start_dashboard_remote.sh`:
```bash
#!/bin/bash
cd /path/to/your/todo_auto

# Start Tailscale if not running
if ! pgrep -f tailscaled > /dev/null; then
    sudo brew services start tailscale
    sleep 2
fi

# Start backend
cd dashboard/backend
uvicorn app:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Start frontend
cd ../frontend
npm run dev -- --host 0.0.0.0 --port 5173 &
FRONTEND_PID=$!

echo "Dashboard started for remote access"
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo "Access at: http://$(tailscale ip -4):5173"

# Save PIDs for cleanup
echo $BACKEND_PID > backend.pid
echo $FRONTEND_PID > frontend.pid
```

Make executable and run:
```bash
chmod +x start_dashboard_remote.sh
./start_dashboard_remote.sh
```

### Cleanup Script:
Create `stop_dashboard.sh`:
```bash
#!/bin/bash
cd /path/to/your/todo_auto/dashboard

# Kill processes by PID
if [ -f backend/backend.pid ]; then
    kill $(cat backend/backend.pid) 2>/dev/null
    rm backend/backend.pid
fi

if [ -f frontend.pid ]; then
    kill $(cat frontend.pid) 2>/dev/null
    rm frontend.pid
fi

echo "Dashboard stopped"
```

## Support

For Tailscale-specific issues:
- Documentation: https://tailscale.com/kb/
- Community: https://github.com/tailscale/tailscale/discussions

For task manager issues:
- Check the main README.md in this repository
- Review logs in `log_files/` directory
