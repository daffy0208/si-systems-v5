import OpenAI from 'openai';
import {
  LLMAdapter,
  AdapterMessage,
  ChatOptions,
  ChatResponse,
  StreamChunk,
  AdapterConfig,
} from './base-adapter';

/**
 * OpenAI API Adapter
 *
 * Wraps the OpenAI API with automatic drift detection, output filtering,
 * and rate limiting for SI Systems integration.
 *
 * @example
 * ```typescript
 * const adapter = new OpenAIAdapter({
 *   apiKey: process.env.OPENAI_API_KEY!,
 *   model: 'gpt-4',
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
export class OpenAIAdapter extends LLMAdapter {
  private client: OpenAI;

  constructor(config: AdapterConfig) {
    super(config);
    this.validateApiKey(config.apiKey);

    this.client = new OpenAI({
      apiKey: config.apiKey,
      timeout: config.timeout,
    });
  }

  /**
   * Get default OpenAI model
   */
  protected getDefaultModel(): string {
    return 'gpt-3.5-turbo';
  }

  /**
   * Send chat completion request
   */
  async chat(messages: AdapterMessage[], options?: ChatOptions): Promise<ChatResponse> {
    const startTime = Date.now();

    try {
      // Check rate limit
      await this.checkRateLimit();

      // Make request with retry logic
      const completion = await this.retryWithBackoff(async () => {
        return await this.client.chat.completions.create({
          model: this.config.model,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          temperature: options?.temperature ?? this.config.temperature,
          max_tokens: options?.maxTokens ?? this.config.maxTokens,
          top_p: options?.topP,
          frequency_penalty: options?.frequencyPenalty,
          presence_penalty: options?.presencePenalty,
          stop: options?.stop,
          stream: false,
        });
      });

      const latency = Date.now() - startTime;
      const message = completion.choices[0]?.message?.content || '';

      // Extract user message for drift detection
      const userMessage = messages.filter((m) => m.role === 'user').pop()?.content || '';

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
          usage: completion.usage
            ? {
                promptTokens: completion.usage.prompt_tokens,
                completionTokens: completion.usage.completion_tokens,
                totalTokens: completion.usage.total_tokens,
              }
            : undefined,
          finishReason: completion.choices[0]?.finish_reason,
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

      // Make streaming request
      const stream = await this.client.chat.completions.create({
        model: this.config.model,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature: options?.temperature ?? this.config.temperature,
        max_tokens: options?.maxTokens ?? this.config.maxTokens,
        top_p: options?.topP,
        frequency_penalty: options?.frequencyPenalty,
        presence_penalty: options?.presencePenalty,
        stop: options?.stop,
        stream: true,
      });

      let fullMessage = '';

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || '';
        const isComplete = chunk.choices[0]?.finish_reason !== null;

        fullMessage += delta;

        yield {
          delta,
          isComplete,
          metadata: isComplete
            ? {
                finishReason: chunk.choices[0]?.finish_reason || undefined,
              }
            : undefined,
        };

        if (isComplete) {
          // Perform drift detection on complete message
          if (this.config.enableDriftDetection) {
            const userMessage =
              messages.filter((m) => m.role === 'user').pop()?.content || '';
            await this.performDriftDetection(userMessage, fullMessage);
          }

          // Note: Streaming doesn't apply filtering in real-time
          // Filtering would need to be done on the complete message client-side
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
    if (error instanceof OpenAI.APIError) {
      const enhancedError = new Error(
        `OpenAI API Error (${error.status}): ${error.message}`
      );
      (enhancedError as any).originalError = error;
      (enhancedError as any).status = error.status;
      (enhancedError as any).code = error.code;
      return enhancedError;
    }

    if (error.message?.includes('API key')) {
      return new Error('OpenAI API key is invalid or missing');
    }

    return error;
  }

  /**
   * Test connection to OpenAI API
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.client.models.list();
      return true;
    } catch (error) {
      if (this.config.debug) {
        console.error('OpenAI connection test failed:', error);
      }
      return false;
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await this.client.models.list();
      return response.data.map((model) => model.id);
    } catch (error) {
      throw this.enhanceError(error);
    }
  }
}
