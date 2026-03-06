import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { initDb } from '@/lib/schema';
import { generateEstimate } from '@/lib/generator';
import type { GenerateRequest, PatternData } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as GenerateRequest;

    const {
      client_name,
      project_name,
      project_type,
      target_amount,
      duration_months,
      participants_count,
      workshop_count,
    } = body;

    if (
      !client_name || !project_name || !project_type ||
      !target_amount || !duration_months || !participants_count || !workshop_count
    ) {
      return NextResponse.json({ error: '필수 입력값이 누락되었습니다.' }, { status: 400 });
    }

    if (target_amount < 1_000_000) {
      return NextResponse.json(
        { error: '목표금액이 너무 작습니다. 최소 100만원 이상을 입력해 주세요.' },
        { status: 400 }
      );
    }

    initDb();
    const db = getDb();

    // 1. DB에서 같은 project_type 패턴 조회
    const patternRow = db
      .prepare('SELECT * FROM pattern_cache WHERE project_type = ?')
      .get(project_type) as {
        project_type: string;
        sample_count: number;
        avg_labor_ratio: number;
        avg_operations_ratio: number;
        avg_admin_ratio: number;
        common_items_json: string;
      } | undefined;

    let patterns: PatternData | null = null;
    if (patternRow) {
      patterns = {
        project_type: patternRow.project_type,
        sample_count: patternRow.sample_count,
        avg_labor_ratio: patternRow.avg_labor_ratio,
        avg_operations_ratio: patternRow.avg_operations_ratio,
        avg_admin_ratio: patternRow.avg_admin_ratio,
        common_items: JSON.parse(patternRow.common_items_json ?? '[]'),
      };
    }

    // 2. 견적서 자동 생성
    const estimate = await generateEstimate(body, patterns);

    return NextResponse.json({ estimate });
  } catch (err) {
    console.error('[generate]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
