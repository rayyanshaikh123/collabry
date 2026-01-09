# Usage Tracking System Implementation

## Overview
Comprehensive usage tracking system for monitoring AI operations, token usage, and system performance.

## Architecture

### Backend Components

#### 1. Usage Tracker (`core/usage_tracker.py`)
- **MongoDB Collections**:
  - `usage_logs`: Detailed operation logs
  - `daily_stats`: Aggregated daily statistics
- **Features**:
  - Real-time operation logging
  - User-level tracking
  - Global analytics
  - Automatic aggregation
  - Performance indexes

#### 2. Usage Routes (`server/routes/usage.py`)
- **Endpoints**:
  - `GET /ai/usage/me?days=30` - User's own usage
  - `GET /ai/usage/user/{user_id}?days=30` - Specific user (admin)
  - `GET /ai/usage/global?days=30` - Global statistics (admin)
  - `GET /ai/usage/realtime` - Real-time stats (admin)
- **Features**:
  - JWT authentication
  - Subscription tier tracking
  - Usage percentage calculation

#### 3. Usage Middleware (`server/middleware.py`)
- **Automatic Tracking**:
  - Tracks all AI endpoint calls
  - Measures response times
  - Estimates token usage
  - Records success/failure
  - No code changes needed in existing routes

#### 4. Enhanced Health Endpoint
- **Updated `/health` endpoint**:
  - Includes real-time usage statistics
  - Shows active users
  - Displays recent operations
  - No authentication required

### Frontend Components

#### 1. Usage Service (`src/services/usage.service.ts`)
- **Methods**:
  - `getMyUsage(days)` - Get user statistics
  - `getUserUsage(userId, days)` - Get specific user stats
  - `getGlobalUsage(days)` - Get global analytics
  - `getRealtimeStats()` - Get real-time data
  - `getHealth()` - Get health with usage stats
- **Utilities**:
  - `formatNumber()` - Format large numbers (1.2K, 5.4M)
  - `formatDailyUsageForChart()` - Prepare chart data
  - `formatOperationsByType()` - Format for bar charts

#### 2. Admin Dashboard (`views/Admin.tsx`)
- **Dynamic Data Display**:
  - Real-time statistics from health endpoint
  - Global usage analytics
  - Daily activity charts
  - Operations by type breakdown
  - Top users leaderboard
- **Auto-refresh**:
  - Polls every 30 seconds
  - Updates without page reload
  - Shows loading states

## Data Models

### Usage Log Entry
```typescript
{
  user_id: string
  endpoint: string
  operation_type: string
  tokens_used: number
  success: boolean
  response_time_ms: number
  timestamp: datetime
  metadata: object
}
```

### Daily Stats
```typescript
{
  user_id: string  // or "global"
  date: datetime
  total_operations: number
  total_tokens: number
  successful_operations: number
  failed_operations: number
}
```

### User Usage Response
```typescript
{
  user_id: string
  period_days: number
  total_operations: number
  successful_operations: number
  failed_operations: number
  total_tokens: number
  avg_response_time_ms: number
  success_rate: number
  operations_by_type: Record<string, number>
  daily_usage: Record<string, {operations, tokens}>
  most_recent_activity: datetime
  subscription_limit: number
  usage_percentage: number
}
```

## Subscription Tiers

Token limits per month:
- **Free**: 10,000 tokens
- **Basic**: 50,000 tokens
- **Pro**: 200,000 tokens
- **Enterprise**: 1,000,000 tokens

## Usage Tracking

### Automatic Tracking
All AI endpoints are automatically tracked:
- `/ai/chat` - Chat operations
- `/ai/chat/stream` - Streaming chat
- `/ai/summarize` - Text summarization
- `/ai/summarize/stream` - Streaming summarization
- `/ai/qa` - Question answering
- `/ai/qa/stream` - Streaming Q&A
- `/ai/qa/file` - File-based Q&A
- `/ai/mindmap` - Mind map generation
- `/ai/upload` - Document upload

### Token Estimation
Current implementation uses estimates:
- Chat: 500 tokens
- Chat Stream: 750 tokens
- Summarize: 1000 tokens
- Q&A: 800 tokens
- Mind Map: 2000 tokens

**TODO**: Integrate with actual LLM token counts for accuracy.

## Testing

Run the test script:
```bash
cd ai-engine
python test_usage_tracking.py
```

## API Examples

### Get My Usage
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/ai/usage/me?days=30
```

### Get Global Usage (Admin)
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/ai/usage/global?days=7
```

### Get Real-time Stats (Admin)
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/ai/usage/realtime
```

### Health Check with Usage
```bash
curl http://localhost:8000/health
```

## Frontend Usage

### In Components
```typescript
import { usageService } from '../src/services/usage.service';

// Get my usage
const myUsage = await usageService.getMyUsage(30);
console.log(`Used ${myUsage.total_tokens} tokens`);
console.log(`Usage: ${myUsage.usage_percentage}% of limit`);

// Get global stats (admin)
const globalUsage = await usageService.getGlobalUsage(7);
console.log(`Total operations: ${globalUsage.total_operations}`);
console.log(`Active users: ${globalUsage.unique_users}`);

// Get realtime stats (admin)
const realtime = await usageService.getRealtimeStats();
console.log(`Last hour: ${realtime.last_hour.total_operations} ops`);

// Format for display
const formatted = usageService.formatNumber(1234567); // "1.2M"
```

## Database Indexes

Optimized indexes for query performance:
```python
usage_logs:
  - (user_id, timestamp DESC)
  - (timestamp DESC)
  - (endpoint, timestamp DESC)

daily_stats:
  - (date DESC, user_id)
```

## Future Enhancements

1. **Accurate Token Counting**
   - Integrate with tiktoken for GPT models
   - Track actual LLM API token usage
   - Store token counts in response metadata

2. **Cost Tracking**
   - Calculate costs based on token usage
   - Track costs per user/subscription
   - Budget alerts and limits

3. **Advanced Analytics**
   - User behavior patterns
   - Peak usage times
   - Endpoint performance metrics
   - Error rate analysis

4. **Alerts & Notifications**
   - Usage limit warnings
   - Anomaly detection
   - Performance degradation alerts
   - Quota exceeded notifications

5. **Rate Limiting**
   - Per-user rate limits based on subscription
   - Token-based throttling
   - Automatic backoff

6. **Reporting**
   - Export usage reports
   - PDF/CSV downloads
   - Scheduled reports
   - Custom date ranges

## Admin Role Implementation

**TODO**: Add admin role checking to endpoints:
```python
from server.deps import get_current_user, require_admin

@router.get("/global")
async def get_global_usage(
    admin_id: str = Depends(require_admin)  # Add admin check
):
    ...
```

## Monitoring

The system tracks:
- ✅ Token usage per user
- ✅ Operations count
- ✅ Success/failure rates
- ✅ Response times
- ✅ Daily aggregations
- ✅ Real-time statistics
- ✅ User rankings
- ✅ Operation types breakdown
- ✅ Subscription limits

## Notes

- Usage data is stored permanently in MongoDB
- Daily stats are pre-aggregated for performance
- Real-time queries look at last hour only
- All timestamps are in UTC
- Frontend auto-refreshes every 30 seconds
- No authentication required for health endpoint
