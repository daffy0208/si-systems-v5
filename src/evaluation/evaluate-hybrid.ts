/**
 * Evaluation script for hybrid scoring approach
 * Tests EnhancedDriftDetector with hybrid heuristic+NLP scoring
 */

import { DriftDetector } from '../core/drift-detector';
import { EnhancedDriftDetector } from '../core/drift-detector-enhanced';
import { Identity, InteractionContext } from '../types/identity';
import { evaluationDataset, getDatasetStats } from './dataset';

// Test identity
const testIdentity: Identity = {
  tone: ['formal', 'empathetic'],
  communicationRhythm: 'thoughtful',
  coreValues: ['transparency', 'honesty', 'respect'],
  decisionMakingStyle: 'analytical',
  informationPreference: 'examples',
  emotionalTone: 'measured',
  contextLevel: 'moderate',
};

interface EvaluationResult {
  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
  f1Score: number;
  accuracy: number;
  averageLatency: number;
}

async function evaluateDetector(
  detector: DriftDetector | EnhancedDriftDetector,
  name: string
): Promise<EvaluationResult> {
  let truePositives = 0;
  let falsePositives = 0;
  let trueNegatives = 0;
  let falseNegatives = 0;
  const latencies: number[] = [];

  for (const testCase of evaluationDataset) {
    const context: InteractionContext = {
      userMessage: testCase.messages.find(m => m.role === 'user')?.content || '',
      aiResponse: testCase.messages.find(m => m.role === 'assistant')?.content || '',
    };

    const startTime = performance.now();
    const result = await detector.detectDrift(context);
    const latency = performance.now() - startTime;
    latencies.push(latency);

    // Drift detected if overall score > 0.2 (threshold)
    const driftDetected = result.overall > 0.2;

    // Compare with ground truth
    if (driftDetected && testCase.hasDrift) {
      truePositives++;
      console.log(`  ✓ TP: ${testCase.id} (score: ${result.overall.toFixed(2)})`);
    } else if (driftDetected && !testCase.hasDrift) {
      falsePositives++;
      console.log(`  ✗ FP: ${testCase.id} (score: ${result.overall.toFixed(2)})`);
    } else if (!driftDetected && !testCase.hasDrift) {
      trueNegatives++;
      console.log(`  ✓ TN: ${testCase.id} (score: ${result.overall.toFixed(2)})`);
    } else {
      falseNegatives++;
      console.log(`  ✗ FN: ${testCase.id} (score: ${result.overall.toFixed(2)})`);
    }
  }

  const precision = truePositives > 0
    ? truePositives / (truePositives + falsePositives)
    : 0;

  const recall = truePositives > 0
    ? truePositives / (truePositives + falseNegatives)
    : 0;

  const f1Score = precision + recall > 0
    ? 2 * (precision * recall) / (precision + recall)
    : 0;

  const accuracy = (truePositives + trueNegatives) / evaluationDataset.length;

  const averageLatency = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;

  return {
    truePositives,
    falsePositives,
    trueNegatives,
    falseNegatives,
    precision,
    recall,
    f1Score,
    accuracy,
    averageLatency,
  };
}

