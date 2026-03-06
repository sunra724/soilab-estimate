import { NextRequest, NextResponse } from 'next/server';
import { buildEstimateDocx, Packer } from '@/lib/docx-template';
import type { GeneratedEstimate } from '@/lib/types';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const estimate = await req.json() as GeneratedEstimate;

    if (!estimate?.request) {
      return NextResponse.json({ error: '견적서 데이터가 없습니다.' }, { status: 400 });
    }

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
    console.error('[export/docx]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
