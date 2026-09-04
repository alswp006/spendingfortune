# Shared Context (auto-generated — do NOT modify)


## 패킷 간 계약 (src/lib/contract.ts — 자동 생성, 수정 금지)
여기 선언된 이름·인자·반환 타입은 확정이다. 기반 패킷은 이대로 구현하고,
화면 패킷은 이대로 호출하라. 다르게 만들지 마라.

```typescript
/**
 * 패킷 간 인터페이스 계약 — 자동 생성. **수정하지 마라.**
 *
 * 기반 패킷은 여기 선언된 모양 그대로 구현하고, 화면 패킷은 여기 적힌 이름·인자·반환
 * 타입을 그대로 가정해도 된다. 추측이 어긋나 병합에서 무너지는 것을 막기 위한 파일이다.
 */

/** 앱 라우팅 상태 리터럴 유니온 (구현: 패킷 0001) */
export type RouteState = '/' | '/input' | '/result' | '/history' | '/share' | '/settings';

/** 운세 레코드 (저장·조회·표시 경계) (구현: 패킷 0001) */
export type Fortune = { id: string; date: string; categoryId: string; amountKrw: number; score: number; fortuType: string; memo?: string; createdAt: string };

/** 운세 3분류 (구현: 패킷 0001) */
export type FortuneType = 'rich' | 'ruin' | 'neutral';

/** 지출 카테고리 정의 (구현: 패킷 0001) */
export type Category = { id: string; name: string; icon: string };

/** 지름신 주의보 (구현: 패킷 0001) */
export type Alert = { id: string; type: string; level: 'info' | 'warn' | 'error'; message: string; timestamp: string };

/** 입력 검증 오류 클래스 (구현: 패킷 0001) */
export class ValidationError extends Error {
  constructor(field: string, reason: string) {
    super(`${field}: ${reason}`);
    this.name = 'ValidationError';
  }
}

/** 오늘 날짜 ISO string (KST) (구현: 패킷 0002) */
export type todayKSTFn = () => string;

/** 날짜 더하기 (구현: 패킷 0002) */
export type addDaysFn = (dateStr: string, days: number) => string;

/** N일 이내 여부 (구현: 패킷 0002) */
export type isWithinDaysFn = (dateStr: string, days: number) => boolean;

/** 표시용 날짜 포맷 (구현: 패킷 0002) */
export type formatDateFn = (dateStr: string, format?: 'date' | 'datetime') => string;

/** 운세별 캐릭터 이미지 (구현: 패킷 0003) */
export type getCharacterImageFn = (fortuType: FortuneType, date: string) => { url: string; alt: string };

/** 운세별 고정 문구 (구현: 패킷 0003) */
export type getFortuneMessageFn = (fortuType: FortuneType, categoryId: string) => string;

/** 운세 저장 (검증 포함, 실패 시 ValidationError) (구현: 패킷 0004) */
export type saveFortuneFn = (fortune: Omit<Fortune, 'id' | 'createdAt'>) => Fortune;

/** 운세 단건 조회 (구현: 패킷 0004) */
export type loadFortuneFn = (id: string) => Fortune | null;

/** 범위 조회 (최신순 정렬) (구현: 패킷 0004) */
export type getAllFortunesFn = (opts?: { startDate?: string; endDate?: string }) => Fortune[];

/** 보존 정책 정리 (매일 실행) (구현: 패킷 0005) */
export type pruneFortunesFn = () => Promise<{ removedCount: number }>;

/** 통계 집계 (순수 함수) (구현: 패킷 0006) */
export type getStatsFn = (fortunes: Fortune[]) => { totalAmount: number; avgAmount: number; countByType: Record<FortuneType, number> };

/** 운세 종합 계산 (엔진 + 주의보) (구현: 패킷 0009) */
export type computeFortuneFn = (categoryId: string, amountKrw: number, date?: string) => { score: number; type: FortuneType; alerts: Alert[] };

/** 앱 전역 상태 훅 (구현: 패킷 0010) */
export type useAppDataFn = () => { today: string; fortunes: Fortune[]; stats: { totalAmount: number; avgAmount: number; countByType: Record<FortuneType, number> }; addFortune: (cat: string, amt: number, memo?: string) => Promise<void>; isLoading: boolean; error: Error | null };

/** 광고 정책 고지 훅 (구현: 패킷 0019) */
export type useContentNoticeFn = () => { isOpen: boolean; content: string; acknowledge: () => void };

```

