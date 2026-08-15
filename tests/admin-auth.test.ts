import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createAdminToken,
  isAdminEmail,
  isProtectedAdminPath,
  isValidAdminToken,
  parseAdminEmails,
} from '../src/lib/admin-auth';

test('관리자 이메일은 소문자·중복 제거 후 허용 목록으로 사용한다', () => {
  const emails = parseAdminEmails(' SoilabCoop@gmail.com,admin@example.com,soilabcoop@gmail.com ');
  assert.deepEqual(emails, ['soilabcoop@gmail.com', 'admin@example.com']);
  assert.equal(isAdminEmail('SOILABCOOP@GMAIL.COM', emails), true);
  assert.equal(isAdminEmail('unknown@example.com', emails), false);
});

test('관리자 토큰은 이메일과 비밀번호가 모두 맞을 때만 유효하다', async () => {
  const emails = ['soilabcoop@gmail.com'];
  const token = await createAdminToken(emails[0], 'rotating-password');

  assert.equal(await isValidAdminToken(token, 'rotating-password', emails), true);
  assert.equal(await isValidAdminToken(token, 'changed-password', emails), false);
  assert.equal(await isValidAdminToken(token, 'rotating-password', ['other@example.com']), false);
});

test('관리자 화면과 민감 API만 보호하고 공개 생성·내보내기는 유지한다', () => {
  for (const path of ['/admin', '/admin/sync', '/api/admin/records', '/api/drive/sync', '/api/analyze']) {
    assert.equal(isProtectedAdminPath(path), true, `${path} should be protected`);
  }

  for (const path of ['/admin/login', '/', '/api/generate', '/api/export/docx', '/api/admin/auth/login']) {
    assert.equal(isProtectedAdminPath(path), false, `${path} should stay public`);
  }
});
