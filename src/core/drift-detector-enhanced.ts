/**
 * Enhanced DriftDetector with optional NLP capabilities
 * Maintains backward compatibility while adding ML/NLP features
 */

import { Identity, DriftScore, InteractionContext } from '../types/identity';
import { DriftDetector } from './drift-detector';
import { NLPDriftDetector } from '../nlp/nlp-drift-detector';
import { nlpPipeline } from '../nlp/pipeline';

export interface EnhancedDriftDetectorConfig {
  enableNLP?: boolean; // Enable NLP-based analysis
  nlpValueStatements?: string[]; // Value statements for semantic similarity
  sentimentThreshold?: number; // Threshold for sentiment-based drift (0-1)
  similarityThreshold?: number; // Threshold for semantic similarity (0-1)
  useHybridScoring?: boolean; // Use hybrid heuristic + NLP scoring (default: true)
  heuristicWeight?: number; // Weight for heuristic scores (default: 0.4)
  nlpWeight?: number; // Weight for NLP scores (default: 0.6)
}

/**
 * Enhanced DriftDetector with NLP capabilities
 * Falls back to heuristic methods if NLP fails or is disabled
 */
export class EnhancedDriftDetector extends DriftDetector {
  private config: Required<EnhancedDriftDetectorConfig>;
  private nlpDetector?: NLPDriftDetector;
  private nlpInitialized = false;

  constructor(
    identity: Identity,
    threshold: number = 0.3,
    config: EnhancedDriftDetectorConfig = {}
  ) {
    super(identity, threshold);

    // Set defaults
    const heuristicWeight = config.heuristicWeight ?? 0.4;
    const nlpWeight = config.nlpWeight ?? 0.6;

    // Normalize weights to sum to 1.0 to prevent scores exceeding 1.0
    const weightSum = heuristicWeight + nlpWeight;
    const normalizedHeuristicWeight = heuristicWeight / weightSum;
    const normalizedNlpWeight = nlpWeight / weightSum;

    this.config = {
      enableNLP: config.enableNLP ?? true,
      nlpValueStatements: config.nlpValueStatements ?? [],
      sentimentThreshold: config.sentimentThreshold ?? 0.6,
      similarityThreshold: config.similarityThreshold ?? 0.7,
      useHybridScoring: config.useHybridScoring ?? true,
      heuristicWeight: normalizedHeuristicWeight,
      nlpWeight: normalizedNlpWeight,
    };

    if (this.config.enableNLP) {
      this.nlpDetector = new NLPDriftDetector();
    }
  }

  /**
   * Initialize NLP capabilities (lazy loading)
   */
  async initializeNLP(): Promise<void> {
    if (!this.config.enableNLP || this.nlpInitialized || !this.nlpDetector) {
      return;
    }

    try {
      await this.nlpDetector.initialize(this.config.nlpValueStatements);
      this.nlpInitialized = true;
      console.log('NLP capabilities initialized');
    } catch (error) {
      console.warn('Failed to initialize NLP, falling back to heuristics:', error);
      this.config.enableNLP = false;
    }
  }

  /**
   * Enhanced drift detection with NLP
   */
  async detectDrift(context: InteractionContext): Promise<DriftScore> {
    const { userMessage, aiResponse } = context;

    // Try NLP-enhanced detection if enabled
    if (this.config.enableNLP && this.nlpDetector) {
      try {
        if (!this.nlpInitialized) {
          await this.initializeNLP();
        }

        return await this.detectDriftWithNLP(context);
      } catch (error) {
        console.warn('NLP detection failed, falling back to heuristics:', error);
        // Fall through to baseline detection
      }
    }

    // Fallback to baseline heuristic detection
    return super.detectDrift(context);
  }

  /**
   * NLP-enhanced drift detection with hybrid scoring
   */
  private async detectDriftWithNLP(context: InteractionContext): Promise<DriftScore> {
    const { userMessage, aiResponse } = context;

    if (!this.nlpDetector) {
      return super.detectDrift(context);
    }

    // Hybrid scoring: combine heuristic + NLP scores
    let toneAlignment: number;
    let valueAlignment: number;

    if (this.config.useHybridScoring) {
      // Get both heuristic and NLP scores (using proper protected method access)
      const heuristicTone = this.analyzeToneAlignment(userMessage, aiResponse);
      const nlpTone = await this.analyzeToneAlignmentWithNLP(aiResponse);

      const heuristicValue = this.analyzeValueAlignment(userMessage, aiResponse);
      const nlpValue = await this.analyzeValueAlignmentWithNLP(aiResponse);

      // Combine with normalized weights (always sum to 1.0)
      toneAlignment = (
        heuristicTone * this.config.heuristicWeight +
        nlpTone * this.config.nlpWeight
      );

      valueAlignment = (
        heuristicValue * this.config.heuristicWeight +
        nlpValue * this.config.nlpWeight
      );
    } else {
      // Pure NLP scoring (legacy behavior)
      toneAlignment = await this.analyzeToneAlignmentWithNLP(aiResponse);
      valueAlignment = await this.analyzeValueAlignmentWithNLP(aiResponse);
    }

    // Use baseline for rhythm and context (NLP not beneficial here)
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

    // Calculate confidence (higher for hybrid scoring)
    const confidence = this.config.useHybridScoring
      ? Math.min(this.calculateConfidence(context) * 1.2, 1.0)
      : this.calculateConfidence(context);

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

    return driftScore;
  }

