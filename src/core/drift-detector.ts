import { Identity, DriftScore, InteractionContext } from '../types/identity';
import { analyzeTone, analyzeValues, analyzeRhythm, analyzeContext } from '../utils/analyzers';

/**
 * DriftDetector - Core module for detecting identity drift in AI interactions
 *
 * Monitors human-AI interactions to identify when the AI's communication style
 * is causing the user to drift from their authentic identity markers.
 */
export class DriftDetector {
  private baselineIdentity: Identity;
  private driftThreshold: number;
  private historicalScores: DriftScore[] = [];

  constructor(identity: Identity, threshold: number = 0.3) {
    this.baselineIdentity = identity;
    this.driftThreshold = threshold;
  }

  /**
   * Analyze a single interaction for drift
   */
  async detectDrift(context: InteractionContext): Promise<DriftScore> {
    const { userMessage, aiResponse, conversationHistory } = context;

    // Analyze each dimension of drift
    const toneAlignment = this.analyzeToneAlignment(userMessage, aiResponse);
    const valueAlignment = this.analyzeValueAlignment(userMessage, aiResponse);
    const rhythmAlignment = this.analyzeRhythmAlignment(userMessage, aiResponse);
    const contextAlignment = this.analyzeContextAlignment(userMessage, aiResponse);

    // Calculate overall drift score (weighted average)
    const overall = (
      toneAlignment * 0.3 +
      valueAlignment * 0.3 +
      rhythmAlignment * 0.2 +
      contextAlignment * 0.2
    );

    // Identify specific drift flags
    const flags = this.identifyDriftFlags({
      toneAlignment,
      valueAlignment,
      rhythmAlignment,
      contextAlignment,
    });

    // Determine recommendation
    const recommendation = this.getRecommendation(overall, flags);

    // Calculate confidence based on data availability
    const confidence = this.calculateConfidence(context);

    const driftScore: DriftScore = {
      overall,
      dimensions: {
        toneAlignment,
        valueAlignment,
        rhythmAlignment,
        contextAlignment,
      },
      flags,
      recommendation,
      confidence,
    };

    // Store for trend analysis
    this.historicalScores.push(driftScore);

    return driftScore;
  }

  /**
   * Analyze tone alignment between user identity and interaction
   */
  private analyzeToneAlignment(userMessage: string, aiResponse: string): number {
    const userTones = this.baselineIdentity.tone;
    const detectedTone = this.detectToneInMessage(aiResponse);

    // Simple heuristic: check if AI response matches user's preferred tones
    const match = userTones.some(tone => this.toneMatches(tone, detectedTone));

    // Return drift score (0 = aligned, 1 = drifted)
    return match ? 0.1 : 0.6;
  }

  /**
   * Analyze value alignment
   */
  private analyzeValueAlignment(userMessage: string, aiResponse: string): number {
    const coreValues = this.baselineIdentity.coreValues;

    // Check for value violations or misalignments
    let violations = 0;
    for (const value of coreValues) {
      if (this.detectValueViolation(aiResponse, value)) {
        violations++;
      }
    }

    return Math.min(violations * 0.3, 1.0);
  }

  /**
   * Analyze rhythm alignment (pace, detail level, response style)
   */
  protected analyzeRhythmAlignment(userMessage: string, aiResponse: string): number {
    const preferredRhythm = this.baselineIdentity.communicationRhythm;
    const responseRhythm = this.detectRhythm(aiResponse);

    const rhythmMatch: Record<string, string[]> = {
      fast: ['fast', 'concise'],
      thoughtful: ['thoughtful', 'detailed'],
      detailed: ['detailed', 'thoughtful'],
      concise: ['concise', 'fast'],
    };

    const compatible = rhythmMatch[preferredRhythm]?.includes(responseRhythm);
    return compatible ? 0.1 : 0.5;
  }

  /**
   * Analyze context alignment (information density, detail level)
   */
  protected analyzeContextAlignment(userMessage: string, aiResponse: string): number {
    const preferredContext = this.baselineIdentity.contextLevel;
    const responseContext = this.detectContextLevel(aiResponse);

    const mismatch = Math.abs(
      this.contextToNumber(preferredContext) - this.contextToNumber(responseContext)
    );

    return mismatch * 0.5; // Scale mismatch to drift score
  }

