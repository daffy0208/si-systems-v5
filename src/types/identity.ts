import { z } from 'zod';

/**
 * Core identity markers that define a user's communication style and values
 */
export const IdentitySchema = z.object({
  // Communication style
  tone: z.enum(['formal', 'casual', 'technical', 'empathetic', 'direct']).array().min(1),
  communicationRhythm: z.enum(['fast', 'thoughtful', 'detailed', 'concise']),

  // Values and principles
  coreValues: z.string().array(),

  // Cognitive patterns
  decisionMakingStyle: z.enum(['analytical', 'intuitive', 'collaborative', 'decisive']),
  informationPreference: z.enum(['visual', 'textual', 'examples', 'theory']),

  // Emotional markers
  emotionalTone: z.enum(['neutral', 'warm', 'passionate', 'measured', 'playful']),

  // Context preferences
  contextLevel: z.enum(['minimal', 'moderate', 'extensive']),

  // Custom fields for extensibility
  customMarkers: z.record(z.string(), z.any()).optional(),
});

export type Identity = z.infer<typeof IdentitySchema>;

/**
 * Drift score indicating alignment between user identity and AI interaction
 */
export const DriftScoreSchema = z.object({
  overall: z.number().min(0).max(1), // 0 = perfect alignment, 1 = complete drift
  dimensions: z.object({
    toneAlignment: z.number().min(0).max(1),
    valueAlignment: z.number().min(0).max(1),
    rhythmAlignment: z.number().min(0).max(1),
    contextAlignment: z.number().min(0).max(1),
  }),
  flags: z.array(z.enum([
    'tone_shift',
    'value_violation',
    'rhythm_mismatch',
    'context_overload',
    'identity_erosion',
    'emotional_mismatch'
  ])),
  recommendation: z.enum(['continue', 'review', 'recalibrate']),
  confidence: z.number().min(0).max(1), // How confident we are in this assessment
});

export type DriftScore = z.infer<typeof DriftScoreSchema>;

/**
 * Interaction context for analysis
 */
export const InteractionContextSchema = z.object({
  userMessage: z.string(),
  aiResponse: z.string(),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
    timestamp: z.date(),
  })).optional(),
  sessionDuration: z.number().optional(), // minutes
  interactionCount: z.number().optional(),
});

export type InteractionContext = z.infer<typeof InteractionContextSchema>;
