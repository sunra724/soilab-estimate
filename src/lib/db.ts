import Database from 'better-sqlite3';
import path from 'path';
import { existsSync, mkdirSync } from 'node:fs';
import type { PatternData } from './types';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  const dbPath = process.env.ESTIMATE_DATABASE_PATH || path.join(process.cwd(), 'data', 'estimates.db');
  mkdirSync(path.dirname(dbPath), { recursive: true });

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  return db;
}

// Public generation only reads optional learning data. It never creates or writes a database.
export function getOptionalPattern(projectType: string, databasePath = process.env.ESTIMATE_DATABASE_PATH || path.join(process.cwd(), 'data', 'estimates.db')): PatternData | null {
  if (!existsSync(databasePath)) return null;
  let reader: Database.Database | undefined;
  try {
    reader = new Database(databasePath, { readonly: true, fileMustExist: true });
    const row = reader.prepare('SELECT * FROM pattern_cache WHERE project_type = ?').get(projectType) as {
      project_type: string; sample_count: number; avg_labor_ratio: number; avg_operations_ratio: number;
      avg_admin_ratio: number; common_items_json: string;
    } | undefined;
    if (!row || !Number.isInteger(row.sample_count) || row.sample_count <= 0) return null;
    const ratios = [row.avg_labor_ratio, row.avg_operations_ratio, row.avg_admin_ratio];
    if (ratios.some((ratio) => !Number.isFinite(ratio) || ratio < 0 || ratio > 1) || Math.abs(ratios.reduce((sum, ratio) => sum + ratio, 0) - 1) > 0.001) return null;
    const items: unknown = JSON.parse(row.common_items_json || '[]');
    if (!Array.isArray(items) || items.some((item) => !item || typeof item.item_name !== 'string' || !Number.isFinite(item.avg_unit_price) || item.avg_unit_price < 0)) return null;
    return { ...row, common_items: items };
  } catch {
    console.warn('[estimate-pattern] Optional learning data unavailable; using standard allocation.');
    return null;
  } finally {
    reader?.close();
  }
}
