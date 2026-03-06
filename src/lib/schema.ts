import { getDb } from './db';

export function initDb() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS estimate_records (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      source_file_name  TEXT NOT NULL,
      drive_file_id     TEXT NOT NULL UNIQUE,
      client_name       TEXT NOT NULL DEFAULT '',
      project_name      TEXT NOT NULL DEFAULT '',
      project_type      TEXT NOT NULL DEFAULT '기타',
      date              TEXT NOT NULL DEFAULT '',
      subtotal          INTEGER NOT NULL DEFAULT 0,
      vat               INTEGER NOT NULL DEFAULT 0,
      total_with_vat    INTEGER NOT NULL DEFAULT 0,
      labor_ratio       REAL NOT NULL DEFAULT 0,
      operations_ratio  REAL NOT NULL DEFAULT 0,
      admin_ratio       REAL NOT NULL DEFAULT 0,
      items_json        TEXT NOT NULL DEFAULT '[]',
      analyzed_at       TEXT NOT NULL
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS pattern_cache (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      project_type          TEXT NOT NULL UNIQUE,
      sample_count          INTEGER NOT NULL DEFAULT 0,
      avg_labor_ratio       REAL NOT NULL DEFAULT 0.29,
      avg_operations_ratio  REAL NOT NULL DEFAULT 0.69,
      avg_admin_ratio       REAL NOT NULL DEFAULT 0.02,
      common_items_json     TEXT NOT NULL DEFAULT '[]',
      updated_at            TEXT NOT NULL
    );
  `);
}
