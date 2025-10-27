/**
 * Basic OpenAI Adapter Usage Example
 *
 * Demonstrates basic usage of OpenAI adapter with drift detection
 */

import { OpenAIAdapter, Identity } from '../../src';

async function main() {
  // Define user identity
  const myIdentity: Identity = {
    tone: ['technical', 'direct'],
    communicationRhythm: 'concise',
    coreValues: ['transparency', 'efficiency', 'clarity'],
    decisionMakingStyle: 'analytical',
    informationPreference: 'examples',
    emotionalTone: 'neutral',
    contextLevel: 'moderate',
  };

  // Create adapter with drift detection enabled
  const adapter = new OpenAIAdapter({
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-3.5-turbo',
    temperature: 0.7,
    maxTokens: 500,
    enableDriftDetection: true,
    enableFiltering: true,
    identity: myIdentity,
    rateLimitPerMinute: 20,
    debug: true,
  });

  console.log('=== OpenAI Adapter Example ===\n');

  // Test connection
  console.log('Testing connection...');
  const connected = await adapter.testConnection();
  console.log(`Connection: ${connected ? '✓ Success' : '✗ Failed'}\n`);

  if (!connected) {
    console.error('Failed to connect to OpenAI. Check your API key.');
    return;
  }

  // Send a chat message
  console.log('Sending chat message...');
  const response = await adapter.chat([
    {
      role: 'user',
      content: 'Explain what TypeScript is in simple terms.',
    },
  ]);

  console.log('\n--- Response ---');
  console.log(response.message);

  console.log('\n--- Metadata ---');
  console.log(`Model: ${response.metadata.model}`);
  console.log(`Tokens: ${response.metadata.usage?.totalTokens}`);
  console.log(`Latency: ${response.metadata.latency}ms`);

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

  // List available models
  console.log('\n--- Available Models ---');
  const models = await adapter.listModels();
  console.log(`Found ${models.length} models`);
  console.log('Sample models:', models.slice(0, 5).join(', '));
}

// Run example
if (require.main === module) {
  main().catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
}
