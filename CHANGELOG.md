# 변경 기록 (Changelog)

이 문서는 프로젝트의 주요 변경 사항을 날짜 기준으로 관리합니다.

## 2026-04-28

### ✅ 안정화/버그 수정
- `components/TBMForm.tsx`
  - `handleSaveAll` 함수에서 `await onSave(...)` 사용에 맞춰 `async` 선언 추가
  - Vercel 빌드 오류 해결: `"await" can only be used inside an "async" function`

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

---

## 기록 원칙
- 기능 단위로 묶어서 기록
- 파일 경로 + 핵심 변경 요약을 함께 기재
- 배포 영향이 있는 변경은 별도 섹션으로 명시
- 배포 단위 기록은 `RELEASE_TEMPLATE.md`를 사용
