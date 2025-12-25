#!/usr/bin/env node

/**
 * SI Systems CLI - Command-line interface for identity-aligned AI interaction
 */

import { Command } from 'commander';
import { DriftDetector } from '../core/drift-detector';
import { Identity } from '../types/identity';

const program = new Command();

program
  .name('si-systems')
  .description('Identity-Aligned System Architecture for Human-AI Interaction')
  .version('0.1.0');

program
  .command('demo')
  .description('Run interactive demo')
  .action(async () => {
    // Dynamic import to avoid loading heavy dependencies upfront
    const { default: cliDemo } = await import('../../examples/cli-demo.js');
    // Run demo logic
    console.log('Running SI Systems interactive demo...');
    console.log('For full demo, run: npm run demo:nlp');
  });

program
  .command('evaluate')
  .description('Run evaluation suite')
  .option('-h, --hybrid', 'Run hybrid evaluation')
  .action(async (options) => {
    if (options.hybrid) {
      console.log('Running hybrid evaluation...');
      const { default: evalHybrid } = await import('../evaluation/evaluate-hybrid.js');
    } else {
      console.log('Running standard evaluation...');
      const { default: evalStandard } = await import('../evaluation/run-evaluation.js');
    }
  });

program
  .command('benchmark')
  .description('Run performance benchmarks')
  .action(async () => {
    console.log('Running performance benchmarks...');
    const { default: benchmark } = await import('../benchmarks/performance-suite.js');
  });

program.parse();