## Shared Types Contract (IMPORT these, do NOT redefine)
```typescript
// Domain types — SpendingFortune (SPEC Data Models)

// ---- CategoryId ----
export type CategoryId =
  | 'food'
  | 'cafe'
  | 'shopping'
  | 'transport'
  | 'culture'
  | 'health'
  | 'living'
  | 'etc';

export const CATEGORY_LABEL: Record<CategoryId, string> = {
  food: '식비',
  cafe: '카페/간식',
  shopping: '쇼핑',
  transport: '교통',
  culture: '문화/여가',
  health: '건강/의료',
  living: '생활/구독',
  etc: '기타',
};

// ---- SpendingEntry / DayLog ----
export interface SpendingEntry {
  id: string;
  category: CategoryId;
  amount: number;
  memo: string;
  createdAt: number;
}

export interface DayLog {
  date: string;
  entries: SpendingEntry[];
  noSpend: boolean;
  total: number;
  updatedAt: number;
}

// ---- FortuneTypeId (12종) ----
export type FortuneTypeId =
  | 'gourmet_saver'
  | 'cafe_addict'
  | 'delivery_lord'
  | 'smart_shopper'
  | 'wishlister'
  | 'impulse_god'
  | 'planner_cpa'
  | 'balance_master'
  | 'subscription_hell'
  | 'zero_spender'
  | 'dust_collector'
  | 'flexer';

export interface FortuneType {
  id: FortuneTypeId;
  name: string;
  tagline: string;
  imageSrc: string;
}

// ---- Alerts ----
export type AlertLevel = 'caution' | 'danger';
export type AlertRule = 'CATEGORY_CONCENTRATION' | 'SPIKE';

export interface AlertItem {
  rule: AlertRule;
  level: AlertLevel;
  category: CategoryId | null;
  message: string;
  ratio: number;
}

// ---- FortuneRecord ----
export interface FortuneRecord {
  date: string;
  basisDate: string;
  score: number;
  typeId: FortuneTypeId;
  headline: string;
  advice: string;
  savingTip: string;
  luckyCategory: CategoryId;
  cautionCategory: CategoryId | null;
  estimatedSaving: number;
  alerts: AlertItem[];
  yesterdayTotal: number;
  unlocked: boolean;
  createdAt: number;
}

// ---- AppMeta ----
export interface AppMeta {
  version: 1;
  noticeAckedAt: number | null;
  lastOpenDate: string | null;
  streakCount: number;
  schemaMigratedAt: number | null;
}

export const DEFAULT_META: AppMeta = {
  version: 1,
  noticeAckedAt: null,
  lastOpenDate: null,
  streakCount: 0,
  schemaMigratedAt: null,
};

// ---- localStorage keys ----
export const STORAGE_KEYS = {
  dayLogs: 'sf.daylogs.v1',
  fortunes: 'sf.fortunes.v1',
  meta: 'sf.meta.v1',
} as const;

// ---- Result ----
export type Result<T> = { ok: true; value: T } | { ok: false; reason: string };

// ---- RouteState (per-path navigate state shape) ----
export interface RouteState {
  '/': undefined;
  '/input': undefined;
  '/result': { date: string } | null;
  '/history': undefined;
  '/share': { date: string } | null;
  '/settings': undefined;
}

// Runtime marker so consumers can `import { RouteState }` for typeof-checks
// even though the shape above is purely a type (interfaces have no runtime form).
export const RouteState = {} as const;

```

## Existing Codebase (import and use these — do NOT recreate)
### File Tree (src/)
  App.tsx
  components/
    AdSlot.tsx
    Amount.tsx
    BottomCTA.tsx
    Card.tsx
    CountUp.tsx
    FloatingTabBar.tsx
    MiniBar.tsx
    PageShell.tsx
    ScreenScaffold.tsx
    Sparkline.tsx
    StateView.tsx
    SummaryHero.tsx
    TossPurchase.tsx
    TossRewardAd.tsx
  hooks/
  lib/
    __tests__/
    contract.ts
    date.ts
    storage.ts
    types.ts
    utils.ts
  main.tsx
  pages/
    Home.tsx
    __TdsGallery.tsx
  styles/
    globals.css
    reward-ad.css
  types/
  vite-env.d.ts

### Exports (src/lib/)
- contract.ts: export type RouteState = '/' | '/input' | '/result' | '/history' | '/share' | '/settings'; export type Fortune =; export type FortuneType = 'rich' | 'ruin' | 'neutral'; export type Category =; export type Alert =; export class ValidationError extends Error; export type todayKSTFn = () => string; export type addDaysFn = (dateStr: string, days: number) => string
- date.ts: export function todayKST(now?: Date): string; export function addDays(date: string, delta: number): string; export function formatDate(date: string): string; export function isWithinDays(date: string, days: number): boolean; export function isValidDateKey(date: string): boolean
- storage.ts: export function getItem<T>(key: string): T | null; export function setItem<T>(key: string, value: T): void; export function removeItem(key: string): void
- types.ts: export type CategoryId = | 'food' | 'cafe' | 'shopping' | 'transport' | 'culture' | 'health' | 'living' | 'etc'; export const CATEGORY_LABEL: Record<CategoryId, string> =; export interface SpendingEntry; export interface DayLog; export type FortuneTypeId = | 'gourmet_saver' | 'cafe_addict' | 'delivery_lord' | 'smart_shopper' | 'wishlister' | 'impu; export interface FortuneType; export type AlertLevel = 'caution' | 'danger'; export type AlertRule = 'CATEGORY_CONCENTRATION' | 'SPIKE'
- utils.ts: export function cn(...classes: (string | boolean | undefined | null)[]): string; export function formatNumber(n: number): string; export function formatCurrency(n: number, currency = 'KRW'): string

