import { Identity, DriftScore } from '../types/identity';
import { DriftDetector } from '../core/drift-detector';
import { OutputIntegrityFilter, FilterResult } from '../filters/output-integrity-filter';

/**
 * Message format for chat completions
 */
export interface AdapterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Configuration for LLM adapter
 */
export interface AdapterConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  enableDriftDetection?: boolean;
  enableFiltering?: boolean;
  enableContextInjection?: boolean;
  identity?: Identity;
  driftThreshold?: number;
  timeout?: number;
  maxRetries?: number;
  rateLimitPerMinute?: number;
  debug?: boolean;
}

/**
 * Options for chat requests
 */
export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
  stream?: boolean;
}

/**
 * Response from chat completion
 */
export interface ChatResponse {
  message: string;
  driftScore?: DriftScore;
  filtered?: boolean;
  filterResult?: FilterResult;
  metadata: {
    model: string;
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    finishReason?: string;
    latency: number;
  };
}

/**
 * Chunk from streaming response
 */
export interface StreamChunk {
  delta: string;
  isComplete: boolean;
  metadata?: {
    finishReason?: string;
  };
}

/**
 * Adapter metrics for monitoring
 */
export interface AdapterMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalLatency: number;
  averageLatency: number;
  rateLimitHits: number;
  retries: number;
}

/**
 * Base LLM Adapter Interface
 *
 * Defines the contract for all LLM provider adapters with built-in
 * drift detection, output filtering, and rate limiting.
 */
export abstract class LLMAdapter {
  protected config: Required<AdapterConfig>;
  protected driftDetector?: DriftDetector;
  protected outputFilter?: OutputIntegrityFilter;
  protected metrics: AdapterMetrics;
  protected requestTimestamps: number[] = [];

  constructor(config: AdapterConfig) {
    // Set defaults
    this.config = {
      temperature: 0.7,
      maxTokens: 2000,
      enableDriftDetection: true,
      enableFiltering: true,
      enableContextInjection: false,
      driftThreshold: 0.3,
      timeout: 30000,
      maxRetries: 3,
      rateLimitPerMinute: 60,
      debug: false,
      ...config,
      model: config.model || this.getDefaultModel(),
    } as Required<AdapterConfig>;

    // Initialize drift detection if enabled and identity provided
    if (this.config.enableDriftDetection && this.config.identity) {
      this.driftDetector = new DriftDetector(
        this.config.identity,
        this.config.driftThreshold
      );
    }

    // Initialize output filter if enabled and identity provided
    if (this.config.enableFiltering && this.config.identity) {
      this.outputFilter = new OutputIntegrityFilter(this.config.identity);
    }

    // Initialize metrics
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalLatency: 0,
      averageLatency: 0,
      rateLimitHits: 0,
      retries: 0,
    };
  }

  /**
   * Get the default model for this adapter
   */
  protected abstract getDefaultModel(): string;

  /**
   * Send a chat completion request
   */
  abstract chat(messages: AdapterMessage[], options?: ChatOptions): Promise<ChatResponse>;

  /**
   * Send a streaming chat completion request
   */
  abstract stream(
    messages: AdapterMessage[],
    options?: ChatOptions
  ): AsyncIterable<StreamChunk>;

  /**
   * Update adapter configuration
   */
  configure(config: Partial<AdapterConfig>): void {
    this.config = { ...this.config, ...config } as Required<AdapterConfig>;

    // Re-initialize components if needed
    if (config.identity) {
      if (this.config.enableDriftDetection) {
        this.driftDetector = new DriftDetector(
          this.config.identity,
          this.config.driftThreshold
        );
      }
      if (this.config.enableFiltering) {
        this.outputFilter = new OutputIntegrityFilter(this.config.identity);
      }
    }
  }

  /**
   * Get current adapter metrics
   */
  getMetrics(): AdapterMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalLatency: 0,
      averageLatency: 0,
      rateLimitHits: 0,
      retries: 0,
    };
  }

  /**
   * Check rate limit before making request
   */
  protected async checkRateLimit(): Promise<void> {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Remove timestamps older than 1 minute
    this.requestTimestamps = this.requestTimestamps.filter(
      (timestamp) => timestamp > oneMinuteAgo
    );

    // Check if we've hit the rate limit
    if (this.requestTimestamps.length >= this.config.rateLimitPerMinute) {
      this.metrics.rateLimitHits++;
      const oldestRequest = this.requestTimestamps[0];
      const waitTime = 60000 - (now - oldestRequest);

      if (this.config.debug) {
        console.log(`Rate limit hit. Waiting ${waitTime}ms...`);
      }

      await this.sleep(waitTime);
      // Recursive call to check again after waiting
      return this.checkRateLimit();
    }

    // Add current timestamp
    this.requestTimestamps.push(now);
  }

  /**
   * Perform drift detection on response
   */
  protected async performDriftDetection(
    userMessage: string,
    aiResponse: string
  ): Promise<DriftScore | undefined> {
    if (!this.driftDetector) return undefined;

    const driftScore = await this.driftDetector.detectDrift({
      userMessage,
      aiResponse,
      conversationHistory: [],
    });

    if (this.config.debug) {
      console.log('Drift Score:', {
        overall: driftScore.overall,
        recommendation: driftScore.recommendation,
        flags: driftScore.flags,
      });
    }

    return driftScore;
  }

  /**
   * Filter output for integrity
   */
  protected async filterOutput(
    output: string,
    userContext?: string
  ): Promise<FilterResult | undefined> {
    if (!this.outputFilter) return undefined;

    const result = await this.outputFilter.filter(output, userContext);

    if (this.config.debug && !result.passed) {
      console.log('Output Filter:', {
        recommendation: result.recommendation,
        flags: result.flags,
        modifications: result.modifications,
      });
    }

    return result;
  }

  /**
   * Exponential backoff retry logic
   */
  protected async retryWithBackoff<T>(
    fn: () => Promise<T>,
    attempt: number = 0
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      const isRetryable = this.isRetryableError(error);

      if (attempt >= this.config.maxRetries || !isRetryable) {
        throw error;
      }

      this.metrics.retries++;
      const delay = Math.min(1000 * Math.pow(2, attempt), 10000);

      if (this.config.debug) {
        console.log(`Retry attempt ${attempt + 1} after ${delay}ms...`);
      }

      await this.sleep(delay);
      return this.retryWithBackoff(fn, attempt + 1);
    }
  }

  /**
   * Check if error is retryable
   */
  protected isRetryableError(error: any): boolean {
    // Network errors
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      return true;
    }

    // Rate limit errors (should be handled by rate limiter, but just in case)
    if (error.status === 429) {
      return true;
    }

    // Server errors (5xx)
    if (error.status >= 500 && error.status < 600) {
      return true;
    }

    return false;
  }

  /**
   * Sleep for specified milliseconds
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Update metrics after request
   */
  protected updateMetrics(latency: number, success: boolean): void {
    this.metrics.totalRequests++;
    this.metrics.totalLatency += latency;

    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }

    this.metrics.averageLatency =
      this.metrics.totalLatency / this.metrics.totalRequests;
  }

  /**
   * Validate API key format (basic security check)
   */
  protected validateApiKey(key: string): void {
    if (!key || key.trim().length === 0) {
      throw new Error('API key is required');
    }

    if (key.length < 20) {
      throw new Error('API key appears to be invalid (too short)');
    }

    // Never log the actual key
    if (this.config.debug) {
      console.log(`API key validated (length: ${key.length})`);
    }
  }
}
