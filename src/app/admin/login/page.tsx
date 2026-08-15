'use client';

import { FormEvent, useState } from 'react';

function getNextPath(): string {
  if (typeof window === 'undefined') return '/admin';
  const nextPath = new URLSearchParams(window.location.search).get('next');
  return nextPath?.startsWith('/admin') && !nextPath.startsWith('//') ? nextPath : '/admin';
}

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? '로그인에 실패했습니다.');
      window.location.href = getNextPath();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : '로그인에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-7 shadow-sm">
        <div className="text-center">
          <p className="text-3xl" aria-hidden="true">🔒</p>
          <h1 className="mt-3 text-xl font-bold text-gray-900">관리자 로그인</h1>
          <p className="mt-2 text-sm leading-6 text-gray-500">등록된 관리자 이메일과 직원용 비밀번호를 입력하세요.</p>
        </div>
        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            관리자 이메일
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoFocus
              className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            비밀번호
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </label>
          {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p> : null}
          <button
            type="submit"
            disabled={isSubmitting || !email.trim() || !password}
            className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-blue-300"
          >
            {isSubmitting ? '확인 중...' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  );
}
