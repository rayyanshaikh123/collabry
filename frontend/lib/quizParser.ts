import { QuizQuestion } from '../components/study-notebook/QuizCard';

/**
 * Converts legacy text format to JSON if needed
 */
function convertLegacyToJSON(text: string): string | null {
  // Check if it's already JSON
  if (text.trim().startsWith('[')) {
    return null; // Already JSON, no conversion needed
  }

  console.log('🔄 Attempting legacy text to JSON conversion...');

  // Try to extract questions in "Question N:" or "N." format
  const questions: any[] = [];

  // Split by question number patterns - handle both formats
  // Use positive lookahead to keep the delimiter
  const parts = text.split(/(?=\d+\.\s+[A-Z])/gm);

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed || trimmed.length < 20) continue;

    console.log('Processing block:', trimmed.substring(0, 100) + '...');

    // Extract question (everything before first "A)")
    const questionMatch = trimmed.match(/^\d+\.\s+(.+?)(?=\nA\))/s);
    if (!questionMatch) {
      console.log('No question found in block');
      continue;
    }

    const question = questionMatch[1].trim();

    // Extract options (lines with A), B), C), D)) - but NOT from Answer: line
    const options: string[] = [];
    // Split by "Answer:" to avoid matching the answer line as an option
    const beforeAnswer = trimmed.split(/\nAnswer:/)[0];
    const optionRegex = /([A-D])\)\s*(.+?)(?=\n[A-D]\)|$)/gs;
    let match;

    while ((match = optionRegex.exec(beforeAnswer)) !== null) {
      const optionText = match[2].trim();
      if (optionText) {
        options.push(optionText);
      }
    }

    // Extract answer
    const answerMatch = trimmed.match(/Answer:\s*([A-D])\)/i);
    if (!answerMatch) {
      console.log('No answer found in block');
      continue;
    }

    const correctAnswer = answerMatch[1].toUpperCase().charCodeAt(0) - 65;

    // Extract explanation
    const explanationMatch = trimmed.match(/Explanation:\s*(.+?)(?=\n\d+\.|$)/s);
    const explanation = explanationMatch ? explanationMatch[1].trim() : '';

    if (question && options.length === 4) {
      questions.push({
        question,
        options,
        correctAnswer,
        explanation: explanation || `The correct answer is ${answerMatch[1]}.`
      });

      console.log('✅ Converted question:', {
        question: question.substring(0, 50) + '...',
        optionCount: options.length,
        correctAnswer
      });
    } else {
      console.log('❌ Invalid question structure:', {
        hasQuestion: !!question,
        optionCount: options.length
      });
    }
  }

  if (questions.length > 0) {
    console.log('🎉 Successfully converted legacy format to JSON:', {
      questionCount: questions.length
    });
    return JSON.stringify(questions);
  }

  console.log('❌ No questions could be converted from legacy format');
  return null;
}

/**
 * Extracts quiz JSON from AI response
 * Expects JSON array: [{"question": "", "options": [], "correctAnswer": 0, "explanation": ""}]
 */
