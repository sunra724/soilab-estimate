# 소이랩 견적서 자동생성기 — 바이브코딩 전체 구현 프롬프트

> **실행방법**: VS Code에서 Claude Code 열고 `cat ESTIMATE_GENERATOR_BUILD.md | claude` 실행.
> 또는 이 파일을 Claude Code 채팅에 통째로 붙여넣기.
> Phase 순서대로 진행, 각 Phase 후 `npm run dev`로 동작 확인.

---

## 프로젝트 요약

**목적**: 구글드라이브에 저장된 기존 견적서(PDF)를 분석해서,
프로젝트 유형과 최종 제안금액을 입력하면 **항목·수량·단가가 자동 구성**되는 견적서 생성기.

**핵심 흐름**:
```
Google Drive PDF 수집 → Claude API 분석 → 패턴 DB 저장
→ 사용자가 [프로젝트 유형 + 목표금액] 입력
→ 항목 자동 배분 (인건비 / 운영비 / 관리비)
→ DOCX/PDF 견적서 파일 출력
```

**기술스택**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
+ SQLite (better-sqlite3) + Google Drive API + Anthropic Claude API + docx 라이브러리

---

## 참고: 견적서 구조 분석 (소이랩 표준)

업로드된 견적서에서 파악한 소이랩 견적서의 구조:

```
┌─────────────────────────────────────────────────────────┐
│  SECTION 1: 인건비 (Labor)                              │
│  - 과업 실무 담당자: 학술연구용역 기준 연구원급 × 월수     │
│  - 과업 보조 담당자: 학술연구용역 기준 연구보조원급 × 월수  │
├─────────────────────────────────────────────────────────┤
│  SECTION 2: 운영비 (Operations)                         │
│  - 홍보물 제작, 도구 임차비, 참여자 수당, 팀 활동비       │
│  - 다과비, 인쇄비, 강사비, 기념품비                       │
│  - 퍼실리테이터 운영, 전문가 수당                         │
│  - 민간자격증 발급비, 결과보고서 인쇄 등                  │
├─────────────────────────────────────────────────────────┤
│  SECTION 3: 일반 관리비 (General Admin)                 │
│  - 교통비, 회의비 등                                     │
├─────────────────────────────────────────────────────────┤
│  소계 → 부가세(10%) → 절사 → 제안금액(VAT 포함)          │
└─────────────────────────────────────────────────────────┘
```

**비율 패턴** (이 견적서 기준):
- 인건비: 29.0% (₩7,200,000 / ₩24,800,000)
- 운영비: 69.0% (₩17,110,000 / ₩24,800,000)
- 일반관리비: 2.0% (₩490,000 / ₩24,800,000)

**정부 기준 단가 (2026년)**:
- 연구원급: ₩2,901,312/월
- 연구보조원급: ₩1,454,621/월
- 강사비: ₩300,000/시간 (지방자치인재개발원 기준)

---

## Phase 0: 프로젝트 초기화

### 0-1. 프로젝트 생성

```bash
npx create-next-app@latest soilab-estimate --typescript --tailwind --eslint --app --src-dir --no-import-alias
cd soilab-estimate
npm install better-sqlite3 docx @anthropic-ai/sdk googleapis pdf-parse date-fns lucide-react
npm install -D @types/better-sqlite3 @types/pdf-parse tsx
```

### 0-2. 환경변수 (`.env.local`)

```
# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Google Drive API (서비스 계정 방식)
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_DRIVE_FOLDER_ID=1AbCdEfGhIjKlMn...   # 견적서가 저장된 폴더 ID

# Admin
ADMIN_PASSWORD=soilab2026
```

> **Google Drive 서비스 계정 설정**:
> 1. Google Cloud Console → 새 프로젝트 → Drive API 활성화
> 2. 서비스 계정 생성 → JSON 키 다운로드
> 3. 해당 서비스 계정 이메일을 구글드라이브 폴더에 "뷰어" 권한으로 공유

### 0-3. 디렉토리 구조 생성

