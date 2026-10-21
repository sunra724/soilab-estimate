import { NextRequest, NextResponse } from 'next/server';
import { buildEstimateDocx, Packer } from '@/lib/docx-template';
import { parseGeneratedEstimate } from '@/lib/validation';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    let estimate;
    try { estimate = parseGeneratedEstimate(await req.json()); }
    catch { return NextResponse.json({ error: '견적서 항목과 합계를 확인한 뒤 다시 내려받아 주세요.' }, { status: 400 }); }

    const doc = buildEstimateDocx(estimate);
    const buffer = await Packer.toBuffer(doc);

    const dateStr = format(new Date(), 'yyyyMMdd');
    const safeName = estimate.request.project_name.replace(/[/\\?%*:|"<>]/g, '_');
    const filename = `견적서_${safeName}_${dateStr}.docx`;

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (err) {
    console.error('[export/docx] Document export failed.', err instanceof Error ? err.name : 'UnknownError');
    return NextResponse.json(
      { error: '문서 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.' },
      { status: 500 }
    );
  }
}
