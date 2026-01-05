"""
Study Copilot FastAPI Routes Test

Tests all FastAPI routes with Study Copilot behavior.
Shows detailed inputs and outputs for each endpoint.

Prerequisites:
- Server running at http://localhost:8000
- MongoDB and Ollama services running

Usage:
    python test_study_copilot_routes.py
"""
import requests
import json
import time
from datetime import datetime, timedelta, timezone
from jose import jwt
from config import CONFIG

# Server configuration
BASE_URL = "http://localhost:8000"
TEST_USER_ID = "study_student_456"
JWT_SECRET = CONFIG["jwt_secret_key"]
JWT_ALGORITHM = CONFIG["jwt_algorithm"]


def create_test_jwt(user_id: str = TEST_USER_ID, exp_minutes: int = 60) -> str:
    """Create a test JWT token."""
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=exp_minutes),
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def print_section(title: str):
    """Print a section header."""
    print("\n" + "=" * 80)
    print(f"  {title}")
    print("=" * 80)


def print_subsection(title: str):
    """Print a subsection."""
    print("\n" + "-" * 80)
    print(f"  {title}")
    print("-" * 80)


def test_chat_study_question():
    """Test chat endpoint with a study question."""
    print_section("TEST 1: Chat - Study Question (Pythagorean Theorem)")
    
    token = create_test_jwt()
    headers = {"Authorization": f"Bearer {token}"}
    
    payload = {
        "message": "Explain the Pythagorean theorem to me",
        "stream": False
    }
    
    print_subsection("INPUT")
    print(f"User: {TEST_USER_ID}")
    print(f"Message: {payload['message']}")
    
    response = requests.post(f"{BASE_URL}/ai/chat", headers=headers, json=payload)
    
    print_subsection("OUTPUT")
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"\nSession ID: {data.get('session_id', 'N/A')}")
        print(f"Response Type: {data.get('type', 'N/A')}")
        print(f"\nAI Response:")
        print("-" * 80)
        print(data.get('response', 'No response'))
        print("-" * 80)
        
        # Check for Study Copilot features
        response_text = data.get('response', '')
        features = []
        if '1.' in response_text or 'step' in response_text.lower():
            features.append("✓ Step-by-step explanation")
        if 'example' in response_text.lower() or 'for instance' in response_text.lower():
            features.append("✓ Examples/Analogies")
        if '📝' in response_text or 'follow-up' in response_text.lower():
            features.append("✓ Follow-up questions")
        if '💡' in response_text:
            features.append("✓ Learning tip")
        
        if features:
            print("\nStudy Copilot Features Detected:")
            for feature in features:
                print(f"  {feature}")
        
        return True
    else:
        print(f"Error: {response.text}")
        return False


def test_chat_vague_question():
    """Test chat endpoint with a vague question (should ask for clarification)."""
    print_section("TEST 2: Chat - Vague Question (Clarification)")
    
    token = create_test_jwt()
    headers = {"Authorization": f"Bearer {token}"}
    
    payload = {
        "message": "explain it",
        "stream": False
    }
    
    print_subsection("INPUT")
    print(f"User: {TEST_USER_ID}")
    print(f"Message: {payload['message']}")
    print("Note: This is intentionally vague to test clarification detection")
    
    response = requests.post(f"{BASE_URL}/ai/chat", headers=headers, json=payload)
    
    print_subsection("OUTPUT")
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"\nAI Response:")
        print("-" * 80)
        print(data.get('response', 'No response'))
        print("-" * 80)
        
        response_text = data.get('response', '')
        if '🤔' in response_text or 'clarif' in response_text.lower():
            print("\n✓ Clarification requested (as expected)")
        else:
            print("\n⚠  No clarification - might answer directly")
        
        return True
    else:
        print(f"Error: {response.text}")
        return False


