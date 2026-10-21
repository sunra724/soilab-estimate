import type { EstimateItem, GeneratedEstimate } from './types';

export function taxIncludedAmounts(total: number) {
  const subtotal = Math.round(total / 1.1);
  return { subtotal, vat: total - subtotal };
}

export function numberToKorean(amount: number): string {
  if (!Number.isSafeInteger(amount) || amount < 0) throw new Error('금액은 0 이상의 정수여야 합니다.');
  if (amount === 0) return '영원 정';
  const units = ['', '만', '억', '조'];
  const digits = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
  const positions = ['', '십', '백', '천'];
  let result = '';
  let remaining = amount;
  let unitIndex = 0;
  while (remaining > 0) {
    let chunk = remaining % 10_000;
    let text = '';
    let position = 0;
    while (chunk > 0) {
      const digit = chunk % 10;
      if (digit) text = `${digits[digit]}${positions[position]}${text}`;
      chunk = Math.floor(chunk / 10);
      position++;
    }
    if (text) result = `${text}${units[unitIndex]}${result}`;
    remaining = Math.floor(remaining / 10_000);
    unitIndex++;
  }
  return `${result}원 정`;
}

export function fitItemsToBudget(items: EstimateItem[], budget: number): EstimateItem[] {
  if (!Number.isSafeInteger(budget) || budget < 0 || items.length === 0) throw new Error('배분할 예산과 항목을 확인해 주세요.');
  const weights = items.map((item) => item.quantity * item.frequency * item.unit_price);
  if (weights.some((weight) => !Number.isSafeInteger(weight) || weight < 0) || items.some((item) => !Number.isSafeInteger(item.quantity) || item.quantity <= 0 || !Number.isSafeInteger(item.frequency) || item.frequency <= 0)) throw new Error('견적 항목의 수량·횟수·단가를 확인해 주세요.');
  const sum = weights.reduce((total, weight) => total + weight, 0);
  if (!Number.isSafeInteger(sum) || sum <= 0) throw new Error('유효한 기준 단가가 필요합니다.');
  const fitted = items.map((item, index) => {
    const count = item.quantity * item.frequency;
    const unit_price = Math.floor((budget * (weights[index] / sum)) / count);
    const remarks = unit_price === item.unit_price || item.remarks.includes('비례 조정') ? item.remarks : `${item.remarks.slice(0, 850)} · 예산 배정에 따른 단가 조정: ${item.unit_price.toLocaleString('ko-KR')}원 → ${unit_price.toLocaleString('ko-KR')}원`;
    return { ...item, unit_price, total: count * unit_price, remarks };
  });
  const remainder = budget - fitted.reduce((total, item) => total + item.total, 0);
  if (remainder > 0) fitted.push({ id: 0, section: items[0].section, item_name: '예산 배분 단수 조정', quantity: 1, frequency: 1, unit_price: remainder, total: remainder, remarks: '원 단위 단가 배분의 잔액' });
  return fitted;
}

export function recalculateEstimate(estimate: GeneratedEstimate, items: EstimateItem[]): GeneratedEstimate {
  if (items.some((item) => !Number.isSafeInteger(item.total) || item.total < 0 || !Number.isSafeInteger(item.quantity) || item.quantity <= 0 || !Number.isSafeInteger(item.frequency) || item.frequency <= 0 || !Number.isSafeInteger(item.unit_price) || item.unit_price < 0 || item.quantity * item.frequency * item.unit_price !== item.total)) throw new Error('항목 금액을 확인해 주세요.');
  const section = (name: EstimateItem['section']) => {
    const selected = items.filter((item) => item.section === name);
    return { items: selected, subtotal: selected.reduce((sum, item) => sum + item.total, 0) };
  };
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const vat = Math.round(subtotal * 0.1);
  const total = subtotal + vat;
  if (!Number.isSafeInteger(total) || total <= 0 || total > 100_000_000_000) throw new Error('총액을 확인해 주세요.');
  return { ...estimate, sections: {labor: section('labor'), operations: section('operations'), admin: section('admin')}, subtotal, vat, total_with_vat: total, amount_in_korean: numberToKorean(total) };
}
