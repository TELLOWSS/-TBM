# 변경 기록 (Changelog)

이 문서는 프로젝트의 주요 변경 사항을 날짜 기준으로 관리합니다.

## 2026-04-29

### ✅ 보관소 초기필터 원터치 해제 + 심층연구소 다중팀 필터 확장
- `components/ReportCenter.tsx`
  - 대시보드 전달 초기필터 배지에 `초기필터 해제` 액션 추가
  - 원터치 해제 시 팀/연계상태/보정필요 프리필터를 기본값으로 즉시 복귀
- `components/SafetyDataLab.tsx`
  - 팀 필터를 단일 선택에서 다중 선택으로 확장(`teamIds`)
  - 팀 열지도 선택을 토글 누적으로 변경해 여러 팀 동시 Drill-Down 지원
  - 마스터 팀 목록에 없는 팀도 엔트리 기반으로 필터 대상에 자동 포함
  - `미지정 팀` 버킷을 추가해 팀 누락 데이터도 분석 범위에서 제외되지 않도록 보정
  - 공유 요약/지휘 리포트/AI 분석 컨텍스트에 다중 팀 범위를 반영
- `components/SafetyDataLab.tsx`, `App.tsx`
  - `Unknown Team Normalization Queue` 추가(기존팀 치환 / 신규팀 등록+치환)
  - 미등록 팀 발생 건수/최근일자 기준 큐를 제공해 평가자 승인·실무자 정규화 동선을 분리
  - 정규화 실행 시 `entries`/`teams`를 앱 상태 및 저장소에 즉시 반영
  - 정규화 작업 이력(누가/언제/무엇/몇건)을 저장하고 심층연구소 내 최근 이력 카드로 표시
- `utils/backupValidation.ts`, `App.tsx`
  - 전체 백업/복구 범위에 `teamNormalizationLogs`를 포함해 운영 이력의 연속성 보장
- `App.tsx`, `components/Dashboard.tsx`
  - 팀 정규화 로그 적재 시 최신 스냅샷 기반으로 병합하도록 보강해 동시 액션 경합 시 로그 누락 위험 완화
  - 날씨 요청에 request sequence 가드를 추가해 이전 요청 응답이 최신 상태를 덮어쓰는 충돌(stale response) 방지
- `components/SafetyDataLab.tsx`
  - 정규화 작업 이력 카드에 기간 필터(`오늘/7일/30일`) 추가
  - 선택 기간 기준 이력만 조회하도록 필터링 로직 추가
  - 선택 기간 기준 이력 CSV 내보내기 기능 추가
- `App.tsx`, `components/SafetyDataLab.tsx`, `types.ts`, `utils/backupValidation.ts`
  - 정규화 동선을 `요청 → 승인/반려` 워크플로우로 전환
  - 승인/반려 시 사유코드(`오기입/미지정정리/품질개선/팀개편/대외점검/기타`) 및 검토 메모 기록
  - 승인 대기/요청 처리 이력 보드 추가, 승인 시 실제 정규화 실행 및 로그 누적
  - `teamNormalizationRequests` 저장/백업/복구 연계로 워크플로우 상태 지속성 보장
- `components/SafetyDataLab.tsx`
  - Phase C 운영 KPI 추가: 요청 SLA(대기 건수/평균 대기시간/최장 대기시간/24시간 초과 건수)
  - 반려 사유 Top 통계 카드 추가로 반려 패턴 분석 지원
  - KPI 임계치 기반 운영 경보 배지 추가(`24h 초과 대기`, `평균 대기 12h+`, `반려 누적 5건+`)
- `App.tsx`, `components/Dashboard.tsx`
  - 팀 정규화 요청 상태를 기반으로 대시보드용 경보 요약 지표(`critical/warning/pending`)를 계산해 전달
  - 대시보드 상단 헤더에 `CRITICAL/WARNING` 경보 배지 및 심층연구소 즉시 이동 액션 추가
  - 대시보드 `데이터 연구소` 카드에 정규화 경보 건수 배지를 노출해 초기 화면에서 운영 리스크 선인지 강화
- `App.tsx`, `components/Dashboard.tsx`, `components/SafetyDataLab.tsx`
  - 대시보드 경보 라벨 클릭 시 심층연구소 `Unknown Team Normalization Queue` 섹션으로 딥링크 포커스 연동
  - 심층연구소 진입 시 대상 섹션 자동 스크롤 및 일시 하이라이트로 조치 구간 인지성 강화
  - 포커스 진입 시 첫 번째 승인 대기 요청 카드도 자동 스크롤 + 에머랄드 링 하이라이트로 즉시 조치 유도
