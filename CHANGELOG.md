# 변경 기록 (Changelog)

이 문서는 프로젝트의 주요 변경 사항을 날짜 기준으로 관리합니다.

## 2026-04-29

### ✅ 전일 기록 확인 검증 및 후속 진행 착수
- `SAFETY_DATALAB_V2_TRACKER.md`
  - 전일(2026-04-28) 구현 항목의 코드 교차검증 결과를 작업 로그에 추가
  - 실행환경 제약(GitHub VFS 미마운트)으로 로컬 셸 빌드 검증이 Blocked 상태임을 기록
  - 출력물 실검증(화면/PDF/이미지 비교) 작업을 `In Progress`로 반영
- `SAFETY_DATALAB_V2_IMPLEMENTATION_PLAN.md`
  - 진행 상태를 `완료 유지 + 후속 검증 진행중`으로 갱신
  - 2026-04-29 검증 메모(핵심 지점 확인, 에디터 오류 0건, 빌드 제약) 추가

## 2026-04-28

### ✅ 안정화/버그 수정
- `components/TBMForm.tsx`
  - `handleSaveAll` 함수에서 `await onSave(...)` 사용에 맞춰 `async` 선언 추가
  - Vercel 빌드 오류 해결: `"await" can only be used inside an "async" function`
- `components/Dashboard.tsx`
  - 기상 아이콘 ternary 구문 내 잘못 삽입된 `aria-label` 문자열 제거
  - Vercel 빌드 오류 해결: `Expected identifier but found "\`${"`

### ✅ 확인 다이얼로그 공통화
- 신규 추가
  - `hooks/useConfirmDialog.ts`
  - `components/common/ConfirmDialog.tsx`
- 적용 파일
  - `App.tsx`
  - `components/SettingsModal.tsx`
  - `components/ReportCenter.tsx`
  - `components/RiskAssessmentManager.tsx`
- 변경 내용
  - 네이티브 `confirm()` 제거 및 Promise 기반 `requestConfirm()` 패턴 통일
  - 포커스 트랩, ESC 닫기, 이전 포커스 복원 등 접근성 동작 공통 제공

### ✅ 다이얼로그 시맨틱 확장
- `variant` 프리셋 도입: `default | danger | warning`
- 파괴적 작업(삭제)에는 `danger`, 경고성 진행에는 `warning` 적용

### ✅ 접근성 개선
- `App.tsx`
  - 복구 오버레이에 `role="progressbar"` 및 ARIA 값 반영
  - 루트에 `aria-busy` 반영
  - 상태 안내 라이브 리전(`aria-live`) 유지/강화

### ✅ 배포 환경 안정화
- `package.json`
  - `engines` 추가
    - `node: >=20 <23`
    - `npm: >=10`

### ✅ 구현 계획/기록관리 체계 추가
- 신규 문서
  - `SAFETY_DATALAB_V2_IMPLEMENTATION_PLAN.md`
  - `SAFETY_DATALAB_V2_TRACKER.md`
- 반영 내용
  - 안전데이터 심층연구소 v2를 단계별(Phase 1~4)로 순차 실행하는 계획서 정의
  - 체크리스트/작업로그/Clear 기록 테이블을 통한 진행·완료 관리 체계 도입

### ✅ 안전데이터 심층연구소 v2 Phase 1 구현
- `components/SafetyDataLab.tsx`
  - 기간 필터 추가: 최근 7일 / 최근 30일 / 당월 / 전체 / 커스텀
  - 다중 필터 상태 구조 도입: 팀 + 위험 + 기간 동시 적용
  - 필터 상태 뱃지 및 일괄 초기화 동작 반영
  - 커스텀 기간 입력(start/end) UI 및 기간 기반 분석 데이터셋 분리

### ✅ Phase 1 검증/기록 관리 업데이트
- `SAFETY_DATALAB_V2_IMPLEMENTATION_PLAN.md`
  - Phase 1 검증 케이스 10종 정의
  - 빌드 통과 항목 체크 완료
- `SAFETY_DATALAB_V2_TRACKER.md`
  - 검증 케이스 표(10종) 추가
  - 작업 로그에 빌드 검증 성공 이력 추가

