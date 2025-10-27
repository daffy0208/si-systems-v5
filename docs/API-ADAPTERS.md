# API Adapters Documentation

**SI Systems API Integration Adapters for LLM Providers**

## Overview

The API Adapters module provides wrapper classes for major LLM providers (OpenAI and Anthropic Claude) that transparently integrate SI Systems' drift detection, output filtering, and context-aware prompting capabilities. These adapters allow you to use your preferred LLM while automatically maintaining identity alignment and communication coherence.

## Features

- **Automatic Drift Detection**: Every response is analyzed for identity drift across 4 dimensions (tone, values, rhythm, context)
- **Output Integrity Filtering**: Responses are filtered to prevent manipulative patterns and value misalignment
- **Rate Limiting**: Built-in rate limiting to prevent API quota exhaustion
- **Retry Logic**: Exponential backoff retry for transient failures
- **Streaming Support**: Real-time streaming responses with drift detection
- **Metrics Tracking**: Monitor request counts, latency, retries, and rate limit hits
- **Security**: API key validation, secure error handling, and no key logging
- **TypeScript**: Full type safety with comprehensive interfaces

## Installation

The adapters are included in the core SI Systems package:

```bash
npm install @si-systems/core
```

You'll also need API keys from the providers:

```bash
# OpenAI
export OPENAI_API_KEY="sk-..."

# Anthropic
export ANTHROPIC_API_KEY="sk-ant-..."
```

## Quick Start

### OpenAI Adapter

```typescript
import { OpenAIAdapter, Identity } from '@si-systems/core';

// Define your identity
const myIdentity: Identity = {
  tone: ['technical', 'direct'],
  communicationRhythm: 'concise',
  coreValues: ['transparency', 'efficiency'],
  decisionMakingStyle: 'analytical',
  informationPreference: 'textual',
  emotionalTone: 'neutral',
  contextLevel: 'moderate',
};

// Create adapter
const adapter = new OpenAIAdapter({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-3.5-turbo',
  enableDriftDetection: true,
  enableFiltering: true,
  identity: myIdentity,
});

// Send message
const response = await adapter.chat([
  { role: 'user', content: 'Explain TypeScript' }
]);

console.log(response.message);
console.log('Drift score:', response.driftScore?.overall);
```

### Anthropic Adapter

```typescript
import { AnthropicAdapter, Identity } from '@si-systems/core';

const adapter = new AnthropicAdapter({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  model: 'claude-3-5-sonnet-20241022',
  enableDriftDetection: true,
  enableFiltering: true,
  identity: myIdentity,
});

const response = await adapter.chat([
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'What is async/await?' }
]);

console.log(response.message);
```

## Configuration

### AdapterConfig Interface

```typescript
interface AdapterConfig {
  // Required
  apiKey: string;

  // Optional
  model?: string;                    // Default: provider-specific
  temperature?: number;              // Default: 0.7
  maxTokens?: number;               // Default: 2000
  enableDriftDetection?: boolean;   // Default: true
  enableFiltering?: boolean;        // Default: true
  enableContextInjection?: boolean; // Default: false
  identity?: Identity;              // Required for drift/filter
  driftThreshold?: number;          // Default: 0.3
  timeout?: number;                 // Default: 30000ms
  maxRetries?: number;              // Default: 3
  rateLimitPerMinute?: number;      // Default: 60
  debug?: boolean;                  // Default: false
}
```

### Default Models

- **OpenAI**: `gpt-3.5-turbo`
- **Anthropic**: `claude-3-5-sonnet-20241022`

## API Reference

### Common Methods (Both Adapters)

#### `chat(messages, options?)`

Send a chat completion request.

**Parameters:**
- `messages`: Array of Message objects
- `options?`: ChatOptions (temperature, maxTokens, etc.)

**Returns:** `Promise<ChatResponse>`

**Example:**
```typescript
const response = await adapter.chat([
  { role: 'user', content: 'Hello!' }
], {
  temperature: 0.8,
  maxTokens: 500
});
```

