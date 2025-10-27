/**
 * Provider Comparison Example
 *
 * Compares responses from OpenAI and Anthropic for the same query
 * with drift detection enabled
 */

import { OpenAIAdapter, AnthropicAdapter, Identity, ChatResponse } from '../../src';

const myIdentity: Identity = {
  tone: ['technical', 'direct'],
  communicationRhythm: 'concise',
  coreValues: ['accuracy', 'clarity', 'efficiency'],
  decisionMakingStyle: 'analytical',
  informationPreference: 'examples',
  emotionalTone: 'neutral',
  contextLevel: 'moderate',
};

async function queryOpenAI(question: string): Promise<ChatResponse> {
  const adapter = new OpenAIAdapter({
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-3.5-turbo',
    temperature: 0.7,
    enableDriftDetection: true,
    enableFiltering: true,
    identity: myIdentity,
  });

  return adapter.chat([{ role: 'user', content: question }]);
}

async function queryAnthropic(question: string): Promise<ChatResponse> {
  const adapter = new AnthropicAdapter({
    apiKey: process.env.ANTHROPIC_API_KEY!,
    model: 'claude-3-5-sonnet-20241022',
    temperature: 0.7,
    enableDriftDetection: true,
    enableFiltering: true,
    identity: myIdentity,
  });

  return adapter.chat([{ role: 'user', content: question }]);
}

function printResponse(provider: string, response: ChatResponse) {
  console.log(`\n=== ${provider} ===\n`);

  console.log('Response:');
  console.log(response.message);
  console.log();

  console.log('Metadata:');
  console.log(`  Model: ${response.metadata.model}`);
  console.log(`  Tokens: ${response.metadata.usage?.totalTokens}`);
  console.log(`  Latency: ${response.metadata.latency}ms`);
  console.log();

  if (response.driftScore) {
    console.log('Drift Analysis:');
    console.log(`  Overall: ${response.driftScore.overall.toFixed(3)}`);
    console.log(`  Recommendation: ${response.driftScore.recommendation}`);
    console.log(`  Flags: ${response.driftScore.flags.join(', ') || 'None'}`);
    console.log('  Dimensions:');
    console.log(`    Tone: ${response.driftScore.dimensions.toneAlignment.toFixed(3)}`);
    console.log(`    Values: ${response.driftScore.dimensions.valueAlignment.toFixed(3)}`);
    console.log(`    Rhythm: ${response.driftScore.dimensions.rhythmAlignment.toFixed(3)}`);
    console.log(
      `    Context: ${response.driftScore.dimensions.contextAlignment.toFixed(3)}`
    );
  }

  if (response.filterResult && !response.filterResult.passed) {
    console.log('\nFilter Result:');
    console.log(`  Recommendation: ${response.filterResult.recommendation}`);
    console.log(`  Flags: ${response.filterResult.flags.join(', ')}`);
  }
}

async function main() {
  const question = 'What is the difference between async/await and Promises in JavaScript?';

  console.log('=== Provider Comparison ===\n');
  console.log(`Question: ${question}\n`);

  try {
    // Query both providers in parallel
    const [openaiResponse, anthropicResponse] = await Promise.all([
      process.env.OPENAI_API_KEY ? queryOpenAI(question) : null,
      process.env.ANTHROPIC_API_KEY ? queryAnthropic(question) : null,
    ]);

    if (openaiResponse) {
      printResponse('OpenAI (GPT-3.5-turbo)', openaiResponse);
    }

    if (anthropicResponse) {
      printResponse('Anthropic (Claude 3.5 Sonnet)', anthropicResponse);
    }

    if (!openaiResponse && !anthropicResponse) {
      console.log('No API keys found. Set OPENAI_API_KEY and/or ANTHROPIC_API_KEY.');
      return;
    }

    // Compare metrics
    if (openaiResponse && anthropicResponse) {
      console.log('\n=== Comparison Summary ===\n');

      console.log('Response Length:');
      console.log(`  OpenAI: ${openaiResponse.message.length} characters`);
      console.log(`  Anthropic: ${anthropicResponse.message.length} characters`);

      console.log('\nLatency:');
      console.log(`  OpenAI: ${openaiResponse.metadata.latency}ms`);
      console.log(`  Anthropic: ${anthropicResponse.metadata.latency}ms`);

      console.log('\nTokens Used:');
      console.log(`  OpenAI: ${openaiResponse.metadata.usage?.totalTokens}`);
      console.log(`  Anthropic: ${anthropicResponse.metadata.usage?.totalTokens}`);

      if (openaiResponse.driftScore && anthropicResponse.driftScore) {
        console.log('\nDrift Scores:');
        console.log(`  OpenAI: ${openaiResponse.driftScore.overall.toFixed(3)}`);
        console.log(`  Anthropic: ${anthropicResponse.driftScore.overall.toFixed(3)}`);

        const betterAlignment =
          openaiResponse.driftScore.overall < anthropicResponse.driftScore.overall
            ? 'OpenAI'
            : 'Anthropic';
        console.log(`\n  Better Identity Alignment: ${betterAlignment}`);
      }
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run example
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  main();
}
