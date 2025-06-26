#!/bin/bash

# Script to commit task lists and archive files
# Adds and commits tasks.txt, recurring_tasks.txt, and all files in archive_files/

echo "Adding task files to git..."

# Add the main task files
git add tasks.txt
git add recurring_tasks.txt

# Add all files in the archive_files directory
git add archive_files/

# Commit with the specified message
git commit -m "Checking in task lists and archives."

echo "Files committed successfully!"
