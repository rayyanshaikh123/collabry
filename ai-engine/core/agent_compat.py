"""
Temporary compatibility layer for old agent API.

This allows existing routes to work while transitioning to new architecture.
Will be removed after full migration.
"""

from core.agent_new import run_agent, chat as agent_chat
from config import CONFIG
import asyncio


class LegacyAgentWrapper:
    """Wrapper to make new agent compatible with old API."""
    
    def __init__(self, user_id: str, session_id: str):
        self.user_id = user_id
        self.session_id = session_id
    
    def handle_user_input(self, message: str, source_ids=None):
        """Non-streaming handler."""
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        if loop.is_running():
            # If loop is running, create a task
            future = asyncio.ensure_future(agent_chat(
                user_id=self.user_id,
                session_id=self.session_id,
                message=message,
                notebook_id=None
            ))
            return loop.run_until_complete(future)
        else:
            return loop.run_until_complete(agent_chat(
                user_id=self.user_id,
                session_id=self.session_id,
                message=message,
                notebook_id=None
            ))
    
    def handle_user_input_stream(self, message: str, callback, source_ids=None):
        """Streaming handler with callback."""
        
        async def _stream():
            async for chunk in run_agent(
                user_id=self.user_id,
                session_id=self.session_id,
                message=message,
                notebook_id=None,
                stream=True
            ):
                if chunk:
                    callback(chunk)
        
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        if loop.is_running():
            future = asyncio.ensure_future(_stream())
            loop.run_until_complete(future)
        else:
            loop.run_until_complete(_stream())


def create_agent(user_id: str, session_id: str, config=None):
    """
    Legacy compatibility function.
    
    Returns tuple: (agent, llm, memory, memory)
    Only agent is functional, others are None.
    """
    agent = LegacyAgentWrapper(user_id, session_id)
    return agent, None, None, None