#### `stream(messages, options?)`

Stream a chat completion response.

**Parameters:**
- `messages`: Array of Message objects
- `options?`: ChatOptions

**Returns:** `AsyncIterable<StreamChunk>`

**Example:**
```typescript
for await (const chunk of adapter.stream([
  { role: 'user', content: 'Write a story' }
])) {
  process.stdout.write(chunk.delta);
  if (chunk.isComplete) break;
}
```

#### `configure(config)`

Update adapter configuration.

**Parameters:**
- `config`: Partial<AdapterConfig>

**Example:**
```typescript
adapter.configure({
  temperature: 0.9,
  enableDriftDetection: false
});
```

#### `getMetrics()`

Get current adapter metrics.

**Returns:** `AdapterMetrics`

**Example:**
```typescript
const metrics = adapter.getMetrics();
console.log(`Requests: ${metrics.totalRequests}`);
console.log(`Success: ${metrics.successfulRequests}`);
console.log(`Avg Latency: ${metrics.averageLatency}ms`);
```

#### `resetMetrics()`

Reset all metrics to zero.

**Example:**
```typescript
adapter.resetMetrics();
```

### OpenAI-Specific Methods

#### `testConnection()`

Test connection to OpenAI API.

**Returns:** `Promise<boolean>`

**Example:**
```typescript
const connected = await adapter.testConnection();
if (!connected) {
  console.error('Connection failed');
}
```

#### `listModels()`

List available OpenAI models.

**Returns:** `Promise<string[]>`

**Example:**
```typescript
const models = await adapter.listModels();
console.log('Available:', models);
```

### Anthropic-Specific Methods

#### `testConnection()`

Test connection to Anthropic API (sends minimal request).

**Returns:** `Promise<boolean>`

#### `getModelInfo()`

Get information about the configured model.

**Returns:** Object with model details

**Example:**
```typescript
const info = adapter.getModelInfo();
console.log(`Model: ${info.model}`);
console.log(`Vision: ${info.supportsVision}`);
console.log(`Streaming: ${info.supportsStreaming}`);
```

## Response Structure

### ChatResponse

```typescript
interface ChatResponse {
  message: string;                  // The LLM response
  driftScore?: DriftScore;          // Drift analysis (if enabled)
  filtered?: boolean;               // Was output modified?
  filterResult?: FilterResult;      // Filter details (if enabled)
  metadata: {
    model: string;                  // Model used
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    finishReason?: string;
    latency: number;                // Request latency in ms
  };
}
```

### DriftScore

```typescript
interface DriftScore {
  overall: number;                  // 0-1, lower is better
  dimensions: {
    toneAlignment: number;          // 0-1
    valueAlignment: number;         // 0-1
    rhythmAlignment: number;        // 0-1
    contextAlignment: number;       // 0-1
  };
  flags: string[];                  // Issues detected
  recommendation: 'continue' | 'review' | 'recalibrate';
  confidence: number;               // 0-1
}
```

### FilterResult

```typescript
interface FilterResult {
  passed: boolean;                  // Did output pass filter?
  output: string;                   // Modified output (if needed)
  flags: string[];                  // Issues detected
  modifications: string[];          // Changes made
  recommendation: 'allow' | 'modify' | 'block';
}
```

## Advanced Features

### Rate Limiting

Adapters automatically enforce rate limits to prevent quota exhaustion:

```typescript
const adapter = new OpenAIAdapter({
  apiKey: process.env.OPENAI_API_KEY!,
  rateLimitPerMinute: 20,  // Max 20 requests per minute
  debug: true               // Log rate limit waits
});

// Adapter will automatically wait if rate limit reached
for (let i = 0; i < 30; i++) {
  await adapter.chat([{ role: 'user', content: `Message ${i}` }]);
  // Automatically throttled to 20/minute
}
```

### Retry Logic

Automatic exponential backoff for transient failures:

