# core/nlp.py
"""
NLP pipeline:
- Spell correction
- Intent detection
- NER
"""

import spacy
import logging
from core.intent_classifier import IntentClassifier

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# ---------------------------------------------------------------
# Load spaCy
# ---------------------------------------------------------------
try:
    nlp = spacy.load("en_core_web_sm")
    nlp.max_length = 10000000  # Increase to 10M characters
except:
    logger.warning("spaCy model missing — using blank model.")
    nlp = spacy.blank("en")
    nlp.max_length = 10000000

# ---------------------------------------------------------------
# Load Intent Classifier
# ---------------------------------------------------------------
intent_clf = IntentClassifier("models/intent_classifier")

if intent_clf.is_ready():
    logger.info("Intent classifier loaded.")
else:
    logger.warning("Intent classifier NOT found — intent will fallback to LLM.")


# ---------------------------------------------------------------
# MAIN ANALYSIS FUNCTION
# ---------------------------------------------------------------
def analyze(text: str):
    """
    Unified NLP analysis:
    - spell-correct
    - intent classification
    - NER
    """
    doc = nlp(text)

    # -------------------------
    # 1) SPELL CORRECTION
    # -------------------------
    corrected = text  # placeholder (you can integrate any spell corrector)

    # -------------------------
    # 2) INTENT CLASSIFICATION
    # -------------------------
    intent = "unknown"
    proba = {}

    if intent_clf.is_ready():
        try:
            proba = intent_clf.predict_proba(corrected)
            intent = max(proba, key=proba.get)
        except Exception as e:
            logger.error("Intent prediction failed: %s", e)

    # -------------------------
    # 3) Named Entities
    # -------------------------
    entities = [(ent.text, ent.label_) for ent in doc.ents]

    return {
        "text": text,
        "corrected": corrected,
        "intent": intent,
        "intent_proba": proba,
        "entities": entities,
    }
