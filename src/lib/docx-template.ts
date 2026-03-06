import {
  Document,
  Table,
  TableRow,
  TableCell,
  Paragraph,
  TextRun,
  AlignmentType,
  WidthType,
  ShadingType,
  BorderStyle,
  Packer,
  VerticalAlign,
} from 'docx';
import type { GeneratedEstimate, EstimateItem } from './types';
import { SOILAB_COMPANY } from './constants';

// ─── 공통 유틸 ────────────────────────────────────────────────────────────────

const KRW = (n: number) => `₩${n.toLocaleString()}`;
const thinBorder = {
  top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
  left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
  right: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
};

function cell(
  text: string,
  options: {
    bold?: boolean;
    align?: (typeof AlignmentType)[keyof typeof AlignmentType];
    shade?: string;
    width?: number;
    colSpan?: number;
    border?: typeof thinBorder;
  } = {}
): TableCell {
  return new TableCell({
    width: options.width ? { size: options.width, type: WidthType.DXA } : undefined,
    columnSpan: options.colSpan,
    verticalAlign: VerticalAlign.CENTER,
    shading: options.shade
      ? { type: ShadingType.SOLID, color: options.shade, fill: options.shade }
      : undefined,
    borders: options.border ?? thinBorder,
    children: [
      new Paragraph({
        alignment: options.align ?? AlignmentType.CENTER,
        children: [
          new TextRun({
            text,
            bold: options.bold ?? false,
            size: 18, // 9pt
            font: 'Malgun Gothic',
          }),
        ],
      }),
    ],
  });
}

function row(cells: TableCell[]): TableRow {
  return new TableRow({ children: cells });
}

// ─── 헤더 섹션 ────────────────────────────────────────────────────────────────

function buildHeader(estimate: GeneratedEstimate): Paragraph[] {
  const { request } = estimate;
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 200 },
      children: [
        new TextRun({ text: 'SOILAB', bold: true, size: 40, font: 'Malgun Gothic' }),
        new TextRun({ text: '   ', size: 40 }),
        new TextRun({ text: '견 / 적 / 서', bold: true, size: 36, font: 'Malgun Gothic' }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 0, after: 60 },
      children: [
        new TextRun({ text: `DATE: ${request.date}`, size: 18, font: 'Malgun Gothic' }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 0, after: 60 },
      children: [
        new TextRun({ text: `CLIENT: ${request.client_name}`, size: 18, font: 'Malgun Gothic' }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 0, after: 200 },
      children: [
        new TextRun({ text: `PROJECT: ${request.project_name}`, size: 18, font: 'Malgun Gothic' }),
      ],
    }),
  ];
}

// ─── 사업자 정보 ──────────────────────────────────────────────────────────────

function buildCompanyInfo(): Paragraph[] {
  return [
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { before: 0, after: 60 },
      children: [
        new TextRun({ text: `${SOILAB_COMPANY.name}  |  대표자: ${SOILAB_COMPANY.ceo}  |  사업자등록번호: ${SOILAB_COMPANY.bizNo}  |  TEL: ${SOILAB_COMPANY.tel}  |  E-mail: ${SOILAB_COMPANY.email}  |  주소: ${SOILAB_COMPANY.address}`, size: 16, font: 'Malgun Gothic' }),
      ],
    }),
  ];
}

// ─── 견적 인트로 ──────────────────────────────────────────────────────────────

function buildIntro(): Paragraph[] {
  return [
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { before: 200, after: 100 },
      children: [
        new TextRun({ text: '▼ 하기와 같이 견적합니다.', bold: true, size: 20, font: 'Malgun Gothic' }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { before: 0, after: 200 },
      children: [
        new TextRun({ text: '유효기간: 견적일로부터 30일', size: 18, font: 'Malgun Gothic' }),
      ],
    }),
  ];
}

// ─── 합계 행 ──────────────────────────────────────────────────────────────────

function buildTotalRow(estimate: GeneratedEstimate): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      row([
        cell('합계 (VAT 포함)', { bold: true, width: 2000 }),
        cell(`일금  ${estimate.amount_in_korean}`, { bold: true, align: AlignmentType.LEFT, width: 5000 }),
        cell(KRW(estimate.total_with_vat), { bold: true, width: 2000 }),
      ]),
    ],
  });
}

// ─── 컬럼 헤더 행 ────────────────────────────────────────────────────────────

function buildColumnHeader(): TableRow {
  const shadeColor = '4472C4';
  return row([
    cell('항목', { bold: true, shade: shadeColor, width: 1200 }),
    cell('내용 / DESCRIPTIONS', { bold: true, shade: shadeColor, width: 3500 }),
    cell('수량(명)', { bold: true, shade: shadeColor, width: 800 }),
    cell('회차(시간)', { bold: true, shade: shadeColor, width: 900 }),
    cell('단가 / UNIT COST', { bold: true, shade: shadeColor, width: 1500 }),
    cell('합계 / COST', { bold: true, shade: shadeColor, width: 1500 }),
    cell('비고 / REMARKS', { bold: true, shade: shadeColor, width: 1600 }),
  ]);
}

// ─── 섹션 헤더 행 (노란 배경) ─────────────────────────────────────────────────

