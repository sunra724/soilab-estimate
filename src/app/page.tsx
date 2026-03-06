'use client';

import { useState } from 'react';
import EstimateForm from '@/components/EstimateForm';
import EstimatePreview from '@/components/EstimatePreview';
import type { GeneratedEstimate } from '@/lib/types';

export default function HomePage() {
  const [estimate, setEstimate] = useState<GeneratedEstimate | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <div className="flex flex-col lg:flex-row gap-0 h-full">
      {/* 좌측: 입력 폼 */}
      <div className="lg:w-[420px] shrink-0 border-r border-gray-200 p-5 overflow-y-auto">
        <EstimateForm
          onGenerate={(data) => setEstimate(data as GeneratedEstimate)}
          loading={loading}
          setLoading={setLoading}
        />
      </div>

      {/* 우측: 미리보기 */}
      <div className="flex-1 p-5 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-96 gap-4 text-gray-400">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-sm">Claude AI가 견적서를 구성하고 있습니다...</p>
          </div>
        ) : (
          <EstimatePreview estimate={estimate} onUpdate={setEstimate} />
        )}
      </div>
    </div>
  );
}
