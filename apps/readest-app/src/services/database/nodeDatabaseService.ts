import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import { DatabaseService, DatabaseExecResult, DatabaseRow, DatabaseOpts } from '@/types/database';

/**
 * DatabaseService implementation backed by sql.js (pure WASM, no native deps).
 * FTS5 is supported — sql.js compiles with it by default.
 */
export class NodeDatabaseService implements DatabaseService {
  private db: SqlJsDatabase;

  private constructor(db: SqlJsDatabase) {
    this.db = db;
  }

  static async open(path: string, _opts?: DatabaseOpts): Promise<NodeDatabaseService> {
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    db.run('PRAGMA journal_mode = WAL');
    db.run('PRAGMA foreign_keys = ON');
    return new NodeDatabaseService(db);
  }

  async execute(sql: string, params: unknown[] = []): Promise<DatabaseExecResult> {
    const stmt = this.db.prepare(sql);
    if (params.length > 0) stmt.bind(params);
    stmt.step();
    const rowsAffected = this.db.getRowsModified();
    stmt.free();

    // get last insert rowid via a separate query
    const lastIdRow = this.db.exec('SELECT last_insert_rowid() AS id');
    const lastInsertId = Number(lastIdRow[0]?.values[0]?.[0] ?? 0);

    return { rowsAffected, lastInsertId };
  }

  async select<T extends DatabaseRow = DatabaseRow>(
    sql: string,
    params: unknown[] = [],
  ): Promise<T[]> {
    const stmt = this.db.prepare(sql);
    if (params.length > 0) stmt.bind(params);
    const results: T[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as T);
    }
    stmt.free();
    return results;
  }

  async batch(statements: string[]): Promise<void> {
    this.db.run('BEGIN');
    try {
      for (const sql of statements) {
        this.db.run(sql);
      }
      this.db.run('COMMIT');
    } catch (e) {
      this.db.run('ROLLBACK');
      throw e;
    }
  }

  async close(): Promise<void> {
    this.db.close();
  }
}
