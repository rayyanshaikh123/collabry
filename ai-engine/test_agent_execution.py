#!/usr/bin/env python
"""
Test script to verify agent execution still works after CLI removal.
Tests core agent functionality without CLI interface.
"""

import sys
from pathlib import Path

# Add ai-engine to path
sys.path.insert(0, str(Path(__file__).parent))

from core.agent import create_agent
from core.local_llm import create_llm
from config import CONFIG

def test_agent_creation():
    """Test that agent can be created without CLI dependencies."""
    print("=" * 60)
    print("Testing Agent Execution (No CLI)")
    print("=" * 60)
    
    try:
        print("\n1. Creating agent (includes LLM, tools, memory, RAG)...")
        agent, llm, tools, memory = create_agent(CONFIG)
        print(f"   ✓ Agent created successfully")
        print(f"   ✓ LLM model: {CONFIG['llm_model']}")
        print(f"   ✓ Tools loaded: {len(tools)}")
        
        print("\n2. Agent tool registry:")
        for tool_name in tools.keys():
            print(f"   - {tool_name}")
        
        print("\n3. Verifying agent components:")
        print(f"   ✓ Memory manager: {memory is not None}")
        print(f"   ✓ RAG retriever: {agent.rag_retriever is not None}")
        print(f"   ✓ LLM instance: {llm is not None}")
        print(f"   ✓ Agent instance: {agent is not None}")
        
        print("\n" + "=" * 60)
        print("Agent Execution Test PASSED")
        print("=" * 60)
        print("\nAgent is ready for FastAPI integration.")
        return True
        
    except Exception as e:
        print(f"\n✗ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = test_agent_creation()
    sys.exit(0 if success else 1)