### Components (src/components/)
- AdSlot.tsx: AdSlot
- Amount.tsx: Amount
- BottomCTA.tsx: SubmitFooter, ButtonStack
- Card.tsx: Card
- CountUp.tsx: CountUp
- FloatingTabBar.tsx: FloatingTabBar
- MiniBar.tsx: MiniBar
- PageShell.tsx: PageShell
- ScreenScaffold.tsx: ScreenScaffold
- Sparkline.tsx: Sparkline
- StateView.tsx: EmptyState, LoadingState
- SummaryHero.tsx: SummaryHero
- TossPurchase.tsx: TossPurchase
- TossRewardAd.tsx: TossRewardAd
CRITICAL: Before creating any new function, type, or component, check the list above. If something similar exists, import and use it.

## Already Implemented (do NOT duplicate or overwrite)
- 0001: 도메인 타입 + RouteState 정의 (files: src/lib/types.ts)
- 0002: 날짜 유틸(KST) todayKST/addDays/formatDate (files: src/lib/date.ts, src/lib/__tests__/date.test.ts)

## Available exports from existing files
// src/App.tsx
export default function App() {

// src/components/AdSlot.tsx
export function AdSlot({ adGroupId, className, variant, theme }: AdSlotProps) {

// src/components/Amount.tsx
export function Amount({

// src/components/BottomCTA.tsx
export function SubmitFooter({
export function ButtonStack({

// src/components/Card.tsx
export function Card({

// src/components/CountUp.tsx
export function CountUp({

// src/components/FloatingTabBar.tsx
export type TabItem = {
export function FloatingTabBar({ items }: { items: TabItem[] }) {

// src/components/MiniBar.tsx
export function MiniBar({

// src/components/PageShell.tsx
export function PageShell({ children, style }: { children: ReactNode; style?: CSSProperties }) {

// src/components/ScreenScaffold.tsx
export function ScreenScaffold({

// src/components/Sparkline.tsx
export function Sparkline({

// src/components/StateView.tsx
export function EmptyState({
export function LoadingState({

// src/components/SummaryHero.tsx
export function SummaryHero({

// src/components/TossPurchase.tsx
export interface TossPurchaseResult {
export function TossPurchase({

// src/components/TossRewardAd.tsx
export function TossRewardAd({

// src/lib/contract.ts
export type RouteState = '/' | '/input' | '/result' | '/history' | '/share' | '/settings';
export type Fortune = { id: string; date: string; categoryId: string; amountKrw: number; score: number; fortuType: string; memo?: string; createdAt: string };
export type FortuneType = 'rich' | 'ruin' | 'neutral';
export type Category = { id: string; name: string; icon: string };
export type Alert = { id: string; type: string; level: 'info' | 'warn' | 'error'; message: string; timestamp: string };
export class ValidationError extends Error {
export type todayKSTFn = () => string;
export type addDaysFn = (dateStr: string, days: number) => string;
export type isWithinDaysFn = (dateStr: string, days: number) => boolean;
export type formatDateFn = (dateStr: string, format?: 'date' | 'datet

## Memory Index (자동 학습 — 힌트로만 사용, 실제 코드 확인 필수)

Available topics: deploy(2), general(11), testing(1), ui(1)

Key lessons (verify against actual code before applying):
- [general] 전역 라우팅·탭바·Provider 배선은 개별 화면보다 먼저(초반 20% 안에) 완료하고 미구현 화면은 스텁 라우트로 연결해, 시간 예산이 소진돼도 앱이 항상 실행 가능한 상태를 유지하라. (60% · 타 앱 1회 — 맹신 금지)
- [general] 저장·데이터 접근 등 기반 계층 패킷은 이를 import 하는 화면 패킷보다 반드시 먼저 완료·병합하고, 미완료면 상위 화면 패킷 병합을 차단하라 — 빈 기반 모듈 하나가 전 라우트 스모크를 무너뜨린다. (60% · 타 앱 1회 — 맹신 금지)
- [general] 외부에서 들어온 모든 값(라우터 state, 로컬 저장소, 부분 입력 폼)은 사용 직전에 배열·객체 기본값으로 정규화하고, 테이블/맵 조회 결과는 존재 확인 후에만 하위 속성이나 length에 접근하라. (60% · 타 앱 1회 — 맹신 금지)
- [general] 의존 그래프 최하층의 타입·계약 파일은 런타임 코드 0줄의 순수 선언으로 가장 먼저 단독 타입체크를 통과시키고, 파일 생성은 셸 명령이 아닌 허용된 편집 도구로만 하게 강제하라. (60% · 타 앱 1회 — 맹신 금지)
- [general] 영속 저장소에서 읽은 값은 항상 스키마 기본값으로 정규화해 배열·객체 타입을 보장한 뒤 반환하고, 화면은 빈/손상/부분 데이터에서도 렌더되도록 방어하라. (60% · 타 앱 1회 — 맹신 금지)