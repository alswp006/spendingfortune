# TASK — SpendingFortune

> 전제: 템플릿 기제공(수정 금지) — `ScreenScaffold`, `SubmitFooter`, `SummaryHero`, `Sparkline`, `MiniBar`, `FloatingTabBar`, `AdSlot`, `TossRewardAd`, `TossPurchase`, localStorage 원시 헬퍼.
> 로그인/TDS 셋업/광고 래퍼/탭바 제작 태스크 없음. 모든 태스크는 완료 시점에 `tsc --noEmit && vite build` 통과 필수.

---

## Epic 1. TypeScript 타입 + 정적 테이블

**Risk 평가**
- Complexity: Low
- Risk factors: (1) `RouteState`가 페이지보다 늦게 정의되면 각 페이지가 `location.state`를 `any`로 다뤄 데이터 계약이 깨진다. (2) 12유형 문구 길이 제약(40/80/60자)을 UI 작성 중 즉흥적으로 채우면 기계 검증이 불가능하다.
- Mitigation: Epic 1을 최우선 배치해 `RouteState`를 단일 진실 원천으로 고정하고, 문구 테이블을 UI보다 먼저 만들어 길이 제약을 순수 함수 테스트로 전수 검증한다.

### Task 1.1 도메인 타입 + RouteState 정의
- Description: SPEC Data Models를 그대로 타입 선언한다 — `CategoryId`, `CATEGORY_LABEL`, `SpendingEntry`, `DayLog`, `FortuneTypeId`, `FortuneType`, `AlertLevel`, `AlertRule`, `AlertItem`, `FortuneRecord`, `AppMeta`. 추가로 저장소 키 상수 `STORAGE_KEYS = { dayLogs: 'sf.daylogs.v1', fortunes: 'sf.fortunes.v1', meta: 'sf.meta.v1' }`, `DEFAULT_META`, 결과 타입 `type Result<T> = { ok: true; value: T } | { ok: false; reason: 'INVALID_AMOUNT' | 'QUOTA_EXCEEDED' | 'NO_BASIS_LOG' }`, 그리고 **RouteState**를 정의한다. 런타임 코드는 상수 선언까지만(함수 금지).
  ```ts
  export type RouteState = {
    '/': undefined;
    '/input': undefined;
    '/result': { date: string } | null;   // YYYY-MM-DD
    '/history': undefined;
    '/share': { date: string } | null;    // YYYY-MM-DD
    '/settings': undefined;
  };
  ```
- DoD: `src/lib/types.ts`가 위 타입/상수를 모두 export하고 `tsc --noEmit` 통과. `DEFAULT_META`가 `{ version: 1, noticeAckedAt: null, lastOpenDate: null, streakCount: 0, schemaMigratedAt: null }`와 deep-equal. `Object.keys(CATEGORY_LABEL).length === 8`. `RouteState['/result']`와 `RouteState['/share']`가 `null`을 유니온에 포함. 파일 내 정규식 `#[0-9a-fA-F]{3,8}\b` 매치 0건. 파일 내 `function` 선언 0건.
- Covers: [F1-AC-8]
- Files: [src/lib/types.ts]
- Depends on: none

### Task 1.2 12유형 캐릭터 테이블 + 고정 문구 테이블
- Description: `TYPE_TABLE: Record<FortuneTypeId, FortuneType>`(name/tagline/imageSrc)와 `TYPE_MATRIX: Record<'EAT'|'SHOP'|'LIFE'|'MISC', Record<'high'|'mid'|'low', FortuneTypeId>>`를 SPEC 매핑대로 작성한다. `COPY_TABLE`(유형 × scoreBand 조합별 `headline`/`advice`/`savingTip` 고정 문구)과 길이 전수 검증 테스트를 포함한다. 생성형 AI 미사용 — 전부 하드코딩 문자열.
- DoD: `Object.keys(TYPE_TABLE).length === 12`이고 각 항목의 `name`/`tagline`/`imageSrc`가 빈 문자열이 아님. 모든 `imageSrc`가 정규식 `^/characters/[a-z_]+\.png$`와 일치하며 파일명이 `id`와 동일. 모든 `tagline` 길이 ≤ 24. `COPY_TABLE` 36조합(12유형 × 3밴드) 전수에서 `headline ≤ 40`, `advice ≤ 80`, `savingTip ≤ 60` 위반 0건. `TYPE_MATRIX`의 12개 값이 서로 중복 없이 `FortuneTypeId` 12종을 정확히 1회씩 사용. `public/characters/{typeId}.png` 12개 존재(320×320, 각 ≤ 40KB).
- Covers: [F3-AC-7, F3-AC-8]
- Files: [src/lib/fortuneTable.ts, src/lib/__tests__/fortuneTable.test.ts, public/characters/]
- Depends on: Task 1.1

---

## Epic 2. 데이터 레이어 & 도메인 엔진

**Risk 평가**
- Complexity: Medium
- Risk factors: (1) `QuotaExceededError` 경로를 UI에서 처음 만나면 예외가 화면을 크래시시킨다. (2) `loggedDays === 0`일 때 0 나눗셈 → `NaN`/`Infinity` 점수. (3) 손상 JSON(`'{{broken'`) 파싱이 throw되어 전 화면 백지. (4) 저장소+통계+엔진을 한 패킷에 묶으면 10분 초과.
- Mitigation: 저장/보존정책/통계/엔진/경보/상태훅을 7개 태스크로 분리하고 각 태스크를 UI 없이 유닛테스트로 검증한다. 0 나눗셈·손상 복구·Quota를 각각 독립 DoD 항목으로 못 박아 UI 단계 전에 제거한다.

