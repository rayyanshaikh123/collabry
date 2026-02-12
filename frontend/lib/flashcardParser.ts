/**
 * Flashcard parser - extracts flashcard data from AI responses
 */

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface FlashcardSet {
  title: string;
  cards: Flashcard[];
}

/**
 * Clean JSON string by removing common issues
 */
function cleanJSON(text: string): string {
  let cleaned = text.trim();

  // Remove trailing commas before closing braces/brackets
  cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');

  // Remove comments
  cleaned = cleaned.replace(/\/\/.*/g, '');
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');

  return cleaned;
}

/**
 * Extract JSON from text (handles code blocks, plain JSON, etc.)
 */
function extractJSON(text: string): any | null {
  let cleanText = text.trim();

  // Remove markdown code block markers
  cleanText = cleanText.replace(/^```json?\s*/i, '');
  cleanText = cleanText.replace(/^```\s*/i, '');
  cleanText = cleanText.replace(/```\s*$/i, '');

  // Remove explicit intent markers like [FLASHCARDS_GENERATION_REQUEST]
  cleanText = cleanText.replace(/^\[[A-Z_]+_REQUEST\]\s*/i, '');

  // Find the first { or [ and match balanced braces
  const firstBrace = cleanText.search(/[{\[]/);
  if (firstBrace === -1) return null;

  const openChar = cleanText[firstBrace];
  const closeChar = openChar === '{' ? '}' : ']';

  let braceCount = 0;
  let jsonEnd = -1;

  for (let i = firstBrace; i < cleanText.length; i++) {
    if (cleanText[i] === openChar) braceCount++;
    if (cleanText[i] === closeChar) {
      braceCount--;
      if (braceCount === 0) {
        jsonEnd = i + 1;
        break;
      }
    }
  }

  if (jsonEnd === -1) return null;

  cleanText = cleanText.substring(firstBrace, jsonEnd);

  try {
    const cleaned = cleanJSON(cleanText);
    return JSON.parse(cleaned);
  } catch (e) {
    console.error('Failed to parse JSON:', e);
    return null;
  }
}

/**
 * Validate flashcard set data structure
 */
function isValidFlashcardSet(data: any): data is FlashcardSet {
  if (!data || typeof data !== 'object') return false;

  // Must have title and cards array
  if (typeof data.title !== 'string' || !Array.isArray(data.cards)) {
    return false;
  }

  // Validate at least one card
  if (data.cards.length === 0) return false;

  // Validate first card structure
  const firstCard = data.cards[0];
  if (!firstCard || typeof firstCard !== 'object') return false;
  if (typeof firstCard.front !== 'string' || typeof firstCard.back !== 'string') {
    return false;
  }

  return true;
}

/**
 * Extract flashcards from markdown text with multiple format support
 */
export function extractFlashcardsFromMarkdown(markdown: string): {
  success: boolean;
  data?: FlashcardSet;
  error?: string;
} {
  try {
    // Try JSON format first
    const jsonData = extractJSON(markdown);
    if (jsonData && isValidFlashcardSet(jsonData)) {
      return { success: true, data: jsonData };
    }

    // Try markdown format: "Front: ... / Back: ..."
    const markdownPattern = /(?:^|\n)(?:Card \d+:|Front:)\s*(.+?)\s*(?:\/|Back:)\s*(.+?)(?=\n(?:Card \d+:|Front:)|\n\n|$)/gim;
    const matches = [...markdown.matchAll(markdownPattern)];

    if (matches.length > 0) {
      const cards: Flashcard[] = matches.map((match, index) => ({
        id: `card-${index + 1}`,
        front: match[1].trim(),
        back: match[2].trim(),
      }));

      // Extract title from content or use default
      const titleMatch = markdown.match(/^#\s*(.+?)$/m);
      const title = titleMatch ? titleMatch[1].trim() : 'Flashcard Set';

      return {
        success: true,
        data: { title, cards },
      };
    }

    // Try simple Q&A format
    const qaPattern = /(?:^|\n)(?:Q:|Question \d+:)\s*(.+?)\s*\n(?:A:|Answer:)\s*(.+?)(?=\n(?:Q:|Question)|\n\n|$)/gim;
    const qaMatches = [...markdown.matchAll(qaPattern)];

    if (qaMatches.length > 0) {
      const cards: Flashcard[] = qaMatches.map((match, index) => ({
        id: `card-${index + 1}`,
        front: match[1].trim(),
        back: match[2].trim(),
      }));

      const titleMatch = markdown.match(/^#\s*(.+?)$/m);
      const title = titleMatch ? titleMatch[1].trim() : 'Flashcard Set';

      return {
        success: true,
        data: { title, cards },
      };
    }

    return {
      success: false,
      error: 'No flashcard data found in the expected format',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if text contains flashcard data
 */
export function containsFlashcardData(text: string): boolean {
  // Check for JSON format
  if (text.includes('"cards"') && text.includes('"front"') && text.includes('"back"')) {
    return true;
  }

  // Check for markdown format
  if (text.match(/(?:Front:|Card \d+:).+?(?:Back:|\/)/im)) {
    return true;
  }

  // Check for Q&A format
  if (text.match(/(?:Q:|Question \d+:).+?(?:A:|Answer:)/im)) {
    return true;
  }

  return false;
}