```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # 메인: 견적서 생성기
│   ├── admin/
│   │   ├── page.tsx                # 관리자: 학습 데이터 관리
│   │   └── sync/page.tsx           # Google Drive 동기화
│   └── api/
│       ├── drive/sync/route.ts     # Drive에서 PDF 가져오기
│       ├── analyze/route.ts        # Claude로 PDF 분석
│       ├── generate/route.ts       # 견적서 항목 자동 생성
│       ├── export/docx/route.ts    # DOCX 파일 출력
│       └── export/pdf/route.ts     # PDF 파일 출력
├── components/
│   ├── EstimateForm.tsx            # 견적서 입력 폼
│   ├── EstimatePreview.tsx         # 실시간 미리보기
│   ├── LineItemEditor.tsx          # 항목 수동 편집
│   ├── PatternSummary.tsx          # 학습된 패턴 요약
│   └── SyncStatus.tsx              # Drive 동기화 현황
└── lib/
    ├── db.ts
    ├── schema.ts
    ├── drive.ts                    # Google Drive 연동
    ├── analyzer.ts                 # Claude API 분석 로직
    ├── generator.ts                # 견적서 자동 생성 로직
    ├── docx-template.ts            # DOCX 템플릿
    └── types.ts
```

---

## Phase 1: 데이터 모델 & DB

### 1-1. 타입 정의 (`src/lib/types.ts`)

```typescript
// 견적서 항목 (분석된 데이터)
export interface EstimateItem {
  id: number;
  section: 'labor' | 'operations' | 'admin';   // 인건비/운영비/관리비
  item_name: string;                             // 항목명
  quantity: number;                              // 수량(명)
  frequency: number;                             // 회차(시간)
  unit_price: number;                            // 단가
  total: number;                                 // 합계
  remarks: string;                               // 비고
}

// 분석된 과거 견적서 레코드
export interface EstimateRecord {
  id: number;
  source_file_name: string;         // 원본 파일명
  drive_file_id: string;            // Google Drive 파일 ID
  client_name: string;              // 발주처
  project_name: string;             // 프로젝트명
  project_type: string;             // 유형 (리빙랩/교육/컨설팅/조사 등)
  date: string;                     // 견적일
  subtotal: number;                 // 소계 (VAT 제외)
  vat: number;                      // 부가세
  total_with_vat: number;           // 최종 제안금액
  labor_ratio: number;              // 인건비 비율 (0~1)
  operations_ratio: number;         // 운영비 비율
  admin_ratio: number;              // 관리비 비율
  items_json: string;               // JSON.stringify(EstimateItem[])
  analyzed_at: string;              // 분석 시각
}

// 견적서 생성 요청
export interface GenerateRequest {
  client_name: string;              // 발주처
  project_name: string;             // 프로젝트명
  project_type: string;             // 유형
  target_amount: number;            // 목표 최종금액 (VAT 포함)
  duration_months: number;          // 사업 기간 (개월)
  participants_count: number;       // 주요 참여자 수
  workshop_count: number;           // 워크숍 횟수
  include_certificate: boolean;     // 민간자격증 포함 여부
  include_expert: boolean;          // 전문가 자문 포함 여부
  custom_notes: string;             // 추가 요청사항
  date: string;                     // 견적일
}

// 생성된 견적서
export interface GeneratedEstimate {
  request: GenerateRequest;
  sections: {
    labor: { items: EstimateItem[]; subtotal: number };
    operations: { items: EstimateItem[]; subtotal: number };
    admin: { items: EstimateItem[]; subtotal: number };
  };
  subtotal: number;
  vat: number;
  total_with_vat: number;
  amount_in_korean: string;          // 이천칠백이십팔만원 정
  reference_estimates: string[];     // 참고한 과거 견적서 목록
}

// 학습된 패턴
export interface PatternData {
  project_type: string;
  sample_count: number;
  avg_labor_ratio: number;
  avg_operations_ratio: number;
  avg_admin_ratio: number;
  common_items: { item_name: string; frequency_rate: number; avg_unit_price: number }[];
}
```

### 1-2. DB 스키마 (`src/lib/schema.ts`)

`estimate_records` 테이블과 `pattern_cache` 테이블 CREATE TABLE 문 작성.
`initDb()` 함수로 테이블 생성.

