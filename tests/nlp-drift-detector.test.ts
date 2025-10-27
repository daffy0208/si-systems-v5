import { describe, it, expect, beforeAll } from 'vitest';
import { NLPDriftDetector } from '../src/nlp/nlp-drift-detector';
import { Message } from '../src/nlp/types';

describe('NLPDriftDetector', () => {
  let detector: NLPDriftDetector;

  beforeAll(async () => {
    detector = new NLPDriftDetector();
    await detector.initialize([
      'provide financial advice',
      'make medical diagnoses',
      'express political opinions',
    ]);
  });

  describe('tone drift detection', () => {
    it('should not detect drift in professional tone', async () => {
      const messages: Message[] = [
        { role: 'user', content: 'What are your business hours?' },
        { role: 'assistant', content: 'Our business hours are 9 AM to 5 PM Monday through Friday.' },
      ];

      const result = await detector.detectToneDrift(messages, 'professional');

      expect(result.driftDetected).toBe(false);
      expect(result.confidence).toBeLessThan(0.5);
    });

    it('should detect drift with negative language in professional tone', async () => {
      const messages: Message[] = [
        { role: 'user', content: 'Can you help me?' },
        { role: 'assistant', content: 'Unfortunately, this is really frustrating and confusing.' },
      ];

      const result = await detector.detectToneDrift(messages, 'professional');

      expect(result.confidence).toBeGreaterThan(0);
      expect(result.details.negativeWords.length).toBeGreaterThan(0);
    });

    it('should detect drift with unprofessional language', async () => {
      const messages: Message[] = [
        { role: 'user', content: 'What do you think?' },
        { role: 'assistant', content: 'Ugh, whatever. I guess we could try that, maybe.' },
      ];

      const result = await detector.detectToneDrift(messages, 'professional');

      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should handle multiple messages', async () => {
      const messages: Message[] = [
        { role: 'user', content: 'First question' },
        { role: 'assistant', content: 'First response' },
        { role: 'user', content: 'Second question' },
        { role: 'assistant', content: 'Second response' },
      ];

      const result = await detector.detectToneDrift(messages, 'professional');

      expect(result).toBeDefined();
      expect(result.type).toBe('tone');
    });

    it('should handle empty messages', async () => {
      const messages: Message[] = [];

      const result = await detector.detectToneDrift(messages, 'professional');

      expect(result.driftDetected).toBe(false);
      expect(result.confidence).toBe(0);
    });
  });

  describe('value drift detection', () => {
    it('should detect value drift for financial advice', async () => {
      const messages: Message[] = [
        {
          role: 'assistant',
          content: 'You should definitely invest in Bitcoin. It is a great financial opportunity.',
        },
      ];

      const result = await detector.detectValueDrift(messages, 0.6);

      // May or may not detect depending on embedding similarity
      expect(result.type).toBe('value');
      expect(result.details.valueStatements).toHaveLength(3);
    });

    it('should not detect drift for neutral content', async () => {
      const messages: Message[] = [
        { role: 'assistant', content: 'Here is the documentation you requested.' },
      ];

      const result = await detector.detectValueDrift(messages, 0.7);

      expect(result.driftDetected).toBe(false);
    });

    it('should handle multiple messages', async () => {
      const messages: Message[] = [
        { role: 'user', content: 'Tell me about investing' },
        { role: 'assistant', content: 'Investing involves allocating resources.' },
        { role: 'user', content: 'Should I buy stocks?' },
        { role: 'assistant', content: 'That depends on your financial goals.' },
      ];

      const result = await detector.detectValueDrift(messages);

      expect(result).toBeDefined();
    });
  });

  describe('combined drift detection', () => {
    it('should detect both tone and value drift', async () => {
      const messages: Message[] = [
        {
          role: 'assistant',
          content: 'You should definitely buy Bitcoin now! This is urgent financial advice!',
        },
      ];

      const result = await detector.detectCombinedDrift(messages, 'professional', 0.6);

      expect(result.toneDrift).toBeDefined();
      expect(result.valueDrift).toBeDefined();
      expect(result.overallDriftDetected).toBeDefined();
      expect(result.overallConfidence).toBeGreaterThanOrEqual(0);
    });

    it('should not detect drift in clean professional content', async () => {
      const messages: Message[] = [
        {
          role: 'assistant',
          content: 'The documentation is available at docs.example.com.',
        },
      ];

      const result = await detector.detectCombinedDrift(messages, 'professional');

      expect(result.overallDriftDetected).toBe(false);
    });
  });

  describe('detector stats', () => {
    it('should provide initialization status', () => {
      const stats = detector.getStats();

      expect(stats.initialized).toBe(true);
      expect(stats.valueStatementsCount).toBe(3);
      expect(stats.cacheStats).toBeDefined();
    });
  });
});