def test_document_upload_and_qa():
    """Test document upload and Q&A over documents."""
    print_section("TEST 3: Document Upload + Q&A (Photosynthesis)")
    
    token = create_test_jwt()
    headers = {"Authorization": f"Bearer {token}"}
    
    # Upload document
    print_subsection("STEP 1: Upload Study Document")
    
    upload_payload = {
        "content": """
        Photosynthesis: The Process of Plant Energy Production
        
        Photosynthesis is the biochemical process by which plants, algae, and some bacteria 
        convert light energy (usually from the sun) into chemical energy stored in glucose.
        
        Key Stages:
        1. Light-Dependent Reactions (occur in thylakoid membranes):
           - Chlorophyll absorbs light energy
           - Water molecules are split (photolysis): H2O → H+ + O2
           - Energy is stored in ATP and NADPH
        
        2. Calvin Cycle (occurs in stroma):
           - CO2 is fixed into organic molecules
           - ATP and NADPH are used to reduce CO2
           - Glucose (C6H12O6) is produced
        
        Overall Equation:
        6CO2 + 6H2O + light energy → C6H12O6 + 6O2
        
        Importance:
        - Produces oxygen for aerobic organisms
        - Forms base of food chains
        - Removes CO2 from atmosphere
        """,
        "filename": "photosynthesis_notes.txt",
        "metadata": {
            "subject": "biology",
            "chapter": "cellular_energy",
            "topic": "photosynthesis"
        }
    }
    
    print(f"Uploading document: {upload_payload['filename']}")
    print(f"Content length: {len(upload_payload['content'])} characters")
    
    upload_response = requests.post(
        f"{BASE_URL}/ai/upload",
        headers=headers,
        json=upload_payload
    )
    
    print(f"Upload Status: {upload_response.status_code}")
    
    if upload_response.status_code == 200:
        upload_data = upload_response.json()
        task_id = upload_data.get('task_id')
        print(f"Task ID: {task_id}")
        print(f"Status: {upload_data.get('status')}")
        print("\nWaiting 3 seconds for document processing...")
        time.sleep(3)
    else:
        print(f"Upload failed: {upload_response.text}")
        return False
    
    # Ask question about uploaded document
    print_subsection("STEP 2: Ask Question About Document")
    
    qa_payload = {
        "question": "What happens during the light-dependent reactions?",
        "use_rag": True
    }
    
    print(f"Question: {qa_payload['question']}")
    print(f"Using RAG: {qa_payload['use_rag']}")
    
    qa_response = requests.post(f"{BASE_URL}/ai/qa", headers=headers, json=qa_payload)
    
    print_subsection("OUTPUT")
    print(f"Status Code: {qa_response.status_code}")
    
    if qa_response.status_code == 200:
        qa_data = qa_response.json()
        print(f"\nAI Answer:")
        print("-" * 80)
        print(qa_data.get('answer', 'No answer'))
        print("-" * 80)
        
        sources = qa_data.get('sources', [])
        print(f"\nSources Used: {len(sources)}")
        for i, source in enumerate(sources, 1):
            print(f"  {i}. {source.get('filename', 'Unknown')} (score: {source.get('score', 0):.3f})")
        
        # Check for source citation
        answer_text = qa_data.get('answer', '') or ''
        if 'source' in answer_text.lower() or any(s.get('filename') and s.get('filename') in answer_text for s in sources):
            print("\n✓ Sources cited in answer")
        else:
            print("\n⚠  Source citation could be more explicit")
        
        return True
    else:
        print(f"Error: {qa_response.text}")
        return False


def test_summarization():
    """Test summarization endpoint with study content."""
    print_section("TEST 4: Summarization (Mitosis)")
    
    token = create_test_jwt()
    headers = {"Authorization": f"Bearer {token}"}
    
    payload = {
        "text": """
        Mitosis is the process of cell division that results in two genetically identical daughter cells 
        developing from a single parent cell. It is essential for growth, development, and tissue repair 
        in multicellular organisms.
        
        The process consists of several distinct phases:
        
        Prophase: The chromatin condenses into visible chromosomes, each consisting of two sister chromatids 
        joined at the centromere. The nuclear envelope begins to break down, and the mitotic spindle starts 
        to form from the centrosomes, which move to opposite poles of the cell.
        
        Metaphase: The chromosomes align at the cell's equator, forming the metaphase plate. Spindle fibers 
        attach to the kinetochores of each chromosome. This alignment ensures that each daughter cell will 
        receive an identical set of chromosomes.
        
        Anaphase: The sister chromatids separate and are pulled toward opposite poles of the cell by the 
        shortening of spindle fibers. This is the shortest phase of mitosis but critical for ensuring 
        accurate chromosome distribution.
        
        Telophase: The chromosomes begin to decondense back into chromatin. Nuclear envelopes reform around 
        each set of chromosomes, creating two distinct nuclei. The spindle apparatus disassembles.
        
        Cytokinesis: Although technically separate from mitosis, cytokinesis typically overlaps with 
        telophase. The cytoplasm divides, creating two separate daughter cells. In animal cells, this 
        occurs through the formation of a cleavage furrow, while plant cells form a cell plate.
        
        The entire process is regulated by cyclins and cyclin-dependent kinases (CDKs), which ensure 
        proper timing and coordination of events. Checkpoints exist to verify completion of each phase 
        before progression.
        """,
        "style": "study_guide",
        "max_length": 150
    }
    
    print_subsection("INPUT")
    print(f"Original Text Length: {len(payload['text'])} characters")
    print(f"Summary Style: {payload['style']}")
    print(f"Max Length: {payload['max_length']} words")
    
    response = requests.post(f"{BASE_URL}/ai/summarize", headers=headers, json=payload)
    
    print_subsection("OUTPUT")
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"\nSummary:")
        print("-" * 80)
        print(data.get('summary', 'No summary'))
        print("-" * 80)
        
        summary_text = data.get('summary', '')
        print(f"\nSummary Length: {len(summary_text.split())} words")
        print(f"Original Length: {len(payload['text'].split())} words")
        print(f"Compression Ratio: {len(summary_text.split())/len(payload['text'].split()):.1%}")
        
        return True
    else:
        print(f"Error: {response.text}")
        return False


