/**
 * SI Systems Persistence Service
 * Provides comprehensive API for conversation history storage and retrieval
 */

import type Database from 'better-sqlite3';
import { DatabaseConnection, getCurrentTimestamp, generateId } from './database';
import type { Identity, DriftScore } from '../types/identity';

// ============================================================================
// Types
// ============================================================================

export interface Session {
  id: string;
  userId: string;
  startTime: number;
  endTime: number | null;
  totalExchanges: number;
  averageDrift: number | null;
  status: 'active' | 'ended' | 'archived';
  identitySnapshot: Identity;
  createdAt: number;
  updatedAt: number;
}

export interface Exchange {
  id: string;
  sessionId: string;
  exchangeIndex: number;
  timestamp: number;
  userMessage: string;
  aiResponse: string;
  sessionDuration: number | null;
  interactionCount: number | null;
  createdAt: number;
}

export interface DriftScoreRecord {
  id: string;
  exchangeId: string;
  sessionId: string;
  timestamp: number;
  overallScore: number;
  toneAlignment: number;
  valueAlignment: number;
  rhythmAlignment: number;
  contextAlignment: number;
  flags: string[];
  recommendation: 'continue' | 'review' | 'recalibrate';
  confidence: number;
  createdAt: number;
}

export interface SessionSummary {
  id: string;
  userId: string;
  startTime: number;
  endTime: number | null;
  totalExchanges: number;
  averageDrift: number | null;
  status: 'active' | 'ended' | 'archived';
  minDrift: number | null;
  maxDrift: number | null;
  driftTrend: number | null; // Positive = improving, negative = worsening
  driftMeasurements: number;
}

export interface DriftTrend {
  sessionId: string;
  date: string;
  avgDrift: number;
  minDrift: number;
  maxDrift: number;
  measurements: number;
  avgToneAlignment: number;
  avgValueAlignment: number;
  avgRhythmAlignment: number;
  avgContextAlignment: number;
}

export interface QueryOptions {
  userId?: string;
  sessionId?: string;
  startDate?: number;
  endDate?: number;
  minDriftScore?: number;
  maxDriftScore?: number;
  status?: 'active' | 'ended' | 'archived';
  limit?: number;
  offset?: number;
  orderBy?: 'timestamp' | 'overall_score' | 'created_at';
  orderDirection?: 'ASC' | 'DESC';
}

// ============================================================================
// Persistence Service
// ============================================================================

// SQL injection prevention: whitelist for ORDER BY columns
const ORDER_BY_WHITELIST: Record<string, string> = {
  'timestamp': 'timestamp',
  'overall_score': 'overall_score',
  'created_at': 'created_at',
};

export class PersistenceService {
  private db: Database.Database;

  constructor(dbPath?: string) {
    this.db = DatabaseConnection.getConnection(dbPath);
  }

  // ==========================================================================
  // Session Management
  // ==========================================================================

