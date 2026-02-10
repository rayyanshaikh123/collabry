import { CourseInfo } from '../components/study-notebook/CourseCard';

/**
 * Parses plain text course format (fallback for LLMs that don't follow markdown)
 * Format: "Title Platform: Name | Rating: X/Y | Price: $Z"
 */
function parsePlainTextCourses(text: string): CourseInfo[] {
  const courses: CourseInfo[] = [];
  
  // Split by "Platform:" to find course entries
  const parts = text.split(/(?=Platform:\s*)/);
  
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed || trimmed.length < 10) continue;
    
    // Extract platform
    const platformMatch = trimmed.match(/Platform:\s*([A-Za-z\s]+?)(?:\s*\||$)/);
    if (!platformMatch) continue;
    
    const platform = platformMatch[1].trim();
    
    // Extract title (everything before "Platform:")
    const titleMatch = trimmed.match(/^(.+?)\s+Platform:/);
    const title = titleMatch ? titleMatch[1].trim() : platform;
    
    // Extract rating
    const ratingMatch = trimmed.match(/Rating:\s*(\d+\.?\d*)\s*\/\s*(\d+)/);
    const rating = ratingMatch ? `${ratingMatch[1]}/${ratingMatch[2]}` : undefined;
    
    // Extract price
    const priceMatch = trimmed.match(/Price:\s*(\$?\d+|\bFree\b|\bfree\b)/i);
    const price = priceMatch ? (priceMatch[1].toLowerCase() === 'free' ? 'Free' : priceMatch[1]) : undefined;
    
    // Generate URL based on platform
    let url = '#';
    const platformLower = platform.toLowerCase();
    const titleSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    if (platformLower.includes('udemy')) {
      url = `https://www.udemy.com/course/${titleSlug}`;
    } else if (platformLower.includes('coursera')) {
      url = `https://www.coursera.org/learn/${titleSlug}`;
    } else if (platformLower.includes('edx')) {
      url = `https://www.edx.org/course/${titleSlug}`;
    } else if (platformLower.includes('codecademy')) {
      url = `https://www.codecademy.com/learn/${titleSlug}`;
    } else if (platformLower.includes('pluralsight')) {
      url = `https://www.pluralsight.com/courses/${titleSlug}`;
    } else if (platformLower.includes('linkedin')) {
      url = `https://www.linkedin.com/learning/${titleSlug}`;
    } else if (platformLower.includes('udacity')) {
      url = `https://www.udacity.com/course/${titleSlug}`;
    }
    
    courses.push({
      title,
      url,
      platform,
      rating,
      price,
      description: `Learn about ${title}`
    });
  }
  
  return courses;
}

/**
 * Parses markdown text to extract course information from links
 * Supports formats like:
 * - [Course Title](https://url.com) - Platform: Coursera | Rating: 4.5/5 | Price: $49
 * - [Course Title](https://url.com) by University (Platform)
 * - Standard markdown links with course-related keywords
 */
