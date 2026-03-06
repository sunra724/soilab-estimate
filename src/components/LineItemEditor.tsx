'use client';

import { useState } from 'react';
import type { GeneratedEstimate, EstimateItem } from '@/lib/types';

const KRW = (n: number) => `₩${n.toLocaleString()}`;

interface Props {
  estimate: GeneratedEstimate;
  onUpdate: (estimate: GeneratedEstimate) => void;
}

type Section = 'labor' | 'operations' | 'admin';
const SECTION_LABELS: Record<Section, string> = {
  labor: '인건비',
  operations: '운영비',
  admin: '관리비',
};

export default function LineItemEditor({ estimate, onUpdate }: Props) {
  const [items, setItems] = useState<EstimateItem[]>(() => [
    ...estimate.sections.labor.items,
    ...estimate.sections.operations.items,
    ...estimate.sections.admin.items,
  ]);

  const editedSubtotal = items.reduce((s, i) => s + i.total, 0);
  const targetSubtotal = estimate.subtotal;
  const diff = editedSubtotal - targetSubtotal;
  const isOver = diff > 0;

  function updateItem(idx: number, field: keyof EstimateItem, raw: string) {
    setItems((prev) => {
      const next = [...prev];
      const item = { ...next[idx] };
      if (field === 'item_name' || field === 'remarks') {
        (item as Record<string, unknown>)[field] = raw;
      } else {
        const num = Number(raw) || 0;
        (item as Record<string, unknown>)[field] = num;
        // 합계 자동 재계산
        if (field === 'quantity' || field === 'frequency' || field === 'unit_price') {
          item.total = (field === 'quantity' ? num : item.quantity)
            * (field === 'frequency' ? num : item.frequency)
            * (field === 'unit_price' ? num : item.unit_price);
        }
        if (field === 'total') {
          item.unit_price = item.quantity * item.frequency > 0
            ? Math.round(num / (item.quantity * item.frequency))
            : num;
        }
      }
      next[idx] = item;
      return next;
    });
  }

  function addItem(section: Section) {
    setItems((prev) => [
      ...prev,
      { id: 0, section, item_name: '새 항목', quantity: 1, frequency: 1, unit_price: 0, total: 0, remarks: '' },
    ]);
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function autoBalance() {
    // 운영비 마지막 항목에서 차이 흡수
    const lastOpsIdx = [...items].map((i, idx) => ({ i, idx }))
      .filter(({ i }) => i.section === 'operations')
      .pop()?.idx;
    if (lastOpsIdx === undefined) return;
    setItems((prev) => {
      const next = [...prev];
      next[lastOpsIdx] = {
        ...next[lastOpsIdx],
        total: next[lastOpsIdx].total - diff,
        unit_price: Math.max(0, next[lastOpsIdx].unit_price - diff),
      };
      return next;
    });
  }

  function applyChanges() {
    const labor = items.filter((i) => i.section === 'labor');
    const operations = items.filter((i) => i.section === 'operations');
    const admin = items.filter((i) => i.section === 'admin');
    const newSubtotal = items.reduce((s, i) => s + i.total, 0);
    const newVat = Math.floor(newSubtotal * 0.1);
    onUpdate({
      ...estimate,
      sections: {
        labor: { items: labor, subtotal: labor.reduce((s, i) => s + i.total, 0) },
        operations: { items: operations, subtotal: operations.reduce((s, i) => s + i.total, 0) },
        admin: { items: admin, subtotal: admin.reduce((s, i) => s + i.total, 0) },
      },
      subtotal: newSubtotal,
      vat: newVat,
      total_with_vat: newSubtotal + newVat,
    });
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-sm">항목 직접 편집</h3>
        {Math.abs(diff) > 0 && (
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium ${isOver ? 'text-red-500' : 'text-green-600'}`}>
              {isOver ? `+${KRW(diff)} 초과` : `${KRW(Math.abs(diff))} 부족`}
            </span>
            <button
              onClick={autoBalance}
              className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition-colors"
            >
              금액 맞추기
            </button>
          </div>
        )}
      </div>

      {(['labor', 'operations', 'admin'] as Section[]).map((section) => (
        <div key={section}>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-semibold text-gray-500 uppercase">{SECTION_LABELS[section]}</span>
            <button
              onClick={() => addItem(section)}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              + 항목 추가
            </button>
          </div>
          <div className="space-y-1">
            {items
              .map((item, idx) => ({ item, idx }))
              .filter(({ item }) => item.section === section)
              .map(({ item, idx }) => (
                <div key={idx} className="grid grid-cols-12 gap-1 items-center text-xs">
                  <input
                    className="col-span-4 border rounded px-1 py-1"
                    value={item.item_name}
                    onChange={(e) => updateItem(idx, 'item_name', e.target.value)}
                  />
                  <input
                    type="number"
                    className="col-span-1 border rounded px-1 py-1 text-center"
                    value={item.quantity}
                    onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                    title="수량"
                  />
                  <input
                    type="number"
                    className="col-span-1 border rounded px-1 py-1 text-center"
                    value={item.frequency}
                    onChange={(e) => updateItem(idx, 'frequency', e.target.value)}
                    title="회차"
                  />
                  <input
                    type="number"
                    className="col-span-2 border rounded px-1 py-1 text-right"
                    value={item.unit_price}
                    onChange={(e) => updateItem(idx, 'unit_price', e.target.value)}
                    title="단가"
                  />
                  <input
                    type="number"
                    className="col-span-2 border rounded px-1 py-1 text-right font-medium"
                    value={item.total}
                    onChange={(e) => updateItem(idx, 'total', e.target.value)}
                    title="합계"
                  />
                  <button
                    onClick={() => removeItem(idx)}
                    className="col-span-1 text-red-400 hover:text-red-600 text-center"
                  >
                    🗑
                  </button>
                  <input
                    className="col-span-12 border rounded px-1 py-1 text-gray-400"
                    value={item.remarks}
                    onChange={(e) => updateItem(idx, 'remarks', e.target.value)}
                    placeholder="비고"
                  />
                </div>
              ))}
          </div>
        </div>
      ))}

      <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
        <span className="text-xs text-gray-500">편집 소계: <strong>{KRW(editedSubtotal)}</strong></span>
        <button
          onClick={applyChanges}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 py-2 rounded-lg transition-colors"
        >
          변경 적용
        </button>
      </div>
    </div>
  );
}
