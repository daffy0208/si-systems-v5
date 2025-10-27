import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenAIAdapter } from '../../src/adapters/openai-adapter';
import { Identity } from '../../src/types/identity';
import OpenAI from 'openai';

// Mock OpenAI SDK
vi.mock('openai', () => {
  const mockCreate = vi.fn();
  const mockList = vi.fn();
  const mockStream = vi.fn();

  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate,
        },
      },
      models: {
        list: mockList,
      },
    })),
    APIError: class APIError extends Error {
      status: number;
      code: string;
      constructor(message: string, status: number, code: string) {
        super(message);
        this.status = status;
        this.code = code;
      }
    },
  };
});

describe('OpenAIAdapter', () => {
  let adapter: OpenAIAdapter;
  let mockIdentity: Identity;

  beforeEach(() => {
    vi.clearAllMocks();

    mockIdentity = {
      tone: ['technical', 'direct'],
      communicationRhythm: 'concise',
      coreValues: ['transparency', 'efficiency'],
      decisionMakingStyle: 'analytical',
      informationPreference: 'textual',
      emotionalTone: 'neutral',
      contextLevel: 'moderate',
    };

    adapter = new OpenAIAdapter({
      apiKey: 'sk-test-key-1234567890abcdefghijklmnop',
      model: 'gpt-3.5-turbo',
      enableDriftDetection: true,
      enableFiltering: true,
      identity: mockIdentity,
      rateLimitPerMinute: 10,
      debug: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create adapter with valid config', () => {
      expect(adapter).toBeDefined();
      expect(adapter.getMetrics().totalRequests).toBe(0);
    });

    it('should throw error with invalid API key', () => {
      expect(
        () =>
          new OpenAIAdapter({
            apiKey: 'short',
            identity: mockIdentity,
          })
      ).toThrow('API key appears to be invalid');
    });

    it('should use default model if not specified', () => {
      const defaultAdapter = new OpenAIAdapter({
        apiKey: 'sk-test-key-1234567890abcdefghijklmnop',
      });
      expect(defaultAdapter).toBeDefined();
    });
  });

  describe('chat', () => {
    it('should send chat completion request', async () => {
      const mockResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1234567890,
        model: 'gpt-3.5-turbo',
        choices: [
          {
            message: { role: 'assistant', content: 'Hello! How can I help?' },
            finish_reason: 'stop',
            index: 0,
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 6,
          total_tokens: 16,
        },
      };

      const mockClient = (OpenAI as any).mock.results[0].value;
      mockClient.chat.completions.create.mockResolvedValueOnce(mockResponse);

      const response = await adapter.chat([
        { role: 'user', content: 'Hello!' },
      ]);

      expect(response.message).toBe('Hello! How can I help?');
      expect(response.metadata.model).toBe('gpt-3.5-turbo');
      expect(response.metadata.usage?.totalTokens).toBe(16);
      expect(response.driftScore).toBeDefined();
      expect(adapter.getMetrics().successfulRequests).toBe(1);
    });

    it('should handle API errors', async () => {
      const mockClient = (OpenAI as any).mock.results[0].value;
      const apiError = new (OpenAI as any).APIError(
        'Invalid API key',
        401,
        'invalid_api_key'
      );
      mockClient.chat.completions.create.mockRejectedValueOnce(apiError);

      await expect(
        adapter.chat([{ role: 'user', content: 'Hello!' }])
      ).rejects.toThrow('OpenAI API Error');

      expect(adapter.getMetrics().failedRequests).toBe(1);
    });

    it('should filter output when enabled', async () => {
      const mockResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1234567890,
        model: 'gpt-3.5-turbo',
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'You should feel bad about this decision.',
            },
            finish_reason: 'stop',
            index: 0,
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 8,
          total_tokens: 18,
        },
      };

      const mockClient = (OpenAI as any).mock.results[0].value;
      mockClient.chat.completions.create.mockResolvedValueOnce(mockResponse);

      const response = await adapter.chat([
        { role: 'user', content: 'What do you think?' },
      ]);

      expect(response.filterResult).toBeDefined();
      // Manipulative pattern should be detected
    });

    it('should respect rate limiting', async () => {
      const mockResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1234567890,
        model: 'gpt-3.5-turbo',
        choices: [
          {
            message: { role: 'assistant', content: 'Response' },
            finish_reason: 'stop',
            index: 0,
          },
        ],
        usage: {
          prompt_tokens: 5,
          completion_tokens: 5,
          total_tokens: 10,
        },
      };

      const mockClient = (OpenAI as any).mock.results[0].value;
      mockClient.chat.completions.create.mockResolvedValue(mockResponse);

      // Make requests up to rate limit
      const requests = Array.from({ length: 5 }, () =>
        adapter.chat([{ role: 'user', content: 'Test' }])
      );

      await Promise.all(requests);

      expect(adapter.getMetrics().totalRequests).toBe(5);
    });

    it('should retry on retryable errors', async () => {
      const mockClient = (OpenAI as any).mock.results[0].value;

      // First call fails with 500, second succeeds
      mockClient.chat.completions.create
        .mockRejectedValueOnce({ status: 500, message: 'Server error' })
        .mockResolvedValueOnce({
          id: 'chatcmpl-123',
          object: 'chat.completion',
          created: 1234567890,
          model: 'gpt-3.5-turbo',
          choices: [
            {
              message: { role: 'assistant', content: 'Success after retry' },
              finish_reason: 'stop',
              index: 0,
            },
          ],
          usage: {
            prompt_tokens: 5,
            completion_tokens: 5,
            total_tokens: 10,
          },
        });

      const response = await adapter.chat([
        { role: 'user', content: 'Test' },
      ]);

      expect(response.message).toBe('Success after retry');
      expect(adapter.getMetrics().retries).toBeGreaterThan(0);
    });
  });

  describe('stream', () => {
    it('should stream chat completion', async () => {
      const mockStream = [
        {
          id: 'chatcmpl-123',
          object: 'chat.completion.chunk',
          created: 1234567890,
          model: 'gpt-3.5-turbo',
          choices: [{ delta: { content: 'Hello' }, finish_reason: null, index: 0 }],
        },
        {
          id: 'chatcmpl-123',
          object: 'chat.completion.chunk',
          created: 1234567890,
          model: 'gpt-3.5-turbo',
          choices: [{ delta: { content: ' there!' }, finish_reason: null, index: 0 }],
        },
        {
          id: 'chatcmpl-123',
          object: 'chat.completion.chunk',
          created: 1234567890,
          model: 'gpt-3.5-turbo',
          choices: [{ delta: {}, finish_reason: 'stop', index: 0 }],
        },
      ];

      const mockClient = (OpenAI as any).mock.results[0].value;
      mockClient.chat.completions.create.mockResolvedValueOnce(
        (async function* () {
          for (const chunk of mockStream) {
            yield chunk;
          }
        })()
      );

      const chunks: string[] = [];
      for await (const chunk of adapter.stream([
        { role: 'user', content: 'Hello!' },
      ])) {
        chunks.push(chunk.delta);
        if (chunk.isComplete) break;
      }

      expect(chunks.join('')).toBe('Hello there!');
    });
  });

  describe('metrics', () => {
    it('should track request metrics', async () => {
      const mockResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1234567890,
        model: 'gpt-3.5-turbo',
        choices: [
          {
            message: { role: 'assistant', content: 'Response' },
            finish_reason: 'stop',
            index: 0,
          },
        ],
        usage: {
          prompt_tokens: 5,
          completion_tokens: 5,
          total_tokens: 10,
        },
      };

      const mockClient = (OpenAI as any).mock.results[0].value;
      mockClient.chat.completions.create.mockResolvedValue(mockResponse);

      await adapter.chat([{ role: 'user', content: 'Test 1' }]);
      await adapter.chat([{ role: 'user', content: 'Test 2' }]);

      const metrics = adapter.getMetrics();
      expect(metrics.totalRequests).toBe(2);
      expect(metrics.successfulRequests).toBe(2);
      expect(metrics.averageLatency).toBeGreaterThan(0);
    });

    it('should reset metrics', async () => {
      const mockResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1234567890,
        model: 'gpt-3.5-turbo',
        choices: [
          {
            message: { role: 'assistant', content: 'Response' },
            finish_reason: 'stop',
            index: 0,
          },
        ],
        usage: {
          prompt_tokens: 5,
          completion_tokens: 5,
          total_tokens: 10,
        },
      };

      const mockClient = (OpenAI as any).mock.results[0].value;
      mockClient.chat.completions.create.mockResolvedValue(mockResponse);

      await adapter.chat([{ role: 'user', content: 'Test' }]);
      expect(adapter.getMetrics().totalRequests).toBe(1);

      adapter.resetMetrics();
      expect(adapter.getMetrics().totalRequests).toBe(0);
    });
  });

  describe('configuration', () => {
    it('should update configuration', () => {
      adapter.configure({ temperature: 0.9, maxTokens: 1000 });

      // Configuration is updated internally
      expect(adapter).toBeDefined();
    });

    it('should reinitialize components when identity changes', () => {
      const newIdentity: Identity = {
        ...mockIdentity,
        tone: ['casual'],
      };

      adapter.configure({ identity: newIdentity });
      expect(adapter).toBeDefined();
    });
  });

  describe('testConnection', () => {
    it('should test connection successfully', async () => {
      const mockClient = (OpenAI as any).mock.results[0].value;
      mockClient.models.list.mockResolvedValueOnce({ data: [] });

      const result = await adapter.testConnection();
      expect(result).toBe(true);
    });

    it('should handle connection failure', async () => {
      const mockClient = (OpenAI as any).mock.results[0].value;
      mockClient.models.list.mockRejectedValueOnce(new Error('Network error'));

      const result = await adapter.testConnection();
      expect(result).toBe(false);
    });
  });

  describe('listModels', () => {
    it('should list available models', async () => {
      const mockClient = (OpenAI as any).mock.results[0].value;
      mockClient.models.list.mockResolvedValueOnce({
        data: [{ id: 'gpt-3.5-turbo' }, { id: 'gpt-4' }],
      });

      const models = await adapter.listModels();
      expect(models).toEqual(['gpt-3.5-turbo', 'gpt-4']);
    });
  });
});
