'use client';

import { useEffect, useState } from 'react';
import { SOILAB_DEFAULTS } from '@/lib/constants';

interface PatternItem {
  item_name: string;
  frequency_rate: number;
  avg_unit_price: number;
}

interface Pattern {
  project_type: string;
  sample_count: number;
  avg_labor_ratio: number;
  avg_operations_ratio: number;
  avg_admin_ratio: number;
  common_items: PatternItem[];
  updated_at: string;
}

const PCT = (n: number) => `${(n * 100).toFixed(1)}%`;
const KRW = (n: number) => `₩${n.toLocaleString()}`;

export default function AdminPage() {
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [standards, setStandards] = useState({
    RESEARCHER_MONTHLY: SOILAB_DEFAULTS.RESEARCHER_MONTHLY,
    RESEARCH_ASSISTANT_MONTHLY: SOILAB_DEFAULTS.RESEARCH_ASSISTANT_MONTHLY,
    LECTURER_PER_HOUR: SOILAB_DEFAULTS.LECTURER_PER_HOUR,
    FACILITATOR_PER_TEAM_HOUR: SOILAB_DEFAULTS.FACILITATOR_PER_TEAM_HOUR,
    EXPERT_FEE_PER_SESSION: SOILAB_DEFAULTS.EXPERT_FEE_PER_SESSION,
    PARTICIPANT_FEE_PER_SESSION: SOILAB_DEFAULTS.PARTICIPANT_FEE_PER_SESSION,
  });

  useEffect(() => {
    fetch('/api/admin/patterns')
      .then((r) => r.json())
      .then((d) => setPatterns(d.patterns ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <h1 className="text-xl font-bold">📊 학습 데이터 관리</h1>

      {/* 패턴 요약 */}
      <section className="space-y-4">
        <h2 className="font-semibold text-sm text-gray-500 uppercase tracking-wide">프로젝트 유형별 패턴</h2>

        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
            불러오는 중...
          </div>
        ) : patterns.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
            학습된 데이터가 없습니다. 관리자 → Drive 동기화를 먼저 실행해 주세요.
          </div>
        ) : (
          patterns.map((p) => (
            <div key={p.project_type} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-bold text-base">{p.project_type}</span>
                  <span className="ml-2 text-xs text-gray-400">샘플 {p.sample_count}개</span>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(p.updated_at).toLocaleDateString('ko-KR')} 기준
                </span>
              </div>

              {/* 비율 바 */}
              <div className="space-y-2">
                <div className="flex text-xs gap-4">
                  <span className="text-blue-600">인건비 {PCT(p.avg_labor_ratio)}</span>
                  <span className="text-green-600">운영비 {PCT(p.avg_operations_ratio)}</span>
                  <span className="text-gray-500">관리비 {PCT(p.avg_admin_ratio)}</span>
                </div>
                <div className="h-3 rounded-full overflow-hidden flex">
                  <div
                    className="bg-blue-500 h-full"
                    style={{ width: PCT(p.avg_labor_ratio) }}
                  />
                  <div
                    className="bg-green-500 h-full"
                    style={{ width: PCT(p.avg_operations_ratio) }}
                  />
                  <div
                    className="bg-gray-300 h-full flex-1"
                  />
                </div>
              </div>

              {/* 공통 항목 */}
              {p.common_items.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2">공통 항목 (출현 빈도순)</p>
                  <div className="space-y-1">
                    {p.common_items.slice(0, 8).map((item) => (
                      <div key={item.item_name} className="flex justify-between text-xs">
                        <span className="text-gray-700">{item.item_name}</span>
                        <span className="text-gray-400">
                          {PCT(item.frequency_rate)} 출현 · 평균 {KRW(item.avg_unit_price)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </section>

      {/* 2026 기준 단가 수정 */}
      <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="font-semibold text-sm text-gray-500 uppercase tracking-wide">2026년 정부 기준 단가</h2>
        <p className="text-xs text-gray-400">현재 세션에서만 적용됩니다. 영구 변경은 constants.ts를 수정해 주세요.</p>

        <div className="space-y-3">
          {(
            [
              ['연구원급 (월)', 'RESEARCHER_MONTHLY'],
              ['연구보조원급 (월)', 'RESEARCH_ASSISTANT_MONTHLY'],
              ['강사비 (시간)', 'LECTURER_PER_HOUR'],
              ['퍼실리테이터 (팀×시간)', 'FACILITATOR_PER_TEAM_HOUR'],
              ['전문가 수당 (회)', 'EXPERT_FEE_PER_SESSION'],
              ['참여자 수당 (회)', 'PARTICIPANT_FEE_PER_SESSION'],
            ] as [string, keyof typeof standards][]
          ).map(([label, key]) => (
            <div key={key} className="flex items-center gap-3 text-sm">
              <label className="w-44 text-gray-600 shrink-0">{label}</label>
              <div className="relative flex-1">
                <span className="absolute left-3 top-2 text-gray-400 text-xs">₩</span>
                <input
                  type="number"
                  className="w-full border rounded-lg pl-6 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={standards[key]}
                  onChange={(e) =>
                    setStandards((prev) => ({ ...prev, [key]: Number(e.target.value) }))
                  }
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
