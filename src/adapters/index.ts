/**
 * LLM Adapter Module
 *
 * Provides API wrappers for various LLM providers with built-in
 * drift detection, output filtering, and rate limiting.
 */

export { LLMAdapter } from './base-adapter';
export type {
  AdapterMessage,
  AdapterConfig,
  ChatOptions,
  ChatResponse,
  StreamChunk,
  AdapterMetrics,
} from './base-adapter';

export { OpenAIAdapter } from './openai-adapter';
export { AnthropicAdapter } from './anthropic-adapter';
