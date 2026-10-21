import type { GenerateRequest, GeneratedEstimate, EstimateItem } from './types';
import { numberToKorean } from './estimate-math';

const projectTypes = ['리빙랩', '교육', '컨설팅', '조사연구', '행사운영', '기타'];
const integer = (value: unknown, min: number, max: number) =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max;

export function parseGenerateRequest(value: unknown): GenerateRequest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('입력 내용을 확인해 주세요.');
  const body = value as Record<string, unknown>;
  for (const key of ['client_name', 'project_name']) {
    if (typeof body[key] !== 'string' || !body[key].trim() || body[key].length > 200) {
      throw new Error('발주처명과 프로젝트명은 200자 이내로 입력해 주세요.');
    }
  }
  if (typeof body.project_type !== 'string' || !projectTypes.includes(body.project_type)) throw new Error('프로젝트 유형을 선택해 주세요.');
  if (!integer(body.target_amount, 1_000_000, 100_000_000_000)) throw new Error('목표금액은 100만원 이상 1,000억원 이하의 정수로 입력해 주세요.');
  if (!integer(body.duration_months, 1, 36)) throw new Error('기간은 1~36개월로 입력해 주세요.');
  if (!integer(body.participants_count, 1, 100_000)) throw new Error('참여자 수는 1~100,000명으로 입력해 주세요.');
  if (!integer(body.workshop_count, 0, 10_000)) throw new Error('워크숍 횟수는 0~10,000회로 입력해 주세요.');
  if (typeof body.include_certificate !== 'boolean' || typeof body.include_expert !== 'boolean') throw new Error('구성 옵션을 확인해 주세요.');
  if (typeof body.custom_notes !== 'string' || body.custom_notes.length > 2_000) throw new Error('추가 요청사항은 2,000자 이내로 입력해 주세요.');
  if (typeof body.date !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(body.date)) throw new Error('견적일을 연월 형식으로 입력해 주세요.');
  const validated = body as unknown as GenerateRequest;
  return { ...validated, client_name: validated.client_name.trim(), project_name: validated.project_name.trim() };
}

export function parseGeneratedEstimate(value: unknown): GeneratedEstimate {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('견적서 데이터를 확인해 주세요.');
  const body = value as GeneratedEstimate;
  const request = parseGenerateRequest(body.request);
  if (!body.sections || !integer(body.subtotal, 1, 100_000_000_000) || !integer(body.vat, 0, 100_000_000_000) || !integer(body.total_with_vat, 1, 100_000_000_000) || body.subtotal + body.vat !== body.total_with_vat || Math.abs(Math.round(body.subtotal * 0.1) - body.vat) > 1) throw new Error('견적서 합계와 부가세를 확인해 주세요.');
  let sum = 0;
  for (const name of ['labor', 'operations', 'admin'] as const) {
    const section = body.sections[name];
    if (!section || !Array.isArray(section.items) || section.items.length > 100) throw new Error('견적 항목을 확인해 주세요.');
    let sectionSum = 0;
    for (const row of section.items as EstimateItem[]) {
      if (!row || row.section !== name || typeof row.item_name !== 'string' || !row.item_name.trim() || row.item_name.length > 200 || typeof row.remarks !== 'string' || row.remarks.length > 1_000 || !integer(row.quantity, 1, 100_000) || !integer(row.frequency, 1, 100_000) || !integer(row.unit_price, 0, 100_000_000_000) || !integer(row.total, 0, 100_000_000_000) || row.total !== row.quantity * row.frequency * row.unit_price) throw new Error('견적 항목의 산식을 확인해 주세요.');
      sectionSum += row.total;
    }
    if (section.subtotal !== sectionSum) throw new Error('항목별 소계를 확인해 주세요.');
    sum += sectionSum;
  }
  if (sum !== body.subtotal) throw new Error('소계 합산을 확인해 주세요.');
  if (body.generation_mode && !['ai', 'standard'].includes(body.generation_mode)) throw new Error('견적 생성 방식을 확인해 주세요.');
  if (!Array.isArray(body.reference_estimates) || body.reference_estimates.length > 20 || body.reference_estimates.some((reference) => typeof reference !== 'string' || reference.length > 500)) throw new Error('참고 자료를 확인해 주세요.');
  return { ...body, request, amount_in_korean: numberToKorean(body.total_with_vat) };
}
