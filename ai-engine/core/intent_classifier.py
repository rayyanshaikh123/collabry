# core/intent_classifier.py

"""
Lightweight classical ML intent classifier.
Uses TF-IDF + Logistic Regression.
"""

import joblib
from pathlib import Path
import numpy as np


class IntentClassifier:
    def __init__(self, model_path: str = "models/intent_classifier"):
        model_path = Path(model_path)
        self.clf = None
        self.vectorizer = None
        self.label_encoder = None

        clf_file = model_path / "intentclf.clf.joblib"
        # Support multiple vectorizer locations for compatibility
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

    def is_ready(self):
        return self.clf is not None and self.vectorizer is not None and self.label_encoder is not None

    def predict(self, text: str):
        """Return predicted label string."""
        X = self.vectorizer.transform([text])   # ALWAYS 2D
        pred = self.clf.predict(X)[0]
        return self.label_encoder.inverse_transform([pred])[0]

    def predict_proba(self, text: str):
        """Return probability distribution (dict)."""
        X = self.vectorizer.transform([text])  # FIX: this ensures 2D matrix
        probs = self.clf.predict_proba(X)[0]   # safe indexing

        labels = self.label_encoder.classes_
        return {label: float(prob) for label, prob in zip(labels, probs)}
