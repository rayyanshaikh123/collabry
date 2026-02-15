'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button, Badge, Input } from '../components/UIElements';
import { ICONS } from '../constants';
import { 
  useQuizzes,
  useQuiz,
  useMindMaps, 
  useSubjects,
  useGenerateQuiz,
  useGenerateMindMap,
  useCreateSubject,
} from '@/hooks/useVisualAids';
import AlertModal from '../components/AlertModal';
import { useAlert } from '@/hooks/useAlert';
import BoardPickerModal from '../components/study-board/BoardPickerModal';

const Flashcard: React.FC<{ question: string; answer: string }> = ({ question, answer }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div 
      className="relative w-full h-64 perspective-1000 cursor-pointer group"
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <div className={`relative w-full h-full transition-transform duration-700 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
        {/* Front */}
        <div className="absolute inset-0 backface-hidden">
          <Card className="h-full flex flex-col items-center justify-center text-center border-b-8 border-indigo-600 dark:border-indigo-500 shadow-xl p-8 bg-white dark:bg-slate-900 group-hover:shadow-2xl transition-all">
            <Badge variant="indigo" className="absolute top-6 left-6">Question</Badge>
            <h4 className="text-xl font-black text-slate-800 dark:text-slate-200 leading-tight">{question}</h4>
            <p className="mt-8 text-[10px] font-black text-slate-300 dark:text-slate-500 uppercase tracking-widest">Tap to flip 👆</p>
          </Card>
        </div>
        {/* Back */}
        <div className="absolute inset-0 backface-hidden rotate-y-180">
          <Card className="h-full flex flex-col items-center justify-center text-center border-b-8 border-emerald-500 dark:border-emerald-600 shadow-xl p-8 bg-emerald-50 dark:bg-emerald-900/30 group-hover:shadow-2xl transition-all">
            <Badge variant="emerald" className="absolute top-6 left-6">Answer</Badge>
            <h4 className="text-lg font-bold text-slate-700 dark:text-slate-300 leading-relaxed">{answer}</h4>
            <p className="mt-8 text-[10px] font-black text-emerald-300 dark:text-emerald-400 uppercase tracking-widest">Mastered! ✅</p>
          </Card>
        </div>
      </div>
    </div>
  );
};

const VisualAidsView: React.FC = () => {
  const router = useRouter();
  const { alertState, showAlert, hideAlert } = useAlert();
  const [activeTab, setActiveTab] = useState<'quizzes' | 'mindmap' | 'concepts'>('quizzes');
  const [selectedSubject, setSelectedSubject] = useState<string | undefined>();
  const [selectedQuizId, setSelectedQuizId] = useState<string>('');
  const [generateContent, setGenerateContent] = useState<string>('');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [useRag, setUseRag] = useState<boolean>(false); // RAG disabled by default
  const [quizTopic, setQuizTopic] = useState<string>('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [quizTitle, setQuizTitle] = useState<string>('');
  const [quizSubject, setQuizSubject] = useState<string>('');
  const [quizDifficulty, setQuizDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [quizCount, setQuizCount] = useState<number>(5);

  // Board picker state
  const [showBoardPicker, setShowBoardPicker] = useState(false);
  const [pendingBoardData, setPendingBoardData] = useState<{ kind: string; data: unknown; title?: string } | null>(null);

  const openBoardPicker = (payload: { kind: string; data: unknown; title?: string }) => {
    setPendingBoardData(payload);
    setShowBoardPicker(true);
  };

  const handleSelectBoard = (boardId: string) => {
    if (pendingBoardData) {
      sessionStorage.setItem(`board-${boardId}-import`, JSON.stringify(pendingBoardData));
    }
    setShowBoardPicker(false);
    setPendingBoardData(null);
    router.push(`/study-board/${boardId}`);
  };
  
  // Quiz attempt state
  const [activeQuizAttempt, setActiveQuizAttempt] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [quizStartTime, setQuizStartTime] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  // Fetch data from backend (subjects optional)
  const { data: subjects } = useSubjects();
  const { data: quizzes, isLoading: loadingQuizzes } = useQuizzes(selectedSubject);
  const { data: currentQuiz, isLoading: loadingQuiz } = useQuiz(selectedQuizId);
  const { data: mindMaps, isLoading: loadingMaps } = useMindMaps(selectedSubject);
  
  // Mutations
  const generateQuiz = useGenerateQuiz();
  const generateMindMap = useGenerateMindMap();

  const handleGenerateQuiz = async () => {
    if (!generateContent.trim() && !uploadedFile) return;
    
    try {
      // If file is uploaded, send it directly as multipart/form-data
      if (uploadedFile) {
        const formData = new FormData();
        formData.append('file', uploadedFile);
        formData.append('count', quizCount.toString());
        formData.append('difficulty', quizDifficulty);
        formData.append('save', 'true');
        if (quizTitle) formData.append('title', quizTitle);
        const subjectIdValue = quizSubject || selectedSubject;
        if (subjectIdValue) formData.append('subjectId', subjectIdValue);
        if (useRag) formData.append('useRag', 'true');
        if (quizTopic) formData.append('topic', quizTopic);
        
        await generateQuiz.mutateAsync(formData as any);
      } else {
        // Text-based generation
        await generateQuiz.mutateAsync({
          content: generateContent,
          count: quizCount,
          difficulty: quizDifficulty,
          save: true,
          title: quizTitle || undefined,
          subjectId: quizSubject || selectedSubject || undefined,
          useRag: useRag,
          topic: quizTopic || undefined,
        });
      }
      
      console.log('Quiz generated successfully, refetching...');
      setGenerateContent('');
      setQuizTopic('');
      setUploadedFile(null);
      setQuizTitle('');
      setQuizSubject('');
      setQuizDifficulty('medium');
      setQuizCount(5);
      setShowGenerateModal(false);
    } catch (error) {
      console.error('Failed to generate quiz:', error);
    }
  };

  // Display the first quiz by default if available
  const displayQuiz = currentQuiz || (quizzes && quizzes.length > 0 ? quizzes[0] : null);
  const displayQuestions = displayQuiz?.questions || [];

  // Timer effect
  React.useEffect(() => {
    if (activeQuizAttempt && quizStartTime) {
      let isMounted = true;
      const interval = setInterval(() => {
        if (!isMounted) return;
        
        const elapsed = Math.floor((Date.now() - quizStartTime) / 1000);
        const timeLimit = (displayQuiz?.timeLimit || 10) * 60; // Convert to seconds
        const remaining = Math.max(0, timeLimit - elapsed);
        setTimeRemaining(remaining);
        
        if (remaining === 0 && isMounted) {
          handleSubmitQuiz();
        }
      }, 1000);
      
      return () => {
        isMounted = false;
        clearInterval(interval);
      };
    }
  }, [activeQuizAttempt, quizStartTime, displayQuiz?.timeLimit]);

  const handleStartQuiz = (quizId: string) => {
    setActiveQuizAttempt(quizId);
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setQuizStartTime(Date.now());
    const quiz = quizzes?.find(q => q._id === quizId) || displayQuiz;
    setTimeRemaining((quiz?.timeLimit || 10) * 60);
  };

  const handleSelectAnswer = (questionIndex: number, answer: string) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionIndex]: answer
    }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < displayQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmitQuiz = React.useCallback(() => {
    const currentQuiz = quizzes?.find(q => q._id === activeQuizAttempt);
    if (!currentQuiz) return;

    // Calculate score
    let correct = 0;
    currentQuiz.questions.forEach((q, idx) => {
      const userAnswer = q.options.indexOf(selectedAnswers[idx]);
      if (userAnswer === q.correctAnswer) {
        correct++;
      }
    });
    
    const score = Math.round((correct / currentQuiz.questions.length) * 100);
    const timeTaken = ((currentQuiz.timeLimit || 10) * 60) - timeRemaining;
    
    // Show results
    const resultMessage = `Score: ${score}%\nCorrect: ${correct}/${currentQuiz.questions.length}\nTime Taken: ${formatTime(timeTaken)}`;
    
    showAlert({
      type: score >= 70 ? 'success' : 'warning',
      title: '🎉 Quiz Complete!',
      message: resultMessage
    });

    // TODO: Save attempt to backend
    // await api.post(`/api/visual-aids/quizzes/${activeQuizAttempt}/attempt`, {
    //   answers: selectedAnswers,
    //   score,
    //   timeTaken
    // });
    
    setActiveQuizAttempt(null);
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setQuizStartTime(null);
    setTimeRemaining(0);
  }, [quizzes, activeQuizAttempt, selectedAnswers, timeRemaining]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 dark:text-slate-200 tracking-tight">Visual Learning Aids</h2>
          <p className="text-slate-500 dark:text-slate-400 font-bold">Transform complex ideas into simple visual shapes.</p>
        </div>
        <div className="flex bg-white dark:bg-slate-800 p-1.5 rounded-[2rem] border-2 border-slate-100 dark:border-slate-700 shadow-sm">
          <button 
            onClick={() => setActiveTab('quizzes')}
            className={`px-6 py-2.5 rounded-[1.5rem] text-sm font-black transition-all ${activeTab === 'quizzes' ? 'bg-indigo-500 dark:bg-indigo-600 text-white shadow-lg shadow-indigo-100 dark:shadow-indigo-900/50' : 'text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400'}`}
          >
            Quizzes
          </button>
          <button 
            onClick={() => setActiveTab('mindmap')}
            className={`px-6 py-2.5 rounded-[1.5rem] text-sm font-black transition-all ${activeTab === 'mindmap' ? 'bg-indigo-500 dark:bg-indigo-600 text-white shadow-lg shadow-indigo-100 dark:shadow-indigo-900/50' : 'text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400'}`}
          >
            Mind Map
          </button>
          <button 
            onClick={() => setActiveTab('concepts')}
            className={`px-6 py-2.5 rounded-[1.5rem] text-sm font-black transition-all ${activeTab === 'concepts' ? 'bg-indigo-500 dark:bg-indigo-600 text-white shadow-lg shadow-indigo-100 dark:shadow-indigo-900/50' : 'text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400'}`}
          >
            Concept Cards
          </button>
        </div>
      </div>

      {activeTab === 'quizzes' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between px-2">
            <div>
              <h3 className="text-2xl font-black text-slate-800 dark:text-slate-200">
                {displayQuiz?.title || 'Select a Quiz'}
              </h3>
              {displayQuiz?.description && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{displayQuiz.description}</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button 
                variant="primary" 
                size="sm" 
                className="gap-2"
                onClick={() => setShowGenerateModal(true)}
              >
                <ICONS.Sparkles size={16}/> Generate Quiz
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <ICONS.Plus size={16}/> Add Question
              </Button>
            </div>
          </div>
          
          {generateQuiz.isPending ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
              <div className="relative w-48 h-64">
                {/* Jar Container */}
                <div className="absolute inset-0 border-8 border-indigo-300 rounded-b-[3rem] rounded-t-lg bg-gradient-to-b from-indigo-50 to-white overflow-hidden">
                  {/* Filling Animation */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-indigo-500 to-indigo-300 animate-fill" style={{animation: 'fillUp 3s ease-in-out infinite'}}>
                    <div className="absolute inset-0 opacity-30">
                      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/50 to-transparent"></div>
                    </div>
                  </div>
                  {/* Sparkles */}
                  <ICONS.Sparkles className="absolute top-8 left-1/2 -translate-x-1/2 text-yellow-400 animate-bounce" size={32} />
                </div>
                {/* Jar Lid */}
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-40 h-6 bg-amber-200 border-4 border-amber-300 rounded-lg shadow-lg"></div>
              </div>
              <div className="text-center">
                <h4 className="text-xl font-black text-indigo-600 dark:text-indigo-400 mb-2">Brewing Questions ✨</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400">AI is generating your quiz questions...</p>
                <div className="flex justify-center gap-1 mt-4">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                </div>
              </div>
            </div>
          ) : loadingQuizzes || loadingQuiz ? (
            <div className="text-center py-12">
              <p className="text-slate-500 dark:text-slate-400">Loading quizzes...</p>
            </div>
          ) : activeQuizAttempt ? (
            // Quiz Taking Interface
            <div className="space-y-6">
              {/* Timer and Progress */}
              <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{formatTime(timeRemaining)}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-bold">Time Remaining</div>
                  </div>
                  <div className="h-12 w-px bg-slate-200 dark:bg-slate-700" />
                  <div className="text-center">
                    <div className="text-3xl font-black text-slate-800 dark:text-slate-200">{currentQuestionIndex + 1}/{displayQuestions.length}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-bold">Question</div>
                  </div>
                </div>
                <Button variant="outline" onClick={handleSubmitQuiz}>
                  <ICONS.CheckCircle size={16} className="mr-2" />
                  Submit Quiz
                </Button>
              </div>

              {/* Current Question Card */}
              <Card className="p-8 border-2 border-indigo-200">
                <div className="space-y-6">
                  <div className="flex items-start justify-between">
                    <h3 className="text-2xl font-black text-slate-800 dark:text-slate-200 flex-1">
                      {displayQuestions[currentQuestionIndex]?.question}
                    </h3>
                    <Badge variant="indigo">Q{currentQuestionIndex + 1}</Badge>
                  </div>

                  <div className="space-y-3">
                    {displayQuestions[currentQuestionIndex]?.options.map((option, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectAnswer(currentQuestionIndex, option)}
                        className={`w-full p-4 text-left rounded-xl border-2 transition-all font-medium ${
                          selectedAnswers[currentQuestionIndex] === option
                            ? 'border-indigo-500 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-900 dark:text-indigo-200'
                            : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            selectedAnswers[currentQuestionIndex] === option
                              ? 'border-indigo-500 dark:border-indigo-600 bg-indigo-500 dark:bg-indigo-600'
                              : 'border-slate-300 dark:border-slate-600'
                          }`}>
                            {selectedAnswers[currentQuestionIndex] === option && (
                              <div className="w-2 h-2 bg-white dark:bg-slate-200 rounded-full" />
                            )}
                          </div>
                          <span className="text-slate-900 dark:text-slate-200">{option}</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Navigation */}
                  <div className="flex items-center justify-between pt-4 border-t-2 border-slate-100 dark:border-slate-800">
                    <Button
                      variant="outline"
                      onClick={handlePreviousQuestion}
                      disabled={currentQuestionIndex === 0}
                    >
                      <ICONS.ChevronLeft size={16} className="mr-2" />
                      Previous
                    </Button>
                    <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                      {Object.keys(selectedAnswers).length}/{displayQuestions.length} answered
                    </div>
                    {currentQuestionIndex < displayQuestions.length - 1 ? (
                      <Button
                        variant="primary"
                        onClick={handleNextQuestion}
                      >
                        Next
                        <ICONS.ChevronRight size={16} className="ml-2" />
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        onClick={handleSubmitQuiz}
                        disabled={Object.keys(selectedAnswers).length !== displayQuestions.length}
                      >
                        Submit Quiz
                        <ICONS.CheckCircle size={16} className="ml-2" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>

              {/* Question Navigator */}
              <div className="flex flex-wrap gap-2 p-4 bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-100 dark:border-slate-800">
                {displayQuestions.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentQuestionIndex(idx)}
                    className={`w-10 h-10 rounded-lg font-bold transition-all ${
                      idx === currentQuestionIndex
                        ? 'bg-indigo-500 dark:bg-indigo-600 text-white'
                        : selectedAnswers[idx]
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-2 border-emerald-300 dark:border-emerald-800'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
            </div>
          ) : quizzes && quizzes.length > 0 ? (
            // Quiz Cards List
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {quizzes.map((quiz) => (
                <Card key={quiz._id} hoverable className="p-6 border-2 border-slate-100 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-xl font-black text-slate-800 dark:text-slate-200 mb-1">{quiz.title}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{quiz.description}</p>
                      </div>
                      <Badge variant="indigo">{quiz.questions?.length || 0}Q</Badge>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-1">
                        <ICONS.Clock size={14} />
                        <span>{quiz.timeLimit} min</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ICONS.Target size={14} />
                        <span>{quiz.questions?.[0]?.difficulty || 'Medium'}</span>
                      </div>
                    </div>

                    <Button
                      variant="primary"
                      className="w-full"
                      onClick={() => {
                        setSelectedQuizId(quiz._id);
                        handleStartQuiz(quiz._id);
                      }}
                    >
                      <ICONS.Play size={16} className="mr-2" />
                      Start Quiz
                    </Button>
                  </div>
                </Card>
              ))}
              
              {/* Generate More Button */}
              <div
                className="cursor-pointer"
                onClick={() => setShowGenerateModal(true)}
              >
                <Card
                  hoverable
                  className="p-6 border-2 border-dashed border-indigo-300 dark:border-indigo-700 hover:border-indigo-500 dark:hover:border-indigo-600 transition-all flex items-center justify-center"
                >
                  <div className="text-center">
                    <ICONS.Plus size={32} className="mx-auto text-indigo-500 dark:text-indigo-400 mb-2" />
                    <p className="font-bold text-indigo-600 dark:text-indigo-400">Generate New Quiz</p>
                  </div>
                </Card>
              </div>
            </div>
          ) : displayQuestions.length > 0 ? (
            <div className="space-y-4">
              {displayQuestions.slice(0, 3).map((question, idx) => (
                <Card key={question._id || idx} className="p-6 border-l-4 border-indigo-500 dark:border-indigo-600">
                  <div className="flex items-start gap-4">
                    <Badge variant="indigo" className="mt-1">{idx + 1}</Badge>
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">{question.question}</h4>
                      <div className="space-y-2">
                        {question.options.map((option, optIdx) => (
                          <div 
                            key={optIdx}
                            className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                              optIdx === question.correctAnswer 
                                ? 'border-emerald-500 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-900/30' 
                                : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700'
                            }`}
                          >
                            <span className="font-medium text-slate-900 dark:text-slate-200">{option}</span>
                          </div>
                        ))}
                      </div>
                      {question.explanation && (
                        <p className="mt-4 text-sm text-slate-600 dark:text-slate-300 bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg">
                          <strong>Explanation:</strong> {question.explanation}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
              
              {/* Generate More Button */}
              <div className="flex justify-center pt-4">
                <Button 
                  variant="outline" 
                  className="gap-2"
                  onClick={() => setShowGenerateModal(true)}
                >
                  <ICONS.Plus size={16}/> Generate More Quizzes
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-slate-500 dark:text-slate-400">No quizzes yet. Generate your first quiz!</p>
              <Button 
                variant="primary" 
                className="mt-4 gap-2"
                onClick={() => setShowGenerateModal(true)}
              >
                <ICONS.Sparkles size={16}/> Generate Quiz
              </Button>
            </div>
          )}

          {/* Generate Quiz Modal */}
          {showGenerateModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <Card className="max-w-2xl w-full m-4 p-8">
                <h3 className="text-2xl font-black text-slate-800 mb-4">Generate Quiz from Content</h3>
                <p className="text-sm text-slate-500 mb-6">Upload a file or paste text content to generate quiz questions</p>
                
                {/* Quiz Configuration */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Quiz Title (Optional)
                    </label>
                    <Input
                      placeholder="e.g., Chapter 5 Review"
                      value={quizTitle}
                      onChange={(e) => setQuizTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Subject (Optional)
                    </label>
                    <select
                      className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none text-sm"
                      value={quizSubject}
                      onChange={(e) => setQuizSubject(e.target.value)}
                    >
                      <option value="">No Subject</option>
                      {subjects?.map((subject) => (
                        <option key={subject._id} value={subject._id}>
                          {subject.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Difficulty
                    </label>
                    <select
                      className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none text-sm"
                      value={quizDifficulty}
                      onChange={(e) => setQuizDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Number of Questions
                    </label>
                    <Input
                      type="number"
                      min="1"
                      max="20"
                      value={quizCount}
                      onChange={(e) => setQuizCount(parseInt(e.target.value) || 5)}
                    />
                  </div>
                </div>
                
                {/* File Upload */}
                <div className="mb-4">
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Upload File (PDF, TXT, DOCX)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      accept=".pdf,.txt,.md,.doc,.docx"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setUploadedFile(file);
                          setGenerateContent(''); // Clear textarea when file is uploaded
                        }
                      }}
                      className="flex-1 text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    />
                    {uploadedFile && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setUploadedFile(null)}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  {uploadedFile && (
                    <p className="mt-2 text-sm text-emerald-600 font-medium">
                      ✓ {uploadedFile.name} selected
                    </p>
                  )}
                </div>

                {/* OR Divider */}
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-xs font-bold text-slate-400">OR</span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>

                {/* Text Input */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Paste Text Content
                  </label>
                  <textarea
                    className="w-full h-48 p-4 border-2 border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none"
                    placeholder="Paste your study content here... (lecture notes, textbook excerpt, etc.)"
                    value={generateContent}
                    onChange={(e) => {
                      setGenerateContent(e.target.value);
                      if (e.target.value.trim()) {
                        setUploadedFile(null); // Clear file when text is entered
                      }
                    }}
                    disabled={!!uploadedFile}
                  />
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowGenerateModal(false);
                      setGenerateContent('');
                      setUploadedFile(null);
                      setQuizTitle('');
                      setQuizSubject('');
                      setQuizDifficulty('medium');
                      setQuizCount(5);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="primary"
                    onClick={handleGenerateQuiz}
                    disabled={(!generateContent.trim() && !uploadedFile) || generateQuiz.isPending}
                  >
                    {generateQuiz.isPending ? 'Generating...' : 'Generate Quiz'}
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {activeTab === 'mindmap' && (
        <div className="space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-2xl font-black text-slate-800">Knowledge Network</h3>
            <Button 
              variant="primary" 
              size="sm" 
              className="gap-2"
              onClick={() => {
                generateMindMap.mutate({
                  topic: 'Sample Topic',
                  saveToLibrary: true,
                });
              }}
              disabled={generateMindMap.isPending}
            >
              <ICONS.Sparkles size={16}/> 
              {generateMindMap.isPending ? 'Generating...' : 'Auto-Generate'}
            </Button>
          </div>
          
          {loadingMaps ? (
            <div className="text-center py-12">
              <p className="text-slate-500">Loading mind maps...</p>
            </div>
          ) : mindMaps && mindMaps.length > 0 ? (
            <div className="whiteboard-grid bg-white h-[600px] rounded-[3rem] border-4 border-slate-100 relative overflow-hidden flex items-center justify-center p-12 shadow-inner">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500 rounded-full flex items-center justify-center text-white text-center p-6 shadow-2xl border-8 border-white z-10">
                <span className="font-black text-2xl">{mindMaps[0].title}</span>
              </div>
              
              {/* Render actual nodes from backend */}
              {mindMaps[0].nodes.slice(0, 3).map((node, idx) => {
                const positions = [
                  { top: '5rem', left: '10rem' },
                  { bottom: '5rem', left: '15rem' },
                  { top: '8rem', right: '10rem' },
                ];
                return (
                  <div 
                    key={node.id}
                    className={`absolute w-40 h-40 bg-rose-100 border-4 border-rose-200 rounded-[2rem] flex items-center justify-center text-rose-700 font-bold shadow-lg`}
                    style={positions[idx] || {}}
                  >
                    {node.label}
                  </div>
                );
              })}
              
              <svg className="absolute inset-0 pointer-events-none opacity-20">
                <line x1="50%" y1="50%" x2="25%" y2="25%" stroke="#818cf8" strokeWidth="8" strokeLinecap="round" strokeDasharray="12 12" />
                <line x1="50%" y1="50%" x2="75%" y2="30%" stroke="#818cf8" strokeWidth="8" strokeLinecap="round" strokeDasharray="12 12" />
                <line x1="50%" y1="50%" x2="35%" y2="80%" stroke="#818cf8" strokeWidth="8" strokeLinecap="round" strokeDasharray="12 12" />
              </svg>

              <div className="absolute bottom-8 right-8 flex gap-2">
                 <Button
                   variant="secondary"
                   size="icon"
                   title="Send to Study Board"
                   onClick={() => openBoardPicker({
                     kind: 'mindmap',
                     data: mindMaps[0],
                     title: mindMaps[0].title,
                   })}
                 >
                   <ICONS.Share size={20}/>
                 </Button>
                 <Button variant="secondary" size="icon"><ICONS.Pointer size={20}/></Button>
                 <Button variant="secondary" size="icon"><ICONS.Plus size={20}/></Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-slate-500">No mind maps yet. Generate your first one!</p>
              <Button 
                variant="primary" 
                className="mt-4 gap-2"
                onClick={() => {
                  generateMindMap.mutate({
                    topic: 'Getting Started',
                    saveToLibrary: true,
                  });
                }}
              >
                <ICONS.Sparkles size={16}/> Generate Mind Map
              </Button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'concepts' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-2xl font-black text-slate-800">Visual Encyclopedia</h3>
            <Input placeholder="Filter by subject..." className="max-w-xs" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card hoverable className="p-0 border-b-8 border-indigo-100">
               <div className="h-48 bg-indigo-500 rounded-t-[1.8rem] flex items-center justify-center text-white overflow-hidden relative">
                  <div className="absolute inset-0 opacity-10 whiteboard-grid" />
                  {/* Fixed: Changed ICONS.BookOpen to ICONS.Book */}
                  <ICONS.Book size={64} strokeWidth={1} />
               </div>
               <div className="p-8 space-y-4">
                  <Badge variant="indigo">Engineering</Badge>
                  <h4 className="text-2xl font-black text-slate-800">Bernoulli's Principle</h4>
                  <p className="text-sm font-medium text-slate-500 leading-relaxed">
                    States that an increase in the speed of a fluid occurs simultaneously with a decrease in static pressure or a decrease in the fluid's potential energy.
                  </p>
                  <Button variant="outline" className="w-full">View Full Diagram</Button>
               </div>
            </Card>

            <Card hoverable className="p-0 border-b-8 border-amber-100">
               <div className="h-48 bg-amber-400 rounded-t-[1.8rem] flex items-center justify-center text-white overflow-hidden relative">
                  <div className="absolute inset-0 opacity-10 whiteboard-grid" />
                  <ICONS.Sparkles size={64} strokeWidth={1} />
               </div>
               <div className="p-8 space-y-4">
                  <Badge variant="amber">Astrophysics</Badge>
                  <h4 className="text-2xl font-black text-slate-800">Event Horizon</h4>
                  <p className="text-sm font-medium text-slate-500 leading-relaxed">
                    The boundary surrounding a black hole beyond which no light or other radiation can escape. The "point of no return" for all matter.
                  </p>
                  <Button variant="outline" className="w-full">Open Simulation</Button>
               </div>
            </Card>
          </div>
        </div>
      )}
      
      <AlertModal
        isOpen={alertState.isOpen}
        onClose={hideAlert}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        confirmText={alertState.confirmText}
      />

      <BoardPickerModal
        isOpen={showBoardPicker}
        onClose={() => { setShowBoardPicker(false); setPendingBoardData(null); }}
        onSelectBoard={handleSelectBoard}
        title={pendingBoardData?.title ? `Send "${pendingBoardData.title}" to Board` : 'Send to Study Board'}
      />
    </div>
  );
};

export default VisualAidsView;

