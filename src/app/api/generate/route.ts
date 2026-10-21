import { NextRequest, NextResponse } from 'next/server';
import { getOptionalPattern } from '@/lib/db';
import { generateEstimate } from '@/lib/generator';
import { parseGenerateRequest } from '@/lib/validation';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    let body;
    try {
      body = parseGenerateRequest(await req.json());
    } catch (error) {
      return NextResponse.json({ error: error instanceof SyntaxError ? '올바른 JSON 입력이 필요합니다.' : error instanceof Error ? error.message : '입력 내용을 확인해 주세요.' }, { status: 400 });
    }
    const patterns = getOptionalPattern(body.project_type);

    // 2. 견적서 자동 생성
    const estimate = await generateEstimate(body, patterns);

    return NextResponse.json({ estimate });
  } catch (err) {
    console.error('[generate] Estimate generation failed.', err instanceof Error ? err.name : 'UnknownError');
    return NextResponse.json(
      { error: '견적 생성 서비스에 일시적으로 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.' },
      { status: 503 }
    );
  }
}
