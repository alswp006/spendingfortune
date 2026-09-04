# Sprint Contract: App 라우팅 배선 + FloatingTabBar 전역 배치

## 만들 항목
- **src/App.tsx**: BrowserRouter + Routes 6개(/, /input, /result, /history, /share, /settings) + 미지경로 리다이렉트 + RouteState 타입 기반 navigate state 계약
- **src/lib/types.ts**: RouteState (navigate state 도메인 타입) 추가
- **홈·히스토리·설정**: FloatingTabBar(3탭: 홈/히스토리/설정) 내장, 각 페이지 스텁(렌더 가능)

## 사용 타입
- RouteState (navigate state 계약): 라우트별 state 필드 정의
- 페이지 컴포넌트: Home, Input, Result, History, Share, Settings (스텁 가능)

## 검증 방법
1. `npx tsc --noEmit` 통과 — RouteState 타입 체크 성공
2. `npx vitest run` 통과 — 기존 테스트 회귀 없음
3. 미지경로 요청(`/unknown` 등) → / 리다이렉트 동작 확인
4. 각 Route 경로 접근 가능 확인 (404 아님, 페이지 렌더)

## 절대 금지
- main.tsx 수정 금지 — TDSMobileAITProvider/BrowserRouter 이미 설정됨
- FloatingTabBar를 Input/Result/Share 화면에 배치 금지 — 3탭(홈/히스토리/설정)만
- Route path 변경 금지 — 6개 경로 고정: /, /input, /result, /history, /share, /settings