### 1-3. DB 연결 (`src/lib/db.ts`)

`data/estimates.db` 경로에 SQLite 싱글턴 연결. WAL 모드, foreign_keys ON.

---

## Phase 2: Google Drive 연동

### 2-1. Drive 클라이언트 (`src/lib/drive.ts`)

```typescript
import { google } from 'googleapis';

// 서비스 계정으로 Drive API 인증
export function getDriveClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
  return google.drive({ version: 'v3', auth });
}

// 지정된 폴더에서 PDF/DOCX 파일 목록 가져오기
export async function listEstimateFiles(): Promise<DriveFile[]>

// 특정 파일을 Buffer로 다운로드
export async function downloadFile(fileId: string): Promise<Buffer>
```

### 2-2. Drive 동기화 API (`/api/drive/sync/route.ts`)

```
GET /api/drive/sync
→ 1. Drive에서 파일 목록 조회
→ 2. DB에 없는 새 파일 필터링
→ 3. 각 파일 다운로드 → /tmp/estimates/ 임시 저장
→ 4. 분석 API 호출 (/api/analyze)
→ 5. 분석 결과 DB 저장
→ 6. { synced: N, total: M, errors: [...] } 반환
```

**구현 시 주의사항**:
- 파일당 처리 시간이 길 수 있으므로 `streaming response` 또는 진행 상황 로그 반환
- PDF 다운로드 실패 시 해당 파일 건너뛰고 계속 진행
- 이미 분석된 파일 (`drive_file_id` 존재)은 skip

---

## Phase 3: Claude API 분석 엔진

### 3-1. 분석 로직 (`src/lib/analyzer.ts`)

PDF Buffer를 받아 Claude API로 구조화된 견적 데이터 추출:

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export async function analyzeEstimatePdf(
  pdfBuffer: Buffer,
  fileName: string
): Promise<EstimateRecord | null> {

  // PDF를 base64로 변환
  const base64Pdf = pdfBuffer.toString('base64');

  const response = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 4000,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: base64Pdf,
          }
        },
        {
          type: 'text',
          text: `이 견적서 PDF를 분석해서 아래 JSON 형식으로만 응답해줘. 다른 텍스트 없이 JSON만.

{
  "client_name": "발주처명",
  "project_name": "프로젝트명",
  "project_type": "리빙랩|교육|컨설팅|조사연구|행사운영|기타 중 하나",
  "date": "YYYY-MM",
  "subtotal": 소계(숫자, VAT 제외),
  "vat": 부가세(숫자),
  "total_with_vat": 최종제안금액(숫자),
  "items": [
    {
      "section": "labor|operations|admin",
      "item_name": "항목명",
      "quantity": 수량(숫자),
      "frequency": 회차(숫자),
      "unit_price": 단가(숫자),
      "total": 합계(숫자),
      "remarks": "비고"
    }
  ]
}

section 구분:
- labor: 인건비 (실무담당자, 보조담당자 등)
- operations: 운영비 (홍보물, 참여자수당, 강사비, 퍼실리테이터 등)
- admin: 일반관리비 (교통비, 회의비 등)`
        }
      ]
    }]
  });

  // JSON 파싱 후 비율 계산하여 EstimateRecord 반환
  const rawText = response.content[0].type === 'text' ? response.content[0].text : '';
  const parsed = JSON.parse(rawText.replace(/```json|```/g, '').trim());

  const laborTotal = parsed.items.filter(i => i.section === 'labor').reduce((s, i) => s + i.total, 0);
  const opsTotal = parsed.items.filter(i => i.section === 'operations').reduce((s, i) => s + i.total, 0);
  const adminTotal = parsed.items.filter(i => i.section === 'admin').reduce((s, i) => s + i.total, 0);

  return {
    ...parsed,
    source_file_name: fileName,
    labor_ratio: laborTotal / parsed.subtotal,
    operations_ratio: opsTotal / parsed.subtotal,
    admin_ratio: adminTotal / parsed.subtotal,
    items_json: JSON.stringify(parsed.items),
    analyzed_at: new Date().toISOString(),
  };
}
```

### 3-2. 분석 API (`/api/analyze/route.ts`)

```
POST /api/analyze
Body: { fileId, fileName }

