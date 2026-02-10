# LLM Provider Testing Guide

This guide explains how to switch between different LLM providers for testing without consuming your OpenAI quota.

## Quick Start

Change the `LLM_PROVIDER` setting in your `.env` file:

```bash
# Use OpenAI (production)
LLM_PROVIDER=openai

# Use Groq (free tier, fast)
LLM_PROVIDER=groq

# Use Ollama (local, completely free)
LLM_PROVIDER=ollama

# Use Together AI (generous free tier)
LLM_PROVIDER=together
```

## Provider Comparison

| Provider | Cost | Speed | Setup Difficulty | Best For |
|----------|------|-------|------------------|----------|
| **OpenAI** | Paid (rate limited on free tier) | Fast | Easy | Production |
| **Groq** | Free tier available | Very Fast | Easy | Development/Testing |
| **Ollama** | Completely Free | Medium | Medium | Local Development |
| **Together AI** | Generous free tier | Fast | Easy | Testing/Development |

## Setup Instructions

### 1. OpenAI (Production)

**Cost:** Paid (free tier: 200 requests/day for gpt-4o-mini)

```bash
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-proj-your-key-here
OPENAI_MODEL=gpt-4o-mini
LLM_REQUEST_DELAY=1.5  # Avoid rate limits
```

Get API key: https://platform.openai.com/api-keys

---

### 2. Groq (Recommended for Testing)

**Cost:** FREE (generous rate limits)
**Speed:** Extremely fast inference

```bash
LLM_PROVIDER=groq
GROQ_API_KEY=your-groq-api-key
GROQ_MODEL=llama-3.3-70b-versatile
LLM_REQUEST_DELAY=0.5
```

**Setup:**
1. Sign up at: https://console.groq.com
2. Get your free API key
3. Update `.env` with your key
4. Set `LLM_PROVIDER=groq`

**Available Models:**
- `llama-3.3-70b-versatile` (Best quality)
- `llama-3.1-70b-versatile` (Fast, good quality)
- `mixtral-8x7b-32768` (Large context window)

---

### 3. Ollama (Local, No API Key Required)

**Cost:** FREE (runs on your machine)
**Speed:** Depends on your hardware

```bash
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_MODEL=llama3.2
LLM_REQUEST_DELAY=0.1
```

**Setup:**

1. **Install Ollama:**
   - Windows: Download from https://ollama.ai
   - Mac: `brew install ollama`
   - Linux: `curl -fsSL https://ollama.ai/install.sh | sh`

2. **Start Ollama server:**
   ```bash
   ollama serve
   ```

3. **Pull a model:**
   ```bash
   # Recommended models
   ollama pull llama3.2        # Fast, 3B params
   ollama pull mistral         # Good quality, 7B params
   ollama pull llama3.1:8b     # Better quality, 8B params
   ```

4. **Update `.env`:**
   ```bash
   LLM_PROVIDER=ollama
   OLLAMA_MODEL=llama3.2
   ```

5. **Restart the server**

**Available Models:**
- `llama3.2` - Fast, good for development
- `mistral` - Balanced speed/quality
- `llama3.1:8b` - Better quality
- `codellama` - Code-focused

List all available models: `ollama list`

---

### 4. Together AI (Alternative Free Tier)

**Cost:** FREE tier with credits
**Speed:** Fast

```bash
LLM_PROVIDER=together
TOGETHER_API_KEY=your-together-api-key
TOGETHER_MODEL=meta-llama/Llama-3.3-70B-Instruct-Turbo
LLM_REQUEST_DELAY=0.5
```

**Setup:**
1. Sign up at: https://api.together.xyz
2. Get your API key
3. Update `.env` with your key
4. Set `LLM_PROVIDER=together`

**Available Models:**
- `meta-llama/Llama-3.3-70B-Instruct-Turbo` (Best quality)
- `mistralai/Mixtral-8x7B-Instruct-v0.1` (Fast)

---

## Testing Workflow

### Recommended Approach:

1. **Development (Local):**
   ```bash
   LLM_PROVIDER=ollama
   OLLAMA_MODEL=llama3.2
   ```
   - No API costs
   - Works offline
   - Fast iteration

2. **Testing (Cloud):**
   ```bash
   LLM_PROVIDER=groq
   GROQ_MODEL=llama-3.3-70b-versatile
   ```
   - Free tier
   - Very fast
   - Good quality

3. **Production:**
   ```bash
   LLM_PROVIDER=openai
   OPENAI_MODEL=gpt-4o-mini
   ```
   - Best quality
   - Reliable
   - Paid

---

## Switching Providers

Simply change `LLM_PROVIDER` in your `.env` file and restart the server:

```bash
# Stop the server (Ctrl+C)

# Edit .env
LLM_PROVIDER=groq  # or ollama, together, openai

# Restart
python run_server.py
```

No code changes needed! The system automatically uses the correct provider.

---

## Common Issues

### Ollama: "Connection refused"
**Solution:** Make sure Ollama is running: `ollama serve`

### Groq/Together: "Invalid API key"
**Solution:** Check your API key is correct and not expired

### OpenAI: "Rate limit exceeded"
**Solution:** 
- Increase `LLM_REQUEST_DELAY` to 2.0+
- Switch to Groq or Ollama temporarily
- Upgrade your OpenAI plan

---

## Performance Tips

1. **Rate Limiting:**
   - OpenAI: `LLM_REQUEST_DELAY=1.5` (200 req/day limit on free tier)
   - Groq: `LLM_REQUEST_DELAY=0.5` (generous limits)
   - Ollama: `LLM_REQUEST_DELAY=0.1` (no limits)
   - Together: `LLM_REQUEST_DELAY=0.5` (generous limits)

2. **Token Limits:**
   - Keep `LLM_MAX_TOKENS=700` for cost efficiency
   - Increase only if responses are cut off

3. **Temperature:**
   - `LLM_TEMPERATURE=0.3` - More focused (development)
   - `LLM_TEMPERATURE=0.7` - More creative (production)

---

## Cost Comparison (Approximate)

**Per 1000 requests:**
- OpenAI (gpt-4o-mini): ~$0.15 - $0.60
- Groq: $0 (free tier)
- Ollama: $0 (hardware cost only)
- Together AI: $0 (free tier credits)

**Recommendation:** Use Groq or Ollama for development/testing, OpenAI for production.
