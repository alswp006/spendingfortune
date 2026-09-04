# SPEC — SpendingFortune (앱인토스)

> PRD 기준 확장 스펙. 본 문서의 AC는 모두 기계 검증 가능(구체 값 포함)하도록 작성되었다.
> 로그인/세션(토스 자동 제공), TDS 셋업, `AdSlot` / `TossRewardAd` / `TossPurchase` / localStorage 헬퍼 / `FloatingTabBar`는 **템플릿에 이미 구현됨** → 본 스펙의 기능 범위에서 제외.

---

## Common Principles

### C1. 기술 스택 고정
- Vite + React 18 + TypeScript, 라우팅은 `react-router-dom`(`BrowserRouter`), 데이터는 `localStorage`.
- **서버 코드 없음.** 외부 API 호출 없음(§ API Contract 참조).
- UI는 전량 `@toss/tds-mobile` 컴포넌트로 구성. shadcn/ui, MUI, Ant Design, Chakra UI 사용 시 즉시 반려.

### C2. 레이아웃/표현 공통 계약
- 모든 화면은 `ScreenScaffold`(템플릿 제공 페이지 골격)로 감싼다. **raw `div` 최상위 골격 금지.**
- 1차 액션 버튼은 `SubmitFooter`(하단 고정) 또는 `display="block"` TDS Button. 좌측 글자폭 버튼 금지.
- 결과/지표/추이 정보는 TDS `Card`로 묶어 위계를 표현한다. 맨 `div` 나열 금지.
- 핵심 숫자(운세 점수, 어제 총 지출, 절감 가능액)는 `SummaryHero`의 `value`(CountUp)로 표현한다.
- 추이 데이터는 `Sparkline`, 비중 데이터는 `MiniBar`로 시각화한다. 데이터가 없는 화면에는 시각화를 넣지 않는다(장식 금지).
- 빈 상태는 TDS `Asset.ContentIcon` + 안내 문구 + 1차 액션 버튼 3요소를 포함한다.
- 간격은 TDS `Spacing`(`size` prop 필수)만 사용. TDS 컴포넌트에 Tailwind/인라인 `padding`·`margin` 덮어쓰기 금지.
- 커스텀 CSS는 `display:flex` / `display:grid` 배치 목적에만 허용.

### C3. 색상/다크모드
- HEX 하드코딩(`#FFFFFF`, `#333` 등) 금지. 색은 TDS 컴포넌트 기본값 또는 `var(--tds-color-*)` CSS 변수만 사용.

### C4. 모바일 인터랙션
- 모든 탭 가능한 요소의 히트 영역 ≥ 44×44 CSS px.
- 폼 입력은 `inputMode="numeric"`(금액) 지정, 포커스 시 입력 필드가 키보드에 가려지지 않도록 `scrollIntoView({ block: 'center' })` 수행, 제출 성공 시 `blur()`로 키보드 닫기.
- 리스트가 30개를 초과하면 "더 보기" 20개 단위 점진 렌더(윈도잉)로 처리한다.

### C5. 콘텐츠 고지 (생성형 AI 비해당 근거 포함)
- 본 앱의 운세 텍스트/이미지는 **생성형 AI를 사용하지 않고**, 사용자의 입력값과 고정 문구 테이블로 결정론적으로 생성된다(§F3). 따라서 "AI가 생성한 결과입니다" 라벨 의무는 비해당이다.
- 대신 오해 방지를 위해 **결과 생성 방식 고지**를 첫 이용 1회 다이얼로그 + 결과 화면 상시 배지로 노출한다(§F8).
- 만약 향후 생성형 AI 도입 시 F3에 AI 고지 AC 2종(사전 고지 다이얼로그 / 결과물 라벨)을 추가해야 한다(§ Open Questions Q3).

### C6. 검수 준수 (전 화면 공통, F8에서 테스트로 검증)
- `window.location.href` / `window.open`을 통한 외부 도메인 이동 금지.
- Google Analytics, Amplitude 등 외부 분석/로깅 SDK 사용 금지.
- "앱을 설치하세요", "다운로드" 등 외부 앱 설치 유도 문구/배너/링크 금지.
- 프로덕션 빌드에서 `console.error` 출력 0건.
- Android 7+ / iOS 16+ 호환. `Array.prototype.at`, `Object.groupBy`, 옵셔널 체이닝 할당 등 최신 전용 API 사용 금지(대체 구현 사용).

### C7. 날짜 규칙
- 모든 날짜는 `YYYY-MM-DD` 문자열, `Asia/Seoul` 기준. 하루 경계는 00:00 KST.
- "오늘" = 운세 날짜, "어제" = 지출 입력 대상 날짜(`today - 1일`).

---

## Data Models

### CategoryId (고정 8종)
```ts
export type CategoryId =
  | 'food'      // 식비
  | 'cafe'      // 카페/간식
  | 'shopping'  // 쇼핑
  | 'transport' // 교통
  | 'culture'   // 문화/여가
  | 'health'    // 건강/의료
  | 'living'    // 생활/구독
  | 'etc';      // 기타

export const CATEGORY_LABEL: Record<CategoryId, string> = {
  food: '식비', cafe: '카페/간식', shopping: '쇼핑', transport: '교통',
  culture: '문화/여가', health: '건강/의료', living: '생활/구독', etc: '기타',
};
```

### SpendingEntry
| field | type | constraint |
|---|---|---|
| `id` | `string` | `crypto.randomUUID()` 결과. 유니크 |
| `category` | `CategoryId` | 8종 중 1 |
| `amount` | `number` | 정수, `1 ≤ amount ≤ 10_000_000` |
| `memo` | `string` | 0~30자. 초과 입력 차단 |
| `createdAt` | `number` | epoch ms |

```ts
export interface SpendingEntry {
  id: string;
  category: CategoryId;
  amount: number;
  memo: string;
  createdAt: number;
}
```

### DayLog — 하루 단위 지출 기록
| field | type | constraint |
|---|---|---|
| `date` | `string` | `YYYY-MM-DD` (지출 발생일 = 어제) |
| `entries` | `SpendingEntry[]` | 최대 10개 |
| `noSpend` | `boolean` | `true`이면 `entries.length === 0` 이어야 함 |
| `total` | `number` | `entries` 합계. `noSpend === true`이면 `0` |
| `updatedAt` | `number` | epoch ms |

```ts
export interface DayLog {
  date: string;
  entries: SpendingEntry[];
  noSpend: boolean;
  total: number;
  updatedAt: number;
}
```

### FortuneTypeId (12유형)
```ts
export type FortuneTypeId =
  | 'gourmet_saver' | 'cafe_addict' | 'delivery_lord'        // 식음 그룹 × high/mid/low
  | 'smart_shopper' | 'wishlister'  | 'impulse_god'          // 쇼핑 그룹 × high/mid/low
  | 'planner_cpa'   | 'balance_master' | 'subscription_hell' // 생활 그룹 × high/mid/low
  | 'zero_spender'  | 'dust_collector' | 'flexer';           // 기타 그룹 × high/mid/low

export interface FortuneType {
  id: FortuneTypeId;
  name: string;        // 예: '무지출 챌린저'
  tagline: string;     // 24자 이내 한 줄 소개
  imageSrc: string;    // '/characters/zero_spender.png' (320x320, ≤40KB)
}
```

### AlertItem — 지름신 주의보 1건
```ts
export type AlertLevel = 'caution' | 'danger';
export type AlertRule = 'CATEGORY_CONCENTRATION' | 'SPIKE';

export interface AlertItem {
  rule: AlertRule;
  level: AlertLevel;
  category: CategoryId | null; // SPIKE는 null
  message: string;             // 화면 표시 문구 (완성형)
  ratio: number;               // CATEGORY_CONCENTRATION: 0~1, SPIKE: 배수(예: 2.4)
}
```

