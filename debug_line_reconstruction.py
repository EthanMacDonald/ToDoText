#!/usr/bin/env python3

import sys
import os
sys.path.append('/Users/ethan/working_files/NOTES/todo_auto/dashboard/backend')

import re
from datetime import datetime

def debug_line_reconstruction():
    """Debug the exact line reconstruction logic"""
    
    # Test the exact case that's failing
    original_line = "    - [ ] Replace worn-out running shoes (priority:B) +Sports @Store\n"
    print(f"Original line: {repr(original_line)}")
    
    # Step 1: Replace [ ] with [x]
    new_line = original_line.replace('[ ]', '[x]', 1)
    print(f"After checkbox toggle: {repr(new_line)}")
    
    # Step 2: Add done date (this is the problematic path)
    done_date = "2025-07-07"
    
    # Check if there's existing metadata
    has_metadata = re.search(r'\([^)]*\)', new_line)
    print(f"Has existing metadata: {has_metadata is not None}")
    
    if not has_metadata:
        print("Taking the 'add new metadata' path...")
        # ... existing code for new metadata path ...
    else:
        print("Taking the 'add to existing metadata' path...")
        # Add to existing metadata
        new_line = re.sub(r'\(([^)]*)\)', rf'(\1 done:{done_date})', new_line, 1)
        print(f"After adding done date: {repr(new_line)}")
        
        # Clean up double spaces
        new_line = re.sub(r'\(\s+', '(', new_line)
        print(f"After cleaning up '(\s+': {repr(new_line)}")
        
        new_line = re.sub(r'\s+\)', ')', new_line)
        print(f"After cleaning up '\s+)': {repr(new_line)}")
        
        # The problematic cleanup - let's trace this carefully
        print("About to do the space cleanup...")
        print(f"Line before cleanup: {repr(new_line)}")
        
        # Only clean up multiple spaces within the content, not at the beginning
        # Split on '] ' to preserve indentation before the checkbox
        if '] ' in new_line:
            print("Using '] ' split method...")
            prefix, content = new_line.split('] ', 1)
            print(f"Prefix: {repr(prefix)}")
            print(f"Content: {repr(content)}")
            
            content = re.sub(r'\s+', ' ', content)
            print(f"Content after cleanup: {repr(content)}")
            
            new_line = prefix + '] ' + content
            print(f"Reconstructed: {repr(new_line)}")
        else:
            print("Using regex match method...")
            # Fallback - clean up spaces but preserve leading whitespace
            match = re.match(r'^(\s*- \[[x ]\] )(.*)', new_line)
            if match:
                leading_part, content_part = match.groups()
                print(f"Leading part: {repr(leading_part)}")
                print(f"Content part: {repr(content_part)}")
                
                content_part = re.sub(r'\s+', ' ', content_part)
                print(f"Content part after cleanup: {repr(content_part)}")
                
                new_line = leading_part + content_part
                print(f"Reconstructed: {repr(new_line)}")
        print("Taking the 'add new metadata' path...")
        
        # This is the path that's failing - let's trace it step by step
        bracket_pos = new_line.find(']')
        print(f"Bracket position: {bracket_pos}")
        
        if bracket_pos != -1:
            # Find the start of content (after the space(s) following ']')
            content_start = bracket_pos + 1
            while content_start < len(new_line) and new_line[content_start] == ' ':
                content_start += 1
            
            print(f"Content starts at position: {content_start}")
            
            prefix = new_line[:content_start]  # Includes indentation, checkbox, and original spacing
            content_part = new_line[content_start:].rstrip('\n')
            
            print(f"Prefix: {repr(prefix)}")
            print(f"Content part: {repr(content_part)}")
            
            # Insert before the first tag or at the end
            tag_match = re.search(r'([+@]\w+)', content_part)
            if tag_match:
                print(f"Found tag at position: {tag_match.start()}")
                insert_pos = tag_match.start()
                content_before = content_part[:insert_pos].rstrip()
                content_after = content_part[insert_pos:]
                new_content = f"{content_before} (done:{done_date}) {content_after}"
            else:
                new_content = f"{content_part.rstrip()} (done:{done_date})"
            
            print(f"New content: {repr(new_content)}")
            
            new_line = prefix + new_content
            print(f"Reconstructed line: {repr(new_line)}")
        else:
            print("Bracket not found - using fallback...")
            # Fallback logic
            if '] ' in new_line:
                print("Using fallback with '] ' split")
                content_part = new_line.split('] ', 1)[1]
                print(f"Content part from split: {repr(content_part)}")
                
                tag_match = re.search(r'([+@]\w+)', content_part)
                if tag_match:
                    insert_pos = tag_match.start()
                    content_before = content_part[:insert_pos].rstrip()
                    content_after = content_part[insert_pos:]
                    new_content = f"{content_before} (done:{done_date}) {content_after}"
                else:
                    new_content = f"{content_part.rstrip()} (done:{done_date})"
                
                print(f"New content: {repr(new_content)}")
                
                new_line = new_line.split('] ', 1)[0] + '] ' + new_content
                print(f"Final reconstructed line: {repr(new_line)}")
    
    # Add newline if missing
    if not new_line.endswith('\n'):
        new_line += '\n'
    
    print(f"Final result: {repr(new_line)}")

if __name__ == "__main__":
    debug_line_reconstruction()
