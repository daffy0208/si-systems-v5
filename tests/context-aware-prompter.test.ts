import { describe, it, expect, beforeEach } from 'vitest';
import { ContextAwarePrompter } from '../src/prompters/context-aware-prompter';
import { Identity } from '../src/types/identity';

describe('ContextAwarePrompter', () => {
  let prompter: ContextAwarePrompter;
  let testIdentity: Identity;

  beforeEach(() => {
    testIdentity = {
      tone: ['professional', 'empathetic'],
      communicationRhythm: 'thoughtful',
      coreValues: ['clarity', 'efficiency', 'respect'],
      decisionMakingStyle: 'analytical',
      informationPreference: 'examples',
      emotionalTone: 'measured',
      contextLevel: 'moderate',
    };

    prompter = new ContextAwarePrompter(testIdentity);
  });

  describe('generatePrompt', () => {
    it('should enhance basic prompt with identity context', () => {
      const userMessage = 'How do I configure the API?';
      const result = prompter.generatePrompt(userMessage);

      expect(result.userPrompt).toContain(userMessage);
      expect(result.systemPrompt).toBeDefined();
      expect(result.systemPrompt.length).toBeGreaterThan(0);
      expect(result.metadata).toBeDefined();
    });

    it('should include tone guidance', () => {
      const result = prompter.generatePrompt('Test message');

      expect(result.systemPrompt).toContain('professional');
      expect(result.systemPrompt).toContain('empathetic');
    });

    it('should include value context', () => {
      const result = prompter.generatePrompt('Test message');

      expect(result.systemPrompt.toLowerCase()).toContain('clarity');
    });

    it('should adapt to information preference', () => {
      const result = prompter.generatePrompt('Explain this concept');

      expect(result.systemPrompt.toLowerCase()).toContain('example');
    });

    it('should handle empty message', () => {
      const result = prompter.generatePrompt('');

      expect(result.userPrompt).toBeDefined();
      expect(result.systemPrompt).toBeDefined();
    });

    it('should handle very long messages', () => {
      const longMessage = 'word '.repeat(500);
      const result = prompter.generatePrompt(longMessage);

      expect(result.userPrompt).toContain('word');
      expect(result.systemPrompt).toBeDefined();
    });
  });

  describe('custom configuration', () => {
    it('should respect includeIdentityContext setting', () => {
      const basicPrompter = new ContextAwarePrompter(testIdentity, {
        includeIdentityContext: false,
      });

      const result = basicPrompter.generatePrompt('Test');

      expect(result.systemPrompt.length).toBeLessThan(500);
    });

    it('should respect emphasizeValues setting', () => {
      const noValuesPrompter = new ContextAwarePrompter(testIdentity, {
        emphasizeValues: false,
      });

      const result = noValuesPrompter.generatePrompt('Test');

      expect(result).toBeDefined();
      expect(result.systemPrompt).toBeDefined();
    });

    it('should respect adaptTone setting', () => {
      const noTonePrompter = new ContextAwarePrompter(testIdentity, {
        adaptTone: false,
      });

      const result = noTonePrompter.generatePrompt('Test');

      expect(result).toBeDefined();
      expect(result.systemPrompt).toBeDefined();
    });
  });

  describe('conversation history', () => {
    it('should track conversation history', () => {
      prompter.generatePrompt('First message');
      prompter.addAssistantResponse('First response');
      prompter.generatePrompt('Second message');

      const history = prompter.getHistory();

      expect(history).toBeDefined();
      expect(history.length).toBeGreaterThan(0);
    });

    it('should limit history length', () => {
      const limitedPrompter = new ContextAwarePrompter(testIdentity, {
        maxHistoryLength: 2,
      });

      for (let i = 0; i < 10; i++) {
        limitedPrompter.generatePrompt(`Message ${i}`);
        limitedPrompter.addAssistantResponse(`Response ${i}`);
      }

      const history = limitedPrompter.getHistory();

      expect(history.length).toBeLessThanOrEqual(4); // 2 turns = 4 messages (user + assistant)
    });
  });
});
