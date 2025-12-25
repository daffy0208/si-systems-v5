#!/usr/bin/env node

/**
 * SI Systems CLI - Command-line interface for identity-aligned AI interaction
 */

import { Command } from 'commander';

const program = new Command();

program
  .name('si-systems')
  .description('Identity-Aligned System Architecture for Human-AI Interaction')
  .version('0.1.0');

program
  .command('demo')
  .description('Run interactive demo')
  .action(() => {
    console.log('Running SI Systems interactive demo...');
    console.log('For full interactive demo, run: npm run demo');
    console.log('For NLP demo, run: npm run demo:nlp');
    console.log('\nNote: Use npm run commands in development mode for full functionality.');
  });

program
  .command('evaluate')
  .description('Run evaluation suite')
  .option('-h, --hybrid', 'Run hybrid evaluation')
  .action((options) => {
    if (options.hybrid) {
      console.log('Running hybrid evaluation...');
      console.log('Use: npm run evaluate:hybrid');
    } else {
      console.log('Running standard evaluation...');
      console.log('Use: npm run evaluate');
    }
  });

program
  .command('benchmark')
  .description('Run performance benchmarks')
  .action(() => {
    console.log('Running performance benchmarks...');
    console.log('Use: npm run benchmark');
  });

program
  .command('stress-test')
  .description('Run stress tests')
  .action(() => {
    console.log('Running stress tests...');
    console.log('Use: npm run stress-test');
  });

program.parse();
