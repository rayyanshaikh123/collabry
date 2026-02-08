"""
Events Module - Lightweight Event System.

In-process pub-sub for artifact job notifications.
"""

from events.event_bus import EventBus, get_event_bus
from events.event_types import (
    ArtifactEvent,
    ArtifactCompletedEvent,
    ArtifactFailedEvent
)

__all__ = [
    "EventBus",
    "get_event_bus",
    "ArtifactEvent",
    "ArtifactCompletedEvent",
    "ArtifactFailedEvent"
]
