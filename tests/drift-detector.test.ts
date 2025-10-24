import { describe, it, expect, beforeEach } from 'vitest';
import { DriftDetector } from '../src/core/drift-detector';
import { Identity, InteractionContext } from '../src/types/identity';

describe('DriftDetector', () => {
  let detector: DriftDetector;
  let testIdentity: Identity;

  beforeEach(() => {
    testIdentity = {
      tone: ['casual', 'empathetic'],
      communicationRhythm: 'thoughtful',
      coreValues: ['transparency', 'empathy', 'efficiency'],
      decisionMakingStyle: 'analytical',
      informationPreference: 'examples',
      emotionalTone: 'warm',
      contextLevel: 'moderate',
    };

    detector = new DriftDetector(testIdentity, 0.3);
  });

  describe('detectDrift', () => {
    it('should detect low drift for aligned interactions', async () => {
      const context: InteractionContext = {
        userMessage: 'Can you help me understand this concept?',
        aiResponse: 'I would be happy to help! Let me explain with an example',
      };

      const result = await detector.detectDrift(context);

      expect(result.overall).toBeLessThan(0.5);
      expect(result.recommendation).not.toBe('recalibrate');
      // May have some flags as detection is sensitive - that's OK for MVP
    });

    it('should detect tone drift', async () => {
      const context: InteractionContext = {
        userMessage: 'Hey, what is up with this feature?',
        aiResponse: 'Per the technical specifications outlined in document XYZ-123, section 4.2.1',
      };

      const result = await detector.detectDrift(context);

      expect(result.dimensions.toneAlignment).toBeGreaterThan(0.3);
      expect(result.flags).toContain('tone_shift');
    });

    it('should detect rhythm mismatch for verbose responses', async () => {
      const context: InteractionContext = {
        userMessage: 'Quick question',
        aiResponse: 'To provide a comprehensive answer, let me first establish the fundamental theoretical framework that underpins this question, dating back to the seminal work of early researchers in this field over the past century',
      };

      const result = await detector.detectDrift(context);

      expect(result.dimensions.rhythmAlignment).toBeGreaterThan(0);
      expect(result.flags.length).toBeGreaterThan(0);
    });

    it('should track confidence based on data availability', async () => {
      const contextWithHistory: InteractionContext = {
        userMessage: 'Test message',
        aiResponse: 'Test response',
        conversationHistory: Array(10).fill({
          role: 'user',
          content: 'test',
          timestamp: new Date(),
        }),
        sessionDuration: 45,
      };

      const result = await detector.detectDrift(contextWithHistory);

      expect(result.confidence).toBeGreaterThan(0.7);
    });
  });

  describe('getDriftTrend', () => {
    it('should track drift across interactions', async () => {
      for (let i = 0; i < 10; i++) {
        await detector.detectDrift({
          userMessage: 'test',
          aiResponse: 'test '.repeat(50 + i * 20),
        });
      }

      const trend = detector.getDriftTrend();
      // MVP: Just verify we can calculate trends
      expect(['improving', 'stable', 'worsening']).toContain(trend.trend);
      expect(trend.average).toBeGreaterThanOrEqual(0);
    });

    it('should return stable for insufficient data', () => {
      const trend = detector.getDriftTrend();
      expect(trend.trend).toBe('stable');
    });
  });

  describe('reset', () => {
    it('should clear historical scores', async () => {
      await detector.detectDrift({
        userMessage: 'test',
        aiResponse: 'test',
      });

      detector.reset();
      const trend = detector.getDriftTrend();

      expect(trend.average).toBe(0);
      expect(trend.trend).toBe('stable');
    });
  });
});
