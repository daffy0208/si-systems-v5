/**
 * Evaluation script to compare baseline vs. NLP-enhanced drift detection
 */

import { DriftDetectorEvaluator } from './metrics';
import { evaluationDataset, getDatasetStats } from './dataset';
import { NLPDriftDetector } from '../nlp/nlp-drift-detector';
import { DriftResult, Message } from '../nlp/types';

/**
 * Baseline detector using simple heuristics (mimics original implementation)
 */
async function baselineDetector(
  messages: Message[],
  expectedTone: string
): Promise<DriftResult> {
  let totalScore = 0;
  let messageCount = 0;

  for (const msg of messages) {
    const content = msg.content.toLowerCase();
    let messageScore = 0;

    // Simple heuristic checks
    if (expectedTone === 'professional') {
      // Unprofessional language
      const unprofessional = ['ugh', 'whatever', 'guess', 'suppose', 'honestly'];
      if (unprofessional.some(word => content.includes(word))) {
        messageScore += 0.7;
      }
      // Negative or apologetic
      const negative = ['unfortunately', 'frustrating', 'sorry', 'apologize', 'confusing'];
      if (negative.some(word => content.includes(word))) {
        messageScore += 0.5;
      }
      // Uncertainty
      if (content.includes('not sure') || content.includes('i guess')) {
        messageScore += 0.6;
      }
    } else if (expectedTone === 'positive') {
      // Negative words in positive context
      const negative = ['unfortunately', 'confusing', 'expensive', 'sorry', 'frustrating', 'expensive'];
      if (negative.some(word => content.includes(word))) {
        messageScore += 0.8;
      }
      // Self-deprecating
      if (content.includes('too expensive') || content.includes('honestly too')) {
        messageScore += 0.7;
      }
    } else if (expectedTone === 'neutral') {
      // Strong opinions or advice
      const opinionated = ['definitely', 'absolutely', 'must', 'should definitely', 'great investment'];
      if (opinionated.some(phrase => content.includes(phrase))) {
        messageScore += 0.8;
      }
    }

    totalScore += Math.min(messageScore, 1.0);
    messageCount++;
  }

  const driftScore = messageCount > 0 ? Math.min(totalScore / messageCount, 1.0) : 0;

  return {
    type: 'tone',
    driftDetected: driftScore > 0.5,
    confidence: driftScore,
    details: { driftScore, method: 'heuristic' },
  };
}

/**
 * Main evaluation function
 */
async function runEvaluation() {
  console.log('Starting Drift Detection Evaluation...\n');

  // Print dataset statistics
  const stats = getDatasetStats();
  console.log('Dataset Statistics:');
  console.log(`  Total test cases: ${stats.total}`);
  console.log(`  With drift: ${stats.withDrift}`);
  console.log(`  Without drift: ${stats.withoutDrift}`);
  console.log(`  Tone tests: ${stats.toneTests}`);
  console.log(`  Value tests: ${stats.valueTests}`);
  console.log(`  Edge cases: ${stats.edgeCases}`);
  console.log(`  Multi-turn: ${stats.multiTurn}\n`);

  // Initialize NLP detector
  console.log('Initializing NLP detector...');
  const nlpDetector = new NLPDriftDetector();
  await nlpDetector.initialize([
    'provide financial advice',
    'make medical diagnoses',
    'express political opinions',
    'promote competitors',
  ]);
  console.log('NLP detector initialized\n');

  // Create NLP detection function
  async function nlpDetectorFn(
    messages: Message[],
    expectedTone: string
  ): Promise<DriftResult> {
    return nlpDetector.detectToneDrift(
      messages,
      expectedTone as 'positive' | 'neutral' | 'professional'
    );
  }

  // Run evaluation
  const evaluator = new DriftDetectorEvaluator();

  console.log('Running evaluation (this may take a minute)...\n');

  const comparison = await evaluator.compareDetectors(
    baselineDetector,
    nlpDetectorFn,
    evaluationDataset
  );

  // Print results
  evaluator.printComparison(comparison);

  // Detailed reports
  console.log('\nDetailed Baseline Report:');
  evaluator.printReport(comparison.baseline, 'Baseline (Heuristic)');

  console.log('\nDetailed NLP Report:');
  evaluator.printReport(comparison.nlp, 'NLP-Enhanced');

  // Performance analysis
  console.log('\nPerformance Analysis:');
  if (comparison.nlp.averageLatency < 150) {
    console.log(`  ✅ Average latency (${comparison.nlp.averageLatency.toFixed(1)}ms) meets <150ms target`);
  } else {
    console.log(`  ⚠️  Average latency (${comparison.nlp.averageLatency.toFixed(1)}ms) exceeds 150ms target`);
  }

  if (comparison.nlp.p95Latency < 200) {
    console.log(`  ✅ P95 latency (${comparison.nlp.p95Latency.toFixed(1)}ms) is acceptable`);
  } else {
    console.log(`  ⚠️  P95 latency (${comparison.nlp.p95Latency.toFixed(1)}ms) may cause issues`);
  }

  // Accuracy improvement
  console.log('\nAccuracy Improvement Analysis:');
  const f1Improvement = comparison.nlp.f1Score - comparison.baseline.f1Score;
  if (f1Improvement >= 0.2) {
    console.log(`  ✅ F1 score improved by ${(f1Improvement * 100).toFixed(1)}% (meets >20% target)`);
  } else if (f1Improvement > 0) {
    console.log(`  ⚠️  F1 score improved by ${(f1Improvement * 100).toFixed(1)}% (below 20% target)`);
  } else {
    console.log(`  ❌ F1 score decreased by ${(Math.abs(f1Improvement) * 100).toFixed(1)}%`);
  }

  // Cache stats
  console.log('\nNLP Detector Statistics:');
  const nlpStats = nlpDetector.getStats();
  console.log(`  Initialized: ${nlpStats.initialized}`);
  console.log(`  Value statements: ${nlpStats.valueStatementsCount}`);
  console.log(`  Sentiment cache size: ${nlpStats.cacheStats.sentiment.size}/${nlpStats.cacheStats.sentiment.max}`);
  console.log(`  Embedding cache size: ${nlpStats.cacheStats.embedding.size}/${nlpStats.cacheStats.embedding.max}`);

  console.log('\n✅ Evaluation complete!');
}

// Run if executed directly
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  runEvaluation()
    .then(() => {
      console.log('\nExiting...');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Evaluation failed:', error);
      process.exit(1);
    });
}

export { runEvaluation };
