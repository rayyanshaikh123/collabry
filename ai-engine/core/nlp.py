# core/nlp.py
"""
COLLABRY NLP PIPELINE - GEMINI-POWERED

MIGRATION: Replaced spaCy with Google Gemini (2024)

OLD ARCHITECTURE:
- spaCy en_core_web_sm for NER
- HuggingFace intent classifier
- Manual spell correction (placeholder)

NEW ARCHITECTURE:
- Gemini for entity extraction (replaces spaCy)
- Gemini for intent classification (replaces HuggingFace)
- Gemini for spell correction (optional)
- Single API call for all NLP tasks

BENEFITS:
- No local model loading (faster startup)
- Better entity recognition (GPT-class reasoning)
- More accurate intent classification
- Unified API
- No dependency on spaCy models

BACKWARD COMPATIBILITY:
- analyze() function maintains same interface
- Returns same dictionary structure
- All existing code using analyze() continues to work
"""

import logging
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# ---------------------------------------------------------------
# Import Gemini services
# ---------------------------------------------------------------
try:
    from core.gemini_service import create_gemini_service
    from core.gemini_intent import IntentClassifier
    
    # Initialize Gemini service (lazy initialization)
    _gemini_service = None
    _intent_classifier = None
    
    def _get_gemini_service():
        """Lazy initialization of Gemini service."""
        global _gemini_service
        if _gemini_service is None:
            _gemini_service = create_gemini_service()
            logger.info("✓ Gemini NLP service initialized")
        return _gemini_service
    
    def _get_intent_classifier():
        """Lazy initialization of intent classifier."""
        global _intent_classifier
        if _intent_classifier is None:
            _intent_classifier = IntentClassifier()
            logger.info("✓ Gemini intent classifier initialized")
        return _intent_classifier
    
    GEMINI_AVAILABLE = True
    logger.info("✓ Gemini NLP pipeline ready")
    
except Exception as e:
    logger.error(f"Failed to initialize Gemini NLP: {e}")
    GEMINI_AVAILABLE = False


# ---------------------------------------------------------------
# FALLBACK: Legacy spaCy support (if Gemini fails)
# ---------------------------------------------------------------
_spacy_nlp = None

def _get_spacy_fallback():
    """Get spaCy model for fallback (only if Gemini unavailable)."""
    global _spacy_nlp
    if _spacy_nlp is None:
        try:
            import spacy
            _spacy_nlp = spacy.load("en_core_web_sm")
            _spacy_nlp.max_length = 10000000
            logger.warning("⚠️ Using spaCy fallback (Gemini unavailable)")
        except:
            import spacy
            _spacy_nlp = spacy.blank("en")
            _spacy_nlp.max_length = 10000000
            logger.warning("⚠️ Using blank spaCy model (model not found)")
    return _spacy_nlp


# ---------------------------------------------------------------
# MAIN ANALYSIS FUNCTION (Gemini-powered)
# ---------------------------------------------------------------
def analyze(text: str) -> Dict[str, Any]:
    """
    Unified NLP analysis powered by Google Gemini.
    
    Performs:
    1. Spell correction (optional)
    2. Intent classification
    3. Named Entity Recognition (NER)
    
    Args:
        text: Input text to analyze
        
    Returns:
        Dictionary with analysis results:
        {
            "text": original text,
            "corrected": spell-corrected text,
            "intent": detected intent,
            "intent_proba": confidence scores,
            "entities": list of (entity_text, entity_type) tuples
        }
    """
    # Skip NLP for very long texts (> 1MB)
    if len(text) > 1000000:
        logger.info(f"Skipping NLP for long text ({len(text)} chars)")
        return {
            "text": text,
            "corrected": text,
            "intent": "unknown",
            "intent_proba": {},
            "entities": []
        }
    
    # Try Gemini-powered analysis
    if GEMINI_AVAILABLE:
        try:
            return _analyze_with_gemini(text)
        except Exception as e:
            logger.error(f"Gemini NLP failed, using fallback: {e}")
    
    # Fallback to spaCy if Gemini unavailable
    return _analyze_with_spacy(text)


