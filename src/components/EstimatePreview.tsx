'use client';

import { useState } from 'react';
import type { GeneratedEstimate, EstimateItem } from '@/lib/types';
import LineItemEditor from './LineItemEditor';
import { SOILAB_COMPANY } from '@/lib/constants';

const KRW = (n: number) => `₩${n.toLocaleString()}`;

interface Props {
  estimate: GeneratedEstimate | null;
  onUpdate: (estimate: GeneratedEstimate) => void;
}

export default function EstimatePreview({ estimate, onUpdate }: Props) {
  const [editing, setEditing] = useState(false);
  const [downloading, setDownloading] = useState(false);

  if (!estimate) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-96 text-gray-400 gap-3">
        <span className="text-5xl">📄</span>
        <p className="text-sm">좌측에서 조건을 입력하고</p>
        <p className="text-sm">생성 버튼을 클릭하세요.</p>
      </div>
    );
  }

  const { sections, subtotal, vat, total_with_vat, amount_in_korean, request, reference_estimates } = estimate;
  const truncation = total_with_vat - subtotal - vat;

  async function handleDownload() {
    setDownloading(true);
    try {
      const res = await fetch('/api/export/docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(estimate),
      });
      if (!res.ok) throw new Error('다운로드 실패');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const disposition = res.headers.get('Content-Disposition') ?? '';
      const match = disposition.match(/filename\*=UTF-8''(.+)/);
      a.download = match ? decodeURIComponent(match[1]) : '견적서.docx';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  function SectionRows({ items, label, no, sectionSubtotal }: {
    items: EstimateItem[];
    label: string;
    no: number;
    sectionSubtotal: number;
  }) {
    return (
      <>
        <tr className="bg-yellow-300">
          <td className="px-2 py-1 font-bold text-center border border-gray-300">{no}</td>
          <td className="px-2 py-1 font-bold border border-gray-300" colSpan={5}>{label}</td>
          <td className="px-2 py-1 font-bold text-right border border-gray-300">{KRW(sectionSubtotal)}</td>
          <td className="border border-gray-300"></td>
        </tr>
        {items.map((item, idx) => (
          <tr key={idx} className="hover:bg-gray-50">
            <td className="px-2 py-1 border border-gray-300"></td>
            <td className="px-2 py-1 border border-gray-300 text-left">{item.item_name}</td>
            <td className="px-2 py-1 border border-gray-300 text-center">{item.quantity}</td>
            <td className="px-2 py-1 border border-gray-300 text-center">{item.frequency}</td>
            <td className="px-2 py-1 border border-gray-300 text-right">{KRW(item.unit_price)}</td>
            <td className="px-2 py-1 border border-gray-300 text-right">{KRW(item.total)}</td>
            <td className="px-2 py-1 border border-gray-300 text-left text-xs text-gray-500">{item.remarks}</td>
          </tr>
        ))}
      </>
    );
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex justify-between items-start mb-2">
          <div>
            <span className="font-bold text-blue-700 text-xl">SOILAB</span>
            <span className="ml-4 text-lg font-semibold tracking-widest">견 / 적 / 서</span>
          </div>
          <div className="text-right text-sm text-gray-600 space-y-1">
            <div>DATE: {request.date}</div>
            <div>CLIENT: {request.client_name}</div>
            <div>PROJECT: {request.project_name}</div>
          </div>
        </div>
        <p className="text-xs text-gray-400 border-t border-gray-100 pt-2">
          {SOILAB_COMPANY.name} · 대표자: {SOILAB_COMPANY.ceo} · 사업자등록번호: {SOILAB_COMPANY.bizNo} · TEL: {SOILAB_COMPANY.tel} · {SOILAB_COMPANY.address}
        </p>

        {/* 합계 행 */}
        <div className="border border-gray-300 rounded-lg px-4 py-3 bg-gray-50 flex justify-between items-center">
          <span className="font-semibold text-sm">합계 (VAT 포함)</span>
          <span className="text-sm">일금 {amount_in_korean}</span>
          <span className="font-bold text-blue-700">{KRW(total_with_vat)}</span>
        </div>
      </div>

      {/* 항목 테이블 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-blue-700 text-white">
                <th className="px-2 py-2 border border-blue-600 text-center w-8">항목</th>
                <th className="px-2 py-2 border border-blue-600 text-left min-w-40">내용 / DESCRIPTIONS</th>
                <th className="px-2 py-2 border border-blue-600 text-center w-12">수량</th>
                <th className="px-2 py-2 border border-blue-600 text-center w-14">회차</th>
                <th className="px-2 py-2 border border-blue-600 text-right w-28">단가 / UNIT COST</th>
                <th className="px-2 py-2 border border-blue-600 text-right w-28">합계 / COST</th>
                <th className="px-2 py-2 border border-blue-600 text-left min-w-28">비고 / REMARKS</th>
              </tr>
            </thead>
            <tbody>
              <SectionRows no={1} label="인건비 (Labor)" items={sections.labor.items} sectionSubtotal={sections.labor.subtotal} />
              <SectionRows no={2} label="운영비 (Operations)" items={sections.operations.items} sectionSubtotal={sections.operations.subtotal} />
              <SectionRows no={3} label="일반관리비 (General Admin)" items={sections.admin.items} sectionSubtotal={sections.admin.subtotal} />
            </tbody>
          </table>
        </div>

        {/* 요약 */}
        <div className="border-t border-gray-200 text-sm">
          {[
            { label: '소계', value: KRW(subtotal) },
            { label: '부가세 (10%)', value: KRW(vat) },
            { label: '절사', value: truncation !== 0 ? KRW(truncation) : '-' },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between px-4 py-2 border-b border-gray-100">
              <span className="text-gray-600">{label}</span>
              <span>{value}</span>
            </div>
          ))}
          <div className="flex justify-between px-4 py-2 bg-yellow-50 font-bold">
            <span>제안금액 (VAT 포함)</span>
            <span className="text-blue-700">{KRW(total_with_vat)}</span>
          </div>
        </div>
      </div>

      {reference_estimates.length > 0 && (
        <p className="text-xs text-gray-400">{reference_estimates.join(' / ')}</p>
      )}

      {/* 하단 버튼 */}
      <div className="flex gap-2">
        <button
          onClick={() => setEditing(!editing)}
          className="flex-1 border border-gray-300 hover:bg-gray-50 text-sm py-2 rounded-lg transition-colors"
        >
          {editing ? '✅ 편집 완료' : '✏️ 항목 직접 편집'}
        </button>
        <button
          onClick={handlePrint}
          className="flex-1 border border-gray-300 hover:bg-gray-50 text-sm py-2 rounded-lg transition-colors"
        >
          🖨️ PDF 저장
        </button>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white text-sm py-2 rounded-lg transition-colors"
        >
          {downloading ? '⏳ 준비 중...' : '📄 DOCX 다운로드'}
        </button>
      </div>

      {/* 인라인 편집기 */}
      {editing && (
        <LineItemEditor estimate={estimate} onUpdate={onUpdate} />
      )}
    </div>
  );
}