→ 1. Drive에서 해당 파일 다운로드
→ 2. analyzeEstimatePdf() 호출
→ 3. DB에 EstimateRecord 저장
→ 4. 패턴 캐시 갱신 (같은 project_type의 평균 재계산)
→ 5. 저장된 레코드 반환
```

---

## Phase 4: 자동 생성 엔진

### 4-1. 생성 로직 (`src/lib/generator.ts`)

**핵심 알고리즘**: 목표금액에서 역산하여 각 항목 배분

```typescript
// 2026년 정부 기준 단가 (하드코딩 + DB 오버라이드 가능)
const STANDARDS_2026 = {
  researcher: 2901312,        // 연구원급 월 인건비
  research_assistant: 1454621, // 연구보조원급
  lecturer_per_hour: 300000,   // 강사비/시간 (지방자치인재개발원)
  expert_fee: 250000,          // 전문가 수당/회
  facilitator_per_team_hour: 230000, // 퍼실리테이터 팀×시간
  participant_fee_per_session: 30000, // 참여자 수당/회
  certificate_fee: 18000,      // 민간자격증 발급비/인
  snack_per_person: 5000,      // 다과비/인
  gift_per_person: 20000,      // 기념품/인
};

export function generateEstimate(
  request: GenerateRequest,
  patterns: PatternData | null
): GeneratedEstimate {

  // 1. VAT 역산: 목표금액(VAT포함) → 소계
  //    소계 = floor(목표금액 / 1.1 / 10000) * 10000  (만원 단위 절사)
  const subtotal = Math.floor(request.target_amount / 1.1 / 10000) * 10000;

  // 2. 패턴 기반 비율 결정 (없으면 소이랩 기본값 사용)
  const laborRatio = patterns?.avg_labor_ratio ?? 0.29;
  const opsRatio = patterns?.avg_operations_ratio ?? 0.69;
  const adminRatio = patterns?.avg_admin_ratio ?? 0.02;

  // 3. 각 섹션 예산 배정
  const laborBudget = Math.round(subtotal * laborRatio);
  const opsBudget = Math.round(subtotal * opsRatio);
  const adminBudget = subtotal - laborBudget - opsBudget;

  // 4. 인건비 항목 생성
  //    과업 실무담당자: STANDARDS_2026.researcher * 0.5 * months
  //    과업 보조담당자: STANDARDS_2026.research_assistant * 0.5 * months
  const laborItems = buildLaborItems(laborBudget, request);

  // 5. 운영비 항목 생성 (Claude API로 프로젝트 유형에 맞는 항목 구성)
  const opsItems = await buildOpsItems(opsBudget, request, patterns);

  // 6. 관리비 항목 생성
  const adminItems = [{ section: 'admin', item_name: '일반관리비', quantity: 1, frequency: 1,
    unit_price: adminBudget, total: adminBudget, remarks: '교통비, 회의비 등' }];

  // 7. 합산 검증 및 오차 조정 (총합이 subtotal이 되도록 마지막 항목에서 조정)
  const actualSubtotal = [...laborItems, ...opsItems, ...adminItems].reduce((s, i) => s + i.total, 0);
  // 오차를 관리비에서 흡수

  return {
    request,
    sections: {
      labor: { items: laborItems, subtotal: laborItems.reduce(...) },
      operations: { items: opsItems, subtotal: ... },
      admin: { items: adminItems, subtotal: adminBudget },
    },
    subtotal,
    vat: Math.floor(subtotal * 0.1),
    total_with_vat: request.target_amount,
    amount_in_korean: numberToKorean(request.target_amount),
    reference_estimates: [],
  };
}

