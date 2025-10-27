/**
 * Type definitions for SI Systems Dashboard
 */

export interface DriftScore {
  overall: number;
  dimensions: {
    toneAlignment: number;
    valueAlignment: number;
    rhythmAlignment: number;
    contextAlignment: number;
  };
  flags: string[];
  recommendation: string;
  confidence: number;
}

export interface DriftDataPoint {
  timestamp: number;
  score: number;
  dimensions: DriftScore['dimensions'];
}

export interface DriftHistory {
  points: DriftDataPoint[];
  maxPoints: number;
}

export type DriftLevel = 'safe' | 'warning' | 'danger';

export interface DimensionData {
  name: string;
  label: string;
  value: number;
  color: string;
}
