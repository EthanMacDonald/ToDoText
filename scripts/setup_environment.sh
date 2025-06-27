#!/bin/bash

# Setup script for todo_auto project
# Creates a virtual environment and installs all required dependencies

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the project root directory (parent of scripts)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV_NAME=".todo_env"
VENV_PATH="$PROJECT_ROOT/$VENV_NAME"

echo -e "${BLUE}Setting up todo_auto project environment...${NC}"
echo "Project root: $PROJECT_ROOT"
echo "Virtual environment: $VENV_PATH"

# Check if Python 3 is available
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: Python 3 is not installed or not in PATH${NC}"
    exit 1
fi

echo -e "${YELLOW}Python version:${NC}"
python3 --version

# Remove existing virtual environment if it exists
if [ -d "$VENV_PATH" ]; then
    echo -e "${YELLOW}Removing existing virtual environment...${NC}"
    rm -rf "$VENV_PATH"
fi

# Create new virtual environment
echo -e "${GREEN}Creating virtual environment: $VENV_NAME${NC}"
cd "$PROJECT_ROOT"
python3 -m venv "$VENV_NAME"

# Activate virtual environment
echo -e "${GREEN}Activating virtual environment...${NC}"
source "$VENV_PATH/bin/activate"

# Upgrade pip
echo -e "${GREEN}Upgrading pip...${NC}"
pip install --upgrade pip

# Install core dependencies
echo -e "${GREEN}Installing core Python dependencies...${NC}"

# Web framework dependencies (for backend)
pip install fastapi uvicorn python-multipart

# Google Calendar API dependencies
pip install google-api-python-client google-auth-httplib2 google-auth-oauthlib

# Data processing dependencies
pip install pandas numpy

# Date/time handling
pip install python-dateutil

# File watching (if needed for development)
pip install watchdog

# HTTP requests
pip install requests

# CORS handling
pip install fastapi[all]

# Additional utilities
pip install pathlib2

echo -e "${GREEN}Installing development dependencies...${NC}"
# Development tools (optional)
pip install black flake8 pytest

# Create requirements.txt file
echo -e "${GREEN}Creating requirements.txt...${NC}"
pip freeze > "$PROJECT_ROOT/requirements.txt"

echo -e "${GREEN}✅ Virtual environment setup complete!${NC}"
echo ""
echo -e "${BLUE}To activate the environment manually:${NC}"
echo "  cd $PROJECT_ROOT"
echo "  source $VENV_NAME/bin/activate"
echo ""
echo -e "${BLUE}To deactivate:${NC}"
echo "  deactivate"
echo ""
echo -e "${BLUE}To install additional packages:${NC}"
echo "  source $VENV_NAME/bin/activate"
echo "  pip install <package_name>"
echo ""
echo -e "${GREEN}✅ Environment is ready! You can now use the dashboard initialization script.${NC}"
