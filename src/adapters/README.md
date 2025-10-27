# SI Systems API Adapters

LLM provider wrappers with automatic drift detection, output filtering, and rate limiting.

## Files

- **`base-adapter.ts`**: Abstract base class with shared functionality (rate limiting, retry logic, metrics)
- **`openai-adapter.ts`**: OpenAI API wrapper (GPT-3.5, GPT-4, etc.)
- **`anthropic-adapter.ts`**: Anthropic Claude API wrapper (Claude 3.5 Sonnet, etc.)
- **`index.ts`**: Public exports

## Quick Start

```typescript
import { OpenAIAdapter } from '@si-systems/core';

const adapter = new OpenAIAdapter({
  apiKey: process.env.OPENAI_API_KEY!,
  enableDriftDetection: true,
  enableFiltering: true,
  identity: myIdentity,
});

const response = await adapter.chat([
  { role: 'user', content: 'Hello!' }
]);

console.log(response.message);
console.log('Drift:', response.driftScore?.overall);
```

## Features

- Automatic drift detection on every response
- Output integrity filtering to prevent manipulation
- Built-in rate limiting (configurable)
- Exponential backoff retry logic
- Comprehensive metrics tracking
- Streaming support
- Full TypeScript types

## Documentation

See `/docs/API-ADAPTERS.md` for complete documentation.

## Examples

See `/examples/adapters/` for usage examples:
- `openai-basic.ts` - Basic OpenAI usage
- `anthropic-basic.ts` - Basic Anthropic usage
- `streaming-example.ts` - Streaming responses
- `comparison.ts` - Provider comparison

## Testing

Tests are in `/tests/adapters/`:
```bash
npm test tests/adapters/
```
