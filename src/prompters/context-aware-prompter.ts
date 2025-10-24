import { Identity } from '../types/identity';

/**
 * Prompt configuration options
 */
export interface PromptConfig {
  includeIdentityContext: boolean;
  includeConversationHistory: boolean;
  maxHistoryLength: number;
  emphasizeValues: boolean;
  adaptTone: boolean;
}

/**
 * Enhanced prompt with context
 */
export interface EnhancedPrompt {
  systemPrompt: string;
  userPrompt: string;
  metadata: {
    identityMarkers: string[];
    contextLevel: string;
    toneGuidance: string;
  };
}

/**
 * ContextAwarePrompter - Generates prompts that preserve user identity
 *
 * Creates dynamic prompt scaffolds that ensure AI responses remain:
 * - Grounded in user-defined rules
 * - Contextually relevant
 * - Emotionally aligned
 */
export class ContextAwarePrompter {
  private identity: Identity;
  private config: PromptConfig;
  private conversationHistory: Array<{ role: string; content: string }> = [];

  constructor(identity: Identity, config?: Partial<PromptConfig>) {
    this.identity = identity;
    this.config = {
      includeIdentityContext: true,
      includeConversationHistory: true,
      maxHistoryLength: 10,
      emphasizeValues: true,
      adaptTone: true,
      ...config,
    };
  }

  /**
   * Generate an enhanced prompt with identity preservation
   */
  generatePrompt(userMessage: string): EnhancedPrompt {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(userMessage);
    const metadata = this.buildMetadata();

    return {
      systemPrompt,
      userPrompt,
      metadata,
    };
  }

  /**
   * Build system prompt with identity context
   */
  private buildSystemPrompt(): string {
    const sections: string[] = [
      '# Identity-Aligned Assistant',
      '',
      'You are an AI assistant configured to preserve user identity and communication style.',
      '',
    ];

    if (this.config.includeIdentityContext) {
      sections.push('## User Identity Profile');
      sections.push('');

      // Tone guidance
      if (this.config.adaptTone) {
        sections.push(`**Communication Style:** ${this.identity.tone.join(', ')}`);
        sections.push(`**Preferred Rhythm:** ${this.identity.communicationRhythm}`);
        sections.push(`**Emotional Tone:** ${this.identity.emotionalTone}`);
        sections.push('');
      }

      // Value alignment
      if (this.config.emphasizeValues && this.identity.coreValues.length > 0) {
        sections.push('**Core Values (do not violate):**');
        this.identity.coreValues.forEach(value => {
          sections.push(`- ${value}`);
        });
        sections.push('');
      }

      // Context preferences
      sections.push(`**Information Preference:** ${this.identity.informationPreference}`);
      sections.push(`**Detail Level:** ${this.identity.contextLevel}`);
      sections.push('');
    }

    // Response guidelines
    sections.push('## Response Guidelines');
    sections.push('');
    sections.push(this.buildResponseGuidelines());
    sections.push('');

    // Conversation history
    if (
      this.config.includeConversationHistory &&
      this.conversationHistory.length > 0
    ) {
      sections.push('## Recent Conversation');
      sections.push('');
      const recentHistory = this.conversationHistory.slice(
        -this.config.maxHistoryLength
      );
      recentHistory.forEach(turn => {
        sections.push(`**${turn.role}:** ${turn.content}`);
      });
      sections.push('');
    }

    return sections.join('\n');
  }

  /**
   * Build response guidelines based on identity
   */
  private buildResponseGuidelines(): string {
    const guidelines: string[] = [];

    // Tone guidelines
    const tones = this.identity.tone;
    if (tones.includes('casual')) {
      guidelines.push('- Use conversational, approachable language');
    }
    if (tones.includes('formal')) {
      guidelines.push('- Maintain professional tone and structure');
    }
    if (tones.includes('technical')) {
      guidelines.push('- Be precise and technically accurate');
    }
    if (tones.includes('empathetic')) {
      guidelines.push('- Show understanding and emotional awareness');
    }
    if (tones.includes('direct')) {
      guidelines.push('- Be concise and to the point');
    }

    // Rhythm guidelines
    switch (this.identity.communicationRhythm) {
      case 'fast':
        guidelines.push('- Keep responses brief and actionable');
        break;
      case 'thoughtful':
        guidelines.push('- Provide thorough, well-considered responses');
        break;
      case 'detailed':
        guidelines.push('- Include comprehensive explanations and examples');
        break;
      case 'concise':
        guidelines.push('- Prioritize brevity and clarity');
        break;
    }

    // Information preference
    switch (this.identity.informationPreference) {
      case 'visual':
        guidelines.push('- Use diagrams, tables, or visual descriptions');
        break;
      case 'examples':
        guidelines.push('- Always include concrete examples');
        break;
      case 'theory':
        guidelines.push('- Explain underlying principles and concepts');
        break;
    }

    // Context level
    switch (this.identity.contextLevel) {
      case 'minimal':
        guidelines.push('- Assume high context, minimal explanation needed');
        break;
      case 'moderate':
        guidelines.push('- Balance context with efficiency');
        break;
      case 'extensive':
        guidelines.push('- Provide comprehensive background and context');
        break;
    }

    return guidelines.join('\n');
  }

  /**
   * Build user prompt with context
   */
  private buildUserPrompt(message: string): string {
    // Add user message to history
    this.conversationHistory.push({
      role: 'user',
      content: message,
    });

    return message;
  }

  /**
   * Build metadata for tracking and analysis
   */
  private buildMetadata(): EnhancedPrompt['metadata'] {
    return {
      identityMarkers: [
        ...this.identity.tone,
        this.identity.communicationRhythm,
        this.identity.emotionalTone,
      ],
      contextLevel: this.identity.contextLevel,
      toneGuidance: this.identity.tone.join(', '),
    };
  }

  /**
   * Add assistant response to conversation history
   */
  addAssistantResponse(response: string): void {
    this.conversationHistory.push({
      role: 'assistant',
      content: response,
    });

    // Trim history if too long
    if (this.conversationHistory.length > this.config.maxHistoryLength * 2) {
      this.conversationHistory = this.conversationHistory.slice(
        -this.config.maxHistoryLength * 2
      );
    }
  }

  /**
   * Reset conversation history
   */
  resetHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * Update identity profile
   */
  updateIdentity(identity: Partial<Identity>): void {
    this.identity = { ...this.identity, ...identity };
  }

  /**
   * Get current conversation history
   */
  getHistory(): Array<{ role: string; content: string }> {
    return [...this.conversationHistory];
  }
}
