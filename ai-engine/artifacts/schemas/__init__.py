"""
Artifact Schemas - Contract Definitions.

Defines validation rules for each artifact type.
"""

from artifacts.schemas.quiz_schema import QuizSchema
from artifacts.schemas.flashcard_schema import FlashcardSchema
from artifacts.schemas.mindmap_schema import MindmapSchema

__all__ = [
    "QuizSchema",
    "FlashcardSchema",
    "MindmapSchema"
]
