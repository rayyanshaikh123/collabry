# core/intent_classifier.py

"""
Intent classification adapter.

This class supports two modes:
- Classical ML mode: loads pre-trained joblib artifacts (TF-IDF + sklearn).
- Generative LLM mode: when classical artifacts are missing, fall back to
  using the project's LocalLLM (Ollama) to classify intents using a prompt.

The LLM-mode keeps the runtime free from sklearn-only logic (no model unpickling
required) while providing a generative intent label and optional probability
distribution (best-effort via LLM-produced JSON).
"""

from pathlib import Path
import json
import logging
from typing import Dict, Optional

logger = logging.getLogger(__name__)

# Try optional import of joblib (classical ML). We keep this optional so a pure
# generative deployment can omit sklearn/joblib entirely.
try:
    import joblib  # type: ignore
except Exception:
    joblib = None

from core.local_llm import create_llm
from config import CONFIG


class IntentClassifier:
    def __init__(self, model_path: str = "models/intent_classifier"):
        self.mode = "llm"  # default to generative LLM mode
        self.clf = None
        self.vectorizer = None
        self.label_encoder = None
        self.llm = create_llm(CONFIG)

        # Attempt to load classical artifacts only if joblib is available
        if joblib is not None:
            try:
                model_path = Path(model_path)
                clf_file = model_path / "intentclf.clf.joblib"
                vec_file = model_path / "intentclf.vec.joblib"
                vec_file_alt = model_path / "intentclf" / "vectorizer.joblib"
                le_file = model_path / "intentclf.le.joblib"

                if clf_file.exists():
                    self.clf = joblib.load(clf_file)
                if vec_file.exists():
                    self.vectorizer = joblib.load(vec_file)
                elif vec_file_alt.exists():
                    self.vectorizer = joblib.load(vec_file_alt)
                if le_file.exists():
                    self.label_encoder = joblib.load(le_file)

                if self.clf and self.vectorizer and self.label_encoder:
                    self.mode = "classical"
                    logger.info("IntentClassifier: loaded classical sklearn model artifacts")
            except Exception as e:
                logger.warning(f"Failed to load classical intent classifier artifacts: {e}. Falling back to LLM mode.")

    def is_ready(self) -> bool:
        """Return True if an intent mechanism is available (LLM always available)."""
        return self.llm is not None

    def predict(self, text: str) -> str:
        """Return a single intent label string.

        If classical artifacts are present, use them; otherwise ask the LLM to
        produce a concise intent label.
        """
        if self.mode == "classical" and self.clf and self.vectorizer and self.label_encoder:
            X = self.vectorizer.transform([text])
            pred = self.clf.predict(X)[0]
            return self.label_encoder.inverse_transform([pred])[0]

        # LLM path: ask for a short label (no surrounding text)
        prompt = (
            "You are an intent classifier. Given the user's message, return a single"
            " short intent label (one or two words) that best describes the intent."
            " Only return the label, no explanation.\n\n"
            f"User message:\n\"{text}\"\n\nLabel:"
        )

        try:
            raw = self.llm._call(prompt)
            label = raw.strip().splitlines()[0]
            # sanitize simple JSON-like responses (e.g. "\"ask_question\"")
            label = label.strip(' "')
            return label
        except Exception as e:
            logger.error(f"LLM intent prediction failed: {e}")
            return "unknown"

    def predict_proba(self, text: str) -> Dict[str, float]:
        """Return probability distribution as a dict.

        For classical mode, return sklearn probabilities. For LLM mode, attempt
        to ask the LLM to return a JSON object of label->probability. If parsing
        fails, return the single predicted label with probability 1.0.
        """
        if self.mode == "classical" and self.clf and self.vectorizer and self.label_encoder:
            X = self.vectorizer.transform([text])
            probs = self.clf.predict_proba(X)[0]
            labels = self.label_encoder.classes_
            return {label: float(prob) for label, prob in zip(labels, probs)}

        # Ask LLM for JSON probabilities
        prompt = (
            "You are an intent classifier. Given the user's message, return a JSON"
            " object mapping intent labels to probabilities that sum to 1.0. Only"
            " output valid JSON. Example: {\"ask_question\": 0.6, \"greet\": 0.4}."
            f"\n\nUser message:\n\"{text}\"\n\nJSON:"
        )

        try:
            raw = self.llm._call(prompt)
            # Some LLMs may append text — try to find first {...}
            start = raw.find('{')
            end = raw.rfind('}')
            if start != -1 and end != -1 and end > start:
                candidate = raw[start:end+1]
            else:
                candidate = raw
            parsed = json.loads(candidate)
            # normalize probabilities to floats and ensure sum>0
            parsed = {str(k): float(v) for k, v in parsed.items()}
            total = sum(parsed.values())
            if total <= 0:
                # fallback
                label = self.predict(text)
                return {label: 1.0}
            # normalize
            return {k: v / total for k, v in parsed.items()}
        except Exception as e:
            logger.warning(f"LLM did not return parseable JSON probabilities: {e}")
            label = self.predict(text)
            return {label: 1.0}
