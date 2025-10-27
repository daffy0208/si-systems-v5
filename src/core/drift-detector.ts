import { Identity, DriftScore, InteractionContext } from '../types/identity';
import { analyzeTone, analyzeValues, analyzeRhythm, analyzeContext } from '../utils/analyzers';

/**
 * DriftDetector - Core module for detecting identity drift in AI interactions
 *
 * Monitors human-AI interactions to identify when the AI's communication style
 * is causing the user to drift from their authentic identity markers.
 */
export class DriftDetector {
  protected baselineIdentity: Identity;
  protected driftThreshold: number;
  protected historicalScores: DriftScore[] = [];

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

    // Store for trend analysis (keep only last 10 to prevent memory leak)
    this.historicalScores.push(driftScore);
    if (this.historicalScores.length > 10) {
      this.historicalScores.shift(); // Remove oldest score
    }

    return driftScore;
  }

  /**
   * Analyze tone alignment between user identity and interaction
   */
  protected analyzeToneAlignment(userMessage: string, aiResponse: string): number {
    const userTones = this.baselineIdentity.tone;
    const detectedTone = analyzeTone(aiResponse);

    // Simple heuristic: check if AI response matches user's preferred tones
    const match = userTones.some(tone => this.toneMatches(tone, detectedTone));

    // Return drift score (0 = aligned, 1 = drifted)
    return match ? 0.1 : 0.6;
  }

  /**
   * Analyze value alignment
   */
  protected analyzeValueAlignment(userMessage: string, aiResponse: string): number {
    const coreValues = this.baselineIdentity.coreValues;

    // Use imported analyzer from utils/analyzers.ts
    return analyzeValues(aiResponse, coreValues);
  }

  /**
   * Analyze rhythm alignment (pace, detail level, response style)
   */
  protected analyzeRhythmAlignment(userMessage: string, aiResponse: string): number {
    const preferredRhythm = this.baselineIdentity.communicationRhythm;
    const responseRhythm = analyzeRhythm(aiResponse);

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
    const responseContext = analyzeContext(aiResponse);

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
   * Uses configured driftThreshold instead of hard-coded values
   */
  protected getRecommendation(
    overall: number,
    flags: DriftScore['flags']
  ): DriftScore['recommendation'] {
    // Use configured threshold (default 0.3)
    // Recalibrate if score is high (2x threshold) or identity erosion detected
    const recalibrateThreshold = this.driftThreshold * 2;
    if (overall > recalibrateThreshold || flags.includes('identity_erosion')) {
      return 'recalibrate';
    }
    // Review if score exceeds threshold or multiple flags
    if (overall > this.driftThreshold || flags.length > 2) {
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
  // Note: analyzeTone, analyzeRhythm, analyzeContext are now imported from utils/analyzers.ts

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
