/**
 * Utility functions for analyzing text and detecting patterns
 * These are placeholder implementations that would be enhanced with NLP/ML
 */

export function analyzeTone(text: string): string {
  // Placeholder - would use sentiment analysis
  if (text.length < 50) return 'direct';
  const lowerText = text.toLowerCase();
  if (lowerText.includes('please') || lowerText.includes('thank')) return 'formal';
  if (text.match(/\b(gonna|wanna|yeah)\b/i)) return 'casual';
  return 'technical';
}

export function analyzeValues(text: string, values: string[]): number {
  // Simple keyword-based violation detection - would be enhanced with semantic analysis
  const valueKeywords: Record<string, string[]> = {
    'transparency': ['hide', 'conceal', 'secret'],
    'efficiency': ['waste', 'inefficient', 'slow'],
    'empathy': ['cold', 'harsh', 'dismiss'],
  };

  let violations = 0;
  for (const value of values) {
    const keywords = valueKeywords[value.toLowerCase()] || [];
    if (keywords.some(keyword => text.toLowerCase().includes(keyword))) {
      violations++;
    }
  }

  return Math.min(violations * 0.3, 1.0);
}

export function analyzeRhythm(text: string): string {
  const wordCount = text.split(/\s+/).length;
  if (wordCount < 30) return 'concise';
  if (wordCount < 100) return 'fast';
  if (wordCount < 200) return 'thoughtful';
  return 'detailed';
}

export function analyzeContext(text: string): string {
  const sentenceCount = text.split(/[.!?]+/).length;
  if (sentenceCount < 3) return 'minimal';
  if (sentenceCount < 7) return 'moderate';
  return 'extensive';
}
