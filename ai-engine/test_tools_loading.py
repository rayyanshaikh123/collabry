#!/usr/bin/env python
"""
Test script to verify tool loading after pruning non-study components.
"""

import sys
from pathlib import Path

# Add ai-engine to path
sys.path.insert(0, str(Path(__file__).parent))

from tools import load_tools, get_tools

def test_tool_loading():
    print("=" * 60)
    print("Testing Tool Loading System")
    print("=" * 60)
    
    # Test load_tools() (returns dict)
    print("\n1. Testing load_tools() (dict format):")
    tools_dict = load_tools()
    print(f"   Loaded {len(tools_dict)} tools:")
    for name, tool_def in tools_dict.items():
        desc = tool_def.get("description", "No description")[:50]
        print(f"   - {name}: {desc}")
    
    # Test get_tools() (returns list)
    print("\n2. Testing get_tools() (list format):")
    tools_list = get_tools()
    print(f"   Loaded {len(tools_list)} tools:")
    for tool in tools_list:
        name = tool.get("name", "unknown")
        desc = tool.get("description", "No description")[:50]
        print(f"   - {name}: {desc}")
    
    # Verify expected tools are present
    print("\n3. Verifying expected study-platform tools:")
    expected_tools = [
        "web_search",
        "web_scrape", 
        "read_file",
        "write_file",
        "doc_generator",
        "ppt_generator",
        "ocr_read",       # Note: actual name is ocr_read, not ocr_reader
        "image_gen"       # Note: actual name is image_gen, not image_generation
    ]
    
    for expected in expected_tools:
        if expected in tools_dict:
            print(f"   ✓ {expected}")
        else:
            print(f"   ✗ {expected} (MISSING)")
    
    # Verify legacy tools are excluded
    print("\n4. Verifying legacy tools are excluded:")
    legacy_tools = [
        "browser_control",
        "system_automation",
        "task_scheduler"
    ]
    
    for legacy in legacy_tools:
        if legacy not in tools_dict:
            print(f"   ✓ {legacy} (correctly excluded)")
        else:
            print(f"   ✗ {legacy} (SHOULD BE EXCLUDED)")
    
    print("\n" + "=" * 60)
    print("Tool Loading Test Complete")
    print("=" * 60)
    
    return len(tools_dict) > 0


if __name__ == "__main__":
    success = test_tool_loading()
    sys.exit(0 if success else 1)
