/**
 * EXAMPLE: Complete Visual Learning Aids Integration Usage
 * This file demonstrates how to use the fully integrated Visual Learning Aids system
 */

import React, { useState } from 'react';
import {
  useFlashcardSets,
  useFlashcardSet,
  useCreateFlashcardSet,
  useAddFlashcard,
  useGenerateFlashcards,
  useSubjects,
  useCreateSubject,
  useMindMaps,
  useCreateMindMap,
  useQuizzes,
  useCreateQuizFromFlashcards,
  useSubmitQuizAttempt,
} from '../src/hooks/useVisualAids';

// ============= Example 1: Create a Subject =============
export function CreateSubjectExample() {
  const createSubject = useCreateSubject();
  const { data: subjects } = useSubjects();

  const handleCreateSubject = () => {
    createSubject.mutate({
      name: 'Introduction to Biology',
      code: 'BIO-101',
      description: 'Fundamentals of biological sciences',
      color: '#10b981', // Green
      icon: '🧬',
      semester: 'Fall 2025',
      credits: 3,
      instructor: 'Dr. Smith',
    }, {
      onSuccess: (newSubject) => {
        console.log('Subject created:', newSubject);
        alert(`Subject "${newSubject.name}" created successfully!`);
      },
      onError: (error) => {
        console.error('Failed to create subject:', error);
        alert('Failed to create subject. Please try again.');
      }
    });
  };

  return (
    <div>
      <h2>Create Subject</h2>
      <button onClick={handleCreateSubject} disabled={createSubject.isPending}>
        {createSubject.isPending ? 'Creating...' : 'Create Biology Subject'}
      </button>
      
      <h3>Existing Subjects:</h3>
      <ul>
        {subjects?.map(subject => (
          <li key={subject._id}>
            {subject.icon} {subject.name} ({subject.code})
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============= Example 2: Create Flashcard Set Manually =============
export function CreateFlashcardSetExample() {
  const { data: subjects } = useSubjects();
  const createSet = useCreateFlashcardSet();
  const [selectedSubject, setSelectedSubject] = useState('');

  const handleCreateSet = () => {
    if (!selectedSubject) {
      alert('Please select a subject first');
      return;
    }

    createSet.mutate({
      title: 'Cell Biology Basics',
      description: 'Important concepts about cell structure and function',
      subject: selectedSubject,
      visibility: 'private',
      tags: ['biology', 'cells', 'fundamentals'],
    }, {
      onSuccess: (newSet) => {
        console.log('Flashcard set created:', newSet);
        alert(`Flashcard set "${newSet.title}" created!`);
      },
    });
  };

  return (
    <div>
      <h2>Create Flashcard Set</h2>
      <select 
        value={selectedSubject} 
        onChange={(e) => setSelectedSubject(e.target.value)}
      >
        <option value="">Select a subject</option>
        {subjects?.map(subject => (
          <option key={subject._id} value={subject._id}>
            {subject.name}
          </option>
        ))}
      </select>
      <button onClick={handleCreateSet} disabled={createSet.isPending}>
        {createSet.isPending ? 'Creating...' : 'Create Flashcard Set'}
      </button>
    </div>
  );
}

// ============= Example 3: Generate Flashcards with AI =============
export function GenerateFlashcardsExample() {
  const { data: subjects } = useSubjects();
  const generateFlashcards = useGenerateFlashcards();
  const [content, setContent] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');

  const handleGenerate = () => {
    if (!content.trim()) {
      alert('Please enter some content to generate flashcards from');
      return;
    }

    generateFlashcards.mutate({
      content,
      topic: 'Auto-generated Topic',
      numberOfCards: 10,
      difficulty: 'medium',
      saveToSet: true,
      setTitle: 'AI Generated Flashcards',
      subject: selectedSubject || undefined,
    }, {
      onSuccess: (response) => {
        console.log('Generated flashcards:', response);
        alert(`Generated ${response.flashcards.length} flashcards!`);
        if (response.savedSetId) {
          alert(`Saved as set ID: ${response.savedSetId}`);
        }
      },
      onError: (error) => {
        console.error('Generation failed:', error);
        alert('Failed to generate flashcards. Please try again.');
      }
    });
  };

  return (
    <div>
      <h2>Generate Flashcards with AI</h2>
      <select 
        value={selectedSubject} 
        onChange={(e) => setSelectedSubject(e.target.value)}
      >
        <option value="">Select a subject (optional)</option>
        {subjects?.map(subject => (
          <option key={subject._id} value={subject._id}>
            {subject.name}
          </option>
        ))}
      </select>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Paste your study content here..."
        rows={10}
        style={{ width: '100%' }}
      />
      <button onClick={handleGenerate} disabled={generateFlashcards.isPending}>
        {generateFlashcards.isPending ? 'Generating...' : 'Generate Flashcards'}
      </button>
    </div>
  );
}

// ============= Example 4: View and Study Flashcards =============
export function StudyFlashcardsExample() {
  const { data: subjects } = useSubjects();
  const [selectedSubject, setSelectedSubject] = useState<string | undefined>();
  const { data: flashcardSets, isLoading } = useFlashcardSets(selectedSubject);
  const [selectedSetId, setSelectedSetId] = useState('');
  const { data: currentSet } = useFlashcardSet(selectedSetId);

  if (isLoading) return <div>Loading flashcard sets...</div>;

  return (
    <div>
      <h2>Study Flashcards</h2>
      
      {/* Subject Filter */}
      <select 
        value={selectedSubject || ''} 
        onChange={(e) => setSelectedSubject(e.target.value || undefined)}
      >
        <option value="">All Subjects</option>
        {subjects?.map(subject => (
          <option key={subject._id} value={subject._id}>
            {subject.name}
          </option>
        ))}
      </select>

      {/* Flashcard Sets List */}
      <h3>Your Flashcard Sets:</h3>
      <div>
        {flashcardSets?.map(set => (
          <div key={set._id} style={{ border: '1px solid #ccc', padding: '10px', margin: '10px' }}>
            <h4>{set.title}</h4>
            <p>{set.description}</p>
            <p>Cards: {set.cardCount}</p>
            <p>Tags: {set.tags.join(', ')}</p>
            <button onClick={() => setSelectedSetId(set._id)}>
              Study this set
            </button>
          </div>
        ))}
      </div>

      {/* Selected Set Details */}
      {currentSet && (
        <div>
          <h3>Studying: {currentSet.title}</h3>
          <div>
            {currentSet.cards?.map(card => (
              <div key={card._id} style={{ border: '1px solid #00f', padding: '10px', margin: '10px' }}>
                <p><strong>Q:</strong> {card.question}</p>
                <p><strong>A:</strong> {card.answer}</p>
                <p>Difficulty: {card.difficulty}</p>
                <p>Confidence: {card.confidence}/5</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============= Example 5: Create Quiz from Flashcards =============
export function CreateQuizFromFlashcardsExample() {
  const { data: flashcardSets } = useFlashcardSets();
  const createQuiz = useCreateQuizFromFlashcards();
  const [selectedSetId, setSelectedSetId] = useState('');

  const handleCreateQuiz = () => {
    if (!selectedSetId) {
      alert('Please select a flashcard set');
      return;
    }

    createQuiz.mutate({
      setId: selectedSetId,
      data: {
        quizTitle: 'Auto-generated Quiz',
        numberOfQuestions: 10,
        includeHints: true,
      }
    }, {
      onSuccess: (quiz) => {
        console.log('Quiz created:', quiz);
        alert(`Quiz "${quiz.title}" created with ${quiz.questionCount} questions!`);
      },
    });
  };

  return (
    <div>
      <h2>Create Quiz from Flashcards</h2>
      <select 
        value={selectedSetId} 
        onChange={(e) => setSelectedSetId(e.target.value)}
      >
        <option value="">Select a flashcard set</option>
        {flashcardSets?.map(set => (
          <option key={set._id} value={set._id}>
            {set.title} ({set.cardCount} cards)
          </option>
        ))}
      </select>
      <button onClick={handleCreateQuiz} disabled={createQuiz.isPending}>
        {createQuiz.isPending ? 'Creating...' : 'Create Quiz'}
      </button>
    </div>
  );
}

// ============= Example 6: Take a Quiz =============
export function TakeQuizExample() {
  const { data: subjects } = useSubjects();
  const [selectedSubject, setSelectedSubject] = useState<string | undefined>();
  const { data: quizzes } = useQuizzes(selectedSubject);
  const [selectedQuizId, setSelectedQuizId] = useState('');
  const { data: quiz } = useQuiz(selectedQuizId);
  const submitAttempt = useSubmitQuizAttempt(selectedQuizId);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [startTime] = useState(Date.now());

  const handleSubmit = () => {
    if (!quiz) return;

    const formattedAnswers = quiz.questions.map(q => ({
      questionId: q._id,
      userAnswer: answers[q._id] ?? 0,
      timeSpent: 30, // Could track per question
    }));

    const totalTime = Math.floor((Date.now() - startTime) / 1000);

    submitAttempt.mutate({
      answers: formattedAnswers,
      timeSpent: totalTime,
    }, {
      onSuccess: (attempt) => {
        alert(`Quiz completed! Score: ${attempt.score}%`);
        if (attempt.passed) {
          alert('Congratulations! You passed! 🎉');
        }
      },
    });
  };

  return (
    <div>
      <h2>Take a Quiz</h2>
      
      {/* Subject Filter */}
      <select 
        value={selectedSubject || ''} 
        onChange={(e) => setSelectedSubject(e.target.value || undefined)}
      >
        <option value="">All Subjects</option>
        {subjects?.map(subject => (
          <option key={subject._id} value={subject._id}>
            {subject.name}
          </option>
        ))}
      </select>

      {/* Quiz Selection */}
      <select 
        value={selectedQuizId} 
        onChange={(e) => setSelectedQuizId(e.target.value)}
      >
        <option value="">Select a quiz</option>
        {quizzes?.map(q => (
          <option key={q._id} value={q._id}>
            {q.title} ({q.questionCount} questions)
          </option>
        ))}
      </select>

      {/* Quiz Questions */}
      {quiz && (
        <div>
          <h3>{quiz.title}</h3>
          <p>{quiz.description}</p>
          <p>Passing Score: {quiz.passingScore}%</p>
          {quiz.timeLimit && <p>Time Limit: {quiz.timeLimit} minutes</p>}

          {quiz.questions.map((question, idx) => (
            <div key={question._id} style={{ border: '1px solid #000', padding: '10px', margin: '10px' }}>
              <p><strong>Question {idx + 1}:</strong> {question.question}</p>
              <div>
                {question.options.map((option, optIdx) => (
                  <label key={optIdx} style={{ display: 'block' }}>
                    <input
                      type="radio"
                      name={question._id}
                      value={optIdx}
                      checked={answers[question._id] === optIdx}
                      onChange={() => setAnswers(prev => ({ ...prev, [question._id]: optIdx }))}
                    />
                    {option}
                  </label>
                ))}
              </div>
              <p>Points: {question.points}</p>
            </div>
          ))}

          <button onClick={handleSubmit} disabled={submitAttempt.isPending}>
            {submitAttempt.isPending ? 'Submitting...' : 'Submit Quiz'}
          </button>
        </div>
      )}
    </div>
  );
}

// ============= Example 7: Create Mind Map =============
export function CreateMindMapExample() {
  const { data: subjects } = useSubjects();
  const createMindMap = useCreateMindMap();
  const [selectedSubject, setSelectedSubject] = useState('');

  const handleCreate = () => {
    if (!selectedSubject) {
      alert('Please select a subject');
      return;
    }

    createMindMap.mutate({
      title: 'Biology Concepts',
      topic: 'Cell Biology Overview',
      subject: selectedSubject,
      nodes: [
        {
          id: 'root',
          label: 'Cell Biology',
          type: 'root',
          position: { x: 0, y: 0 },
        },
        {
          id: 'node1',
          label: 'Cell Structure',
          type: 'branch',
          position: { x: -200, y: 100 },
        },
        {
          id: 'node2',
          label: 'Cell Function',
          type: 'branch',
          position: { x: 200, y: 100 },
        },
      ],
      edges: [
        { id: 'edge1', from: 'root', to: 'node1' },
        { id: 'edge2', from: 'root', to: 'node2' },
      ],
      tags: ['biology', 'cells'],
    }, {
      onSuccess: (mindMap) => {
        alert(`Mind map "${mindMap.title}" created!`);
      },
    });
  };

  return (
    <div>
      <h2>Create Mind Map</h2>
      <select 
        value={selectedSubject} 
        onChange={(e) => setSelectedSubject(e.target.value)}
      >
        <option value="">Select a subject</option>
        {subjects?.map(subject => (
          <option key={subject._id} value={subject._id}>
            {subject.name}
          </option>
        ))}
      </select>
      <button onClick={handleCreate} disabled={createMindMap.isPending}>
        {createMindMap.isPending ? 'Creating...' : 'Create Mind Map'}
      </button>
    </div>
  );
}

// ============= Example 8: Complete Workflow =============
export function CompleteWorkflowExample() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Visual Learning Aids - Complete Integration Demo</h1>
      
      <section style={{ marginBottom: '40px' }}>
        <CreateSubjectExample />
      </section>

      <section style={{ marginBottom: '40px' }}>
        <GenerateFlashcardsExample />
      </section>

      <section style={{ marginBottom: '40px' }}>
        <StudyFlashcardsExample />
      </section>

      <section style={{ marginBottom: '40px' }}>
        <CreateQuizFromFlashcardsExample />
      </section>

      <section style={{ marginBottom: '40px' }}>
        <TakeQuizExample />
      </section>

      <section style={{ marginBottom: '40px' }}>
        <CreateMindMapExample />
      </section>
    </div>
  );
}

// Note: Import useQuiz that was missing above
import { useQuiz } from '../src/hooks/useVisualAids';
