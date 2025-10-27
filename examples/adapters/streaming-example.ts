/**
 * Streaming Response Example
 *
 * Demonstrates streaming chat completions with both OpenAI and Anthropic adapters
 */

import { OpenAIAdapter, AnthropicAdapter, Identity } from '../../src';

async function streamOpenAI() {
  const myIdentity: Identity = {
    tone: ['technical', 'direct'],
    communicationRhythm: 'concise',
    coreValues: ['efficiency'],
    decisionMakingStyle: 'analytical',
    informationPreference: 'textual',
    emotionalTone: 'neutral',
    contextLevel: 'moderate',
  };

  const adapter = new OpenAIAdapter({
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-3.5-turbo',
    enableDriftDetection: true,
    identity: myIdentity,
    debug: false,
  });

  console.log('=== OpenAI Streaming Example ===\n');
  console.log('Question: What are the benefits of TypeScript?\n');
  console.log('Response: ');

  let fullResponse = '';

  for await (const chunk of adapter.stream([
    {
      role: 'user',
      content: 'What are the main benefits of using TypeScript? Keep it brief.',
    },
  ])) {
    process.stdout.write(chunk.delta);
    fullResponse += chunk.delta;

    if (chunk.isComplete) {
      console.log('\n\n--- Stream Complete ---');
      console.log(`Total characters: ${fullResponse.length}`);
      console.log(`Finish reason: ${chunk.metadata?.finishReason}`);
      break;
    }
  }
}

async function streamAnthropic() {
  const myIdentity: Identity = {
    tone: ['empathetic'],
    communicationRhythm: 'thoughtful',
    coreValues: ['clarity'],
    decisionMakingStyle: 'collaborative',
    informationPreference: 'examples',
    emotionalTone: 'warm',
    contextLevel: 'extensive',
  };

  const adapter = new AnthropicAdapter({
    apiKey: process.env.ANTHROPIC_API_KEY!,
    model: 'claude-3-5-sonnet-20241022',
    enableDriftDetection: true,
    identity: myIdentity,
    debug: false,
  });

  console.log('\n\n=== Anthropic Streaming Example ===\n');
  console.log('Question: Explain async/await in JavaScript\n');
  console.log('Response: ');

  let fullResponse = '';

  for await (const chunk of adapter.stream([
    {
      role: 'system',
      content: 'You are a helpful coding tutor.',
    },
    {
      role: 'user',
      content: 'Explain async/await in JavaScript with a simple example.',
    },
  ])) {
    process.stdout.write(chunk.delta);
    fullResponse += chunk.delta;

    if (chunk.isComplete) {
      console.log('\n\n--- Stream Complete ---');
      console.log(`Total characters: ${fullResponse.length}`);
      console.log(`Finish reason: ${chunk.metadata?.finishReason}`);
      break;
    }
  }
}

async function main() {
  try {
    // Only run if API keys are present
    if (process.env.OPENAI_API_KEY) {
      await streamOpenAI();
    } else {
      console.log('Skipping OpenAI example (no API key)');
    }

    if (process.env.ANTHROPIC_API_KEY) {
      await streamAnthropic();
    } else {
      console.log('Skipping Anthropic example (no API key)');
    }

    if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
      console.log('\nNo API keys found. Set OPENAI_API_KEY or ANTHROPIC_API_KEY to run examples.');
    }
  } catch (error) {
    console.error('\nError:', error);
    process.exit(1);
  }
}

// Run example
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  main();
}