export function extractQuizJSON(text: string): QuizQuestion[] | null {
  try {
    // Try legacy conversion first
    const converted = convertLegacyToJSON(text);
    if (converted) {
      text = converted;
    }

    // Remove markdown code blocks if present
    let cleaned = text.trim();
    cleaned = cleaned.replace(/^```json?\s*/i, '');
    cleaned = cleaned.replace(/^```\s*/i, '');
    cleaned = cleaned.replace(/```\s*$/i, '');

    // Remove explicit intent markers like [QUIZ_GENERATION_REQUEST]
    cleaned = cleaned.replace(/^\[[A-Z_]+_REQUEST\]\s*/i, '');

    // Find the first [ and match balanced brackets
    const firstBracket = cleaned.indexOf('[');
    if (firstBracket === -1) return null;

    let bracketCount = 0;
    let jsonEnd = -1;

    for (let i = firstBracket; i < cleaned.length; i++) {
      if (cleaned[i] === '[') bracketCount++;
      if (cleaned[i] === ']') {
        bracketCount--;
        if (bracketCount === 0) {
          jsonEnd = i + 1;
          break;
        }
      }
    }

    if (jsonEnd === -1) return null;

    const jsonText = cleaned.substring(firstBracket, jsonEnd);
    const parsed = JSON.parse(jsonText);

    // Validate structure
    if (!Array.isArray(parsed)) return null;
    if (parsed.length === 0) return null;

    // Validate first item has required fields
    const first = parsed[0];
    if (!first.question || !Array.isArray(first.options) || typeof first.correctAnswer !== 'number') {
      return null;
    }

    console.log('✅ Quiz JSON parsed successfully:', {
      questionCount: parsed.length,
      firstQuestion: first.question.substring(0, 50) + '...'
    });

    return parsed as QuizQuestion[];
  } catch (e) {
    console.log('Failed to parse quiz JSON:', e);
    return null;
  }
}

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
  let normalizedText = text.trim();

  // Remove quiz titles/headers (e.g., "Arrays and Data Structures Quiz")
  normalizedText = normalizedText.replace(/^.*?\bQuiz\b\s*\n+/i, '');
  normalizedText = normalizedText.replace(/^#+.*?\bQuiz\b.*?\n+/gim, '');

  // Remove subtitle/description lines (e.g., "Test your knowledge on...")
  normalizedText = normalizedText.replace(/^Test your knowledge.*?\n+/i, '');
  normalizedText = normalizedText.replace(/^This quiz.*?\n+/i, '');
  normalizedText = normalizedText.replace(/^Answer (?:the following|these).*?\n+/i, '');

  // Remove common intro phrases
  normalizedText = normalizedText.replace(/^(?:Here (?:is|are) (?:the )?\d+ (?:multiple-?choice )?questions? (?:about|on).*?:?\s*)/i, '');
  normalizedText = normalizedText.replace(/^(?:I['']ll create.*?:?\s*)/i, '');
  normalizedText = normalizedText.replace(/^(?:I hope these.*?\.\s*)/i, '');

  normalizedText = normalizedText.trim();

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
    if (numberedMatches.length >= 2) {  // Need at least 2 questions
      // Split by numbered pattern
      const splits = normalizedText.split(/(?:^|\n)\d+\.\s+/);
      blocks = splits.filter(b => b.trim().length > 0);

      // Skip first block if it doesn't look like a question (no options or answer)
      if (blocks.length > 0) {
        const firstBlock = blocks[0];
        const hasOptions = /[A-D][\)\.]\s+/i.test(firstBlock);
        const hasAnswer = /Answer:\s*[A-D]/i.test(firstBlock);
        if (!hasOptions && !hasAnswer) {
          blocks = blocks.slice(1);
        }
      }

      console.log('Strategy 2 - Numbered questions:', {
        matchCount: numberedMatches.length,
        blocksFound: blocks.length,
        firstBlockPreview: blocks[0]?.substring(0, 100)
      });
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
      // Also handle "Correct Answer: A", "Answer is A", etc.
      const answerMatch = line.match(/^(?:Correct\s+)?Answer(?:\s+is)?:\s*([A-D])[\)\.,]?\s*(.*)/i);
      if (answerMatch) {
        const answerLetter = answerMatch[1].toUpperCase();
        correctAnswer = answerLetter.charCodeAt(0) - 65; // Convert A-D to 0-3
        foundAnswer = true;
        collectingExplanation = false;
        // If answer line has explanation text after the letter, use it
        if (answerMatch[2] && answerMatch[2].trim()) {
          const explanationText = answerMatch[2].trim();
          // Remove the option text if it's repeated (e.g., "Answer: C) O(log n)")
          // Only keep it if it's actual explanation, not just repeating the option
          if (!options.includes(explanationText)) {
            explanation = explanationText;
          }
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
      const quizQuestion = {
        question: question.replace(/^[?？\s]+|[?？\s]+$/g, ''), // Clean up question marks
        options,
        correctAnswer,
        explanation: explanation.trim() || undefined,
      };
      questions.push(quizQuestion);
      console.log('✅ Added quiz question:', {
        questionNum: questions.length,
        question: quizQuestion.question.substring(0, 50) + '...',
        optionCount: options.length,
        correctAnswer: correctAnswer,
        hasExplanation: !!quizQuestion.explanation
      });
    } else {
      console.log('❌ Skipped invalid question:', {
        hasQuestion: !!question,
        optionCount: options.length,
        foundAnswer,
        questionPreview: question?.substring(0, 50)
      });
    }
  }

  console.log('📊 Quiz parsing complete:', {
    totalQuestions: questions.length,
    strategies: blocks.length > 0 ? 'found' : 'none',
    inputLength: text.length
  });

  return questions;
}

/**
 * Extracts quiz questions from markdown and returns clean markdown + quiz
 */
export function extractQuizFromMarkdown(markdownText: string): {
  cleanMarkdown: string;
  quiz: QuizQuestion[] | null;
} {
  // PRIORITY 1: Try JSON format first (structured output from AI)
  // Look for JSON array pattern with quiz structure OR numbered text format
  const hasJSONKeywords = markdownText.includes('"question"') &&
    markdownText.includes('"options"') &&
    markdownText.includes('"correctAnswer"');

  const hasNumberedFormat = /\d+\.\s+[A-Z]/.test(markdownText) &&
    /[A-D]\)\s+/.test(markdownText) &&
    /Answer:\s*[A-D]\)/.test(markdownText);

  if (hasJSONKeywords || hasNumberedFormat) {
    console.log('🎯 Detected quiz format (JSON or numbered text), attempting to parse...');
    const quizJSON = extractQuizJSON(markdownText);

    if (quizJSON && quizJSON.length > 0) {
      // Remove JSON/quiz content from markdown
      let cleanMarkdown = markdownText;

      // Remove the JSON array if present
      const jsonStart = cleanMarkdown.indexOf('[');
      const jsonEnd = cleanMarkdown.lastIndexOf(']') + 1;
      if (jsonStart !== -1 && jsonEnd > jsonStart) {
        cleanMarkdown = cleanMarkdown.substring(0, jsonStart) + cleanMarkdown.substring(jsonEnd);
      } else {
        // For text format, remove from first question to end
        const firstQuestion = cleanMarkdown.match(/\d+\.\s+[A-Z]/);
        if (firstQuestion && firstQuestion.index !== undefined) {
          cleanMarkdown = cleanMarkdown.substring(0, firstQuestion.index);
        }
      }

      // Remove code blocks that might wrap it
      cleanMarkdown = cleanMarkdown.replace(/```json?\s*\n?\s*```/gi, '');
      cleanMarkdown = cleanMarkdown.replace(/```\s*\n?\s*```/g, '');

      // Remove quiz title/markers if present
      cleanMarkdown = cleanMarkdown.replace(/###QUIZ_GENERATOR###/g, '');
      cleanMarkdown = cleanMarkdown.replace(/###END_INSTRUCTION###/g, '');

      cleanMarkdown = cleanMarkdown.trim();

      console.log('✅ Quiz parsed and extracted:', {
        questionCount: quizJSON.length,
        cleanMarkdownLength: cleanMarkdown.length
      });

      return { cleanMarkdown, quiz: quizJSON };
    }
  }

  // PRIORITY 2: Fall back to text parsing (for legacy format or LLM errors)
  console.log('📝 JSON parsing failed or not detected, trying text parsing...');

  // Check if text contains quiz-like content
  // Look for multiple indicators:
  // 1. "Question N:" pattern
  // 2. Numbered questions (1. 2. 3.)
  // 3. Question ending with ? followed by A) B) C) D) options
  // 4. "Answer:" and "Explanation:" patterns
  const hasQuestionPattern = /(?:Question\s+\d+:|^\d+\.\s+[^?]*[?？]|(?:What|Which|How|When|Where|Why|Who)[^?]*[?？])/im.test(markdownText);
  const hasOptionsPattern = /[A-D][\)\.]\s+/i.test(markdownText);
  const hasAnswerPattern = /Answer:\s*[A-D]/i.test(markdownText);

  // Also check for quiz title patterns as a strong indicator
  const hasQuizTitle = /Quiz|Practice Questions?|Test Your Knowledge/i.test(markdownText);

  // More lenient detection - just need questions with options, or quiz title + questions
  const hasQuizPattern = (hasQuestionPattern && hasOptionsPattern) ||
    (hasQuizTitle && hasQuestionPattern) ||
    (hasAnswerPattern && hasOptionsPattern && hasQuestionPattern);

  console.log('Quiz detection:', {
    hasQuestionPattern,
    hasOptionsPattern,
    hasAnswerPattern,
    hasQuizTitle,
    hasQuizPattern,
    textLength: markdownText.length,
    preview: markdownText.substring(0, 200)
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
  // Look for common patterns that indicate quiz start
  const quizStartPatterns = [
    // Quiz title (with or without markdown header)
    /(?:^|\n)#+\s*.*?\bQuiz\b.*?(?=\n)/i,
    /(?:^|\n).*?\bQuiz\b\s*\n/i,
    // Test/Practice header
    /(?:^|\n)#+\s*(?:Practice Questions?|Test Your Knowledge)/i,
    // Common intro phrases
    /(?:^|\n)Here (?:is|are)(?: the)? \d+ (?:multiple-?choice )?questions?/i,
    /(?:^|\n)Test your knowledge/i,
    /(?:^|\n)Answer (?:the following|these) questions/i,
    // First numbered question
    /(?:^|\n)(?:Question\s+)?1[\.\)]\s+[A-Z]/i,
  ];

  let quizStartIndex = -1;
  for (const pattern of quizStartPatterns) {
    const match = cleanMarkdown.match(pattern);
    if (match && match.index !== undefined) {
      quizStartIndex = match.index;
      console.log('Found quiz start with pattern:', pattern, 'at index:', quizStartIndex);
      break;
    }
  }

  if (quizStartIndex >= 0) {
    cleanMarkdown = cleanMarkdown.substring(0, quizStartIndex).trim();
    console.log('Removed quiz section. Clean markdown length:', cleanMarkdown.length);
  } else {
    // If no clear start found, try to find first question and remove from there
    const firstQuestionPattern = /(?:^|\n)(?:Question\s+1:|1\.\s+(?:What|Which|How|When|Where|Why|Who))/i;
    const firstQuestionMatch = cleanMarkdown.match(firstQuestionPattern);
    if (firstQuestionMatch && firstQuestionMatch.index !== undefined) {
      quizStartIndex = firstQuestionMatch.index;
      cleanMarkdown = cleanMarkdown.substring(0, quizStartIndex).trim();
      console.log('Removed quiz from first question. Clean markdown length:', cleanMarkdown.length);
    } else {
      console.warn('Could not find quiz start position, keeping full markdown');
    }
  }

  return { cleanMarkdown, quiz };
}