### Task 2.1 저장소 CRUD + 입력 검증 + 손상 복구
- Description: `getDayLog(date)`, `saveDayLog(log): Result<DayLog>`, `listDayLogs(from, to)`, `getMeta()`, `patchMeta(p)`를 구현한다. 모든 읽기를 `try/catch` + 스키마 가드로 감싸고 파싱 실패 시 키를 `'{}'`로 초기화한 뒤 안전 기본값을 반환한다. `saveDayLog`는 저장 전 `total`을 `entries` 합계로 강제 재계산하고 `amount`(정수, `1 ≤ x ≤ 10_000_000`)를 검증하며, `noSpend === true`면 `entries: []`, `total: 0`으로 정규화한다.
- DoD: `saveDayLog({date:'2026-09-04', entries:[{id:'e1',category:'food',amount:12000,memo:'점심',createdAt:1757000000000}], noSpend:false, total:12000, updatedAt:1757000000000})` 후 `localStorage['sf.daylogs.v1']`가 JSON 객체이고 키 `'2026-09-04'` 보유, `getDayLog('2026-09-04')!.total === 12000`. 호출자가 `total: 999`를 넘겨도 저장값은 `entries` 합계 `15000`. `amount`가 `0` / `10_000_001` / `1.5` / `NaN`이면 `{ ok:false, reason:'INVALID_AMOUNT' }` 반환 + 저장 전후 `localStorage` 문자열 동일. `localStorage['sf.daylogs.v1'] = '{{broken'` 상태에서 `listDayLogs('2026-08-01','2026-09-04') === []`이고 키가 `'{}'`로 초기화되며 예외 미전파. `sf.meta.v1` 부재 시 `getMeta()`가 `DEFAULT_META`와 deep-equal. 전 경로 `console.error` 호출 0건.
- Covers: [F1-AC-1, F1-AC-2, F1-AC-6, F1-AC-7, F1-AC-8]
- Files: [src/lib/storage.ts, src/lib/__tests__/storage.test.ts]
- Depends on: Task 1.1

### Task 2.2 보존 정책(90일/30일) + Quota 대응 + Fortune 저장소
- Description: `saveFortune(f)`, `getFortune(date)`, `pruneStorage()`를 추가하고 롤링 보존 정책을 `saveDayLog`/`saveFortune`에 연결한다. DayLog 90일 초과 시 날짜 오름차순 최고(最古) 키부터 삭제, Fortune 30일 초과 시 동일. `setItem`이 `QuotaExceededError`를 던지면 `pruneStorage()` 후 1회만 재시도하고, 재시도 실패 시 `{ ok:false, reason:'QUOTA_EXCEEDED' }`를 반환한다.
- DoD: 91일치 키 상태에서 신규 날짜 `saveDayLog` 호출 후 `Object.keys(...).length === 90`이고 삭제된 키가 최고 날짜와 일치. 31일치 상태에서 `saveFortune` 후 `sf.fortunes.v1` 키 30개. `setItem`이 항상 throw하는 모킹 환경에서 `saveDayLog`가 `{ ok:false, reason:'QUOTA_EXCEEDED' }` 반환 + 예외 미전파 + `console.error` 0건 + `pruneStorage` 호출 1회 + `setItem` 총 2회 호출. `pruneStorage()`가 `{ removedDayLogs: number, removedFortunes: number }` 반환.
- Covers: [F1-AC-4, F1-AC-5]
- Files: [src/lib/storage.ts, src/lib/__tests__/storage.prune.test.ts]
- Depends on: Task 2.1

### Task 2.3 통계 집계 getStats
- Description: `getStats(endDate, days)`를 구현한다. `endDate` 포함 과거 `days`일 구간의 `DayLog`를 모아 `total`, `loggedDays`(`noSpend: true`도 기록일로 카운트), `byCategory`(8종 전 키 존재, 미사용 0), `dailyAvg = loggedDays > 0 ? Math.round(total / loggedDays) : 0`을 반환한다.
- DoD: `2026-08-29`~`2026-09-04` 중 `food 30000`/`cafe 10000`/`shopping 60000` 각 1건(3일)일 때 `getStats('2026-09-04', 7)`가 `total: 100000`, `dailyAvg: 33333`, `loggedDays: 3`, `byCategory.shopping === 60000`을 반환. `byCategory` 키가 항상 8개이며 값에 `NaN`/`undefined` 0건. `loggedDays === 0`이면 `dailyAvg === 0`이고 결과 JSON에 `Infinity`/`NaN` 0건. `total: 'abc'` 같은 손상 레코드는 집계에서 제외되고 예외 미발생.
- Covers: [F1-AC-3]
- Files: [src/lib/stats.ts, src/lib/__tests__/stats.test.ts]
- Depends on: Task 2.1

### Task 2.4 운세 점수·유형 산출 순수 함수
- Description: `hash32(date)`, `computeScore({ yesterdayTotal, dailyAvg, date })`, `resolveDominantGroup(dayLog)`, `resolveTypeId(group, band)`, `computeEstimatedSaving(...)`, `resolveLuckyCategory/resolveCautionCategory`를 순수 함수로 구현한다. SPEC 고정 규칙(base 50, 보정표, `noise = (seed % 21) - 10`, `clamp(0,100)`, band 경계 70/40) 그대로 적용한다.
- DoD: 동일 `date`+동일 입력 2회 호출 시 `score`/`typeId` 값이 동일. `noSpend: true, total: 0` → `score ≥ 70`, `typeId === 'zero_spender'`, `cautionCategory === null`, `estimatedSaving === 0`. `dailyAvg 20000` + 어제 `shopping 60000` → `score ≤ 30`, `typeId === 'impulse_god'`, `estimatedSaving === 44000`. `loggedDays === 0` + 어제 `food 12000`만 존재 시 `dailyAvg`가 `12000`으로 대체되고 `Number.isInteger(score) === true`, `Number.isNaN(score) === false`. 무작위 입력 200건 fuzz에서 `0 ≤ score ≤ 100` 정수 위반 0건. 소스에 `Object.groupBy` / `.at(` / `structuredClone(` 매치 0건.
- Covers: [F3-AC-1, F3-AC-2, F3-AC-3, F3-AC-6]
- Files: [src/lib/fortuneEngine.ts, src/lib/__tests__/fortuneEngine.test.ts]
- Depends on: Task 1.2, Task 2.3

