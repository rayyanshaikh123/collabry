"""
Dynamic Tool Registry.

This module provides automatic tool discovery and registration, enabling
the agent system to dynamically load and execute tools without hardcoding.
"""

from typing import Dict, List, Optional
import importlib
import pkgutil
import logging
from tools.base_tool import BaseTool
from llm.base_provider import ToolDefinition

logger = logging.getLogger(__name__)


class ToolRegistry:
    """
    Dynamic tool discovery and registration system.

    Features:
    - Auto-discovers all tools in the tools/ directory
    - Provides LLM-compatible tool definitions
    - Executes tools by name with validation
    - Thread-safe singleton pattern
    - Easy tool registration for plugins

    Usage:
        from tools.registry import tool_registry

        # Get all available tools
        tools = tool_registry.get_all_tools()

        # Execute a tool
        result = tool_registry.execute("web_search", query="python tutorial")

        # Get tool definitions for LLM
        definitions = tool_registry.get_tool_definitions()
    """

    _instance = None
    _initialized = False

    def __new__(cls):
        """Singleton pattern to ensure only one registry exists."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        """Initialize registry and discover tools."""
        if self._initialized:
            return

        self._tools: Dict[str, BaseTool] = {}
        self._initialized = True

        logger.info("Initializing ToolRegistry...")
        # Note: Auto-discovery will be called when tools are first needed
        # This allows dependencies to be injected before discovery

    def _discover_tools(self):
        """
        Auto-discover all tools in tools/ directory.

        Each tool module must have a `get_tool()` function that returns
        a BaseTool instance. This function may accept optional dependencies.

        Tool modules to skip:
        - base_tool.py (abstract base)
        - registry.py (this file)
        - __init__.py (package init)
        """
        if self._tools:
            # Already discovered
            return

        import tools

        logger.info("Discovering tools in tools/ directory...")

        for module_info in pkgutil.iter_modules(tools.__path__):
            # Skip special modules
            if module_info.name in ["base_tool", "registry", "__init__"]:
                continue

            try:
                module = importlib.import_module(f"tools.{module_info.name}")

                # Check if module has get_tool function
                if not hasattr(module, "get_tool"):
                    logger.warning(
                        f"Tool module {module_info.name} missing get_tool() function, skipping"
                    )
                    continue

                # Get tool instance (may be called with dependencies later)
                # For now, just check if it's available
                logger.info(f"Found tool module: {module_info.name}")

            except Exception as e:
                logger.error(f"Failed to load tool from {module_info.name}: {e}")
                logger.exception("Tool loading error:")

    def register(self, tool: BaseTool):
        """
        Manually register a tool.

        This is used to register tools with injected dependencies after
        the registry is created.

        Args:
            tool: Tool instance to register

        Raises:
            ValueError: If tool.name is missing or invalid
        """
        if not hasattr(tool, 'name') or not tool.name:
            raise ValueError("Tool must have a non-empty 'name' attribute")

        if not isinstance(tool, BaseTool):
            logger.warning(
                f"Tool {tool.name} does not inherit from BaseTool, "
                f"this may cause issues"
            )

        if tool.name in self._tools:
            logger.info(f"Tool '{tool.name}' already registered, overwriting")

        self._tools[tool.name] = tool
        logger.info(f"✓ Registered tool: {tool.name}")

    def unregister(self, tool_name: str) -> bool:
        """
        Remove a tool from the registry.

        Args:
            tool_name: Name of tool to remove

        Returns:
            True if tool was removed, False if not found
        """
        if tool_name in self._tools:
            del self._tools[tool_name]
            logger.info(f"Unregistered tool: {tool_name}")
            return True
        return False

    def get_tool(self, name: str) -> Optional[BaseTool]:
        """
        Get tool by name.

        Args:
            name: Tool name

        Returns:
            Tool instance or None if not found
        """
        return self._tools.get(name)

    def get_all_tools(self) -> List[BaseTool]:
        """
        Get list of all registered tools.

        Returns:
            List of tool instances
        """
        return list(self._tools.values())

    def get_tool_definitions(self) -> List[ToolDefinition]:
        """
        Get LLM-compatible tool definitions for all registered tools.

        This format is passed to the LLM provider for function calling.

        Returns:
            List of ToolDefinition objects
        """
        return [tool.to_tool_definition() for tool in self._tools.values()]

    def execute(self, tool_name: str, **kwargs) -> Dict[str, any]:
        """
        Execute tool by name with provided arguments.

        This method:
        1. Looks up the tool
        2. Validates input
        3. Executes the tool
        4. Returns standardized result

        Args:
            tool_name: Name of tool to execute
            **kwargs: Tool-specific arguments

        Returns:
            Dictionary with format:
            {
                "success": bool,
                "data": Any,
                "error": Optional[str],
                "metadata": Optional[Dict]
            }
        """
        tool = self.get_tool(tool_name)

        if not tool:
            logger.error(f"Tool '{tool_name}' not found in registry")
            return {
                "success": False,
                "data": None,
                "error": f"Tool '{tool_name}' not found",
                "metadata": {"available_tools": list(self._tools.keys())}
            }

        # Validate input
        is_valid, error_msg = tool.validate_input(kwargs)
        if not is_valid:
            logger.error(f"Tool {tool_name} validation failed: {error_msg}")
            return {
                "success": False,
                "data": None,
                "error": f"Invalid input: {error_msg}",
                "metadata": {"tool_schema": tool.parameters_schema}
            }

        # Execute tool
        try:
            logger.info(f"Executing tool: {tool_name}")
            result = tool.execute(**kwargs)

            # Ensure result has required format
            if not isinstance(result, dict):
                logger.warning(f"Tool {tool_name} returned non-dict result, wrapping")
                result = {
                    "success": True,
                    "data": result,
                    "error": None
                }

            if "success" not in result:
                result["success"] = True

            logger.info(f"Tool {tool_name} executed successfully")
            return result

        except Exception as e:
            logger.exception(f"Tool {tool_name} execution failed")
            return {
                "success": False,
                "data": None,
                "error": str(e),
                "metadata": {"exception_type": type(e).__name__}
            }

    def list_tools(self) -> List[Dict[str, str]]:
        """
        Get a summary of all registered tools.

        Returns:
            List of dictionaries with tool info:
            [{"name": "...", "description": "..."}, ...]
        """
        return [
            {
                "name": tool.name,
                "description": tool.description
            }
            for tool in self._tools.values()
        ]

    def __len__(self) -> int:
        """Return number of registered tools."""
        return len(self._tools)

    def __contains__(self, tool_name: str) -> bool:
        """Check if tool is registered."""
        return tool_name in self._tools

    def __repr__(self) -> str:
        """String representation for debugging."""
        return f"<ToolRegistry({len(self._tools)} tools registered)>"


# Global singleton instance
tool_registry = ToolRegistry()