def test_mindmap_generation():
    """Test mind map generation for a study topic."""
    print_section("TEST 5: Mind Map Generation (Cellular Respiration)")
    
    token = create_test_jwt()
    headers = {"Authorization": f"Bearer {token}"}
    
    payload = {
        "topic": "Cellular Respiration",
        "depth": 3,
        "use_documents": False
    }
    
    print_subsection("INPUT")
    print(f"Topic: {payload['topic']}")
    print(f"Depth: {payload['depth']} levels")
    print(f"Use Documents: {payload['use_documents']}")
    
    response = requests.post(f"{BASE_URL}/ai/mindmap", headers=headers, json=payload)
    
    print_subsection("OUTPUT")
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        
        print(f"\nMind Map Structure:")
        print("-" * 80)
        
        def print_node(node, indent=0):
            """Recursively print mind map nodes."""
            prefix = "  " * indent + ("└─ " if indent > 0 else "")
            print(f"{prefix}{node.get('name', 'Unnamed')}")
            
            # Print description if available
            if node.get('description'):
                desc_prefix = "  " * (indent + 1) + "   "
                desc = node['description'][:100] + "..." if len(node['description']) > 100 else node['description']
                print(f"{desc_prefix}({desc})")
            
            # Print children
            for child in node.get('children', []):
                print_node(child, indent + 1)
        
        root_node = data.get('mindmap', {})
        print_node(root_node)
        print("-" * 80)
        
        # Count nodes
        def count_nodes(node):
            count = 1
            for child in node.get('children', []):
                count += count_nodes(child)
            return count
        
        total_nodes = count_nodes(root_node)
        print(f"\nTotal Nodes: {total_nodes}")
        print(f"Root Topic: {root_node.get('name', 'N/A')}")
        print(f"Direct Subtopics: {len(root_node.get('children', []))}")
        
        return True
    else:
        print(f"Error: {response.text}")
        return False


def test_concept_extraction():
    """Test concept extraction via chat."""
    print_section("TEST 6: Concept Extraction (DNA Structure)")
    
    token = create_test_jwt()
    headers = {"Authorization": f"Bearer {token}"}
    
    payload = {
        "message": "Extract the key concepts from this: DNA (deoxyribonucleic acid) is a molecule composed of two polynucleotide chains that coil around each other to form a double helix. The backbone of each chain is made of alternating sugar (deoxyribose) and phosphate groups. Attached to each sugar is one of four nitrogenous bases: adenine (A), thymine (T), guanine (G), or cytosine (C). The bases pair specifically: A with T, and G with C, held together by hydrogen bonds.",
        "stream": False
    }
    
    print_subsection("INPUT")
    print(f"Message: Extract concepts from DNA structure description")
    print(f"Text Length: ~{len(payload['message'])} characters")
    
    response = requests.post(f"{BASE_URL}/ai/chat", headers=headers, json=payload)
    
    print_subsection("OUTPUT")
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"\nAI Response:")
        print("-" * 80)
        print(data.get('response', 'No response'))
        print("-" * 80)
        
        response_text = data.get('response', '')
        
        # Check if concepts were extracted
        concept_indicators = ['concept', 'definition', 'DNA', 'double helix', 'base pair']
        found_concepts = [ind for ind in concept_indicators if ind.lower() in response_text.lower()]
        
        if len(found_concepts) >= 3:
            print(f"\n✓ Concept extraction detected ({len(found_concepts)} concept indicators found)")
        
        return True
    else:
        print(f"Error: {response.text}")
        return False


def run_all_tests():
    """Run all Study Copilot route tests."""
    print("=" * 80)
    print("  STUDY COPILOT FASTAPI ROUTES - COMPREHENSIVE TEST")
    print("=" * 80)
    print(f"  Server: {BASE_URL}")
    print(f"  Test User: {TEST_USER_ID}")
    print(f"  Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 80)
    
    tests = [
        ("Study Question (Pythagorean)", test_chat_study_question),
        ("Vague Question (Clarification)", test_chat_vague_question),
        ("Document Upload + Q&A", test_document_upload_and_qa),
        ("Summarization", test_summarization),
        ("Mind Map Generation", test_mindmap_generation),
        ("Concept Extraction", test_concept_extraction),
    ]
    
    results = []
    for name, test_func in tests:
        try:
            result = test_func()
            results.append((name, result))
            time.sleep(1)  # Brief pause between tests
        except Exception as e:
            print(f"\n✗ {name} CRASHED: {e}")
            import traceback
            traceback.print_exc()
            results.append((name, False))
    
    # Summary
    print("\n" + "=" * 80)
    print("  TEST SUMMARY")
    print("=" * 80)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"  {status}: {name}")
    
    print("=" * 80)
    print(f"  Results: {passed}/{total} tests passed")
    print("=" * 80)
    
    if passed == total:
        print("\n  🎉 All tests passed! Study Copilot routes working perfectly.")
    else:
        print(f"\n  ⚠️  {total - passed} test(s) failed. Review output above.")


if __name__ == "__main__":
    run_all_tests()
