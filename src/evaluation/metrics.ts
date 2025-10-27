/**
 * Evaluation metrics calculator for drift detection
 */

import { TestCase, EvaluationMetrics, DriftResult } from '../nlp/types';

export class DriftDetectorEvaluator {
  /**
   * Evaluate detector performance against test cases
   */
  async evaluate(
    detectFn: (messages: any[], expectedTone: string) => Promise<DriftResult>,
    testCases: TestCase[]
  ): Promise<EvaluationMetrics> {
    let truePositives = 0;
    let falsePositives = 0;
    let trueNegatives = 0;
    let falseNegatives = 0;

    const latencies: number[] = [];

    for (const testCase of testCases) {
      const startTime = performance.now();

      const result = await detectFn(testCase.messages, testCase.expectedTone);

      const latency = performance.now() - startTime;
      latencies.push(latency);

      // Compare with ground truth
      if (result.driftDetected && testCase.hasDrift) {
        truePositives++;
      } else if (result.driftDetected && !testCase.hasDrift) {
        falsePositives++;
      } else if (!result.driftDetected && !testCase.hasDrift) {
        trueNegatives++;
      } else {
        falseNegatives++;
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

    const accuracy = (truePositives + trueNegatives) / testCases.length;

    latencies.sort((a, b) => a - b);

    return {
      precision,
      recall,
      f1Score,
      accuracy,
      averageLatency: this.average(latencies),
      p95Latency: latencies[Math.floor(latencies.length * 0.95)] || 0,
      p99Latency: latencies[Math.floor(latencies.length * 0.99)] || 0,
    };
  }

  /**
   * Compare two detectors side-by-side
   */
  async compareDetectors(
    baselineDetectFn: (messages: any[], expectedTone: string) => Promise<DriftResult>,
    nlpDetectFn: (messages: any[], expectedTone: string) => Promise<DriftResult>,
    testCases: TestCase[]
  ): Promise<{
    baseline: EvaluationMetrics;
    nlp: EvaluationMetrics;
    improvement: {
      precision: string;
      recall: string;
      f1Score: string;
      accuracy: string;
      averageLatency: string;
    };
  }> {
    console.log('Evaluating baseline detector...');
    const baselineMetrics = await this.evaluate(baselineDetectFn, testCases);

    console.log('Evaluating NLP detector...');
    const nlpMetrics = await this.evaluate(nlpDetectFn, testCases);

    return {
      baseline: baselineMetrics,
      nlp: nlpMetrics,
      improvement: {
        precision: this.formatImprovement(nlpMetrics.precision - baselineMetrics.precision),
        recall: this.formatImprovement(nlpMetrics.recall - baselineMetrics.recall),
        f1Score: this.formatImprovement(nlpMetrics.f1Score - baselineMetrics.f1Score),
        accuracy: this.formatImprovement(nlpMetrics.accuracy - baselineMetrics.accuracy),
        averageLatency: `${(nlpMetrics.averageLatency - baselineMetrics.averageLatency).toFixed(1)}ms`,
      },
    };
  }

  private average(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  }

  private formatImprovement(diff: number): string {
    const pct = (diff * 100).toFixed(1);
    return diff >= 0 ? `+${pct}%` : `${pct}%`;
  }

  /**
   * Print detailed evaluation report
   */
  printReport(metrics: EvaluationMetrics, detectorName: string = 'Detector'): void {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`  ${detectorName} Evaluation Report`);
    console.log(`${'='.repeat(60)}\n`);

    console.log('Accuracy Metrics:');
    console.log(`  Precision:  ${(metrics.precision * 100).toFixed(1)}%`);
    console.log(`  Recall:     ${(metrics.recall * 100).toFixed(1)}%`);
    console.log(`  F1 Score:   ${(metrics.f1Score * 100).toFixed(1)}%`);
    console.log(`  Accuracy:   ${(metrics.accuracy * 100).toFixed(1)}%`);

    console.log('\nPerformance Metrics:');
    console.log(`  Avg Latency: ${metrics.averageLatency.toFixed(1)}ms`);
    console.log(`  P95 Latency: ${metrics.p95Latency.toFixed(1)}ms`);
    console.log(`  P99 Latency: ${metrics.p99Latency.toFixed(1)}ms`);

    if (metrics.cacheHitRate !== undefined) {
      console.log('\nOperational Metrics:');
      console.log(`  Cache Hit Rate: ${(metrics.cacheHitRate * 100).toFixed(1)}%`);
    }

    console.log(`\n${'='.repeat(60)}\n`);
  }

  /**
   * Print comparison report
   */
  printComparison(comparison: Awaited<ReturnType<typeof this.compareDetectors>>): void {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`  Detector Comparison Report`);
    console.log(`${'='.repeat(60)}\n`);

    console.log('Baseline vs. NLP-Enhanced:');
    console.log('');
    console.log('Metric          | Baseline | NLP      | Improvement');
    console.log('----------------|----------|----------|-------------');
    console.log(`Precision       | ${(comparison.baseline.precision * 100).toFixed(1)}%    | ${(comparison.nlp.precision * 100).toFixed(1)}%    | ${comparison.improvement.precision}`);
    console.log(`Recall          | ${(comparison.baseline.recall * 100).toFixed(1)}%    | ${(comparison.nlp.recall * 100).toFixed(1)}%    | ${comparison.improvement.recall}`);
    console.log(`F1 Score        | ${(comparison.baseline.f1Score * 100).toFixed(1)}%    | ${(comparison.nlp.f1Score * 100).toFixed(1)}%    | ${comparison.improvement.f1Score}`);
    console.log(`Accuracy        | ${(comparison.baseline.accuracy * 100).toFixed(1)}%    | ${(comparison.nlp.accuracy * 100).toFixed(1)}%    | ${comparison.improvement.accuracy}`);
    console.log(`Avg Latency     | ${comparison.baseline.averageLatency.toFixed(1)}ms   | ${comparison.nlp.averageLatency.toFixed(1)}ms   | ${comparison.improvement.averageLatency}`);

    console.log(`\n${'='.repeat(60)}\n`);
  }
}