### Task 2.5 computeFortune 오케스트레이션(캐시·근거 가드·저장) + 날짜 유틸
- Description: `computeFortune(date): Result<FortuneRecord>`를 구현한다. ① `getFortune(date)`가 있으면 즉시 반환(재계산·재저장 없음) ② `basisDate = date - 1일`의 `DayLog`가 없으면 `{ ok:false, reason:'NO_BASIS_LOG' }` ③ 그 외 Task 2.4 계산부 + Task 1.2 문구 테이블 + Task 2.6 `detectAlerts` 결과를 조립해 `unlocked: false` 레코드를 `saveFortune`으로 1회 저장. 날짜 유틸 `todayKST()`, `addDays()`, `formatDate()`를 `src/lib/date.ts`로 분리한다.
- DoD: `getFortune('2026-09-05')`가 이미 존재할 때 재호출 시 `saveFortune` 호출 0회이고 반환 레코드의 `createdAt`이 기존 값과 동일(spy 검증). `getDayLog('2026-09-04') === null`일 때 `{ ok:false, reason:'NO_BASIS_LOG' }` 반환 + `sf.fortunes.v1` 키 미생성. 생성 레코드가 `headline ≤ 40`, `advice ≤ 80`, `savingTip ≤ 60`, `alerts.length ≤ 2`, `unlocked === false`를 만족. 타임존 모킹 테스트 2건 통과(UTC+0 23:30 → 다음날 날짜, UTC+9 00:10 → 당일 날짜)이며 `todayKST()` 반환값이 `^\d{4}-\d{2}-\d{2}$`와 일치.
- Covers: [F3-AC-4, F3-AC-5]
- Files: [src/lib/fortuneEngine.ts, src/lib/date.ts, src/lib/__tests__/computeFortune.test.ts]
- Depends on: Task 2.4, Task 2.6

### Task 2.6 지름신 주의보 규칙 엔진 detectAlerts
- Description: `detectAlerts(basisDate): AlertItem[]`을 구현한다. R1 CATEGORY_CONCENTRATION(`loggedDays ≥ 3` && 카테고리 7일 합계 `≥ 총합 × 0.4` && `≥ 30000`), R2 SPIKE(어제 총액 `≥ 직전 6일 일평균 × 2` && `≥ 50000`). `danger` 우선 정렬, 최대 2건, `loggedDays < 3`이면 `[]`.
- DoD: `shopping 60000`/`food 30000`/`cafe 10000`(총 100000, loggedDays 3) → `{ rule:'CATEGORY_CONCENTRATION', level:'caution', category:'shopping', ratio:0.6 }` 포함 + `message === '최근 7일 지출의 60%가 쇼핑에 몰렸어요'`. 직전 6일 일평균 20000 + 어제 60000 → `alerts[0]`가 `{ rule:'SPIKE', level:'danger', category:null, ratio:3.0, message:'어제 지출이 평소의 3.0배예요' }`. R1·R2 동시 충족 데이터 → `alerts.length === 2 && alerts[0].level === 'danger'`. `cafe 20000` 1건(loggedDays 1) → `[]`. 7일 DayLog 0건 → `[]` + 예외 0건 + 결과 JSON에 `Infinity`/`NaN` 문자열 0건. 전 규칙 조합 생성 `message`에 `설치`/`다운로드`/`앱스토어`/`가입하기` 매치 0건.
- Covers: [F5-AC-1, F5-AC-2, F5-AC-3, F5-AC-4, F5-AC-5, F5-AC-8]
- Files: [src/lib/alerts.ts, src/lib/__tests__/alerts.test.ts]
- Depends on: Task 2.3

### Task 2.7 앱 상태 훅 useAppData + 스트릭 계산
- Description: 페이지가 저장소를 직접 만지지 않도록 경량 상태 훅을 만든다. `useAppData()`는 `{ loading, meta, todayDate, yesterdayDate, yesterdayLog, streakCount, ackNotice(), resetAll(), refresh() }`를 반환한다. `computeStreak(dayLogs, endDate)`는 `endDate`(어제)부터 하루씩 거슬러 연속 기록일을 세고, 마운트 시 `patchMeta({ streakCount, lastOpenDate })`로 동기화한다. `resetAll()`은 `sf.daylogs.v1`/`sf.fortunes.v1` 제거 + `streakCount: 0`.
- DoD: `2026-09-02/03/04` 연속 기록 상태에서 `computeStreak(logs, '2026-09-04') === 3`이고 훅 마운트 후 `sf.meta.v1.streakCount === 3`. `2026-09-03`이 비면 `computeStreak(logs, '2026-09-04') === 1`. 기록 0건이면 `streakCount === 0` + 예외 0건. `resetAll()` 후 두 키가 `localStorage.getItem`에서 `null`이고 `getMeta().streakCount === 0`이며 `noticeAckedAt` 값은 보존. 초기 마운트 시 `loading === true`가 1회 관측된 뒤 `false`로 전이.
- Covers: [F8-AC-4]
- Files: [src/hooks/useAppData.ts, src/lib/streak.ts, src/lib/__tests__/streak.test.ts]
- Depends on: Task 2.2, Task 2.3

