import Anthropic from '@anthropic-ai/sdk';
import { SOILAB_DEFAULTS } from './constants';
import type { EstimateItem, GenerateRequest, GeneratedEstimate, PatternData } from './types';

const client = new Anthropic();

// ─── 인건비 항목 생성 ──────────────────────────────────────────────────────────

function buildLaborItems(
  budget: number,
  request: GenerateRequest
): EstimateItem[] {
  const { duration_months } = request;
  const rate = SOILAB_DEFAULTS.LABOR_PARTICIPATION_RATE;

  const researcherUnit = Math.round(SOILAB_DEFAULTS.RESEARCHER_MONTHLY * rate);
  const assistantUnit = Math.round(SOILAB_DEFAULTS.RESEARCH_ASSISTANT_MONTHLY * rate);

  const researcherTotal = researcherUnit * duration_months;
  const assistantTotal = assistantUnit * duration_months;
  const sumByStandard = researcherTotal + assistantTotal;

  // 기준 합산이 예산보다 클 경우: 참여율 비율로 조정
  let scale = 1;
  if (sumByStandard > budget) {
    scale = budget / sumByStandard;
  }

  const items: EstimateItem[] = [
    {
      id: 0,
      section: 'labor',
      item_name: '과업 실무 담당자',
      quantity: 1,
      frequency: duration_months,
      unit_price: Math.round(researcherUnit * scale),
      total: Math.round(researcherTotal * scale),
      remarks: `학술연구용역 연구원급 × ${rate * 100}% × ${duration_months}개월`,
    },
    {
      id: 0,
      section: 'labor',
      item_name: '과업 보조 담당자',
      quantity: 1,
      frequency: duration_months,
      unit_price: Math.round(assistantUnit * scale),
      total: Math.round(assistantTotal * scale),
      remarks: `학술연구용역 연구보조원급 × ${rate * 100}% × ${duration_months}개월`,
    },
  ];

  // 잔여 예산이 있으면 마지막 항목 합계에서 흡수
  const actualSum = items.reduce((s, i) => s + i.total, 0);
  const diff = budget - actualSum;
  if (Math.abs(diff) > 0) {
    items[items.length - 1].total += diff;
  }

  return items;
}

// ─── 운영비 항목 생성 (Claude API) ────────────────────────────────────────────

async function buildOpsItems(
  budget: number,
  request: GenerateRequest,
  patterns: PatternData | null
): Promise<EstimateItem[]> {
  const similarItems = patterns?.common_items?.slice(0, 10) ?? [];

  const prompt = `소이랩의 "${request.project_type}" 프로젝트 견적서 운영비 항목을 구성해줘.

조건:
- 총 운영비 예산: ${budget.toLocaleString()}원
- 워크숍 ${request.workshop_count}회
- 참여자 ${request.participants_count}명
- 기간 ${request.duration_months}개월
- 민간자격증 발급: ${request.include_certificate ? '포함' : '미포함'}
- 전문가 자문: ${request.include_expert ? '포함' : '미포함'}
- 과거 유사 프로젝트 공통 항목: ${JSON.stringify(similarItems)}
${request.custom_notes ? `- 추가 요청사항: ${request.custom_notes}` : ''}

2026년 정부 기준 단가:
- 강사비: 300,000원/시간
- 퍼실리테이터: 230,000원/(팀×시간)
- 참여자수당: 30,000원/회
- 민간자격증: 18,000원/인
- 다과: 5,000원/인

아래 JSON 배열 형식으로만 응답 (총합이 반드시 ${budget}원이 되도록, 다른 텍스트 없이 JSON만):
[
  { "item_name": "홍보물 제작", "quantity": 1, "frequency": 1, "unit_price": 0, "total": 0, "remarks": "..." },
  ...
]`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  const rawText =
    response.content[0].type === 'text' ? response.content[0].text : '[]';

  let parsed: Omit<EstimateItem, 'id' | 'section'>[] = [];
  try {
    parsed = JSON.parse(rawText.replace(/```json|```/g, '').trim());
  } catch {
    // 파싱 실패 시 폴백: 단일 운영비 항목으로 처리
    return [
      {
        id: 0,
        section: 'operations',
        item_name: '프로그램 운영비',
        quantity: 1,
        frequency: 1,
        unit_price: budget,
        total: budget,
        remarks: '워크숍 운영, 참여자 지원 등',
      },
    ];
  }

  // section 주입 및 id 초기화
  const items: EstimateItem[] = parsed.map((i) => ({
    ...i,
    id: 0,
    section: 'operations' as const,
  }));

  // 합계 검증 후 오차를 마지막 항목에서 흡수
  const actualSum = items.reduce((s, i) => s + i.total, 0);
  const diff = budget - actualSum;
  if (items.length > 0 && Math.abs(diff) > 0) {
    items[items.length - 1].total += diff;
    items[items.length - 1].unit_price = Math.round(
      items[items.length - 1].total / (items[items.length - 1].quantity * items[items.length - 1].frequency || 1)
    );
  }

  return items;
}

