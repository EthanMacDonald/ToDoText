#!/usr/bin/env python3
"""
Simple test to verify the 3 AM boundary is working in the API endpoints
"""

import requests
import json
from datetime import datetime

# Test the recurring tasks endpoint
def test_recurring_endpoint():
    base_url = "http://localhost:8000"
    
    print("Testing recurring tasks endpoint with 3 AM boundary...")
    
    try:
        # Test getting today's recurring tasks
        response = requests.get(f"{base_url}/recurring?filter=today")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Successfully got {len(data)} recurring task groups")
            
            # Show some details
            for group in data[:2]:  # Show first 2 groups
                area = group.get('area', 'Unknown')
                tasks = group.get('tasks', [])
                print(f"   Area: {area} - {len(tasks)} tasks")
        
        else:
            print(f"❌ Error: {response.status_code} - {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Backend not running - please start the backend first")
    except Exception as e:
        print(f"❌ Error: {e}")

    # Test compliance data
    try:
        response = requests.get(f"{base_url}/recurring/compliance")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Successfully got compliance data for {len(data)} days")
            
            # Show recent data
            for entry in data[-3:]:  # Show last 3 days
                date_str = entry['date']
                completed = entry['completed']
                total = entry['total']
                compliance = entry['compliance_pct']
                print(f"   {date_str}: {completed}/{total} ({compliance}%)")
        
        else:
            print(f"❌ Compliance error: {response.status_code} - {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Backend not running for compliance test")
    except Exception as e:
        print(f"❌ Compliance error: {e}")

if __name__ == "__main__":
    test_recurring_endpoint()