```typescript
const adapter = new OpenAIAdapter({
  apiKey: process.env.OPENAI_API_KEY!,
  maxRetries: 5,           // Retry up to 5 times
  timeout: 30000           // 30 second timeout
});

// Automatically retries on:
// - Network errors (ECONNRESET, ETIMEDOUT)
// - Rate limit errors (429)
// - Server errors (500-599)
```

### Metrics Tracking

Monitor adapter performance:

```typescript
const adapter = new OpenAIAdapter({...});

// Make requests
await adapter.chat([...]);
await adapter.chat([...]);

// Check metrics
const metrics = adapter.getMetrics();
console.log(`Success rate: ${metrics.successfulRequests / metrics.totalRequests}`);
console.log(`Avg latency: ${metrics.averageLatency.toFixed(0)}ms`);
console.log(`Retries: ${metrics.retries}`);
console.log(`Rate limit hits: ${metrics.rateLimitHits}`);

// Reset for next batch
adapter.resetMetrics();
```

### Debug Mode

Enable detailed logging:

```typescript
const adapter = new OpenAIAdapter({
  apiKey: process.env.OPENAI_API_KEY!,
  debug: true  // Logs rate limits, retries, drift scores, filter results
});

// Logs will show:
// - API key validation
// - Rate limit waits
// - Retry attempts
// - Drift scores
// - Filter results
```

## Security Best Practices

### API Key Management

**DO:**
```typescript
// Use environment variables
const adapter = new OpenAIAdapter({
  apiKey: process.env.OPENAI_API_KEY!
});

// Or secure secret management
import { getSecret } from './secrets';
const adapter = new OpenAIAdapter({
  apiKey: await getSecret('OPENAI_API_KEY')
});
```

**DON'T:**
```typescript
// Never hardcode keys
const adapter = new OpenAIAdapter({
  apiKey: 'sk-...'  // ❌ NEVER DO THIS
});
```

### Error Handling

Always handle errors gracefully:

```typescript
try {
  const response = await adapter.chat([...]);
  console.log(response.message);
} catch (error) {
  if (error.status === 401) {
    console.error('Invalid API key');
  } else if (error.status === 429) {
    console.error('Rate limit exceeded');
  } else {
    console.error('Request failed:', error.message);
  }
}
```

### Input Sanitization

Validate user input before sending:

```typescript
function sanitizeInput(input: string): string {
  // Remove potentially harmful content
  return input
    .trim()
    .substring(0, 10000)  // Limit length
    .replace(/<script>/gi, '');  // Remove scripts
}

const userInput = sanitizeInput(req.body.message);
const response = await adapter.chat([
  { role: 'user', content: userInput }
]);
```

## Examples

See the `/examples/adapters/` directory for complete examples:

- **`openai-basic.ts`**: Basic OpenAI usage with drift detection
- **`anthropic-basic.ts`**: Basic Anthropic usage with drift detection
- **`streaming-example.ts`**: Streaming responses from both providers
- **`comparison.ts`**: Compare responses from different providers

Run examples:

```bash
# Set API keys first
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."

# Run examples
npx tsx examples/adapters/openai-basic.ts
npx tsx examples/adapters/anthropic-basic.ts
npx tsx examples/adapters/streaming-example.ts
npx tsx examples/adapters/comparison.ts
```

## Testing

Tests are located in `/tests/adapters/`:

```bash
# Run all adapter tests
npm test tests/adapters/

# Run specific adapter tests
npm test tests/adapters/openai-adapter.test.ts
npm test tests/adapters/anthropic-adapter.test.ts

# With coverage
npm run test:coverage -- tests/adapters/
```

Tests use mocked API responses for fast, reliable testing without real API calls.

## Troubleshooting

### Common Issues

**API Key Invalid:**
```
Error: API key appears to be invalid (too short)
```
Solution: Check that your API key is correctly set and at least 20 characters long.

**Rate Limit Errors:**
```
Error: Rate limit exceeded (429)
```
Solution: Reduce `rateLimitPerMinute` or implement request batching.