// ─── 한국어 금액 변환 ──────────────────────────────────────────────────────────

export function numberToKorean(amount: number): string {
  const units = ['', '만', '억', '조'];
  const digits = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
  const positions = ['', '십', '백', '천'];

  if (amount === 0) return '영원 정';

  let result = '';
  let unitIndex = 0;
  let remaining = Math.abs(amount);

  while (remaining > 0) {
    const chunk = remaining % 10_000;
    if (chunk > 0) {
      let chunkStr = '';
      let tmp = chunk;
      let posIdx = 0;
      while (tmp > 0) {
        const d = tmp % 10;
        if (d > 0) {
          chunkStr = `${digits[d]}${positions[posIdx]}${chunkStr}`;
        }
        tmp = Math.floor(tmp / 10);
        posIdx++;
      }
      result = `${chunkStr}${units[unitIndex]}${result}`;
    }
    remaining = Math.floor(remaining / 10_000);
    unitIndex++;
  }

  return `${result}원 정`;
}

// ─── 메인 생성 함수 ───────────────────────────────────────────────────────────

export async function generateEstimate(
  request: GenerateRequest,
  patterns: PatternData | null
): Promise<GeneratedEstimate> {
  // 1. VAT 역산: 목표금액(VAT포함) → 소계 (만원 단위 절사)
  const subtotal = Math.floor(request.target_amount / 1.1 / 10_000) * 10_000;

  // 2. 패턴 기반 비율 결정 (없으면 소이랩 기본값 사용)
  const laborRatio = patterns?.avg_labor_ratio ?? SOILAB_DEFAULTS.LABOR_RATIO;
  const opsRatio = patterns?.avg_operations_ratio ?? SOILAB_DEFAULTS.OPS_RATIO;

  // 3. 각 섹션 예산 배정
  const laborBudget = Math.round(subtotal * laborRatio);
  const opsBudget = Math.round(subtotal * opsRatio);
  const adminBudget = subtotal - laborBudget - opsBudget;

  // 4. 인건비 항목 생성
  const laborItems = buildLaborItems(laborBudget, request);

  // 5. 운영비 항목 생성 (Claude API)
  const opsItems = await buildOpsItems(opsBudget, request, patterns);

  // 6. 관리비 항목 생성
  const adminItems: EstimateItem[] = [
    {
      id: 0,
      section: 'admin',
      item_name: '일반관리비',
      quantity: 1,
      frequency: 1,
      unit_price: adminBudget,
      total: adminBudget,
      remarks: '교통비, 회의비 등',
    },
  ];

  // 7. 합산 검증: 오차를 관리비에서 흡수 (±1,000원 이내)
  const allItems = [...laborItems, ...opsItems, ...adminItems];
  const actualSubtotal = allItems.reduce((s, i) => s + i.total, 0);
  const diff = subtotal - actualSubtotal;
  if (Math.abs(diff) <= 10_000) {
    adminItems[0].total += diff;
    adminItems[0].unit_price = adminItems[0].total;
  }

  const laborSubtotal = laborItems.reduce((s, i) => s + i.total, 0);
  const opsSubtotal = opsItems.reduce((s, i) => s + i.total, 0);
  const adminSubtotal = adminItems.reduce((s, i) => s + i.total, 0);

  const vat = Math.floor(subtotal * 0.1);

  return {
    request,
    sections: {
      labor: { items: laborItems, subtotal: laborSubtotal },
      operations: { items: opsItems, subtotal: opsSubtotal },
      admin: { items: adminItems, subtotal: adminSubtotal },
    },
    subtotal,
    vat,
    total_with_vat: request.target_amount,
    amount_in_korean: numberToKorean(request.target_amount),
    reference_estimates: patterns
      ? [`${patterns.project_type} 유형 ${patterns.sample_count}개 견적 참조`]
      : [],
  };
}
