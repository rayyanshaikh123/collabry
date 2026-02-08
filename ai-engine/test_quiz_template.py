"""Test script to verify quiz template generates JSON format"""

from core.artifact_templates import format_quiz_prompt

# Test the template
prompt = format_quiz_prompt(
    topics="arrays in programming",
    num_questions=3,
    difficulty="medium"
)

print("=" * 80)
print("QUIZ TEMPLATE OUTPUT:")
print("=" * 80)
print(prompt)
print("=" * 80)

# Check for key indicators
checks = {
    "Starts with instruction": "You are a quiz generator" in prompt,
    "Has JSON example": '"question":' in prompt,
    "Has options array": '"options":' in prompt,
    "Has correctAnswer": '"correctAnswer":' in prompt,
    "Emphasizes JSON": "JSON" in prompt,
    "Instructs to start with [": "Start your response with [" in prompt or "first character must be [" in prompt,
    "Instructs to end with ]": "last character must be ]" in prompt or "End with ]" in prompt,
}

print("\nVERIFICATION CHECKS:")
for check, result in checks.items():
    status = "✅" if result else "❌"
    print(f"{status} {check}")

all_pass = all(checks.values())
print(f"\n{'✅ ALL CHECKS PASSED' if all_pass else '❌ SOME CHECKS FAILED'}")
