"""
Scheduled Classes Repository

MongoDB-backed storage for scheduled AI classroom sessions.
Keeps a simple CRUD interface that can be used from FastAPI routes.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from enum import Enum
from typing import List, Optional

from bson import ObjectId
from pydantic import BaseModel, Field
from pymongo import ASCENDING, DESCENDING, MongoClient

from config import CONFIG


class ScheduledClassStatus(str, Enum):
    SCHEDULED = "scheduled"
    STARTED = "started"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class ScheduledClassCreate(BaseModel):
    """Payload used when a user schedules a new class."""

    title: str = Field(..., description="Human-readable class title")
    notebook_id: str = Field(
        default="general", description="Notebook or course identifier"
    )
    source: Optional[str] = Field(
        default=None,
        description="Optional raw text content to ingest into RAG for this class",
    )
    scheduled_start: datetime = Field(
        ..., description="Scheduled start time (UTC, ISO datetime)"
    )
    duration_minutes: int = Field(
        default=60, ge=15, le=240, description="Planned duration in minutes"
    )


class ScheduledClass(BaseModel):
    """Representation of a scheduled class as stored in MongoDB."""

    id: str
    user_id: str
    title: str
    notebook_id: str
    scheduled_start: datetime
    duration_minutes: int
    status: ScheduledClassStatus
    source: Optional[str] = None
    room_name: Optional[str] = None
    session_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


class ScheduledClassesRepo:
    """
    MongoDB repository for scheduled classes.

    Collection schema:
      {
        _id: ObjectId,
        user_id: str,
        title: str,
        notebook_id: str,
        scheduled_start: datetime,
        duration_minutes: int,
        status: "scheduled" | "started" | "completed" | "cancelled",
        source: str | null,
        room_name: str | null,
        session_id: str | null,
        created_at: datetime,
        updated_at: datetime
      }
    """

    def __init__(self) -> None:
        mongo_uri = CONFIG["mongo_uri"]
        mongo_db = CONFIG["mongo_db"]

        self._client = MongoClient(mongo_uri)
        self._db = self._client[mongo_db]
        self._collection = self._db["scheduled_classes"]

        # indexes optimised for per-user upcoming queries
        self._collection.create_index(
            [("user_id", ASCENDING), ("scheduled_start", ASCENDING)]
        )
        self._collection.create_index([("status", ASCENDING), ("scheduled_start", ASCENDING)])

    def _doc_to_model(self, doc: dict) -> ScheduledClass:
        return ScheduledClass(
            id=str(doc["_id"]),
            user_id=doc["user_id"],
            title=doc["title"],
            notebook_id=doc.get("notebook_id", "general"),
            scheduled_start=doc["scheduled_start"],
            duration_minutes=doc["duration_minutes"],
            status=ScheduledClassStatus(doc.get("status", ScheduledClassStatus.SCHEDULED)),
            source=doc.get("source"),
            room_name=doc.get("room_name"),
            session_id=doc.get("session_id"),
            created_at=doc.get("created_at", datetime.utcnow()),
            updated_at=doc.get("updated_at", datetime.utcnow()),
        )

    def create_for_user(
        self, user_id: str, payload: ScheduledClassCreate
    ) -> ScheduledClass:
        now = datetime.utcnow()
        doc = {
            "user_id": user_id,
            "title": payload.title,
            "notebook_id": payload.notebook_id or "general",
            "source": payload.source,
            "scheduled_start": payload.scheduled_start,
            "duration_minutes": payload.duration_minutes,
            "status": ScheduledClassStatus.SCHEDULED.value,
            "room_name": None,
            "session_id": None,
            "created_at": now,
            "updated_at": now,
        }

        result = self._collection.insert_one(doc)
        doc["_id"] = result.inserted_id
        return self._doc_to_model(doc)

    def get_for_user(self, class_id: str, user_id: str) -> Optional[ScheduledClass]:
        try:
            oid = ObjectId(class_id)
        except Exception:
            return None

        doc = self._collection.find_one({"_id": oid, "user_id": user_id})
        if not doc:
            return None
        return self._doc_to_model(doc)

    def list_upcoming_for_user(
        self,
        user_id: str,
        window_start: Optional[datetime] = None,
        window_end: Optional[datetime] = None,
        include_started: bool = True,
    ) -> List[ScheduledClass]:
        """
        List upcoming (and optionally started) classes for a user, ordered by time.
        """
        now = datetime.utcnow()
        if window_start is None:
            window_start = now - timedelta(hours=1)
        if window_end is None:
            window_end = now + timedelta(days=30)

        statuses = [ScheduledClassStatus.SCHEDULED.value]
        if include_started:
            statuses.append(ScheduledClassStatus.STARTED.value)

        cursor = self._collection.find(
            {
                "user_id": user_id,
                "status": {"$in": statuses},
                "scheduled_start": {"$gte": window_start, "$lte": window_end},
            }
        ).sort("scheduled_start", ASCENDING)

        return [self._doc_to_model(doc) for doc in cursor]

    def mark_started(
        self,
        class_id: str,
        user_id: str,
        room_name: str,
        session_id: str,
    ) -> Optional[ScheduledClass]:
        """
        Update a scheduled class as started, attaching room + session identifiers.
        """
        try:
            oid = ObjectId(class_id)
        except Exception:
            return None

        now = datetime.utcnow()
        result = self._collection.find_one_and_update(
            {"_id": oid, "user_id": user_id},
            {
                "$set": {
                    "status": ScheduledClassStatus.STARTED.value,
                    "room_name": room_name,
                    "session_id": session_id,
                    "updated_at": now,
                }
            },
            return_document=True,
        )

        if not result:
            return None
        return self._doc_to_model(result)

    def update_status(
        self,
        class_id: str,
        user_id: str,
        status: ScheduledClassStatus,
    ) -> Optional[ScheduledClass]:
        try:
            oid = ObjectId(class_id)
        except Exception:
            return None

        now = datetime.utcnow()
        doc = self._collection.find_one_and_update(
            {"_id": oid, "user_id": user_id},
            {"$set": {"status": status.value, "updated_at": now}},
            return_document=True,
        )
        if not doc:
            return None
        return self._doc_to_model(doc)


scheduled_classes_repo = ScheduledClassesRepo()

