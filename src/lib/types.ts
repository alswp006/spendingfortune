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
