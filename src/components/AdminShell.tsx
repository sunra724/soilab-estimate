'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === '/admin/login') return children;

  async function logout() {
    await fetch('/api/admin/auth/logout', { method: 'POST' });
    window.location.href = '/admin/login';
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 bg-gray-100 px-4 py-3 text-sm">
        <span className="mr-2 font-semibold text-gray-700">관리자</span>
        <Link href="/admin" className="rounded-md px-3 py-1.5 text-gray-600 hover:bg-white hover:text-blue-700">학습 데이터</Link>
        <Link href="/admin/sync" className="rounded-md px-3 py-1.5 text-gray-600 hover:bg-white hover:text-blue-700">Drive 동기화</Link>
        <button type="button" onClick={logout} className="ml-auto rounded-md border border-gray-300 bg-white px-3 py-1.5 text-gray-600 hover:border-gray-400 hover:text-gray-900">로그아웃</button>
      </div>
      {children}
    </div>
  );
}
