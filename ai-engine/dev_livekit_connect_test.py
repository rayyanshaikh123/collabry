import asyncio
import os

from dotenv import load_dotenv

from core.livekit_manager import LiveKitManager
from core.voice_agent import VoiceTutorAgent


async def main() -> None:
    load_dotenv(".env")

    manager = LiveKitManager()
    room_data = await manager.create_classroom_room("general", "debug")
    room_name = room_data["room_name"]

    token = manager.generate_agent_token(room_name)
    ws_url = os.getenv("LIVEKIT_WS_URL", "")

    print("room_name=", room_name)
    print("ws_url=", ws_url)

    agent = VoiceTutorAgent(room_name, session_id="debug_session")
    ok = await agent.connect(token, ws_url)
    print("connect_ok=", ok)

    await asyncio.sleep(1)
    await agent.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