### FortuneRecord — 하루치 운세 결과 (결정론적 스냅샷)
| field | type | constraint |
|---|---|---|
| `date` | `string` | `YYYY-MM-DD` (운세 날짜 = 오늘) |
| `basisDate` | `string` | 근거가 된 지출 날짜(어제) |
| `score` | `number` | 정수 `0 ≤ score ≤ 100` |
| `typeId` | `FortuneTypeId` | 12종 중 1 |
| `headline` | `string` | 40자 이내 |
| `advice` | `string` | 80자 이내 |
| `savingTip` | `string` | 60자 이내 |
| `luckyCategory` | `CategoryId` | 오늘 써도 좋은 카테고리 |
| `cautionCategory` | `CategoryId \| null` | 주의 카테고리 |
| `estimatedSaving` | `number` | 정수(원), `0 ≤ x ≤ 10_000_000` |
| `alerts` | `AlertItem[]` | 최대 2개 |
| `yesterdayTotal` | `number` | 정수(원) |
| `unlocked` | `boolean` | 리워드 광고 시청 완료 여부 |
| `createdAt` | `number` | epoch ms |

```ts
export interface FortuneRecord {
  date: string; basisDate: string; score: number; typeId: FortuneTypeId;
  headline: string; advice: string; savingTip: string;
  luckyCategory: CategoryId; cautionCategory: CategoryId | null;
  estimatedSaving: number; alerts: AlertItem[];
  yesterdayTotal: number; unlocked: boolean; createdAt: number;
}
```

### AppMeta
```ts
export interface AppMeta {
  version: 1;
  noticeAckedAt: number | null; // 콘텐츠 고지 확인 시각(§F8)
  lastOpenDate: string | null;  // 'YYYY-MM-DD'
  streakCount: number;          // 연속 기록 일수, 0 이상 정수
  schemaMigratedAt: number | null;
}
```

### localStorage 키 / 크기 산정
| key | shape | 보존 정책 | 예상 크기 |
|---|---|---|---|
| `sf.daylogs.v1` | `Record<string, DayLog>` | 최근 90일. 초과 시 오래된 날짜부터 삭제 | 90일 × 5건 × ~110B ≈ **50KB** |
| `sf.fortunes.v1` | `Record<string, FortuneRecord>` | 최근 30일. 초과 시 오래된 날짜부터 삭제 | 30일 × ~420B ≈ **13KB** |
| `sf.meta.v1` | `AppMeta` | 영구 | ≈ **0.2KB** |
| **합계** | | | **≈ 64KB (< 5MB, 1.3%)** |

- 모든 쓰기는 템플릿 localStorage 헬퍼를 통해 `try/catch`로 감싸며, `QuotaExceededError` 발생 시 §F1의 정리 절차를 수행한다.

---

## Feature List

---

### F1. 데이터 레이어 & 저장소 (storage/도메인 순수 함수)

- **Description**: `DayLog`, `FortuneRecord`, `AppMeta`의 읽기/쓰기/검증/보존정책(90일·30일 롤링)과 통계 집계(7일 합계, 카테고리 비중, 일평균)를 순수 함수로 제공한다. UI 없이 단독 테스트 가능한 모듈이며, F2~F7이 모두 이 모듈만을 통해 저장소에 접근한다. 스키마 버전(`v1`)과 손상 데이터 복구 로직을 포함한다.
- **Data**: `DayLog`, `SpendingEntry`, `FortuneRecord`, `AppMeta`
- **API**: 해당 없음 (로컬 전용)
- **Requirements**
  - `saveDayLog(log: DayLog): void`, `getDayLog(date: string): DayLog | null`, `listDayLogs(fromDate: string, toDate: string): DayLog[]`
  - `saveFortune(f: FortuneRecord): void`, `getFortune(date: string): FortuneRecord | null`
  - `getMeta(): AppMeta`, `patchMeta(p: Partial<AppMeta>): AppMeta`
  - `getStats(endDate: string, days: number): { total: number; dailyAvg: number; byCategory: Record<CategoryId, number>; loggedDays: number }`
  - `pruneStorage(): { removedDayLogs: number; removedFortunes: number }`

**Acceptance Criteria**

- **AC-1 [E][P0]: Scenario: DayLog 저장 및 재조회**
  - Given `localStorage`가 비어 있을 때
  - When `saveDayLog({ date: '2026-09-04', entries: [{ id: 'e1', category: 'food', amount: 12000, memo: '점심', createdAt: 1757000000000 }], noSpend: false, total: 12000, updatedAt: 1757000000000 })` 호출
  - Then `localStorage['sf.daylogs.v1']`가 JSON 객체이며 키 `'2026-09-04'`를 가진다
  - And `getDayLog('2026-09-04')?.total === 12000`

- **AC-2 [U][P0]: The system shall 항상 `DayLog.total`을 `entries`의 `amount` 합계로 재계산하여 저장한다**
  - Given `entries = [{amount: 12000}, {amount: 3000}]`, 호출자가 `total: 999`로 넘겼을 때
  - When `saveDayLog` 호출
  - Then 저장된 `total === 15000`

- **AC-3 [E][P0]: Scenario: 7일 통계 집계**
  - Given `2026-08-29`~`2026-09-04` 중 `food` 30000, `cafe` 10000, `shopping` 60000이 각각 1건씩 기록되어 있고 나머지 4일은 기록 없을 때
  - When `getStats('2026-09-04', 7)` 호출
  - Then `{ total: 100000, dailyAvg: 33333, byCategory.shopping: 60000, loggedDays: 3 }` 반환 (`dailyAvg = Math.round(total / loggedDays)`)

- **AC-4 [S][P1]: Scenario: 90일 초과 DayLog 자동 정리**
  - Given `sf.daylogs.v1`에 91일치 날짜 키가 존재할 때
  - When `saveDayLog`(신규 날짜) 호출
  - Then 가장 오래된 날짜 키가 삭제되어 `Object.keys(...).length === 90`

- **AC-5 [W][P1]: Scenario: localStorage 용량 초과**
  - Given `localStorage.setItem`이 `QuotaExceededError`를 던지는 환경일 때
  - When `saveDayLog` 호출
  - Then `pruneStorage()`로 30일 초과 `sf.fortunes.v1` 항목을 제거한 뒤 1회 재시도한다
  - And 재시도도 실패하면 `{ ok: false, reason: 'QUOTA_EXCEEDED' }`를 반환하고 예외를 밖으로 던지지 않으며 `console.error`를 호출하지 않는다

- **AC-6 [W][P1]: Scenario: 손상된 JSON 복구**
  - Given `localStorage['sf.daylogs.v1'] === '{{broken'` 일 때
  - When `listDayLogs('2026-08-01', '2026-09-04')` 호출
  - Then 빈 배열 `[]`을 반환하고 해당 키를 `'{}'`로 초기화한다
  - And 예외가 상위로 전파되지 않는다

- **AC-7 [W][P1]: Scenario: 잘못된 amount 거부**
  - Given `entries = [{ id: 'e1', category: 'food', amount: 0, memo: '', createdAt: 1 }]`
  - When `saveDayLog` 호출
  - Then `{ ok: false, reason: 'INVALID_AMOUNT' }`를 반환하고 `localStorage`는 변경되지 않는다
  - And `amount: 10_000_001`, `amount: 1.5`, `amount: NaN`도 동일하게 거부된다

- **AC-8 [S][P1]: Scenario: 최초 실행 기본값(빈 상태)**
  - Given `localStorage`에 `sf.meta.v1` 키가 없을 때
  - When `getMeta()` 호출
  - Then `{ version: 1, noticeAckedAt: null, lastOpenDate: null, streakCount: 0, schemaMigratedAt: null }` 반환

