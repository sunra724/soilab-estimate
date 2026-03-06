import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { initDb } from '@/lib/schema';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    initDb();
    const db = getDb();

    const records = db
      .prepare(
        'SELECT id, source_file_name, drive_file_id, client_name, project_name, project_type, date, total_with_vat, analyzed_at FROM estimate_records ORDER BY analyzed_at DESC'
      )
      .all();

    return NextResponse.json({ records });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