---

## Epic 3. Core UI 페이지

**Risk 평가**
- Complexity: High
- Risk factors: (1) `location.state` 없이 `/result`·`/share`에 직접 진입/새로고침 시 `state.date` 접근으로 즉시 크래시 — 실사고(2026-08-03 SplitMate: undefined 배열 `.map()` 크래시, 완주율 0%). (2) TDS 컴포넌트에 Tailwind/인라인 padding을 덮어써 검수 반려. (3) 리워드 광고 실패 콜백 미처리로 버튼 영구 로딩. (4) 폼+목록+저장+광고를 한 페이지 패킷에 몰면 10분 초과.
- Mitigation: state 수신 페이지는 "캐스팅 전에 null 확인 → `<Navigate>` 또는 빈 상태 렌더"를 DoD에 명시하고, 화면마다 "state 없이 직접 진입해도 크래시하지 않는다" DoD 항목을 추가한다. 각 화면을 폼/목록, 게이트/레이아웃, 추이/비중, 카드/복사로 2개씩 분할한다.

### Task 3.1 /input — 카테고리 칩 + 금액/메모 입력 폼
- Description: `InputPage` 골격(`ScreenScaffold` + `Top('어제 지출 기록')`)과 입력부만 구현한다. TDS `Chip` 8종(`data-testid="category-chip-{CategoryId}"`), 금액 `TextField`(`inputMode="numeric"`, 천 단위 콤마 표시·내부값 정수), 메모 `TextField`(`maxLength={30}`), "추가" 버튼, 검증 실패 시 인라인 에러. 목록/저장은 Task 3.2에서 붙인다.
- DoD: 최상위가 `ScreenScaffold`이고 하단에 `data-testid="submit-footer"` `SubmitFooter` + `display="block"` TDS Button(`운세 보기`) 존재. `category-chip-*` 8개 렌더 + 각 칩 `getBoundingClientRect().height ≥ 44`. 금액 `''` 또는 `0`으로 "추가" → 텍스트 `금액을 입력해주세요` 표시 + 항목 수 증가 0. 금액 `10000001`로 "추가" → 텍스트 `1천만원 이하로 입력해주세요` 표시 + 항목 수 증가 0. 금액 필드 포커스 시 `scrollIntoView({ block: 'center' })` 1회 호출(spy), 필드에 `inputMode="numeric"` 속성 존재, 추가 성공 시 `blur()` 1회 호출. 메모 31자 입력 시 값이 30자로 잘림. TDS 컴포넌트에 인라인/className `padding`·`margin` 덮어쓰기 0건, 커스텀 CSS는 칩 컨테이너 `display:flex` 1개만, HEX 매치 0건.
- Covers: [F2-AC-4, F2-AC-5, F2-AC-8, F2-AC-9]
- Files: [src/pages/InputPage.tsx, src/pages/InputPage.module.css]
- Depends on: Task 1.1

### Task 3.2 /input — 항목 목록·무지출·저장 후 /result 이동
- Description: 추가 항목을 `Card` 안 `ListRow` 목록으로 렌더(삭제 버튼 44×44px), 상단 합계, 10건 상한, 빈 상태, "어제 무지출이었어요" 보조 버튼, "운세 보기" 저장 플로우를 구현한다. 저장은 `saveDayLog` → `computeFortune(today)` → `navigate('/result', { state: { date: today } })`이며 `RouteState['/result']`와 일치하는 payload만 전달한다.
- DoD: `식비 12000` + 메모 `점심` 추가 후 "운세 보기" → `getDayLog('2026-09-04')`가 `{ total:12000, noSpend:false, entries.length:1 }`, Toast `저장했어요` 표시, `navigate('/result', { state: { date: '2026-09-05' } })` 1회 호출. 항목 0건에서 "어제 무지출이었어요" 탭 → `getDayLog('2026-09-04')`가 `{ total:0, noSpend:true, entries:[] }` + 동일 navigate 호출. `식비 12000` + `카페/간식 4500` 상태에서 두 번째 항목 삭제 버튼(≥ 44×44px) 탭 → 목록 1건, 상단 합계 텍스트 `12,000원`. 항목 10건에서 "추가" → Toast `하루에 최대 10건까지 기록할 수 있어요` + 항목 수 10 유지. 항목 0건일 때 `Asset.ContentIcon` + `어제 쓴 돈을 하나씩 담아주세요` 표시 + "운세 보기" `disabled === true`. 저장 중 "운세 보기" 3회 연타 시 `saveDayLog` 호출 1회 + 버튼 `loading` 상태. 저장 `ok:false` 시 Toast `저장하지 못했어요. 다시 시도해주세요` 표시 + `console.error` 0건.
- Covers: [F2-AC-1, F2-AC-2, F2-AC-3, F2-AC-6, F2-AC-7]
- Files: [src/pages/InputPage.tsx]
- Depends on: Task 3.1, Task 2.2, Task 2.5