---

### F2. 어제 지출 입력 (Input 화면)

- **Description**: 사용자가 어제 하루의 지출을 카테고리 칩 + 금액으로 최대 10건까지 빠르게 입력한다. "어제 무지출이었어요" 원탭 경로를 제공해 입력 마찰을 최소화하고, 저장 즉시 오늘의 운세 산출(F3)을 트리거한 뒤 결과 화면으로 이동한다.
- **Data**: `DayLog`, `SpendingEntry` (F1 API 사용)
- **API**: 해당 없음
- **Requirements**
  - 라우트 `/input`. TDS `Chip`(카테고리 8종), `TextField`(금액·메모), `ListRow`(입력된 항목 목록), `Button`, `Toast`, `AlertDialog`
  - 금액 입력은 `inputMode="numeric"`, 천 단위 콤마 자동 포맷 표시(내부 값은 정수)

**Acceptance Criteria**

- **AC-1 [E][P0]: Scenario: 지출 1건 추가 후 저장**
  - Given `2026-09-05` 접속, `/input` 진입(대상 날짜 `2026-09-04`)
  - When 카테고리 칩 `식비` 선택 후 금액 `12000`, 메모 `점심` 입력하고 "추가" 탭, 이어서 하단 "운세 보기" 탭
  - Then `getDayLog('2026-09-04')`가 `{ total: 12000, noSpend: false, entries.length: 1 }`을 반환
  - And Toast `저장했어요`가 표시됨
  - And `navigate('/result', { state: { date: '2026-09-05' } })`가 호출됨

- **AC-2 [E][P0]: Scenario: 무지출 원탭 저장**
  - Given `/input`에 진입해 입력 항목이 0건일 때
  - When "어제 무지출이었어요" 버튼 탭
  - Then `getDayLog('2026-09-04')`가 `{ total: 0, noSpend: true, entries: [] }`를 반환
  - And `navigate('/result', { state: { date: '2026-09-05' } })`가 호출됨

- **AC-3 [E][P0]: Scenario: 입력 항목 삭제**
  - Given 항목 2건(`식비 12000`, `카페/간식 4500`)이 목록에 있을 때
  - When 두 번째 항목의 삭제 버튼(히트 영역 44×44px) 탭
  - Then 목록에 1건만 남고 상단 합계가 `12,000원`으로 갱신됨

- **AC-4 [W][P1]: Scenario: 빈 금액 거부**
  - Given 카테고리 `식비` 선택 상태
  - When 금액 입력값이 `''`(또는 `0`)인 채로 "추가" 탭
  - Then TextField 하단에 에러 메시지 `금액을 입력해주세요`가 표시되고 항목이 추가되지 않음

- **AC-5 [W][P1]: Scenario: 한도 초과 금액 거부**
  - Given 카테고리 `쇼핑` 선택 상태
  - When 금액 `10000001` 입력 후 "추가" 탭
  - Then 에러 메시지 `1천만원 이하로 입력해주세요`가 표시되고 항목이 추가되지 않음

- **AC-6 [W][P1]: Scenario: 항목 10건 초과 차단**
  - Given 입력 항목이 이미 10건일 때
  - When "추가" 탭
  - Then Toast `하루에 최대 10건까지 기록할 수 있어요`가 표시되고 11번째 항목이 추가되지 않음

- **AC-7 [S][P1]: Scenario: 빈 상태 / 저장 중 상태**
  - Given 입력 항목이 0건일 때
  - Then 목록 영역에 `Asset.ContentIcon` + 문구 `어제 쓴 돈을 하나씩 담아주세요`가 표시되고, 하단 "운세 보기" 버튼은 `disabled` 상태다
  - And 저장 진행 중에는 "운세 보기" 버튼이 `loading` 상태로 바뀌고 중복 탭이 무시된다(저장 호출 1회)

- **AC-8 [E][P1]: Scenario: 모바일 키보드 동작**
  - Given `/input` 화면
  - When 금액 TextField에 포커스가 들어옴
  - Then 해당 필드에 `scrollIntoView({ block: 'center' })`가 호출되고 `inputMode="numeric"`이 지정되어 있음
  - And "추가" 성공 시 입력 필드가 `blur()` 되어 키보드가 닫힘

- **AC-9 [U][P1]: Layout 계약**
  - Given `/input` 화면이 렌더링되었을 때
  - Then 최상위는 `ScreenScaffold`이며, 1차 액션은 `data-testid="submit-footer"`를 가진 `SubmitFooter` 안의 `display="block"` TDS Button이다
  - And 카테고리 칩은 `data-testid="category-chip-{CategoryId}"`로 8개 존재하며 각 칩의 렌더 높이 ≥ 44px

---

### F3. 오늘의 소비운세 산출 엔진 (12유형 + 점수 + 조언)

- **Description**: 어제 지출과 최근 7일 통계를 입력으로 0~100점 소비운 점수, 12유형 캐릭터, 헤드라인/조언/절약팁/행운·주의 카테고리를 **결정론적으로** 산출한다. 같은 날짜·같은 입력이면 항상 같은 결과가 나오며(시드 = 날짜 문자열 해시), 결과는 `FortuneRecord`로 하루 1건 저장되어 재진입 시 재계산하지 않는다.
- **Data**: `DayLog`(읽기), `FortuneRecord`(쓰기), F1 `getStats`
- **API**: 해당 없음. **생성형 AI 미사용** — 고정 문구 테이블 + 규칙 기반.
- **Requirements — 산출 규칙(고정)**
  - `seed = hash32(date)`; `noise = (seed % 21) - 10` → 범위 `-10 ~ +10`
  - `base = 50`
  - `dailyAvg = getStats(basisDate, 7).dailyAvg` (기록일 0일이면 `dailyAvg = yesterdayTotal`)
  - 보정: `yesterdayTotal === 0` → `+30`; `≤ dailyAvg*0.8` → `+20`; `≤ dailyAvg` → `+10`; `≥ dailyAvg*2` → `-30`; `≥ dailyAvg*1.5` → `-20`; 그 외 `0`
  - `score = clamp(base + 보정 + noise, 0, 100)`
  - `scoreBand`: `score ≥ 70` → `high`, `40 ≤ score ≤ 69` → `mid`, `score < 40` → `low`
  - `dominantGroup`: 어제 최대 금액 카테고리 기준 — `food|cafe` → `EAT`, `shopping|culture` → `SHOP`, `living|transport|health` → `LIFE`, `etc` 또는 무지출 → `MISC`
  - `typeId = TYPE_MATRIX[dominantGroup][scoreBand]` (4×3 = 12유형, § Data Models 매핑)
  - `estimatedSaving = Math.max(0, yesterdayTotal - Math.round(dailyAvg * 0.8))`
  - `luckyCategory` = 최근 7일 지출 비중이 가장 낮은 카테고리, `cautionCategory` = 비중 최대 카테고리(무지출일 경우 `null`)

**Acceptance Criteria**

- **AC-1 [E][P0]: Scenario: 운세 결정론적 산출**
  - Given `date = '2026-09-05'`, `basisDate = '2026-09-04'`, 어제 `food 12000` 1건, 최근 7일 `dailyAvg = 20000`
  - When `computeFortune('2026-09-05')`를 2회 호출
  - Then 두 결과의 `score`, `typeId`, `headline`, `advice`가 완전히 동일하다
  - And `score`는 정수이며 `0 ≤ score ≤ 100`

- **AC-2 [E][P0]: Scenario: 무지출 고득점 + 유형 매핑**
  - Given `2026-09-04` `DayLog = { noSpend: true, total: 0 }`
  - When `computeFortune('2026-09-05')` 실행
  - Then `score ≥ 70` (base 50 + 30 + noise ≥ -10)
  - And `typeId === 'zero_spender'` (MISC × high)
  - And `cautionCategory === null`, `estimatedSaving === 0`

