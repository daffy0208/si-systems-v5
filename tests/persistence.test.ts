/**
 * Tests for SI Systems Persistence Layer
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PersistenceService, DatabaseConnection } from '../src/persistence';
import type { Identity, DriftScore } from '../src/types/identity';
import { unlinkSync } from 'fs';
import { randomBytes } from 'crypto';

describe('PersistenceService', () => {
  let persistence: PersistenceService;
  let testDbPath: string;

  const mockIdentity: Identity = {
    tone: ['casual', 'technical'],
    communicationRhythm: 'thoughtful',
    coreValues: ['integrity', 'innovation', 'clarity'],
    decisionMakingStyle: 'analytical',
    informationPreference: 'textual',
    emotionalTone: 'measured',
    contextLevel: 'moderate',
  };

  const mockDriftScore: DriftScore = {
    overall: 0.25,
    dimensions: {
      toneAlignment: 0.2,
      valueAlignment: 0.15,
      rhythmAlignment: 0.3,
      contextAlignment: 0.35,
    },
    flags: ['rhythm_mismatch'],
    recommendation: 'review',
    confidence: 0.85,
  };

  beforeEach(() => {
    // Create unique database path for each test to avoid conflicts
    testDbPath = `./test-si-systems-${randomBytes(8).toString('hex')}.db`;

    // Create fresh database for each test
    persistence = new PersistenceService(testDbPath);
  });

  afterEach(() => {
    // Clean up
    DatabaseConnection.closeConnection();
    try {
      unlinkSync(testDbPath);
      unlinkSync(`${testDbPath}-shm`);
      unlinkSync(`${testDbPath}-wal`);
    } catch (error) {
      // Files may not exist, ignore
    }
  });

  describe('Session Management', () => {
    it('should create a new session', () => {
      const session = persistence.createSession('user123', mockIdentity);

      expect(session.id).toBeDefined();
      expect(session.userId).toBe('user123');
      expect(session.status).toBe('active');
      expect(session.totalExchanges).toBe(0);
      expect(session.identitySnapshot).toEqual(mockIdentity);
    });

    it('should retrieve a session by ID', () => {
      const created = persistence.createSession('user123', mockIdentity);
      const retrieved = persistence.getSession(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(created.id);
      expect(retrieved!.userId).toBe('user123');
    });

    it('should get all sessions for a user', () => {
      persistence.createSession('user123', mockIdentity);
      persistence.createSession('user123', mockIdentity);
      persistence.createSession('user456', mockIdentity);

      const sessions = persistence.getSessionsByUser('user123');

      expect(sessions).toHaveLength(2);
      expect(sessions.every((s) => s.userId === 'user123')).toBe(true);
    });

    it('should filter sessions by status', () => {
      const session1 = persistence.createSession('user123', mockIdentity);
      const session2 = persistence.createSession('user123', mockIdentity);
      persistence.endSession(session1.id);

      const activeSessions = persistence.getSessionsByUser('user123', { status: 'active' });
      const endedSessions = persistence.getSessionsByUser('user123', { status: 'ended' });

      expect(activeSessions).toHaveLength(1);
      expect(activeSessions[0].id).toBe(session2.id);
      expect(endedSessions).toHaveLength(1);
      expect(endedSessions[0].id).toBe(session1.id);
    });

    it('should end a session', () => {
      const session = persistence.createSession('user123', mockIdentity);
      const ended = persistence.endSession(session.id);

      expect(ended).toBeDefined();
      expect(ended!.status).toBe('ended');
      expect(ended!.endTime).toBeDefined();
    });

    it('should archive old sessions', () => {
      const session = persistence.createSession('user123', mockIdentity);
      persistence.endSession(session.id);

      // Manually set end_time to old date
      const db = DatabaseConnection.getConnection(testDbPath);
      const oldTime = Date.now() - 100 * 24 * 60 * 60 * 1000; // 100 days ago
      db.prepare('UPDATE sessions SET end_time = ? WHERE id = ?').run(oldTime, session.id);

      const archived = persistence.archiveOldSessions(90); // Archive older than 90 days

      expect(archived).toBe(1);

      const retrieved = persistence.getSession(session.id);
      expect(retrieved!.status).toBe('archived');
    });

    it('should delete a session', () => {
      const session = persistence.createSession('user123', mockIdentity);
      const deleted = persistence.deleteSession(session.id);

      expect(deleted).toBe(true);
      expect(persistence.getSession(session.id)).toBeNull();
    });
  });

  describe('Exchange Management', () => {
    it('should add an exchange to a session', () => {
      const session = persistence.createSession('user123', mockIdentity);
      const exchange = persistence.addExchange(
        session.id,
        'Hello, AI!',
        'Hello, human! How can I help you today?'
      );

      expect(exchange.id).toBeDefined();
      expect(exchange.sessionId).toBe(session.id);
      expect(exchange.exchangeIndex).toBe(0);
      expect(exchange.userMessage).toBe('Hello, AI!');
      expect(exchange.aiResponse).toBe('Hello, human! How can I help you today?');
    });

    it('should increment exchange index automatically', () => {
      const session = persistence.createSession('user123', mockIdentity);

      const exchange1 = persistence.addExchange(session.id, 'Message 1', 'Response 1');
      const exchange2 = persistence.addExchange(session.id, 'Message 2', 'Response 2');
      const exchange3 = persistence.addExchange(session.id, 'Message 3', 'Response 3');

      expect(exchange1.exchangeIndex).toBe(0);
      expect(exchange2.exchangeIndex).toBe(1);
      expect(exchange3.exchangeIndex).toBe(2);
    });

    it('should update session exchange count via trigger', () => {
      const session = persistence.createSession('user123', mockIdentity);

      persistence.addExchange(session.id, 'Message 1', 'Response 1');
      persistence.addExchange(session.id, 'Message 2', 'Response 2');
      persistence.addExchange(session.id, 'Message 3', 'Response 3');

      const updated = persistence.getSession(session.id);
      expect(updated!.totalExchanges).toBe(3);
    });

    it('should get all exchanges for a session', () => {
      const session = persistence.createSession('user123', mockIdentity);

      persistence.addExchange(session.id, 'Message 1', 'Response 1');
      persistence.addExchange(session.id, 'Message 2', 'Response 2');
      persistence.addExchange(session.id, 'Message 3', 'Response 3');

      const exchanges = persistence.getExchangesBySession(session.id);

      expect(exchanges).toHaveLength(3);
      expect(exchanges[0].exchangeIndex).toBe(0);
      expect(exchanges[1].exchangeIndex).toBe(1);
      expect(exchanges[2].exchangeIndex).toBe(2);
    });

    it('should get recent exchanges', () => {
      const session1 = persistence.createSession('user123', mockIdentity);
      const session2 = persistence.createSession('user456', mockIdentity);

      persistence.addExchange(session1.id, 'Message 1', 'Response 1');
      persistence.addExchange(session2.id, 'Message 2', 'Response 2');

      const recent = persistence.getRecentExchanges(10);

      expect(recent).toHaveLength(2);
      expect(recent[0].timestamp).toBeGreaterThanOrEqual(recent[1].timestamp);
    });
  });

  describe('Drift Score Management', () => {
    it('should record a drift score for an exchange', () => {
      const session = persistence.createSession('user123', mockIdentity);
      const exchange = persistence.addExchange(session.id, 'Message', 'Response');

      const driftScore = persistence.recordDriftScore(exchange.id, mockDriftScore);

      expect(driftScore.id).toBeDefined();
      expect(driftScore.exchangeId).toBe(exchange.id);
      expect(driftScore.sessionId).toBe(session.id);
      expect(driftScore.overallScore).toBe(0.25);
      expect(driftScore.toneAlignment).toBe(0.2);
      expect(driftScore.flags).toEqual(['rhythm_mismatch']);
    });

    it('should update session average drift via trigger', () => {
      const session = persistence.createSession('user123', mockIdentity);
      const exchange1 = persistence.addExchange(session.id, 'Message 1', 'Response 1');
      const exchange2 = persistence.addExchange(session.id, 'Message 2', 'Response 2');

      persistence.recordDriftScore(exchange1.id, { ...mockDriftScore, overall: 0.2 });
      persistence.recordDriftScore(exchange2.id, { ...mockDriftScore, overall: 0.4 });

      const updated = persistence.getSession(session.id);
      expect(updated!.averageDrift).toBeCloseTo(0.3, 2);
    });

    it('should get drift scores for a session', () => {
      const session = persistence.createSession('user123', mockIdentity);
      const exchange1 = persistence.addExchange(session.id, 'Message 1', 'Response 1');
      const exchange2 = persistence.addExchange(session.id, 'Message 2', 'Response 2');

      persistence.recordDriftScore(exchange1.id, mockDriftScore);
      persistence.recordDriftScore(exchange2.id, mockDriftScore);

      const scores = persistence.getDriftScoresBySession(session.id);

      expect(scores).toHaveLength(2);
    });
  });

  describe('Query & Analysis API', () => {
    it('should get session summaries with statistics', () => {
      const session = persistence.createSession('user123', mockIdentity);
      const exchange1 = persistence.addExchange(session.id, 'Message 1', 'Response 1');
      const exchange2 = persistence.addExchange(session.id, 'Message 2', 'Response 2');

      persistence.recordDriftScore(exchange1.id, { ...mockDriftScore, overall: 0.1 });
      persistence.recordDriftScore(exchange2.id, { ...mockDriftScore, overall: 0.3 });

      const summaries = persistence.getSessionSummaries('user123');

      expect(summaries).toHaveLength(1);
      expect(summaries[0].minDrift).toBe(0.1);
      expect(summaries[0].maxDrift).toBe(0.3);
      expect(summaries[0].averageDrift).toBeCloseTo(0.2, 2);
      expect(summaries[0].driftTrend).toBeCloseTo(0.2, 2); // Improving (0.3 - 0.1)
    });

    it('should get drift history with filtering', () => {
      const session = persistence.createSession('user123', mockIdentity);
      const exchange1 = persistence.addExchange(session.id, 'Message 1', 'Response 1');
      const exchange2 = persistence.addExchange(session.id, 'Message 2', 'Response 2');
      const exchange3 = persistence.addExchange(session.id, 'Message 3', 'Response 3');

      persistence.recordDriftScore(exchange1.id, { ...mockDriftScore, overall: 0.1 });
      persistence.recordDriftScore(exchange2.id, { ...mockDriftScore, overall: 0.5 });
      persistence.recordDriftScore(exchange3.id, { ...mockDriftScore, overall: 0.9 });

      const highDrift = persistence.getDriftHistory({
        sessionId: session.id,
        minDriftScore: 0.4,
      });

      expect(highDrift).toHaveLength(2);
      expect(highDrift.every((ds) => ds.overallScore >= 0.4)).toBe(true);
    });

    it('should get aggregated statistics', () => {
      const session = persistence.createSession('user123', mockIdentity);
      const exchange1 = persistence.addExchange(session.id, 'Message 1', 'Response 1');
      const exchange2 = persistence.addExchange(session.id, 'Message 2', 'Response 2');

      persistence.recordDriftScore(exchange1.id, { ...mockDriftScore, overall: 0.2 });
      persistence.recordDriftScore(exchange2.id, { ...mockDriftScore, overall: 0.4 });

      const stats = persistence.getAggregatedStats('user123');

      expect(stats.totalSessions).toBe(1);
      expect(stats.totalExchanges).toBe(2);
      expect(stats.averageDrift).toBeCloseTo(0.3, 2);
      expect(stats.minDrift).toBe(0.2);
      expect(stats.maxDrift).toBe(0.4);
    });
  });

  describe('Export Functionality', () => {
    it('should export session as JSON', () => {
      const session = persistence.createSession('user123', mockIdentity);
      const exchange = persistence.addExchange(session.id, 'Message', 'Response');
      persistence.recordDriftScore(exchange.id, mockDriftScore);

      const json = persistence.exportSessionJSON(session.id);
      const data = JSON.parse(json);

      expect(data.session).toBeDefined();
      expect(data.exchanges).toHaveLength(1);
      expect(data.exchanges[0].driftScore).toBeDefined();
      expect(data.exportedAt).toBeDefined();
    });

    it('should export session as CSV', () => {
      const session = persistence.createSession('user123', mockIdentity);
      persistence.addExchange(session.id, 'Message 1', 'Response 1');
      persistence.addExchange(session.id, 'Message 2', 'Response 2');

      const csv = persistence.exportSessionCSV(session.id);

      expect(csv).toContain('timestamp,exchangeIndex');
      expect(csv).toContain('Message 1');
      expect(csv).toContain('Response 2');
      const lines = csv.split('\n');
      expect(lines).toHaveLength(3); // Header + 2 data rows
    });
  });

  describe('Performance', () => {
    it('should handle large number of exchanges efficiently', () => {
      const session = persistence.createSession('user123', mockIdentity);

      const start = Date.now();

      // Add 100 exchanges
      for (let i = 0; i < 100; i++) {
        const exchange = persistence.addExchange(
          session.id,
          `Message ${i}`,
          `Response ${i}`
        );
        persistence.recordDriftScore(exchange.id, mockDriftScore);
      }

      const duration = Date.now() - start;

      // Should complete in reasonable time (< 1 second for 100 exchanges)
      expect(duration).toBeLessThan(1000);

      const exchanges = persistence.getExchangesBySession(session.id);
      expect(exchanges).toHaveLength(100);
    });

    it('should query large history efficiently', () => {
      const session = persistence.createSession('user123', mockIdentity);

      // Add 1000 exchanges
      for (let i = 0; i < 1000; i++) {
        const exchange = persistence.addExchange(
          session.id,
          `Message ${i}`,
          `Response ${i}`
        );
        persistence.recordDriftScore(exchange.id, {
          ...mockDriftScore,
          overall: Math.random(),
        });
      }

      const start = Date.now();
      const history = persistence.getDriftHistory({
        sessionId: session.id,
        minDriftScore: 0.5,
      });
      const duration = Date.now() - start;

      // Query should be fast (< 100ms for 1000 records)
      expect(duration).toBeLessThan(100);
      expect(history.length).toBeGreaterThan(0);
    });
  });
});
