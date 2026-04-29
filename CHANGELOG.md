# 변경 기록 (Changelog)

이 문서는 프로젝트의 주요 변경 사항을 날짜 기준으로 관리합니다.

## 2026-04-29

### ✅ 스마트TBM지휘 카테고리 계획 추가
- `SAFETY_DATALAB_V2_IMPLEMENTATION_PLAN.md`
  - 확장 카테고리 `스마트TBM지휘` 신규 정의
  - Command Phase 1~4(지휘브리핑/지시발령/이행체크/지휘리포트)와 Clear 기준 추가
  - 즉시 착수 항목(`types.ts`, `SafetyDataLab.tsx`, 트래커 보드) 명시
- `SAFETY_DATALAB_V2_TRACKER.md`
  - 스마트TBM지휘 상태 보드 및 운영 체크리스트 추가
  - 작업 로그에 카테고리 확장 반영

### ✅ 스마트TBM지휘 초기 스키마 구현 착수
- `types.ts`
  - 지시 카테고리용 타입 추가: `CommandTask`, `CommandBriefingItem`, `CommandDailyReport`
  - 상태/우선순위/지연사유 타입(`CommandStatus`, `CommandPriority`, `CommandDelayReason`) 추가
- `SAFETY_DATALAB_V2_IMPLEMENTATION_PLAN.md`, `SAFETY_DATALAB_V2_TRACKER.md`
  - 즉시 착수 항목 1번 완료 처리 및 작업 로그 반영

### ✅ 스마트TBM지휘 지휘브리핑 스켈레톤 반영
- `components/SafetyDataLab.tsx`
  - `Smart TBM Command Briefing (Draft)` 섹션 추가
  - 기존 위험 스펙트럼 상위 3건 기반 브리핑 카드(위험명/건수/즉시조치/KPI) 표시
  - 데이터 없음 fallback 메시지 추가
- `SAFETY_DATALAB_V2_IMPLEMENTATION_PLAN.md`, `SAFETY_DATALAB_V2_TRACKER.md`
  - 즉시 착수 항목 2번 완료 처리 및 작업 로그 반영

### ✅ 스마트TBM지휘 Command Phase 2 착수 + 모바일 최적화
- `components/SafetyDataLab.tsx`
  - Command Workflow 섹션 추가(지시 생성/상태변경/삭제)
  - 지시 데이터 localStorage 저장(`smart_tbm_command_tasks_v1`)
  - 팀 필터와 연동된 지시 목록 표시
  - 모바일 반응형 개선: 헤더 액션 스택/폼 그리드/목록 레이아웃 최적화, 터치 타겟 높이 보강
- `SAFETY_DATALAB_V2_IMPLEMENTATION_PLAN.md`, `SAFETY_DATALAB_V2_TRACKER.md`
  - Command Phase 1 Cleared 반영
  - Command Phase 2를 In Progress로 상태 업데이트

### ✅ AI 추천 지시-워크플로우 병합
- `components/SafetyDataLab.tsx`
  - AI 지시 카드 영역에 `지시 워크플로우로 가져오기` 액션 추가
  - AI 카드 → Command Task 변환 시 우선순위/담당팀/기한(dueAt) 매핑 적용
  - 동일 제목+지시내용 기준 중복 방지 후 저장
- `SAFETY_DATALAB_V2_IMPLEMENTATION_PLAN.md`, `SAFETY_DATALAB_V2_TRACKER.md`
  - Command Phase 2 Cleared(2026-04-29) 반영

### ✅ 스마트TBM지휘 Command Phase 3 착수
- `components/SafetyDataLab.tsx`
  - 지시 카드별 이행 증빙 이미지 첨부/삭제(최대 3장) 및 코멘트 입력 추가
  - 지연 사유 코드(`MATERIAL/MANPOWER/WEATHER/OTHER`) 및 상세 사유 입력 추가
  - 입력값을 Command Task 저장소(localStorage)와 동기화
  - 상태 변경 시 `statusHistory` 누적 저장 및 카드 내 이력 조회 UI 추가
- `types.ts`
  - `CommandStatusHistoryItem` 타입 및 `CommandTask.statusHistory` 필드 추가
- `SAFETY_DATALAB_V2_IMPLEMENTATION_PLAN.md`, `SAFETY_DATALAB_V2_TRACKER.md`
  - Command Phase 3 진행 상태(In Progress) 반영

