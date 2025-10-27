import Anthropic from '@anthropic-ai/sdk';
import {
  LLMAdapter,
  AdapterMessage,
  ChatOptions,
  ChatResponse,
  StreamChunk,
  AdapterConfig,
} from './base-adapter';

/**
 * Anthropic Claude API Adapter
 *
 * Wraps the Anthropic API with automatic drift detection, output filtering,
 * and rate limiting for SI Systems integration.
 *
 * @example
 * ```typescript
 * const adapter = new AnthropicAdapter({
 *   apiKey: process.env.ANTHROPIC_API_KEY!,
 *   model: 'claude-3-5-sonnet-20241022',
 *   enableDriftDetection: true,
 *   enableFiltering: true,
 *   identity: myIdentity,
 * });
 *
 * const response = await adapter.chat([
 *   { role: 'user', content: 'Hello!' }
 * ]);
 *
 * console.log(response.message);
 * console.log('Drift Score:', response.driftScore?.overall);
 * ```
 */
export class AnthropicAdapter extends LLMAdapter {
  private client: Anthropic;

  constructor(config: AdapterConfig) {
    super(config);
    this.validateApiKey(config.apiKey);

    this.client = new Anthropic({
      apiKey: config.apiKey,
      timeout: config.timeout,
    });
  }

  /**
   * Get default Anthropic model
   */
  protected getDefaultModel(): string {
    return 'claude-3-5-sonnet-20241022';
  }

  /**
   * Send chat completion request
   */
  async chat(messages: AdapterMessage[], options?: ChatOptions): Promise<ChatResponse> {
    const startTime = Date.now();

    try {
      // Check rate limit
      await this.checkRateLimit();

      // Separate system message from conversation messages
      const systemMessage = messages.find((m) => m.role === 'system')?.content;
      const conversationMessages = messages.filter((m) => m.role !== 'system');

      // Convert to Anthropic format
      const anthropicMessages = conversationMessages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      // Make request with retry logic
      const completion = await this.retryWithBackoff(async () => {
        return await this.client.messages.create({
          model: this.config.model,
          max_tokens: options?.maxTokens ?? this.config.maxTokens,
          messages: anthropicMessages,
          temperature: options?.temperature ?? this.config.temperature,
          top_p: options?.topP,
          system: systemMessage,
          stop_sequences: options?.stop,
          stream: false,
        });
      });

      const latency = Date.now() - startTime;
      const message =
        completion.content
          .filter((block) => block.type === 'text')
          .map((block) => (block as any).text)
          .join('') || '';

      // Extract user message for drift detection
      const userMessage =
        conversationMessages.filter((m) => m.role === 'user').pop()?.content || '';

      // Perform drift detection if enabled
      let driftScore;
      if (this.config.enableDriftDetection) {
        driftScore = await this.performDriftDetection(userMessage, message);
      }

      // Filter output if enabled
      let filterResult;
      let finalMessage = message;
      if (this.config.enableFiltering) {
        filterResult = await this.filterOutput(message, userMessage);
        if (filterResult && filterResult.recommendation === 'modify') {
          finalMessage = filterResult.output;
        } else if (filterResult && filterResult.recommendation === 'block') {
          throw new Error('Message blocked by integrity filter');
        }
      }

      // Update metrics
      this.updateMetrics(latency, true);

      return {
        message: finalMessage,
        driftScore,
        filtered: filterResult?.recommendation === 'modify',
        filterResult,
        metadata: {
          model: completion.model,
          usage: {
            promptTokens: completion.usage.input_tokens,
            completionTokens: completion.usage.output_tokens,
            totalTokens: completion.usage.input_tokens + completion.usage.output_tokens,
          },
          finishReason: completion.stop_reason || undefined,
          latency,
        },
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      this.updateMetrics(latency, false);

      // Enhance error with context
      throw this.enhanceError(error);
    }
  }

  /**
   * Stream chat completion
   */
  async *stream(
    messages: AdapterMessage[],
    options?: ChatOptions
  ): AsyncIterable<StreamChunk> {
    try {
      // Check rate limit
      await this.checkRateLimit();

      // Separate system message from conversation messages
      const systemMessage = messages.find((m) => m.role === 'system')?.content;
      const conversationMessages = messages.filter((m) => m.role !== 'system');

      // Convert to Anthropic format
      const anthropicMessages = conversationMessages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      // Make streaming request
      const stream = await this.client.messages.stream({
        model: this.config.model,
        max_tokens: options?.maxTokens ?? this.config.maxTokens,
        messages: anthropicMessages,
        temperature: options?.temperature ?? this.config.temperature,
        top_p: options?.topP,
        system: systemMessage,
        stop_sequences: options?.stop,
      });

      let fullMessage = '';

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          const delta = event.delta.text;
          fullMessage += delta;

          yield {
            delta,
            isComplete: false,
          };
        } else if (event.type === 'message_stop') {
          yield {
            delta: '',
            isComplete: true,
            metadata: {
              finishReason: 'stop',
            },
          };

          // Perform drift detection on complete message
          if (this.config.enableDriftDetection) {
            const userMessage =
              conversationMessages.filter((m) => m.role === 'user').pop()?.content || '';
            await this.performDriftDetection(userMessage, fullMessage);
          }
        }
      }
    } catch (error) {
      throw this.enhanceError(error);
    }
  }

  /**
   * Enhance error with helpful context
   */
  private enhanceError(error: any): Error {
    if (error instanceof Anthropic.APIError) {
      const enhancedError = new Error(
        `Anthropic API Error (${error.status}): ${error.message}`
      );
      (enhancedError as any).originalError = error;
      (enhancedError as any).status = error.status;
      return enhancedError;
    }

    if (error.message?.includes('API key')) {
      return new Error('Anthropic API key is invalid or missing');
    }

    return error;
  }

  /**
   * Test connection to Anthropic API
   */
  async testConnection(): Promise<boolean> {
    try {
      // Anthropic doesn't have a models.list endpoint
      // We'll test with a minimal request instead
      await this.client.messages.create({
        model: this.config.model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'test' }],
      });
      return true;
    } catch (error) {
      if (this.config.debug) {
        console.error('Anthropic connection test failed:', error);
      }
      return false;
    }
  }

  /**
   * Get model information
   */
  getModelInfo(): {
    model: string;
    maxTokens: number;
    supportsVision: boolean;
    supportsStreaming: boolean;
  } {
    const visionModels = ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'];
    const supportsVision = visionModels.some((vm) => this.config.model.includes(vm));

    return {
      model: this.config.model,
      maxTokens: this.config.maxTokens,
      supportsVision,
      supportsStreaming: true,
    };
  }
}
