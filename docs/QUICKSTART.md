# Quick Start Guide

Get started with SI Systems in 5 minutes.

## Installation

```bash
npm install @si-systems/core
```

## Basic Example

```typescript
import {
  DriftDetector,
  OutputIntegrityFilter,
  ContextAwarePrompter,
  Identity,
} from '@si-systems/core';

// 1. Define your identity
const myIdentity: Identity = {
  tone: ['casual', 'empathetic'],
  communicationRhythm: 'thoughtful',
  coreValues: ['transparency', 'empathy', 'efficiency'],
  decisionMakingStyle: 'analytical',
  informationPreference: 'examples',
  emotionalTone: 'warm',
  contextLevel: 'moderate',
};

// 2. Create detector
const detector = new DriftDetector(myIdentity);

// 3. Check for drift
const score = await detector.detectDrift({
  userMessage: 'Can you explain this simply?',
  aiResponse: 'According to ISO standard 9001...',
});

if (score.recommendation === 'recalibrate') {
  console.log('⚠️  High drift detected!');
  console.log('Flags:', score.flags);
}
```

## Try the Demo

Run the interactive CLI demo:

```bash
git clone https://github.com/daffy0208/si-systems-v5.git
cd si-systems-v5
npm install
npm run demo
```

## Next Steps

- Read the [API Documentation](./API.md)
- See [examples/](../examples/) for more usage patterns
- Learn about the [architecture](../README.md#architectural-overview)
