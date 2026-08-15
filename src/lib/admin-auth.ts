export const ADMIN_COOKIE_NAME = 'soilab_estimate_admin';
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 8;

export function normalizeAdminEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function parseAdminEmails(value: string | undefined): string[] {
  if (!value?.trim()) return [];

  return Array.from(
    new Set(
      value
        .split(',')
        .map(normalizeAdminEmail)
        .filter(Boolean),
    ),
  );
}

export function isAdminEmail(email: string, adminEmails: readonly string[]): boolean {
  return adminEmails.includes(normalizeAdminEmail(email));
}

async function hmacHex(value: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value));

  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function safeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;

  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return difference === 0;
}

export async function createAdminToken(email: string, password: string): Promise<string> {
  const normalizedEmail = normalizeAdminEmail(email);
  const signature = await hmacHex(`soilab-estimate-admin:v1:${normalizedEmail}`, password);
  return `${normalizedEmail}.${signature}`;
}

export async function isValidAdminToken(
  token: string | undefined,
  password: string,
  adminEmails: readonly string[],
): Promise<boolean> {
  if (!token || !password || adminEmails.length === 0) return false;

  const separatorIndex = token.lastIndexOf('.');
  if (separatorIndex <= 0) return false;

  const email = normalizeAdminEmail(token.slice(0, separatorIndex));
  if (!isAdminEmail(email, adminEmails)) return false;

  const expectedToken = await createAdminToken(email, password);
  return safeEqual(token, expectedToken);
}

export function isProtectedAdminPath(pathname: string): boolean {
  return (
    (pathname.startsWith('/admin') && pathname !== '/admin/login') ||
    (pathname.startsWith('/api/admin') && !pathname.startsWith('/api/admin/auth/')) ||
    pathname.startsWith('/api/drive') ||
    pathname === '/api/analyze'
  );
}