- `components/Dashboard.tsx`
  - 모바일 상단 부제목 정렬/줄바꿈을 보강해 텍스트 우측 쏠림 현상 완화
  - 상단 영문 부제목을 한글 문구로 전환해 모바일 가독성 개선
- `components/SafetyDataLab.tsx`
  - 심층연구소 주요 영문 UI 라벨을 한글로 전환(안전 점수/팀 활동 히트맵/미등록 팀 정규화 대기열/스마트TBM 지휘 섹션 등)
  - 히트맵/워크플로우 카드 텍스트에 `min-w-0`/줄바꿈/축약 클래스 보강으로 글자 겹침·넘침 완화
  - 잔여 영문 라벨(상태/우선순위/경보/기간비교/지연사유 표기)을 한글로 추가 통일해 심층연구소 UI 한글 일관성 강화
- `components/Dashboard.tsx`, `components/ReportCenter.tsx`
  - 대시보드/문서보관소 잔여 영문 라벨(`CRITICAL/WARNING`, `Last 7 Days`, `Top`, `Document Archive`, `Unknown` 등)을 한글로 통일
  - 기상 경보 레벨 문구, 시스템 상태 배지, 이미지 대체텍스트를 한글화해 현장 가독성 및 접근성 강화
- `components/RiskAssessmentManager.tsx`, `components/TBMForm.tsx`, `App.tsx`
  - 위험성평가 화면 분석 HUD/통계 라벨(`AI Analysis`, `Processing`, `Top Risk Categories`, `Base/Updates/New Regular` 등) 한글 통일
  - TBM 저장 로직의 기본 팀명 `Unknown`을 `미지정`으로 통일해 UI/유효성 조건 일관성 확보
  - 앱 복구 오버레이 영문 안내(`System Restoring`, `Serializing & Saving`, `% Complete`)를 한글로 전환
- `README.md`
  - 대용량 기능 운영을 위한 한국어 사용자 설명서(화면별 기능, 역할별 가이드, 운영 시나리오, 백업/복구, 체크리스트) 확장
- `SAFETY_DATALAB_V2_IMPLEMENTATION_PLAN.md`, `SAFETY_DATALAB_V2_TRACKER.md`
  - 운영 로그 및 구현 메모 동기화

### ✅ 모바일 대시보드 긴 팀명 overflow 안정화
- `components/Dashboard.tsx`
  - `팀별 보정 우선순위` 카드의 팀명 표시를 `truncate` 중심에서 `break-words` 기반으로 전환해 긴 팀명도 카드 내에서 안정적으로 표시
  - `실시간 활동(금일)` 헤더의 선택 팀 배지에 모바일 최대 폭/말줄임 처리를 추가해 상단 레이아웃 깨짐 방지
  - 실시간 목록 팀명/시각 행에 폭 제한을 추가해 긴 팀명에서도 시각 정보가 밀리지 않도록 보정
- `SAFETY_DATALAB_V2_IMPLEMENTATION_PLAN.md`, `SAFETY_DATALAB_V2_TRACKER.md`
  - 후속 모바일 미세조정 항목 및 작업 로그 동기화

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
  - 모바일 `미디어 / 입력데이터` 탭 전환 추가로 입력란 전체폭 확보
- `components/SafetyDataLab.tsx`
  - 통합 검증 상태 카드에 `평가자 관점`/`실무자 관점` 충족 배지 추가
  - 모바일 빠른 검증 액션 바(검증 로그 복사/클리어 요약 복사) 추가

### ✅ 위험성평가 모바일 최적화 (평가자/실무자 관점)
- `components/RiskAssessmentManager.tsx`
  - 모바일 1차 탭 전환 추가: `평가목록 / 평가내용`
  - 모바일 작업영역 2차 탭 전환 추가: `실무도구 / 최종목록`
  - 고정 2열 구조를 모바일 우선 세로 흐름으로 재구성하고 터치 타겟 최소 높이 보강
  - 평가 항목 카드의 수정/삭제 액션을 모바일에서 항상 노출되도록 조정
  - 평가자용 요약(상위험 수, 비교추적) / 실무자용 요약(등록·수정·삭제 동선) 카드 추가
  - 검색창/액션 버튼/빈 상태 CTA를 모바일 폭에 맞춰 전체폭 중심으로 재배치
  - 평가 선택 시 자동 상세 전환, 수동 추가 후 자동 목록 복귀, `상위험만` 필터 추가
  - 모바일 하단 고정 액션바 추가: `평가목록 / 실무도구 / 최종목록 / 상위험` 전환 + 문서추가 바로가기
  - 상위험 카드 및 편집모드에 `즉시조치 메모` 저장 필드 추가
  - 상위위험 `TOP 3` 상단 요약 카드와 `즉시조치 메모 복사` 버튼 추가
  - 평가 목록에 `기준 정보 / 운영 정보` 아코디언 축소 추가
  - `상위위험 고정 섹션` 및 `즉시조치 메모 일괄 복사` 추가