### Task 3.3 /result — 잠금 게이트 & 리워드 광고 언락
- Description: `ResultPage`의 진입 가드와 게이트 로직만 구현한다(공개 레이아웃은 3.4). state 수신은 반드시 null 확인 우선 패턴: `const state = (useLocation().state as RouteState['/result']) ?? null; const date = state?.date ?? todayKST();`. `unlocked === false`면 `fortune-lock-card` + `TossRewardAd`로 감싼 `unlock-button`만 렌더하고, 시청 완료 시 `saveFortune({ ...record, unlocked: true })`. 실패 콜백 시 Toast + 버튼 복구, 조회 중 `result-skeleton`.
- DoD: `unlocked:false` 레코드 존재 + `/result` 진입 → `data-testid="fortune-lock-card"` 렌더 + 텍스트 `광고를 보면 오늘의 소비운세가 열려요` 포함. 잠금 상태에서 `headline`/`advice`/`savingTip` 문자열과 `img[src^="/characters/"]`가 DOM에 존재하지 않음(`queryByText`/`querySelector` 결과 `null`). `unlock-button` 탭 + 광고 성공 콜백 → `fortune-hero`/`character-card`/`advice-card` 표시 + `sf.fortunes.v1['2026-09-05'].unlocked === true`. `unlocked:true` 재진입 시 `queryByTestId('unlock-button') === null`이고 결과 즉시 표시. 광고 실패 콜백 → Toast `광고를 불러오지 못했어요. 잠시 후 다시 시도해주세요` + `unlocked === false` 유지 + 버튼 `disabled === false` 복귀 + `console.error` 0건. 조회 중 `data-testid="result-skeleton"` 표시 후 300ms 이내 제거. `unlock-button` 렌더 높이 56px. **state 없이 `/result` 직접 진입/새로고침 시 크래시 0건이며 오늘 날짜로 폴백 렌더된다.**
- Covers: [F4-AC-1, F4-AC-2, F4-AC-3, F4-AC-4, F4-AC-6]
- Files: [src/pages/ResultPage.tsx]
- Depends on: Task 2.5, Task 1.1

### Task 3.4 /result — 공개 레이아웃(히어로·캐릭터·조언) + 고지 배지 + 배너
- Description: `unlocked === true` 본문 레이아웃을 구현한다. 순서 = `content-notice-badge` → `fortune-hero`(`SummaryHero`, score CountUp + `점`) → (경보 슬롯, 3.5) → `character-card`(이미지 320×320, 유형명 t2, tagline) → `advice-card`(headline t3 강조, advice, savingTip, `estimatedSaving` 강조 + `절약 가능` 배지, 행운/주의 `Chip`) → `<AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID} />` → `SubmitFooter`(`공유 카드 만들기`).
- DoD: 최상위 `ScreenScaffold`이고 `data-testid="fortune-hero"`가 `SummaryHero`로 score를 CountUp 표기하며 `점` 텍스트 포함. `character-card`·`advice-card`가 각각 TDS `Card` 1개(총 2개) 존재. `advice-card` 내부에 `estimatedSaving`이 `12,000원` 형식(콤마+`원`) 강조 타이포로 표기. `img[alt]` 값이 `TYPE_TABLE[typeId].name`과 문자열 일치. `data-testid="content-notice-badge"` 렌더 + 텍스트 `재미로 보는 콘텐츠예요` 포함. `<AdSlot />` 인스턴스 1개이며 `advice-card.bottom ≤ AdSlot.top` 및 `AdSlot.bottom ≤ submit-footer.top`. 공유 버튼 탭 → `navigate('/share', { state: { date } })` 호출 + 버튼 높이 56px. HEX 매치 0건, TDS 여백 덮어쓰기 0건, 간격은 `Spacing size={...}`만 사용.
- Covers: [F4-AC-7, F4-AC-8, F8-AC-2]
- Files: [src/pages/ResultPage.tsx, src/pages/ResultPage.module.css]
- Depends on: Task 3.3, Task 1.2

### Task 3.5 /result — 경보 카드 · 데이터 부족 안내 · 빈 상태
- Description: `alert-card`(경보 2건을 `ListRow`로, `danger`엔 `경보` 배지·`caution`엔 `주의` 배지)를 `character-card` 위에 배치한다. `loggedDays < 3`이면 `alert-empty`로 대체하고, 운세 자체가 없을 때(`getFortune(date) === null` && `computeFortune`이 `NO_BASIS_LOG`)는 빈 상태 화면을 렌더한다.
- DoD: `alerts.length === 2`일 때 `data-testid="alert-card"` TDS `Card` 1개 안에 `ListRow` 2개 + `danger` 항목에 텍스트 `경보` + `caution` 항목에 텍스트 `주의`. `alert-card.bottom ≤ character-card.top`. `loggedDays < 3` && `unlocked:true` → `alert-card` 미렌더 + `data-testid="alert-empty"` 렌더 + 텍스트 `3일 이상 기록하면 지름신 주의보를 알려드려요` 포함. `location.state === null` && `getFortune(today) === null` → `Asset.ContentIcon` + `어제 지출을 먼저 기록해주세요` + `display="block"` 버튼 `지출 기록하러 가기` 표시, 탭 시 `navigate('/input')` 호출, 크래시 0건. 빈 상태에서 `<AdSlot />`·`SubmitFooter` 미렌더.
- Covers: [F4-AC-5, F5-AC-6, F5-AC-7]
- Files: [src/pages/ResultPage.tsx, src/components/AlertCard.tsx]
- Depends on: Task 3.4, Task 2.6

### Task 3.6 /history — 평균 히어로 + 7일 추이 카드
- Description: `HistoryPage` 골격(`ScreenScaffold` + `Top('7일 소비운세')`)과 추이 Card를 구현한다. 최근 7일 `FortuneRecord`를 읽어 스키마 가드로 손상 레코드를 제외하고 `history-avg-hero`(`SummaryHero`, 평균 점수 CountUp) + `history-sparkline`(`Sparkline`)을 렌더한다. 로딩 `history-skeleton`, 빈 상태 포함.
- DoD: 5일치 점수 `[62,71,45,80,55]` → `data-testid="history-sparkline"` 데이터 포인트 5개 + `data-testid="history-avg-hero"`에 `63` 표기. 7일 중 2일만 기록 → 데이터 포인트 2개, 배열에 `null`/`NaN`/`0` 대체값 삽입 0건, 평균 분모 2. `sf.fortunes.v1['2026-09-02'] = { date:'2026-09-02', score:'abc' }` 존재 시 해당 항목이 그래프/목록에서 제외되고 나머지 정상 렌더 + 크래시 0건 + `console.error` 0건. `FortuneRecord` 0건 → `Asset.ContentIcon` + `아직 기록된 소비운세가 없어요` + `display="block"` 버튼 `지출 기록하러 가기` 렌더 + `history-sparkline` 미렌더. 로드 중 `data-testid="history-skeleton"` 표시 후 완료 시 DOM에서 제거.
- Covers: [F6-AC-1, F6-AC-4, F6-AC-5, F6-AC-6, F6-AC-7]
- Files: [src/pages/HistoryPage.tsx]
- Depends on: Task 2.3, Task 2.2

