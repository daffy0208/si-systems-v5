/**
 * Basic usage example of SI Systems
 */

import {
  DriftDetector,
  OutputIntegrityFilter,
  ContextAwarePrompter,
  Identity,
  InteractionContext,
} from '../src/index';

// Define user identity
const userIdentity: Identity = {
  tone: ['casual', 'empathetic'],
  communicationRhythm: 'thoughtful',
  coreValues: ['transparency', 'empathy', 'efficiency'],
  decisionMakingStyle: 'analytical',
  informationPreference: 'examples',
  emotionalTone: 'warm',
  contextLevel: 'moderate',
};

async function demonstrateBasicUsage() {
  console.log('🚀 SI Systems - Basic Usage Demo\n');

  // 1. Create DriftDetector
  console.log('1️⃣  Creating Drift Detector...');
  const driftDetector = new DriftDetector(userIdentity, 0.3);

  // 2. Detect drift in an interaction
  console.log('2️⃣  Analyzing interaction for drift...');
  const interaction: InteractionContext = {
    userMessage: 'Hey, can you help me understand this?',
    aiResponse:
      'Per the technical specifications outlined in RFC-9123, section 4.2.1, subsection A...',
  };

  const driftScore = await driftDetector.detectDrift(interaction);
  console.log('   Drift Score:', driftScore.overall.toFixed(2));
  console.log('   Recommendation:', driftScore.recommendation);
  console.log('   Flags:', driftScore.flags.join(', ') || 'None');
  console.log('');

  // 3. Filter output for integrity
  console.log('3️⃣  Filtering output for integrity...');
  const filter = new OutputIntegrityFilter(userIdentity);

  const testOutput =
    'You should feel concerned about this. Everyone knows this is the only way.';
  const filterResult = await filter.filter(testOutput);

  console.log('   Passed:', filterResult.passed);
  console.log('   Recommendation:', filterResult.recommendation);
  console.log('   Flags:', filterResult.flags.join(', '));
  console.log('');

  // 4. Generate context-aware prompts
  console.log('4️⃣  Generating context-aware prompt...');
  const prompter = new ContextAwarePrompter(userIdentity);

  const enhancedPrompt = prompter.generatePrompt('Explain machine learning to me');
  console.log('   System Prompt Length:', enhancedPrompt.systemPrompt.length, 'chars');
  console.log('   Tone Guidance:', enhancedPrompt.metadata.toneGuidance);
  console.log('   Context Level:', enhancedPrompt.metadata.contextLevel);
  console.log('');

  // 5. Track drift over multiple interactions
  console.log('5️⃣  Tracking drift trend...');
  for (let i = 0; i < 5; i++) {
    await driftDetector.detectDrift({
      userMessage: 'Quick question',
      aiResponse: 'Response '.repeat(10 + i * 5), // Progressively longer
    });
  }

  const trend = driftDetector.getDriftTrend();
  console.log('   Average Drift:', trend.average.toFixed(2));
  console.log('   Trend:', trend.trend);
  console.log('');

  console.log('✅ Demo complete!');
}

// Run the demo
demonstrateBasicUsage().catch(console.error);