- `types.ts`, `utils/backupValidation.ts`
  - `SafetyGuideline.actionNote` 필드 및 백업 검증 스키마 반영

### ✅ 스마트TBM 등록-위험성평가 연계 가시화/정밀화
- `App.tsx`, `components/TBMForm.tsx`
  - TBM 등록 화면에 현재 연계된 위험성평가 상태 카드 추가
  - TBM 입력 일자와 같은 `월간 위험성평가`를 우선 연결하도록 보강
  - 연계 데이터는 수기 일지 OCR, 안전 코멘트 생성, 동영상 평가에 공통 사용되도록 유지
  - 연계된 상위위험/즉시조치 메모를 TBM 위험요인/대책 초안으로 `단건/일괄 가져오기` 추가
  - 선택 팀 기준으로 연계 추천을 우선 정렬하고, 조치메모를 안전 코멘트로 즉시 반영하는 액션 추가
  - TBM 저장 시 사용된 위험성평가 ID/라벨/연계조건(동일월 여부) 메타데이터 기록
- `components/Dashboard.tsx`, `components/ReportCenter.tsx`, `components/ReportView.tsx`
  - 저장 후 이력/문서 목록/출력 보고서에서 연계된 위험성평가 라벨과 동일월 연계 여부를 표시

### ✅ 위험성평가 연계 운영 필터/경보/지표 확장
- `components/ReportCenter.tsx`
  - 문서 보관소에 `연계 전체 / 연계 있음 / 미연계` 필터 추가
  - 데이터 패키지 `manifest.json`에 연계 필터 상태 저장
- `components/Dashboard.tsx`
  - 금일 TBM 기준 `미연계 / 동일월 미일치 / 동일월 연계` 현황 경보 카드 추가
- `components/SafetyDataLab.tsx`
  - 위험성평가 연계 사용률, 동일월 연계율, 평균 상위위험 수 KPI 카드 추가

### ✅ 위험성평가 연계 운영 후속 고도화
- `components/ReportCenter.tsx`
  - `동일월 연계 / 동일월 미일치` 세부 필터 추가
- `components/Dashboard.tsx`
  - 경보 카드에서 `연계 보정 바로가기` 및 보관소 이동 액션 추가
- `components/SafetyDataLab.tsx`
  - 팀별 연계율/동일월 연계율 Top 보드 추가

### ✅ 위험성평가 연계 운영 모니터링 추가 확장
- `components/ReportCenter.tsx`
  - 보관소 카드에 `연계 보정 필요 / 동일월 확인 필요` 배지 추가
- `components/Dashboard.tsx`
  - 금일 경보를 팀별 우선순위 묶음으로 표시
- `components/SafetyDataLab.tsx`
  - 최근 6개월 `연계율 / 동일월 연계율` 추이 차트 추가

### ✅ 위험성평가 연계 운영 탐색성 추가 개선
- `components/ReportCenter.tsx`
  - `보정 필요만` 빠른 토글 추가
  - 패키지 `manifest`에 보정 토글 상태 저장
- `components/SafetyDataLab.tsx`
  - 월별 연계 추이 차트 범위를 `3M / 6M / 12M`으로 즉시 전환 가능하게 확장

### ✅ 위험성평가 연계 운영 가시성 추가 보강
- `components/Dashboard.tsx`
  - 팀별 경보 카드 클릭 시 해당 팀 금일 TBM만 실시간 목록에서 확인 가능
- `components/ReportCenter.tsx`
  - 현재 목록 기준 `미연계 / 미일치 / 동일월 연계` 요약 배너 추가
- `components/SafetyDataLab.tsx`
  - 월별 연계 추이 차트에 목표선(`90%`) 추가

### ✅ 위험성평가 연계 운영 액션/운영값 추가 보강
- `components/Dashboard.tsx`
  - 선택된 경보 팀 기준으로 `보정 바로가기` 대상도 해당 팀 우선으로 연결
- `components/ReportCenter.tsx`
  - 보정 요약 배너에 `보정 필요만 켜기/해제` 원클릭 액션 추가
