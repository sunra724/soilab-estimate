'use client';

import { useState } from 'react';
import EstimateForm from '@/components/EstimateForm';
import EstimatePreview from '@/components/EstimatePreview';
import type { GeneratedEstimate } from '@/lib/types';

export default function HomePage() {
  const [estimate, setEstimate] = useState<GeneratedEstimate | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <div>
      <section className="border-b border-blue-100 bg-blue-50 px-5 py-4 text-sm leading-6 text-blue-950 print:hidden">
        <div className="mx-auto max-w-screen-xl">
          <p className="font-bold">공개 데모 안내</p>
          <ul className="mt-1 grid gap-x-8 gap-y-1 text-xs text-blue-900 md:grid-cols-3">
            <li>실제 고객명·계약명·개인정보·영업비밀 대신 가상 정보를 사용해 주세요.</li>
            <li>입력값은 초안 생성 중에만 처리하며 생성 이력으로 저장하지 않습니다. 추가 요청사항은 AI 항목 구성에 사용됩니다.</li>
            <li>생성 결과는 검토용 초안입니다. 실제 사용 전 단가·산식·세무·발주처 기준을 확인해 주세요.</li>
          </ul>
        </div>
      </section>

      <div className="flex flex-col gap-0 lg:flex-row">
        {/* 좌측: 입력 폼 */}
        <div className="shrink-0 border-r border-gray-200 p-5 lg:w-[420px]">
          <EstimateForm
            onGenerate={(data) => setEstimate(data as GeneratedEstimate)}
            loading={loading}
            setLoading={setLoading}
          />
        </div>

        {/* 우측: 미리보기 */}
        <div className="flex-1 p-5">
          {loading ? (
            <div className="flex h-96 flex-col items-center justify-center gap-4 text-gray-400">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
              <p className="text-sm">Claude AI가 견적서를 구성하고 있습니다...</p>
            </div>
          ) : (
            <EstimatePreview estimate={estimate} onUpdate={setEstimate} />
          )}
        </div>
      </div>
    </div>
  );
}
