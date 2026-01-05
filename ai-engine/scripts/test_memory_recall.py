"""Quick test harness: exercise memory recall without needing interactive LLM.

This calls the agent with two messages:
 - A memory statement about puppies
 - A follow-up "how many" question

The agent contains a small rule-based recall that should answer directly.
"""
import sys
sys.path.insert(0, '.')

from core.agent import create_agent
from config import CONFIG


def on_token(chunk: str):
    # mimic streaming: print tokens
    print(chunk, end="")


def run_test():
    agent, llm, tools, memory = create_agent(CONFIG)

    # First message (store to memory)
    msg1 = "I am happy to share that my dog just gave birth to 5 babies"
    print(f"\n-- Sending: {msg1}")
    agent.handle_user_input_stream(msg1, on_token)

    # Second message (should recall)
    msg2 = "how many puppies did my dog give birth to?"
    print(f"\n-- Sending: {msg2}")
    agent.handle_user_input_stream(msg2, on_token)


if __name__ == "__main__":
    run_test()
