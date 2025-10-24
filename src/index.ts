/**
 * SI Systems Core Library
 * Identity-Aligned System Architecture for Human-AI Interaction
 *
 * @packageDocumentation
 */

// Core modules
export { DriftDetector } from './core/drift-detector';

// Filters
export { OutputIntegrityFilter } from './filters/output-integrity-filter';
export type { FilterCriteria, FilterResult } from './filters/output-integrity-filter';

// Prompters
export { ContextAwarePrompter } from './prompters/context-aware-prompter';
export type { PromptConfig, EnhancedPrompt } from './prompters/context-aware-prompter';

// Types
export type { Identity, DriftScore, InteractionContext } from './types/identity';
export { IdentitySchema, DriftScoreSchema, InteractionContextSchema } from './types/identity';

// Utilities
export { analyzeTone, analyzeValues, analyzeRhythm, analyzeContext } from './utils/analyzers';