  /**
   * Create a new conversation session
   */
  createSession(userId: string, identitySnapshot: Identity): Session {
    const id = generateId();
    const timestamp = getCurrentTimestamp();

    const stmt = this.db.prepare(`
      INSERT INTO sessions (id, user_id, start_time, identity_snapshot, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      userId,
      timestamp,
      JSON.stringify(identitySnapshot),
      timestamp,
      timestamp
    );

    return this.getSession(id)!;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): Session | null {
    const stmt = this.db.prepare(`
      SELECT * FROM sessions WHERE id = ?
    `);

    const row = stmt.get(sessionId) as any;
    return row ? this.mapSession(row) : null;
  }

  /**
   * Get all sessions for a user
   */
  getSessionsByUser(
    userId: string,
    options: { status?: Session['status']; limit?: number; offset?: number } = {}
  ): Session[] {
    let query = 'SELECT * FROM sessions WHERE user_id = ?';
    const params: any[] = [userId];

    if (options.status) {
      query += ' AND status = ?';
      params.push(options.status);
    }

    query += ' ORDER BY start_time DESC';

    if (options.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);

      if (options.offset) {
        query += ' OFFSET ?';
        params.push(options.offset);
      }
    }

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];
    return rows.map((row) => this.mapSession(row));
  }

  /**
   * Update session
   */
  updateSession(
    sessionId: string,
    updates: Partial<Pick<Session, 'endTime' | 'status'>>
  ): Session | null {
    const setClauses: string[] = [];
    const params: any[] = [];

    if (updates.endTime !== undefined) {
      setClauses.push('end_time = ?');
      params.push(updates.endTime);
    }

    if (updates.status) {
      setClauses.push('status = ?');
      params.push(updates.status);
    }

    if (setClauses.length === 0) {
      return this.getSession(sessionId);
    }

    params.push(sessionId);

    const stmt = this.db.prepare(`
      UPDATE sessions
      SET ${setClauses.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...params);
    return this.getSession(sessionId);
  }

  /**
   * End a session (mark as ended)
   */
  endSession(sessionId: string): Session | null {
    return this.updateSession(sessionId, {
      endTime: getCurrentTimestamp(),
      status: 'ended',
    });
  }

  /**
   * Archive old sessions
   */
  archiveOldSessions(olderThanDays: number): number {
    const cutoffTime = getCurrentTimestamp() - olderThanDays * 24 * 60 * 60 * 1000;

    const stmt = this.db.prepare(`
      UPDATE sessions
      SET status = 'archived'
      WHERE end_time < ? AND status = 'ended'
    `);

    const result = stmt.run(cutoffTime);
    return result.changes;
  }

  /**
   * Delete session and all related data
   */
  deleteSession(sessionId: string): boolean {
    const stmt = this.db.prepare('DELETE FROM sessions WHERE id = ?');
    const result = stmt.run(sessionId);
    return result.changes > 0;
  }

  // ==========================================================================
  // Exchange Management
  // ==========================================================================

  /**
   * Add exchange to session
   */
  addExchange(
    sessionId: string,
    userMessage: string,
    aiResponse: string,
    options: {
      sessionDuration?: number;
      interactionCount?: number;
    } = {}
  ): Exchange {
    const id = generateId();
    const timestamp = getCurrentTimestamp();

    // Get current exchange count for this session
    const countStmt = this.db.prepare(
      'SELECT total_exchanges FROM sessions WHERE id = ?'
    );
    const session = countStmt.get(sessionId) as any;

    // Explicit check: session must exist
    if (!session) {
      throw new Error(`Cannot add exchange: session '${sessionId}' does not exist`);
    }

    const exchangeIndex = session.total_exchanges;

    const stmt = this.db.prepare(`
      INSERT INTO exchanges (
        id, session_id, exchange_index, timestamp,
        user_message, ai_response, session_duration, interaction_count, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      sessionId,
      exchangeIndex,
      timestamp,
      userMessage,
      aiResponse,
      options.sessionDuration ?? null,
      options.interactionCount ?? null,
      timestamp
    );

    return this.getExchange(id)!;
  }

  /**
   * Get exchange by ID
   */
  getExchange(exchangeId: string): Exchange | null {
    const stmt = this.db.prepare('SELECT * FROM exchanges WHERE id = ?');
    const row = stmt.get(exchangeId) as any;
    return row ? this.mapExchange(row) : null;
  }

  /**
   * Get all exchanges for a session
   */
  getExchangesBySession(sessionId: string): Exchange[] {
    const stmt = this.db.prepare(`
      SELECT * FROM exchanges
      WHERE session_id = ?
      ORDER BY exchange_index ASC
    `);

    const rows = stmt.all(sessionId) as any[];
    return rows.map((row) => this.mapExchange(row));
  }

  /**
   * Get recent exchanges across all sessions
   */
  getRecentExchanges(limit: number = 100): Exchange[] {
    const stmt = this.db.prepare(`
      SELECT * FROM exchanges
      ORDER BY timestamp DESC
      LIMIT ?
    `);

    const rows = stmt.all(limit) as any[];
    return rows.map((row) => this.mapExchange(row));
  }

  // ==========================================================================
  // Drift Score Management
  // ==========================================================================

  /**
   * Record drift score for an exchange
   */
  recordDriftScore(exchangeId: string, driftScore: DriftScore): DriftScoreRecord {
    const exchange = this.getExchange(exchangeId);
    if (!exchange) {
      throw new Error(`Exchange ${exchangeId} not found`);
    }

    const id = generateId();
    const timestamp = getCurrentTimestamp();

    const stmt = this.db.prepare(`
      INSERT INTO drift_scores (
        id, exchange_id, session_id, timestamp,
        overall_score, tone_alignment, value_alignment,
        rhythm_alignment, context_alignment,
        flags, recommendation, confidence, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      exchangeId,
      exchange.sessionId,
      timestamp,
      driftScore.overall,
      driftScore.dimensions.toneAlignment,
      driftScore.dimensions.valueAlignment,
      driftScore.dimensions.rhythmAlignment,
      driftScore.dimensions.contextAlignment,
      JSON.stringify(driftScore.flags),
      driftScore.recommendation,
      driftScore.confidence,
      timestamp
    );

    return this.getDriftScore(id)!;
  }

  /**
   * Get drift score by ID
   */
  getDriftScore(driftScoreId: string): DriftScoreRecord | null {
    const stmt = this.db.prepare('SELECT * FROM drift_scores WHERE id = ?');
    const row = stmt.get(driftScoreId) as any;
    return row ? this.mapDriftScore(row) : null;
  }

  /**
   * Get drift scores for a session
   */
  getDriftScoresBySession(sessionId: string): DriftScoreRecord[] {
    const stmt = this.db.prepare(`
      SELECT * FROM drift_scores
      WHERE session_id = ?
      ORDER BY timestamp ASC
    `);

    const rows = stmt.all(sessionId) as any[];
    return rows.map((row) => this.mapDriftScore(row));
  }

  /**
   * Get drift score for an exchange
   */
  getDriftScoreByExchange(exchangeId: string): DriftScoreRecord | null {
    const stmt = this.db.prepare(`
      SELECT * FROM drift_scores WHERE exchange_id = ?
    `);

    const row = stmt.get(exchangeId) as any;
    return row ? this.mapDriftScore(row) : null;
  }

  // ==========================================================================
  // Query & Analysis API
  // ==========================================================================

  /**
   * Get session summaries with drift statistics
   */
  getSessionSummaries(userId: string, options: QueryOptions = {}): SessionSummary[] {
    let query = 'SELECT * FROM session_summary WHERE user_id = ?';
    const params: any[] = [userId];

    if (options.status) {
      query += ' AND status = ?';
      params.push(options.status);
    }

    if (options.startDate) {
      query += ' AND start_time >= ?';
      params.push(options.startDate);
    }

    if (options.endDate) {
      query += ' AND start_time <= ?';
      params.push(options.endDate);
    }

    query += ' ORDER BY start_time DESC';

    if (options.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);

      if (options.offset) {
        query += ' OFFSET ?';
        params.push(options.offset);
      }
    }

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];
    return rows.map((row) => this.mapSessionSummary(row));
  }