function buildSectionHeader(no: number, label: string, subtotal: number): TableRow {
  return row([
    cell(`${no}`, { bold: true, shade: 'FFD700', width: 1200 }),
    cell(label, { bold: true, shade: 'FFD700', align: AlignmentType.LEFT, width: 3500 }),
    cell('', { shade: 'FFD700', width: 800 }),
    cell('', { shade: 'FFD700', width: 900 }),
    cell('', { shade: 'FFD700', width: 1500 }),
    cell(KRW(subtotal), { bold: true, shade: 'FFD700', width: 1500 }),
    cell('', { shade: 'FFD700', width: 1600 }),
  ]);
}

// ─── 항목 행 ─────────────────────────────────────────────────────────────────

function buildItemRow(item: EstimateItem): TableRow {
  return row([
    cell('', { width: 1200 }),
    cell(item.item_name, { align: AlignmentType.LEFT, width: 3500 }),
    cell(String(item.quantity), { width: 800 }),
    cell(String(item.frequency), { width: 900 }),
    cell(KRW(item.unit_price), { width: 1500 }),
    cell(KRW(item.total), { width: 1500 }),
    cell(item.remarks, { align: AlignmentType.LEFT, width: 1600 }),
  ]);
}

// ─── 합계/부가세/절사/제안금액 요약 테이블 ────────────────────────────────────

function buildSummaryTable(estimate: GeneratedEstimate): Table {
  const truncation = estimate.total_with_vat - estimate.subtotal - estimate.vat;

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      row([
        cell('소계', { bold: true, width: 4000, colSpan: 2 }),
        cell(KRW(estimate.subtotal), { bold: true, width: 5000, colSpan: 5 }),
      ]),
      row([
        cell('부가세 (10%)', { width: 4000, colSpan: 2 }),
        cell(KRW(estimate.vat), { width: 5000, colSpan: 5 }),
      ]),
      row([
        cell('절사', { width: 4000, colSpan: 2 }),
        cell(truncation !== 0 ? KRW(truncation) : '-', { width: 5000, colSpan: 5 }),
      ]),
      row([
        cell('제안금액 (VAT 포함)', { bold: true, shade: 'FFF2CC', width: 4000, colSpan: 2 }),
        cell(KRW(estimate.total_with_vat), { bold: true, shade: 'FFF2CC', width: 5000, colSpan: 5 }),
      ]),
    ],
  });
}

// ─── REMARK ──────────────────────────────────────────────────────────────────

function buildRemarks(): Paragraph[] {
  return [
    new Paragraph({
      spacing: { before: 200, after: 60 },
      children: [
        new TextRun({ text: 'REMARK', bold: true, size: 18, font: 'Malgun Gothic' }),
      ],
    }),
    new Paragraph({
      spacing: { before: 0, after: 60 },
      children: [
        new TextRun({ text: '1. 상기 견적금액은 부가세 포함 금액입니다.', size: 16, font: 'Malgun Gothic' }),
      ],
    }),
    new Paragraph({
      spacing: { before: 0, after: 60 },
      children: [
        new TextRun({ text: '2. 견적서는 발행일로부터 30일간 유효합니다.', size: 16, font: 'Malgun Gothic' }),
      ],
    }),
  ];
}

// ─── 푸터 ────────────────────────────────────────────────────────────────────

function buildFooter(): Paragraph[] {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 0 },
      children: [
        new TextRun({ text: `${SOILAB_COMPANY.name}  |  TEL: ${SOILAB_COMPANY.tel}  |  Fax: ${SOILAB_COMPANY.fax}  |  E-mail: ${SOILAB_COMPANY.email}`, size: 16, font: 'Malgun Gothic' }),
      ],
    }),
  ];
}

// ─── 메인 항목 테이블 조립 ────────────────────────────────────────────────────

function buildItemsTable(estimate: GeneratedEstimate): Table {
  const { sections } = estimate;

  const rows: TableRow[] = [
    buildColumnHeader(),
    // 인건비 섹션
    buildSectionHeader(1, '인건비 (Labor)', sections.labor.subtotal),
    ...sections.labor.items.map(buildItemRow),
    // 운영비 섹션
    buildSectionHeader(2, '운영비 (Operations)', sections.operations.subtotal),
    ...sections.operations.items.map(buildItemRow),
    // 관리비 섹션
    buildSectionHeader(3, '일반관리비 (General Admin)', sections.admin.subtotal),
    ...sections.admin.items.map(buildItemRow),
  ];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows,
  });
}

// ─── Document 조립 ───────────────────────────────────────────────────────────

export function buildEstimateDocx(estimate: GeneratedEstimate): Document {
  return new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Malgun Gothic', size: 18 },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, right: 720, bottom: 720, left: 720 },
          },
        },
        children: [
          ...buildHeader(estimate),
          ...buildCompanyInfo(),
          ...buildIntro(),
          buildTotalRow(estimate),
          new Paragraph({ spacing: { before: 100, after: 0 }, children: [] }),
          buildItemsTable(estimate),
          new Paragraph({ spacing: { before: 100, after: 0 }, children: [] }),
          buildSummaryTable(estimate),
          ...buildRemarks(),
          ...buildFooter(),
        ],
      },
    ],
  });
}

export { Packer };
