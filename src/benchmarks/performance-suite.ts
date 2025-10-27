/**
 * Comprehensive Performance Benchmark Suite
 * Measures performance of all core SI Systems components
 */

import { DriftDetector } from '../core/drift-detector';
import { EnhancedDriftDetector } from '../core/drift-detector-enhanced';
import { OutputIntegrityFilter } from '../filters/output-integrity-filter';
import { ContextAwarePrompter } from '../prompters/context-aware-prompter';
import { Identity, InteractionContext } from '../types/identity';

export interface BenchmarkResult {
  name: string;
  operations: number;
  totalTimeMs: number;
  avgTimeMs: number;
  minTimeMs: number;
  maxTimeMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  opsPerSecond: number;
}

export interface PerformanceReport {
  timestamp: Date;
  benchmarks: BenchmarkResult[];
  summary: {
    totalBenchmarks: number;
    allTargetsMet: boolean;
    warnings: string[];
  };
}

/**
 * Performance benchmarking utility
 */
export class PerformanceBenchmark {
  private results: BenchmarkResult[] = [];

  /**
   * Run a benchmark
   */
  async benchmark(
    name: string,
    fn: () => Promise<void> | void,
    iterations: number = 1000
  ): Promise<BenchmarkResult> {
    const times: number[] = [];

    // Warm-up run (don't measure)
    await fn();

    // Benchmark runs
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await fn();
      const end = performance.now();
      times.push(end - start);
    }

    // Calculate statistics
    times.sort((a, b) => a - b);

    const totalTimeMs = times.reduce((sum, t) => sum + t, 0);
    const avgTimeMs = totalTimeMs / iterations;
    const minTimeMs = times[0];
    const maxTimeMs = times[times.length - 1];
    const p50Ms = times[Math.floor(iterations * 0.5)];
    const p95Ms = times[Math.floor(iterations * 0.95)];
    const p99Ms = times[Math.floor(iterations * 0.99)];
    const opsPerSecond = 1000 / avgTimeMs;

    const result: BenchmarkResult = {
      name,
      operations: iterations,
      totalTimeMs,
      avgTimeMs,
      minTimeMs,
      maxTimeMs,
      p50Ms,
      p95Ms,
      p99Ms,
      opsPerSecond,
    };

