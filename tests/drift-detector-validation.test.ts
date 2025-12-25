import { describe, it, expect, beforeEach } from 'vitest';
import { DriftDetector } from '../src/core/drift-detector';
import { Identity } from '../src/types/identity';

describe('DriftDetector Validation and Error Handling', () => {
  let validIdentity: Identity;

  beforeEach(() => {
    validIdentity = {
      tone: ['casual', 'empathetic'],
      communicationRhythm: 'thoughtful',
      coreValues: ['transparency', 'empathy', 'efficiency'],
      decisionMakingStyle: 'analytical',
      informationPreference: 'examples',
      emotionalTone: 'warm',
      contextLevel: 'moderate',
    };
  });

  describe('Constructor Validation', () => {
    describe('Threshold Validation', () => {
      it('should accept valid threshold (0.3)', () => {
        expect(() => new DriftDetector(validIdentity, 0.3)).not.toThrow();
      });

      it('should accept threshold at lower bound (0)', () => {
        expect(() => new DriftDetector(validIdentity, 0)).not.toThrow();
      });

      it('should accept threshold at upper bound (1)', () => {
        expect(() => new DriftDetector(validIdentity, 1)).not.toThrow();
      });

      it('should reject negative threshold', () => {
        expect(() => new DriftDetector(validIdentity, -0.5)).toThrow(RangeError);
        expect(() => new DriftDetector(validIdentity, -0.5)).toThrow(
          'Threshold must be between 0 and 1'
        );
      });

      it('should reject threshold greater than 1', () => {
        expect(() => new DriftDetector(validIdentity, 1.5)).toThrow(RangeError);
        expect(() => new DriftDetector(validIdentity, 2.0)).toThrow(RangeError);
      });

      it('should reject NaN threshold', () => {
        expect(() => new DriftDetector(validIdentity, NaN)).toThrow(TypeError);
        expect(() => new DriftDetector(validIdentity, NaN)).toThrow(
          'Threshold must be a valid number'
        );
      });

      it('should reject non-number threshold', () => {
        expect(() => new DriftDetector(validIdentity, '0.5' as any)).toThrow(TypeError);
        expect(() => new DriftDetector(validIdentity, null as any)).toThrow(TypeError);
        // undefined with default parameter is acceptable - will use default 0.3
      });

      it('should use default threshold (0.3) when not provided', () => {
        const detector = new DriftDetector(validIdentity);
        expect(detector['driftThreshold']).toBe(0.3);
      });
    });

    describe('Identity Validation', () => {
      it('should accept valid identity object', () => {
        expect(() => new DriftDetector(validIdentity, 0.3)).not.toThrow();
      });

      it('should reject empty identity object', () => {
        expect(() => new DriftDetector({} as Identity, 0.3)).toThrow(TypeError);
      });

      it('should reject identity with missing required fields', () => {
        const invalidIdentity = {
          tone: ['casual'],
          // Missing other required fields
        } as any;
        expect(() => new DriftDetector(invalidIdentity, 0.3)).toThrow(TypeError);
      });

      it('should reject identity with invalid tone values', () => {
        const invalidIdentity = {
          ...validIdentity,
          tone: ['invalid-tone'] as any,
        };
        expect(() => new DriftDetector(invalidIdentity, 0.3)).toThrow(TypeError);
      });

      it('should reject identity with invalid communicationRhythm', () => {
        const invalidIdentity = {
          ...validIdentity,
          communicationRhythm: 'invalid-rhythm' as any,
        };
        expect(() => new DriftDetector(invalidIdentity, 0.3)).toThrow(TypeError);
      });

      it('should reject identity with invalid emotionalTone', () => {
        const invalidIdentity = {
          ...validIdentity,
          emotionalTone: 'invalid-tone' as any,
        };
        expect(() => new DriftDetector(invalidIdentity, 0.3)).toThrow(TypeError);
      });

      it('should reject null identity', () => {
        expect(() => new DriftDetector(null as any, 0.3)).toThrow(TypeError);
      });

      it('should reject undefined identity', () => {
        expect(() => new DriftDetector(undefined as any, 0.3)).toThrow(TypeError);
      });
    });
  });

  describe('Rhythm Analysis Error Handling', () => {
    it('should handle unknown rhythm types gracefully', async () => {
      // Create identity with valid rhythm initially
      const detector = new DriftDetector(validIdentity, 0.3);
      
      // Modify the identity to have an unknown rhythm (simulating edge case)
      (detector as any).baselineIdentity.communicationRhythm = 'unknown-rhythm';
      
      const context = {
        userMessage: 'Test message',
        aiResponse: 'Test response',
      };

      // Should not throw, should return neutral score
      const result = await detector.detectDrift(context);
      expect(result.overall).toBeGreaterThanOrEqual(0);
      expect(result.overall).toBeLessThanOrEqual(1);
    });

    it('should handle unknown tone types gracefully', async () => {
      const detector = new DriftDetector(validIdentity, 0.3);
      
      // Modify tone to unknown value (simulating edge case)
      (detector as any).baselineIdentity.tone = ['unknown-tone'];
      
      const context = {
        userMessage: 'Test message',
        aiResponse: 'Test response',
      };

      // Should not throw, should handle gracefully
      const result = await detector.detectDrift(context);
      expect(result.overall).toBeGreaterThanOrEqual(0);
      expect(result.overall).toBeLessThanOrEqual(1);
    });
  });

  describe('Context Validation', () => {
    it('should handle empty messages', async () => {
      const detector = new DriftDetector(validIdentity, 0.3);
      
      const context = {
        userMessage: '',
        aiResponse: '',
      };

      const result = await detector.detectDrift(context);
      expect(result).toBeDefined();
      expect(result.overall).toBeGreaterThanOrEqual(0);
      expect(result.overall).toBeLessThanOrEqual(1);
    });

    it('should handle very long messages', async () => {
      const detector = new DriftDetector(validIdentity, 0.3);
      
      const longMessage = 'x'.repeat(10000);
      const context = {
        userMessage: longMessage,
        aiResponse: longMessage,
      };

      const result = await detector.detectDrift(context);
      expect(result).toBeDefined();
    });

    it('should handle messages with special characters', async () => {
      const detector = new DriftDetector(validIdentity, 0.3);
      
      const context = {
        userMessage: '!@#$%^&*()_+-=[]{}|;:",.<>?/`~',
        aiResponse: '™®©℗℠',
      };

      const result = await detector.detectDrift(context);
      expect(result).toBeDefined();
    });

    it('should handle optional conversation history', async () => {
      const detector = new DriftDetector(validIdentity, 0.3);
      
      const contextWithHistory = {
        userMessage: 'Test',
        aiResponse: 'Response',
        conversationHistory: [
          { role: 'user' as const, content: 'Previous message', timestamp: new Date() },
          { role: 'assistant' as const, content: 'Previous response', timestamp: new Date() },
        ],
      };

      const result = await detector.detectDrift(contextWithHistory);
      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0.5); // Should be more confident with history
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid successive calls', async () => {
      const detector = new DriftDetector(validIdentity, 0.3);
      
      const context = {
        userMessage: 'Test',
        aiResponse: 'Response',
      };

      // Rapid calls should all work
      const results = await Promise.all([
        detector.detectDrift(context),
        detector.detectDrift(context),
        detector.detectDrift(context),
        detector.detectDrift(context),
        detector.detectDrift(context),
      ]);

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.overall).toBeGreaterThanOrEqual(0);
        expect(result.overall).toBeLessThanOrEqual(1);
      });
    });

    it('should handle historical score accumulation without memory leak', async () => {
      const detector = new DriftDetector(validIdentity, 0.3);
      
      const context = {
        userMessage: 'Test',
        aiResponse: 'Response',
      };

      // Add 20 scores (should keep only last 10)
      for (let i = 0; i < 20; i++) {
        await detector.detectDrift(context);
      }

      const historicalScores = (detector as any).historicalScores;
      expect(historicalScores.length).toBeLessThanOrEqual(10);
    });

    it('should calculate drift trend with minimal data', () => {
      const detector = new DriftDetector(validIdentity, 0.3);
      
      const trend = detector.getDriftTrend();
      expect(trend.average).toBe(0);
      expect(trend.trend).toBe('stable');
    });

    it('should handle boundary values in context fields', async () => {
      const detector = new DriftDetector(validIdentity, 0.3);
      
      const context = {
        userMessage: 'Test',
        aiResponse: 'Response',
        sessionDuration: 0,
        interactionCount: 0,
      };

      const result = await detector.detectDrift(context);
      expect(result).toBeDefined();
    });
  });

  describe('Drift Score Validation', () => {
    it('should always return scores between 0 and 1', async () => {
      const detector = new DriftDetector(validIdentity, 0.3);
      
      // Test with various inputs
      const testCases = [
        { userMessage: 'Hello', aiResponse: 'Hi there!' },
        { userMessage: 'Very long message ' + 'x'.repeat(1000), aiResponse: 'Short' },
        { userMessage: 'Short', aiResponse: 'Very long response ' + 'y'.repeat(1000) },
        { userMessage: '!!!', aiResponse: '???' },
      ];

      for (const context of testCases) {
        const result = await detector.detectDrift(context);
        
        expect(result.overall).toBeGreaterThanOrEqual(0);
        expect(result.overall).toBeLessThanOrEqual(1);
        
        expect(result.dimensions.toneAlignment).toBeGreaterThanOrEqual(0);
        expect(result.dimensions.toneAlignment).toBeLessThanOrEqual(1);
        
        expect(result.dimensions.valueAlignment).toBeGreaterThanOrEqual(0);
        expect(result.dimensions.valueAlignment).toBeLessThanOrEqual(1);
        
        expect(result.dimensions.rhythmAlignment).toBeGreaterThanOrEqual(0);
        expect(result.dimensions.rhythmAlignment).toBeLessThanOrEqual(1);
        
        expect(result.dimensions.contextAlignment).toBeGreaterThanOrEqual(0);
        expect(result.dimensions.contextAlignment).toBeLessThanOrEqual(1);
      }
    });

    it('should always return valid recommendation', async () => {
      const detector = new DriftDetector(validIdentity, 0.3);
      
      const context = {
        userMessage: 'Test',
        aiResponse: 'Response',
      };

      const result = await detector.detectDrift(context);
      expect(['continue', 'review', 'recalibrate']).toContain(result.recommendation);
    });

    it('should return confidence between 0 and 1', async () => {
      const detector = new DriftDetector(validIdentity, 0.3);
      
      const context = {
        userMessage: 'Test',
        aiResponse: 'Response',
      };

      const result = await detector.detectDrift(context);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });
});
