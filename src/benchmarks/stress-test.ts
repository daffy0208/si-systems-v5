/**
 * Stress testing suite for SI Systems
 * Tests system behavior under heavy load
 */

import { DriftDetector } from '../core/drift-detector';
import { EnhancedDriftDetector } from '../core/drift-detector-enhanced';
import { Identity, InteractionContext } from '../types/identity';

export interface StressTestResult {
  testName: string;
  operations: number;
  successCount: number;
  failureCount: number;
  totalTimeMs: number;
  avgTimeMs: number;
  throughput: number; // ops/sec
  memoryUsed: {
    heapUsedMB: number;
    heapTotalMB: number;
    externalMB: number;
    rssMB: number;
  };
  passed: boolean;
  details?: string;
}

/**
 * Stress test runner
 */
export class StressTestRunner {
  private results: StressTestResult[] = [];

  /**
   * Run sequential stress test
   */
  async sequentialStressTest(
    name: string,
    fn: () => Promise<void>,
    iterations: number
  ): Promise<StressTestResult> {
    console.log(`\n🔥 Running ${name} (${iterations} sequential operations)...`);

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const startMemory = process.memoryUsage();
    const startTime = performance.now();

    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < iterations; i++) {
      try {
        await fn();
        successCount++;
      } catch (error) {
        failureCount++;
      }

      // Log progress
      if ((i + 1) % 100 === 0) {
        process.stdout.write(`\r  Progress: ${i + 1}/${iterations} (${((i + 1) / iterations * 100).toFixed(1)}%)`);
      }
    }

    const endTime = performance.now();
    const endMemory = process.memoryUsage();

    const totalTimeMs = endTime - startTime;
    const avgTimeMs = totalTimeMs / iterations;
    const throughput = iterations / (totalTimeMs / 1000);

    const memoryUsed = {
      heapUsedMB: (endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024,
      heapTotalMB: endMemory.heapTotal / 1024 / 1024,
      externalMB: endMemory.external / 1024 / 1024,
      rssMB: endMemory.rss / 1024 / 1024,
    };

    console.log(`\r  Progress: ${iterations}/${iterations} (100.0%) ✅`);

    // Check if test passed
    const passed = failureCount === 0 && memoryUsed.heapUsedMB < 100;

    const result: StressTestResult = {
      testName: name,
      operations: iterations,
      successCount,
      failureCount,
      totalTimeMs,
      avgTimeMs,
      throughput,
      memoryUsed,
      passed,
      details: passed ? undefined : `Failures: ${failureCount}, Memory: ${memoryUsed.heapUsedMB.toFixed(2)}MB`,
    };

    this.results.push(result);
    return result;
  }

  /**
   * Print results
   */
  printResults(): void {
    console.log('\n' + '='.repeat(80));
    console.log('  STRESS TEST RESULTS');
    console.log('='.repeat(80) + '\n');

    for (const result of this.results) {
      console.log(`${result.testName}:`);
      console.log(`  Operations: ${result.operations}`);
      console.log(`  Success: ${result.successCount}, Failures: ${result.failureCount}`);
      console.log(`  Total Time: ${result.totalTimeMs.toFixed(2)}ms`);
      console.log(`  Avg Time: ${result.avgTimeMs.toFixed(2)}ms`);
      console.log(`  Throughput: ${result.throughput.toFixed(0)} ops/sec`);
      console.log(`  Memory Usage:`);
      console.log(`    Heap Used: ${result.memoryUsed.heapUsedMB.toFixed(2)}MB`);
      console.log(`    Heap Total: ${result.memoryUsed.heapTotalMB.toFixed(2)}MB`);
      console.log(`    RSS: ${result.memoryUsed.rssMB.toFixed(2)}MB`);
      console.log(`  Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
      if (result.details) {
        console.log(`  Details: ${result.details}`);
      }
      console.log('');
    }

    const allPassed = this.results.every(r => r.passed);
    console.log('='.repeat(80));
    console.log(`Overall: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    console.log('='.repeat(80) + '\n');
  }

  /**
   * Get results
   */
  getResults(): StressTestResult[] {
    return this.results;
  }
}

/**
 * Run standard stress tests
 */
export async function runStandardStressTests(): Promise<StressTestResult[]> {
  console.log('🔥 SI Systems Stress Test Suite\n');
  console.log('Testing system behavior under heavy load...\n');

  const runner = new StressTestRunner();

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

  const contexts: InteractionContext[] = [
    {
      userMessage: 'How do I configure the API?',
      aiResponse: 'You can configure the API in the dashboard settings.',
      conversationHistory: [],
    },
    {
      userMessage: 'What are the best practices for security?',
      aiResponse: 'Best practices include using HTTPS, validating inputs, and following OWASP guidelines.',
      conversationHistory: [],
    },
    {
      userMessage: 'Can you help me optimize performance?',
      aiResponse: 'Certainly! Performance optimization involves profiling, caching, and efficient algorithms.',
      conversationHistory: [],
    },
  ];

  // Test 1: 1000 sequential drift detections (baseline)
  const detector = new DriftDetector(identity);
  await runner.sequentialStressTest(
    'DriftDetector: 1000 sequential detections',
    async () => {
      const context = contexts[Math.floor(Math.random() * contexts.length)];
      await detector.detectDrift(context);
    },
    1000
  );

  // Test 2: 2000 sequential drift detections (enhanced, no NLP)
  const enhancedDetector = new EnhancedDriftDetector(identity, 0.3, { enableNLP: false });
  await runner.sequentialStressTest(
    'EnhancedDriftDetector (no NLP): 2000 sequential detections',
    async () => {
      const context = contexts[Math.floor(Math.random() * contexts.length)];
      await enhancedDetector.detectDrift(context);
    },
    2000
  );

  // Test 3: 1000 sequential drift detections (enhanced, with NLP)
  const nlpDetector = new EnhancedDriftDetector(identity, 0.3, {
    enableNLP: true,
    nlpValueStatements: ['provide financial advice', 'make medical diagnoses'],
  });
  await nlpDetector.initializeNLP();

  await runner.sequentialStressTest(
    'EnhancedDriftDetector (with NLP): 1000 sequential detections',
    async () => {
      const context = contexts[Math.floor(Math.random() * contexts.length)];
      await nlpDetector.detectDrift(context);
    },
    1000
  );

  // Test 4: 5000 rapid-fire detections (simulates high traffic)
  const rapidDetector = new DriftDetector(identity);
  await runner.sequentialStressTest(
    'DriftDetector: 5000 rapid-fire detections',
    async () => {
      const context = contexts[Math.floor(Math.random() * contexts.length)];
      await rapidDetector.detectDrift(context);
    },
    5000
  );

  runner.printResults();

  return runner.getResults();
}

// Run if executed directly
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  runStandardStressTests()
    .then((results) => {
      const allPassed = results.every(r => r.passed);
      console.log('\nExiting with status:', allPassed ? 0 : 1);
      process.exit(allPassed ? 0 : 1);
    })
    .catch((error) => {
      console.error('Stress test failed:', error);
      process.exit(1);
    });
}
