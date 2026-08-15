import { NextRequest, NextResponse } from 'next/server';
import { listEstimateFiles } from '@/lib/drive';
import { getDb } from '@/lib/db';
import { initDb } from '@/lib/schema';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    initDb();
    const db = getDb();

    // 1. Drive에서 파일 목록 조회
    const driveFiles = await listEstimateFiles();
    const total = driveFiles.length;

    // 2. DB에 이미 분석된 파일 ID 목록 조회
    const existingIds = new Set(
      (db.prepare('SELECT drive_file_id FROM estimate_records').all() as { drive_file_id: string }[])
        .map((r) => r.drive_file_id)
    );

    // 3. 새 파일만 필터링
    const newFiles = driveFiles.filter((f) => !existingIds.has(f.id));

    const errors: { fileName: string; error: string }[] = [];
    let synced = 0;

    // 4. 각 파일 분석 API 호출 (스트리밍 없이 순차 처리)
    for (const file of newFiles) {
      try {
        const analyzeUrl = new URL('/api/analyze', request.url);
        const res = await fetch(analyzeUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: request.headers.get('cookie') ?? '',
          },
          body: JSON.stringify({ fileId: file.id, fileName: file.name }),
          cache: 'no-store',
        });

        if (!res.ok) {
          const text = await res.text();
          errors.push({ fileName: file.name, error: text });
        } else {
          synced++;
        }
      } catch (err) {
        errors.push({
          fileName: file.name,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return NextResponse.json({ synced, total, skipped: total - newFiles.length, errors });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