    this.results.push(result);
    return result;
  }

  /**
   * Get all results
   */
  getResults(): BenchmarkResult[] {
    return this.results;
  }

  /**
   * Clear results
   */
  clear(): void {
    this.results = [];
  }

  /**
   * Generate performance report
   */
  generateReport(): PerformanceReport {
    const warnings: string[] = [];

    // Check targets
    for (const result of this.results) {
      // Drift detection should be <150ms
      if (result.name.includes('Drift') && result.avgTimeMs > 150) {
        warnings.push(`${result.name}: avg ${result.avgTimeMs.toFixed(2)}ms exceeds 150ms target`);
      }

      // Filter should be <50ms
      if (result.name.includes('Filter') && result.avgTimeMs > 50) {
        warnings.push(`${result.name}: avg ${result.avgTimeMs.toFixed(2)}ms exceeds 50ms target`);
      }

      // Prompter should be <20ms
      if (result.name.includes('Prompter') && result.avgTimeMs > 20) {
        warnings.push(`${result.name}: avg ${result.avgTimeMs.toFixed(2)}ms exceeds 20ms target`);
      }
    }

    return {
      timestamp: new Date(),
      benchmarks: this.results,
      summary: {
        totalBenchmarks: this.results.length,
        allTargetsMet: warnings.length === 0,
        warnings,
      },
    };
  }

  /**
   * Print report to console
   */
  printReport(report: PerformanceReport = this.generateReport()): void {
    console.log('\n' + '='.repeat(80));
    console.log('  SI SYSTEMS PERFORMANCE BENCHMARK REPORT');
    console.log('  ' + report.timestamp.toISOString());
    console.log('='.repeat(80) + '\n');

    // Print table header
    console.log(
      'Benchmark'.padEnd(40) +
      'Avg'.padEnd(10) +
      'P50'.padEnd(10) +
      'P95'.padEnd(10) +
      'P99'.padEnd(10) +
      'Ops/sec'
    );
    console.log('-'.repeat(80));

    // Print each benchmark
    for (const result of report.benchmarks) {
      const name = result.name.padEnd(40);
      const avg = `${result.avgTimeMs.toFixed(2)}ms`.padEnd(10);
      const p50 = `${result.p50Ms.toFixed(2)}ms`.padEnd(10);
      const p95 = `${result.p95Ms.toFixed(2)}ms`.padEnd(10);
      const p99 = `${result.p99Ms.toFixed(2)}ms`.padEnd(10);
      const ops = result.opsPerSecond.toFixed(0);

      console.log(name + avg + p50 + p95 + p99 + ops);
    }

    console.log('\n' + '='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total Benchmarks: ${report.summary.totalBenchmarks}`);
    console.log(`All Targets Met: ${report.summary.allTargetsMet ? '✅ YES' : '❌ NO'}\n`);

    if (report.summary.warnings.length > 0) {
      console.log('⚠️  WARNINGS:');
      for (const warning of report.summary.warnings) {
        console.log(`  - ${warning}`);
      }
    } else {
      console.log('✅ All performance targets met!');
    }

    console.log('\n' + '='.repeat(80) + '\n');
  }
}

/**
 * Run standard benchmark suite
 */
export async function runStandardBenchmarks(): Promise<PerformanceReport> {
  const benchmark = new PerformanceBenchmark();

  // Sample data
  const identity: Identity = {
    tone: ['formal', 'technical'],
    communicationRhythm: 'thoughtful',
    coreValues: ['transparency', 'efficiency'],
    decisionMakingStyle: 'analytical',
    informationPreference: 'textual',
    emotionalTone: 'measured',
    contextLevel: 'moderate',
  };

  const context: InteractionContext = {
    userMessage: 'How do I configure the API settings?',
    aiResponse: 'You can configure API settings in the dashboard under Settings > API. Would you like step-by-step instructions?',
    conversationHistory: [],
    sessionDuration: 5,
  };

  console.log('Starting performance benchmarks...\n');

  // 1. Drift Detector (baseline)
  console.log('📊 Benchmarking DriftDetector...');
  const detector = new DriftDetector(identity);
  await benchmark.benchmark(
    'DriftDetector.detectDrift',
    async () => { await detector.detectDrift(context); },
    1000
  );

  // 2. Enhanced Drift Detector (with NLP disabled for fair comparison)
  console.log('📊 Benchmarking EnhancedDriftDetector (NLP disabled)...');
  const enhancedDetector = new EnhancedDriftDetector(identity, 0.3, { enableNLP: false });
  await benchmark.benchmark(
    'EnhancedDriftDetector.detectDrift (no NLP)',
    async () => { await enhancedDetector.detectDrift(context); },
    1000
  );

  // 3. Enhanced Drift Detector (with NLP enabled)
  console.log('📊 Benchmarking EnhancedDriftDetector (NLP enabled)...');
  const nlpDetector = new EnhancedDriftDetector(identity, 0.3, {
    enableNLP: true,
    nlpValueStatements: ['provide financial advice', 'make medical diagnoses'],
  });
  await nlpDetector.initializeNLP(); // Initialize once
  await benchmark.benchmark(
    'EnhancedDriftDetector.detectDrift (with NLP)',
    async () => { await nlpDetector.detectDrift(context); },
    1000
  );

  // 4. Output Integrity Filter
  console.log('📊 Benchmarking OutputIntegrityFilter...');
  const filter = new OutputIntegrityFilter(identity);
  await benchmark.benchmark(
    'OutputIntegrityFilter.filter',
    async () => { await filter.filter(context.aiResponse, context.userMessage); },
    1000
  );

  // 5. Context Aware Prompter
  console.log('📊 Benchmarking ContextAwarePrompter...');
  const prompter = new ContextAwarePrompter(identity);
  await benchmark.benchmark(
    'ContextAwarePrompter.generatePrompt',
    () => { prompter.generatePrompt(context.userMessage); },
    1000
  );

  // 6. Full workflow (detect + filter + prompt)
  console.log('📊 Benchmarking full workflow...');
  await benchmark.benchmark(
    'Full Workflow (detect + filter + prompt)',
    async () => {
      await detector.detectDrift(context);
      await filter.filter(context.aiResponse, context.userMessage);
      prompter.generatePrompt(context.userMessage);
    },
    1000
  );

  console.log('\n✅ Benchmarks complete!\n');

  const report = benchmark.generateReport();
  benchmark.printReport(report);

  return report;
}

// Run if executed directly
import { fileURLToPath } from 'url';
import { writeFileSync } from 'fs';
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  runStandardBenchmarks()
    .then((report) => {
      // Write results to file for CI/CD artifacts
      const outputPath = 'benchmark-results.json';
      writeFileSync(outputPath, JSON.stringify(report, null, 2));
      console.log(`\n📊 Benchmark results written to ${outputPath}`);
      console.log('Exiting...');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Benchmark failed:', error);
      process.exit(1);
    });
}
