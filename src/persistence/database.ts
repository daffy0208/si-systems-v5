/**
 * Database connection and initialization for SI Systems persistence layer
 * Uses better-sqlite3 for high-performance synchronous SQLite access
 */

import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';

export class DatabaseConnection {
  private static instance: Database.Database | null = null;
  private static currentPath: string | null = null;
  private static readonly DEFAULT_PATH = './si-systems.db';

  /**
   * Get or create database connection (singleton pattern)
   */
  static getConnection(dbPath: string = this.DEFAULT_PATH): Database.Database {
    // If path changed, close existing connection and create new one
    if (this.instance && this.currentPath !== dbPath) {
      this.closeConnection();
    }

    if (!this.instance) {
      this.instance = new Database(dbPath, {
        verbose: process.env.NODE_ENV === 'development' ? console.log : undefined,
      });
      this.currentPath = dbPath;

      // Enable foreign keys
      this.instance.pragma('foreign_keys = ON');

      // Performance optimizations
      this.instance.pragma('journal_mode = WAL'); // Write-Ahead Logging for better concurrency
      this.instance.pragma('synchronous = NORMAL'); // Balance between safety and speed
      this.instance.pragma('cache_size = -64000'); // 64MB cache
      this.instance.pragma('temp_store = MEMORY'); // Use memory for temp tables

      // Initialize schema
      this.initializeSchema();
    }

    return this.instance;
  }

  /**
   * Initialize database schema from SQL file
   */
  private static initializeSchema(): void {
    if (!this.instance) {
      throw new Error('Database connection not initialized');
    }

    try {
      const schemaPath = join(__dirname, 'schema.sql');
      const schema = readFileSync(schemaPath, 'utf-8');

      // Execute entire schema at once
      this.instance.exec(schema);
    } catch (error) {
      console.error('Failed to initialize database schema:', error);
      throw error;
    }
  }

  /**
   * Close database connection
   */
  static closeConnection(): void {
    if (this.instance) {
      this.instance.close();
      this.instance = null;
      this.currentPath = null;
    }
  }

  /**
   * Create a backup of the database
   */
  static async backup(backupPath: string): Promise<void> {
    if (!this.instance) {
      throw new Error('Database connection not initialized');
    }

    return new Promise((resolve, reject) => {
      try {
        this.instance!.backup(backupPath)
          .then(() => resolve())
          .catch(reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Vacuum database to reclaim space and optimize
   */
  static vacuum(): void {
    if (!this.instance) {
      throw new Error('Database connection not initialized');
    }

    this.instance.exec('VACUUM');
  }

  /**
   * Get database statistics
   */
  static getStats(): {
    pageCount: number;
    pageSize: number;
    totalSize: number;
    freePages: number;
  } {
    if (!this.instance) {
      throw new Error('Database connection not initialized');
    }

    const pageCount = this.instance.pragma('page_count', { simple: true }) as number;
    const pageSize = this.instance.pragma('page_size', { simple: true }) as number;
    const freePages = this.instance.pragma('freelist_count', { simple: true }) as number;

    return {
      pageCount,
      pageSize,
      totalSize: pageCount * pageSize,
      freePages,
    };
  }
}

/**
 * Helper function to get current timestamp in milliseconds
 */
export function getCurrentTimestamp(): number {
  return Date.now();
}

/**
 * Helper function to generate UUID v4
 */
export function generateId(): string {
  return crypto.randomUUID();
}