### ✅ 스마트TBM지휘 Command Phase 4 초안 반영
- `components/SafetyDataLab.tsx`
  - `Smart TBM Command Daily Report (Phase 4 Draft)` 섹션 추가
  - 지표 카드(총지시/완료/지연/완료율/지연율) 및 지연사유 Top/위험요인 Top3 요약 추가
  - `지휘 리포트 복사` 액션 추가(클립보드 공유 텍스트)
  - 재발위험 지표(`recurrenceRiskScore`, `recurrenceRiskLevel`) 및 공유 텍스트 반영
  - 상태전이 누적 건수(`totalStatusTransitions`) 및 Phase3 기준 충족 배지(10건+) 추가
  - 검증 지원 액션 추가: `검증용 5건 생성`, `상태전이 자동 검증`
  - 트래커 입력 지원 액션 추가: `검증 로그 1줄 복사`(Done/In Progress 자동 판정)
  - 검증 운영 지원 액션 추가: `검증용 데이터 정리`(VALCMD 샘플 일괄 제거)
  - 통합 검증 상태 카드 추가: 증빙/지연사유/리포트 데이터 충족 여부 및 완료 조건 시각화
  - `클리어 요약 1줄 복사` 액션 추가: Command Phase3/4 Clear 후보 로그 자동 생성
- `SAFETY_DATALAB_V2_IMPLEMENTATION_PLAN.md`, `SAFETY_DATALAB_V2_TRACKER.md`
  - Command Phase 4 진행 상태(In Progress) 반영

### ✅ 문서 상태 정합화
- `SAFETY_DATALAB_V2_TRACKER.md`
  - 스마트TBM지휘 구현 완료 로그를 `Done` 기준으로 정리
  - 잔여 항목을 `Command Phase3/4 실검증 실행` 1건으로 축약
- `SAFETY_DATALAB_V2_IMPLEMENTATION_PLAN.md`
  - 진행 상태 요약에 스마트TBM지휘 현재 단계(기능구현 완료 + 실검증 대기) 명시

### ✅ 모바일 UX 개선 (등록/지휘)
- `components/TBMForm.tsx`
  - 모바일 우선 레이아웃으로 재구성(고정 2분할 → 세로 스택)
  - 헤더 액션/대기열/입력 폼 그리드 반응형 조정 및 터치 조작성 개선
  - 모바일 하단 고정 저장 바 및 현재 입력 요약/진척 표시 추가
- `components/SafetyDataLab.tsx`
  - 통합 검증 상태 카드에 `평가자 관점`/`실무자 관점` 충족 배지 추가
  - 모바일 빠른 검증 액션 바(검증 로그 복사/클리어 요약 복사) 추가

### ✅ 전일 기록 확인 검증 및 후속 진행 착수
- `SAFETY_DATALAB_V2_TRACKER.md`
  - 전일(2026-04-28) 구현 항목의 코드 교차검증 결과를 작업 로그에 추가
  - 실행환경 제약(GitHub VFS 미마운트)으로 로컬 셸 빌드 검증이 Blocked 상태임을 기록
  - 출력물 실검증(화면/PDF/이미지 비교) 작업을 `In Progress`로 반영
  - 단건/다건 기준의 실출력 검증 상세 체크리스트와 결과 템플릿 추가
- `SAFETY_DATALAB_V2_IMPLEMENTATION_PLAN.md`
  - 진행 상태를 `완료 유지 + 후속 검증 진행중`으로 갱신
  - 2026-04-29 검증 메모(핵심 지점 확인, 에디터 오류 0건, 빌드 제약) 추가
  - 2026-04-29 다음작업 실행 절차(단건→다건 출력 검증 순서) 상세화
  - 오늘 종료 조건(Done Definition) 명시

### ✅ 검증 기록 자동화 보강
- `SAFETY_DATALAB_V2_TRACKER.md`
  - 작업 로그 복붙용 문구(정상완료/이슈/재검증) 추가
  - 2026-04-29 마감 체크리스트(완료 처리 기준) 추가

### ✅ 문서 내보내기 추가 안정화
- `components/ReportView.tsx`
  - 내보내기 대상 페이지 탐색 범위를 모달 내부(`reportDialogRef`)로 제한해 오탐 캡처 가능성 축소
  - 페이지가 0건일 때 즉시 안내 후 종료하는 가드 추가
  - 단건 이미지 다운로드 파일명에도 특수문자 치환 적용(다건 ZIP 규칙과 일치)

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
