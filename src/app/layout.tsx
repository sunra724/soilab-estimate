import type { Metadata } from 'next';
import { Noto_Sans_KR } from 'next/font/google';
import Link from 'next/link';
import './globals.css';

const notoSansKR = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-noto',
});

export const metadata: Metadata = {
  title: '소이랩 견적서 자동생성기',
  description: '프로젝트 유형과 목표금액을 입력하면 항목이 자동 구성됩니다.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={`${notoSansKR.variable} font-sans bg-gray-50 text-gray-900 min-h-screen`}>
        {/* 상단 헤더 */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-screen-xl mx-auto px-4 h-14 flex items-center gap-3">
            <span className="font-bold text-blue-700 text-lg tracking-tight">SOILAB</span>
            <span className="text-gray-300">|</span>
            <span className="font-medium text-gray-700">견적서 자동생성기</span>
          </div>
        </header>

        <div className="flex max-w-screen-xl mx-auto">
          {/* 좌측 사이드바 네비게이션 */}
          <nav className="w-48 shrink-0 border-r border-gray-200 bg-white min-h-[calc(100vh-3.5rem)] pt-6 hidden md:block">
            <ul className="space-y-1 px-3">
              <li>
                <Link
                  href="/"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-blue-50 hover:text-blue-700 transition-colors"
                >
                  <span>🏠</span> 견적 생성
                </Link>
              </li>
              <li>
                <Link
                  href="/admin"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-blue-50 hover:text-blue-700 transition-colors"
                >
                  <span>📊</span> 학습 데이터
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/sync"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-blue-50 hover:text-blue-700 transition-colors"
                >
                  <span>⚙️</span> 관리자
                </Link>
              </li>
            </ul>
          </nav>

          {/* 메인 콘텐츠 */}
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </body>
    </html>
  );
}
