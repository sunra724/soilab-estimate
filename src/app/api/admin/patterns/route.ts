import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { initDb } from '@/lib/schema';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    initDb();
    const db = getDb();

    const patterns = db
      .prepare('SELECT * FROM pattern_cache ORDER BY sample_count DESC')
      .all() as {
      id: number;
      project_type: string;
      sample_count: number;
      avg_labor_ratio: number;
      avg_operations_ratio: number;
      avg_admin_ratio: number;
      common_items_json: string;
      updated_at: string;
    }[];

    const result = patterns.map((p) => ({
      ...p,
      common_items: JSON.parse(p.common_items_json ?? '[]'),
    }));

    return NextResponse.json({ patterns: result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