  /**
   * Identify specific drift flags based on dimension scores
   */
  protected identifyDriftFlags(dimensions: DriftScore['dimensions']): DriftScore['flags'] {
    const flags: DriftScore['flags'] = [];

    if (dimensions.toneAlignment > 0.4) flags.push('tone_shift');
    if (dimensions.valueAlignment > 0.4) flags.push('value_violation');
    if (dimensions.rhythmAlignment > 0.4) flags.push('rhythm_mismatch');
    if (dimensions.contextAlignment > 0.4) flags.push('context_overload');

    // Check for progressive identity erosion
    if (this.detectIdentityErosionTrend()) {
      flags.push('identity_erosion');
    }

    return flags;
  }

  /**
   * Get recommendation based on drift score and flags
   */
  protected getRecommendation(
    overall: number,
    flags: DriftScore['flags']
  ): DriftScore['recommendation'] {
    if (overall > 0.6 || flags.includes('identity_erosion')) {
      return 'recalibrate';
    }
    if (overall > 0.3 || flags.length > 2) {
      return 'review';
    }
    return 'continue';
  }

  /**
   * Calculate confidence in drift assessment
   */
  protected calculateConfidence(context: InteractionContext): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence with more data
    if (context.conversationHistory && context.conversationHistory.length > 5) {
      confidence += 0.2;
    }
    if (this.historicalScores.length > 10) {
      confidence += 0.2;
    }
    if (context.sessionDuration && context.sessionDuration > 30) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Detect identity erosion trend across recent interactions
   */
  private detectIdentityErosionTrend(): boolean {
    if (this.historicalScores.length < 5) return false;

    const recent = this.historicalScores.slice(-5);
    const increasing = recent.every((score, i) => {
      if (i === 0) return true;
      return score.overall >= recent[i - 1].overall;
    });

    return increasing && recent[recent.length - 1].overall > 0.5;
  }

  // Helper methods for tone/value/rhythm detection
  private detectToneInMessage(message: string): string {
    // Simple heuristic - would be enhanced with NLP
    if (message.length < 50) return 'direct';
    if (message.includes('please') || message.includes('thank')) return 'formal';
    if (message.match(/\b(gonna|wanna|yeah)\b/i)) return 'casual';
    return 'technical';
  }

  private toneMatches(preferredTone: string, detectedTone: string): boolean {
    const toneCompatibility: Record<string, string[]> = {
      formal: ['formal', 'technical'],
      casual: ['casual', 'empathetic'],
      technical: ['technical', 'direct'],
      empathetic: ['empathetic', 'casual'],
      direct: ['direct', 'technical'],
    };
    return toneCompatibility[preferredTone]?.includes(detectedTone) || false;
  }

  private detectValueViolation(message: string, value: string): boolean {
    // Simple keyword-based detection - would be enhanced with semantic analysis
    const valueKeywords: Record<string, string[]> = {
      'transparency': ['hide', 'conceal', 'secret'],
      'efficiency': ['waste', 'inefficient', 'slow'],
      'empathy': ['cold', 'harsh', 'dismiss'],
    };

    const keywords = valueKeywords[value.toLowerCase()] || [];
    return keywords.some(keyword => message.toLowerCase().includes(keyword));
  }

  private detectRhythm(message: string): string {
    const wordCount = message.split(/\s+/).length;
    if (wordCount < 30) return 'concise';
    if (wordCount < 100) return 'fast';
    if (wordCount < 200) return 'thoughtful';
    return 'detailed';
  }

  private detectContextLevel(message: string): string {
    const sentenceCount = message.split(/[.!?]+/).length;
    if (sentenceCount < 3) return 'minimal';
    if (sentenceCount < 7) return 'moderate';
    return 'extensive';
  }

  private contextToNumber(context: string): number {
    const map: Record<string, number> = { minimal: 0, moderate: 1, extensive: 2 };
    return map[context] || 1;
  }

  /**
   * Get drift trend over time
   */
  getDriftTrend(): { average: number; trend: 'improving' | 'stable' | 'worsening' } {
    if (this.historicalScores.length < 3) {
      return { average: 0, trend: 'stable' };
    }

    const recent = this.historicalScores.slice(-10);
    const average = recent.reduce((sum, score) => sum + score.overall, 0) / recent.length;

    const firstHalf = recent.slice(0, Math.floor(recent.length / 2));
    const secondHalf = recent.slice(Math.floor(recent.length / 2));

    const firstAvg = firstHalf.reduce((sum, s) => sum + s.overall, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, s) => sum + s.overall, 0) / secondHalf.length;

    let trend: 'improving' | 'stable' | 'worsening' = 'stable';
    if (secondAvg < firstAvg - 0.1) trend = 'improving';
    if (secondAvg > firstAvg + 0.1) trend = 'worsening';

    return { average, trend };
  }

  /**
   * Reset detector state
   */
  reset(): void {
    this.historicalScores = [];
  }
}
