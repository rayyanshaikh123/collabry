# core/local_llm.py
import requests
import json
import logging
import time
from urllib.parse import urlparse
from typing import Any, List, Mapping, Optional
from requests.exceptions import RequestException, Timeout, ConnectionError

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


def _sanitize_host(host: str) -> str:
    """
    Ensures Ollama host is a valid usable URL.

    Fixes:
    - Missing protocol (adds http://)
    - Hosts like "0.0.0.0" → replaced with localhost
    - Extra slashes removed
    """

    if not host:
        return "http://localhost:11434"

    # If no protocol, prepend http://
    if "://" not in host:
        host = "http://" + host

    parsed = urlparse(host)

    # Replace 0.0.0.0 with localhost (0.0.0.0 = bind address, not connectable)
    if parsed.hostname in ("0.0.0.0", "0.0.0.0:11434"):
        host = host.replace("0.0.0.0", "localhost")

    # Normalize slashes
    host = host.rstrip("/")

    return host


from langchain_core.language_models.llms import LLM


def _retry_with_backoff(func):
    """Decorator to retry Ollama API calls with exponential backoff."""
    def wrapper(self, *args, **kwargs):
        max_retries = getattr(self, 'max_retries', 3)
        retry_delay = getattr(self, 'retry_delay', 1.0)
        
        for attempt in range(max_retries):
            try:
                return func(self, *args, **kwargs)
            except (ConnectionError, Timeout) as e:
                if attempt == max_retries - 1:
                    logger.error(f"[Ollama] Max retries ({max_retries}) reached: {e}")
                    raise
                
                wait_time = retry_delay * (2 ** attempt)  # Exponential backoff
                logger.warning(f"[Ollama] Attempt {attempt + 1} failed, retrying in {wait_time}s: {e}")
                time.sleep(wait_time)
            except RequestException as e:
                # Non-retryable errors (4xx, 5xx)
                logger.error(f"[Ollama] Request failed: {e}")
                raise
        
    return wrapper


class LocalLLM(LLM):
    """
    Wrapper for calling Ollama's /api/generate and /api/chat (streaming).
    Inherits from LangChain's LLM base class.
    
    Features:
    - Automatic retry with exponential backoff
    - Configurable timeout handling
    - Connection pooling via requests
    - Comprehensive error handling
    """
    model_name: str
    temperature: float
    host: str
    timeout: int = 60  # Request timeout in seconds
    max_retries: int = 3  # Number of retry attempts
    retry_delay: float = 1.0  # Initial retry delay in seconds
    last_response: Optional[str] = None

    @property
    def _llm_type(self) -> str:
        return "custom"

    @_retry_with_backoff
    def _call(self, prompt: str, stop: Optional[List[str]] = None, **kwargs: Any) -> str:
        url = f"{self.host}/api/generate"
        payload = {
            "model": self.model_name,
            "prompt": prompt,
            "temperature": self.temperature,
            "stream": False,
        }

        try:
            r = requests.post(url, json=payload, timeout=self.timeout)
            r.raise_for_status()
            data = r.json()
            self.last_response = data.get("response", "")
            return self.last_response
        except Timeout:
            logger.error(f"[Ollama] Request timeout after {self.timeout}s")
            raise
        except ConnectionError as e:
            logger.error(f"[Ollama] Connection failed: {e}")
            raise
        except RequestException as e:
            logger.error(f"[Ollama] Request error: {e}")
            return json.dumps({"tool": None, "answer": f"LLM error: {e}"})
        except Exception as e:
            logger.error(f"[Ollama] Unexpected error: {e}")
            return json.dumps({"tool": None, "answer": f"LLM error: {e}"})

    @_retry_with_backoff
    def _stream(self, prompt: str, stop: Optional[List[str]] = None, **kwargs: Any):
        url = f"{self.host}/api/generate"
        payload = {
            "model": self.model_name,
            "prompt": prompt,
            "temperature": self.temperature,
            "stream": True,
        }

        try:
            with requests.post(url, json=payload, stream=True, timeout=self.timeout) as r:
                r.raise_for_status()
                full = ""
                for line in r.iter_lines():
                    if not line:
                        continue
                    try:
                        obj = json.loads(line.decode("utf-8"))
                        chunk = obj.get("response", "")
                        full += chunk
                        yield chunk
                    except json.JSONDecodeError:
                        continue
                self.last_response = full
        except Timeout:
            logger.error(f"[Ollama] Stream timeout after {self.timeout}s")
            yield f"[Error] Ollama request timed out after {self.timeout}s"
        except ConnectionError as e:
            logger.error(f"[Ollama] Stream connection failed: {e}")
            yield f"[Error] Could not connect to Ollama: {e}"
        except RequestException as e:
            logger.error(f"[Ollama] Stream request error: {e}")
            yield f"[Error] Ollama request failed: {e}"
        except Exception as e:
            logger.error(f"[Ollama] Unexpected stream error: {e}")
            yield f"[Error] Unexpected error: {e}"

    @property
    def _identifying_params(self) -> Mapping[str, Any]:
        """Get the identifying parameters."""
        return {"model_name": self.model_name, "temperature": self.temperature}

def create_llm(config):
    """
    Factory function to create an instance of the LocalLLM.
    
    Supports ENV-based configuration:
    - OLLAMA_BASE_URL or OLLAMA_HOST: Base URL for Ollama API
    - OLLAMA_MODEL: Model name to use
    - OLLAMA_TIMEOUT: Request timeout in seconds (default: 60)
    - OLLAMA_MAX_RETRIES: Maximum retry attempts (default: 3)
    - OLLAMA_RETRY_DELAY: Initial retry delay in seconds (default: 1.0)
    """
    host = _sanitize_host(config.get("ollama_host", "http://localhost:11434"))
    
    llm = LocalLLM(
        model_name=config.get("llm_model", "llama3.1"),
        temperature=config.get("temperature", 0.2),
        host=host,
        timeout=config.get("ollama_timeout", 60),
        max_retries=config.get("ollama_max_retries", 3),
        retry_delay=config.get("ollama_retry_delay", 1.0)
    )
    
    logger.info(f"[Ollama] Initialized LLM: model={llm.model_name}, host={llm.host}, timeout={llm.timeout}s")
    return llm
