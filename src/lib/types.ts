// 견적서 항목 (분석된 데이터)
export interface EstimateItem {
  id: number;
  section: 'labor' | 'operations' | 'admin';  // 인건비/운영비/관리비
  item_name: string;                            // 항목명
  quantity: number;                             // 수량(명)
  frequency: number;                            // 회차(시간)
  unit_price: number;                           // 단가
  total: number;                                // 합계
  remarks: string;                              // 비고
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
