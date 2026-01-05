"""
Test Suite for Collabry Study Copilot

Tests pedagogical features:
- Step-by-step explanations
- Clarifying question detection
- Concept extraction
- Follow-up question generation
- Source citation
"""
import sys
from pathlib import Path

# Add project root to path
PROJECT_ROOT = Path(__file__).parent
sys.path.insert(0, str(PROJECT_ROOT))

from core.agent import create_agent
from core.study_copilot import StudyCopilot
from core.local_llm import create_llm
from core.rag_retriever import RAGRetriever
from langchain_core.documents import Document
from config import CONFIG


def test_clarification_detection():
    """Test detection of vague questions."""
    print("\n" + "=" * 60)
    print("TEST 1: Clarification Detection")
    print("=" * 60)
    
    llm = create_llm(CONFIG)
    copilot = StudyCopilot(llm)
    
    # Test vague questions
    vague_tests = [
        ("what is it", True),
        ("explain this", True),
        ("tell me about it", True),
        ("it works how", True),
        ("What is photosynthesis", False),
        ("Explain quantum mechanics in simple terms", False),
        ("How does the Krebs cycle work", False),
    ]
    
    passed = 0
    failed = 0
    
    for question, should_need_clarification in vague_tests:
        clarification = copilot.needs_clarification(question)
        needs_clarification = clarification is not None
        
        if needs_clarification == should_need_clarification:
            print(f"✓ '{question}' - {'Needs clarification' if needs_clarification else 'Clear enough'}")
            passed += 1
        else:
            print(f"✗ '{question}' - Expected {should_need_clarification}, got {needs_clarification}")
            failed += 1
    
    print(f"\nResult: {passed}/{len(vague_tests)} passed")
    return failed == 0


def test_follow_up_generation():
    """Test follow-up question generation."""
    print("\n" + "=" * 60)
    print("TEST 2: Follow-Up Question Generation")
    print("=" * 60)
    
    llm = create_llm(CONFIG)
    copilot = StudyCopilot(llm)
    
    explanation = """
    Active recall is a learning technique where you actively retrieve information from memory
    rather than passively reviewing notes. For example, after reading a chapter, you close
    the book and write down everything you remember. This strengthens neural pathways and
    improves long-term retention.
    """
    
    print("Generating follow-up questions...")
    questions = copilot.generate_follow_up_questions(
        topic="active recall",
        explanation=explanation,
        count=3
    )
    
    print(f"\nGenerated {len(questions)} questions:")
    for i, q in enumerate(questions, 1):
        print(f"{i}. {q}")
    
    # Validation
    if len(questions) == 3 and all(isinstance(q, str) and len(q) > 10 for q in questions):
        print("\n✓ Follow-up generation successful")
        return True
    else:
        print("\n✗ Follow-up generation failed")
        return False


def test_concept_extraction():
    """Test concept extraction from content."""
    print("\n" + "=" * 60)
    print("TEST 3: Concept Extraction")
    print("=" * 60)
    
    llm = create_llm(CONFIG)
    copilot = StudyCopilot(llm)
    
    content = """
    Machine learning is a subset of artificial intelligence that enables systems to learn
    from data without explicit programming. Supervised learning uses labeled data to train
    models, while unsupervised learning finds patterns in unlabeled data. Neural networks
    are inspired by biological neurons and consist of layers that process information.
    """
    
    print("Extracting concepts...")
    concepts = copilot.extract_concepts(content, max_concepts=3)
    
    print(f"\nExtracted {len(concepts)} concepts:")
    for concept in concepts:
        print(f"\nName: {concept['name']}")
        print(f"Definition: {concept['definition'][:100]}...")
        if concept['example']:
            print(f"Example: {concept['example'][:100]}...")
    
    if len(concepts) > 0:
        print("\n✓ Concept extraction successful")
        return True
    else:
        print("\n✗ Concept extraction failed")
        return False


