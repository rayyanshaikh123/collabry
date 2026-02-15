import { useCallback } from 'react';

interface UseStudioSaveProps {
  notebook: any;
  artifactEdits: Record<string, any>;
  selectedArtifact: any;
  linkArtifact: any; // React Query mutation
  createQuiz: any; // React Query mutation
  generateMindMap: any; // React Query mutation
  createMindMap: any; // React Query mutation
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showWarning: (message: string) => void;
}

export function useStudioSave({
  notebook,
  artifactEdits,
  selectedArtifact,
  linkArtifact,
  createQuiz,
  generateMindMap,
  createMindMap,
  showSuccess,
  showError,
  showWarning,
}: UseStudioSaveProps) {
  const handleSaveQuizToStudio = useCallback(
    async (questions: any[]) => {
      if (!notebook) return;

      try {
        const savedEdits = artifactEdits['action-quiz'] || (selectedArtifact?.data as any) || {};
        const displayCount = savedEdits.numberOfQuestions || questions.length;
        const quizDifficulty = savedEdits.difficulty || 'medium';
        const quizPrompt = savedEdits.prompt || '';

        const quizData = {
          title: `Practice Quiz - ${displayCount} Questions`,
          description: quizPrompt || 'Generated from study session',
          sourceType: 'ai',
          subject: notebook.subject || null, // Use notebook's subject if available, otherwise null
          questions: questions.map((q, index) => {
            const options = Array.isArray(q.options)
              ? q.options
              : Array.isArray(q.choices)
                ? q.choices
                : [];

            let correctAnswerText = '';
            if (typeof q.correctAnswer === 'number') {
              correctAnswerText = options[q.correctAnswer] ?? '';
            } else if (typeof q.correctAnswer === 'string') {
              if (options.includes(q.correctAnswer)) {
                correctAnswerText = q.correctAnswer;
              } else {
                const letter = q.correctAnswer.trim().toUpperCase();
                if (/^[A-Z]$/.test(letter)) {
                  const idx = letter.charCodeAt(0) - 65;
                  correctAnswerText = options[idx] ?? q.correctAnswer ?? '';
                } else {
                  correctAnswerText = q.answer ?? q.correctAnswer ?? '';
                }
              }
            } else if (q.answer && typeof q.answer === 'string') {
              correctAnswerText = q.answer;
            }

            if (!correctAnswerText && options.length > 0) {
              correctAnswerText = options[0];
            }

            return {
              question: q.question || 'Question',
              options: options.length >= 2 ? options : ['Option 1', 'Option 2'],
              correctAnswer: correctAnswerText || (options[0] || 'Option 1'),
              explanation: q.explanation || '',
              difficulty: (q.difficulty as any) || quizDifficulty,
              points: 1,
              order: index,
            };
          }),
          settings: {
            shuffleQuestions: false,
            shuffleOptions: false,
            showCorrectAnswers: true,
            allowRetake: true,
          },
        };

        const createdQuiz = await createQuiz.mutateAsync(quizData);

        await linkArtifact.mutateAsync({
          type: 'quiz',
          referenceId: createdQuiz._id,
          title: quizData.title,
          data: {
            questions: quizData.questions,
            settings: quizData.settings,
          },
        });

        showSuccess('Quiz saved to Studio successfully!');
      } catch (error) {
        console.error('Failed to save quiz:', error);
        showError('Failed to save quiz to Studio');
      }
    },
    [notebook, artifactEdits, selectedArtifact, createQuiz, linkArtifact, showSuccess, showError]
  );

  const handleSaveMindMapToStudio = useCallback(
    async (mindmap: any) => {
      if (!notebook || !('title' in notebook)) return;

      try {
        console.log('Rendering mindmap before save...', mindmap);
        const renderMindmapModule = await import('@/lib/mindmapClient');
        const renderMindmap = renderMindmapModule.default;

        let svgBase64 = null;
        let mermaidCode = null;

        try {
          const renderResult = await renderMindmap(mindmap, 'both');
          svgBase64 = (renderResult as any).svg_base64;
          mermaidCode = renderResult.mermaid;
          console.log('Mindmap rendered successfully:', {
            hasSvg: !!svgBase64,
            hasMermaid: !!mermaidCode,
            svgLength: svgBase64?.length,
            result: renderResult,
          });
        } catch (renderError) {
          console.error('Failed to render mindmap:', renderError);
          const errorMsg = renderError instanceof Error ? renderError.message : String(renderError);
          console.error('Render error details:', errorMsg);
          showWarning(`Could not render mindmap image: ${errorMsg}. Saving structure only.`);
        }

        const result = await createMindMap.mutateAsync({
          title: `Mind Map - ${notebook.title}`,
          topic: `${notebook.title} - Study Notes`,
          nodes: mindmap.nodes.map((n: any, idx: number) => ({
            ...n,
            id: n.id || `node_${idx}`
          })),
          edges: mindmap.edges.map((e: any, idx: number) => ({
            ...e,
            id: e.id || `edge_${e.from || idx}_${e.to || idx}_${idx}`
          })),
          subject: (notebook.subject as any) || null,
        });

        const savedId =
          (result && (result.savedMapId || (result as any)._id || (result as any).data?._id)) || null;

        if (savedId) {
          const finalSvgBase64 =
            svgBase64 || (result as any)?.svgBase64 || (result as any)?.data?.svgBase64;
          const finalMermaidCode =
            mermaidCode || (result as any)?.mermaidCode || (result as any)?.data?.mermaidCode;

          console.log('Saving mindmap with data:', {
            hasNodes: !!mindmap.nodes,
            hasSvg: !!finalSvgBase64,
            hasMermaid: !!finalMermaidCode,
          });

          await linkArtifact.mutateAsync({
            type: 'mindmap',
            referenceId: savedId,
            title: `Mind Map - ${notebook.title}`,
            data: {
              nodes: mindmap.nodes,
              edges: mindmap.edges,
              svgBase64: finalSvgBase64,
              mermaidCode: finalMermaidCode,
            },
          });
          showSuccess('Mind map saved to Studio successfully!');
        } else {
          showWarning('Mind map generated but could not be saved. Please try again.');
        }
      } catch (error) {
        console.error('Failed to save mindmap:', error);
        showError('Failed to save mindmap to Studio');
      }
    },
    [notebook, createMindMap, linkArtifact, showSuccess, showError, showWarning]
  );

  const handleSaveInfographicToStudio = useCallback(
    async (infographic: any) => {
      if (!notebook || !('title' in notebook)) return;

      try {
        await linkArtifact.mutateAsync({
          type: 'infographic',
          referenceId: `infographic-${Date.now()}`,
          title: infographic.title || `Infographic - ${notebook.title}`,
          data: infographic,
        });

        showSuccess('Infographic saved to Studio successfully!');
      } catch (error) {
        console.error('Failed to save infographic:', error);
        showError('Failed to save infographic to Studio');
      }
    },
    [notebook, linkArtifact, showSuccess, showError]
  );

  const handleSaveFlashcardsToStudio = useCallback(
    async (flashcardSet: any) => {
      if (!notebook || !('title' in notebook)) return;

      try {
        await linkArtifact.mutateAsync({
          type: 'flashcards',
          referenceId: `flashcards-${Date.now()}`,
          title: flashcardSet.title || `Flashcards - ${notebook.title}`,
          data: flashcardSet,
        });

        showSuccess('Flashcards saved to Studio successfully!');
      } catch (error) {
        console.error('Failed to save flashcards:', error);
        showError('Failed to save flashcards to Studio');
      }
    },
    [notebook, linkArtifact, showSuccess, showError]
  );

  const handleSaveCourseFinderToStudio = useCallback(
    async (courses: any[]) => {
      if (!notebook || !('title' in notebook)) return;

      try {
        await linkArtifact.mutateAsync({
          type: 'course-finder',
          referenceId: `courses-${Date.now()}`,
          title: `Course Recommendations - ${notebook.title}`,
          data: { courses },
        });

        showSuccess('Courses saved to Studio successfully!');
      } catch (error) {
        console.error('Failed to save courses:', error);
        showError('Failed to save courses to Studio');
      }
    },
    [notebook, linkArtifact, showSuccess, showError]
  );

  return {
    handleSaveQuizToStudio,
    handleSaveMindMapToStudio,
    handleSaveInfographicToStudio,
    handleSaveFlashcardsToStudio,
    handleSaveCourseFinderToStudio,
  };
}
