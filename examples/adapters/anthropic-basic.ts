/**
 * Basic Anthropic Adapter Usage Example
 *
 * Demonstrates basic usage of Anthropic Claude adapter with drift detection
 */

import { AnthropicAdapter, Identity } from '../../src';

async function main() {
  // Define user identity
  const myIdentity: Identity = {
    tone: ['empathetic', 'thoughtful'],
    communicationRhythm: 'thoughtful',
    coreValues: ['empathy', 'understanding', 'clarity'],
    decisionMakingStyle: 'collaborative',
    informationPreference: 'examples',
    emotionalTone: 'warm',
    contextLevel: 'extensive',
  };

  // Create adapter with drift detection enabled
  const adapter = new AnthropicAdapter({
    apiKey: process.env.ANTHROPIC_API_KEY!,
    model: 'claude-3-5-sonnet-20241022',
    temperature: 0.7,
    maxTokens: 1000,
    enableDriftDetection: true,
    enableFiltering: true,
    identity: myIdentity,
    rateLimitPerMinute: 20,
    debug: true,
  });

  console.log('=== Anthropic Claude Adapter Example ===\n');

  // Test connection
  console.log('Testing connection...');
  const connected = await adapter.testConnection();
  console.log(`Connection: ${connected ? '✓ Success' : '✗ Failed'}\n`);

  if (!connected) {
    console.error('Failed to connect to Anthropic. Check your API key.');
    return;
  }

  // Get model information
  console.log('--- Model Information ---');
  const modelInfo = adapter.getModelInfo();
  console.log(`Model: ${modelInfo.model}`);
  console.log(`Max Tokens: ${modelInfo.maxTokens}`);
  console.log(`Vision Support: ${modelInfo.supportsVision ? 'Yes' : 'No'}`);
  console.log(`Streaming: ${modelInfo.supportsStreaming ? 'Yes' : 'No'}`);

  // Send a chat message with system prompt
  console.log('\n Sending chat message...');
  const response = await adapter.chat([
    {
      role: 'system',
      content:
        'You are a helpful AI assistant focused on clear, empathetic communication.',
    },
    {
      role: 'user',
      content: 'Can you explain what makes a good conversation?',
    },
  ]);

  console.log('\n--- Response ---');
  console.log(response.message);

  console.log('\n--- Metadata ---');
  console.log(`Model: ${response.metadata.model}`);
  console.log(`Input Tokens: ${response.metadata.usage?.promptTokens}`);
  console.log(`Output Tokens: ${response.metadata.usage?.completionTokens}`);
  console.log(`Total Tokens: ${response.metadata.usage?.totalTokens}`);
  console.log(`Latency: ${response.metadata.latency}ms`);
  console.log(`Finish Reason: ${response.metadata.finishReason}`);

  if (response.driftScore) {
    console.log('\n--- Drift Analysis ---');
    console.log(`Overall Score: ${response.driftScore.overall.toFixed(3)}`);
    console.log(`Recommendation: ${response.driftScore.recommendation}`);
    console.log(`Confidence: ${response.driftScore.confidence.toFixed(3)}`);
    console.log(`Flags: ${response.driftScore.flags.join(', ') || 'None'}`);
    console.log('\nDimensions:');
    console.log(`  Tone: ${response.driftScore.dimensions.toneAlignment.toFixed(3)}`);
    console.log(
      `  Values: ${response.driftScore.dimensions.valueAlignment.toFixed(3)}`
    );
    console.log(
      `  Rhythm: ${response.driftScore.dimensions.rhythmAlignment.toFixed(3)}`
    );
    console.log(
      `  Context: ${response.driftScore.dimensions.contextAlignment.toFixed(3)}`
    );
  }

  if (response.filterResult) {
    console.log('\n--- Output Filter ---');
    console.log(`Passed: ${response.filterResult.passed}`);
    console.log(`Recommendation: ${response.filterResult.recommendation}`);
    if (response.filterResult.flags.length > 0) {
      console.log(`Flags: ${response.filterResult.flags.join(', ')}`);
    }
    if (response.filterResult.modifications.length > 0) {
      console.log(`Modifications: ${response.filterResult.modifications.join(', ')}`);
    }
  }

  // Show metrics
  console.log('\n--- Adapter Metrics ---');
  const metrics = adapter.getMetrics();
  console.log(`Total Requests: ${metrics.totalRequests}`);
  console.log(`Successful: ${metrics.successfulRequests}`);
  console.log(`Failed: ${metrics.failedRequests}`);
  console.log(`Average Latency: ${metrics.averageLatency.toFixed(0)}ms`);
  console.log(`Retries: ${metrics.retries}`);
  console.log(`Rate Limit Hits: ${metrics.rateLimitHits}`);
}

// Run example
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  main().catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
}
