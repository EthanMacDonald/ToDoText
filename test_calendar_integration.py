#!/usr/bin/env python3
"""
Test script for calendar endpoint functionality
"""
import requests
import time
import subprocess
import sys
import os

def test_calendar_endpoint():
    print("🚀 Testing Google Calendar Sync Integration")
    print("=" * 50)
    
    # Start backend server
    print("1. Starting backend server...")
    try:
        # Change to backend directory
        os.chdir('/Users/ethan/working_files/NOTES/todo_auto/dashboard/backend')
        
        # Start server
        server_process = subprocess.Popen(
            ['python', '-m', 'uvicorn', 'app:app', '--port', '8002'],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # Wait for server to start
        print("   Waiting for server to start...")
        time.sleep(4)
        
        # Test if server is running
        try:
            response = requests.get('http://localhost:8002/tasks', timeout=5)
            print(f"   ✓ Server is running (status: {response.status_code})")
        except requests.RequestException as e:
            print(f"   ✗ Server not responding: {e}")
            return False
            
        # Test calendar endpoint
        print("\n2. Testing calendar endpoint...")
        try:
            response = requests.post('http://localhost:8002/calendar/push-due-dates', timeout=30)
            result = response.json()
            
            print(f"   Status Code: {response.status_code}")
            print(f"   Success: {result.get('success', False)}")
            print(f"   Message: {result.get('message', 'No message')}")
            
            if result.get('success'):
                print("   ✓ Calendar sync completed successfully!")
            else:
                print("   ⚠️  Calendar sync failed, but endpoint is working")
                print(f"      Reason: {result.get('message')}")
            
        except requests.RequestException as e:
            print(f"   ✗ Request failed: {e}")
        except Exception as e:
            print(f"   ✗ Unexpected error: {e}")
            
    finally:
        # Cleanup
        print("\n3. Cleaning up...")
        if 'server_process' in locals():
            server_process.terminate()
            server_process.wait()
            print("   ✓ Server stopped")

if __name__ == "__main__":
    test_calendar_endpoint()
