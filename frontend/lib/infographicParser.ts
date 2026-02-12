/**
 * Parser for extracting infographic JSON from AI responses
 * Supports JSON wrapped in markdown code blocks or plain text
 */

export interface InfographicStat {
  label: string;
  value: string;
  color?: string;
}

export interface InfographicSection {
  // V1 format
  id?: string;
  title: string;
  icon?: string;
  stats?: InfographicStat[];
  keyPoints?: string[];

  // V2 format
  type?: string;
  items?: any[];
  events?: any[];
}

export interface InfographicTimelineItem {
  year: string;
  event: string;
  description: string;
}

export interface InfographicComparison {
  category: string;
  optionA: string;
  optionB: string;
}

export interface InfographicData {
  title: string;
  subtitle?: string;
  sections: InfographicSection[];
  timeline?: InfographicTimelineItem[];
  comparisons?: InfographicComparison[];
  conclusion?: string;
}

/**
 * Clean and fix common JSON issues
 */
function cleanJSON(jsonString: string): string {
  let cleaned = jsonString.trim();

  // Normalize smart quotes
  cleaned = cleaned
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'");

  // Remove trailing commas before } or ]
  cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');

  // Remove comments
  cleaned = cleaned.replace(/\/\/.*$/gm, '');
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');

  // Convert common Pythonisms
  cleaned = cleaned
    .replace(/\bNone\b/g, 'null')
    .replace(/\bTrue\b/g, 'true')
    .replace(/\bFalse\b/g, 'false');

  // Remove any text after the closing brace
  const lastBrace = cleaned.lastIndexOf('}');
  if (lastBrace > 0) {
    cleaned = cleaned.substring(0, lastBrace + 1);
  }

  return cleaned;
}

function repairCommonJsonMistakes(input: string): string {
  let text = input;

  // Quote unquoted keys: { title: "x" } -> { "title": "x" }
  // Only runs for keys that appear after { or ,
  text = text.replace(/([,{]\s*)([A-Za-z_][A-Za-z0-9_]*)(\s*:)/g, '$1"$2"$3');

  // Add missing commas between adjacent objects/arrays in arrays:
  // [ {..} {..} ] -> [ {..}, {..} ]
  text = text.replace(/}\s*{/g, '},{');
  text = text.replace(/]\s*\[/g, '],[');

  // Add missing commas between string literals in arrays: ["a" "b"] -> ["a", "b"]
  text = text.replace(/"\s+"/g, '","');

  // Remove trailing commas again (repairs may introduce)
  text = text.replace(/,(\s*[}\]])/g, '$1');

  return text;
}

function tryParseJson(text: string): any | null {
  const attempts = [text, cleanJSON(text), repairCommonJsonMistakes(cleanJSON(text))];
  for (const attempt of attempts) {
    try {
      return JSON.parse(attempt);
    } catch {
      // try next
    }
  }
  return null;
}

function extractFencedJsonBlock(text: string): string | null {
  // Prefer fenced json blocks; if multiple, pick one that looks like an infographic
  const fenceRe = /```(?:json)?\s*([\s\S]*?)\s*```/gi;
  const blocks: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = fenceRe.exec(text)) !== null) {
    if (match[1]) blocks.push(match[1]);
  }
  if (!blocks.length) return null;

  const preferred = blocks.find((b) => /"title"[\s\S]*"sections"/i.test(b));
  return preferred ?? blocks[0];
}

function extractBalancedObject(text: string): string | null {
  const firstBrace = text.indexOf('{');
  if (firstBrace === -1) return null;

  let braceCount = 0;
  let jsonEnd = -1;
  let inString = false;
  let stringQuote: '"' | "'" | null = null;
  let escaped = false;

  for (let i = firstBrace; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (stringQuote && ch === stringQuote) {
        inString = false;
        stringQuote = null;
      }
      continue;
    }

    if (ch === '"' || ch === "'") {
      inString = true;
      stringQuote = ch as any;
      continue;
    }

    if (ch === '{') braceCount++;
    if (ch === '}') {
      braceCount--;
      if (braceCount === 0) {
        jsonEnd = i + 1;
        break;
      }
    }
  }

  if (jsonEnd === -1) return null;
  return text.substring(firstBrace, jsonEnd);
}

/**
 * Extract JSON from text (handles code blocks, plain JSON, etc.)
 */
function extractJSON(text: string): any | null {
  let raw = text.trim();

  // Remove explicit intent markers like [INFOGRAPHIC_GENERATION_REQUEST]
  raw = raw.replace(/^\[[A-Z_]+_REQUEST\]\s*/i, '');

  // 1) Prefer fenced JSON blocks
  const fenced = extractFencedJsonBlock(raw);
  if (fenced) {
    const parsed = tryParseJson(fenced);
    if (parsed) return parsed;
  }

  // 2) Fallback: extract balanced object from the whole text (string-aware)
  const balanced = extractBalancedObject(raw);
  if (!balanced) return null;

  const parsed = tryParseJson(balanced);
  if (parsed) return parsed;

  // Don't spam console for expected malformed AI JSON
  console.debug('Infographic JSON parse failed');
  return null;
}

/**
 * Validate infographic data structure
 */
function isValidInfographicData(data: any): data is InfographicData {
  if (!data || typeof data !== 'object') return false;

  // Must have title and sections array
  if (!data.title || !Array.isArray(data.sections)) return false;

  // Sections must have required fields
  if (data.sections.length === 0) return false;

  for (const section of data.sections) {
    // Accept both V1 (icon/keyPoints/stats) and V2 (type + items/events)
    if (!section || typeof section !== 'object') return false;
    if (!section.title) return false;
  }

  return true;
}

/**
 * Main function to extract infographic from AI response
 */
export function extractInfographicFromMarkdown(markdownText: string): {
  success: boolean;
  data?: InfographicData;
  error?: string;
} {
  try {
    // Extract JSON from the text
    const jsonData = extractJSON(markdownText);

    if (!jsonData) {
      return {
        success: false,
        error: 'No valid JSON found in response'
      };
    }

    // Validate structure
    if (!isValidInfographicData(jsonData)) {
      return {
        success: false,
        error: 'Invalid infographic data structure'
      };
    }

    return {
      success: true,
      data: jsonData
    };
  } catch (error) {
    console.error('Error parsing infographic:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Check if text contains infographic JSON
 */
export function containsInfographicData(text: string): boolean {
  // Prefer fenced blocks first
  if (/```(?:json)?[\s\S]*?"title"[\s\S]*?"sections"[\s\S]*?```/i.test(text)) return true;
  return /\{[\s\S]*"title"[\s\S]*"sections"[\s\S]*\}/.test(text);
}
