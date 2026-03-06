'use client';

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'soilab_admin_auth';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (sessionStorage.getItem(STORAGE_KEY) === '1') {
      setAuthenticated(true);
    }
    setChecking(false);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD ?? 'soilab2026';
    if (input === adminPassword) {
      sessionStorage.setItem(STORAGE_KEY, '1');
      setAuthenticated(true);
      setError(false);
    } else {
      setError(true);
      setInput('');
    }
  }

  if (checking) return null;

  if (!authenticated) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)]">
        <div className="bg-white border border-gray-200 rounded-xl p-8 w-80 shadow-sm space-y-5">
          <div className="text-center">
            <p className="text-2xl mb-1">🔒</p>
            <h2 className="font-bold text-gray-800">관리자 인증</h2>
            <p className="text-xs text-gray-400 mt-1">비밀번호를 입력하세요</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="password"
              value={input}
              onChange={(e) => { setInput(e.target.value); setError(false); }}
              placeholder="비밀번호"
              autoFocus
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                error ? 'border-red-400' : 'border-gray-300'
              }`}
            />
            {error && <p className="text-red-500 text-xs">비밀번호가 올바르지 않습니다.</p>}
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg text-sm transition-colors"
            >
              확인
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