**Timeout Errors:**
```
Error: Request timeout after 30000ms
```
Solution: Increase `timeout` value or check network connectivity.

**Connection Failures:**
```
Error: ECONNRESET
```
Solution: Check internet connection. Adapter will automatically retry.

### Debug Checklist

1. ✓ API key is set correctly
2. ✓ Internet connection is working
3. ✓ API key has sufficient quota
4. ✓ Rate limits are appropriate
5. ✓ Debug mode is enabled (`debug: true`)
6. ✓ Error handling is in place

## Architecture Decisions

### Why Adapters?

The adapter pattern provides:

1. **Abstraction**: Swap providers without changing application code
2. **Enhancement**: Add drift detection/filtering transparently
3. **Consistency**: Unified interface across providers
4. **Observability**: Built-in metrics and debugging

### Design Principles

1. **Security First**: API keys never logged, validated on init
2. **Fail-Safe**: Automatic retries, graceful degradation
3. **Observable**: Comprehensive metrics tracking
4. **Composable**: Drift detection and filtering can be toggled independently
5. **Type-Safe**: Full TypeScript support with strict types

## Integration with SI Systems

Adapters integrate seamlessly with other SI Systems components:

```typescript
import {
  OpenAIAdapter,
  DriftDetector,
  OutputIntegrityFilter,
  ContextAwarePrompter,
  PersistenceService,
  Identity
} from '@si-systems/core';

// Create adapter with drift detection
const adapter = new OpenAIAdapter({
  apiKey: process.env.OPENAI_API_KEY!,
  identity: myIdentity,
  enableDriftDetection: true,
  enableFiltering: true
});

// Optional: Add persistence
const db = new PersistenceService('./data/sessions.db');
const sessionId = await db.createSession(myIdentity);

// Send request
const response = await adapter.chat([
  { role: 'user', content: 'Hello!' }
]);

// Store in database
if (response.driftScore) {
  await db.saveDriftScore(sessionId, response.driftScore);
}

console.log(response.message);
console.log('Drift:', response.driftScore?.overall);
```

## Performance Considerations

### Token Usage

Monitor token consumption:

```typescript
let totalTokens = 0;

for (const query of queries) {
  const response = await adapter.chat([
    { role: 'user', content: query }
  ]);

  totalTokens += response.metadata.usage?.totalTokens || 0;
}

console.log(`Total tokens used: ${totalTokens}`);
```

### Latency Optimization

```typescript
// Use streaming for perceived speed
for await (const chunk of adapter.stream([...])) {
  // Display immediately as it arrives
  displayToUser(chunk.delta);
}

// Batch independent requests
const responses = await Promise.all([
  adapter.chat([{ role: 'user', content: 'Query 1' }]),
  adapter.chat([{ role: 'user', content: 'Query 2' }]),
  adapter.chat([{ role: 'user', content: 'Query 3' }])
]);
```

### Memory Management

```typescript
// Reset metrics periodically in long-running applications
setInterval(() => {
  adapter.resetMetrics();
}, 3600000); // Every hour

// Recreate adapter instances if needed
if (needsReset) {
  const newAdapter = new OpenAIAdapter({ ...config });
}
```

## Roadmap

Future enhancements planned:

- [ ] Additional provider adapters (Gemini, Mistral, local models)
- [ ] Caching layer for repeated queries
- [ ] Request batching for efficiency
- [ ] Custom prompt injection strategies
- [ ] Advanced rate limiting (token-based)
- [ ] Response validation schemas
- [ ] Multi-model fallback chains
- [ ] Cost tracking and budgets

## Support

For issues, questions, or contributions:

- GitHub Issues: [github.com/si-systems/issues](https://github.com/si-systems/issues)
- Documentation: [si-systems.dev/docs](https://si-systems.dev/docs)
- Examples: See `/examples/adapters/` directory

## License

MIT License - See LICENSE file for details