export function parseCourseLinks(markdownText: string): CourseInfo[] {
  const courses: CourseInfo[] = [];
  
  // Regex to match markdown links: [text](url)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;

  while ((match = linkRegex.exec(markdownText)) !== null) {
    const title = match[1].trim();
    const url = match[2].trim();
    
    // Check if this looks like a course (contains course-related keywords)
    const isCourse = /course|training|tutorial|certification|learn|class|program/i.test(title);
    
    if (!isCourse) continue;

    // Extract additional info from the surrounding context
    const lineStart = markdownText.lastIndexOf('\n', match.index) + 1;
    const lineEnd = markdownText.indexOf('\n', match.index + match[0].length);
    const line = markdownText.substring(lineStart, lineEnd === -1 ? markdownText.length : lineEnd);

    const course: CourseInfo = {
      title,
      url,
    };

    // Extract platform
    const platformMatch = line.match(/(?:by |on |platform:|from )\s*([A-Z][a-zA-Z\s]+?)(?:\s*[\(\|\-]|$)/i);
    if (platformMatch) {
      course.platform = platformMatch[1].trim();
    }

    // Try to extract from URL
    if (!course.platform) {
      if (url.includes('coursera')) course.platform = 'Coursera';
      else if (url.includes('udemy')) course.platform = 'Udemy';
      else if (url.includes('edx')) course.platform = 'edX';
      else if (url.includes('linkedin')) course.platform = 'LinkedIn Learning';
      else if (url.includes('udacity')) course.platform = 'Udacity';
      else if (url.includes('pluralsight')) course.platform = 'Pluralsight';
      else if (url.includes('skillshare')) course.platform = 'Skillshare';
      else if (url.includes('datacamp')) course.platform = 'DataCamp';
      else if (url.includes('youtube')) course.platform = 'YouTube';
    }

    // Extract rating
    const ratingMatch = line.match(/rating[:\s]+(\d+\.?\d*)\s*\/?\s*(\d+)?/i);
    if (ratingMatch) {
      const rating = ratingMatch[1];
      const maxRating = ratingMatch[2] || '5';
      course.rating = `${rating}/${maxRating}`;
    }

    // Extract price
    const priceMatch = line.match(/(?:price|cost)[:\s]+(\$?\d+(?:\.\d{2})?|\bfree\b)/i);
    if (priceMatch) {
      course.price = priceMatch[1].toLowerCase() === 'free' ? 'Free' : priceMatch[1];
    }

    // Extract description from the next line or surrounding text
    const nextLineStart = lineEnd + 1;
    const nextLineEnd = markdownText.indexOf('\n', nextLineStart);
    const nextLine = markdownText.substring(nextLineStart, nextLineEnd === -1 ? markdownText.length : nextLineEnd).trim();
    
    // If next line is not a link and not empty, use it as description
    if (nextLine && !nextLine.match(/^\[.*\]\(.*\)/) && !nextLine.startsWith('#') && nextLine.length < 200) {
      course.description = nextLine;
    }

    courses.push(course);
  }

  return courses;
}

/**
 * Renders markdown text with course cards replacing course links
 */
export function extractCoursesFromMarkdown(markdownText: string): {
  cleanMarkdown: string;
  courses: CourseInfo[];
} {
  // First, try parsing markdown links
  let courses = parseCourseLinks(markdownText);
  
  // If no courses found with markdown links, try plain text parsing
  if (courses.length === 0) {
    courses = parsePlainTextCourses(markdownText);
    
    // If plain text courses found, remove them from the markdown
    if (courses.length > 0) {
      // Remove the plain text course entries
      let cleanMarkdown = markdownText;
      
      // Remove lines containing "Platform: ... | Rating: ... | Price: ..."
      cleanMarkdown = cleanMarkdown.replace(/^.*?Platform:.*?\|.*?\|.*?$/gm, '');
      
      // Clean up multiple consecutive newlines
      cleanMarkdown = cleanMarkdown.replace(/\n{3,}/g, '\n\n').trim();
      
      return { cleanMarkdown, courses };
    }
  }
  
  if (courses.length === 0) {
    return { cleanMarkdown: markdownText, courses: [] };
  }

  // Remove course links from markdown (they'll be rendered as cards instead)
  let cleanMarkdown = markdownText;
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const matches = Array.from(markdownText.matchAll(linkRegex));
  
  // Remove lines that contain course links
  matches.forEach((match) => {
    const title = match[1].trim();
    const isCourse = /course|training|tutorial|certification|learn|class|program/i.test(title);
    
    if (isCourse) {
      // Find the line containing this link
      const lineStart = cleanMarkdown.lastIndexOf('\n', match.index);
      const lineEnd = cleanMarkdown.indexOf('\n', match.index + match[0].length);
      
      if (lineStart !== -1 && lineEnd !== -1) {
        const line = cleanMarkdown.substring(lineStart, lineEnd + 1);
        cleanMarkdown = cleanMarkdown.replace(line, '');
      } else if (lineStart === -1 && lineEnd !== -1) {
        // First line
        const line = cleanMarkdown.substring(0, lineEnd + 1);
        cleanMarkdown = cleanMarkdown.replace(line, '');
      } else if (lineEnd === -1) {
        // Last line
        const line = cleanMarkdown.substring(lineStart);
        cleanMarkdown = cleanMarkdown.replace(line, '');
      }
    }
  });

  // Clean up multiple consecutive newlines
  cleanMarkdown = cleanMarkdown.replace(/\n{3,}/g, '\n\n').trim();

  return { cleanMarkdown, courses };
}
