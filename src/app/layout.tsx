import type { Metadata } from 'next';
import { Noto_Sans_KR } from 'next/font/google';
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

        <main className="mx-auto min-w-0 max-w-screen-xl">{children}</main>
      </body>
    </html>
  );
}