  /**
   * Get drift trends over time
   */
  getDriftTrends(sessionId: string): DriftTrend[] {
    const stmt = this.db.prepare(`
      SELECT * FROM drift_trends
      WHERE session_id = ?
      ORDER BY date ASC
    `);

    const rows = stmt.all(sessionId) as any[];
    return rows.map((row) => this.mapDriftTrend(row));
  }

  /**
   * Get drift history with filtering
   */
  getDriftHistory(options: QueryOptions = {}): DriftScoreRecord[] {
    let query = 'SELECT * FROM drift_scores WHERE 1=1';
    const params: any[] = [];

    if (options.sessionId) {
      query += ' AND session_id = ?';
      params.push(options.sessionId);
    }

    if (options.startDate) {
      query += ' AND timestamp >= ?';
      params.push(options.startDate);
    }

    if (options.endDate) {
      query += ' AND timestamp <= ?';
      params.push(options.endDate);
    }

    if (options.minDriftScore !== undefined) {
      query += ' AND overall_score >= ?';
      params.push(options.minDriftScore);
    }

    if (options.maxDriftScore !== undefined) {
      query += ' AND overall_score <= ?';
      params.push(options.maxDriftScore);
    }

    // Use whitelist to prevent SQL injection in ORDER BY
    const requestedOrderBy = options.orderBy || 'timestamp';
    const orderBy = ORDER_BY_WHITELIST[requestedOrderBy] || 'timestamp';
    const direction = options.orderDirection === 'ASC' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${orderBy} ${direction}`;

    if (options.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);

      if (options.offset) {
        query += ' OFFSET ?';
        params.push(options.offset);
      }
    }

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];
    return rows.map((row) => this.mapDriftScore(row));
  }

  /**
   * Get aggregated drift statistics
   */
  getAggregatedStats(userId: string, options: { days?: number } = {}): {
    totalSessions: number;
    totalExchanges: number;
    averageDrift: number;
    minDrift: number;
    maxDrift: number;
    averageDriftTrend: number;
    sessionsWithHighDrift: number; // drift > 0.5
  } {
    const cutoffTime = options.days
      ? getCurrentTimestamp() - options.days * 24 * 60 * 60 * 1000
      : 0;

    // Query session aggregates (without JOIN to avoid duplication)
    const sessionStmt = this.db.prepare(`
      SELECT
        COUNT(id) as total_sessions,
        SUM(total_exchanges) as total_exchanges,
        AVG(average_drift) as average_drift,
        SUM(CASE WHEN average_drift > 0.5 THEN 1 ELSE 0 END) as high_drift_sessions
      FROM sessions
      WHERE user_id = ? AND start_time >= ?
    `);

    const sessionRow = sessionStmt.get(userId, cutoffTime) as any;

    // Query drift score aggregates separately
    const driftStmt = this.db.prepare(`
      SELECT
        MIN(ds.overall_score) as min_drift,
        MAX(ds.overall_score) as max_drift
      FROM drift_scores ds
      JOIN sessions s ON s.id = ds.session_id
      WHERE s.user_id = ? AND s.start_time >= ?
    `);

    const driftRow = driftStmt.get(userId, cutoffTime) as any;

    // Calculate average drift trend
    const trendStmt = this.db.prepare(`
      SELECT AVG(drift_trend) as avg_trend
      FROM session_summary
      WHERE user_id = ? AND start_time >= ? AND drift_trend IS NOT NULL
    `);

    const trendRow = trendStmt.get(userId, cutoffTime) as any;

    return {
      totalSessions: sessionRow.total_sessions || 0,
      totalExchanges: sessionRow.total_exchanges || 0,
      averageDrift: sessionRow.average_drift || 0,
      minDrift: driftRow?.min_drift || 0,
      maxDrift: driftRow?.max_drift || 0,
      averageDriftTrend: trendRow?.avg_trend || 0,
      sessionsWithHighDrift: sessionRow.high_drift_sessions || 0,
    };
  }

  // ==========================================================================
  // Export Functionality
  // ==========================================================================

  /**
   * Export session data as JSON
   */
  exportSessionJSON(sessionId: string): string {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const exchanges = this.getExchangesBySession(sessionId);
    const driftScores = this.getDriftScoresBySession(sessionId);

    // Create Map for O(1) lookup instead of O(n) find
    const driftScoreMap = new Map(
      driftScores.map((ds) => [ds.exchangeId, ds])
    );

    const exportData = {
      session,
      exchanges: exchanges.map((exchange) => {
        const driftScore = driftScoreMap.get(exchange.id);
        return {
          ...exchange,
          driftScore,
        };
      }),
      exportedAt: getCurrentTimestamp(),
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Export session data as CSV
   */
  exportSessionCSV(sessionId: string): string {
    const exchanges = this.getExchangesBySession(sessionId);
    const driftScores = this.getDriftScoresBySession(sessionId);

    // Create Map for O(1) lookup instead of O(n) find
    const driftScoreMap = new Map(
      driftScores.map((ds) => [ds.exchangeId, ds])
    );

    // Helper function for proper CSV escaping
    const escapeCSV = (value: string): string => {
      // Always quote if contains: comma, quote, newline, or carriage return
      if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    const rows = exchanges.map((exchange) => {
      const driftScore = driftScoreMap.get(exchange.id);
      return {
        timestamp: new Date(exchange.timestamp).toISOString(),
        exchangeIndex: exchange.exchangeIndex,
        userMessage: escapeCSV(exchange.userMessage),
        aiResponse: escapeCSV(exchange.aiResponse),
        overallDrift: driftScore?.overallScore ?? '',
        toneAlignment: driftScore?.toneAlignment ?? '',
        valueAlignment: driftScore?.valueAlignment ?? '',
        rhythmAlignment: driftScore?.rhythmAlignment ?? '',
        contextAlignment: driftScore?.contextAlignment ?? '',
        recommendation: driftScore?.recommendation ?? '',
        confidence: driftScore?.confidence ?? '',
      };
    });

    const headers = Object.keys(rows[0] || {});
    const csv = [
      headers.join(','),
      ...rows.map((row) =>
        headers.map((h) => (row as any)[h]).join(',')
      ),
    ].join('\n');

    return csv;
  }

  /**
   * Export drift trends as CSV
   */
  exportDriftTrendsCSV(sessionId: string): string {
    const trends = this.getDriftTrends(sessionId);

    const rows = trends.map((trend) => ({
      date: trend.date,
      avgDrift: trend.avgDrift,
      minDrift: trend.minDrift,
      maxDrift: trend.maxDrift,
      measurements: trend.measurements,
      avgToneAlignment: trend.avgToneAlignment,
      avgValueAlignment: trend.avgValueAlignment,
      avgRhythmAlignment: trend.avgRhythmAlignment,
      avgContextAlignment: trend.avgContextAlignment,
    }));

    if (rows.length === 0) {
      return 'No data available';
    }

    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(','),
      ...rows.map((row) => headers.map((h) => (row as any)[h]).join(',')),
    ].join('\n');

    return csv;
  }

  // ==========================================================================
  // Maintenance
  // ==========================================================================

  /**
   * Clean up old data
   */
  cleanup(options: { deleteOlderThanDays?: number; archiveOlderThanDays?: number } = {}) {
    const results = {
      archived: 0,
      deleted: 0,
    };

    if (options.archiveOlderThanDays) {
      results.archived = this.archiveOldSessions(options.archiveOlderThanDays);
    }

    if (options.deleteOlderThanDays) {
      const cutoffTime = getCurrentTimestamp() - options.deleteOlderThanDays * 24 * 60 * 60 * 1000;

      const stmt = this.db.prepare(`
        DELETE FROM sessions
        WHERE status = 'archived' AND end_time < ?
      `);

      const result = stmt.run(cutoffTime);
      results.deleted = result.changes;
    }

    // Vacuum database to reclaim space
    DatabaseConnection.vacuum();

    return results;
  }

  /**
   * Get database statistics
   */
  getStats() {
    return DatabaseConnection.getStats();
  }

  // ==========================================================================
  // Private Mapping Functions
  // ==========================================================================

  private mapSession(row: any): Session {
    return {
      id: row.id,
      userId: row.user_id,
      startTime: row.start_time,
      endTime: row.end_time,
      totalExchanges: row.total_exchanges,
      averageDrift: row.average_drift,
      status: row.status,
      identitySnapshot: JSON.parse(row.identity_snapshot),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapExchange(row: any): Exchange {
    return {
      id: row.id,
      sessionId: row.session_id,
      exchangeIndex: row.exchange_index,
      timestamp: row.timestamp,
      userMessage: row.user_message,
      aiResponse: row.ai_response,
      sessionDuration: row.session_duration,
      interactionCount: row.interaction_count,
      createdAt: row.created_at,
    };
  }

  private mapDriftScore(row: any): DriftScoreRecord {
    return {
      id: row.id,
      exchangeId: row.exchange_id,
      sessionId: row.session_id,
      timestamp: row.timestamp,
      overallScore: row.overall_score,
      toneAlignment: row.tone_alignment,
      valueAlignment: row.value_alignment,
      rhythmAlignment: row.rhythm_alignment,
      contextAlignment: row.context_alignment,
      flags: JSON.parse(row.flags),
      recommendation: row.recommendation,
      confidence: row.confidence,
      createdAt: row.created_at,
    };
  }

  private mapSessionSummary(row: any): SessionSummary {
    return {
      id: row.id,
      userId: row.user_id,
      startTime: row.start_time,
      endTime: row.end_time,
      totalExchanges: row.total_exchanges,
      averageDrift: row.average_drift,
      status: row.status,
      minDrift: row.min_drift,
      maxDrift: row.max_drift,
      driftTrend: row.drift_trend,
      driftMeasurements: row.drift_measurements,
    };
  }

  private mapDriftTrend(row: any): DriftTrend {
    return {
      sessionId: row.session_id,
      date: row.date,
      avgDrift: row.avg_drift,
      minDrift: row.min_drift,
      maxDrift: row.max_drift,
      measurements: row.measurements,
      avgToneAlignment: row.avg_tone_alignment,
      avgValueAlignment: row.avg_value_alignment,
      avgRhythmAlignment: row.avg_rhythm_alignment,
      avgContextAlignment: row.avg_context_alignment,
    };
  }
}