- **AC-3 [E][P0]: Scenario: 과소비 저득점 + 유형 매핑**
  - Given 최근 7일 `dailyAvg = 20000`, 어제 `shopping 60000` 1건 (`60000 ≥ 20000*2`)
  - When `computeFortune('2026-09-05')` 실행
  - Then `score ≤ 60` (50 - 30 + noise ≤ 30 … noise 상한 +10 기준 `score ≤ 30`)
  - And `typeId === 'impulse_god'` (SHOP × low)
  - And `estimatedSaving === 44000` (`60000 - round(20000*0.8)`)

- **AC-4 [S][P0]: Scenario: 하루 1회만 산출(캐시)**
  - Given `getFortune('2026-09-05')`가 이미 `FortuneRecord`를 반환하는 상태
  - When `computeFortune('2026-09-05')` 재호출
  - Then 저장된 레코드를 그대로 반환하고 `saveFortune`이 다시 호출되지 않으며 `createdAt`이 변하지 않는다

- **AC-5 [W][P1]: Scenario: 어제 기록 없음**
  - Given `getDayLog('2026-09-04') === null`
  - When `computeFortune('2026-09-05')` 실행
  - Then `{ ok: false, reason: 'NO_BASIS_LOG' }`를 반환하고 `sf.fortunes.v1`에 아무것도 저장하지 않는다

- **AC-6 [W][P1]: Scenario: 통계 계산 0 나눗셈 방지**
  - Given 최근 7일 기록일이 0일이고 어제 `food 12000` 1건만 존재
  - When `computeFortune('2026-09-05')` 실행
  - Then `score`가 `NaN`이 아니며 정수이고, `dailyAvg`는 `12000`으로 대체된다

- **AC-7 [U][P1]: The system shall 12유형 각각에 대해 `name`, `tagline`, `imageSrc`가 모두 비어있지 않은 값을 갖는다**
  - Given `TYPE_TABLE`
  - Then `Object.keys(TYPE_TABLE).length === 12`이며 각 항목의 `imageSrc`는 `/characters/{id}.png` 패턴과 일치한다

- **AC-8 [U][P1]: The system shall `headline` ≤ 40자, `advice` ≤ 80자, `savingTip` ≤ 60자를 항상 만족한다**
  - Given 12유형 × 3 scoreBand 전 조합으로 문구를 생성
  - Then 모든 조합에서 길이 제약을 위반하는 문구가 0건이다

---

### F4. 리워드 광고 게이트 & 결과 화면

- **Description**: 산출된 오늘의 운세는 기본 잠금 상태이며, `TossRewardAd`로 감싼 "운세 확인하기" 게이트를 통과(광고 시청 완료)해야 결과 전문이 공개된다. 공개 상태는 `FortuneRecord.unlocked = true`로 저장되어 같은 날 재진입 시 광고를 다시 보지 않는다. 결과 화면은 점수 히어로, 캐릭터 카드, 조언 카드로 위계를 구성한다.
- **Data**: `FortuneRecord`(읽기/`unlocked` 갱신)
- **API**: 해당 없음. 광고는 템플릿 `<TossRewardAd slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID}>`, 배너는 `<AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID} />`
- **Requirements**
  - 라우트 `/result`. TDS `Top`, `Card`, `Paragraph.Text`, `Button`, `Toast`, `Spacing` + `SummaryHero`

**Acceptance Criteria**

- **AC-1 [E][P0]: Scenario: 결과 보기 전 보상형 광고**
  - Given `getFortune('2026-09-05')`가 `unlocked: false`인 레코드를 반환하는 상태에서 `/result` 진입
  - When 사용자가 `data-testid="unlock-button"`("운세 확인하기") 탭 후 `TossRewardAd` 광고 시청을 완료
  - Then `data-testid="fortune-hero"`(점수), `data-testid="character-card"`, `data-testid="advice-card"`가 화면에 표시됨
  - And `sf.fortunes.v1['2026-09-05'].unlocked === true`로 저장됨

- **AC-2 [S][P0]: Scenario: 잠금 상태 표시**
  - Given `unlocked: false`인 상태
  - Then 점수 값 대신 `data-testid="fortune-lock-card"`가 표시되고 텍스트 `광고를 보면 오늘의 소비운세가 열려요`를 포함한다
  - And `headline`, `advice`, `savingTip`, 캐릭터 이미지는 DOM에 렌더링되지 않는다(가림 처리 아님, 미렌더)

- **AC-3 [S][P0]: Scenario: 같은 날 재진입은 광고 없이 공개**
  - Given `sf.fortunes.v1['2026-09-05'].unlocked === true`
  - When `/result` 재진입
  - Then `TossRewardAd` 게이트가 렌더되지 않고 결과가 즉시 표시됨

- **AC-4 [W][P1]: Scenario: 광고 로드/시청 실패**
  - Given `TossRewardAd`가 실패 콜백을 반환하는 상황
  - When 사용자가 "운세 확인하기" 탭
  - Then Toast `광고를 불러오지 못했어요. 잠시 후 다시 시도해주세요`가 표시되고 `unlocked`는 `false`로 유지됨
  - And 버튼은 다시 탭 가능한 상태로 복귀하며 `console.error`가 호출되지 않음

- **AC-5 [W][P1]: Scenario: 잘못된 진입(state 없음 / 운세 없음)**
  - Given `location.state === null`이고 `getFortune(today) === null`
  - When `/result` 진입
  - Then `Asset.ContentIcon` + 문구 `어제 지출을 먼저 기록해주세요` + `display="block"` 버튼 `지출 기록하러 가기`가 표시됨
  - And 버튼 탭 시 `navigate('/input')` 호출

- **AC-6 [S][P1]: Scenario: 로딩 상태**
  - Given 운세 계산/조회가 진행 중일 때
  - Then `data-testid="result-skeleton"` 스켈레톤이 표시되고, 완료 후 300ms 이내에 실제 콘텐츠로 대체된다

- **AC-7 [U][P0]: Layout 계약 — 결과 화면**
  - Given `unlocked: true` 상태의 `/result`
  - Then 최상위는 `ScreenScaffold`이고, `data-testid="fortune-hero"`는 `SummaryHero`로 `score`를 CountUp 표기하며 `점` 단위를 포함한다
  - And `data-testid="character-card"`와 `data-testid="advice-card"` **TDS Card 2개**가 존재하고, `advice-card` 안에 `estimatedSaving`이 `t2~t3` 강조 타이포로 `12,000원` 형식으로 표기된다
  - And 이미지 `img[alt]`는 유형 `name`과 동일한 문자열이다

- **AC-8 [U][P1]: Scenario: 배너 광고 배치**
  - Given `/result`가 `unlocked: true`로 렌더된 상태
  - Then `<AdSlot />`는 `advice-card` **아래**, 하단 액션 버튼 **위**에 1개만 렌더링되며 결과 카드와 겹치지 않는다(광고 컨테이너와 카드의 `getBoundingClientRect()` 세로 구간이 교차하지 않음)

---

### F5. 지름신 주의보 (과소비 감지)

