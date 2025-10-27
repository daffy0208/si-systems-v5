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

// NLP-Enhanced Drift Detection (Phase 2)
export { EnhancedDriftDetector } from './core/drift-detector-enhanced';
export { NLPDriftDetector } from './nlp/nlp-drift-detector';
export { nlpPipeline, NLPPipeline } from './nlp/pipeline';
export type { SentimentResult } from './nlp/pipeline';
export type { Message, DriftResult, TestCase, EvaluationMetrics } from './nlp/types';

// Evaluation Tools
export { DriftDetectorEvaluator } from './evaluation/metrics';
export { evaluationDataset, getDatasetStats } from './evaluation/dataset';

// Persistence Layer (Phase 1 - P1-3)
export { PersistenceService, DatabaseConnection } from './persistence';
export type {
  Session,
  Exchange,
  DriftScoreRecord,
  SessionSummary,
  DriftTrend,
  QueryOptions,
} from './persistence';