// 숫자 → 한국어 금액 변환
// 27,280,000 → "이천칠백이십팔만원 정"
function numberToKorean(amount: number): string { ... }
```

### 4-2. Claude API로 운영비 항목 구성

`buildOpsItems()` 내부에서 Claude API 호출:

```typescript
async function buildOpsItems(budget: number, request: GenerateRequest, patterns: PatternData | null) {
  const similarItems = patterns?.common_items ?? [];
  
  const response = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `소이랩의 "${request.project_type}" 프로젝트 견적서 운영비 항목을 구성해줘.

조건:
- 총 운영비 예산: ${budget.toLocaleString()}원
- 워크숍 ${request.workshop_count}회
- 참여자 ${request.participants_count}명
- 기간 ${request.duration_months}개월
- 민간자격증 발급: ${request.include_certificate ? '포함' : '미포함'}
- 전문가 자문: ${request.include_expert ? '포함' : '미포함'}
- 과거 유사 프로젝트 공통 항목: ${JSON.stringify(similarItems.slice(0, 10))}

2026년 정부 기준 단가:
- 강사비: 300,000원/시간
- 퍼실리테이터: 230,000원/(팀×시간)
- 참여자수당: 30,000원/회
- 민간자격증: 18,000원/인
- 다과: 5,000원/인

아래 JSON 형식으로만 응답 (총합이 반드시 ${budget}원이 되도록):
[
  { "item_name": "홍보물 제작", "quantity": 1, "frequency": 1, "unit_price": N, "total": N, "remarks": "..." },
  ...
]`
    }]
  });
  
  return JSON.parse(...);
}
```

### 4-3. 생성 API (`/api/generate/route.ts`)

```
POST /api/generate
Body: GenerateRequest

→ 1. DB에서 같은 project_type 패턴 조회
→ 2. generator.generateEstimate() 호출
→ 3. 생성된 견적서 임시 저장 (session 기반)
→ 4. GeneratedEstimate 반환
```

---

## Phase 5: DOCX 출력

### 5-1. DOCX 템플릿 (`src/lib/docx-template.ts`)

`docx` 라이브러리로 소이랩 견적서 양식 재현:

```typescript
import { Document, Table, TableRow, TableCell, Paragraph, TextRun, AlignmentType, WidthType, ShadingType, BorderStyle } from 'docx';

export function buildEstimateDocx(estimate: GeneratedEstimate): Document {
  return new Document({
    sections: [{
      properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } } },
      children: [
        // 헤더: SOILAB 로고 영역 + 견/적/서 타이틀
        buildHeader(estimate),
        // 사업자 정보
        buildCompanyInfo(),
        // "▼ 하기와 같이 견적합니다." + 유효기간
        buildIntro(estimate),
        // 금액 합계 행
        buildTotalRow(estimate),
        // 메인 항목 테이블
        buildItemsTable(estimate),
        // 소계/부가세/절사/제안금액
        buildSummaryTable(estimate),
        // REMARK
        buildRemarks(),
        // 회사 연락처 푸터
        buildFooter(),
      ]
    }]
  });
}
```

**테이블 구성 (소이랩 양식 재현)**:
- 컬럼: 합계/Total | 내용/DESCRIPTIONS | 수량(명) | 회차(시간) | 단가/UNIT COST | 합계/COST | 비고/REMARKS
- 섹션 헤더 행 (번호 + 섹션명): 노란 배경 (`#FFD700`)
- 소계 행: 굵게
- 부가세 행, 절사 행, 제안금액 행

### 5-2. DOCX 출력 API (`/api/export/docx/route.ts`)

```
POST /api/export/docx
Body: GeneratedEstimate

→ buildEstimateDocx(estimate)
→ Packer.toBuffer(doc)
→ Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document
→ Content-Disposition: attachment; filename=견적서_프로젝트명_YYYYMMDD.docx
```

---

## Phase 6: 메인 UI

### 6-1. 레이아웃 (`src/app/layout.tsx`)

- Noto Sans KR 폰트
- 상단 헤더: SOILAB 로고 텍스트 + "견적서 자동생성기"
- 좌측 네비: 🏠 견적 생성 | 📊 학습 데이터 | ⚙️ 관리자
- 모바일 반응형

### 6-2. 메인 페이지 견적 생성 UI (`src/app/page.tsx`)

**2패널 레이아웃**: 좌측 입력 폼 + 우측 실시간 미리보기

**왼쪽: EstimateForm 컴포넌트**