- **Description**: 최근 7일 지출을 분석해 특정 카테고리 편중(R1)과 하루 지출 급증(R2) 두 규칙으로 경보를 산출한다. 경보는 결과 화면 상단에 배지형 카드로 표시되며, 최대 2건까지 노출한다. 데이터가 부족하면 경보 대신 안내 문구를 보여준다.
- **Data**: `DayLog`(읽기), `FortuneRecord.alerts`(쓰기)
- **API**: 해당 없음
- **Requirements — 규칙(고정)**
  - **R1 CATEGORY_CONCENTRATION**: `loggedDays ≥ 3` 이고 카테고리 `c`의 7일 합계 `≥ 7일 총합 × 0.4` 이고 `≥ 30,000원` → `level: 'caution'`, 문구 `최근 7일 지출의 {NN}%가 {카테고리}에 몰렸어요`
  - **R2 SPIKE**: 어제 총액 `≥ 직전 6일 일평균 × 2` 이고 어제 총액 `≥ 50,000원` → `level: 'danger'`, 문구 `어제 지출이 평소의 {N.N}배예요`
  - 두 규칙 동시 충족 시 `danger`를 배열 첫 번째로 정렬하고 최대 2건 반환
  - `loggedDays < 3` → `alerts: []`

**Acceptance Criteria**

- **AC-1 [E][P0]: Scenario: 카테고리 편중 경보**
  - Given 최근 7일: `shopping 60000`, `food 30000`, `cafe 10000` (총 100,000, loggedDays 3)
  - When `detectAlerts('2026-09-04')` 실행
  - Then `alerts`에 `{ rule: 'CATEGORY_CONCENTRATION', level: 'caution', category: 'shopping', ratio: 0.6 }`가 포함됨
  - And `message === '최근 7일 지출의 60%가 쇼핑에 몰렸어요'`

- **AC-2 [E][P0]: Scenario: 하루 급증 경보**
  - Given 직전 6일 일평균 `20000`, 어제 총액 `60000`
  - When `detectAlerts('2026-09-04')` 실행
  - Then `alerts[0] === { rule: 'SPIKE', level: 'danger', category: null, ratio: 3.0, message: '어제 지출이 평소의 3.0배예요' }`

- **AC-3 [S][P0]: Scenario: 두 규칙 동시 충족 시 정렬 및 개수 제한**
  - Given 편중(R1)과 급증(R2)이 모두 충족되는 데이터
  - When `detectAlerts` 실행
  - Then `alerts.length === 2`이고 `alerts[0].level === 'danger'`

- **AC-4 [W][P1]: Scenario: 임계값 미달 시 경보 없음**
  - Given 최근 7일 `cafe 20000` 1건뿐 (비중 100%지만 금액 `< 30000`, loggedDays 1)
  - When `detectAlerts` 실행
  - Then `alerts === []`

- **AC-5 [W][P1]: Scenario: 기록 0일**
  - Given 최근 7일 `DayLog`가 0건
  - When `detectAlerts` 실행
  - Then `alerts === []`이고 예외가 발생하지 않으며 `0으로 나누기` 결과(`Infinity`/`NaN`)가 포함되지 않는다

- **AC-6 [S][P1]: Scenario: 데이터 부족 안내(빈 상태)**
  - Given `loggedDays < 3`이고 `/result`가 `unlocked: true`
  - Then `data-testid="alert-card"` 대신 `data-testid="alert-empty"`가 표시되고 문구 `3일 이상 기록하면 지름신 주의보를 알려드려요`를 포함한다

- **AC-7 [U][P1]: Layout 계약 — 경보 카드**
  - Given `alerts.length === 2`인 `/result`
  - Then `data-testid="alert-card"` TDS Card 1개 안에 경보 2건이 `ListRow`로 표시되고, `level === 'danger'` 항목에는 텍스트 `경보` 배지, `caution`에는 `주의` 배지가 붙는다
  - And 경보 카드는 `character-card` 위에 배치된다

- **AC-8 [U][P1]: The system shall 경보 문구에 특정 상품/브랜드/외부 앱 설치 유도 표현을 포함하지 않는다**
  - Given 전 규칙 조합으로 생성된 모든 `message`
  - Then `설치`, `다운로드`, `앱스토어`, `가입하기` 문자열이 0건 포함된다

---

### F6. 7일 소비운세 히스토리 (그래프 화면)

- **Description**: 최근 7일의 소비운 점수 추이와 카테고리 비중을 한 화면에서 보여준다. 점수 추이는 Sparkline, 카테고리 비중은 MiniBar로 시각화하고, 날짜별 카드 탭 시 해당 날짜 운세 상세로 이동한다. 기록이 없는 날은 결측으로 처리해 선을 끊지 않고 스킵한다.
- **Data**: `FortuneRecord`(읽기), `DayLog`(읽기), F1 `getStats`
- **API**: 해당 없음
- **Requirements**
  - 라우트 `/history`. TDS `Top`, `Card`, `ListRow`, `Chip`, `Paragraph.Text` + `SummaryHero`, `Sparkline`, `MiniBar`, `Asset.ContentIcon`

**Acceptance Criteria**

- **AC-1 [E][P0]: Scenario: 7일 추이 렌더링**
  - Given 최근 7일 중 5일에 `FortuneRecord`가 존재하고 점수가 `[62, 71, 45, 80, 55]`일 때
  - When `/history` 진입
  - Then `data-testid="history-sparkline"`이 데이터 포인트 5개로 렌더되고
  - And `data-testid="history-avg-hero"`가 `SummaryHero`로 평균 점수 `63`을 CountUp 표기한다 (`Math.round((62+71+45+80+55)/5)`)

- **AC-2 [E][P0]: Scenario: 카테고리 비중 시각화**
  - Given 최근 7일 `byCategory = { shopping: 60000, food: 30000, cafe: 10000, 나머지 0 }`
  - When `/history` 진입
  - Then `data-testid="category-minibar"` 내부에 비중 0이 아닌 카테고리 3개만 `MiniBar` 행으로 표시되고, `쇼핑 60%`, `식비 30%`, `카페/간식 10%` 텍스트를 포함한다

- **AC-3 [E][P0]: Scenario: 날짜 카드 탭 → 상세 이동**
  - Given `/history`에 `2026-09-03` 항목이 표시되어 있을 때
  - When 해당 `ListRow`(히트 영역 ≥ 44px) 탭
  - Then `navigate('/result', { state: { date: '2026-09-03' } })`가 호출됨

- **AC-4 [S][P1]: Scenario: 빈 상태**
  - Given 최근 7일 `FortuneRecord`가 0건
  - Then `Asset.ContentIcon` + 문구 `아직 기록된 소비운세가 없어요` + `display="block"` 버튼 `지출 기록하러 가기`가 표시되고 `history-sparkline`은 렌더되지 않는다

- **AC-5 [S][P1]: Scenario: 로딩 상태**
  - Given 데이터 로드 중
  - Then `data-testid="history-skeleton"`이 표시되고, 로드 완료 시 스켈레톤이 DOM에서 제거된다

- **AC-6 [W][P1]: Scenario: 결측일 처리**
  - Given 최근 7일 중 2일만 기록이 있을 때
  - When `/history` 진입
  - Then Sparkline 데이터 포인트가 2개이고, 값에 `null`/`NaN`/`0` 대체값이 삽입되지 않는다
  - And 평균 계산 분모는 `2`이다

- **AC-7 [W][P1]: Scenario: 손상 레코드 무시**
  - Given `sf.fortunes.v1['2026-09-02'] = { date: '2026-09-02', score: 'abc' }` (스키마 위반)
  - When `/history` 진입
  - Then 해당 항목은 목록/그래프에서 제외되고 나머지 항목은 정상 렌더되며 화면이 크래시하지 않는다

- **AC-8 [U][P1]: Layout 계약 + 광고 배치**
  - Given `/history`가 데이터 있는 상태로 렌더됨
  - Then 최상위는 `ScreenScaffold`이고 `data-testid="history-card"` TDS Card 2개(추이 카드 / 비중 카드)가 존재한다
  - And `<AdSlot />`는 비중 카드 아래 1개만 렌더되며 `FloatingTabBar` 영역과 겹치지 않는다(광고 하단 좌표 ≤ 탭바 상단 좌표)

---

