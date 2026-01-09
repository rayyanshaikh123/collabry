import { QuizQuestion } from '../components/study-notebook/QuizCard';

/**
 * Parses markdown/text to extract quiz questions
 * Supports multiple formats:
 * 
 * Format 1: Question N: What is...?
 * Format 2: 1. Question text?
 * Format 3: What is...? (direct question without prefix)
 * Format 4: Here are X questions: (followed by questions)
 */
export function parseQuizFromText(text: string): QuizQuestion[] {
  const questions: QuizQuestion[] = [];
  
  // Normalize text - remove markdown headers and intro text
  let normalizedText = text;
  
  // Remove common intro phrases
  normalizedText = normalizedText.replace(/^(?:Here (?:is|are) (?:the )?\d+ (?:multiple-?choice )?questions? (?:about|on).*?:?\s*)/i, '');
  normalizedText = normalizedText.replace(/^(?:I['']ll create.*?:?\s*)/i, '');
  normalizedText = normalizedText.replace(/^(?:I hope these.*?\.\s*)/i, '');
  
  // Try multiple parsing strategies
  let blocks: string[] = [];
  
  // Strategy 1: Split by "Question N:" pattern
  const questionPattern = /Question\s+\d+:/gi;
  if (questionPattern.test(normalizedText)) {
    blocks = normalizedText.split(/Question\s+\d+:/i).filter(b => b.trim().length > 0);
    // Skip first block if it's just intro text
    if (blocks.length > 0 && !blocks[0].match(/^[A-D]\)/i)) {
      blocks = blocks.slice(1);
    }
  }
  
  // Strategy 2: Split by numbered list (1. 2. 3.)
  if (blocks.length === 0) {
    const numberedPattern = /(?:^|\n)(\d+)\.\s+/g;
    const numberedMatches = [...normalizedText.matchAll(numberedPattern)];
    if (numberedMatches.length > 0) {
      // Split by numbered pattern
      const splits = normalizedText.split(/(?:^|\n)\d+\.\s+/);
      blocks = splits.filter(b => b.trim().length > 0);
      // Skip first block if it's intro text
      if (blocks.length > 0 && !blocks[0].match(/^[A-D]\)/i)) {
        blocks = blocks.slice(1);
      }
    }
  }
  
  // Strategy 3: Detect question blocks by pattern: Question text? followed by A) B) C) D)
  if (blocks.length === 0) {
    // Look for pattern: question ending with ? followed by A) B) C) D)
    const questionBlockPattern = /([^?]*\?)\s*\n\s*([A-D]\)[^\n]+\n\s*[A-D]\)[^\n]+\n\s*[A-D]\)[^\n]+\n\s*[A-D]\)[^\n]+)/gi;
    const questionMatches = [...normalizedText.matchAll(questionBlockPattern)];
    
    if (questionMatches.length > 0) {
      // Extract each question block
      let lastIndex = 0;
      for (const match of questionMatches) {
        if (match.index !== undefined) {
          // Get text from last match to current match
          const blockStart = lastIndex;
          const blockEnd = match.index + match[0].length;
          const block = normalizedText.substring(blockStart, blockEnd);
          if (block.trim()) {
            blocks.push(block);
          }
          lastIndex = blockEnd;
        }
      }
      // Add remaining text as last block
      if (lastIndex < normalizedText.length) {
        const remaining = normalizedText.substring(lastIndex);
        if (remaining.trim()) {
          blocks.push(remaining);
        }
      }
    }
  }
  
  // Strategy 4: Fallback - split by double newlines and look for question patterns
  if (blocks.length === 0) {
    // Split by double newlines and filter for blocks that look like questions
    const doubleNewlineBlocks = normalizedText.split(/\n\s*\n/);
    blocks = doubleNewlineBlocks.filter(block => {
      // Check if block contains question pattern (ends with ?) and has A) B) C) D) options
      const hasQuestion = /[?？]$/m.test(block.trim());
      const hasOptions = /[A-D]\)/i.test(block);
      return hasQuestion && hasOptions;
    });
  }
  
  // Strategy 5: Last resort - try to extract questions from conversational text
  // Look for patterns like "What is...?" followed by options
  if (blocks.length === 0) {
    // Find all question-option-answer blocks using regex
    // Pattern: Question text ending with ? -> Options (A) B) C) D)) -> Answer: X -> Explanation:
    const questionRegex = /((?:What|Which|How|When|Where|Why|Who|Is|Are|Can|Does|Do|Will|Would|Should)[^?]*[?？])\s*\n?\s*((?:[A-D][\)\.]\s+[^\n]+\s*\n?){4,})\s*\n?\s*(?:Answer:\s*([A-D])[\)\.]?\s*[^\n]*)\s*\n?\s*(?:Explanation:\s*([^\n]+(?:\n(?!\s*(?:What|Which|How|When|Where|Why|Who|Is|Are|Question\s+\d+:|^\d+\.))[^\n]+)*))?/gi;
    
    const matches = [...normalizedText.matchAll(questionRegex)];
    
    for (const match of matches) {
      const questionText = match[1]?.trim();
      const optionsText = match[2]?.trim();
      const answerText = match[3]?.trim();
      const explanationText = match[4]?.trim();
      
      if (questionText && optionsText && answerText) {
        // Extract options
        const optionMatches = [...optionsText.matchAll(/([A-D])[\)\.]\s+([^\n]+)/gi)];
        const extractedOptions: string[] = [];
        for (const optMatch of optionMatches) {
          if (optMatch[2]) {
            extractedOptions.push(optMatch[2].trim());
          }
        }
        
        if (extractedOptions.length >= 2) {
          const answerLetter = answerText.toUpperCase();
          const correctAnswer = answerLetter.charCodeAt(0) - 65;
          
          if (correctAnswer >= 0 && correctAnswer < extractedOptions.length) {
            blocks.push(`${questionText}\n${optionsText}\nAnswer: ${answerText}\nExplanation: ${explanationText || ''}`);
          }
        }
      }
    }
  }
  
  // Parse each block
  for (const block of blocks) {
    const lines = block.trim().split('\n').map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length < 3) continue; // Need at least question + 2 options

    // Find question line (usually first line, or line ending with ?)
    let questionIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].match(/[?？]$/) || lines[i].match(/^(?:What|Which|How|When|Where|Why|Who)/i)) {
        questionIndex = i;
        break;
      }
    }
    
    // Extract question (remove "Question N:" prefix if present)
    let question = lines[questionIndex].replace(/^(?:Question\s+\d+:|^\d+\.\s*)/i, '').trim();
    if (!question) continue;
    
    const options: string[] = [];
    let correctAnswer = 0;
    let explanation = '';
    let collectingExplanation = false;
    let foundAnswer = false;

    // Parse options and answer starting from line after question
    for (let i = questionIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Stop if we hit next question (numbered or "Question N:")
      if (i > questionIndex + 1 && (line.match(/^(?:Question\s+\d+:|^\d+\.\s+)/i) || 
          (line.match(/[?？]$/) && line.match(/^(?:What|Which|How|When|Where|Why|Who)/i)))) {
        break;
      }
      
      // Match options (A), B), C), D) with text - more flexible
      const optionMatch = line.match(/^([A-D])[\)\.]\s*(.+)/i);
      if (optionMatch) {
        options.push(optionMatch[2].trim());
        collectingExplanation = false;
        continue;
      }

      // Match answer - supports multiple formats
      // "Answer: A", "Answer: A)", "Answer: A) Full text", "Answer: B) They are efficient..."
      const answerMatch = line.match(/^Answer:\s*([A-D])[\)\.]?\s*(.*)/i);
      if (answerMatch) {
        const answerLetter = answerMatch[1].toUpperCase();
        correctAnswer = answerLetter.charCodeAt(0) - 65; // Convert A-D to 0-3
        foundAnswer = true;
        collectingExplanation = false;
        // If answer line has explanation text, use it
        if (answerMatch[2] && answerMatch[2].trim()) {
          explanation = answerMatch[2].trim();
        }
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
      if (collectingExplanation && !line.match(/^(?:Question\s+\d+:|Answer:|^\d+\.\s+)/i)) {
        explanation += ' ' + line.trim();
      }
    }

    // Only add if we have valid question, at least 2 options, and found answer
    if (question && options.length >= 2 && foundAnswer) {
      questions.push({
        question: question.replace(/^[?？\s]+|[?？\s]+$/g, ''), // Clean up question marks
        options,
        correctAnswer,
        explanation: explanation.trim() || undefined,
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
  // Check if text contains quiz-like content
  // Look for multiple indicators:
  // 1. "Question N:" pattern
  // 2. Numbered questions (1. 2. 3.)
  // 3. Question ending with ? followed by A) B) C) D) options
  // 4. "Answer:" and "Explanation:" patterns
  const hasQuestionPattern = /(?:Question\s+\d+:|^\d+\.\s+[^?]*[?？]|(?:What|Which|How|When|Where|Why|Who)[^?]*[?？])/i.test(markdownText);
  const hasOptionsPattern = /[A-D][\)\.]\s+/i.test(markdownText);
  const hasAnswerPattern = /Answer:\s*[A-D]/i.test(markdownText);
  
  const hasQuizPattern = hasQuestionPattern && hasOptionsPattern && hasAnswerPattern;
  
  console.log('Quiz detection:', { 
    hasQuestionPattern, 
    hasOptionsPattern, 
    hasAnswerPattern,
    hasQuizPattern,
    textLength: markdownText.length 
  });
  
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
  
  // Try to find and remove the quiz section
  // Look for common intro phrases that indicate quiz start
  const quizStartPatterns = [
    /(?:^|\n)(?:##?\s*(?:Quiz|Practice Questions?|Test Your Knowledge))/i,
    /(?:^|\n)Here (?:is|are)(?: the)? \d+ (?:multiple-?choice )?questions?/i,
    /(?:^|\n)Question\s+1:/i,
    /(?:^|\n)1\.\s+[^?]*[?？]/i, // First numbered question
    /(?:^|\n)(?:What|Which|How|When|Where|Why|Who)[^?]*[?？]\s*\n\s*[A-D][\)\.]/i, // First question with options
  ];
  
  for (const pattern of quizStartPatterns) {
    const match = cleanMarkdown.match(pattern);
    if (match && match.index !== undefined) {
      cleanMarkdown = cleanMarkdown.substring(0, match.index).trim();
      break;
    }
  }
  
  // If still no match, try to find first question pattern and remove from there
  if (cleanMarkdown === markdownText) {
    const firstQuestionMatch = cleanMarkdown.match(/(?:Question\s+\d+:|^\d+\.\s+[^?]*[?？]|(?:What|Which|How|When|Where|Why|Who)[^?]*[?？]\s*\n\s*[A-D][\)\.])/i);
    if (firstQuestionMatch && firstQuestionMatch.index !== undefined) {
      cleanMarkdown = cleanMarkdown.substring(0, firstQuestionMatch.index).trim();
    }
  }

  return { cleanMarkdown, quiz };
}
