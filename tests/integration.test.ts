import { describe, it, expect, beforeEach } from 'vitest';
import { DriftDetector } from '../src/core/drift-detector';
import { EnhancedDriftDetector } from '../src/core/drift-detector-enhanced';
import { OutputIntegrityFilter } from '../src/filters/output-integrity-filter';
import { ContextAwarePrompter } from '../src/prompters/context-aware-prompter';
import {
  Identity,
  InteractionContext,
  IdentitySchema,
  DriftScoreSchema,
  InteractionContextSchema,
} from '../src/types/identity';

describe('Integration Tests', () => {
  let identity: Identity;

  beforeEach(() => {
    identity = {
      tone: ['formal', 'empathetic'],
      communicationRhythm: 'thoughtful',
      coreValues: ['transparency', 'efficiency', 'respect'],
      decisionMakingStyle: 'analytical',
      informationPreference: 'examples',
      emotionalTone: 'measured',
      contextLevel: 'moderate',
    };
  });

  describe('Full Workflow Integration', () => {
    it('should execute complete workflow: prompt -> detect -> filter', async () => {
      const prompter = new ContextAwarePrompter(identity);
      const detector = new DriftDetector(identity);
      const filter = new OutputIntegrityFilter(identity);

      // Step 1: Generate enhanced prompt
      const userMessage = 'How do I configure the API?';
      const enhancedPrompt = prompter.generatePrompt(userMessage);

      expect(enhancedPrompt.userPrompt).toContain(userMessage);
      expect(enhancedPrompt.systemPrompt).toBeDefined();
      expect(enhancedPrompt.systemPrompt).toContain('formal');

      // Step 2: Simulate AI response
      const aiResponse = 'You can configure the API in the settings dashboard.';

      // Step 3: Detect drift
      const context: InteractionContext = {
        userMessage,
        aiResponse,
      };

      const driftScore = await detector.detectDrift(context);

      expect(driftScore.overall).toBeGreaterThanOrEqual(0);
      expect(driftScore.overall).toBeLessThanOrEqual(1);
      expect(driftScore.recommendation).toBeDefined();

      // Step 4: Filter output
      const filterResult = await filter.filter(aiResponse, userMessage);

      expect(filterResult.passed).toBeDefined();
      expect(filterResult.output).toBeDefined();
    });

    it('should handle conversation history across workflow', async () => {
      const prompter = new ContextAwarePrompter(identity);
      const detector = new DriftDetector(identity);

      // Simulate multi-turn conversation
      const turns = [
        { user: 'Hello', ai: 'Hello! How can I help you?' },
        { user: 'I need help with setup', ai: 'I would be happy to guide you through setup.' },
        { user: 'What are the first steps?', ai: 'First, configure your API key in settings.' },
      ];

      for (const turn of turns) {
        // Generate prompt (adds user message to history)
        prompter.generatePrompt(turn.user);

        // Detect drift
        const driftScore = await detector.detectDrift({
          userMessage: turn.user,
          aiResponse: turn.ai,
        });

        expect(driftScore).toBeDefined();

        // Add AI response to history
        prompter.addAssistantResponse(turn.ai);
      }

      // Final prompt should have conversation context
      const finalPrompt = prompter.generatePrompt('Thank you!');
      const history = prompter.getHistory();
      expect(history).toBeDefined();
      expect(history.length).toBeGreaterThan(0);

      // Drift trend should be trackable
      const trend = detector.getDriftTrend();
      expect(trend.trend).toBeDefined();
    });
  });

  describe('Enhanced Detector Integration', () => {
    it('should work with NLP disabled', async () => {
      const detector = new EnhancedDriftDetector(identity, 0.3, {
        enableNLP: false,
      });

      const context: InteractionContext = {
        userMessage: 'Test message',
        aiResponse: 'Test response',
      };

      const result = await detector.detectDrift(context);

      expect(result.overall).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });

    it('should initialize and work with NLP enabled', async () => {
      const detector = new EnhancedDriftDetector(identity, 0.3, {
        enableNLP: true,
        nlpValueStatements: ['provide financial advice'],
      });

      await detector.initializeNLP();

      const context: InteractionContext = {
        userMessage: 'Should I invest?',
        aiResponse: 'Here are some general considerations about investing.',
      };

      const result = await detector.detectDrift(context);

      expect(result).toBeDefined();
      expect(result.overall).toBeGreaterThanOrEqual(0);
    });

    it('should provide enhanced stats', async () => {
      const detector = new EnhancedDriftDetector(identity, 0.3, {
        enableNLP: true,
      });

      await detector.initializeNLP();

      const stats = detector.getEnhancedStats();

      expect(stats.nlpEnabled).toBe(true);
      expect(stats.nlpInitialized).toBe(true);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle malformed input gracefully', async () => {
      const detector = new DriftDetector(identity);

      const context: InteractionContext = {
        userMessage: '',
        aiResponse: '',
      };

      const result = await detector.detectDrift(context);

      expect(result).toBeDefined();
      expect(result.overall).toBeGreaterThanOrEqual(0);
    });

    it('should handle special characters', async () => {
      const prompter = new ContextAwarePrompter(identity);
      const filter = new OutputIntegrityFilter(identity);

      const message = 'Test @#$%^&*() symbols!';
      const prompt = prompter.generatePrompt(message);
      const filterResult = await filter.filter(message);

      expect(prompt).toBeDefined();
      expect(filterResult).toBeDefined();
    });

    it('should handle very long inputs', async () => {
      const detector = new DriftDetector(identity);
      const longMessage = 'word '.repeat(1000);

      const context: InteractionContext = {
        userMessage: longMessage,
        aiResponse: longMessage,
      };

      const result = await detector.detectDrift(context);

      expect(result).toBeDefined();
    });
  });

  describe('Schema Validation Integration', () => {
    it('should validate identity schema', () => {
      const result = IdentitySchema.safeParse(identity);

      if (!result.success) {
        console.log('Identity validation errors:', result.error.issues);
      }

      expect(result.success).toBe(true);
    });

    it('should validate drift score schema', async () => {
      const detector = new DriftDetector(identity);

      const driftScore = await detector.detectDrift({
        userMessage: 'test',
        aiResponse: 'test',
      });

      const result = DriftScoreSchema.safeParse(driftScore);

      expect(result.success).toBe(true);
    });

    it('should validate interaction context schema', () => {
      const context = {
        userMessage: 'test',
        aiResponse: 'test',
      };

      const result = InteractionContextSchema.safeParse(context);

      expect(result.success).toBe(true);
    });
  });
});
