# core/intent_classifier.py
"""
Hugging Face–backed Intent Classifier

MIGRATION: Replaced classical/sklearn classifier with a Hugging Face LLM-backed classifier.

NEW ARCHITECTURE:
- Uses Hugging Face LLM for zero-shot intent classification
- No model training/loading required
- Backward-compatible API maintained

SUPPORTED INTENTS:
- chat, qa, summarize, explain, analyze, plan, generate, search

This file maintains backward compatibility with the old classifier interface
while using a Hugging Face LLM underneath.
"""

from pathlib import Path
import json
import logging
from typing import Dict, Optional

logger = logging.getLogger(__name__)

# Import HF-backed intent classifier
try:
    from core.gemini_intent import HFIntentClassifier, create_intent_classifier
    from core.huggingface_service import create_hf_service
    HF_AVAILABLE = True
except Exception as e:
    logger.error(f"Failed to import HF-backed intent classifier: {e}")
    HF_AVAILABLE = False

# Fallback: Try optional import of joblib (legacy classical ML)
try:
    import joblib  # type: ignore
except Exception:
    joblib = None


class IntentClassifier:
    """
    Intent classifier with Hugging Face LLM backend.
    
    Maintains backward compatibility with old sklearn-based classifier
    while using an HF-backed classifier for improved accuracy.
    """
    
    def __init__(self, model_path: str = "models/intent_classifier"):
        """
        Initialize intent classifier.
        
        Args:
            model_path: Ignored (kept for API compatibility)
        """
        self.mode = "hf"  # Use Hugging Face by default
        self.clf = None
        self.vectorizer = None
        self.label_encoder = None
        
        # Initialize HuggingFace-backed intent classifier
        if HF_AVAILABLE:
            try:
                hf = create_hf_service()
                self.hf_classifier = HFIntentClassifier(hf)
                logger.info("✓ Using HuggingFace-powered intent classifier")
            except Exception as e:
                logger.error(f"Failed to initialize HF-backed intent classifier: {e}")
                self.hf_classifier = None
                self.mode = "fallback"
        else:
            self.hf_classifier = None
            self.mode = "fallback"

    def is_ready(self) -> bool:
        """Return True if intent classifier is available."""
        return getattr(self, "hf_classifier", None) is not None or self.mode == "classical"

    def predict(self, text: str) -> str:
        """
        Return a single intent label string.
        
        Args:
            text: User input text
            
        Returns:
            Intent label (chat, qa, summarize, etc.)
        """
        # Try HF first
        if self.mode == "hf" and getattr(self, "hf_classifier", None):
            try:
                result = self.hf_classifier.classify(text)
                return result.get("intent") if isinstance(result, dict) else getattr(result, "intent", "unknown")
            except Exception as e:
                logger.error(f"HF intent prediction failed: {e}")
        
        # Fallback to classical if available
        if self.mode == "classical" and self.clf and self.vectorizer and self.label_encoder:
            try:
                X = self.vectorizer.transform([text])
                pred = self.clf.predict(X)[0]
                return self.label_encoder.inverse_transform([pred])[0]
            except Exception as e:
                logger.error(f"Classical intent prediction failed: {e}")
        
        # Last resort
        return "unknown"

    def predict_proba(self, text: str) -> Dict[str, float]:
        """
        Return probability distribution as a dict.
        
        Args:
            text: User input text
            
        Returns:
            Dictionary of {intent: probability}
        """
        # Try HF first
        if self.mode == "hf" and getattr(self, "hf_classifier", None):
            try:
                result = self.hf_classifier.classify(text)
                if isinstance(result, dict):
                    return {result.get("intent"): float(result.get("confidence", 0.0))}
                return {getattr(result, "intent", "unknown"): getattr(result, "confidence", 0.0)}
            except Exception as e:
                logger.error(f"HF probability prediction failed: {e}")
        
        # Fallback to classical if available
        if self.mode == "classical" and self.clf and self.vectorizer and self.label_encoder:
            try:
                X = self.vectorizer.transform([text])
                probs = self.clf.predict_proba(X)[0]
                labels = self.label_encoder.classes_
                return {str(labels[i]): float(probs[i]) for i in range(len(labels))}
            except Exception as e:
                logger.error(f"Classical probability prediction failed: {e}")
        
        # Last resort
        return {"unknown": 1.0}

    def classify(self, text: str, context: Optional[str] = None) -> Dict[str, object]:
        """
        Backward-compatible classify() method expected by tests.

        Returns a dict with keys: intent, confidence, entities, tool_calls
        """
        # Prefer HF classifier if available
        try:
            if self.mode == "hf" and getattr(self, "hf_classifier", None):
                result = self.hf_classifier.classify(text if context is None else (text, context))
                # The HF classifier may return a dict or an object-like result
                if isinstance(result, dict):
                    return {
                        "intent": result.get("intent", "unknown"),
                        "confidence": float(result.get("confidence", 0.0)),
                        "entities": result.get("entities", {}),
                        "tool_calls": result.get("tool_calls", []),
                    }
                # Fallback if it's an object with attributes
                return {
                    "intent": getattr(result, "intent", "unknown"),
                    "confidence": float(getattr(result, "confidence", 0.0)),
                    "entities": getattr(result, "entities", {}),
                    "tool_calls": getattr(result, "tool_calls", []),
                }
        except Exception as e:
            logger.error(f"HF classify() failed: {e}")

        # Fallback to predict/predict_proba
        intent = self.predict(text)
        probs = self.predict_proba(text)
        confidence = float(probs.get(intent, 0.0)) if isinstance(probs, dict) else 0.0
        return {"intent": intent, "confidence": confidence, "entities": {}, "tool_calls": []}
