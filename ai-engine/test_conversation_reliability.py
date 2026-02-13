"""
Conversational Behavior Reliability Tests

Simulates real user interaction patterns that can expose:
- Silent wrong answers
- Context confusion
- Mode switching failures
- Follow-up misunderstandings
- State corruption through natural conversation flows
"""

import asyncio
import json
import uuid
from datetime import datetime
from typing import List, Dict, Any

from core.agent import run_agent
from core.conversation import ConversationManager
from core.session_state import get_session_state

class ConversationalReliabilityTester:
    """Tests natural conversation flows for reliability failures."""
    
    def __init__(self):
        self.conversation_failures = []
        self.conv_manager = ConversationManager()
        
    def log_conversation_failure(self, conversation_flow: List[str], failure_description: str, 
                                 expected_behavior: str, actual_behavior: str, severity: str):
        """Log a failure discovered through conversation testing."""
        failure = {
            "conversation_flow": conversation_flow,
            "failure_description": failure_description,
            "expected_behavior": expected_behavior, 
            "actual_behavior": actual_behavior,
            "severity": severity,
            "timestamp": datetime.now().isoformat()
        }
        self.conversation_failures.append(failure)
        print(f"\n💬 {severity} CONVERSATION FAILURE")
        print(f"   Flow: {' → '.join(conversation_flow[:3])}...")
        print(f"   Issue: {failure_description}")

    async def execute_conversation(self, user_id: str, session_id: str, 
                                   messages: List[str], notebook_id: str = None,
                                   source_ids: List[str] = None) -> List[Dict[str, Any]]:
        """Execute a full conversation and return all responses."""
        responses = []
        
        for message in messages:
            try:
                full_response = ""
                result_stream = run_agent(
                    user_id=user_id,
                    session_id=session_id,
                    message=message,
                    notebook_id=notebook_id,
                    source_ids=source_ids,
                    stream=True
                )
                
                events = []
                async for event in result_stream:
                    events.append(event)
                    if event.get("type") == "token":
                        full_response += event.get("content", "")
                    elif event.get("type") == "complete":
                        full_response = event.get("message", full_response)
                        
                responses.append({
                    "message": message,
                    "response": full_response,
                    "events": events
                })
                
                # Small delay between messages to simulate human typing
                await asyncio.sleep(0.1)
                
            except Exception as e:
                responses.append({
                    "message": message, 
                    "response": f"ERROR: {str(e)}",
                    "events": [{"type": "error", "message": str(e)}]
                })
                
        return responses

    async def test_task_switching_confusion(self):
        """Test rapid task switching causing state confusion."""
        print("\n=== Testing Task Switching Confusion ===")
        
        user_id = f"test_switching_{uuid.uuid4().hex[:8]}"
        session_id = f"session_{uuid.uuid4().hex[:8]}"
        
        conversation = [
            "Create a quiz about biology with 5 questions",
            "Actually make it 10 questions", 
            "Never mind, I want flashcards instead",
            "About chemistry, not biology",
            "Make them difficult level",
            "How many cards will you make?"  # Should be consistent with chemistry/difficult
        ]
        
        responses = await self.execute_conversation(user_id, session_id, conversation)
        
        final_response = responses[-1]["response"].lower()
        
        # Check if system is confused about what it's generating
        if "biology" in final_response or (responses and "chemistry" not in responses[-2]["response"].lower()):
            self.log_conversation_failure(
                conversation_flow=conversation,
                failure_description="System confused about final task parameters after rapid switching",
                expected_behavior="Should generate chemistry flashcards at difficult level",
                actual_behavior=f"Final response mentions wrong subject: {final_response[:200]}",
                severity="MEDIUM"
            )

    async def test_follow_up_context_loss(self):
        """Test follow-up questions losing context."""
        print("\n=== Testing Follow-up Context Loss ===")
        
        user_id = f"test_followup_{uuid.uuid4().hex[:8]}"
        session_id = f"session_{uuid.uuid4().hex[:8]}"
        
        conversation = [
            "Create a quiz about photosynthesis", 
            "Make question 3 easier",  # References specific artifact
            "What was question 3 about?",  # Should remember the context
            "Can you explain the answer to it?"
        ]
        
        responses = await self.execute_conversation(user_id, session_id, conversation)
        
        # Check if system remembers what "question 3" refers to
        third_response = responses[2]["response"].lower()
        fourth_response = responses[3]["response"].lower() if len(responses) > 3 else ""
        
        if ("don't know" in third_response or "which question" in third_response or
            "don't have access" in fourth_response):
            self.log_conversation_failure(
                conversation_flow=conversation,
                failure_description="System lost context of previously generated quiz artifact",
                expected_behavior="Should remember and reference question 3 from the generated quiz",
                actual_behavior=f"System can't identify question 3: {third_response[:200]}",
                severity="HIGH"
            )

    async def test_source_boundary_confusion(self):
        """Test source selection causing retrieval confusion."""
        print("\n=== Testing Source Boundary Confusion ===")
        
        user_id = f"test_sources_{uuid.uuid4().hex[:8]}"
        session_id = f"session_{uuid.uuid4().hex[:8]}"
        notebook_id = "test_notebook_123"
        
        conversation = [
            "Summarize my biology notes",  # General request
            "Only use the chapter on cells",  # Restrict to specific source  
            "What about mitochondria?",  # Should stay within cell chapter
            "Tell me about plant reproduction",  # Outside cell chapter scope
            "Did you find that in the cell chapter?"  # Test if system knows it went outside scope
        ]
        
        # Mock specific source selection
        source_ids = ["cell_chapter_source_id"]
        
        responses = await self.execute_conversation(
            user_id, session_id, conversation, 
            notebook_id=notebook_id, source_ids=source_ids
        )
        
        fourth_response = responses[3]["response"].lower() if len(responses) > 3 else ""
        fifth_response = responses[4]["response"].lower() if len(responses) > 4 else ""
        
        # Check if system violated source boundaries
        if ("reproduction" in fourth_response and 
            ("yes" in fifth_response or "found" in fifth_response)):
            self.log_conversation_failure(
                conversation_flow=conversation,
                failure_description="System retrieved information outside selected source boundaries",
                expected_behavior="Should say plant reproduction not found in cell chapter",
                actual_behavior=f"System falsely claims info from cell chapter: {fifth_response[:200]}",
                severity="HIGH"
            )

    async def test_correction_handling(self):
        """Test how system handles user corrections."""
        print("\n=== Testing Correction Handling ===")
        
        user_id = f"test_corrections_{uuid.uuid4().hex[:8]}"
        session_id = f"session_{uuid.uuid4().hex[:8]}"
        
        conversation = [
            "Create flashcards about World War 2",
            "I meant World War 1, not 2", 
            "How many cards are you making?",
            "Make them about the causes, not battles"
        ]
        
        responses = await self.execute_conversation(user_id, session_id, conversation)
        
        third_response = responses[2]["response"].lower() if len(responses) > 2 else ""
        
        # Check if system correctly updated to World War 1
        if "world war 2" in third_response or "ww2" in third_response:
            self.log_conversation_failure(
                conversation_flow=conversation,
                failure_description="System didn't properly handle user correction from WW2 to WW1",
                expected_behavior="Should reference World War 1 after correction",
                actual_behavior=f"Still mentions WW2: {third_response[:200]}",
                severity="MEDIUM"
            )

    async def test_ambiguous_pronoun_resolution(self):
        """Test pronoun and reference resolution failures."""
        print("\n=== Testing Ambiguous Pronoun Resolution ===")
        
        user_id = f"test_pronouns_{uuid.uuid4().hex[:8]}"
        session_id = f"session_{uuid.uuid4().hex[:8]}"
        
        conversation = [
            "Make a quiz about chemistry and physics",
            "Focus on it more",  # Ambiguous: chemistry or physics?
            "Add questions about that topic",  # Which topic?
            "Make them harder"  # Which questions?
        ]
        
        responses = await self.execute_conversation(user_id, session_id, conversation)
        
        second_response = responses[1]["response"].lower() if len(responses) > 1 else ""
        
        # System should ask for clarification rather than guessing
        if not any(word in second_response for word in ["which", "clarify", "specify", "mean"]):
            self.log_conversation_failure(
                conversation_flow=conversation,
                failure_description="System made assumptions about ambiguous pronoun 'it' instead of asking for clarification",
                expected_behavior="Should ask 'which subject do you mean?' when 'it' is ambiguous",
                actual_behavior=f"System assumed meaning: {second_response[:200]}",
                severity="MEDIUM"
            )

    async def test_incomplete_request_handling(self):
        """Test handling of incomplete or interrupted requests."""
        print("\n=== Testing Incomplete Request Handling ===")
        
        user_id = f"test_incomplete_{uuid.uuid4().hex[:8]}"
        session_id = f"session_{uuid.uuid4().hex[:8]}"
        
        conversation = [
            "Create a quiz about",  # Incomplete
            "biology cells", # Completion
            "Make it",  # Incomplete again
            "harder and longer"  # Completion
        ]
        
        responses = await self.execute_conversation(user_id, session_id, conversation)
        
        first_response = responses[0]["response"].lower() if responses else ""
        
        # Should ask for completion, not make assumptions
        if not any(word in first_response for word in ["about what", "topic", "subject", "complete"]):
            self.log_conversation_failure(
                conversation_flow=conversation,
                failure_description="System handled incomplete request without asking for completion",
                expected_behavior="Should ask 'quiz about what topic?' when request is incomplete",
                actual_behavior=f"System assumed or filled in: {first_response[:200]}",
                severity="LOW"
            )

    async def test_memory_persistence_across_restarts(self):
        """Test if conversation memory persists correctly."""
        print("\n=== Testing Memory Persistence ===")
        
        user_id = f"test_memory_{uuid.uuid4().hex[:8]}"
        session_id = f"session_{uuid.uuid4().hex[:8]}"
        
        # First conversation
        conversation_1 = [
            "Create flashcards about ancient Rome",
            "Make them focus on emperors"
        ]
        
        responses_1 = await self.execute_conversation(user_id, session_id, conversation_1)
        
        # Simulate session restart - new conversation in same session
        conversation_2 = [
            "How many emperor cards did you make?",  # Should remember previous context
            "Add one about Julius Caesar"
        ]
        
        responses_2 = await self.execute_conversation(user_id, session_id, conversation_2)
        
        first_response = responses_2[0]["response"].lower() if responses_2 else ""
        
        # Check if system remembers the emperor flashcards
        if any(phrase in first_response for phrase in ["don't remember", "what cards", "which flashcards"]):
            self.log_conversation_failure(
                conversation_flow=conversation_1 + ["[SESSION RESTART]"] + conversation_2,
                failure_description="System lost memory of previous conversation context after session persistence",
                expected_behavior="Should remember emperor flashcards from previous conversation",
                actual_behavior=f"System doesn't remember: {first_response[:200]}",
                severity="HIGH"
            )

    async def run_all_conversation_tests(self):
        """Run all conversational reliability tests."""
        print("💬 Starting Conversational Behavior Reliability Tests")
        print("=" * 60)
        
        await self.test_task_switching_confusion()
        await self.test_follow_up_context_loss()
        await self.test_source_boundary_confusion()
        await self.test_correction_handling()
        await self.test_ambiguous_pronoun_resolution()
        await self.test_incomplete_request_handling()
        await self.test_memory_persistence_across_restarts()
        
        # Generate results
        print(f"\n{'='*60}")
        print("💬 CONVERSATIONAL RELIABILITY TEST RESULTS") 
        print("=" * 60)
        
        if not self.conversation_failures:
            print("✅ No conversational reliability issues found in test scenarios.")
        else:
            severity_counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
            for failure in self.conversation_failures:
                severity_counts[failure["severity"]] += 1
                
            print(f"Total Conversation Failures: {len(self.conversation_failures)}")
            for sev, count in severity_counts.items():
                if count > 0:
                    print(f"  {sev}: {count}")
                    
            print("\n--- CONVERSATION FAILURE DETAILS ---")
            for i, failure in enumerate(self.conversation_failures, 1):
                print(f"\n{i}. {failure['severity']} - Conversation Flow Issue")
                print(f"   Flow: {' → '.join(failure['conversation_flow'][:4])}")
                print(f"   Issue: {failure['failure_description']}")
                print(f"   Expected: {failure['expected_behavior']}")
                print(f"   Actual: {failure['actual_behavior'][:150]}...")

async def main():
    """Run conversational behavior reliability tests."""
    tester = ConversationalReliabilityTester()
    await tester.run_all_conversation_tests()

if __name__ == "__main__":
    asyncio.run(main())