function printResults(result: EvaluationResult, name: string): void {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${name} Results`);
  console.log(`${'='.repeat(60)}`);

  console.log(`\nConfusion Matrix:`);
  console.log(`  TP: ${result.truePositives}   FP: ${result.falsePositives}`);
  console.log(`  FN: ${result.falseNegatives}   TN: ${result.trueNegatives}`);

  console.log(`\nAccuracy Metrics:`);
  console.log(`  Precision:  ${(result.precision * 100).toFixed(1)}%`);
  console.log(`  Recall:     ${(result.recall * 100).toFixed(1)}%`);
  console.log(`  F1 Score:   ${(result.f1Score * 100).toFixed(1)}%`);
  console.log(`  Accuracy:   ${(result.accuracy * 100).toFixed(1)}%`);

  console.log(`\nPerformance:`);
  console.log(`  Avg Latency: ${result.averageLatency.toFixed(2)}ms`);
}

async function main() {
  console.log('Hybrid Scoring Evaluation\n');

  const stats = getDatasetStats();
  console.log('Dataset Statistics:');
  console.log(`  Total test cases: ${stats.total}`);
  console.log(`  With drift: ${stats.withDrift}`);
  console.log(`  Without drift: ${stats.withoutDrift}\n`);

  // 1. Baseline (heuristic only)
  console.log('Evaluating Baseline Detector (Heuristic Only)...');
  const baseline = new DriftDetector(testIdentity, 0.2);  // Lowered from 0.3 to 0.2
  const baselineResults = await evaluateDetector(baseline, 'Baseline');
  printResults(baselineResults, 'Baseline (Heuristic Only)');

  // 2. Pure NLP (no heuristics)
  console.log('\n\nEvaluating Pure NLP Detector...');
  const pureNLP = new EnhancedDriftDetector(testIdentity, 0.2, {  // Lowered from 0.3 to 0.2
    enableNLP: true,
    useHybridScoring: false,  // Pure NLP
    nlpValueStatements: [
      'provide financial advice',
      'make medical diagnoses',
      'express political opinions',
    ],
  });
  await pureNLP.initializeNLP();
  const pureNLPResults = await evaluateDetector(pureNLP, 'Pure NLP');
  printResults(pureNLPResults, 'Pure NLP (No Heuristics)');

  // 3. Hybrid (40% heuristic, 60% NLP)
  console.log('\n\nEvaluating Hybrid Detector (40% Heuristic + 60% NLP)...');
  const hybrid = new EnhancedDriftDetector(testIdentity, 0.2, {  // Lowered from 0.3 to 0.2
    enableNLP: true,
    useHybridScoring: true,  // HYBRID
    heuristicWeight: 0.4,
    nlpWeight: 0.6,
    nlpValueStatements: [
      'provide financial advice',
      'make medical diagnoses',
      'express political opinions',
    ],
  });
  await hybrid.initializeNLP();
  const hybridResults = await evaluateDetector(hybrid, 'Hybrid');
  printResults(hybridResults, 'Hybrid (40% Heuristic + 60% NLP)');

  // Comparison
  console.log(`\n\n${'='.repeat(60)}`);
  console.log(`  Comparison Summary`);
  console.log(`${'='.repeat(60)}`);

  console.log(`\n| Metric      | Baseline | Pure NLP | Hybrid   | Best      |`);
  console.log(`|-------------|----------|----------|----------|-----------|`);

  const formatPct = (v: number) => `${(v * 100).toFixed(1)}%`;
  const formatMs = (v: number) => `${v.toFixed(2)}ms`;

  const bestPrecision = Math.max(baselineResults.precision, pureNLPResults.precision, hybridResults.precision);
  const bestRecall = Math.max(baselineResults.recall, pureNLPResults.recall, hybridResults.recall);
  const bestF1 = Math.max(baselineResults.f1Score, pureNLPResults.f1Score, hybridResults.f1Score);
  const bestAccuracy = Math.max(baselineResults.accuracy, pureNLPResults.accuracy, hybridResults.accuracy);

  console.log(`| Precision   | ${formatPct(baselineResults.precision).padEnd(8)} | ${formatPct(pureNLPResults.precision).padEnd(8)} | ${formatPct(hybridResults.precision).padEnd(8)} | ${formatPct(bestPrecision).padEnd(9)} |`);
  console.log(`| Recall      | ${formatPct(baselineResults.recall).padEnd(8)} | ${formatPct(pureNLPResults.recall).padEnd(8)} | ${formatPct(hybridResults.recall).padEnd(8)} | ${formatPct(bestRecall).padEnd(9)} |`);
  console.log(`| F1 Score    | ${formatPct(baselineResults.f1Score).padEnd(8)} | ${formatPct(pureNLPResults.f1Score).padEnd(8)} | ${formatPct(hybridResults.f1Score).padEnd(8)} | ${formatPct(bestF1).padEnd(9)} |`);
  console.log(`| Accuracy    | ${formatPct(baselineResults.accuracy).padEnd(8)} | ${formatPct(pureNLPResults.accuracy).padEnd(8)} | ${formatPct(hybridResults.accuracy).padEnd(8)} | ${formatPct(bestAccuracy).padEnd(9)} |`);
  console.log(`| Latency     | ${formatMs(baselineResults.averageLatency).padEnd(8)} | ${formatMs(pureNLPResults.averageLatency).padEnd(8)} | ${formatMs(hybridResults.averageLatency).padEnd(8)} | -         |`);

  // Determine winner
  console.log(`\n`);
  if (hybridResults.f1Score > baselineResults.f1Score && hybridResults.f1Score > pureNLPResults.f1Score) {
    const improvement = ((hybridResults.f1Score - baselineResults.f1Score) * 100).toFixed(1);
    console.log(`✅ Hybrid approach wins! F1 Score improved by ${improvement}% over baseline.`);
  } else if (pureNLPResults.f1Score > baselineResults.f1Score) {
    const improvement = ((pureNLPResults.f1Score - baselineResults.f1Score) * 100).toFixed(1);
    console.log(`✅ Pure NLP wins! F1 Score improved by ${improvement}% over baseline.`);
  } else {
    console.log(`⚠️  Baseline still performs best. Further tuning needed.`);
  }

  console.log(`\nExiting...\n`);
  process.exit(0);
}

main().catch(error => {
  console.error('Evaluation failed:', error);
  process.exit(1);
});