### Task 3.7 /history — 카테고리 비중 카드 + 날짜 목록 + 배너
- Description: 비중 Card(`category-minibar`, `MiniBar` 행)와 추이 Card 내 날짜별 `ListRow` 목록, "전체 내역 더 보기"(20건 단위 점진 렌더, 최대 90건), `<AdSlot />` 배치를 구현한다. 날짜 행 탭 시 `navigate('/result', { state: { date } })`.
- DoD: `byCategory = { shopping:60000, food:30000, cafe:10000, 나머지 0 }` → `data-testid="category-minibar"` 내부 `MiniBar` 행 3개만 렌더(0인 카테고리 미렌더) + 텍스트 `쇼핑 60%`, `식비 30%`, `카페/간식 10%` 포함. `2026-09-03` `ListRow` 탭 → `navigate('/result', { state: { date: '2026-09-03' } })` 호출 + 행 높이 ≥ 56px. `data-testid="history-card"` TDS `Card`가 정확히 2개. 기록 40일치 상태에서 "전체 내역 더 보기" 1회 탭 시 목록 항목 수 7 → 27. `<AdSlot />` 1개만 렌더되며 `AdSlot.bottom ≤ FloatingTabBar.top`. 빈 상태 화면에서 `MiniBar`/`Sparkline` 미렌더.
- Covers: [F6-AC-2, F6-AC-3, F6-AC-8]
- Files: [src/pages/HistoryPage.tsx, src/pages/HistoryPage.module.css]
- Depends on: Task 3.6

### Task 3.8 /share — 공유 카드 렌더 + 진입 가드
- Description: `SharePage`를 구현한다. state 수신은 null 확인 우선: `const state = (useLocation().state as RouteState['/share']) ?? null; const record = state ? getFortune(state.date) : null;`. 정상 시 `share-card`(TDS `Card`, 3:4 비율) 안에 유형 이미지 → 유형명(t2) → `{score}점`(t1 강조) → headline → 날짜 순으로 렌더하고, 빈 상태/잠금 상태를 분기한다.
- DoD: `state:{date:'2026-09-05'}`, `typeId:'zero_spender'`, `score:82`, `unlocked:true` → `data-testid="share-card"` 렌더 + 텍스트 `무지출 챌린저`, `82점`, `headline` 포함. `share-card`가 TDS `Card` 1개이고 `width/height` 비율이 `0.75 ± 0.05`. `state === null` 또는 `getFortune(state.date) === null` → `Asset.ContentIcon` + `공유할 운세가 없어요` + 버튼 `오늘의 운세 보기` 표시, 탭 시 `navigate('/')` 호출, **크래시 0건**. `unlocked === false` → 카드 미렌더 + 문구 `운세를 먼저 확인해주세요` + 버튼 `운세 확인하러 가기` 표시 + `headline`/`advice` 문자열이 DOM에 존재하지 않음. 관련 파일 정규식 `#[0-9a-fA-F]{3,8}\b` 매치 0건. 닫기 버튼 히트 영역 44×44px, 탭 시 `navigate(-1)` 호출.
- Covers: [F7-AC-1, F7-AC-5, F7-AC-6, F7-AC-7, F7-AC-8]
- Files: [src/pages/SharePage.tsx, src/pages/SharePage.module.css]
- Depends on: Task 3.4, Task 1.2

### Task 3.9 /share — 요약 텍스트 복사 & 외부 이탈 금지
- Description: `SubmitFooter` 안에 `display="block"` `copy-button`(`요약 텍스트 복사`)을 추가하고 `navigator.clipboard.writeText`로 복사한다. 미지원/reject 시 폴백 Toast를 띄우고, 이 화면 범위에서 외부 도메인 이동 코드가 0건임을 확정한다.
- DoD: `copy-button` 탭 → `navigator.clipboard.writeText`가 `오늘의 소비운세 82점 · 무지출 챌린저\n{headline}` 형식 문자열로 정확히 1회 호출 + Toast `복사했어요` 표시. `navigator.clipboard === undefined`이거나 `writeText`가 reject → Toast `복사를 지원하지 않는 환경이에요. 카드를 길게 눌러 저장해주세요` 표시 + `console.error` 0건 + 미처리 rejection 0건. `/share`의 모든 버튼/링크 순회 탭에서 `window.open` 호출 0회, `window.location.href` 할당 0회(spy 검증), `<a href>`는 없거나 `/`로 시작. `copy-button` 높이 56px이며 `SubmitFooter` 내부에 위치.
- Covers: [F7-AC-2, F7-AC-3, F7-AC-4]
- Files: [src/pages/SharePage.tsx]
- Depends on: Task 3.8

