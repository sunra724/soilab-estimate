'use client';

import { useEffect, useState } from 'react';

interface SyncResult {
  synced: number;
  total: number;
  skipped: number;
  errors: { fileName: string; error: string }[];
}

interface FileRecord {
  id: number;
  source_file_name: string;
  drive_file_id: string;
  client_name: string;
  project_name: string;
  project_type: string;
  date: string;
  total_with_vat: number;
  analyzed_at: string;
}

export default function SyncPage() {
  const [records, setRecords] = useState<FileRecord[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [reanalyzing, setReanalyzing] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRecords();
  }, []);

  async function fetchRecords() {
    try {
      const res = await fetch('/api/admin/records');
      const data = await res.json();
      setRecords(data.records ?? []);
    } catch {
      // 조회 실패는 조용히 처리
    }
  }

  async function handleSync() {
    setSyncing(true);
    setError('');
    setSyncResult(null);
    try {
      const res = await fetch('/api/drive/sync');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '동기화 실패');
      setSyncResult(data);
      await fetchRecords();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSyncing(false);
    }
  }

  async function handleReanalyze(fileId: string, fileName: string) {
    setReanalyzing(fileId);
    setError('');
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, fileName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '재분석 실패');
      await fetchRecords();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setReanalyzing(null);
    }
  }

  const lastSync = records[0]?.analyzed_at
    ? new Date(records[0].analyzed_at).toLocaleString('ko-KR')
    : '없음';

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <h1 className="text-xl font-bold">⚙️ Google Drive 동기화</h1>

      {/* 상태 카드 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">폴더 ID</span>
            <p className="font-mono text-xs truncate mt-1 text-gray-700">
              {process.env.NEXT_PUBLIC_DRIVE_FOLDER_ID ?? '환경변수 설정됨'}
            </p>
          </div>
          <div>
            <span className="text-gray-500">마지막 동기화</span>
            <p className="font-medium mt-1">{lastSync}</p>
          </div>
          <div>
            <span className="text-gray-500">분석된 파일</span>
            <p className="font-bold text-blue-700 text-lg mt-1">{records.length}개</p>
          </div>
        </div>

        <button
          onClick={handleSync}
          disabled={syncing}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2.5 rounded-lg transition-colors"
        >
          {syncing ? '⏳ 동기화 중...' : '🔄 지금 동기화'}
        </button>
      </div>

      {/* 동기화 결과 */}
      {syncResult && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm space-y-1">
          <p className="font-semibold text-green-700">동기화 완료</p>
          <p>Drive 파일 총 {syncResult.total}개 중 {syncResult.synced}개 새로 분석, {syncResult.skipped}개 건너뜀</p>
          {syncResult.errors.length > 0 && (
            <div className="mt-2 space-y-1">
              <p className="font-medium text-red-600">실패 ({syncResult.errors.length}건):</p>
              {syncResult.errors.map((e, i) => (
                <p key={i} className="text-red-500 text-xs">{e.fileName}: {e.error}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* 파일 목록 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-sm">분석된 파일 목록</h2>
        </div>
        {records.length === 0 ? (
          <div className="px-5 py-8 text-center text-gray-400 text-sm">
            분석된 파일이 없습니다. 동기화를 실행해 주세요.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {records.map((r) => (
              <li key={r.id} className="px-5 py-3 flex items-center justify-between gap-4 text-sm">
                <div className="min-w-0">
                  <p className="font-medium truncate">{r.source_file_name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {r.client_name} · {r.project_type} · {r.date} · ₩{r.total_with_vat.toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-green-600 text-xs">✅ 분석 완료</span>
                  <button
                    onClick={() => handleReanalyze(r.drive_file_id, r.source_file_name)}
                    disabled={reanalyzing === r.drive_file_id}
                    className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                  >
                    {reanalyzing === r.drive_file_id ? '⏳' : '🔍 재분석'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
