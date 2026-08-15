import { NextRequest, NextResponse } from 'next/server';
import {
  ADMIN_COOKIE_NAME,
  ADMIN_SESSION_MAX_AGE,
  createAdminToken,
  isAdminEmail,
  normalizeAdminEmail,
  parseAdminEmails,
} from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
  try {
    const configuredPassword = process.env.APP_PASSWORD ?? '';
    const adminEmails = parseAdminEmails(process.env.ADMIN_EMAILS);

    if (!configuredPassword || adminEmails.length === 0) {
      return NextResponse.json(
        { error: '관리자 인증 환경변수가 설정되지 않았습니다.' },
        { status: 503 },
      );
    }

    const body = (await request.json()) as { email?: string; password?: string };
    const email = normalizeAdminEmail(body.email ?? '');
    if (!isAdminEmail(email, adminEmails) || body.password !== configuredPassword) {
      return NextResponse.json(
        { error: '이메일 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 },
      );
    }

    const token = await createAdminToken(email, configuredPassword);
    const response = NextResponse.json({ success: true });
    response.cookies.set(ADMIN_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: ADMIN_SESSION_MAX_AGE,
    });
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error) {
    console.error('[admin-login]', error);
    return NextResponse.json({ error: '로그인 처리에 실패했습니다.' }, { status: 500 });
  }
}
