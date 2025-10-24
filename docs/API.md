# SI Systems API Documentation

## Core Modules

### DriftDetector

Monitors human-AI interactions to identify when the AI's communication style is causing the user to drift from their authentic identity markers.

```typescript
import { DriftDetector, Identity } from '@si-systems/core';

const identity: Identity = {
  tone: ['casual', 'empathetic'],
  communicationRhythm: 'thoughtful',
  coreValues: ['transparency', 'empathy'],
  // ... other identity markers
};

const detector = new DriftDetector(identity, 0.3);

const driftScore = await detector.detectDrift({
  userMessage: 'Your message',
  aiResponse: 'AI response',
});

console.log(driftScore.overall); // 0-1 scale
console.log(driftScore.recommendation); // 'continue' | 'review' | 'recalibrate'
```

#### Methods

**`detectDrift(context: InteractionContext): Promise<DriftScore>`**
- Analyzes a single interaction for drift
- Returns drift score with dimension breakdown and recommendations

**`getDriftTrend(): { average: number; trend: 'improving' | 'stable' | 'worsening' }`**
- Get drift trend over recent interactions

**`reset(): void`**
- Clear historical drift scores

---

### OutputIntegrityFilter

Filters and validates AI responses to prevent tone distortion, context manipulation, and value misalignment.

```typescript
import { OutputIntegrityFilter, Identity } from '@si-systems/core';

const filter = new OutputIntegrityFilter(identity);

const result = await filter.filter(aiOutput, userContext);

if (result.recommendation === 'block') {
  console.log('Output blocked:', result.flags);
} else if (result.recommendation === 'modify') {
  console.log('Output modified:', result.output);
}
```

#### Methods

**`filter(output: string, userContext?: string): Promise<FilterResult>`**
- Filter an AI output before presenting to user
- Returns filtered output with flags and recommendations

**`updateCriteria(criteria: Partial<FilterCriteria>): void`**
- Update filter criteria dynamically

---

### ContextAwarePrompter

Generates prompts that preserve user identity by including identity context, conversation history, and response guidelines.

```typescript
import { ContextAwarePrompter, Identity } from '@si-systems/core';

const prompter = new ContextAwarePrompter(identity);

const enhanced = prompter.generatePrompt('Explain machine learning');

console.log(enhanced.systemPrompt); // Identity-aware system prompt
console.log(enhanced.userPrompt);   // Enhanced user prompt
console.log(enhanced.metadata);     // Tracking metadata
```

#### Methods

**`generatePrompt(userMessage: string): EnhancedPrompt`**
- Generate enhanced prompt with identity context

**`addAssistantResponse(response: string): void`**
- Add assistant response to conversation history

**`resetHistory(): void`**
- Clear conversation history

**`updateIdentity(identity: Partial<Identity>): void`**
- Update identity profile dynamically

**`getHistory(): Array<{ role: string; content: string }>`**
- Get current conversation history

---

## Type Definitions

### Identity

Core identity markers that define a user's communication style and values.

```typescript
interface Identity {
  tone: ('formal' | 'casual' | 'technical' | 'empathetic' | 'direct')[];
  communicationRhythm: 'fast' | 'thoughtful' | 'detailed' | 'concise';
  coreValues: string[];
  decisionMakingStyle: 'analytical' | 'intuitive' | 'collaborative' | 'decisive';
  informationPreference: 'visual' | 'textual' | 'examples' | 'theory';
  emotionalTone: 'neutral' | 'warm' | 'passionate' | 'measured' | 'playful';
  contextLevel: 'minimal' | 'moderate' | 'extensive';
  customMarkers?: Record<string, any>;
}
```

### DriftScore

Drift score indicating alignment between user identity and AI interaction.

```typescript
interface DriftScore {
  overall: number; // 0 = perfect alignment, 1 = complete drift
  dimensions: {
    toneAlignment: number;
    valueAlignment: number;
    rhythmAlignment: number;
    contextAlignment: number;
  };
  flags: ('tone_shift' | 'value_violation' | 'rhythm_mismatch' | 'context_overload' | 'identity_erosion' | 'emotional_mismatch')[];
  recommendation: 'continue' | 'review' | 'recalibrate';
  confidence: number; // 0-1 scale
}
```

### InteractionContext

Context for analyzing an interaction.

```typescript
interface InteractionContext {
  userMessage: string;
  aiResponse: string;
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
  sessionDuration?: number; // minutes
  interactionCount?: number;
}
```

---

## Usage Examples

See [examples/](../examples/) directory for complete examples:

- [basic-usage.ts](../examples/basic-usage.ts) - Basic usage of all modules
- [cli-demo.ts](../examples/cli-demo.ts) - Interactive CLI demonstration

---

## Best Practices

1. **Initialize with accurate identity profile** - The more accurate your identity markers, the better drift detection works

2. **Use consistent thresholds** - Drift threshold of 0.3-0.4 works well for most use cases

3. **Monitor trends** - Use `getDriftTrend()` to track identity preservation over time

4. **Combine modules** - Use all three modules together for complete identity preservation:
   - ContextAwarePrompter: Generate identity-aware prompts
   - DriftDetector: Monitor drift during conversation
   - OutputIntegrityFilter: Filter responses before display

5. **Update identity dynamically** - User identity may evolve; update profiles as needed

---

## Performance Considerations

- **Memory**: Each DriftDetector stores up to 100 historical scores by default
- **Speed**: All operations are synchronous except `detectDrift()` which is async-ready
- **Scalability**: Designed for single-user sessions; for multi-user, create separate instances per user