### F7. 결과 공유 카드

- **Description**: 오늘의 운세 결과를 캡처하기 좋은 세로형 카드 UI로 렌더링하고, 요약 텍스트를 클립보드에 복사할 수 있게 한다. 외부 SNS SDK나 외부 도메인 이동 없이 앱 내부에서만 동작한다.
- **Data**: `FortuneRecord`(읽기)
- **API**: 해당 없음. 클립보드는 `navigator.clipboard.writeText` (iOS 16+ 지원)
- **Requirements**
  - 라우트 `/share`. TDS `Card`, `Paragraph.Text`, `Button`, `Toast`, `Top`

**Acceptance Criteria**

- **AC-1 [E][P0]: Scenario: 공유 카드 진입 및 렌더**
  - Given `/result`에서 `unlocked: true`, `date = '2026-09-05'`, `typeId = 'zero_spender'`, `score = 82`
  - When "공유 카드 만들기" 버튼 탭
  - Then `navigate('/share', { state: { date: '2026-09-05' } })`가 호출되고
  - And `/share`에 `data-testid="share-card"`가 렌더되며 유형명 `무지출 챌린저`, `82점`, `headline` 문자열을 포함한다

- **AC-2 [E][P0]: Scenario: 텍스트 복사**
  - Given `/share` 화면
  - When `data-testid="copy-button"` 탭
  - Then `navigator.clipboard.writeText`가 `오늘의 소비운세 82점 · 무지출 챌린저\n{headline}` 형식 문자열로 1회 호출됨
  - And Toast `복사했어요`가 표시됨

- **AC-3 [W][P1]: Scenario: 클립보드 미지원 환경**
  - Given `navigator.clipboard === undefined` 이거나 `writeText`가 reject
  - When 복사 버튼 탭
  - Then Toast `복사를 지원하지 않는 환경이에요. 카드를 길게 눌러 저장해주세요`가 표시되고 `console.error`가 호출되지 않음

- **AC-4 [W][P0]: Scenario: 외부 도메인 이탈 금지**
  - Given `/share` 화면의 모든 버튼/링크
  - When 각 요소를 탭
  - Then `window.open` 및 `window.location.href` 할당이 0회 발생하며, `<a>` 태그의 `href`는 존재하지 않거나 `/`로 시작하는 내부 경로만 갖는다

- **AC-5 [W][P1]: Scenario: 잘못된 진입**
  - Given `location.state === null` 또는 `getFortune(state.date) === null`
  - When `/share` 진입
  - Then `Asset.ContentIcon` + 문구 `공유할 운세가 없어요` + 버튼 `오늘의 운세 보기`가 표시되고, 버튼 탭 시 `navigate('/')` 호출

- **AC-6 [S][P1]: Scenario: 잠금 상태 공유 차단**
  - Given `getFortune('2026-09-05').unlocked === false`
  - When `/share`에 `state: { date: '2026-09-05' }`로 진입
  - Then 카드 대신 문구 `운세를 먼저 확인해주세요`와 버튼 `운세 확인하러 가기`가 표시되고, `headline`/`advice` 텍스트가 DOM에 렌더되지 않는다

- **AC-7 [U][P1]: Layout 계약**
  - Given `/share`가 정상 렌더된 상태
  - Then `data-testid="share-card"`는 TDS `Card` 1개이며 가로:세로 비율이 `3:4`(허용 오차 ±0.05)로 고정된다
  - And 복사 버튼은 `SubmitFooter` 내 `display="block"` TDS Button이며 히트 영역 ≥ 44px

- **AC-8 [U][P1]: The system shall 공유 카드에 HEX 색상 하드코딩을 사용하지 않는다**
  - Given `/share` 관련 소스 파일(`.tsx`, `.css`)
  - Then 정규식 `#[0-9a-fA-F]{3,8}\b` 매치가 0건이고, 색상 지정은 `var(--tds-color-*)` 또는 TDS 컴포넌트 prop만 사용한다

---

### F8. 홈(오늘) 화면 · 스트릭 · 정책 고지 · 검수 준수

- **Description**: 앱 진입점인 오늘 화면에서 어제 기록 여부에 따라 "기록하기" 또는 "운세 보기" 단일 CTA를 제시하고, 연속 기록 스트릭을 표시한다. 첫 이용 시 콘텐츠 생성 방식 고지 다이얼로그를 1회 노출하고 확인 플래그를 저장하며, 설정 화면에서 데이터 초기화와 고지 재열람을 제공한다. 검수 정책(외부 이탈/외부 로깅/설치 유도/콘솔 에러/다크모드) 준수 검증도 이 패킷 범위에 포함한다.
- **Data**: `AppMeta`, `DayLog`, `FortuneRecord`
- **API**: 해당 없음
- **Requirements**
  - 라우트 `/`(홈), `/settings`. `FloatingTabBar` 탭 3개: `오늘(/)`, `히스토리(/history)`, `설정(/settings)`
  - TDS `Top`, `Card`, `ListRow`, `Button`, `AlertDialog`, `Switch`(설정), `Toast` + `SummaryHero`

**Acceptance Criteria**

- **AC-1 [E][P0]: Scenario: 첫 이용 콘텐츠 고지 1회 노출**
  - Given `getMeta().noticeAckedAt === null`
  - When 앱을 열어 `/`에 진입
  - Then `AlertDialog`가 1회 표시되고 본문에 `이 서비스의 소비운세는 입력하신 지출 데이터를 바탕으로 생성된 재미용 콘텐츠이며, 투자·금융 자문이 아닙니다` 문구를 포함한다
  - And 확인 버튼 탭 시 `sf.meta.v1.noticeAckedAt`에 epoch ms가 저장되고, 앱을 다시 열어도 다이얼로그가 재노출되지 않는다

- **AC-2 [U][P0]: Scenario: 결과 화면 상시 고지 배지**
  - Given `/result`가 `unlocked: true`로 표시될 때
  - Then `data-testid="content-notice-badge"`가 렌더되고 텍스트 `재미로 보는 콘텐츠예요`를 포함한다

- **AC-3 [E][P0]: Scenario: 홈 CTA 분기**
  - Given 오늘이 `2026-09-05`이고 `getDayLog('2026-09-04') === null`
  - When `/` 진입
  - Then `data-testid="home-cta"` 버튼 라벨이 `어제 지출 기록하기`이고 탭 시 `navigate('/input')` 호출
  - And `getDayLog('2026-09-04') !== null`인 경우 라벨은 `오늘의 운세 보기`이며 탭 시 `navigate('/result', { state: { date: '2026-09-05' } })` 호출

- **AC-4 [E][P1]: Scenario: 스트릭 계산**
  - Given `sf.daylogs.v1`에 `2026-09-02`, `2026-09-03`, `2026-09-04` 3일 연속 기록이 있을 때
  - When `/` 진입
  - Then `data-testid="streak-badge"`에 `3일 연속 기록 중`이 표시되고 `sf.meta.v1.streakCount === 3`
  - And `2026-09-03`이 비어 있으면 `streakCount === 1`

- **AC-5 [S][P1]: Scenario: 홈 빈 상태 / 로딩 상태**
  - Given `sf.daylogs.v1`이 비어 있을 때
  - Then `Asset.ContentIcon` + 문구 `첫 기록을 남기면 내일부터 소비운세가 열려요`가 표시되고 스트릭 배지는 렌더되지 않는다
  - And 초기 데이터 로드 중에는 `data-testid="home-skeleton"`이 표시된다

- **AC-6 [E][P1]: Scenario: 데이터 초기화**
  - Given `/settings`에서 `전체 기록 삭제` `ListRow` 탭
  - When `AlertDialog`에서 `삭제` 확인
  - Then `sf.daylogs.v1`, `sf.fortunes.v1`이 제거되고 `sf.meta.v1.streakCount === 0`이 되며 Toast `기록을 모두 삭제했어요`가 표시됨
  - And `취소` 탭 시 어떤 키도 삭제되지 않는다