```
┌────────────────────────────────┐
│  📋 견적서 기본 정보            │
│  발주처명: [____________]       │
│  프로젝트명: [____________]     │
│  프로젝트 유형: [드롭다운▼]      │
│    리빙랩 / 교육 / 컨설팅 /     │
│    조사연구 / 행사운영 / 기타    │
│  견적일: [날짜 선택]            │
├────────────────────────────────┤
│  💰 금액 설정                  │
│  목표 최종금액(VAT포함):        │
│  [₩ ___________]               │
│  → 소계(VAT제외): ₩24,800,000  │  ← 실시간 계산
│  → 부가세: ₩2,480,000          │
├────────────────────────────────┤
│  📐 프로젝트 규모               │
│  사업 기간: [4] 개월            │
│  워크숍 횟수: [5] 회            │
│  참여자 수: [30] 명             │
├────────────────────────────────┤
│  🔧 구성 옵션                  │
│  ☑ 민간자격증 발급 포함         │
│  ☑ 전문가 자문 포함             │
│  □ 퍼실리테이터 포함            │
├────────────────────────────────┤
│  📝 추가 요청사항 (선택)        │
│  [textarea]                     │
├────────────────────────────────┤
│  [✨ 견적서 자동 생성]          │  ← 클릭 시 /api/generate 호출
└────────────────────────────────┘
```

**오른쪽: EstimatePreview 컴포넌트**

생성 전: "좌측에서 조건을 입력하고 생성 버튼을 클릭하세요" 안내
생성 후: 견적서 미리보기 (소이랩 양식과 동일한 레이아웃으로 렌더링)

```
┌──────────────────────────────────────┐
│ SOILAB          견/적/서              │
│                 DATE: 2026년 3월      │
│                 CLIENT: 남구청 인구총괄과│
│                 PROJECT: ...         │
├──────────────────────────────────────┤
│ 합계(VAT포함)  일금  이천칠백이십팔만원 정  ₩27,280,000 │
├────────┬──────┬──┬──┬────┬────┬────┤
│ 항목   │내용  │수│회│단가│합계│비고│
├────────┴──────┴──┴──┴────┴────┴────┤
│ 1 인건비           ₩7,200,000 (노란배경)│
│   과업 실무 담당자  1  4  1,200,000  ...│
│   과업 보조 담당자  1  4    600,000  ...│
├────────────────────────────────────┤
│ 2 운영비          ₩17,110,000 (노란배경)│
│   홍보물 제작  ...                   │
│   ...                               │
├────────────────────────────────────┤
│ 3 일반관리비         ₩490,000 (노란배경)│
├────────────────────────────────────┤
│ 소계               ₩24,800,000      │
│ 부가세              ₩2,480,000      │
│ 절사                               │
│ 제안금액           ₩27,280,000      │
└──────────────────────────────────────┘
```

**미리보기 하단 버튼**:
```
[✏️ 항목 직접 편집]  [📄 DOCX 다운로드]  [🔄 재생성]
```

### 6-3. LineItemEditor 컴포넌트

미리보기에서 "항목 직접 편집" 클릭 시 활성화:
- 각 행에 인라인 편집 (항목명, 수량, 회차, 단가 수정)
- 수정 시 합계 자동 재계산
- 항목 추가(+) / 삭제(🗑) 버튼
- 편집 후 금액이 목표와 달라지면 차이를 빨간/녹색으로 표시
- "금액 맞추기" 버튼: 마지막 운영비 항목에서 차이 자동 흡수

---

## Phase 7: 관리자 패널

### 7-1. 동기화 페이지 (`/admin/sync/page.tsx`)

```
┌─────────────────────────────────┐
│ 📁 Google Drive 동기화          │
│                                 │
│ 연결된 폴더: 소이랩_견적서       │
│ 마지막 동기화: 2026.03.05 14:23  │
│ 분석된 파일: 12개               │
│                                 │
│ [🔄 지금 동기화]                │
│                                 │
│ 파일 목록:                      │
│ ✅ 2026_남구청_리빙랩.pdf       │
│ ✅ 2025_청년_창업컨설팅.pdf     │
│ ⚠️ 2024_경영지원.pdf (분석실패) │
│ [🔍 재분석]                     │
└─────────────────────────────────┘
```

