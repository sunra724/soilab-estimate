import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { NextRequest } from 'next/server';
import { getOptionalPattern } from '../src/lib/db';
import { generateEstimate, parseOperations } from '../src/lib/generator';
import { fitItemsToBudget, numberToKorean, recalculateEstimate, taxIncludedAmounts } from '../src/lib/estimate-math';
import { parseGenerateRequest, parseGeneratedEstimate } from '../src/lib/validation';
import { POST as generate } from '../src/app/api/generate/route';
import { POST as exportDocx } from '../src/app/api/export/docx/route';
import type { EstimateItem, GenerateRequest } from '../src/lib/types';

const sample: GenerateRequest = { client_name: '가상 기관', project_name: '공개 검증용 워크숍', project_type: '리빙랩', target_amount: 10_000_000, duration_months: 4, participants_count: 30, workshop_count: 5, include_certificate: false, include_expert: false, custom_notes: '', date: '2026-10' };
const item: EstimateItem = { id: 1, section: 'operations', item_name: '운영', quantity: 7, frequency: 3, unit_price: 10_000, total: 210_000, remarks: '기준 항목' };

test('공개 생성은 학습 DB가 없어도 폴더와 DB를 만들지 않는다', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'estimate-optional-'));
  try {
    const missing = path.join(directory, 'missing', 'estimates.db');
    assert.equal(getOptionalPattern('리빙랩', missing), null);
    assert.equal(existsSync(path.dirname(missing)), false);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('선택 학습자료는 읽기 전용으로 조회하고 잘못된 배분율은 무시한다', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'estimate-pattern-'));
  const file = path.join(directory, 'pattern.db');
  const db = new Database(file);
  try {
    db.exec('CREATE TABLE pattern_cache(project_type TEXT, sample_count INTEGER, avg_labor_ratio REAL, avg_operations_ratio REAL, avg_admin_ratio REAL, common_items_json TEXT)');
    db.prepare('INSERT INTO pattern_cache VALUES (?, ?, ?, ?, ?, ?)').run('리빙랩', 2, 0.3, 0.6, 0.1, '[]');
    assert.equal(getOptionalPattern('리빙랩', file)?.sample_count, 2);
    db.exec('UPDATE pattern_cache SET avg_labor_ratio = 2');
    assert.equal(getOptionalPattern('리빙랩', file), null);
  } finally { db.close(); rmSync(directory, { recursive: true, force: true }); }
});

test('워크숍 0회를 허용하고 음수·문자열·비정상 기간을 거부한다', () => {
  assert.equal(parseGenerateRequest({ ...sample, workshop_count: 0 }).workshop_count, 0);
  for (const patch of [{ workshop_count: -1 }, { target_amount: '1000000' }, { target_amount: Infinity }, { duration_months: 0 }, { duration_months: 37 }, { participants_count: -1 }, { custom_notes: 'x'.repeat(2001) }, { date: '2026-13' }]) assert.throws(() => parseGenerateRequest({ ...sample, ...patch }));
  assert.throws(() => parseGenerateRequest(null));
});

test('단가·수량 산식과 섹션 예산은 원 단위까지 일치한다', () => {
  for (const budget of [0, 1, 100, 999_999, 9_090_909, 100_000_000_000]) {
    const rows = fitItemsToBudget([item, { ...item, quantity: 5, frequency: 4 }], budget);
    assert.equal(rows.reduce((sum, row) => sum + row.total, 0), budget);
    for (const row of rows) assert.equal(row.total, row.quantity * row.frequency * row.unit_price);
  }
  assert.throws(() => fitItemsToBudget([{ ...item, quantity: 0 }], 100));
  assert.throws(() => fitItemsToBudget([item], -100));
});

test('목표 총액과 공급가액·부가세 합계가 일치한다', () => {
  for (const total of [1_000_000, 10_000_000, 10_000_001, 27_280_000, 99_999_999_999]) {
    const amounts = taxIncludedAmounts(total);
    assert.equal(amounts.subtotal + amounts.vat, total);
    assert.ok(Math.abs(Math.round(amounts.subtotal * 0.1) - amounts.vat) <= 1);
  }
});

test('AI 응답의 타입·빈 항목·음수·잘못된 수량은 문서로 전달되지 않는다', () => {
  for (const text of ['{}', '[]', '[null]', '[{"item_name":"bad","quantity":1,"frequency":1,"unit_price":"100","remarks":""}]', '[{"item_name":"bad","quantity":0,"frequency":1,"unit_price":100,"remarks":""}]']) assert.throws(() => parseOperations(text, 100));
  const rows = parseOperations(JSON.stringify([{ ...item, total: 1 }]), 123_456);
  assert.equal(rows.reduce((sum, row) => sum + row.total, 0), 123_456);
});

test('AI 설정이 없어도 생성·편집·DOCX 내보내기가 끝까지 동작하고 생성 방식을 표시한다', async () => {
  const savedKey = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  try {
    const request = new NextRequest('http://localhost/api/generate', {method: 'POST', body: JSON.stringify({ ...sample, workshop_count: 0 })});
    const response = await generate(request);
    assert.equal(response.status, 200);
    const { estimate } = await response.json();
    assert.equal(estimate.generation_mode, 'standard');
    assert.equal(estimate.total_with_vat, sample.target_amount);
    assert.ok(!estimate.sections.operations.items.some((row: EstimateItem) => /워크숍|퍼실리테이터|다과/.test(row.item_name)));
    assert.deepEqual(parseGeneratedEstimate(estimate), estimate);
    const edited = recalculateEstimate(estimate, [{...item, quantity: 1, frequency: 1, unit_price: 1_000_000, total: 1_000_000}]);
    assert.equal(edited.total_with_vat, 1_100_000);
    assert.equal(edited.amount_in_korean, numberToKorean(1_100_000));
    const exported = await exportDocx(new NextRequest('http://localhost/api/export/docx', {method: 'POST', body: JSON.stringify(edited)}));
    assert.equal(exported.status, 200);
    const buffer = Buffer.from(await exported.arrayBuffer());
    assert.equal(buffer.subarray(0, 2).toString(), 'PK');
    assert.ok(buffer.length > 5_000);
    const invalid = await exportDocx(new NextRequest('http://localhost/api/export/docx', {method: 'POST', body: JSON.stringify({ ...edited, subtotal: 1 })}));
    assert.equal(invalid.status, 400);
    assert.throws(() => recalculateEstimate(estimate, [{...item, total: 1}]));
  } finally { if (savedKey !== undefined) process.env.ANTHROPIC_API_KEY = savedKey; }
});

test('잘못된 JSON과 누락 입력은 내부 오류 대신 400으로 반환한다', async () => {
  for (const body of ['{', 'null', '{}', JSON.stringify({ ...sample, target_amount: -1 })]) {
    const response = await generate(new NextRequest('http://localhost/api/generate', { method: 'POST', body }));
    assert.equal(response.status, 400);
    assert.ok(!(await response.text()).includes('database'));
  }
});
