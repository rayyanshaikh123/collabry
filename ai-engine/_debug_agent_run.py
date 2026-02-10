import asyncio
import sys

sys.path.insert(0, "C:/Users/Admin/Documents/GitHub/collabry/ai-engine")

from core.agent import run_agent


async def main() -> None:
    try:
        async for ev in run_agent(
            user_id="u1",
            session_id="s1",
            message="Recommend me python courses",
            notebook_id=None,
            stream=True,
        ):
            print(ev)
    except Exception as exc:
        print("TOP LEVEL EXC:", repr(exc))


if __name__ == "__main__":
    asyncio.run(main())
