import { describe, it, expect, beforeAll } from 'vitest';
import { NLPPipeline } from '../src/nlp/pipeline';

describe('NLPPipeline', () => {
  let pipeline: NLPPipeline;

  beforeAll(async () => {
    pipeline = new NLPPipeline();
    await pipeline.initialize();
  });

  describe('sentiment analysis', () => {
    it('should analyze positive sentiment', async () => {
      const result = await pipeline.analyzeSentiment('I love this amazing product!');

      expect(result.classification).toBe('positive');
      expect(result.score).toBeGreaterThan(0);
    });

    it('should analyze negative sentiment', async () => {
      const result = await pipeline.analyzeSentiment('This is terrible and frustrating.');

      expect(result.classification).toBe('negative');
      expect(result.score).toBeLessThan(0);
    });

    it('should analyze neutral sentiment', async () => {
      const result = await pipeline.analyzeSentiment('The system has three components.');

      expect(result.classification).toBe('neutral');
    });

    it('should handle empty text', async () => {
      const result = await pipeline.analyzeSentiment('');

      expect(result.classification).toBeDefined();
    });

    it('should cache repeated analysis', async () => {
      const text = 'This is a test message for caching.';

      const result1 = await pipeline.analyzeSentiment(text);
      const result2 = await pipeline.analyzeSentiment(text);

      expect(result1.score).toBe(result2.score);
      expect(result1.classification).toBe(result2.classification);
    });
  });

  describe('embedding generation', () => {
    it('should generate embeddings', async () => {
      const embedding = await pipeline.generateEmbedding('Test message');

      expect(embedding).toBeInstanceOf(Float32Array);
      expect(embedding.length).toBe(384); // MiniLM dimension
    });

    it('should generate different embeddings for different texts', async () => {
      const emb1 = await pipeline.generateEmbedding('Hello world');
      const emb2 = await pipeline.generateEmbedding('Goodbye world');

      const similarity = pipeline.cosineSimilarity(emb1, emb2);
      expect(similarity).toBeLessThan(1); // Should not be identical
      expect(similarity).toBeGreaterThan(0); // But should be somewhat similar
    });

    it('should cache embeddings', async () => {
      const text = 'Caching test';
      const emb1 = await pipeline.generateEmbedding(text);
      const emb2 = await pipeline.generateEmbedding(text);

      expect(emb1).toBe(emb2); // Should be same object from cache
    });

    it('should handle empty text', async () => {
      const embedding = await pipeline.generateEmbedding('');

      expect(embedding).toBeInstanceOf(Float32Array);
    });
  });

  describe('semantic similarity', () => {
    it('should compute high similarity for similar texts', async () => {
      const sim = await pipeline.computeSimilarity(
        'The cat sits on the mat',
        'A cat is sitting on a mat'
      );

      expect(sim).toBeGreaterThan(0.7); // Should be quite similar
    });

    it('should compute low similarity for different texts', async () => {
      const sim = await pipeline.computeSimilarity(
        'Financial investment advice',
        'Recipe for chocolate cake'
      );

      expect(sim).toBeLessThan(0.5); // Should be dissimilar
    });

    it('should compute perfect similarity for identical texts', async () => {
      const text = 'Identical text';
      const sim = await pipeline.computeSimilarity(text, text);

      expect(sim).toBeGreaterThan(0.99); // Should be nearly 1.0
    });

    it('should handle zero-norm vectors gracefully', () => {
      // Test zero-norm protection in cosineSimilarity
      const normalVector = new Float32Array([1, 2, 3]);
      const zeroVector = new Float32Array([0, 0, 0]);

      // Should return 0 instead of NaN when one vector is zero
      const sim1 = pipeline.cosineSimilarity(normalVector, zeroVector);
      const sim2 = pipeline.cosineSimilarity(zeroVector, normalVector);
      const sim3 = pipeline.cosineSimilarity(zeroVector, zeroVector);

      expect(sim1).toBe(0);
      expect(sim2).toBe(0);
      expect(sim3).toBe(0);
      expect(Number.isNaN(sim1)).toBe(false);
      expect(Number.isNaN(sim2)).toBe(false);
      expect(Number.isNaN(sim3)).toBe(false);
    });
  });

  describe('cache management', () => {
    it('should report cache stats', () => {
      const stats = pipeline.getCacheStats();

      expect(stats.sentiment).toBeDefined();
      expect(stats.embedding).toBeDefined();
      expect(stats.sentiment.size).toBeGreaterThanOrEqual(0);
      expect(stats.embedding.size).toBeGreaterThanOrEqual(0);
    });

    it('should clear caches', async () => {
      await pipeline.analyzeSentiment('Test');
      await pipeline.generateEmbedding('Test');

      pipeline.clearCaches();
      const stats = pipeline.getCacheStats();

      expect(stats.sentiment.size).toBe(0);
      expect(stats.embedding.size).toBe(0);
    });
  });
});