  /**
   * Analyze tone alignment using NLP sentiment analysis
   */
  private async analyzeToneAlignmentWithNLP(aiResponse: string): Promise<number> {
    if (!this.nlpDetector) {
      return this.analyzeToneAlignment('', aiResponse);
    }

    try {
      const sentiment = await nlpPipeline.analyzeSentiment(aiResponse);
      const userTones = this.baselineIdentity.tone;
      const responseLower = aiResponse.toLowerCase();
      const tokens = sentiment.tokens.map(t => t.toLowerCase());

      let driftScore = 0.0;

      // Negative language indicators (stronger detection)
      const negativeWords = [
        'unfortunately', 'cannot', 'unable', 'frustrating', 'difficult',
        'problem', 'issue', 'error', 'failed', 'wrong', 'bad', 'terrible'
      ];
      const negativeCount = tokens.filter(t => negativeWords.includes(t)).length;

      // Unprofessional language markers
      const unprofessionalMarkers = [
        'ugh', 'whatever', 'guess', 'suppose', 'dunno', 'gonna', 'wanna',
        'yeah', 'nope', 'dude', 'buddy', 'listen here'
      ];
      let unprofessionalCount = tokens.filter(t => unprofessionalMarkers.includes(t)).length;
      if (responseLower.includes('listen here')) unprofessionalCount++;

      // Apologetic/hedging language (over-use indicates drift)
      const apologeticWords = ['sorry', 'apologize', 'apologies', 'regret'];
      const apologeticCount = tokens.filter(t => apologeticWords.includes(t)).length;

      // Extreme/emotional language
      const extremeWords = ['must', 'never', 'always', 'terrible', 'horrible', 'awful'];
      const extremeCount = tokens.filter(t => extremeWords.includes(t)).length;

      // Calculate drift based on user's tone preferences
      if (userTones.includes('formal') || userTones.includes('technical')) {
        // Professional tones should avoid:
        // - Negative sentiment (using configured threshold)
        const negativeThreshold = -1 * (1 - this.config.sentimentThreshold);
        if (sentiment.classification === 'negative' || sentiment.comparative < negativeThreshold) {
          driftScore += 0.3;
        }

        // - Unprofessional language (severe)
        if (unprofessionalCount > 0) {
          driftScore += 0.5 + (unprofessionalCount * 0.1);
        }

        // - Excessive apologizing
        if (apologeticCount > 1) {
          driftScore += 0.2;
        }

        // - Extreme language
        if (extremeCount > 0) {
          driftScore += 0.2;
        }

        // - Multiple negative words
        if (negativeCount > 2) {
          driftScore += 0.3;
        }
      } else if (userTones.includes('empathetic')) {
        // Empathetic tones can handle some emotion, but not extreme negativity
        if (sentiment.classification === 'negative' && sentiment.comparative < -1.5) {
          driftScore += 0.4;
        }

        // Still unprofessional if using casual slang
        if (unprofessionalCount > 1) {
          driftScore += 0.3;
        }
      } else if (userTones.includes('casual')) {
        // Casual tones are more forgiving
        if (unprofessionalCount > 2) {
          driftScore += 0.2;
        }

        if (sentiment.comparative < -2.0) {
          driftScore += 0.3;
        }
      }

      // Cap at 1.0
      return Math.min(driftScore, 1.0);
    } catch (error) {
      console.warn('NLP tone analysis failed, using heuristic:', error);
      return this.analyzeToneAlignment('', aiResponse);
    }
  }

  /**
   * Analyze value alignment using NLP semantic similarity
   */
  private async analyzeValueAlignmentWithNLP(aiResponse: string): Promise<number> {
    if (!this.nlpDetector || this.config.nlpValueStatements.length === 0) {
      return this.analyzeValueAlignment('', aiResponse);
    }

    try {
      const result = await this.nlpDetector.detectValueDrift(
        [{ role: 'assistant', content: aiResponse }],
        this.config.similarityThreshold
      );

      if (result.driftDetected) {
        // Scale confidence to drift score
        return Math.min(result.confidence, 1.0);
      }

      // Also check baseline value violations
      const coreValues = this.baselineIdentity.coreValues;
      let violations = 0;
      for (const value of coreValues) {
        if (this.detectValueViolation(aiResponse, value)) {
          violations++;
        }
      }

      return Math.max(Math.min(violations * 0.3, 1.0), result.confidence * 0.5);
    } catch (error) {
      console.warn('NLP value analysis failed, using heuristic:', error);
      return this.analyzeValueAlignment('', aiResponse);
    }
  }

  /**
   * Get enhanced detector stats
   */
  getEnhancedStats() {
    const baseStats = {
      threshold: this.driftThreshold,
      historicalScoresCount: this.historicalScores.length,
      nlpEnabled: this.config.enableNLP,
      nlpInitialized: this.nlpInitialized,
    };

    if (this.nlpDetector) {
      return {
        ...baseStats,
        nlpStats: this.nlpDetector.getStats(),
      };
    }

    return baseStats;
  }
}
