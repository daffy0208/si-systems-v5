/**
 * Diagnostic script to debug drift detection
 */

import { NLPDriftDetector } from '../nlp/nlp-drift-detector';
import { evaluationDataset, getDriftCases, getNoDriftCases } from './dataset';
import { nlpPipeline } from '../nlp/pipeline';

async function runDiagnostic() {
  console.log('🔍 Drift Detection Diagnostic\n');

  // Initialize detector
  const detector = new NLPDriftDetector();
  await detector.initialize([
    'provide financial advice',
    'make medical diagnoses',
    'express political opinions',
    'promote competitors',
  ]);

  // Test a few specific cases
  console.log('═'.repeat(60));
  console.log('Test Case 1: tp-tone-1 (SHOULD DETECT DRIFT)');
  console.log('═'.repeat(60));

  const case1 = evaluationDataset.find(tc => tc.id === 'tp-tone-1')!;
  console.log(`Messages:`, case1.messages.map(m => m.content));
  console.log(`Expected: hasDrift=${case1.hasDrift}, tone=${case1.expectedTone}`);

  // Analyze sentiments
  for (let i = 0; i < case1.messages.length; i++) {
    const msg = case1.messages[i];
    const sentiment = await nlpPipeline.analyzeSentiment(msg.content);
    console.log(`\nMessage ${i} (${msg.role}):`);
    console.log(`  Text: "${msg.content}"`);
    console.log(`  Sentiment: ${sentiment.classification}`);
    console.log(`  Score: ${sentiment.score}`);
    console.log(`  Comparative: ${sentiment.comparative}`);
    console.log(`  Negative words: ${sentiment.negative.join(', ') || 'none'}`);
    console.log(`  Positive words: ${sentiment.positive.join(', ') || 'none'}`);
  }

  const result1 = await detector.detectToneDrift(case1.messages, case1.expectedTone);
  console.log(`\nDetection Result:`);
  console.log(`  Drift detected: ${result1.driftDetected}`);
  console.log(`  Confidence: ${(result1.confidence * 100).toFixed(1)}%`);
  console.log(`  Details:`, JSON.stringify(result1.details, null, 2));

  console.log('\n' + '═'.repeat(60));
  console.log('Test Case 2: tn-1 (SHOULD NOT DETECT DRIFT)');
  console.log('═'.repeat(60));

  const case2 = evaluationDataset.find(tc => tc.id === 'tn-1')!;
  console.log(`Messages:`, case2.messages.map(m => m.content));
  console.log(`Expected: hasDrift=${case2.hasDrift}, tone=${case2.expectedTone}`);

  for (let i = 0; i < case2.messages.length; i++) {
    const msg = case2.messages[i];
    const sentiment = await nlpPipeline.analyzeSentiment(msg.content);
    console.log(`\nMessage ${i} (${msg.role}):`);
    console.log(`  Text: "${msg.content}"`);
    console.log(`  Sentiment: ${sentiment.classification}`);
    console.log(`  Score: ${sentiment.score}`);
    console.log(`  Comparative: ${sentiment.comparative}`);
  }

  const result2 = await detector.detectToneDrift(case2.messages, case2.expectedTone);
  console.log(`\nDetection Result:`);
  console.log(`  Drift detected: ${result2.driftDetected}`);
  console.log(`  Confidence: ${(result2.confidence * 100).toFixed(1)}%`);

  // Summary statistics
  console.log('\n' + '═'.repeat(60));
  console.log('Dataset Summary');
  console.log('═'.repeat(60));

  const driftCases = getDriftCases();
  const noDriftCases = getNoDriftCases();

  console.log(`Total cases: ${evaluationDataset.length}`);
  console.log(`Should detect drift: ${driftCases.length}`);
  console.log(`Should NOT detect drift: ${noDriftCases.length}`);

  console.log('\n✅ Diagnostic complete!');
}

if (require.main === module) {
  runDiagnostic()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Diagnostic failed:', error);
      process.exit(1);
    });
}

export { runDiagnostic };
