/**
 * NLP-Enhanced Drift Detector
 * Uses sentiment analysis and semantic similarity for improved accuracy
 */

import { nlpPipeline, SentimentResult } from './pipeline';
import { Message, DriftResult } from './types';

export class NLPDriftDetector {
  // Pre-computed embeddings for value statements
  private valueEmbeddings: Map<string, Float32Array> = new Map();
  private initialized = false;

  /**
   * Initialize detector with value statements
   */
  async initialize(valueStatements: string[]): Promise<void> {
    if (this.initialized) return;

    await nlpPipeline.initialize();

    // Pre-compute embeddings for all value statements
    for (const statement of valueStatements) {
      const embedding = await nlpPipeline.generateEmbedding(statement);
      this.valueEmbeddings.set(statement, embedding);
    }

    this.initialized = true;
  }

  /**
   * Detect tone drift using sentiment analysis
   */
  async detectToneDrift(
    messages: Message[],
    expectedTone: 'positive' | 'neutral' | 'professional'
  ): Promise<DriftResult> {
    // Analyze sentiment for all messages
    const sentimentAnalyses = await Promise.all(
      messages.map(msg => nlpPipeline.analyzeSentiment(msg.content))
    );

    // Calculate drift score based on expected tone
    const driftScore = this.calculateToneDriftScore(
      sentimentAnalyses,
      expectedTone
    );

    const driftDetected = driftScore > 0.5; // More sensitive threshold

    return {
      type: 'tone',
      driftDetected,
      confidence: driftScore,
      details: {
        sentiments: sentimentAnalyses.map(s => s.classification),
        averageComparative: this.average(sentimentAnalyses.map(s => s.comparative)),
        positiveWords: sentimentAnalyses.flatMap(s => s.positive),
        negativeWords: sentimentAnalyses.flatMap(s => s.negative),
        violationCount: this.countToneViolations(sentimentAnalyses, expectedTone),
      },
    };
  }

  /**
   * Calculate tone drift score
   */
  private calculateToneDriftScore(
    sentiments: SentimentResult[],
    expectedTone: string
  ): number {
    let driftScore = 0;
    let totalWeight = 0;

    for (const sentiment of sentiments) {
      let messageScore = 0;

      // Lists of problematic words by category - check tokens directly
      const tokensLower = sentiment.tokens.map(t => t.toLowerCase());

      const unprofessionalWords = ['ugh', 'whatever'];
      const negativeWords = ['unfortunately', 'frustrating', 'annoying', 'confusing', 'waste'];
      const apologeticWords = ['sorry', 'apologize', 'apologies'];
      const uncertainWords = ['guess', 'suppose', 'maybe', 'perhaps'];

      if (expectedTone === 'positive') {
        // Positive tone should avoid negative sentiment
        if (sentiment.classification === 'negative') {
          messageScore = 0.9;
        }

        // Count negative/apologetic words by checking tokens directly
        const negCount = tokensLower.filter(token =>
          negativeWords.includes(token) || apologeticWords.includes(token)
        ).length;

        if (negCount > 0) {
          messageScore = Math.max(messageScore, 0.7 + (negCount * 0.1));
        }

      } else if (expectedTone === 'professional') {
        // Check for unprofessional language in tokens
        const unprofCount = tokensLower.filter(token =>
          unprofessionalWords.includes(token) || uncertainWords.includes(token)
        ).length;

        if (unprofCount > 0) {
          messageScore = Math.max(messageScore, 0.7 + (unprofCount * 0.15));
        }

        // Check for negative/apologetic words
        const negCount = tokensLower.filter(token =>
          negativeWords.includes(token) || apologeticWords.includes(token)
        ).length;

        if (negCount > 0) {
          messageScore = Math.max(messageScore, 0.6 + (negCount * 0.1));
        }

      } else if (expectedTone === 'neutral') {
        // Neutral should avoid strong opinions or advice
        const opinionatedWords = ['definitely', 'absolutely', 'must'];
        const hasOpinions = tokensLower.some(token =>
          opinionatedWords.includes(token)
        );

        if (hasOpinions) {
          messageScore = 0.8;
        } else if (Math.abs(sentiment.comparative) > 0.8) {
          messageScore = 0.7;
        }
      }

      driftScore += messageScore;
      totalWeight += 1;
    }

    return totalWeight > 0 ? Math.min(driftScore / totalWeight, 1.0) : 0;
  }

  /**
   * Count tone violations
   */
  private countToneViolations(
    sentiments: SentimentResult[],
    expectedTone: string
  ): number {
    return sentiments.filter(sentiment => {
      if (expectedTone === 'positive') {
        return sentiment.classification === 'negative';
      } else if (expectedTone === 'professional') {
        return Math.abs(sentiment.comparative) > 1.0;
      } else if (expectedTone === 'neutral') {
        return Math.abs(sentiment.comparative) > 0.8;
      }
      return false;
    }).length;
  }

  /**
   * Detect value drift using semantic similarity
   */
  async detectValueDrift(
    messages: Message[],
    threshold: number = 0.7
  ): Promise<DriftResult> {
    if (!this.initialized) {
      throw new Error('NLPDriftDetector must be initialized before use');
    }

    const violations: Array<{
      messageIndex: number;
      value: string;
      similarity: number;
    }> = [];

    // Check each message against value statements
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const msgEmbedding = await nlpPipeline.generateEmbedding(msg.content);

      // Check similarity to each value statement
      for (const [valueStatement, valueEmbedding] of this.valueEmbeddings.entries()) {
        const similarity = nlpPipeline.cosineSimilarity(msgEmbedding, valueEmbedding);

        // High similarity to value violation statement = potential drift
        if (similarity > threshold) {
          violations.push({
            messageIndex: i,
            value: valueStatement,
            similarity,
          });
        }
      }
    }

    const driftScore = violations.length > 0
      ? this.average(violations.map(v => v.similarity))
      : 0;

    return {
      type: 'value',
      driftDetected: violations.length > 0,
      confidence: driftScore,
      details: {
        violations,
        affectedMessages: violations.map(v => v.messageIndex),
        valueStatements: Array.from(this.valueEmbeddings.keys()),
      },
    };
  }

  /**
   * Detect combined drift (tone + value)
   */
  async detectCombinedDrift(
    messages: Message[],
    expectedTone: 'positive' | 'neutral' | 'professional',
    valueThreshold: number = 0.7
  ): Promise<{
    toneDrift: DriftResult;
    valueDrift: DriftResult;
    overallDriftDetected: boolean;
    overallConfidence: number;
  }> {
    const [toneDrift, valueDrift] = await Promise.all([
      this.detectToneDrift(messages, expectedTone),
      this.valueEmbeddings.size > 0
        ? this.detectValueDrift(messages, valueThreshold)
        : Promise.resolve({
          type: 'value' as const,
          driftDetected: false,
          confidence: 0,
          details: {},
        }),
    ]);

    const overallDriftDetected = toneDrift.driftDetected || valueDrift.driftDetected;
    const overallConfidence = Math.max(toneDrift.confidence, valueDrift.confidence);

    return {
      toneDrift,
      valueDrift,
      overallDriftDetected,
      overallConfidence,
    };
  }

  /**
   * Helper: calculate average
   */
  private average(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  }

  /**
   * Get detector statistics
   */
  getStats() {
    return {
      initialized: this.initialized,
      valueStatementsCount: this.valueEmbeddings.size,
      cacheStats: nlpPipeline.getCacheStats(),
    };
  }
}
