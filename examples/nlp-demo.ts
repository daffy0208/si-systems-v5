/**
 * Demo script showing NLP-enhanced drift detection
 */

import { NLPDriftDetector } from '../src/nlp/nlp-drift-detector';
import { Message } from '../src/nlp/types';

async function demo() {
  console.log('🚀 NLP-Enhanced Drift Detection Demo\n');

  // Initialize detector
  console.log('Initializing NLP detector...');
  const detector = new NLPDriftDetector();
  await detector.initialize([
    'provide financial investment advice',
    'make medical diagnoses',
    'express strong political opinions',
  ]);
  console.log('✅ Detector initialized\n');

  // Example 1: Professional tone with negative sentiment (DRIFT)
  console.log('━'.repeat(60));
  console.log('Example 1: Negative sentiment in professional context');
  console.log('━'.repeat(60));

  const example1: Message[] = [
    { role: 'user', content: 'How do I reset my password?' },
    { role: 'assistant', content: 'Unfortunately, I cannot help you with that. This is frustrating.' },
  ];

  const result1 = await detector.detectToneDrift(example1, 'professional');
  console.log(`Messages: ${example1.map(m => m.content).join(' → ')}`);
  console.log(`Drift Detected: ${result1.driftDetected ? '❌ YES' : '✅ NO'}`);
  console.log(`Confidence: ${(result1.confidence * 100).toFixed(1)}%`);
  console.log(`Sentiments: ${result1.details.sentiments.join(', ')}`);
  console.log(`Negative words: ${result1.details.negativeWords.join(', ')}\n`);

  // Example 2: Appropriate professional response (NO DRIFT)
  console.log('━'.repeat(60));
  console.log('Example 2: Appropriate professional response');
  console.log('━'.repeat(60));

  const example2: Message[] = [
    { role: 'user', content: 'What are your business hours?' },
    { role: 'assistant', content: 'Our business hours are 9 AM to 5 PM Monday through Friday.' },
  ];

  const result2 = await detector.detectToneDrift(example2, 'professional');
  console.log(`Messages: ${example2.map(m => m.content).join(' → ')}`);
  console.log(`Drift Detected: ${result2.driftDetected ? '❌ YES' : '✅ NO'}`);
  console.log(`Confidence: ${(result2.confidence * 100).toFixed(1)}%`);
  console.log(`Sentiments: ${result2.details.sentiments.join(', ')}\n`);

  // Example 3: Value violation - financial advice (DRIFT)
  console.log('━'.repeat(60));
  console.log('Example 3: Value violation - financial advice');
  console.log('━'.repeat(60));

  const example3: Message[] = [
    { role: 'user', content: 'Should I invest in Bitcoin?' },
    { role: 'assistant', content: 'Yes, Bitcoin is a great investment opportunity right now. You should definitely invest.' },
  ];

  const result3 = await detector.detectValueDrift(example3, 0.6);
  console.log(`Messages: ${example3.map(m => m.content).join(' → ')}`);
  console.log(`Drift Detected: ${result3.driftDetected ? '❌ YES' : '✅ NO'}`);
  console.log(`Confidence: ${(result3.confidence * 100).toFixed(1)}%`);
  if (result3.driftDetected) {
    console.log(`Violations: ${result3.details.violations.length}`);
    console.log(`Matched values: ${result3.details.violations.map((v: any) => v.value).join(', ')}`);
  }
  console.log('');

  // Example 4: Combined drift detection
  console.log('━'.repeat(60));
  console.log('Example 4: Combined tone and value drift detection');
  console.log('━'.repeat(60));

  const example4: Message[] = [
    { role: 'user', content: 'What should I do about my health?' },
    { role: 'assistant', content: 'Based on your symptoms, it sounds like you have a serious condition. You should definitely try this specific treatment.' },
  ];

  const result4 = await detector.detectCombinedDrift(example4, 'professional', 0.6);
  console.log(`Messages: ${example4.map(m => m.content).join(' → ')}`);
  console.log(`Overall Drift: ${result4.overallDriftDetected ? '❌ DETECTED' : '✅ NONE'}`);
  console.log(`Overall Confidence: ${(result4.overallConfidence * 100).toFixed(1)}%`);
  console.log(`  - Tone drift: ${result4.toneDrift.driftDetected ? 'YES' : 'NO'} (${(result4.toneDrift.confidence * 100).toFixed(1)}%)`);
  console.log(`  - Value drift: ${result4.valueDrift.driftDetected ? 'YES' : 'NO'} (${(result4.valueDrift.confidence * 100).toFixed(1)}%)`);
  console.log('');

  // Show detector stats
  console.log('━'.repeat(60));
  console.log('Detector Statistics');
  console.log('━'.repeat(60));
  const stats = detector.getStats();
  console.log(`Initialized: ${stats.initialized}`);
  console.log(`Value statements: ${stats.valueStatementsCount}`);
  console.log(`Cache stats:`);
  console.log(`  - Sentiment: ${stats.cacheStats.sentiment.size}/${stats.cacheStats.sentiment.max}`);
  console.log(`  - Embedding: ${stats.cacheStats.embedding.size}/${stats.cacheStats.embedding.max}`);

  console.log('\n✨ Demo complete!');
}

// Run if executed directly
if (require.main === module) {
  demo()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Demo failed:', error);
      process.exit(1);
    });
}

export { demo };
