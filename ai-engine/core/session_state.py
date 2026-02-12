from typing import Optional, Dict, Any
from datetime import datetime
import json

class SessionTaskState:
    """Tracks the current task state for a user session to handle follow-up mutations."""
    
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.active_task: Optional[str] = None  # e.g., "quiz", "flashcards", "search", "web", "mindmap"
        self.last_tool: Optional[str] = None     # e.g., "generate_quiz", "search_web"
        self.task_params: Dict[str, Any] = {}    # Current parameters (topic, num, etc.)
        self.last_update: datetime = datetime.now()
        self.history: List[Dict[str, str]] = []  # Brief history for current task context
    
    def set_task(self, task: str, tool: str, params: Dict[str, Any]):
        """Set a new active task and reset parameters."""
        self.active_task = task
        self.last_tool = tool
        self.task_params = params.copy()
        self.last_update = datetime.now()
        print(f"🔄 Session {self.session_id}: New task context: {task} ({tool})")
    
    def update_params(self, updates: Dict[str, Any]):
        """Update existing task parameters."""
        self.task_params.update(updates)
        self.last_update = datetime.now()
        print(f"🔄 Session {self.session_id}: Updated params for {self.active_task}: {updates}")
    
    def clear(self):
        """Reset the session task state."""
        self.active_task = None
        self.last_tool = None
        self.task_params = {}
        self.last_update = datetime.now()

# Global store for session states (in-memory for now)
_session_states: Dict[str, SessionTaskState] = {}

def get_session_state(session_id: str) -> SessionTaskState:
    """Get or create session task state for a session ID."""
    if session_id not in _session_states:
        _session_states[session_id] = SessionTaskState(session_id)
    return _session_states[session_id]
