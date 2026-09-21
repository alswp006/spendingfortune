# Design Quality Audit — 2026-09-22

| 차원 | 점수 |
|---|---|
| 접근성 | 3 / 4 |
| 성능 | 2 / 4 |
| 다크모드 | 3 / 4 |
| TDS 준수 | 3 / 4 |

범위: `src/App.tsx`, `src/pages/*`, `src/components/*` (테스트·`__scratch__`·`__TdsGallery` 제외).

## 1. 접근성 — 3
- 양호: FloatingTabBar(`role=tab`/`aria-selected`/`aria-label`), MiniBar(`progressbar`), Sparkline(`role=img`+label), 아이콘 전용 버튼 없음, 커스텀 터치 영역 44px 지정.
- **P1 (수정함)**: `History.tsx`의 `role="button" tabIndex={0}` div가 `onClick`만 있고 키보드 핸들러가 없어 Enter/Space로 상세 이동 불가 → `onKeyDown`(Enter/Space) 추가.
- P2: 같은 행이 `role=button` 안에 ListRow를 중첩 — 스크린리더가 행 전체를 한 버튼으로 읽음. ListRow `onClick` 사용 여부 확인 후 교체 권장(동작 변경 위험으로 미수정).
- P3: `Sparkline` aria-label이 "추이 그래프"로 일반적 — 맥락 있는 문구 권장.
- 명암비: 하드코딩 색이 없어 TDS 토큰 조합에 위임. 단 `--adaptiveGrey500` 설명 텍스트(reward-ad.css)는 밝은 배경에서 AA 경계선(실측 안 함).

## 2. 성능 — 2
- P2: 빌드 결과 JS 단일 청크 1,332 kB(gzip 428 kB), Vite 500 kB 경고. 라우트별 `lazy()` 없음(현재 lazy는 dev 전용 `__TdsGallery`뿐). 페이지 6개를 `React.lazy`로 분리 권장. 비용 대부분은 TDS/SDK 번들일 가능성이 높아 분리 효과는 미측정.
- P3: `Result.tsx`/`Share.tsx`의 `<img>`에 `loading` 속성 없음(첫 화면 히어로라 lazy가 오히려 부적절할 수 있음, width/height는 지정됨).
- P3: `useMemo`/`memo` 사용 0건. History 목록은 페이지네이션(더 보기)이라 현재 규모에서 실측 문제 없음.
- 미사용 의존성: `lucide-react`, `@toss/tds-colors`는 src에서 import 0건이나 **플랫폼 필수 계약**이라 유지.

## 3. 다크모드 — 3
- 하드코딩 HEX/rgb: **0건** (src 전체 검색). 색상은 전부 `var(--adaptive*)`.
- `main.tsx`는 `TDSMobileAITProvider` 유지 확인.
- P2: `src/styles/reward-ad.css:20` `color: var(--white)` — `--adaptive*`가 아닌 고정 팔레트 변수. 파란 버튼 위 글자라 다크모드에서도 대체로 읽히나, 토큰 정의 여부를 확인 필요(미수정).
- P3: 토큰이 `--tds-color-*`가 아니라 `--adaptive*` 계열로 통일돼 있음(Provider가 주입하므로 정상).

## 4. TDS 준수 — 3
- Button variant는 전부 `fill|weak`, TextField는 모두 `variant="line"`+placeholder, ListRow padding prop 없음, Tailwind 없음.
- P2: `Input.tsx:243`, `Settings.tsx:41,76`의 `margin: '0 -24px'` 음수 마진 — TDS 여백 원칙 위반(ScreenScaffold 본문 패딩 24px 상쇄용). ScreenScaffold에 full-bleed 슬롯을 두는 방식이 정석.
- P2: `TossRewardAd`(`<button className="reward-ad-button">`), `TossPurchase`(`<button>`)가 TDS Button이 아닌 자작 CSS 버튼. 템플릿 제공 컴포넌트라 미수정.
- P3: 페이지 레벨 raw `div` + inline flex 스타일(Result/Share/Input/History) 다수 — 기능상 문제 없음.

## 수정 내역
- `src/pages/History.tsx`: 목록 행 키보드 활성화(Enter/Space) 추가. `tsc --noEmit`, `vite build` 통과.
- 테스트 파일·비즈니스 로직·패키지 변경 없음. P2/P3는 보고만 함.
