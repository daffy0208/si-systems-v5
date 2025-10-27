import Sentiment from 'sentiment';
import { pipeline as transformersPipeline } from '@xenova/transformers';
import { LRUCache } from 'lru-cache';
import { createHash } from 'crypto';

/**
 * NLP Pipeline for sentiment analysis and semantic similarity
 * Provides caching and fallback strategies for performance and reliability
 */

export interface SentimentResult {
  score: number; // Raw sentiment score
  comparative: number; // Normalized by word count
  tokens: string[];
  positive: string[];
  negative: string[];
  classification: 'positive' | 'neutral' | 'negative';
}

export class NLPPipeline {
  private sentimentAnalyzer: Sentiment;
  private embeddingModel: any; // Transformers.js pipeline
  private sentimentCache: LRUCache<string, SentimentResult>;
  private embeddingCache: LRUCache<string, Float32Array>;

  private initialized = false;
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    this.sentimentAnalyzer = new Sentiment();

    // Caches
    this.sentimentCache = new LRUCache({
      max: 1000,
      ttl: 1000 * 60 * 60, // 1 hour
    });

    this.embeddingCache = new LRUCache({
      max: 500, // Embeddings are larger
      ttl: 1000 * 60 * 60 * 24, // 24 hours
    });
  }

  /**
   * Initialize the embedding model (lazy loading)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Prevent multiple simultaneous initializations
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = (async () => {
      try {
        console.log('Loading embedding model (Xenova/all-MiniLM-L6-v2)...');
        this.embeddingModel = await transformersPipeline(
          'feature-extraction',
          'Xenova/all-MiniLM-L6-v2'
        );
        this.initialized = true;
        console.log('Embedding model loaded successfully');
      } catch (error) {
        console.warn('Failed to load embedding model, will use fallback', error);
        // Graceful degradation - embeddings will use fallback
        this.initialized = false;
      }
    })();

    return this.initializationPromise;
  }

  /**
   * Create content hash for caching
   */
  private hash(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * Analyze sentiment of text
   */
  async analyzeSentiment(text: string): Promise<SentimentResult> {
    const cacheKey = this.hash(text);

    // Check cache
    const cached = this.sentimentCache.get(cacheKey);
    if (cached) return cached;

    try {
      const result = this.sentimentAnalyzer.analyze(text);

      const sentimentResult: SentimentResult = {
        score: result.score,
        comparative: result.comparative,
        tokens: result.tokens,
        positive: result.positive,
        negative: result.negative,
        classification: this.classifySentiment(result.comparative),
      };

      this.sentimentCache.set(cacheKey, sentimentResult);
      return sentimentResult;

    } catch (error) {
      console.error('Sentiment analysis failed', error);
      return this.getFallbackSentiment();
    }
  }

  /**
   * Classify sentiment based on comparative score
   */
  private classifySentiment(comparative: number): 'positive' | 'neutral' | 'negative' {
    if (comparative > 0.5) return 'positive';
    if (comparative < -0.5) return 'negative';
    return 'neutral';
  }

  /**
   * Generate embedding for text
   */
  async generateEmbedding(text: string): Promise<Float32Array> {
    const cacheKey = this.hash(text);

    // Check cache
    const cached = this.embeddingCache.get(cacheKey);
    if (cached) return cached;

    if (!this.initialized && !this.initializationPromise) {
      await this.initialize();
    } else if (this.initializationPromise) {
      await this.initializationPromise;
    }

    if (!this.embeddingModel) {
      // Fallback: use simple bag-of-words representation
      return this.getFallbackEmbedding(text);
    }

    try {
      const output = await this.embeddingModel(text, {
        pooling: 'mean',
        normalize: true,
      });

      const embedding = new Float32Array(output.data);
      this.embeddingCache.set(cacheKey, embedding);
      return embedding;

    } catch (error) {
      console.error('Embedding generation failed', error);
      return this.getFallbackEmbedding(text);
    }
  }

  /**
   * Compute cosine similarity between two texts
   */
  async computeSimilarity(text1: string, text2: string): Promise<number> {
    const [emb1, emb2] = await Promise.all([
      this.generateEmbedding(text1),
      this.generateEmbedding(text2),
    ]);

    return this.cosineSimilarity(emb1, emb2);
  }

  /**
   * Compute cosine similarity between two embeddings
   */
  cosineSimilarity(a: Float32Array, b: Float32Array): number {
    if (a.length !== b.length) {
      throw new Error('Embedding dimensions must match');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Fallback sentiment when analysis fails
   */
  private getFallbackSentiment(): SentimentResult {
    return {
      score: 0,
      comparative: 0,
      tokens: [],
      positive: [],
      negative: [],
      classification: 'neutral',
    };
  }

  /**
   * Fallback embedding using simple bag-of-words
   */
  private getFallbackEmbedding(text: string): Float32Array {
    const words = text.toLowerCase().split(/\s+/);
    const vocab: Map<string, number> = new Map();

    words.forEach((word) => {
      vocab.set(word, (vocab.get(word) || 0) + 1);
    });

    // Create sparse representation (384 dimensions to match model)
    const embedding = new Float32Array(384);

    for (const [word, count] of vocab.entries()) {
      // Simple hash to dimension mapping
      const hashCode = word.split('').reduce((acc, char) =>
        acc + char.charCodeAt(0), 0
      );
      const dimension = hashCode % 384;
      embedding[dimension] += count / words.length; // Normalized frequency
    }

    return embedding;
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      sentiment: {
        size: this.sentimentCache.size,
        max: this.sentimentCache.max,
      },
      embedding: {
        size: this.embeddingCache.size,
        max: this.embeddingCache.max,
      },
    };
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    this.sentimentCache.clear();
    this.embeddingCache.clear();
  }
}

// Singleton instance
export const nlpPipeline = new NLPPipeline();