- **AC-7 [W][P0]: Scenario: 검수 정책 정적 검증**
  - Given `src/**/*.{ts,tsx,css}` 전체 소스
  - Then `window.open(`, `window.location.href =` 매치 0건
  - And `google-analytics`, `gtag`, `amplitude`, `mixpanel`, `sentry` 문자열 매치 0건
  - And `앱을 설치`, `다운로드`, `앱스토어`, `플레이스토어` 문자열 매치 0건
  - And 정규식 `#[0-9a-fA-F]{3,8}\b` 매치 0건 (TDS 색상 변수만 사용 → 다크모드 자동 대응)

- **AC-8 [U][P0]: Scenario: 프로덕션 콘솔 에러 0건 & 호환성**
  - Given `vite build && vite preview`로 구동한 프로덕션 빌드에서 `/` → `/input` → `/result` → `/history` → `/share` → `/settings` 순으로 이동
  - Then `console.error` 호출 0건, 미처리 Promise rejection 0건
  - And 번들 소스에 `Object.groupBy`, `Array.prototype.at(`, `structuredClone(` 사용 0건 (Android 7 / iOS 16 호환)

- **AC-9 [U][P1]: Scenario: 프로모션 리워드 한도 (사용 시)**
  - Given `grantPromotionReward`를 호출하는 코드가 존재할 때
  - When 호출 인자를 검사
  - Then `amount ≤ 5000`을 만족하며, `amount > 5000`인 호출은 실행 전 차단되어 Toast `지급 한도를 초과했어요`가 표시된다
  - And MVP 기본 설정에서는 `grantPromotionReward` 호출부가 존재하지 않아도 이 AC를 통과한다(호출 0건이면 vacuously true)

---

## Screen Definitions

### S1. 홈 / 오늘 — `/`
- **TDS 컴포넌트**: `Top`(타이틀 `오늘의 소비운세`), `Card`, `ListRow`, TDS `Button`(`display="block"`), `AlertDialog`(첫 고지), `Toast`, `Spacing` + `SummaryHero`(어제 총 지출 CountUp), `Asset.ContentIcon`, `FloatingTabBar`
- **Layout 계약**: `ScreenScaffold` 최상위. 상단 `streak-badge` → `SummaryHero`(어제 총 지출, `data-testid="home-summary-hero"`) → 상태 카드(`home-cta` 포함 Card) → `<AdSlot />` → `FloatingTabBar`. 광고는 카드 아래, 탭바 위 `Spacing size={16}` 간격.
- **상태**: 로딩 `home-skeleton` / 빈 상태 `Asset.ContentIcon` + `첫 기록을 남기면 내일부터 소비운세가 열려요` / 에러(스토리지 손상) → Toast `기록을 불러오지 못해 초기화했어요`
- **터치**: `home-cta` 높이 56px, `FloatingTabBar` 각 탭 히트 영역 ≥ 44×44px
- **Navigation state 계약**
  - Incoming: `location.state = null` (진입점)
  - Outgoing: `home-cta` → `navigate('/input')` **또는** `navigate('/result', { state: { date: string /* YYYY-MM-DD, 오늘 */ } })`
  - Outgoing: 탭바 → `navigate('/history')`, `navigate('/settings')` (state 없음)

### S2. 지출 입력 — `/input`
- **TDS 컴포넌트**: `Top`(`어제 지출 기록`), `Chip`(카테고리 8종), `TextField`(금액 `inputMode="numeric"`, 메모 `maxLength=30`), `ListRow`(입력 항목), TDS `Button`, `Toast`, `Spacing`, `Asset.ContentIcon`
- **Layout 계약**: `ScreenScaffold` + 하단 `SubmitFooter`(`data-testid="submit-footer"`) 안에 `display="block"` 버튼 `운세 보기`. 카테고리 칩은 `display:flex; flex-wrap:wrap` 커스텀 컨테이너만 허용(칩 자체 여백 덮어쓰기 금지). 입력 항목은 `Card` 1개 안의 `ListRow` 목록.
- **상태**: 로딩 없음(즉시 렌더) / 빈 상태 `어제 쓴 돈을 하나씩 담아주세요` + 보조 버튼 `어제 무지출이었어요` / 에러: 필드 인라인 에러(`금액을 입력해주세요`, `1천만원 이하로 입력해주세요`), 저장 실패 Toast `저장하지 못했어요. 다시 시도해주세요`
- **터치/키보드**: 칩 높이 ≥ 44px, 삭제 버튼 44×44px. 포커스 시 `scrollIntoView({ block: 'center' })`, 추가 성공 시 `blur()`, `SubmitFooter`는 키보드가 올라오면 키보드 위에 고정.
- **스크롤**: 입력 항목 최대 10건 → 가상 스크롤 불필요. 페이지 세로 스크롤만 사용.
- **Navigation state 계약**
  - Incoming: `location.state = null`
  - Outgoing: `navigate('/result', { state: { date: string /* 오늘 YYYY-MM-DD */ } })`

### S3. 운세 결과 — `/result`
- **TDS 컴포넌트**: `Top`(뒤로가기), `Card`×3(`alert-card`, `character-card`, `advice-card`), `Paragraph.Text`, `Chip`(행운/주의 카테고리), TDS `Button`, `Toast`, `Spacing` + `SummaryHero`(점수 CountUp), `TossRewardAd`, `AdSlot`, `Asset.ContentIcon`
- **Layout 계약**: `ScreenScaffold` 최상위. 순서 = `content-notice-badge` → `fortune-hero`(SummaryHero, `{score}점`) → `alert-card`(또는 `alert-empty`) → `character-card`(이미지 320×320, 유형명 t2, tagline) → `advice-card`(headline t3 강조, advice, savingTip, `estimatedSaving` 강조 타이포 + `절약 가능` 배지) → `<AdSlot />` → `SubmitFooter`(`공유 카드 만들기`). 잠금 시에는 `fortune-lock-card` 1개 + `unlock-button`만 렌더.
- **상태**: 로딩 `result-skeleton` / 잠금 `fortune-lock-card` / 빈 상태 `어제 지출을 먼저 기록해주세요` + `지출 기록하러 가기` / 에러 Toast `광고를 불러오지 못했어요. 잠시 후 다시 시도해주세요`
- **터치**: `unlock-button` 높이 56px, 공유 버튼 56px
- **Navigation state 계약**
  - Incoming: `location.state = { date: string } | null` — `null`이면 오늘 날짜로 폴백
  - Outgoing: `navigate('/share', { state: { date: string } })`, 빈 상태 버튼 → `navigate('/input')`

### S4. 히스토리 — `/history`
- **TDS 컴포넌트**: `Top`(`7일 소비운세`), `Card`×2(`history-card`), `ListRow`(날짜별 항목), `Paragraph.Text`, `Chip`, `Spacing` + `SummaryHero`(`history-avg-hero`), `Sparkline`(`history-sparkline`), `MiniBar`(`category-minibar`), `Asset.ContentIcon`, `AdSlot`, `FloatingTabBar`
- **Layout 계약**: `ScreenScaffold` 최상위. `history-avg-hero` → 추이 Card(`Sparkline` + 날짜별 `ListRow` 목록) → 비중 Card(`MiniBar` 행) → `<AdSlot />` → `FloatingTabBar`.
- **상태**: 로딩 `history-skeleton` / 빈 상태 `아직 기록된 소비운세가 없어요` + `지출 기록하러 가기` / 에러(손상 레코드) → 해당 항목만 제외하고 렌더, 사용자 노출 에러 없음
- **스크롤**: 목록은 최대 7건 고정. `/history` 하단 "전체 내역 더 보기" 확장 시 20건 단위 점진 렌더(최대 90건).
- **터치**: 날짜 `ListRow` 높이 ≥ 56px
- **Navigation state 계약**
  - Incoming: `location.state = null`
  - Outgoing: `navigate('/result', { state: { date: string } })`, 빈 상태 버튼 → `navigate('/input')`

