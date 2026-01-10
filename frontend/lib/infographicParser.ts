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
  id: string;
  title: string;
  icon: string;
  stats?: InfographicStat[];
  keyPoints?: string[];
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
  
  // Remove trailing commas before } or ]
  cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
  
  // Remove comments
  cleaned = cleaned.replace(/\/\/.*$/gm, '');
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
  
  // Remove any text after the closing brace
  const lastBrace = cleaned.lastIndexOf('}');
  if (lastBrace > 0) {
    cleaned = cleaned.substring(0, lastBrace + 1);
  }
  
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
  
  // Find the first { and match balanced braces
  const firstBrace = cleanText.indexOf('{');
  if (firstBrace === -1) return null;
  
  let braceCount = 0;
  let jsonEnd = -1;
  
  for (let i = firstBrace; i < cleanText.length; i++) {
    if (cleanText[i] === '{') braceCount++;
    if (cleanText[i] === '}') {
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
 * Validate infographic data structure
 */
function isValidInfographicData(data: any): data is InfographicData {
  if (!data || typeof data !== 'object') return false;
  
  // Must have title and sections array
  if (!data.title || !Array.isArray(data.sections)) return false;
  
  // Sections must have required fields
  if (data.sections.length === 0) return false;
  
  for (const section of data.sections) {
    if (!section.title || !section.icon) return false;
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
  const jsonMatch = text.match(/\{[\s\S]*"title"[\s\S]*"sections"[\s\S]*\}/);
  return jsonMatch !== null;
}
