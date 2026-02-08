"""
Integration tests for tool registry and tool execution.

Tests tool discovery, registration, and execution through the registry.
"""

import pytest
from tools.registry import ToolRegistry, tool_registry
from tools.base_tool import BaseTool
from llm import create_llm_provider


class TestToolRegistry:
    """Test tool registry functionality."""

    def test_registry_singleton(self):
        """Test that ToolRegistry is a singleton."""
        registry1 = ToolRegistry()
        registry2 = ToolRegistry()

        assert registry1 is registry2
        print("✓ ToolRegistry is a singleton")

    def test_registry_initialized(self):
        """Test that registry has discovered tools."""
        tools = tool_registry.get_all_tools()

        assert len(tools) > 0
        print(f"✓ Registry discovered {len(tools)} tools")

    def test_tool_discovery(self):
        """Test that expected tools are discovered."""
        tool_names = [tool.name for tool in tool_registry.get_all_tools()]

        # Check for core tools (may not all be present depending on implementation)
        expected_tools = ["web_search", "web_scraper"]

        found_tools = [name for name in expected_tools if name in tool_names]
        print(f"✓ Found tools: {', '.join(found_tools)}")

        assert len(found_tools) > 0, "At least some core tools should be discovered"

    def test_tool_definitions(self):
        """Test that tools provide valid definitions."""
        definitions = tool_registry.get_tool_definitions()

        assert len(definitions) > 0

        for definition in definitions:
            assert hasattr(definition, "name")
            assert hasattr(definition, "description")
            assert hasattr(definition, "parameters")
            assert isinstance(definition.parameters, dict)

        print(f"✓ All {len(definitions)} tool(s) have valid definitions")

    def test_get_tool_by_name(self):
        """Test retrieving tool by name."""
        tools = tool_registry.get_all_tools()

        if len(tools) > 0:
            first_tool = tools[0]
            retrieved_tool = tool_registry.get_tool(first_tool.name)

            assert retrieved_tool is not None
            assert retrieved_tool.name == first_tool.name
            print(f"✓ Retrieved tool by name: {first_tool.name}")
        else:
            pytest.skip("No tools available to test")


class TestToolExecution:
    """Test tool execution through registry."""

    def test_execute_nonexistent_tool(self):
        """Test executing a tool that doesn't exist."""
        result = tool_registry.execute("nonexistent_tool", query="test")

        assert result["success"] is False
        assert "not found" in result["error"].lower()
        print("✓ Nonexistent tool returns error correctly")

    def test_tool_error_handling(self):
        """Test that tool execution handles errors gracefully."""
        tools = tool_registry.get_all_tools()

        if len(tools) > 0:
            # Execute with invalid parameters
            first_tool = tools[0]
            result = tool_registry.execute(first_tool.name)  # No parameters

            # Should either succeed or fail gracefully
            assert "success" in result
            assert "error" in result

            if not result["success"]:
                assert result["error"] is not None
                print(f"✓ Tool {first_tool.name} handles errors gracefully")
            else:
                print(f"✓ Tool {first_tool.name} executed successfully")
        else:
            pytest.skip("No tools available to test")


class TestRAGSearchTool:
    """Test RAG search tool if available."""

    @pytest.fixture
    def rag_tool(self):
        """Get RAG search tool if registered."""
        tool = tool_registry.get_tool("rag_search")
        if not tool:
            pytest.skip("RAG search tool not registered")
        return tool

    def test_rag_tool_parameters(self, rag_tool):
        """Test RAG tool has correct parameters schema."""
        assert "query" in rag_tool.parameters_schema["properties"]
        assert rag_tool.parameters_schema["required"] == ["query"]
        print("✓ RAG search tool has valid parameters schema")

    def test_rag_tool_definition(self, rag_tool):
        """Test RAG tool provides valid definition."""
        definition = rag_tool.to_tool_definition()

        assert definition.name == "rag_search"
        assert len(definition.description) > 0
        assert isinstance(definition.parameters, dict)
        print("✓ RAG search tool has valid definition")


class TestGenerateArtifactTool:
    """Test artifact generation tool if available."""

    @pytest.fixture
    def artifact_tool(self):
        """Get artifact generation tool if registered."""
        tool = tool_registry.get_tool("generate_artifact")
        if not tool:
            pytest.skip("Generate artifact tool not registered")
        return tool

    def test_artifact_tool_parameters(self, artifact_tool):
        """Test artifact tool has correct parameters schema."""
        properties = artifact_tool.parameters_schema["properties"]

        assert "artifact_type" in properties
        assert "content" in properties
        assert "artifact_type" in artifact_tool.parameters_schema["required"]
        assert "content" in artifact_tool.parameters_schema["required"]
        print("✓ Generate artifact tool has valid parameters schema")

    def test_artifact_tool_definition(self, artifact_tool):
        """Test artifact tool provides valid definition."""
        definition = artifact_tool.to_tool_definition()

        assert definition.name == "generate_artifact"
        assert len(definition.description) > 0
        assert isinstance(definition.parameters, dict)
        print("✓ Generate artifact tool has valid definition")


class TestWebSearchTool:
    """Test web search tool if available."""

    @pytest.fixture
    def web_search_tool(self):
        """Get web search tool if registered."""
        tool = tool_registry.get_tool("web_search")
        if not tool:
            pytest.skip("Web search tool not registered")
        return tool

    def test_web_search_execution(self, web_search_tool):
        """Test web search tool execution."""
        result = tool_registry.execute(
            "web_search",
            query="Python programming basics"
        )

        assert "success" in result
        # Web search might fail due to network, so we just check structure
        assert "data" in result
        assert "error" in result

        if result["success"]:
            print(f"✓ Web search executed successfully: {len(result['data'])} results")
        else:
            print(f"✓ Web search handled error gracefully: {result['error']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