### S5. 공유 카드 — `/share`
- **TDS 컴포넌트**: `Top`(닫기), `Card`(`share-card`, 3:4 비율), `Paragraph.Text`, TDS `Button`(`copy-button`), `Toast`, `Spacing`, `Asset.ContentIcon`
- **Layout 계약**: `ScreenScaffold` + `SubmitFooter`(`display="block"` `요약 텍스트 복사`). 카드 내부는 유형 이미지 → 유형명(t2) → `{score}점`(t1 강조) → headline → 날짜 순.
- **상태**: 로딩 없음 / 빈 상태 `공유할 운세가 없어요` + `오늘의 운세 보기` / 잠금 상태 `운세를 먼저 확인해주세요` / 에러 Toast `복사를 지원하지 않는 환경이에요. 카드를 길게 눌러 저장해주세요`
- **터치**: 복사 버튼 56px, 닫기 버튼 44×44px
- **Navigation state 계약**
  - Incoming: `location.state = { date: string } | null`
  - Outgoing: `navigate(-1)`(닫기), `navigate('/')`(빈 상태), `navigate('/result', { state: { date: string } })`(잠금 상태)

### S6. 설정 — `/settings`
- **TDS 컴포넌트**: `Top`(`설정`), `ListRow`(고지 다시 보기 / 전체 기록 삭제 / 버전), `Switch`(`히스토리 그래프 표시`), `AlertDialog`, `Toast`, `Spacing`, `FloatingTabBar`
- **Layout 계약**: `ScreenScaffold` 최상위, `ListRow` 목록만 사용(`padding` prop 없음 — 간격은 `Spacing`으로).
- **상태**: 로딩 없음 / 빈 상태 없음(항상 고정 항목) / 에러 Toast `삭제하지 못했어요`
- **터치**: 각 `ListRow` 높이 ≥ 56px, `Switch` 히트 영역 ≥ 44px
- **Navigation state 계약**
  - Incoming: `location.state = null`
  - Outgoing: 없음(다이얼로그로만 동작). 탭바 → `navigate('/')`, `navigate('/history')`

---

## API Contract

**외부 API 호출 없음.** 모든 데이터는 사용자의 기기 `localStorage`에만 저장되며, 네트워크 요청은 토스 SDK(광고 표시)만 수행한다.

- 따라서 CORS 설정이 필요한 외부 도메인 호출은 **0건**이며, 검수 항목 "CORS 에러 0개"는 `fetch(` / `XMLHttpRequest` / `axios` 사용 0건으로 정적 검증한다.
- 외부 분석/로깅 엔드포인트 호출도 0건이다(§C6).
- 향후 서버가 필요해질 경우(계정 간 동기화 등)에만 별도 Railway API 서버를 설계하며, 그때의 에러 응답은 통일 형태 `{ error: string }`을 사용한다. **MVP 범위 밖.**

```ts
// 향후 확장 시 규약(현재 미구현)
type ApiError = { error: string };
```

---

## Assumptions

1. **A1** — 토스 앱이 사용자 세션을 자동 제공하므로 로그인 UI/함수는 구현하지 않는다. 사용자 식별이 필요해지면 `getIsTossLoginIntegratedService()`로 연동 여부만 확인한다.
2. **A2** — 지출 데이터는 전액 수동 입력이다. 토스 본체 가계부/계좌 데이터 연동은 브리프에 없으므로 범위 밖이다.
3. **A3** — 운세 텍스트/이미지는 **생성형 AI가 아닌 고정 문구 테이블 + 규칙 기반**으로 생성한다(서버·LLM API 없음). 따라서 AI 고지 의무는 비해당이며, 대신 콘텐츠 성격 고지(§F8 AC-1, AC-2)를 수행한다.
4. **A4** — 캐릭터 이미지 12종은 `public/characters/{typeId}.png`(320×320, 각 ≤40KB, 총 ≤480KB)로 정적 번들에 포함한다. 라이선스 문제 없는 자체 제작 에셋을 전제한다.
5. **A5** — 광고 ID(`VITE_TOSS_AD_GROUP_ID`, `VITE_TOSS_AD_SLOT_ID`)는 앱인토스 콘솔에서 발급받아 env로 주입하며 재빌드 없이 교체 가능하다.
6. **A6** — 수익 모델은 광고 전용(리워드 + 배너). IAP(`TossPurchase`)는 MVP에서 사용하지 않는다.
7. **A7** — 기기 시간대는 `Asia/Seoul`로 가정한다. 사용자가 기기 시간을 변경해 같은 날짜에 재진입하면 캐시된 `FortuneRecord`가 그대로 반환된다(재계산 없음).
8. **A8** — 데이터는 기기 로컬에만 존재하므로 앱 삭제/브라우저 스토리지 초기화 시 복구 불가하며, 이를 설정 화면에 문구로 명시한다.
9. **A9** — "이미지"는 정적 캐릭터 일러스트를 의미하며 동적 이미지 생성은 없다.

---

## Open Questions

1. **Q1** — 리워드 광고 게이트를 **하루 1회**로 제한할지, 히스토리 상세(과거 날짜) 열람 시에도 매번 요구할지? (현 스펙: 날짜별 `unlocked` 플래그 → 날짜당 1회. MRR 가정과 맞는지 검증 필요)
2. **Q2** — 지출을 기록하지 않은 날에도 "기본 운세"를 제공할지? (현 스펙: `NO_BASIS_LOG`로 운세 미제공 → 기록 유인 강화. 이탈률 리스크 있음)
3. **Q3** — 향후 운세 문구를 생성형 AI로 전환할 경우, 서버(Railway) 도입 + AI 사전 고지/결과물 라벨 AC 2종 추가가 필요하다. 전환 여부와 시점은?
4. **Q4** — 프로모션 리워드(`grantPromotionReward`, 최대 5,000원) 캠페인을 MVP에 포함할지? 포함 시 지급 조건(예: 7일 연속 기록)과 promotionCode 발급이 필요하다.
5. **Q5** — 공유 카드의 이미지 저장/공유를 위해 토스 프레임워크의 네이티브 공유 API를 사용할 수 있는지? (현 스펙: 클립보드 텍스트 복사 + 수동 캡처로 한정)
6. **Q6** — 12유형 캐릭터 이미지 제작 리소스(디자이너/에셋) 확보 경로는? 미확보 시 TDS `Asset.ContentIcon` 조합으로 대체하는 폴백이 필요하다.

---

## Feature → Work Packet 매핑 (참고)

| Feature | 예상 패킷 수 | 비고 |
|---|---|---|
| F1 데이터 레이어 | 2 | 저장/검증 · 통계·정리 |
| F2 지출 입력 UI | 2 | 폼·칩 입력 · 목록/저장 연동 |
| F3 운세 산출 엔진 | 2 | 점수·유형 매트릭스 · 문구 테이블 |
| F4 리워드 게이트/결과 화면 | 2 | 게이트 로직 · 결과 레이아웃 |
| F5 지름신 주의보 | 1 | 규칙 + 카드 |
| F6 히스토리 그래프 | 2 | 집계·Sparkline · MiniBar/목록 |
| F7 공유 카드 | 1 | 카드 + 복사 |
| F8 홈/설정/검수 | 2 | 홈·스트릭·고지 · 설정/정책 검증 |
| **합계** | **14 패킷** | (MIN 4 충족) |