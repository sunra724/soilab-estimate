# 소이랩 프로젝트 견적 자동생성기

프로젝트 유형, 목표금액, 기간과 운영 조건을 입력하면 인건비·운영비·관리비 항목으로 구성된 견적 초안을 생성합니다.

## 공개·관리자 영역

- `/`: 공개 데모. 가상 정보로 견적 초안을 생성합니다.
- `/admin`: 인증된 관리자만 학습 패턴을 확인합니다.
- `/admin/sync`: 인증된 관리자만 Google Drive 견적자료를 동기화합니다.
- 관리자 API와 Drive 분석 API도 동일한 서버측 쿠키 인증을 사용합니다.

공개 입력값은 견적 초안 생성 중에만 처리하며 생성 이력으로 데이터베이스에 저장하지 않습니다. `추가 요청사항`은 Anthropic API를 통한 운영비 항목 구성에 사용됩니다. 생성 결과는 검토용 초안이므로 실제 제출 전 단가, 산식, 세무와 발주처 기준을 확인해야 합니다.

공개 생성은 학습 DB가 없는 배포 환경에서도 동작합니다. DB는 존재하는 경우에만 읽기 전용으로 참조합니다. AI 연결이나 응답 형식에 문제가 있으면 내부 기준 항목으로 생성하고 화면과 문서에 해당 방식을 표시합니다. 이 경우 추가 요청사항은 자동 반영되지 않으며 담당자가 직접 편집해야 합니다. 수량·회차·단가의 곱, 항목별 소계, 최종 금액과 한글 금액은 생성·편집·내보내기 과정에서 검증합니다.

## 로컬 실행

```bash
npm install
copy .env.example .env.local
npm run dev
```

기본 주소는 `http://localhost:3000`입니다.

## 환경변수

- `ANTHROPIC_API_KEY`: 견적 항목 생성과 관리자 PDF 분석에 사용하는 Anthropic API 키
- `ANTHROPIC_MODEL`: 공개 견적 생성 모델. 기본값은 `claude-sonnet-4-6`
- `ESTIMATE_DATABASE_PATH`: 선택 사항인 기존 SQLite 학습 DB 경로. 관리자 분석·동기화에는 지속 저장이 가능한 파일 시스템이 필요합니다. 공개 Vercel 배포는 로컬 학습 DB를 포함하지 않습니다.
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
