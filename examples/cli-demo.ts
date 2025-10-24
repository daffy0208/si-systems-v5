#!/usr/bin/env node

/**
 * Interactive CLI demo for SI Systems
 */

import * as readline from 'readline';
import {
  DriftDetector,
  OutputIntegrityFilter,
  ContextAwarePrompter,
  Identity,
} from '../src/index';

// Default identity profile
const defaultIdentity: Identity = {
  tone: ['casual', 'empathetic'],
  communicationRhythm: 'thoughtful',
  coreValues: ['transparency', 'empathy', 'efficiency'],
  decisionMakingStyle: 'analytical',
  informationPreference: 'examples',
  emotionalTone: 'warm',
  contextLevel: 'moderate',
};

class SISystemsCLI {
  private detector: DriftDetector;
  private filter: OutputIntegrityFilter;
  private prompter: ContextAwarePrompter;
  private rl: readline.Interface;

  constructor(identity: Identity) {
    this.detector = new DriftDetector(identity, 0.3);
    this.filter = new OutputIntegrityFilter(identity);
    this.prompter = new ContextAwarePrompter(identity);

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  async start() {
    console.log('\n🧠 SI Systems - Identity-Aligned AI Interaction Demo\n');
    console.log('This demo shows how SI Systems detects and prevents identity drift.\n');

    await this.showMenu();
  }

  private async showMenu() {
    console.log('\n📋 Menu:');
    console.log('  1. Test Drift Detection');
    console.log('  2. Test Output Filter');
    console.log('  3. Generate Context-Aware Prompt');
    console.log('  4. View Identity Profile');
    console.log('  5. Exit\n');

    this.rl.question('Choose an option (1-5): ', async (answer) => {
      switch (answer.trim()) {
        case '1':
          await this.testDriftDetection();
          break;
        case '2':
          await this.testOutputFilter();
          break;
        case '3':
          await this.generatePrompt();
          break;
        case '4':
          this.viewIdentity();
          await this.showMenu();
          break;
        case '5':
          console.log('\n👋 Goodbye!\n');
          this.rl.close();
          return;
        default:
          console.log('Invalid option. Please try again.');
          await this.showMenu();
      }
    });
  }

  private async testDriftDetection() {
    console.log('\n🔍 Drift Detection Test\n');

    const userMessage = await this.question('Enter user message: ');
    const aiResponse = await this.question('Enter AI response: ');

    const result = await this.detector.detectDrift({
      userMessage,
      aiResponse,
    });

    console.log('\n📊 Results:');
    console.log(`  Overall Drift: ${(result.overall * 100).toFixed(1)}%`);
    console.log(`  Recommendation: ${result.recommendation.toUpperCase()}`);
    console.log(`  Confidence: ${(result.confidence * 100).toFixed(1)}%`);

    if (result.flags.length > 0) {
      console.log(`  ⚠️  Flags: ${result.flags.join(', ')}`);
    }

    console.log('\n  Dimension Breakdown:');
    console.log(`    Tone: ${(result.dimensions.toneAlignment * 100).toFixed(1)}%`);
    console.log(`    Values: ${(result.dimensions.valueAlignment * 100).toFixed(1)}%`);
    console.log(`    Rhythm: ${(result.dimensions.rhythmAlignment * 100).toFixed(1)}%`);
    console.log(`    Context: ${(result.dimensions.contextAlignment * 100).toFixed(1)}%`);

    await this.showMenu();
  }

  private async testOutputFilter() {
    console.log('\n🛡️  Output Filter Test\n');

    const output = await this.question('Enter AI output to filter: ');

    const result = await this.filter.filter(output);

    console.log('\n📊 Results:');
    console.log(`  Passed: ${result.passed ? '✅' : '❌'}`);
    console.log(`  Recommendation: ${result.recommendation.toUpperCase()}`);

    if (result.flags.length > 0) {
      console.log(`  ⚠️  Flags: ${result.flags.join(', ')}`);
    }

    if (result.modifications.length > 0) {
      console.log('  🔧 Modifications:');
      result.modifications.forEach((mod) => console.log(`    - ${mod}`));
    }

    if (result.output !== output) {
      console.log('\n  📝 Filtered Output:');
      console.log(`  ${result.output}`);
    }

    await this.showMenu();
  }

  private async generatePrompt() {
    console.log('\n✨ Context-Aware Prompt Generation\n');

    const userMessage = await this.question('Enter your message: ');

    const enhanced = this.prompter.generatePrompt(userMessage);

    console.log('\n📊 Generated Prompt:');
    console.log('\n--- SYSTEM PROMPT ---');
    console.log(enhanced.systemPrompt);
    console.log('\n--- USER PROMPT ---');
    console.log(enhanced.userPrompt);
    console.log('\n--- METADATA ---');
    console.log(`  Tone Guidance: ${enhanced.metadata.toneGuidance}`);
    console.log(`  Context Level: ${enhanced.metadata.contextLevel}`);

    await this.showMenu();
  }

  private viewIdentity() {
    console.log('\n👤 Current Identity Profile:\n');
    const identity = this.prompter['identity']; // Access private field for demo
    console.log(`  Tone: ${identity.tone.join(', ')}`);
    console.log(`  Rhythm: ${identity.communicationRhythm}`);
    console.log(`  Values: ${identity.coreValues.join(', ')}`);
    console.log(`  Decision Style: ${identity.decisionMakingStyle}`);
    console.log(`  Info Preference: ${identity.informationPreference}`);
    console.log(`  Emotional Tone: ${identity.emotionalTone}`);
    console.log(`  Context Level: ${identity.contextLevel}`);
  }

  private question(prompt: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(prompt, resolve);
    });
  }
}

// Start the CLI
const cli = new SISystemsCLI(defaultIdentity);
cli.start().catch(console.error);
