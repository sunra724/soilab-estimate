# 소이랩 프로젝트 견적 자동생성기

프로젝트 유형, 목표금액, 기간과 운영 조건을 입력하면 인건비·운영비·관리비 항목으로 구성된 견적 초안을 생성합니다.

## 공개·관리자 영역

- `/`: 공개 데모. 가상 정보로 견적 초안을 생성합니다.
- `/admin`: 인증된 관리자만 학습 패턴을 확인합니다.
- `/admin/sync`: 인증된 관리자만 Google Drive 견적자료를 동기화합니다.
- 관리자 API와 Drive 분석 API도 동일한 서버측 쿠키 인증을 사용합니다.

공개 입력값은 견적 초안 생성 중에만 처리하며 생성 이력으로 데이터베이스에 저장하지 않습니다. `추가 요청사항`은 Anthropic API를 통한 운영비 항목 구성에 사용됩니다. 생성 결과는 검토용 초안이므로 실제 제출 전 단가, 산식, 세무와 발주처 기준을 확인해야 합니다.

## 로컬 실행

```bash
npm install
copy .env.example .env.local
npm run dev
```

기본 주소는 `http://localhost:3000`입니다.

## 환경변수

- `ANTHROPIC_API_KEY`: 견적 항목 생성과 관리자 PDF 분석에 사용하는 Anthropic API 키
- `APP_PASSWORD`: 관리자 로그인 비밀번호. 클라이언트에 노출되지 않습니다.
- `ADMIN_EMAILS`: 로그인 가능한 관리자 이메일을 쉼표로 구분
- `GOOGLE_DRIVE_FOLDER_ID`: 학습용 견적 PDF가 있는 Google Drive 폴더
- `GOOGLE_SERVICE_ACCOUNT_JSON`: Google 서비스 계정 JSON

운영 Vercel 프로젝트에는 `ANTHROPIC_API_KEY`, `APP_PASSWORD`, `ADMIN_EMAILS`가 Production 환경변수로 설정되어 있어야 합니다. 비밀번호를 바꾸면 기존 관리자 쿠키는 자동으로 무효화됩니다.

## 검증

```bash
npm test
npm run build
```
