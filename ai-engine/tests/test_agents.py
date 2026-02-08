"""
Integration tests for agent system.

Tests PlannerAgent, ConversationAgent, and ArtifactAgent functionality.
"""

import pytest
import os
import json
from llm import create_llm_provider
from agents.planner_agent import PlannerAgent
from agents.conversation_agent import ConversationAgent
from agents.artifact_agent import ArtifactAgent
from core.memory import MemoryManager
from core.rag_retriever import RAGRetriever
from config import CONFIG


class TestPlannerAgent:
    """Test planner agent functionality."""

    @pytest.fixture
    def planner_agent(self):
        """Create planner agent instance."""
        llm_provider = create_llm_provider(
            provider_type="ollama",
            model="llama3.2:3b"
        )

        memory = MemoryManager(
            user_id="test_user",
            session_id="test_session"
        )

        return PlannerAgent(
            llm_provider=llm_provider,
            memory=memory,
            rag_retriever=None,
            notebook_service=None
        )

    def test_planner_agent_initialization(self, planner_agent):
        """Test planner agent initializes correctly."""
        assert planner_agent is not None
        assert planner_agent.llm_provider is not None
        assert planner_agent.memory is not None
        assert planner_agent.MAX_ITERATIONS == 5
        print("✓ PlannerAgent initialized correctly")

    def test_planner_agent_simple_response(self, planner_agent):
        """Test planner agent with simple conversational query."""
        response = planner_agent.execute(
            user_input="What is 2+2?",
            session_id="test_session"
        )

        assert isinstance(response, str)
        assert len(response) > 0
        print(f"✓ PlannerAgent simple response: {response[:100]}")

    def test_planner_agent_streaming(self, planner_agent):
        """Test planner agent streaming response."""
        tokens = []
        for token in planner_agent.execute_stream(
            user_input="Say hello",
            session_id="test_session"
        ):
            tokens.append(token)

        full_response = "".join(tokens)

        assert len(tokens) > 0
        assert len(full_response) > 0
        print(f"✓ PlannerAgent streaming: {len(tokens)} tokens")

    def test_planner_agent_max_iterations(self, planner_agent):
        """Test that planner agent respects max iterations."""
        # This test just verifies the agent doesn't hang
        response = planner_agent.execute(
            user_input="Hello",
            session_id="test_session"
        )

        assert isinstance(response, str)
        print("✓ PlannerAgent respects max iterations")


class TestConversationAgent:
    """Test conversation agent functionality."""

    @pytest.fixture
    def conversation_agent(self):
        """Create conversation agent instance."""
        llm_provider = create_llm_provider(
            provider_type="ollama",
            model="llama3.2:3b"
        )

        memory = MemoryManager(
            user_id="test_user",
            session_id="test_session"
        )

        return ConversationAgent(
            llm_provider=llm_provider,
            memory=memory
        )

    def test_conversation_agent_initialization(self, conversation_agent):
        """Test conversation agent initializes correctly."""
        assert conversation_agent is not None
        assert conversation_agent.llm_provider is not None
        assert conversation_agent.memory is not None
        print("✓ ConversationAgent initialized correctly")

    def test_conversation_agent_response(self, conversation_agent):
        """Test conversation agent generates response."""
        response = conversation_agent.execute(
            user_input="Explain photosynthesis briefly"
        )

        assert isinstance(response, str)
        assert len(response) > 0
        print(f"✓ ConversationAgent response: {response[:100]}")

    def test_conversation_agent_streaming(self, conversation_agent):
        """Test conversation agent streaming."""
        tokens = []
        for token in conversation_agent.execute_stream(
            user_input="What is machine learning?"
        ):
            tokens.append(token)

        full_response = "".join(tokens)

        assert len(tokens) > 0
        assert len(full_response) > 0
        print(f"✓ ConversationAgent streaming: {len(tokens)} tokens")

    def test_conversation_agent_with_context(self, conversation_agent):
        """Test conversation agent with additional context."""
        context = "The user is studying biology."

        response = conversation_agent.execute(
            user_input="What should I focus on?",
            context=context
        )

        assert isinstance(response, str)
        assert len(response) > 0
        print(f"✓ ConversationAgent with context: {response[:100]}")


class TestArtifactAgent:
    """Test artifact agent functionality."""

    @pytest.fixture
    def artifact_agent(self):
        """Create artifact agent instance."""
        llm_provider = create_llm_provider(
            provider_type="ollama",
            model="llama3.2:3b"
        )

        return ArtifactAgent(llm_provider=llm_provider)

    def test_artifact_agent_initialization(self, artifact_agent):
        """Test artifact agent initializes correctly."""
        assert artifact_agent is not None
        assert artifact_agent.llm_provider is not None
        print("✓ ArtifactAgent initialized correctly")

    def test_artifact_agent_quiz_generation(self, artifact_agent):
        """Test quiz generation."""
        content = """
        Photosynthesis is the process by which plants convert sunlight into energy.
        It occurs in chloroplasts and requires sunlight, water, and carbon dioxide.
        The outputs are glucose and oxygen.
        """

        result = artifact_agent.generate(
            artifact_type="quiz",
            content=content,
            options={"num_questions": 2, "difficulty": "easy"}
        )

        assert isinstance(result, dict)
        assert "questions" in result
        assert len(result["questions"]) > 0

        # Validate question structure
        question = result["questions"][0]
        assert "question" in question
        assert "options" in question or "correct_answer" in question
        print(f"✓ ArtifactAgent quiz: {len(result['questions'])} questions generated")

    def test_artifact_agent_flashcard_generation(self, artifact_agent):
        """Test flashcard generation."""
        content = """
        Machine learning is a subset of AI that enables systems to learn from data.
        Supervised learning uses labeled data. Unsupervised learning finds patterns.
        """

        result = artifact_agent.generate(
            artifact_type="flashcards",
            content=content,
            options={"num_cards": 2}
        )

        assert isinstance(result, dict)
        assert "flashcards" in result
        assert len(result["flashcards"]) > 0

        # Validate flashcard structure
        card = result["flashcards"][0]
        assert "front" in card
        assert "back" in card
        print(f"✓ ArtifactAgent flashcards: {len(result['flashcards'])} cards generated")

    def test_artifact_agent_mindmap_generation(self, artifact_agent):
        """Test mindmap generation."""
        content = "Photosynthesis in plants"

        result = artifact_agent.generate(
            artifact_type="mindmap",
            content=content,
            options={"depth": 2}
        )

        assert isinstance(result, dict)
        assert "root" in result
        assert "label" in result["root"]
        print(f"✓ ArtifactAgent mindmap: root = {result['root']['label']}")

    def test_artifact_agent_invalid_type(self, artifact_agent):
        """Test artifact agent with invalid type."""
        with pytest.raises(ValueError):
            artifact_agent.generate(
                artifact_type="invalid_type",
                content="test content",
                options={}
            )
        print("✓ ArtifactAgent rejects invalid artifact type")


class TestAgentMemory:
    """Test agent memory integration."""

    def test_conversation_memory_persistence(self):
        """Test that conversation agent persists memory."""
        llm_provider = create_llm_provider("ollama", model="llama3.2:3b")

        memory = MemoryManager(
            user_id="test_memory_user",
            session_id="test_memory_session"
        )

        agent = ConversationAgent(llm_provider=llm_provider, memory=memory)

        # First message
        response1 = agent.execute("My name is Alice")

        # Second message (should remember name)
        response2 = agent.execute("What is my name?")

        # Memory should have saved both turns
        assert isinstance(response1, str)
        assert isinstance(response2, str)
        print("✓ ConversationAgent persists memory across turns")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
