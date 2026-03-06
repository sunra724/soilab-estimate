import { NextRequest, NextResponse } from 'next/server';
import { downloadFile } from '@/lib/drive';
import { analyzeEstimatePdf } from '@/lib/analyzer';
import { getDb } from '@/lib/db';
import { initDb } from '@/lib/schema';
import type { EstimateItem } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { fileId, fileName } = await req.json() as { fileId: string; fileName: string };

    if (!fileId || !fileName) {
      return NextResponse.json({ error: 'fileId, fileName 필수' }, { status: 400 });
    }

    initDb();
    const db = getDb();

    // 이미 분석된 파일이면 기존 레코드 반환
    const existing = db
      .prepare('SELECT * FROM estimate_records WHERE drive_file_id = ?')
      .get(fileId);
    if (existing) {
      return NextResponse.json({ skipped: true, record: existing });
    }

    // 1. Drive에서 파일 다운로드
    const buffer = await downloadFile(fileId);

    // 2. Claude API로 분석
    const record = await analyzeEstimatePdf(buffer, fileName);
    if (!record) {
      return NextResponse.json({ error: 'PDF 분석 실패' }, { status: 422 });
    }
    record.drive_file_id = fileId;

    // 3. DB에 저장
    const stmt = db.prepare(`
      INSERT INTO estimate_records
        (source_file_name, drive_file_id, client_name, project_name, project_type,
         date, subtotal, vat, total_with_vat, labor_ratio, operations_ratio, admin_ratio,
         items_json, analyzed_at)
      VALUES
        (@source_file_name, @drive_file_id, @client_name, @project_name, @project_type,
         @date, @subtotal, @vat, @total_with_vat, @labor_ratio, @operations_ratio, @admin_ratio,
         @items_json, @analyzed_at)
    `);
    const result = stmt.run(record);
    record.id = Number(result.lastInsertRowid);

    // 4. 패턴 캐시 갱신
    refreshPatternCache(db, record.project_type);

    return NextResponse.json({ record });
  } catch (err) {
    console.error('[analyze]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

function refreshPatternCache(db: ReturnType<typeof getDb>, projectType: string) {
  // 같은 project_type의 모든 레코드 집계
  const records = db
    .prepare(
      'SELECT labor_ratio, operations_ratio, admin_ratio, items_json FROM estimate_records WHERE project_type = ?'
    )
    .all(projectType) as {
    labor_ratio: number;
    operations_ratio: number;
    admin_ratio: number;
    items_json: string;
  }[];

  const count = records.length;
  if (count === 0) return;

  const avg_labor = records.reduce((s, r) => s + r.labor_ratio, 0) / count;
  const avg_ops = records.reduce((s, r) => s + r.operations_ratio, 0) / count;
  const avg_admin = records.reduce((s, r) => s + r.admin_ratio, 0) / count;

  // 공통 항목 집계: 항목명별 출현 빈도와 평균 단가 계산
  const itemMap = new Map<string, { count: number; totalPrice: number }>();
  for (const r of records) {
    let items: EstimateItem[] = [];
    try {
      items = JSON.parse(r.items_json);
    } catch {
      continue;
    }
    for (const item of items) {
      const existing = itemMap.get(item.item_name);
      if (existing) {
        existing.count++;
        existing.totalPrice += item.unit_price;
      } else {
        itemMap.set(item.item_name, { count: 1, totalPrice: item.unit_price });
      }
    }
  }

  const common_items = Array.from(itemMap.entries())
    .map(([item_name, { count: c, totalPrice }]) => ({
      item_name,
      frequency_rate: c / count,
      avg_unit_price: Math.round(totalPrice / c),
    }))
    .sort((a, b) => b.frequency_rate - a.frequency_rate)
    .slice(0, 20);

  db.prepare(`
    INSERT INTO pattern_cache
      (project_type, sample_count, avg_labor_ratio, avg_operations_ratio, avg_admin_ratio, common_items_json, updated_at)
    VALUES
      (@project_type, @sample_count, @avg_labor_ratio, @avg_operations_ratio, @avg_admin_ratio, @common_items_json, @updated_at)
    ON CONFLICT(project_type) DO UPDATE SET
      sample_count         = excluded.sample_count,
      avg_labor_ratio      = excluded.avg_labor_ratio,
      avg_operations_ratio = excluded.avg_operations_ratio,
      avg_admin_ratio      = excluded.avg_admin_ratio,
      common_items_json    = excluded.common_items_json,
      updated_at           = excluded.updated_at
  `).run({
    project_type: projectType,
    sample_count: count,
    avg_labor_ratio: avg_labor,
    avg_operations_ratio: avg_ops,
    avg_admin_ratio: avg_admin,
    common_items_json: JSON.stringify(common_items),
    updated_at: new Date().toISOString(),
  });
}
