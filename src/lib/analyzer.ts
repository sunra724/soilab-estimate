import Anthropic from '@anthropic-ai/sdk';
import type { EstimateItem, EstimateRecord } from './types';

const client = new Anthropic();

interface RawParsedEstimate {
  client_name: string;
  project_name: string;
  project_type: string;
  date: string;
  subtotal: number;
  vat: number;
  total_with_vat: number;
  items: Omit<EstimateItem, 'id'>[];
}

export async function analyzeEstimatePdf(
  pdfBuffer: Buffer,
  fileName: string
): Promise<EstimateRecord | null> {
  const base64Pdf = pdfBuffer.toString('base64');

  const response = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 4000,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: base64Pdf,
            },
          },
          {
            type: 'text',
            text: `이 견적서 PDF를 분석해서 아래 JSON 형식으로만 응답해줘. 다른 텍스트 없이 JSON만.

{
  "client_name": "발주처명",
  "project_name": "프로젝트명",
  "project_type": "리빙랩|교육|컨설팅|조사연구|행사운영|기타 중 하나",
  "date": "YYYY-MM",
  "subtotal": 소계(숫자, VAT 제외),
  "vat": 부가세(숫자),
  "total_with_vat": 최종제안금액(숫자),
  "items": [
    {
      "section": "labor|operations|admin",
      "item_name": "항목명",
      "quantity": 수량(숫자),
      "frequency": 회차(숫자),
      "unit_price": 단가(숫자),
      "total": 합계(숫자),
      "remarks": "비고"
    }
  ]
}

section 구분:
- labor: 인건비 (실무담당자, 보조담당자 등)
- operations: 운영비 (홍보물, 참여자수당, 강사비, 퍼실리테이터 등)
- admin: 일반관리비 (교통비, 회의비 등)`,
          },
        ],
      },
    ],
  });

  const rawText =
    response.content[0].type === 'text' ? response.content[0].text : '';

  let parsed: RawParsedEstimate;
  try {
    parsed = JSON.parse(rawText.replace(/```json|```/g, '').trim());
  } catch {
    console.error(`[analyzer] JSON 파싱 실패 (${fileName}):`, rawText.slice(0, 200));
    return null;
  }

  const laborTotal = parsed.items
    .filter((i) => i.section === 'labor')
    .reduce((s, i) => s + i.total, 0);
  const opsTotal = parsed.items
    .filter((i) => i.section === 'operations')
    .reduce((s, i) => s + i.total, 0);
  const adminTotal = parsed.items
    .filter((i) => i.section === 'admin')
    .reduce((s, i) => s + i.total, 0);

  const subtotal = parsed.subtotal || laborTotal + opsTotal + adminTotal;

  return {
    id: 0, // DB 저장 시 자동 할당
    source_file_name: fileName,
    drive_file_id: '',  // 호출부에서 주입
    client_name: parsed.client_name ?? '',
    project_name: parsed.project_name ?? '',
    project_type: parsed.project_type ?? '기타',
    date: parsed.date ?? '',
    subtotal,
    vat: parsed.vat ?? Math.floor(subtotal * 0.1),
    total_with_vat: parsed.total_with_vat ?? subtotal + Math.floor(subtotal * 0.1),
    labor_ratio: subtotal > 0 ? laborTotal / subtotal : 0,
    operations_ratio: subtotal > 0 ? opsTotal / subtotal : 0,
    admin_ratio: subtotal > 0 ? adminTotal / subtotal : 0,
    items_json: JSON.stringify(parsed.items),
    analyzed_at: new Date().toISOString(),
  };
}
