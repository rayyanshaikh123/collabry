import joblib
from pathlib import Path

model_path = Path("models") / "intent_classifier" / "intentclf.clf.joblib"

print(f"Loading model from: {model_path}")
model = joblib.load(model_path)

print("Model type:", type(model))

named = getattr(model, "named_steps", None)
if named:
    print("Pipeline named_steps:", list(named.keys()))
else:
    print("No named_steps on model")

steps = getattr(model, "steps", None)
if steps:
    print("Pipeline steps:", [name for name, _ in steps])
else:
    print("No steps attribute on model")

# Print top-level attributes that may contain vectorizer
candidates = [a for a in dir(model) if "vec" in a.lower() or "tfidf" in a.lower() or "transformer" in a.lower()]
print("Candidate attributes:", candidates)

# Try to access common attributes
for attr in ["vectorizer", "tfidf", "transformer", "preprocessor"]:
    if hasattr(model, attr):
        print(f"Found attribute {attr}:", type(getattr(model, attr)))

print("Done.")
