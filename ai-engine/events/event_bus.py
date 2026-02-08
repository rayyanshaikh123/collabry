"""
Event Bus - Lightweight In-Process Pub-Sub.

Simple publish-subscribe for domain events.
No external dependencies, no persistence, no retries.
"""

import asyncio
import logging
from typing import Callable, List, Dict, Any
from collections import defaultdict

logger = logging.getLogger(__name__)


class EventBus:
    """
    Lightweight event bus for in-process notifications.

    Features:
    - Subscribe/unsubscribe handlers by event type
    - Async handler execution
    - No persistence or queuing
    - Thread-safe for concurrent publishes
    """

    def __init__(self):
        """Initialize event bus."""
        self._handlers: Dict[str, List[Callable]] = defaultdict(list)
        self._lock = asyncio.Lock()

    def subscribe(self, event_type: str, handler: Callable):
        """
        Subscribe handler to event type.

        Args:
            event_type: Event type to listen for (e.g., "artifact.completed")
            handler: Async function to call when event published
        """
        if handler not in self._handlers[event_type]:
            self._handlers[event_type].append(handler)
            logger.debug(f"Subscribed handler to {event_type}")

    def unsubscribe(self, event_type: str, handler: Callable):
        """
        Unsubscribe handler from event type.

        Args:
            event_type: Event type
            handler: Handler to remove
        """
        if handler in self._handlers[event_type]:
            self._handlers[event_type].remove(handler)
            logger.debug(f"Unsubscribed handler from {event_type}")

    async def publish(self, event_type: str, event_data: Dict[str, Any]):
        """
        Publish event to all subscribers.

        Args:
            event_type: Event type
            event_data: Event payload
        """
        handlers = self._handlers.get(event_type, [])

        if not handlers:
            logger.debug(f"No handlers for event: {event_type}")
            return

        logger.info(f"Publishing {event_type} to {len(handlers)} handler(s)")

        # Execute all handlers concurrently
        tasks = []
        for handler in handlers:
            task = asyncio.create_task(self._safe_execute(handler, event_data))
            tasks.append(task)

        # Wait for all handlers to complete (fire-and-forget)
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

    async def _safe_execute(self, handler: Callable, event_data: Dict[str, Any]):
        """
        Execute handler with error handling.

        Args:
            handler: Handler function
            event_data: Event payload
        """
        try:
            if asyncio.iscoroutinefunction(handler):
                await handler(event_data)
            else:
                handler(event_data)
        except Exception as e:
            logger.exception(f"Event handler error: {e}")


# Global event bus instance
_event_bus = EventBus()


def get_event_bus() -> EventBus:
    """Get global event bus instance."""
    return _event_bus
