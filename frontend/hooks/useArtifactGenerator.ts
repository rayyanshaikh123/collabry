import { useCallback } from 'react';

type ArtifactType = 'quiz' | 'mindmap' | 'flashcards' | 'reports' | 'infographic' | 'course-finder';

interface UseArtifactGeneratorProps {
  notebook: any;
  artifactEdits: Record<string, any>;
  editModalOpen: boolean;
  editingArtifactId: string | null;
  editPrompt: string;
  editNumber: number;
  editDifficulty: string;
  setIsGenerating: (value: boolean) => void;
  setGeneratingType?: (type: ArtifactType | null) => void;
  handleSendMessage: (message: string) => Promise<void>;
  handleArtifactRequest?: (payload: {
    artifact: 'quiz' | 'flashcards' | 'mindmap' | 'summary';
    topic: string;
    params?: Record<string, any>;
  }) => Promise<void>;
  showWarning: (message: string) => void;
  showError: (message: string) => void;
  showInfo: (message: string) => void;
}

export function useArtifactGenerator({
  notebook,
  artifactEdits,
  editModalOpen,
  editingArtifactId,
  editPrompt,
  editNumber,
  editDifficulty,
  setIsGenerating,
  setGeneratingType,
  handleSendMessage,
  handleArtifactRequest,
  showWarning,
  showError,
  showInfo,
}: UseArtifactGeneratorProps) {
  const handleGenerateArtifact = useCallback(
    async (type: ArtifactType) => {
      if (!notebook) return;

      const selectedSources = notebook.sources.filter((s: any) => s.selected);
      if (selectedSources.length === 0) {
        showWarning('Please select at least one source to generate artifacts.');
        return;
      }

      setIsGenerating(true);
      if (setGeneratingType) setGeneratingType(type);

      try {
        const topics = selectedSources
          .map((s: any) => s.name.replace(/\.(pdf|txt|md)$/i, ''))
          .join(', ');

        if (type === 'course-finder') {
        // Legacy behavior for course finder (no structured artifact request yet)
          const lines: string[] = [];
          lines.push('[COURSE_FINDER_REQUEST]');
          lines.push('');
          lines.push(`Topic: ${topics}`);
          lines.push('');
          lines.push('You MUST call the tool `search_web` before answering. Do not use memory.');
          lines.push('');
          lines.push('Return ONLY valid JSON (no markdown, no code fences):');
          lines.push('{"tool": null, "answer": "<COURSE_LIST>"}');
          lines.push('');
          lines.push('Where <COURSE_LIST> is 5-8 lines. EACH line MUST be exactly:');
          lines.push('- [Course Title](https://direct.course.url) - Platform: X | Rating: X.X/5 | Price: $X');
          lines.push('');
          lines.push('Rules:');
          lines.push('- Use direct course pages (not search result pages)');
          lines.push('- If rating/price missing, write "Not provided"');
          lines.push('- No extra commentary; JSON only');

        const message = lines.join('\n');

        await handleSendMessage(message);
          setIsGenerating(false);
          if (setGeneratingType) setGeneratingType(null);
          return;
        }

        if (type === 'flashcards') {
        if (handleArtifactRequest) {
          await handleArtifactRequest({
            artifact: 'flashcards',
            topic: topics,
          });
        } else {
          // Fallback to legacy prompt-based behavior if structured routing is not wired
          const message = `Create flashcards for: ${topics}
          
Return ONLY valid JSON (no markdown, no code fences):
{
  "title": "Flashcards: ${topics}",
  "cards": [
    {"id":"card-1","front":"...","back":"...","category":"Basics"}
  ]
}

Rules:
- Exactly 15 cards
- front: short question/term (<= 120 chars)
- back: 1-3 concise sentences
- category: one of Basics, Definitions, Processes, Applications, Pitfalls
- Use only info implied by the selected sources
- JSON only (no extra text)`;

          await handleSendMessage(message);
        }
          setIsGenerating(false);
          if (setGeneratingType) setGeneratingType(null);
          return;
        }

        if (type === 'quiz') {
          const persistedEdits = artifactEdits['action-quiz'] || {};
          const liveEdits =
            editModalOpen && editingArtifactId === 'action-quiz'
              ? { prompt: editPrompt, numberOfQuestions: editNumber, difficulty: editDifficulty }
              : {};
          const actionEdits = { ...persistedEdits, ...liveEdits };
          const numQuestions = actionEdits.numberOfQuestions ?? 5;
          const difficulty = actionEdits.difficulty || 'medium';
          const originalPrompt = (actionEdits.prompt || '').trim();

          if (handleArtifactRequest) {
            await handleArtifactRequest({
              artifact: 'quiz',
              topic: topics,
              params: {
                prompt: originalPrompt,
                numberOfQuestions: numQuestions,
                difficulty,
              },
            });
          } else {
            // Fallback to legacy prompt-based behavior if structured routing is not wired
            const DEFAULT_QUIZ_PROMPT = 'Create a practice quiz with exactly 5 multiple choice questions about:';
            const effectivePrompt =
              originalPrompt.length > 0 ? originalPrompt : DEFAULT_QUIZ_PROMPT;

            const message = `###QUIZ_GENERATION_REQUEST###

${effectivePrompt} ${topics}

Return ONLY valid JSON (no markdown, no code fences):
[
  {
    "question": "...",
    "options": ["A...", "B...", "C...", "D..."],
    "correctAnswer": 0,
    "explanation": "..."
  }
]

Rules:
- Exactly ${numQuestions} questions
- Exactly 4 options per question
- correctAnswer is an integer 0-3 (index into options)
- difficulty: ${difficulty} (use it to tune question depth)
- Explanations must be 1-2 sentences
- JSON only`;

            await handleSendMessage(message);
          }
          setIsGenerating(false);
          if (setGeneratingType) setGeneratingType(null);
          return;
        }

        if (type === 'mindmap') {
          if (handleArtifactRequest) {
            await handleArtifactRequest({
              artifact: 'mindmap',
              topic: topics,
            });
          } else {
            const message = `Create a mind map for: ${topics}

Return ONLY valid JSON (no markdown, no code fences):
{
  "nodes": [
    {"id":"root","label":"${topics}","level":0},
    {"id":"node-1","label":"...","level":1}
  ],
  "edges": [
    {"from":"root","to":"node-1"}
  ]
}

Rules:
- 12-20 nodes
- 2-3 levels deep
- Every edge must reference existing node ids
- Short labels (2-6 words)
- JSON only`;

            await handleSendMessage(message);
          }
          setIsGenerating(false);
          if (setGeneratingType) setGeneratingType(null);
          return;
        }

        if (type === 'reports') {
          if (handleArtifactRequest) {
            await handleArtifactRequest({
              artifact: 'summary',
              topic: topics,
            });
          } else {
            const message = `Generate a comprehensive study report for: ${topics}

Analyze the selected source materials and create a structured report with the following sections:

1. Executive Summary (2-3 paragraphs)
2. Key Concepts (5-10 main concepts with explanations)
3. Learning Objectives (What should be mastered)
4. Detailed Analysis (Deep dive into important topics)
5. Practical Applications (Real-world use cases)
6. Study Recommendations (How to learn this effectively)
7. Assessment Criteria (What to focus on for testing)
8. Additional Resources (Recommended readings/videos)

Format in clear markdown with headers and bullet points.
Do not include JSON.
No preamble; output the report only.`;

            await handleSendMessage(message);
          }
          setIsGenerating(false);
          if (setGeneratingType) setGeneratingType(null);
          return;
        }

        if (type === 'infographic') {
          const message = `Create an infographic JSON for: ${topics}

Return ONLY valid JSON (no markdown, no code fences):
{
  "title": "${topics}",
  "subtitle": "...",
  "sections": [
    {
      "id": "section-1",
      "title": "...",
      "icon": "📌",
      "keyPoints": ["...", "..."],
      "stats": [{"label": "...", "value": "..."}]
    }
  ],
  "conclusion": "..."
}

Rules:
- 3-5 sections
- keyPoints: 3-5 bullets per section
- stats: 0-3 items per section (only if supported by sources)
- JSON only`;

          await handleSendMessage(message);
          setIsGenerating(false);
          if (setGeneratingType) setGeneratingType(null);
          return;
        }

        showInfo(`${type} generation coming soon!`);
      } catch (error) {
        console.error('Failed to generate artifact:', error);
        showError('Failed to generate artifact. Please try again.');
      } finally {
        setIsGenerating(false);
        if (setGeneratingType) setGeneratingType(null);
      }
    },
    [
      notebook,
      artifactEdits,
      editModalOpen,
      editingArtifactId,
      editPrompt,
      editNumber,
      editDifficulty,
      setIsGenerating,
      handleSendMessage,
      showWarning,
      showError,
      showInfo,
    ]
  );

  return { handleGenerateArtifact };
}