### Task 3.10 / 홈 — 스트릭·요약·CTA 분기·최초 고지 다이얼로그
- Description: `HomePage`를 구현한다. 배치 = `streak-badge` → `home-summary-hero`(어제 총 지출 CountUp) → 상태 Card(`home-cta` 포함) → `<AdSlot />` → `FloatingTabBar`. `useAppData()`로 데이터를 읽고, `meta.noticeAckedAt === null`이면 `AlertDialog`를 1회 노출한 뒤 확인 시 `ackNotice()`를 호출한다.
- DoD: `getMeta().noticeAckedAt === null` 상태로 `/` 진입 → `AlertDialog` 1회 표시 + 본문에 `이 서비스의 소비운세는 입력하신 지출 데이터를 바탕으로 생성된 재미용 콘텐츠이며, 투자·금융 자문이 아닙니다` 포함, 확인 탭 시 `sf.meta.v1.noticeAckedAt`이 `number`(epoch ms)로 저장되고 재마운트 시 다이얼로그 미노출. `getDayLog('2026-09-04') === null` → `data-testid="home-cta"` 라벨 `어제 지출 기록하기` + 탭 시 `navigate('/input')`. `getDayLog('2026-09-04') !== null` → 라벨 `오늘의 운세 보기` + 탭 시 `navigate('/result', { state: { date: '2026-09-05' } })`. 3일 연속 기록 시 `data-testid="streak-badge"`에 `3일 연속 기록 중` 표시 + `sf.meta.v1.streakCount === 3`. `sf.daylogs.v1` 비어 있음 → `Asset.ContentIcon` + `첫 기록을 남기면 내일부터 소비운세가 열려요` 표시 + `streak-badge` 미렌더. 초기 로드 중 `data-testid="home-skeleton"` 표시. 스토리지 손상 시 Toast `기록을 불러오지 못해 초기화했어요` + `console.error` 0건. `home-cta` 높이 56px이고 `<AdSlot />`이 상태 Card 아래·탭바 위에 `Spacing size={16}` 간격으로 1개만 렌더.
- Covers: [F8-AC-1, F8-AC-3, F8-AC-4, F8-AC-5]
- Files: [src/pages/HomePage.tsx]
- Depends on: Task 2.7, Task 1.1

### Task 3.11 /settings — 고지 재열람·전체 삭제·그래프 표시 스위치
- Description: `SettingsPage`를 `ListRow` 목록으로 구현한다. 항목 = `고지 다시 보기`, `히스토리 그래프 표시`(TDS `Switch`), `전체 기록 삭제`, `버전`(고정 텍스트), 그리고 A8 안내 문구(`기록은 이 기기에만 저장돼요`). 삭제는 `AlertDialog` 확인 후 `resetAll()`을 호출한다.
- DoD: `전체 기록 삭제` `ListRow` 탭 → `AlertDialog` 표시, `삭제` 확인 시 `sf.daylogs.v1`·`sf.fortunes.v1`이 `localStorage.getItem`에서 `null`이 되고 `sf.meta.v1.streakCount === 0` + Toast `기록을 모두 삭제했어요` 표시. `취소` 탭 시 두 키 값이 삭제 전 문자열과 동일. 삭제 실패(`removeItem` throw) 시 Toast `삭제하지 못했어요` 표시 + `console.error` 0건. `고지 다시 보기` 탭 시 F8-AC-1과 동일 본문의 `AlertDialog` 표시. 각 `ListRow` 렌더 높이 ≥ 56px, `Switch` 히트 영역 ≥ 44px, `ListRow`에 `padding` prop/인라인 스타일 사용 0건. 스위치 off 시 `/history`에서 `history-sparkline`·`category-minibar` 미렌더되고 목록만 남음.
- Covers: [F8-AC-6]
- Files: [src/pages/SettingsPage.tsx]
- Depends on: Task 2.7

---

## Epic 4. 통합 + 검수

**Risk 평가**
- Complexity: Medium
- Risk factors: (1) 라우팅 배선이 마지막에 몰리면 페이지 간 `state` 타입 불일치가 통합 시점에 한꺼번에 터진다. (2) 검수 금지 패턴(HEX, `window.open`, 외부 SDK, 최신 API)이 여러 파일에 흩어져 수동 확인이 누락된다. (3) 프로덕션 빌드에서만 재현되는 `console.error`.
- Mitigation: `RouteState`를 Epic 1에서 먼저 고정해 통합 리스크를 앞당겨 제거하고, 마지막 태스크에서 정적 검증 스크립트로 금지 패턴을 자동 검사해 사람 눈에 의존하지 않는다. 전 화면 순회 E2E로 프로덕션 콘솔 에러를 기계 검증한다.

### Task 4.1 라우팅 배선 + 탭바 + state 없는 직접 진입 회귀 방어
- Description: `BrowserRouter`에 6개 라우트(`/`, `/input`, `/result`, `/history`, `/share`, `/settings`)를 등록하고, `FloatingTabBar`(오늘/히스토리/설정)를 `/`, `/history`, `/settings`에서만 렌더한다. 모든 `navigate()` 호출부가 `RouteState` payload와 일치하도록 강제하는 얇은 헬퍼 `useTypedNavigate()`를 추가하고, 미정의 경로는 `/`로 리다이렉트한다.
- DoD: 6개 라우트가 모두 렌더되고 `tsc --noEmit` 통과. `/result`·`/share`에 `state` 없이 직접 진입 및 새로고침하는 테스트 4건에서 크래시 0건 — `/result`는 오늘 날짜 폴백 또는 빈 상태, `/share`는 `공유할 운세가 없어요` 빈 상태 렌더. `useTypedNavigate()('/result', { date })` 외 형태의 payload 전달 시 컴파일 에러가 발생함을 타입 테스트로 확인. `FloatingTabBar`가 `/input`·`/result`·`/share`에서 렌더 0건이고 `/`·`/history`·`/settings`에서만 렌더되며 각 탭 히트 영역 ≥ 44×44px. `/unknown` 진입 시 `/`로 리다이렉트.
- Covers: [F4-AC-5, F6-AC-3, F7-AC-5]
- Files: [src/App.tsx, src/routes.tsx, src/hooks/useTypedNavigate.ts]
- Depends on: Task 3.2, Task 3.5, Task 3.7, Task 3.9, Task 3.10, Task 3.11

