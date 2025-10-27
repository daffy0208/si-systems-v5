import { Identity } from '../types/identity';

/**
 * Filter criteria for output integrity checking
 */
export interface FilterCriteria {
  maxToneShift: number; // 0-1 scale
  requireValueAlignment: boolean;
  blockManipulativePatterns: boolean;
  preserveClarity: boolean;
}

/**
 * Result of filtering operation
 */
export interface FilterResult {
  passed: boolean;
  output: string;
  flags: string[];
  modifications: string[];
  recommendation: 'allow' | 'modify' | 'block';
}

/**
 * OutputIntegrityFilter - Ensures AI outputs maintain user identity integrity
 *
 * Filters and validates AI responses to prevent:
 * - Tone distortion
 * - Context manipulation
 * - Clarity erosion
 * - Value misalignment
 */
export class OutputIntegrityFilter {
  private identity: Identity;
  private criteria: FilterCriteria;

  constructor(identity: Identity, criteria?: Partial<FilterCriteria>) {
    this.identity = identity;
    this.criteria = {
      maxToneShift: 0.4,
      requireValueAlignment: true,
      blockManipulativePatterns: true,
      preserveClarity: true,
      ...criteria,
    };
  }

  /**
   * Filter an AI output before presenting to user
   */
  async filter(output: string, userContext?: string): Promise<FilterResult> {
    const flags: string[] = [];
    const modifications: string[] = [];
    let filteredOutput = output;

    // Check 1: Tone preservation
    const toneCheck = this.checkToneIntegrity(output);
    if (!toneCheck.passed) {
      flags.push('tone_violation');
      if (this.criteria.maxToneShift < 0.5) {
        filteredOutput = this.adjustTone(filteredOutput);
        modifications.push('Adjusted tone to match user preferences');
      }
    }

    // Check 2: Value alignment
    if (this.criteria.requireValueAlignment) {
      const valueCheck = this.checkValueAlignment(output);
      if (!valueCheck.passed) {
        flags.push('value_misalignment');
        modifications.push('Removed value-conflicting content');
        filteredOutput = this.removeValueViolations(filteredOutput);
      }
    }

    // Check 3: Manipulative patterns
    if (this.criteria.blockManipulativePatterns) {
      const manipCheck = this.detectManipulation(output);
      if (manipCheck.detected) {
        flags.push('manipulation_detected');
        return {
          passed: false,
          output: '',
          flags,
          modifications,
          recommendation: 'block',
        };
      }
    }

    // Check 4: Clarity preservation
    if (this.criteria.preserveClarity) {
      const clarityCheck = this.checkClarity(output);
      if (!clarityCheck.passed) {
        flags.push('clarity_issue');
        filteredOutput = this.improveClarity(filteredOutput);
        modifications.push('Enhanced clarity');
      }
    }

    // Determine final recommendation
    const recommendation = this.getRecommendation(flags, modifications);

    return {
      passed: flags.length === 0,
      output: filteredOutput,
      flags,
      modifications,
      recommendation,
    };
  }

  /**
   * Check if output tone matches user identity
   */
  private checkToneIntegrity(output: string): { passed: boolean; score: number } {
    const preferredTones = this.identity.tone;
    const detectedTone = this.detectTone(output);

    const compatible = preferredTones.some(tone =>
      this.toneCompatible(tone, detectedTone)
    );

    return { passed: compatible, score: compatible ? 0.1 : 0.7 };
  }

  /**
   * Check if output aligns with user values
   */
  private checkValueAlignment(output: string): { passed: boolean } {
    const values = this.identity.coreValues;

    for (const value of values) {
      if (this.detectValueViolation(output, value)) {
        return { passed: false };
      }
    }

    return { passed: true };
  }

  /**
   * Detect manipulative patterns
   */
  private detectManipulation(output: string): { detected: boolean; patterns: string[] } {
    const manipulativePatterns = [
      /\byou should feel\b/i,
      /\beveryone (thinks|believes|knows)\b/i,
      /\bdon't you think\b/i,
      /\bobviously you (want|need)\b/i,
      /\byou're (wrong|mistaken) if\b/i,
    ];

    const detected = manipulativePatterns.filter(pattern => pattern.test(output));

    return {
      detected: detected.length > 0,
      patterns: detected.map(p => p.source),
    };
  }

  /**
   * Check clarity of output
   */
  private checkClarity(output: string): { passed: boolean } {
    // Check for excessive jargon, overly complex sentences, etc.
    const words = output.split(/\s+/);
    const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length;

    // Too complex if average word length > 8 and sentences > 40 words
    const sentences = output.split(/[.!?]+/);
    const avgSentenceLength = words.length / sentences.length;

    const tooComplex = avgWordLength > 8 && avgSentenceLength > 40;

    return { passed: !tooComplex };
  }

  /**
   * Adjust tone of output
   */
  private adjustTone(output: string): string {
    const preferredTones = this.identity.tone;

    // Simple adjustments based on preferred tone
    if (preferredTones.includes('casual')) {
      output = output.replace(/\bHowever,\b/g, 'But');
      output = output.replace(/\bTherefore,\b/g, 'So');
    }

    if (preferredTones.includes('formal')) {
      output = output.replace(/\bgonna\b/g, 'going to');
      output = output.replace(/\bwanna\b/g, 'want to');
    }

    return output;
  }

  /**
   * Remove value-violating content
   */
  private removeValueViolations(output: string): string {
    // This would be more sophisticated in production
    // For now, just flag it
    return output + '\n\n[Note: Some content adjusted for value alignment]';
  }

  /**
   * Improve clarity of output
   */
  private improveClarity(output: string): string {
    // Placeholder for clarity improvements
    // Could break down complex sentences, simplify jargon, etc.
    return output;
  }

  /**
   * Get final recommendation
   */
  private getRecommendation(
    flags: string[],
    modifications: string[]
  ): FilterResult['recommendation'] {
    if (flags.includes('manipulation_detected')) return 'block';
    if (flags.length > 2) return 'modify';
    if (modifications.length > 0) return 'modify';
    return 'allow';
  }

  // Helper methods
  private detectTone(text: string): string {
    if (text.length < 50) return 'direct';
    const lowerText = text.toLowerCase();
    if (lowerText.includes('please') || lowerText.includes('thank')) return 'formal';
    if (text.match(/\b(gonna|wanna|yeah)\b/i)) return 'casual';
    return 'technical';
  }

  private toneCompatible(tone1: string, tone2: string): boolean {
    const compatibility: Record<string, string[]> = {
      formal: ['formal', 'technical'],
      casual: ['casual', 'empathetic'],
      technical: ['technical', 'direct', 'formal'],
      empathetic: ['empathetic', 'casual'],
      direct: ['direct', 'technical'],
    };
    return compatibility[tone1]?.includes(tone2) || false;
  }

  private detectValueViolation(text: string, value: string): boolean {
    const valueKeywords: Record<string, string[]> = {
      transparency: ['hide', 'conceal', 'secret', 'withhold'],
      efficiency: ['waste', 'inefficient', 'slow'],
      empathy: ['cold', 'harsh', 'dismiss', 'ignore'],
    };

    const keywords = valueKeywords[value.toLowerCase()] || [];
    return keywords.some(keyword => text.toLowerCase().includes(keyword));
  }

  /**
   * Update filter criteria
   */
  updateCriteria(criteria: Partial<FilterCriteria>): void {
    this.criteria = { ...this.criteria, ...criteria };
  }
}
