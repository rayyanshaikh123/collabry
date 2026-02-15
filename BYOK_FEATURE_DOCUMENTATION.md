# BYOK (Bring Your Own Key) Feature Documentation

## Overview

The BYOK feature allows users to use their own API keys from OpenAI, Groq, or Gemini instead of consuming platform AI credits. When enabled, users bypass all usage limits and are billed directly by the AI provider.

## Architecture

### Security
- **Encryption**: User API keys are encrypted using AES-256-GCM before storage
- **Key Derivation**: PBKDF2 with 100,000 iterations and per-user salts
- **Authentication**: Integrity verification with authentication tags
- **Storage**: Keys never stored in plain text, never returned in API responses

### Data Flow
```
User → Backend (Auth + BYOK Check) → AI Engine (User's Key) → LLM Provider
                  ↓
          Skip usage limits if BYOK active
```

## Implementation

### 1. Backend Components

#### Encryption Service
**File**: `backend/src/utils/encryption.js`
- Encrypts/decrypts API keys using AES-256-GCM
- Per-user encryption keys derived from master key + user ID
- Prevents tampering with authentication tags

#### User Model Extensions
**File**: `backend/src/models/User.js`
- `apiKeys`: Map storing encrypted keys per provider
- `byokSettings`: Configuration (enabled, activeProvider, fallbackToSystem)
- Helper methods: `getDecryptedApiKey()`, `hasByokEnabled()`

#### API Endpoints
**File**: `backend/src/routes/apiKey.routes.js`
- `GET /api/apikeys` - List user's keys (without actual keys)
- `POST /api/apikeys` - Add/update API key
- `PUT /api/apikeys/:provider` - Activate/deactivate key
- `DELETE /api/apikeys/:provider` - Delete key
- `POST /api/apikeys/:provider/validate` - Test key validity
- `POST /api/apikeys/settings` - Update BYOK settings