def _analyze_with_gemini(text: str) -> Dict[str, Any]:
    """
    Perform NLP analysis using Gemini.
    
    Args:
        text: Input text
        
    Returns:
        Analysis dictionary
    """
    gemini = _get_gemini_service()
    intent_clf = _get_intent_classifier()
    
    # -------------------------
    # 1) SPELL CORRECTION (optional)
    # -------------------------
    # For now, skip spell correction to reduce API calls
    # Can be enabled later if needed
    corrected = text
    
    # -------------------------
    # 2) INTENT CLASSIFICATION
    # -------------------------
    try:
        intent_result = intent_clf.classify(corrected)
        
        # Handle both dict and object responses
        if isinstance(intent_result, dict):
            intent = intent_result.get("intent", "unknown")
            confidence = intent_result.get("confidence", 0.8)
        else:
            # IntentResult object
            intent = intent_result.intent
            confidence = intent_result.confidence
        
        # Convert confidence to probability format
        proba = {intent: confidence}
        
    except Exception as e:
        logger.error(f"Intent classification failed: {e}")
        intent = "unknown"
        proba = {}
    
    # -------------------------
    # 3) NAMED ENTITY RECOGNITION
    # -------------------------
    try:
        entities_dict = gemini.extract_entities(corrected)
        
        # Convert dict format {"LABEL": [entities]} to list of tuples [(text, label)]
        entities = []
        for label, texts in entities_dict.items():
            for text in texts:
                entities.append((text, label))
    except Exception as e:
        logger.error(f"Entity extraction failed: {e}")
        entities = []
    
    return {
        "text": text,
        "corrected": corrected,
        "intent": intent,
        "intent_proba": proba,
        "entities": entities,
    }


def _analyze_with_spacy(text: str) -> Dict[str, Any]:
    """
    Fallback NLP analysis using spaCy.
    
    Args:
        text: Input text
        
    Returns:
        Analysis dictionary
    """
    nlp = _get_spacy_fallback()
    doc = nlp(text)
    
    # Extract entities
    entities = [(ent.text, ent.label_) for ent in doc.ents]
    
    return {
        "text": text,
        "corrected": text,
        "intent": "unknown",
        "intent_proba": {},
        "entities": entities,
    }


# ---------------------------------------------------------------
# ADDITIONAL HELPER FUNCTIONS
# ---------------------------------------------------------------
def extract_entities(text: str, entity_types: Optional[List[str]] = None) -> List[tuple]:
    """
    Extract named entities from text.
    
    Args:
        text: Input text
        entity_types: Specific entity types to extract (optional)
        
    Returns:
        List of (entity_text, entity_type) tuples
    """
    if GEMINI_AVAILABLE:
        try:
            gemini = _get_gemini_service()
            entities_dict = gemini.extract_entities(text, entity_types)
            
            # Convert dict format to list of tuples
            entities = []
            for label, texts in entities_dict.items():
                for entity_text in texts:
                    entities.append((entity_text, label))
            return entities
        except Exception as e:
            logger.error(f"Gemini entity extraction failed: {e}")
    
    # Fallback to spaCy
    nlp = _get_spacy_fallback()
    doc = nlp(text)
    entities = [(ent.text, ent.label_) for ent in doc.ents]
    
    # Filter by entity types if specified
    if entity_types:
        entities = [(text, label) for text, label in entities if label in entity_types]
    
    return entities


def classify_intent(text: str, context: Optional[str] = None) -> str:
    """
    Classify user intent.
    
    Args:
        text: User input
        context: Optional conversation context
        
    Returns:
        Detected intent string
    """
    if GEMINI_AVAILABLE:
        try:
            intent_clf = _get_intent_classifier()
            result = intent_clf.classify(text, context)
            return result.intent
        except Exception as e:
            logger.error(f"Intent classification failed: {e}")
    
    return "unknown"
