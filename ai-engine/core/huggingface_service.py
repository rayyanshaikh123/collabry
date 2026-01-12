"""core/huggingface_service.py

Lightweight Hugging Face Router API wrapper using OpenAI client.

This module provides two primary methods:
- `generate(prompt, temperature, max_tokens)` — synchronous text generation
- `generate_stream(prompt, temperature, max_tokens)` — generator that yields
  the full response as a single chunk

Configuration:
 - HF_TOKEN in environment (REQUIRED)
 - model name passed in factory or via config (e.g. 'openai/gpt-oss-120b:groq', etc.)
"""
import logging
from typing import Iterator, Optional
from openai import OpenAI

from config import CONFIG  # project-level config

logger = logging.getLogger(__name__)


class HuggingFaceService:
    """Simple wrapper over the Hugging Face Router API using OpenAI client."""

    def __init__(self, model: str = "openai/gpt-oss-120b:groq", api_key: Optional[str] = None):
        self.model = model
        self.api_key = api_key or CONFIG.get("hf_token") or CONFIG.get("huggingface_api_key")
        if not self.api_key:
            raise ValueError("HF_TOKEN or HUGGINGFACE_API_KEY environment variable is required")
        
        self.client = OpenAI(
            base_url="https://router.huggingface.co/v1",
            api_key=self.api_key
        )

    def generate(self, prompt: str, temperature: float = 0.2, max_tokens: Optional[int] = None) -> str:
        """Generate text using Hugging Face Router API."""
        try:
            completion = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=temperature,
                max_tokens=max_tokens or 1000,
            )
            
            return completion.choices[0].message.content
            
        except Exception as e:
            logger.error(f"HuggingFace Router generation failed: {e}")
            raise

    def generate_stream(self, prompt: str, temperature: float = 0.2, max_tokens: Optional[int] = None) -> Iterator[str]:
        """Streaming support - yields the full response as one chunk."""
        try:
            text = self.generate(prompt=prompt, temperature=temperature, max_tokens=max_tokens)
            yield text
        except Exception as e:
            logger.error(f"HuggingFace Router streaming failed: {e}")
            yield f"[Error] HuggingFace Router request failed: {e}"


def create_hf_service(model: str = None, timeout: int = 60) -> HuggingFaceService:
    model_name = model or CONFIG.get("llm_model") or "openai/gpt-oss-120b:groq"
    return HuggingFaceService(model=model_name)
