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
export type ValidationError = class ValidationError extends Error { constructor(field: string, reason: string) };

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
// Domain types — add your app-specific types here
export {};

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
- storage.ts: export function getItem<T>(key: string): T | null; export function setItem<T>(key: string, value: T): void; export function removeItem(key: string): void
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