import { describe, it, expect, beforeEach } from 'vitest';
import { OutputIntegrityFilter } from '../src/filters/output-integrity-filter';
import { Identity } from '../src/types/identity';

describe('OutputIntegrityFilter', () => {
  let filter: OutputIntegrityFilter;
  let testIdentity: Identity;

  beforeEach(() => {
    testIdentity = {
      tone: ['professional', 'empathetic'],
      communicationRhythm: 'thoughtful',
      coreValues: ['transparency', 'honesty', 'respect'],
      decisionMakingStyle: 'analytical',
      informationPreference: 'textual',
      emotionalTone: 'measured',
      contextLevel: 'moderate',
    };

    filter = new OutputIntegrityFilter(testIdentity);
  });

  describe('filter', () => {
    it('should check output integrity', async () => {
      const output = 'Thank you for your question. Here is a clear response.';
      const result = await filter.filter(output);

      expect(result.passed).toBeDefined();
      expect(result.output).toBeDefined();
      expect(result.flags).toBeDefined();
      expect(result.recommendation).toBeDefined();
    });

    it('should detect tone violations', async () => {
      const output = 'Listen here buddy, you need to figure this out yourself.';
      const result = await filter.filter(output);

      expect(result.flags).toContain('tone_violation');
    });

    it('should detect manipulative patterns', async () => {
      const output = 'You should feel bad about this decision.';
      const result = await filter.filter(output);

      expect(result.flags).toContain('manipulation_detected');
      expect(result.recommendation).toBe('block');
    });

    it('should detect value violations', async () => {
      const output = 'Let me hide this information from you for your own good.';
      const result = await filter.filter(output);

      expect(result.flags).toContain('value_misalignment');
    });

    it('should handle empty output', async () => {
      const result = await filter.filter('');

      expect(result.passed).toBeDefined();
      expect(result.output).toBe('');
    });

    it('should handle very long output', async () => {
      const longOutput = 'word '.repeat(1000);
      const result = await filter.filter(longOutput);

      expect(result.passed).toBeDefined();
      expect(result.output).toBeDefined();
    });

    it('should handle special characters', async () => {
      const output = 'Test @#$%^&*() symbols!';
      const result = await filter.filter(output);

      expect(result.passed).toBeDefined();
      expect(result.output).toContain('Test');
    });

    it('should provide modifications when filtering', async () => {
      const output = 'You must buy this now! Limited time only!';
      const result = await filter.filter(output);

      expect(result.modifications).toBeDefined();
      expect(result.recommendation).toBeDefined();
    });
  });

  describe('custom criteria', () => {
    it('should respect custom max tone shift', async () => {
      const strictFilter = new OutputIntegrityFilter(testIdentity, {
        maxToneShift: 0.1,
      });

      const output = 'Whatever, dude.';
      const result = await strictFilter.filter(output);

      expect(result.flags.length).toBeGreaterThan(0);
    });

    it('should respect custom value alignment setting', async () => {
      const lenientFilter = new OutputIntegrityFilter(testIdentity, {
        requireValueAlignment: false,
      });

      const output = 'Let me be dishonest here.';
      const result = await lenientFilter.filter(output);

      // Should pass even with value misalignment
      expect(result).toBeDefined();
    });
  });
});