#### Usage Enforcement
**File**: `backend/src/middleware/usageEnforcement.js`
- Skips daily limits when user has BYOK enabled
- Separate tracking for analytics (doesn't count against platform quotas)

#### AI Service
**File**: `backend/src/services/ai.service.js`
- Checks for BYOK before forwarding to AI engine
- Adds custom headers: `X-User-Api-Key`, `X-User-Base-Url`, `X-User-Provider`
- Implements fallback to system key on user key failure (if enabled)

### 2. AI Engine Components

#### Authentication Dependency
**File**: `ai-engine/server/deps.py`
- Extracts BYOK headers from requests
- Returns dict with `user_id` and optional `byok` info
- Backward compatible with existing endpoints

#### LLM Client
**File**: `ai-engine/core/llm.py`
- Modified `get_openai_client()` to accept user API key
- Creates dedicated client for user keys (no caching)
- Falls back to system singleton if no user key

#### Agent & Routes
**Files**: `ai-engine/core/agent.py`, `ai-engine/server/routes/chat.py`
- Accept optional `byok` parameter in agent functions
- Pass user's API key/config through call chain
- Transparent to existing code (optional parameter)

### 3. Frontend Components

#### API Key Management UI
**File**: `frontend/components/settings/ApiKeyCard.tsx`
- Provider-specific cards (OpenAI, Groq, Gemini)
- Add/validate/activate/delete operations
- Password-style input with show/hide toggle
- Validation status badges

#### Settings Page Integration
**File**: `frontend/app/(main)/settings/page.tsx`
- New "API Keys" tab in settings
- Master enable/disable toggle for BYOK
- Info panel explaining encryption and benefits
- State management for API keys and settings

## Setup

### 1. Environment Configuration

Add to `backend/.env`:
```bash
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_MASTER_KEY=c56bb907cacdf72a525cd1ee5cb9cf115e06cfae5d1cbda5646fe2a5288d3e70
```

**⚠️ CRITICAL**: Never change this key after users have added API keys, or you'll lose access to encrypted data!

### 2. Database Migration

Run once to add BYOK fields to existing users:
```bash
cd backend
node scripts/migrate-add-byok-fields.js
```

### 3. Restart Services

Restart backend and AI engine for changes to take effect.

## Usage

### For Users

1. **Navigate to Settings** → API Keys tab
2. **Add Provider Key**: Click "Add API Key" on desired provider
3. **Enter API Key**: Paste your key from provider's console
4. **Validation**: System automatically tests the key
5. **Activate**: Click "Activate" to enable BYOK
6. **Use AI Features**: All AI features now use your key

### Getting Provider Keys

- **OpenAI**: https://platform.openai.com/api-keys
- **Groq**: https://console.groq.com/keys
- **Gemini**: https://aistudio.google.com/app/apikey

## Security Considerations

### What's Protected
✅ Keys encrypted with AES-256-GCM  
✅ Per-user key derivation (PBKDF2)  
✅ Authentication tags prevent tampering  
✅ Keys never in API responses  
✅ User-scoped access (can't see other users' keys)  

### Best Practices
1. Rotate master encryption key periodically (requires re-encryption)
2. Monitor failed validation attempts for suspicious activity
3. Implement rate limits on API key operations
4. Log all API key access for audit trails
5. Set up alerts for multiple failed key validations

## Error Handling

### Invalid Key
- Validation fails during adding
- User notified with error message
- Key not saved to database

### Key Failure During Use
- If user's key fails (401 error) and `fallbackToSystem` is enabled:
  - System automatically retries with platform key
  - User's key marked as invalid
  - Error count incremented

### Auto-Disable
- After 3 consecutive failures, key is marked invalid
- User must re-validate or re-add key

## Monitoring

### Metrics to Track
- Number of users with BYOK enabled
- Usage split: user keys vs. platform keys
- Key validation success rate
- Fallback usage frequency
- Provider distribution (OpenAI vs. Groq vs. Gemini)

### Logs to Monitor
- `[BYOK]` prefix in backend/AI engine logs
- Encryption/decryption errors
- Key validation failures
- Fallback activations

## API Examples

### Add API Key
```bash
curl -X POST http://localhost:5001/api/apikeys \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "openai",
    "apiKey": "sk-..."
  }'
```

### Activate Key
```bash
curl -X PUT http://localhost:5001/api/apikeys/openai \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "isActive": true
  }'
```

### List Keys
```bash
curl http://localhost:5001/api/apikeys \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Troubleshooting

### Issue: Encrypted keys can't be decrypted
**Cause**: `ENCRYPTION_MASTER_KEY` changed or missing  
**Solution**: Restore original master key from backups

### Issue: Validation fails but key is correct
**Cause**: Rate limiting by provider, network issues  
**Solution**: Wait and retry, check provider API status

### Issue: User key not being used
**Cause**: Not activated or marked invalid  
**Solution**: Check `byokSettings.enabled` and key `isActive` status

### Issue: "Invalid encrypted data format" error
**Cause**: Corrupted database entry  
**Solution**: Delete and re-add the API key

## Future Enhancements

1. **Key Rotation**: Auto-rotate keys periodically
2. **Multi-Key Load Balancing**: Distribute requests across multiple keys
3. **Cost Tracking**: Show users their actual API costs
4. **Team Keys**: Organization-level key sharing
5. **Key Health Dashboard**: Real-time status monitoring
6. **Automatic Provider Selection**: Choose cheapest/fastest provider
7. **Budget Alerts**: Notify when approaching spending limits

## Testing

### Manual Test Checklist
- [ ] Add OpenAI key → validates successfully
- [ ] Activate key → BYOK enabled
- [ ] Generate quiz → uses user's key (check logs for `[BYOK]`)
- [ ] Check usage → not counted against platform limits
- [ ] Add invalid key → validation fails, key not saved
- [ ] Delete key → BYOK disabled
- [ ] Test all 3 providers (OpenAI, Groq, Gemini)
- [ ] Verify encrypted keys in MongoDB (not readable)

### Security Test Checklist
- [ ] Keys never appear in GET /api/apikeys response
- [ ] Admin cannot access user's decrypted keys
- [ ] JWT required for all API key operations
- [ ] User A cannot access User B's keys
- [ ] Encrypted keys stored correctly (format: iv:authTag:encrypted)

## Support

For issues or questions:
1. Check logs for `[BYOK]` prefix
2. Verify `ENCRYPTION_MASTER_KEY` is set
3. Confirm user has valid, activated key
4. Test key independently at provider's playground

---

**Last Updated**: February 2026  
**Version**: 1.0.0