### Task 4.2 검수 정책 정적 검증 스크립트 + 프로덕션 빌드 순회 E2E
- Description: `scripts/audit.mjs`(npm script `audit:policy`)를 작성해 `src/**/*.{ts,tsx,css}`의 금지 패턴을 검사하고 1건이라도 매치되면 non-zero exit 한다. 프로덕션 빌드 순회 E2E(`/` → `/input` → `/result` → `/history` → `/share` → `/settings`)를 추가하고, `grantPromotionReward` 사용 시 `amount ≤ 5000` 가드도 검사한다.
- DoD: 스크립트가 `window.open(`, `window.location.href =`, `google-analytics`, `gtag`, `amplitude`, `mixpanel`, `sentry`, `앱을 설치`, `다운로드`, `앱스토어`, `플레이스토어`, 정규식 `#[0-9a-fA-F]{3,8}\b`, `fetch(`, `XMLHttpRequest`, `axios` 각각의 매치 수를 0으로 확인하고 위반 시 exit code ≠ 0. `dist/**/*.js`에 `Object.groupBy`, `.at(`, `structuredClone(` 매치 0건. shadcn/MUI/antd/chakra import 0건이며 `package.json` dependencies에도 0건. `vite build && vite preview` 구동 후 6개 화면 순회 E2E에서 `console.error` 호출 0건 + 미처리 Promise rejection 0건. `grantPromotionReward` 호출부가 존재하면 모두 `amount ≤ 5000` 가드로 감싸이고 초과 시 Toast `지급 한도를 초과했어요` 표시, 호출부 0건이면 통과. `npm run audit:policy`가 CI 없이 로컬 단독 실행 가능.
- Covers: [F8-AC-7, F8-AC-8, F8-AC-9, F5-AC-8, F7-AC-4]
- Files: [scripts/audit.mjs, package.json, e2e/smoke.spec.ts]
- Depends on: Task 4.1

---

## AC Coverage

- Total ACs in SPEC: 66 (F1: 8, F2: 9, F3: 8, F4: 8, F5: 8, F6: 8, F7: 8, F8: 9)
- Covered by tasks: 66
  - F1-AC-1 → Task 2.1
  - F1-AC-2 → Task 2.1
  - F1-AC-3 → Task 2.3
  - F1-AC-4 → Task 2.2
  - F1-AC-5 → Task 2.2
  - F1-AC-6 → Task 2.1
  - F1-AC-7 → Task 2.1
  - F1-AC-8 → Task 1.1, Task 2.1
  - F2-AC-1 → Task 3.2
  - F2-AC-2 → Task 3.2
  - F2-AC-3 → Task 3.2
  - F2-AC-4 → Task 3.1
  - F2-AC-5 → Task 3.1
  - F2-AC-6 → Task 3.2
  - F2-AC-7 → Task 3.2
  - F2-AC-8 → Task 3.1
  - F2-AC-9 → Task 3.1
  - F3-AC-1 → Task 2.4
  - F3-AC-2 → Task 2.4
  - F3-AC-3 → Task 2.4
  - F3-AC-4 → Task 2.5
  - F3-AC-5 → Task 2.5
  - F3-AC-6 → Task 2.4
  - F3-AC-7 → Task 1.2
  - F3-AC-8 → Task 1.2
  - F4-AC-1 → Task 3.3
  - F4-AC-2 → Task 3.3
  - F4-AC-3 → Task 3.3
  - F4-AC-4 → Task 3.3
  - F4-AC-5 → Task 3.5, Task 4.1
  - F4-AC-6 → Task 3.3
  - F4-AC-7 → Task 3.4
  - F4-AC-8 → Task 3.4
  - F5-AC-1 → Task 2.6
  - F5-AC-2 → Task 2.6
  - F5-AC-3 → Task 2.6
  - F5-AC-4 → Task 2.6
  - F5-AC-5 → Task 2.6
  - F5-AC-6 → Task 3.5
  - F5-AC-7 → Task 3.5
  - F5-AC-8 → Task 2.6, Task 4.2
  - F6-AC-1 → Task 3.6
  - F6-AC-2 → Task 3.7
  - F6-AC-3 → Task 3.7, Task 4.1
  - F6-AC-4 → Task 3.6
  - F6-AC-5 → Task 3.6
  - F6-AC-6 → Task 3.6
  - F6-AC-7 → Task 3.6
  - F6-AC-8 → Task 3.7
  - F7-AC-1 → Task 3.8
  - F7-AC-2 → Task 3.9
  - F7-AC-3 → Task 3.9
  - F7-AC-4 → Task 3.9, Task 4.2
  - F7-AC-5 → Task 3.8, Task 4.1
  - F7-AC-6 → Task 3.8
  - F7-AC-7 → Task 3.8
  - F7-AC-8 → Task 3.8
  - F8-AC-1 → Task 3.10
  - F8-AC-2 → Task 3.4
  - F8-AC-3 → Task 3.10
  - F8-AC-4 → Task 2.7, Task 3.10
  - F8-AC-5 → Task 3.10
  - F8-AC-6 → Task 3.11
  - F8-AC-7 → Task 4.2
  - F8-AC-8 → Task 4.2
  - F8-AC-9 → Task 4.2
- Uncovered: 0

총 태스크 수: 22 (Epic 1: 2, Epic 2: 7, Epic 3: 11, Epic 4: 2) — 최소 4개 요건 충족, 모든 태스크가 단독 컴파일 가능하며 1세션(≤10분) 범위.