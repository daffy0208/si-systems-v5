/**
 * Type definitions for NLP-enhanced drift detection
 */

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

export interface DriftResult {
  type: 'tone' | 'value' | 'rhythm' | 'context';
  driftDetected: boolean;
  confidence: number; // 0-1
  details: {
    [key: string]: any;
  };
}

export interface TestCase {
  id: string;
  messages: Message[];
  expectedTone: 'positive' | 'neutral' | 'professional';
  hasDrift: boolean;
  driftType?: 'tone' | 'value';
  groundTruth: {
    driftLocation?: number; // Message index
    driftReason?: string;
  };
}

export interface EvaluationMetrics {
  // Accuracy metrics
  precision: number;
  recall: number;
  f1Score: number;
  accuracy: number;

  // Performance metrics
  averageLatency: number;
  p95Latency: number;
  p99Latency: number;

  // Operational metrics
  cacheHitRate?: number;
  fallbackRate?: number;
}
