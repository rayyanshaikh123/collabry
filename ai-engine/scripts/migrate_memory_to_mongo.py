#!/usr/bin/env python
"""
Migration utility: JSONL → MongoDB

Reads legacy COLLABRY_memory.json files and migrates them to MongoDB
while preserving thread ordering and timestamps.

Usage:
    python scripts/migrate_memory_to_mongo.py [--dry-run]
"""

import sys
import json
import argparse
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from config import CONFIG
from core.mongo_store import MongoMemoryStore


def load_jsonl_memory(json_path: Path) -> dict:
    """Load legacy JSONL memory file."""
    if not json_path.exists():
        print(f"✗ Memory file not found: {json_path}")
        return {}

    try:
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        print(f"✓ Loaded {json_path}")
        return data
    except Exception as e:
        print(f"✗ Failed to load {json_path}: {e}")
        return {}


def migrate_memory(
    data: dict,
    mongo_store: MongoMemoryStore,
    user_id: str = "default_user",
    dry_run: bool = False,
) -> int:
    """
    Migrate memory data to MongoDB.

    Args:
        data: Legacy memory data (list or dict)
        mongo_store: MongoDB store instance
        user_id: User identifier
        dry_run: If True, only print what would be migrated

    Returns:
        Number of turns migrated
    """
    migrated_count = 0

    # Handle legacy list format (single thread)
    if isinstance(data, list):
        thread_id = "default"
        print(f"\n📂 Thread: {thread_id} (legacy format)")
        print(f"   Turns: {len(data)}")

        if not dry_run:
            for turn in data:
                user_msg = turn.get("user", "")
                assistant_msg = turn.get("assistant", "")
                timestamp = turn.get("timestamp", 0)

                # Create a document with original timestamp
                success = mongo_store._collection.insert_one({
                    "user_id": user_id,
                    "thread_id": thread_id,
                    "timestamp": timestamp,
                    "user": user_msg,
                    "assistant": assistant_msg,
                    "metadata": {},
                })

                if success:
                    migrated_count += 1
        else:
            migrated_count = len(data)

    # Handle dict format (multi-thread)
    elif isinstance(data, dict):
        for thread_id, turns in data.items():
            if not isinstance(turns, list):
                continue

            print(f"\n📂 Thread: {thread_id}")
            print(f"   Turns: {len(turns)}")

            if not dry_run:
                for turn in turns:
                    user_msg = turn.get("user", "")
                    assistant_msg = turn.get("assistant", "")
                    timestamp = turn.get("timestamp", 0)

                    success = mongo_store._collection.insert_one({
                        "user_id": user_id,
                        "thread_id": thread_id,
                        "timestamp": timestamp,
                        "user": user_msg,
                        "assistant": assistant_msg,
                        "metadata": {},
                    })

                    if success:
                        migrated_count += 1
            else:
                migrated_count += len(turns)

    return migrated_count


def main():
    parser = argparse.ArgumentParser(description="Migrate JSONL memory to MongoDB")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be migrated without writing to MongoDB",
    )
    parser.add_argument(
        "--user-id",
        default="default_user",
        help="User ID for migrated conversations (default: default_user)",
    )
    parser.add_argument(
        "--json-path",
        type=Path,
        default=None,
        help="Path to JSONL file (default: from CONFIG)",
    )

    args = parser.parse_args()

    print("=" * 60)
    print("Memory Migration: JSONL → MongoDB")
    print("=" * 60)

    # Get paths and config
    json_path = args.json_path or Path(CONFIG["memory_path"])
    mongo_uri = CONFIG["mongo_uri"]
    mongo_db = CONFIG["mongo_db"]
    collection = CONFIG["memory_collection"]

    print(f"\nSource: {json_path}")
    print(f"Target: {mongo_uri}/{mongo_db}.{collection}")
    print(f"User ID: {args.user_id}")
    print(f"Dry run: {args.dry_run}")

    # Load JSONL data
    data = load_jsonl_memory(json_path)
    if not data:
        print("\n✗ No data to migrate")
        return 1

    # Connect to MongoDB
    if not args.dry_run:
        try:
            mongo_store = MongoMemoryStore(
                mongo_uri=mongo_uri,
                db_name=mongo_db,
                collection_name=collection,
                user_id=args.user_id,
            )

            if not mongo_store.is_connected():
                print("\n✗ MongoDB connection failed")
                return 1

            print("✓ MongoDB connected")

        except Exception as e:
            print(f"\n✗ MongoDB initialization failed: {e}")
            return 1
    else:
        mongo_store = None

    # Migrate
    print("\n" + "─" * 60)
    print("Migration Progress:")
    print("─" * 60)

    migrated_count = migrate_memory(data, mongo_store, args.user_id, args.dry_run)

    print("\n" + "=" * 60)
    if args.dry_run:
        print(f"Dry run complete: {migrated_count} turns would be migrated")
    else:
        print(f"✓ Migration complete: {migrated_count} turns migrated")
    print("=" * 60)

    # Close connection
    if mongo_store:
        mongo_store.close()

    return 0


if __name__ == "__main__":
    sys.exit(main())