### ✅ 안전데이터 심층연구소 v2 Phase 2 상세 구현
- `components/SafetyDataLab.tsx`
  - `RISK_KEYWORD_DICT` 모듈 레벨 상수로 분리 (카테고리 체계 포함: 추락/낙하/전도, 장비/환경, 화학/게 사고)
  - 트렌드 바 첫트 스케일 개선: `/10` 고정값 → `maxTrendCount` 동적 최대값 기준
  - `filteredAnalysis`에 `maxTrendCount` 추가 반환
- Phase 2 Cleared (2026-04-28) — 빌드 통과

### ✅ 안전데이터 심층연구소 v2 Phase 4 구현
- `components/SafetyDataLab.tsx`
  - `LabSnapshot` 인터페이스 + `SNAPSHOT_STORAGE_KEY` 상수 추가
  - `compareAnalysis` useMemo: 전주/전월 대비 건수·점수·인원 5개 비교 지표 계산
  - `handleSaveSnapshot`: 현재 분석 상태를 localStorage에 최대 10개 보존
  - `handleDeleteSnapshot`: 스냅샷 개별 삭제
  - `handleExportCSV`: 필터 적용된 entries를 BOM UTF-8 CSV로 다운로드
  - `handleCopyShareText`: 분석 요약을 클립보드에 복사 + 완료 피드백 (`copyDone`)
  - `filteredAnalysis`에 `filteredEntries` 반환 추가 (CSV 내보내기 연결)
  - 렌더링: "Period Comparison" 비교 지표 5행 카드 + "Snapshot & Export" 패널 추가
- Phase 4 Cleared (2026-04-28) — 빌드 통과 (`✓ built in 5.26s`)

### ✅ 문서 내보내기 균형감 보정 (PDF/이미지)
- `components/ReportView.tsx`
  - html2canvas 캡처 스케일을 디바이스 픽셀 비율 기반으로 조정 (`2~3` 범위)
  - 캡처 시 `windowWidth/windowHeight`를 A4 기준(`794x1123`)으로 고정
  - 전역 강제 `letter-spacing`/`img height:auto` 제거로 텍스트·그리드 변형 최소화
  - 내보내기 전용 레이아웃 강제 CSS(`.row/.col/.h-*`)로 화면/출력 간 비율 일치 강화
  - 캡처 직전 `lockExportLayout()` 적용으로 주요 셀/그리드/이미지의 계산 크기 고정 (브라우저별 미세 틀어짐 완화)
  - `lockExportLayout()` 정밀화: 반올림 대신 소수점(px) 보존 + min/max 동시 고정으로 누적 오차 완화
  - 이미지 preload 단계에 `img.decode()` 추가로 렌더 완료 시점 동기화 강화
  - 내보내기 클론 문서에 폰트 스택 강제 지정으로 화면/출력 텍스트 폭 차이 최소화

### 🎉 안전데이터 심층연구소 v2 — All Phases Cleared (2026-04-28)

---
### ✅ 안전데이터 심층연구소 v2 Phase 3 구현
- `components/SafetyDataLab.tsx`
  - `CommandOrder` 인터페이스 + `PRIORITY_CONFIG` 상수 추가 (CRITICAL / HIGH / MEDIUM)
  - `CommandOrderCard` 컴포넌트 신규 구현 (담당팀 / 우선순위 / 기한 / 근거 / KPI 카드)
  - AI 프롬프트를 JSON 배열 반환 요청 구조로 변경
  - JSON 파싱 성공 시 카드 렌더링, 실패 시 raw 텍스트 fallback 처리
  - 로딩 스켈레톤 / 오류 상태 / 재시도 버튼 UX 추가
  - 카드 닫기(X) 버튼 및 터미널 닫기 버튼 추가
- Phase 3 Cleared (2026-04-28) — 빌드 통과

---
## 기록 원칙
- 기능 단위로 묶어서 기록
- 파일 경로 + 핵심 변경 요약을 함께 기재
- 배포 영향이 있는 변경은 별도 섹션으로 명시
- 배포 단위 기록은 `RELEASE_TEMPLATE.md`를 사용
