# MongoDB Memory Migration Guide

## Overview

The memory persistence layer has been migrated from JSONL to MongoDB while maintaining full backward compatibility. The system automatically falls back to JSONL if MongoDB is not available.

## Features

- **Thread-scoped conversations**: Each thread maintains independent history
- **Multi-user support**: User isolation via `user_id` field
- **Automatic fallback**: Uses JSONL if MongoDB unavailable
- **Append-only semantics**: Preserves historical audit trail
- **LangGraph compatibility**: InMemorySaver still used for short-term memory

## Configuration

### Environment Variables

```powershell
# Enable MongoDB (default: false)
$env:USE_MONGODB = "true"

# MongoDB connection string
$env:MONGO_URI = "mongodb://localhost:27017"

# Database name
$env:MONGO_DB = "collabry"

# Collection name for conversations
$env:MEMORY_COLLECTION = "conversations"
```

### config.py Settings

```python
CONFIG = {
    "use_mongodb": True,  # Enable MongoDB
    "mongo_uri": "mongodb://localhost:27017",
    "mongo_db": "collabry",
    "memory_collection": "conversations",
    
    # JSONL fallback path
    "memory_path": "memory/COLLABRY_memory.json",
}
```

## MongoDB Setup

### 1. Install MongoDB

**Windows:**
```powershell
# Download and install from https://www.mongodb.com/try/download/community
# Or use Chocolatey:
choco install mongodb

# Start MongoDB service
net start MongoDB
```

**Docker (Recommended for Development):**
```powershell
docker run -d -p 27017:27017 --name collabry-mongo mongo:latest
```

### 2. Install Python Driver

```powershell
pip install pymongo>=4.6
```

### 3. Enable MongoDB in Config

```powershell
$env:USE_MONGODB = "true"
```

## Document Schema

Each conversation turn is stored as:

```json
{
  "user_id": "user_123",
  "thread_id": "conversation_abc",
  "timestamp": 1704470400.0,
  "user": "What is machine learning?",
  "assistant": "Machine learning is...",
  "metadata": {}
}
```

### Indexes

Automatic indexes created:
- `(user_id, thread_id, timestamp)` - Thread history queries
- `(timestamp)` - Temporal queries

## Migration from JSONL

### Automated Migration

```powershell
# Dry run (preview what would be migrated)
python scripts/migrate_memory_to_mongo.py --dry-run

# Actual migration
python scripts/migrate_memory_to_mongo.py --user-id "default_user"

# Custom JSONL path
python scripts/migrate_memory_to_mongo.py --json-path "path/to/memory.json"
```

### Manual Verification

```python
from core.mongo_store import MongoMemoryStore

store = MongoMemoryStore(
    mongo_uri="mongodb://localhost:27017",
    db_name="collabry",
    collection_name="conversations"
)

# List all threads
threads = store.get_all_threads(user_id="default_user")
print(f"Found {len(threads)} threads")

# Load specific thread
history = store.load_thread_history("default", user_id="default_user")
print(f"Thread has {len(history)} turns")
```

## Usage Examples

### Basic Memory Manager

```python
from core.memory import MemoryManager

# MongoDB-backed (if enabled)
memory = MemoryManager(
    thread_id="study_session_1",
    user_id="student_123"
)

# Save conversation turn
memory.save_context(
    {"user_input": "Explain photosynthesis"},
    {"output": "Photosynthesis is the process..."}
)

# Load conversation history
vars = memory.load_memory_variables({})
print(vars["chat_history_buffer"])
```

### Multi-Thread Management

```python
# Switch between threads
memory.set_thread("session_morning")
memory.save_context(...)

memory.set_thread("session_afternoon")
memory.save_context(...)

# History is isolated per thread
```

### Agent Integration (No Changes Required)

```python
from core.agent import create_agent

# Agent automatically uses configured memory backend
agent, llm, tools, memory = create_agent(CONFIG)

# Memory is MongoDB-backed if USE_MONGODB=true
# Otherwise uses JSONL fallback
```

## Fallback Behavior

The system gracefully degrades:

1. **MongoDB enabled + connected**: Uses MongoDB
2. **MongoDB enabled + not connected**: Falls back to JSONL
3. **MongoDB disabled**: Uses JSONL directly

Fallback is automatic and logged:
```
✓ MongoDB memory persistence enabled
# OR
ℹ Using JSONL fallback (MongoDB not available)
```

## Testing

```powershell
# Test memory system (MongoDB or fallback)
python test_memory_mongodb.py

# Test agent with new memory
python test_agent_execution.py
```

## Production Considerations

### Connection Pooling

PyMongo automatically manages connection pooling. Default settings:
- `serverSelectionTimeoutMS`: 5000ms
- `connectTimeoutMS`: 5000ms

### Replica Sets (High Availability)

```python
CONFIG = {
    "mongo_uri": "mongodb://host1:27017,host2:27017,host3:27017/?replicaSet=rs0",
}
```

### Authentication

```python
CONFIG = {
    "mongo_uri": "mongodb://username:password@localhost:27017/?authSource=admin",
}
```

### Read/Write Concerns

For production, consider:
```python
from pymongo import WriteConcern, ReadConcern

collection.with_options(
    write_concern=WriteConcern(w="majority"),
    read_concern=ReadConcern("majority")
)
```

## Monitoring

MongoDB provides rich monitoring:

```javascript
// MongoDB Shell
use collabry

// Count conversations by user
db.conversations.aggregate([
  { $group: { _id: "$user_id", count: { $sum: 1 } } }
])

// Recent activity
db.conversations.find().sort({ timestamp: -1 }).limit(10)
```

## Troubleshooting

### "MongoDB connection failed"

1. Check MongoDB is running: `mongosh`
2. Verify connection string in config
3. Check firewall/network settings

### "pymongo not installed"

```powershell
pip install pymongo>=4.6
```

### Data not persisting

1. Check `USE_MONGODB` environment variable
2. Verify MongoDB connection in logs
3. Check JSONL fallback path exists

## Architecture Diagram

```
┌──────────────────┐
│  Agent/FastAPI   │
└────────┬─────────┘
         │
         ▼
┌────────────────────┐
│  MemoryManager     │
│  (Thread-scoped)   │
└────────┬───────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌─────────┐ ┌──────────┐
│ MongoDB │ │   JSONL  │
│ (primary)│ │(fallback)│
└─────────┘ └──────────┘
```

## Next Steps

- [ ] Implement JWT-based user_id extraction
- [ ] Add conversation search/filtering
- [ ] Implement memory retention policies
- [ ] Add conversation export/import
