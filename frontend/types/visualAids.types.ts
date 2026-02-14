/**
 * Visual Learning Aids Type Definitions
 * Matches backend models for flashcards, mind maps, quizzes
 */

// ============= FLASHCARDS =============

export interface Flashcard {
  _id: string;
  setId: string;
  question: string;
  answer: string;
  hint?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  order: number;
  tags: string[];
  timesReviewed: number;
  lastReviewed?: Date;
  confidence: number; // 0-5 scale
  createdAt: Date;
  updatedAt: Date;
}

export interface FlashcardSet {
  _id: string;
  title: string;
  description?: string;
  subject: string; // Subject ID or populated Subject
  createdBy: string;
  sourceType: 'manual' | 'ai_generated' | 'imported';
  sourceContent?: string;
  visibility: 'private' | 'shared' | 'public';
  cardCount: number;
  tags: string[];
  cards?: Flashcard[]; // Virtual populated field
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFlashcardSetRequest {
  title: string;
  description?: string;
  subject: string;
  visibility?: 'private' | 'shared' | 'public';
  tags?: string[];
}

export interface CreateFlashcardRequest {
  question: string;
  answer: string;
  hint?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  tags?: string[];
}

export interface UpdateFlashcardRequest {
  question?: string;
  answer?: string;
  hint?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  tags?: string[];
}

export interface TrackCardStudyRequest {
  correct: boolean;
  confidenceLevel: number; // 0-5
}

// ============= MIND MAPS =============

export interface MindMapNode {
  id: string;
  label: string;
  type: 'root' | 'branch' | 'leaf' | 'concept' | 'example' | 'note';
  position: {
    x: number;
    y: number;
  };
  style?: {
    color?: string;
    backgroundColor?: string;
    fontSize?: number;
    width?: number;
    height?: number;
  };
}

export interface MindMapEdge {
  id: string;
  from: string;
  to: string;
  relation?: string;
  style?: {
    color?: string;
    width?: number;
    type?: 'solid' | 'dashed' | 'dotted';
  };
}

export interface MindMap {
  _id: string;
  title: string;
  topic: string;
  subject: string; // Subject ID
  nodes: MindMapNode[];
  edges: MindMapEdge[];
  createdBy: string;
  version: number;
  parentVersion?: string;
  tags: string[];
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMindMapRequest {
  title: string;
  topic: string;
  subject: string;
  nodes?: MindMapNode[];
  edges?: MindMapEdge[];
  tags?: string[];
}

export interface UpdateMindMapRequest {
  title?: string;
  topic?: string;
  nodes?: MindMapNode[];
  edges?: MindMapEdge[];
  tags?: string[];
}

// ============= QUIZZES =============

export interface QuizQuestion {
  _id: string;
  question: string;
  options: string[];
  correctAnswer: number; // Index of correct option
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
}

export interface Quiz {
  _id: string;
  title: string;
  description?: string;
  subject: string; // Subject ID
  linkedSetId?: string; // Optional flashcard set link
  questions: QuizQuestion[];
  createdBy: string;
  timeLimit?: number; // Minutes
  passingScore: number; // Percentage
  settings: {
    shuffleQuestions: boolean;
    shuffleOptions: boolean;
    showExplanations: boolean;
    allowReview: boolean;
  };
  totalAttempts: number;
  averageScore: number;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  questionCount?: number; // Virtual field
  totalPoints?: number; // Virtual field
}

export interface QuizAttemptAnswer {
  questionId: string;
  userAnswer: number; // Index of selected option
  isCorrect: boolean;
  timeSpent: number; // Seconds
}

export interface QuizAttempt {
  _id: string;
  quizId: string;
  userId: string;
  answers: QuizAttemptAnswer[];
  score: number; // Percentage
  pointsEarned: number;
  pointsPossible: number;
  passed: boolean;
  timeSpent: number; // Seconds
  startedAt: Date;
  completedAt: Date;
  createdAt: Date;
}

export interface CreateQuizRequest {
  title: string;
  description?: string;
  subject: string;
  questions: Omit<QuizQuestion, '_id'>[];
  timeLimit?: number;
  passingScore?: number;
  settings?: {
    shuffleQuestions?: boolean;
    shuffleOptions?: boolean;
    showExplanations?: boolean;
    allowReview?: boolean;
  };
  tags?: string[];
}

export interface SubmitQuizAttemptRequest {
  answers: Array<{
    questionId: string;
    userAnswer: number;
    timeSpent: number;
  }>;
  timeSpent: number;
}

export interface QuizStatistics {
  totalAttempts: number;
  averageScore: number;
  passRate: number;
  questionStats: Array<{
    questionId: string;
    attempts: number;
    correctCount: number;
    successRate: number;
    averageTime: number;
  }>;
}

// ============= SUBJECTS =============

export interface Subject {
  _id: string;
  name: string;
  code: string; // Unique identifier
  description?: string;
  color?: string;
  icon?: string;
  semester?: string;
  credits?: number;
  instructor?: string;
  createdBy: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSubjectRequest {
  name: string;
  code: string;
  description?: string;
  color?: string;
  icon?: string;
  semester?: string;
  credits?: number;
  instructor?: string;
}

// ============= AI GENERATION =============

export interface GenerateFlashcardsRequest {
  content: string;
  topic?: string;
  numberOfCards?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  saveToSet?: boolean;
  setTitle?: string;
  subject?: string;
}

export interface GenerateFlashcardsResponse {
  flashcards: Array<{
    question: string;
    answer: string;
    hint?: string;
    difficulty: string;
  }>;
  savedSetId?: string;
}

export interface GenerateMindMapRequest {
  topic: string;
  depth?: number;
  maxNodes?: number;
  includeExamples?: boolean;
  saveToLibrary?: boolean;
  title?: string;
  subject?: string;
}

export interface GenerateMindMapResponse {
  nodes: MindMapNode[];
  edges: MindMapEdge[];
  savedMapId?: string;
}

export interface GenerateQuizRequest {
  content: string;
  count?: number; // Number of questions to generate
  difficulty?: 'easy' | 'medium' | 'hard';
  save?: boolean; // Whether to save to database
  subjectId?: string; // Subject ID to associate with
  title?: string; // Quiz title if saving
  useRag?: boolean; // Use RAG to retrieve relevant documents (default: true)
  topic?: string; // Topic for RAG filtering
}

export interface GenerateQuizResponse {
  questions: QuizQuestion[];
  savedQuizId?: string;
}

// ============= API RESPONSE WRAPPERS =============

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
  message?: string;
  meta?: {
    total?: number;
    unreadCount?: number;
    [key: string]: any;
  };
}
