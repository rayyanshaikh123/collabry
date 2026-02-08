# LiveKit Agents Playground (Voice Tutor)

This repo includes a LiveKit Agents worker entrypoint at `ai-engine/livekit_agents_voice_tutor.py`.

## 1) Environment variables

Set these (same `.env` file you already use is fine):

- `LIVEKIT_URL` (example: `wss://<your-subdomain>.livekit.cloud`) (also supports `LIVEKIT_WS_URL`)
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`

Providers:

- `OPENAI_BASE_URL` (Ollama OpenAI-compatible endpoint, example: `http://localhost:11434/v1`)
- `OPENAI_API_KEY` (can be dummy for Ollama, but must be present)
- `OPENAI_MODEL` (example: `llama3.2`)

- `GROQ_API_KEY`
- `GROQ_STT_MODEL` (optional; fallback: `GROQ_MODEL`)

- `ELEVENLABS_API_KEY`
- `ELEVENLABS_VOICE_ID`
- `ELEVENLABS_MODEL` (example: `eleven_multilingual_v2`)

Optional:

- `LIVEKIT_AGENT_NAME` (default: `collabry-tutor`)
- `LOG_LEVEL` (example: `INFO`)

## 2) Install deps

From `ai-engine/`:

```bash
pip install -r requirements.txt
```

## 3) Run the worker

From `ai-engine/`:

```bash
python livekit_agents_voice_tutor.py
```

You should see logs indicating the worker connected.

## 4) Use Playground

In LiveKit Agents Playground:

1. Join / create a room.
2. Dispatch an agent with the **same agent name** as `LIVEKIT_AGENT_NAME` (default: `collabry-tutor`).
3. Enable your mic in the browser UI.

If the Playground says “Waiting for agent audio track…”, it usually means the worker is not running, cannot connect to LiveKit, or the agent name being dispatched doesn’t match.

### Dispatch helper (recommended)

If you don’t see a dispatch control in the UI (or it’s not working), you can explicitly dispatch from the repo:

```bash
python livekit_dispatch_agent.py --room <room-name-from-playground>
```

This creates an explicit dispatch for `LIVEKIT_AGENT_NAME` into that room.
