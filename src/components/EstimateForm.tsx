'use client';

import { useState } from 'react';
import type { GenerateRequest } from '@/lib/types';

const PROJECT_TYPES = ['리빙랩', '교육', '컨설팅', '조사연구', '행사운영', '기타'];

interface Props {
  onGenerate: (estimate: unknown) => void;
  loading: boolean;
  setLoading: (v: boolean) => void;
}

const DEFAULT_FORM: GenerateRequest = {
  client_name: '',
  project_name: '',
  project_type: '리빙랩',
  target_amount: 0,
  duration_months: 4,
  participants_count: 30,
  workshop_count: 5,
  include_certificate: false,
  include_expert: false,
  custom_notes: '',
  date: new Date().toISOString().slice(0, 7),
};

export default function EstimateForm({ onGenerate, loading, setLoading }: Props) {
  const [form, setForm] = useState<GenerateRequest>(DEFAULT_FORM);
  const [error, setError] = useState('');

  const subtotal = form.target_amount > 0
    ? Math.floor(form.target_amount / 1.1 / 10_000) * 10_000
    : 0;
  const vat = Math.floor(subtotal * 0.1);

  function set<K extends keyof GenerateRequest>(key: K, value: GenerateRequest[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '생성 실패');
      onGenerate(data.estimate);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 기본 정보 */}
      <section className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <h2 className="font-semibold text-sm text-gray-500 uppercase tracking-wide">📋 견적서 기본 정보</h2>
        <div>
          <label className="block text-sm font-medium mb-1">발주처명</label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={form.client_name}
            onChange={(e) => set('client_name', e.target.value)}
            placeholder="예: 남구청 인구총괄과"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">프로젝트명</label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={form.project_name}
            onChange={(e) => set('project_name', e.target.value)}
            placeholder="예: 2026 청년 커뮤니티 리빙랩"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">프로젝트 유형</label>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={form.project_type}
              onChange={(e) => set('project_type', e.target.value)}
            >
              {PROJECT_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">견적일</label>
            <input
              type="month"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={form.date}
              onChange={(e) => set('date', e.target.value)}
              required
            />
          </div>
        </div>
      </section>

      {/* 금액 설정 */}
      <section className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <h2 className="font-semibold text-sm text-gray-500 uppercase tracking-wide">💰 금액 설정</h2>
        <div>
          <label className="block text-sm font-medium mb-1">목표 최종금액 (VAT 포함)</label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-500 text-sm">₩</span>
            <input
              type="number"
              className="w-full border rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={form.target_amount || ''}
              onChange={(e) => set('target_amount', Number(e.target.value))}
              placeholder="27280000"
              required
              min={1000000}
            />
          </div>
        </div>
        {form.target_amount > 0 && (
          <div className="text-xs text-gray-500 space-y-1 bg-gray-50 rounded-lg p-3">
            <div>소계 (VAT 제외): <span className="font-semibold text-gray-700">₩{subtotal.toLocaleString()}</span></div>
            <div>부가세 (10%): <span className="font-semibold text-gray-700">₩{vat.toLocaleString()}</span></div>
          </div>
        )}
      </section>

      {/* 프로젝트 규모 */}
      <section className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <h2 className="font-semibold text-sm text-gray-500 uppercase tracking-wide">📐 프로젝트 규모</h2>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">기간 (개월)</label>
            <input
              type="number"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={form.duration_months}
              onChange={(e) => set('duration_months', Number(e.target.value))}
              min={1} max={36}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">워크숍 횟수</label>
            <input
              type="number"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={form.workshop_count}
              onChange={(e) => set('workshop_count', Number(e.target.value))}
              min={0}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">참여자 수 (명)</label>
            <input
              type="number"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={form.participants_count}
              onChange={(e) => set('participants_count', Number(e.target.value))}
              min={1}
              required
            />
          </div>
        </div>
      </section>

      {/* 구성 옵션 */}
      <section className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
        <h2 className="font-semibold text-sm text-gray-500 uppercase tracking-wide">🔧 구성 옵션</h2>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            className="rounded"
            checked={form.include_certificate}
            onChange={(e) => set('include_certificate', e.target.checked)}
          />
          민간자격증 발급 포함
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            className="rounded"
            checked={form.include_expert}
            onChange={(e) => set('include_expert', e.target.checked)}
          />
          전문가 자문 포함
        </label>
      </section>

      {/* 추가 요청사항 */}
      <section className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
        <h2 className="font-semibold text-sm text-gray-500 uppercase tracking-wide">📝 추가 요청사항 (선택)</h2>
        <textarea
          className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
          rows={3}
          value={form.custom_notes}
          onChange={(e) => set('custom_notes', e.target.value)}
          placeholder="특별히 포함하거나 제외할 항목, 기타 요청사항을 입력해 주세요."
        />
      </section>

      {error && (
        <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
      >
        {loading ? '⏳ 생성 중...' : '✨ 견적서 자동 생성'}
      </button>
    </form>
  );
}
