import { NextRequest, NextResponse } from 'next/server';
import {
  ADMIN_COOKIE_NAME,
  isProtectedAdminPath,
  isValidAdminToken,
  parseAdminEmails,
} from '@/lib/admin-auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!isProtectedAdminPath(pathname)) return NextResponse.next();

  const password = process.env.APP_PASSWORD ?? '';
  const adminEmails = parseAdminEmails(process.env.ADMIN_EMAILS);
  const isApiRequest = pathname.startsWith('/api/');

  if (!password || adminEmails.length === 0) {
    if (isApiRequest) {
      return NextResponse.json(
        { error: '관리자 인증 환경변수가 설정되지 않았습니다.' },
        { status: 503 },
      );
    }

    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('error', 'configuration');
    return NextResponse.redirect(loginUrl);
  }

  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (await isValidAdminToken(token, password, adminEmails)) {
    const response = NextResponse.next();
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  }

  if (isApiRequest) {
    return NextResponse.json({ error: '관리자 로그인이 필요합니다.' }, { status: 401 });
  }

  const loginUrl = new URL('/admin/login', request.url);
  loginUrl.searchParams.set('next', `${pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
    '/api/drive/:path*',
    '/api/analyze',
  ],
};