- `components/SafetyDataLab.tsx`
  - 연계율 목표선을 저장형 운영값으로 전환(`80/90/95` 프리셋 + 직접 입력)

### ✅ 위험성평가 연계 운영 전역설정/세부필터 확장
- `types.ts`, `utils/siteConfigStorage.ts`, `utils/backupValidation.ts`
  - `SiteConfig.linkageTargetRate` 추가 및 저장/복구 스키마 확장
- `components/SettingsModal.tsx`, `App.tsx`, `components/SafetyDataLab.tsx`
  - 연계율 목표값을 설정 화면에서 전역 관리하고 연구소 차트와 동기화
- `components/ReportCenter.tsx`
  - 보정 요약 배너에 `미연계만`, `미일치만` 원클릭 액션 추가

### ✅ 대시보드→보관소 팀 필터 컨텍스트 전달
- `components/Dashboard.tsx`, `App.tsx`, `components/ReportCenter.tsx`
  - 대시보드에서 선택한 이슈 팀을 보관소 이동 시 함께 전달
  - 보관소 진입 시 해당 팀 필터가 자동 적용되도록 연동

### ✅ 대시보드→보관소 세부 보정 필터 컨텍스트 전달
- `components/Dashboard.tsx`, `App.tsx`, `components/ReportCenter.tsx`
  - 대시보드 경보 카드에서 `미연계만 보기`, `미일치만 보기` 액션 추가
  - 보관소 진입 시 팀 + 링크 상태(`all/unlinked/mismatched`)를 함께 자동 적용

### ✅ 모바일 상단 UX/기준치/초기필터 가시화 보강
- `components/Dashboard.tsx`
  - 모바일 메인 상단 헤더 정렬 개선(`items-start`, 상단 여백 보정)
  - 기상 경보 기준에서 타워크레인 풍속 임계값을 `15m/s 이상`으로 상향
- `components/ReportCenter.tsx`
  - 보관소 상단에 초기 필터 상태 배지 추가(예: `대시보드 전달: 미연계`)

### ✅ 통합대시보드 모바일 최상단 간격 미세 조정
- `components/Dashboard.tsx`
  - 모바일에서 헤더/배너/첫 카드 구간 간격을 1단계 축소(`space-y`, `gap`, `pb`, `mb`)

### ✅ 통합대시보드 모바일 경보카드 터치 개선
- `components/Dashboard.tsx`
  - 연계 점검 경보 카드 액션 버튼을 모바일 그리드로 재배치
  - 버튼 최소 높이(`44px`) 적용으로 터치 오동작 감소

### ✅ 통합대시보드 모바일 팀우선순위 터치 개선
- `components/Dashboard.tsx`
  - 팀별 보정 우선순위 카드 버튼에 최소 높이(`44px`) 적용
  - `전체 보기` 버튼도 모바일 터치 기준에 맞춰 높이/패딩 보강

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

### ✅ 대시보드/심층연구소 모바일 라벨 축약
- `components/Dashboard.tsx`
  - 연계 점검 카드의 안내 문구를 모바일 중심으로 축약(`미정합 상태`, `미연계/미일치/연계` 요약)
  - 액션 버튼 라벨 길이 축소(`보정 이동`, `보관소 전체 확인`, `미연계만`, `미일치만`)
  - 팀명 포함 액션 라벨에 `truncate` 적용으로 긴 팀명에서도 버튼 폭 안정화
- `components/SafetyDataLab.tsx`
  - 지휘 워크플로우/일일 리포트 헤더 및 검증 버튼 라벨 축약
  - 상태 검증 배지 문구를 짧게 통일(`통합검증 충족/진행`, `이력검증 충족(10+)`)

### ✅ 모달/등록화면 잔여 영문 최종 통일
- `components/HistoryModal.tsx`
  - 헤더/배지/타임라인 고정 문구의 영문 표기를 한글로 정리(`Devlog`, `System Evolution History`, `NEW`, `Project Initiated` 등)
  - 마일스톤 제목·설명의 영문 괄호 표현을 현장 용어 중심 한글 문구로 통일
- `components/SystemIdentityModal.tsx`
  - 시스템 아이덴티티 배지 및 상태 설명의 혼용 영문을 한글화(`Ultra Fast`, `Verified`, `Failover`, `Client-Side` 등)
  - 기술 식별자(모델명/버전/ID)는 유지하고 사용자 안내 문구만 한국어로 정리
- `components/TBMForm.tsx`
  - AI 진단 카드의 잔여 영문 라벨(`Total Score`, `Leader's Action Card`, `Master Safety Review`, `Data Entry`)을 한글 통일


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