### 7-2. 학습 데이터 페이지 (`/admin/page.tsx`)

프로젝트 유형별 패턴 요약 + 수동 단가 기준 수정:

```
프로젝트 유형: 리빙랩 (샘플 3개)
인건비 평균: 29.0% | 운영비: 69.0% | 관리비: 2.0%

공통 항목:
- 참여자 수당: 97% 출현, 평균 30,000원/인/회
- 퍼실리테이터: 85% 출현, 평균 230,000원/팀/시간
- 홍보물: 100% 출현, 평균 650,000원
...

[2026년 정부 기준 단가 수정]
연구원급: [₩2,901,312]
연구보조원급: [₩1,454,621]
강사비: [₩300,000]
```

---

## Phase 8: 확인 & 완성

### 8-1. 전체 플로우 테스트

```
1. /admin/sync → Drive 동기화 → 업로드된 견적서 PDF 분석 확인
2. / → 발주처: 남구청, 프로젝트: 리빙랩, 목표금액: 27,280,000 입력
3. "견적서 자동 생성" 클릭 → 미리보기 표시
4. 항목 편집 → 금액 검증
5. DOCX 다운로드 → 파일 열어서 양식 확인
```

### 8-2. 엣지 케이스 처리

- 분석할 Drive 파일이 0개인 경우: 기본 소이랩 패턴 사용
- Claude API 실패: fallback으로 수식 기반 항목 구성
- 목표금액이 너무 작아 인건비 기준 충족 불가: 경고 메시지
- 합산 오차: ±1,000원 이내면 관리비에서 자동 조정

### 8-3. 빌드

```bash
npm run build && npm run start
```

---

## 개발 순서 요약 (빠른 실행)

```
Phase 0: 프로젝트 생성 + 환경변수 설정           (30분)
Phase 1: DB 스키마 + 타입 정의                   (20분)
Phase 2: Google Drive API 연동                   (40분)
Phase 3: Claude API로 PDF 분석                   (30분)
Phase 4: 자동 생성 알고리즘                       (60분)
Phase 5: DOCX 출력                               (45분)
Phase 6: 메인 UI (폼 + 미리보기)                 (60분)
Phase 7: 관리자 패널                              (30분)
Phase 8: 테스트 & 완성                            (20분)
```

**최우선 구현 순서** (MVP만 원할 경우):
1. Phase 0 → Phase 1 → Phase 4 (기본 패턴 하드코딩) → Phase 5 → Phase 6
2. Drive 연동(Phase 2, 3)은 나중에 붙이기
3. 분석 데이터 없을 때 소이랩 기본값(인건비29/운영비69/관리비2)으로 동작 가능

---

## 참고: 소이랩 기본 단가 기준 (하드코딩용)

```typescript
// src/lib/constants.ts
export const SOILAB_DEFAULTS = {
  // 2026 학술연구용역 인건비 기준단가
  RESEARCHER_MONTHLY: 2_901_312,
  RESEARCH_ASSISTANT_MONTHLY: 1_454_621,
  LABOR_PARTICIPATION_RATE: 0.5,   // 50% 참여율 (기본값)

  // 2026 지방자치인재개발원 강사수당
  LECTURER_PER_HOUR: 300_000,

  // 소이랩 경험치 기반 운영비 단가
  FACILITATOR_PER_TEAM_HOUR: 230_000,
  EXPERT_FEE_PER_SESSION: 250_000,
  PARTICIPANT_FEE_PER_SESSION: 30_000,
  SNACK_PER_PERSON_SESSION: 5_000,
  GIFT_PER_PERSON: 20_000,
  CERTIFICATE_FEE: 18_000,
  TOOL_RENTAL_PER_TEAM_SESSION: 20_000,
  WORKSHEET_PER_PERSON_SESSION: 10_000,
  REPORT_PRINT_PER_COPY: 50_000,

  // 섹션 비율 기본값
  LABOR_RATIO: 0.29,
  OPS_RATIO: 0.69,
  ADMIN_RATIO: 0.02,
};
```