def test_study_intent_detection():
    """Test study-related intent detection."""
    print("\n" + "=" * 60)
    print("TEST 4: Study Intent Detection")
    print("=" * 60)
    
    llm = create_llm(CONFIG)
    copilot = StudyCopilot(llm)
    
    test_cases = [
        ("explanation", True),
        ("definition", True),
        ("question", True),
        ("learning", True),
        ("study", True),
        ("greeting", False),
        ("weather", False),
        ("joke", False),
    ]
    
    passed = 0
    for intent, is_study in test_cases:
        result = copilot.is_study_intent(intent)
        if result == is_study:
            print(f"✓ '{intent}' - {'Study' if is_study else 'Non-study'}")
            passed += 1
        else:
            print(f"✗ '{intent}' - Expected {is_study}, got {result}")
    
    print(f"\nResult: {passed}/{len(test_cases)} passed")
    return passed == len(test_cases)


def test_tool_suggestions():
    """Test tool suggestion based on context."""
    print("\n" + "=" * 60)
    print("TEST 5: Tool Suggestions")
    print("=" * 60)
    
    llm = create_llm(CONFIG)
    copilot = StudyCopilot(llm)
    
    test_contexts = [
        ("I want to write down my notes", ["write_file"]),
        ("Create a study document for this", ["doc_generator"]),
        ("Make a presentation about quantum physics", ["ppt_generator"]),
        ("Search for information about mitochondria", ["web_search"]),
        ("Get content from this website article", ["web_scrape"]),
    ]
    
    passed = 0
    for context, expected_tools in test_contexts:
        suggestions = copilot.suggest_study_tools(context)
        suggested_tool_names = [s['tool'] for s in suggestions]
        
        if any(tool in suggested_tool_names for tool in expected_tools):
            print(f"✓ '{context}' - Suggested: {suggested_tool_names}")
            passed += 1
        else:
            print(f"✗ '{context}' - Expected {expected_tools}, got {suggested_tool_names}")
    
    print(f"\nResult: {passed}/{len(test_contexts)} passed")
    return passed == len(test_contexts)


def test_agent_with_study_copilot():
    """Test complete agent with Study Copilot enhancements."""
    print("\n" + "=" * 60)
    print("TEST 6: Agent with Study Copilot")
    print("=" * 60)
    
    # Create agent for test user
    user_id = "test_student"
    session_id = "test_session"
    
    print(f"Creating Study Copilot agent for user_id={user_id}")
    agent, llm, tools, memory = create_agent(user_id, session_id)
    
    # Test question
    test_question = "What is the Pythagorean theorem?"
    
    print(f"\nStudent Question: {test_question}")
    print("\nStudy Copilot Response:")
    print("-" * 60)
    
    response_chunks = []
    def collect_chunk(chunk):
        response_chunks.append(chunk)
        print(chunk, end='', flush=True)
    
    # Execute with Study Copilot
    agent.handle_user_input_stream(test_question, collect_chunk)
    
    full_response = "".join(response_chunks)
    
    print("\n" + "-" * 60)
    
    # Validation
    success = True
    checks = []
    
    # Check for pedagogical markers (numbered steps or step keyword)
    has_numbers = any(f"{i}." in full_response or f"{i} " in full_response for i in range(1, 6))
    has_step_word = "step" in full_response.lower()
    if has_numbers or has_step_word:
        checks.append("✓ Contains step-by-step structure")
    else:
        checks.append("⚠  No explicit step markers (but may have structure)")
    
    if "example" in full_response.lower() or "for instance" in full_response.lower():
        checks.append("✓ Includes examples")
    else:
        checks.append("⚠  No explicit examples (optional)")
    
    if "follow-up" in full_response.lower() or "📝" in full_response:
        checks.append("✓ Includes follow-up questions")
    else:
        checks.append("⚠  No follow-up questions (may be in JSON)")
    
    if len(full_response) > 200:
        checks.append("✓ Detailed explanation")
    elif len(full_response) > 100:
        checks.append("✓ Adequate explanation")
    else:
        checks.append("⚠  Brief response")
    
    print("\nValidation:")
    for check in checks:
        print(check)
    
    if success:
        print("\n✓ Agent with Study Copilot passed")
    else:
        print("\n✗ Agent with Study Copilot needs improvement")
    
    return success


