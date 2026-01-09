import { QuizQuestion } from '../components/study-notebook/QuizCard';

/**
 * Parses markdown/text to extract quiz questions
 * Supports formats like:
 * Question 1: What is...?
 * A) Option 1
 * B) Option 2
 * C) Option 3
 * D) Option 4
 * Answer: A) Option 1 text
 * Explanation: ...
 * 
 * OR
 * 
 * 1. Question text?
 * A) Option 1
 * B) Option 2
 * C) Option 3
 * D) Option 4
 * Answer: A
 * Explanation: ...
 */
export function parseQuizFromText(text: string): QuizQuestion[] {
  const questions: QuizQuestion[] = [];
  
  // Split by "Question N:" pattern (looking for Question followed by number and colon)
  const questionPattern = /Question\s+\d+:/gi;
  const matches = [...text.matchAll(questionPattern)];
  
  if (matches.length === 0) {
    // Try alternative pattern with just numbers
    const altPattern = /(?:^|\n)(\d+)\.\s+/g;
    const altMatches = [...text.matchAll(altPattern)];
    
    if (altMatches.length === 0) {
      return questions;
    }
  }
  
  // Split text by Question N: pattern
  const splits = text.split(/Question\s+\d+:/i);
  
  // Skip first split if empty (before first question)
  const blocks = splits[0].trim().length === 0 ? splits.slice(1) : splits;
  
  for (const block of blocks) {
    const lines = block.trim().split('\n').map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length < 2) continue;

    // First line is the question
    const question = lines[0].trim();
    const options: string[] = [];
    let correctAnswer = 0;
    let explanation = '';
    let collectingExplanation = false;

    // Parse options and answer
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Stop if we hit next question
      if (/^Question\s+\d+:/i.test(line)) {
        break;
      }
      
      // Match options (A), B), C), D) with text
      const optionMatch = line.match(/^([A-D])\)\s*(.+)/i);
      if (optionMatch) {
        options.push(optionMatch[2].trim());
        collectingExplanation = false;
        continue;
      }

      // Match answer - supports "Answer: A" or "Answer: A) Full text"
      const answerMatch = line.match(/^Answer:\s*([A-D])\)?/i);
      if (answerMatch) {
        correctAnswer = answerMatch[1].toUpperCase().charCodeAt(0) - 65; // Convert A-D to 0-3
        collectingExplanation = false;
        continue;
      }

      // Match explanation start
      const explanationMatch = line.match(/^Explanation:\s*(.+)/i);
      if (explanationMatch) {
        explanation = explanationMatch[1].trim();
        collectingExplanation = true;
        continue;
      }

      // Continue collecting explanation if we're in explanation mode
      if (collectingExplanation && !line.match(/^(Question|Answer):/i)) {
        explanation += ' ' + line.trim();
      }
    }

    // Only add if we have valid question and at least 2 options
    if (question && options.length >= 2) {
      questions.push({
        question,
        options,
        correctAnswer,
        explanation: explanation || undefined,
      });
    }
  }

  return questions;
}

/**
 * Extracts quiz questions from markdown and returns clean markdown + quiz
 */
export function extractQuizFromMarkdown(markdownText: string): {
  cleanMarkdown: string;
  quiz: QuizQuestion[] | null;
} {
  // Check if text contains quiz-like content (Question N: pattern)
  const hasQuizPattern = /Question\s+\d+:/i.test(markdownText);
  
  console.log('Quiz detection:', { hasQuizPattern, textLength: markdownText.length });
  
  if (!hasQuizPattern) {
    return { cleanMarkdown: markdownText, quiz: null };
  }

  const quiz = parseQuizFromText(markdownText);
  
  console.log('Parsed quiz questions:', quiz.length, quiz);
  
  if (quiz.length === 0) {
    return { cleanMarkdown: markdownText, quiz: null };
  }

  // Remove quiz section from markdown
  let cleanMarkdown = markdownText;
  
  // Try to find and remove the quiz section (everything from first question to end or before a new section)
  const quizStartPattern = /(?:^|\n)(?:##?\s*(?:Quiz|Practice Questions?|Test Your Knowledge)|Here (?:is|are)(?: the)? \d+ (?:questions?|quiz)|Question\s+1:)/i;
  const match = cleanMarkdown.match(quizStartPattern);
  
  if (match && match.index !== undefined) {
    cleanMarkdown = cleanMarkdown.substring(0, match.index).trim();
  } else {
    // If no clear start found, try to remove from first "Question N:" pattern
    const firstQuestionMatch = cleanMarkdown.match(/Question\s+\d+:/i);
    if (firstQuestionMatch && firstQuestionMatch.index !== undefined) {
      cleanMarkdown = cleanMarkdown.substring(0, firstQuestionMatch.index).trim();
    }
  }

  return { cleanMarkdown, quiz };
}
