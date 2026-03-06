export const SOILAB_COMPANY = {
  name: '협동조합 소이랩',
  ceo: '강아름',
  bizNo: '502-82-21040',
  tel: '053-941-9003',
  fax: '053)710-7216',
  email: 'soilabcoop@gmail.com',
  address: '대구 북구 대현로3 2층',
};

// 2026년 학술연구용역 인건비 기준단가 및 소이랩 운영비 단가
export const SOILAB_DEFAULTS = {
  // 2026 학술연구용역 인건비 기준단가
  RESEARCHER_MONTHLY: 2_901_312,
  RESEARCH_ASSISTANT_MONTHLY: 1_454_621,
  LABOR_PARTICIPATION_RATE: 0.5,        // 50% 참여율 (기본값)

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
