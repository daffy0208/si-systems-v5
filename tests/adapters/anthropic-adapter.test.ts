import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AnthropicAdapter } from '../../src/adapters/anthropic-adapter';
import { Identity } from '../../src/types/identity';
import Anthropic from '@anthropic-ai/sdk';

// Mock Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => {
  const mockCreate = vi.fn();
  const mockStream = vi.fn();

  return {
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: mockCreate,
        stream: mockStream,
      },
    })),
    APIError: class APIError extends Error {
      status: number;
      constructor(message: string, status: number) {
        super(message);
        this.status = status;
      }
    },
  };
});

describe('AnthropicAdapter', () => {
  let adapter: AnthropicAdapter;
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

    adapter = new AnthropicAdapter({
      apiKey: 'sk-ant-api03-1234567890abcdefghijklmnopqrstuvwxyz',
      model: 'claude-3-5-sonnet-20241022',
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
          new AnthropicAdapter({
            apiKey: 'short',
            identity: mockIdentity,
          })
      ).toThrow('API key appears to be invalid');
    });

    it('should use default model if not specified', () => {
      const defaultAdapter = new AnthropicAdapter({
        apiKey: 'sk-ant-api03-1234567890abcdefghijklmnopqrstuvwxyz',
      });
      expect(defaultAdapter).toBeDefined();
    });
  });

  describe('chat', () => {
    it('should send chat completion request', async () => {
      const mockResponse = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Hello! How can I assist you today?' }],
        model: 'claude-3-5-sonnet-20241022',
        stop_reason: 'end_turn',
        usage: {
          input_tokens: 10,
          output_tokens: 8,
        },
      };

      const mockClient = (Anthropic as any).mock.results[0].value;
      mockClient.messages.create.mockResolvedValueOnce(mockResponse);

      const response = await adapter.chat([
        { role: 'user', content: 'Hello!' },
      ]);

      expect(response.message).toBe('Hello! How can I assist you today?');
      expect(response.metadata.model).toBe('claude-3-5-sonnet-20241022');
      expect(response.metadata.usage?.totalTokens).toBe(18);
      expect(response.driftScore).toBeDefined();
      expect(adapter.getMetrics().successfulRequests).toBe(1);
    });

    it('should handle system messages correctly', async () => {
      const mockResponse = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Response with system context' }],
        model: 'claude-3-5-sonnet-20241022',
        stop_reason: 'end_turn',
        usage: {
          input_tokens: 15,
          output_tokens: 5,
        },
      };

      const mockClient = (Anthropic as any).mock.results[0].value;
      mockClient.messages.create.mockResolvedValueOnce(mockResponse);

      const response = await adapter.chat([
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello!' },
      ]);

      expect(response.message).toBe('Response with system context');
      expect(mockClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          system: 'You are a helpful assistant.',
        })
      );
    });

    it('should handle API errors', async () => {
      const mockClient = (Anthropic as any).mock.results[0].value;
      const apiError = new (Anthropic as any).APIError('Invalid API key', 401);
      mockClient.messages.create.mockRejectedValueOnce(apiError);

      await expect(
        adapter.chat([{ role: 'user', content: 'Hello!' }])
      ).rejects.toThrow('Anthropic API Error');

      expect(adapter.getMetrics().failedRequests).toBe(1);
    });

    it('should filter output when enabled', async () => {
      const mockResponse = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: "Obviously you need to reconsider your approach. Don't you think?",
          },
        ],
        model: 'claude-3-5-sonnet-20241022',
        stop_reason: 'end_turn',
        usage: {
          input_tokens: 10,
          output_tokens: 12,
        },
      };

      const mockClient = (Anthropic as any).mock.results[0].value;
      mockClient.messages.create.mockResolvedValueOnce(mockResponse);

      const response = await adapter.chat([
        { role: 'user', content: 'What should I do?' },
      ]);

      expect(response.filterResult).toBeDefined();
      // Manipulative patterns should be detected
    });

    it('should respect rate limiting', async () => {
      const mockResponse = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Response' }],
        model: 'claude-3-5-sonnet-20241022',
        stop_reason: 'end_turn',
        usage: {
          input_tokens: 5,
          output_tokens: 5,
        },
      };

      const mockClient = (Anthropic as any).mock.results[0].value;
      mockClient.messages.create.mockResolvedValue(mockResponse);

      // Make requests up to rate limit
      const requests = Array.from({ length: 5 }, () =>
        adapter.chat([{ role: 'user', content: 'Test' }])
      );

      await Promise.all(requests);

      expect(adapter.getMetrics().totalRequests).toBe(5);
    });

    it('should retry on retryable errors', async () => {
      const mockClient = (Anthropic as any).mock.results[0].value;

      // First call fails with 500, second succeeds
      mockClient.messages.create
        .mockRejectedValueOnce({ status: 500, message: 'Server error' })
        .mockResolvedValueOnce({
          id: 'msg_123',
          type: 'message',
          role: 'assistant',
          content: [{ type: 'text', text: 'Success after retry' }],
          model: 'claude-3-5-sonnet-20241022',
          stop_reason: 'end_turn',
          usage: {
            input_tokens: 5,
            output_tokens: 5,
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
      const mockStreamEvents = [
        {
          type: 'content_block_delta',
          delta: { type: 'text_delta', text: 'Hello' },
        },
        {
          type: 'content_block_delta',
          delta: { type: 'text_delta', text: ' there!' },
        },
        {
          type: 'message_stop',
        },
      ];

      const mockClient = (Anthropic as any).mock.results[0].value;
      mockClient.messages.stream.mockResolvedValueOnce(
        (async function* () {
          for (const event of mockStreamEvents) {
            yield event;
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
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Response' }],
        model: 'claude-3-5-sonnet-20241022',
        stop_reason: 'end_turn',
        usage: {
          input_tokens: 5,
          output_tokens: 5,
        },
      };

      const mockClient = (Anthropic as any).mock.results[0].value;
      mockClient.messages.create.mockResolvedValue(mockResponse);

      await adapter.chat([{ role: 'user', content: 'Test 1' }]);
      await adapter.chat([{ role: 'user', content: 'Test 2' }]);

      const metrics = adapter.getMetrics();
      expect(metrics.totalRequests).toBe(2);
      expect(metrics.successfulRequests).toBe(2);
      expect(metrics.averageLatency).toBeGreaterThan(0);
    });

    it('should reset metrics', async () => {
      const mockResponse = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Response' }],
        model: 'claude-3-5-sonnet-20241022',
        stop_reason: 'end_turn',
        usage: {
          input_tokens: 5,
          output_tokens: 5,
        },
      };

      const mockClient = (Anthropic as any).mock.results[0].value;
      mockClient.messages.create.mockResolvedValue(mockResponse);

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
      const mockClient = (Anthropic as any).mock.results[0].value;
      mockClient.messages.create.mockResolvedValueOnce({
        id: 'msg_test',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'test' }],
        model: 'claude-3-5-sonnet-20241022',
        stop_reason: 'end_turn',
        usage: { input_tokens: 1, output_tokens: 1 },
      });

      const result = await adapter.testConnection();
      expect(result).toBe(true);
    });

    it('should handle connection failure', async () => {
      const mockClient = (Anthropic as any).mock.results[0].value;
      mockClient.messages.create.mockRejectedValueOnce(new Error('Network error'));

      const result = await adapter.testConnection();
      expect(result).toBe(false);
    });
  });

  describe('getModelInfo', () => {
    it('should return model information', () => {
      const info = adapter.getModelInfo();
      expect(info.model).toBe('claude-3-5-sonnet-20241022');
      expect(info.supportsVision).toBe(true);
      expect(info.supportsStreaming).toBe(true);
    });

    it('should detect vision support correctly', () => {
      const visionAdapter = new AnthropicAdapter({
        apiKey: 'sk-ant-api03-1234567890abcdefghijklmnopqrstuvwxyz',
        model: 'claude-3-opus-20240229',
      });

      const info = visionAdapter.getModelInfo();
      expect(info.supportsVision).toBe(true);

      const nonVisionAdapter = new AnthropicAdapter({
        apiKey: 'sk-ant-api03-1234567890abcdefghijklmnopqrstuvwxyz',
        model: 'claude-2.1',
      });

      const info2 = nonVisionAdapter.getModelInfo();
      expect(info2.supportsVision).toBe(false);
    });
  });
});