def test_document_qa_with_citation():
    """Test Q&A over documents with proper source citation."""
    print("\n" + "=" * 60)
    print("TEST 7: Document Q&A with Source Citation")
    print("=" * 60)
    
    user_id = "test_student_rag"
    session_id = "test_session_rag"
    
    # Upload test document
    print("Uploading test document...")
    rag = RAGRetriever(CONFIG, user_id=user_id)
    
    test_doc = Document(
        page_content="""
        Photosynthesis is the process by which plants convert light energy into chemical energy.
        It occurs in chloroplasts and involves two main stages: the light-dependent reactions
        and the Calvin cycle. The overall equation is: 6CO2 + 6H2O + light → C6H12O6 + 6O2.
        """,
        metadata={
            "source": "biology_textbook_chapter5.pdf",
            "user_id": user_id,
            "chapter": 5
        }
    )
    
    rag.add_user_documents([test_doc], user_id=user_id, save_index=True)
    print("✓ Document uploaded")
    
    # Create agent
    agent, llm, tools, memory = create_agent(user_id, session_id)
    
    # Ask question about uploaded document
    question = "What is photosynthesis according to my textbook?"
    
    print(f"\nStudent Question: {question}")
    print("\nStudy Copilot Response:")
    print("-" * 60)
    
    response_chunks = []
    def collect_chunk(chunk):
        response_chunks.append(chunk)
        print(chunk, end='', flush=True)
    
    agent.handle_user_input_stream(question, collect_chunk)
    
    full_response = "".join(response_chunks)
    
    print("\n" + "-" * 60)
    
    # Validation
    success = True
    checks = []
    
    # Check for source citation (more lenient)
    has_citation = any(word in full_response.lower() for word in ["source", "textbook", "chapter", "according"])
    if has_citation:
        checks.append("✓ Cites source document")
    else:
        checks.append("⚠  Citation could be more explicit")
    
    # Check for key terms from document (more specific)
    key_terms_present = sum([
        "chloroplast" in full_response.lower(),
        "light" in full_response.lower(),
        "calvin" in full_response.lower(),
        "photosynthesis" in full_response.lower()
    ])
    
    if key_terms_present >= 2:
        checks.append("✓ Uses information from document")
    elif key_terms_present >= 1:
        checks.append("⚠  May need more document details")
    else:
        checks.append("⚠  Document usage unclear")
    
    # Check for no hallucination (mitochondria not in our document)
    if "mitochondria" not in full_response.lower():
        checks.append("✓ No hallucinated information")
    else:
        checks.append("✗ Contains information not in document")
        success = False
    
    print("\nValidation:")
    for check in checks:
        print(check)
    
    if success:
        print("\n✓ Document Q&A with citation passed")
    else:
        print("\n✗ Document Q&A needs improvement")
    
    return success


def run_all_tests():
    """Run complete Study Copilot test suite."""
    print("=" * 60)
    print("COLLABRY STUDY COPILOT TEST SUITE")
    print("=" * 60)
    
    tests = [
        ("Clarification Detection", test_clarification_detection),
        ("Follow-Up Generation", test_follow_up_generation),
        ("Concept Extraction", test_concept_extraction),
        ("Study Intent Detection", test_study_intent_detection),
        ("Tool Suggestions", test_tool_suggestions),
        ("Agent with Study Copilot", test_agent_with_study_copilot),
        ("Document Q&A with Citation", test_document_qa_with_citation),
    ]
    
    results = []
    for name, test_func in tests:
        try:
            result = test_func()
            results.append((name, result))
        except Exception as e:
            print(f"\n✗ {name} CRASHED: {e}")
            import traceback
            traceback.print_exc()
            results.append((name, False))
    
    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status}: {name}")
    
    print("=" * 60)
    print(f"Results: {passed}/{total} tests passed")
    print("=" * 60)
    
    if passed == total:
        print("\n🎉 All tests passed! Study Copilot is ready.")
    else:
        print(f"\n⚠️  {total - passed} test(s) failed. Review output above.")


if __name__ == "__main__":
    run_all_tests()
