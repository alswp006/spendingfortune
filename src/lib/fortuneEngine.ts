import type { CategoryId, DayLog, FortuneTypeId } from '@/lib/types';
import { TYPE_MATRIX } from '@/lib/fortuneTable';

// 운세 점수·유형 산출 순수 함수 — 저장소/React 의존 없음, 전부 결정론적

export type ScoreBand = 'high' | 'mid' | 'low';
type DominantGroup = 'EAT' | 'SHOP' | 'LIFE' | 'MISC';

const ALL_CATEGORIES: CategoryId[] = ['food', 'cafe', 'shopping', 'transport', 'culture', 'health', 'living', 'etc'];

const GROUP_BY_CATEGORY: Record<CategoryId, DominantGroup> = {
  food: 'EAT',
  cafe: 'EAT',
  shopping: 'SHOP',
  culture: 'SHOP',
  living: 'LIFE',
  transport: 'LIFE',
  health: 'LIFE',
  etc: 'MISC',
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** 날짜 문자열을 32비트 부호없는 정수 해시로 변환 (결정론적 시드) */
export function hash32(date: string): number {
  let hash = 0;
  for (let i = 0; i < date.length; i++) {
    hash = (hash * 31 + date.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}

function amountByCategory(dayLog: DayLog): Record<CategoryId, number> {
  const totals = {} as Record<CategoryId, number>;
  for (const cat of ALL_CATEGORIES) totals[cat] = 0;

  const entries = Array.isArray(dayLog.entries) ? dayLog.entries : [];
  for (const entry of entries) {
    const category = entry?.category;
    const amount = entry?.amount;
    if (category && ALL_CATEGORIES.includes(category) && typeof amount === 'number' && !Number.isNaN(amount)) {
      totals[category] += amount;
    }
  }
  return totals;
}

export function scoreBandOf(score: number): ScoreBand {
  if (score >= 70) return 'high';
  if (score >= 40) return 'mid';
  return 'low';
}

export interface ComputeScoreInput {
  yesterdayTotal: number;
  dailyAvg: number;
  date: string;
}

export interface ComputeScoreResult {
  score: number;
}

/** base 50 + 보정표 + 시드 노이즈 → 0~100 정수 소비운 점수 */
export function computeScore(input: ComputeScoreInput): ComputeScoreResult {
  const { yesterdayTotal, date } = input;
  // 기록일 0일(dailyAvg=0)이면 어제 지출로 대체
  const effectiveDailyAvg = input.dailyAvg === 0 ? yesterdayTotal : input.dailyAvg;

  const seed = hash32(date);
  const noise = (seed % 21) - 10;

  let adjustment: number;
  if (yesterdayTotal === 0) {
    adjustment = 30;
  } else if (yesterdayTotal <= effectiveDailyAvg * 0.8) {
    adjustment = 20;
  } else if (yesterdayTotal <= effectiveDailyAvg) {
    adjustment = 10;
  } else if (yesterdayTotal >= effectiveDailyAvg * 2) {
    adjustment = -30;
  } else if (yesterdayTotal >= effectiveDailyAvg * 1.5) {
    adjustment = -20;
  } else {
    adjustment = 0;
  }

  const score = clamp(Math.round(50 + adjustment + noise), 0, 100);
  return { score };
}

/** 어제 최대 금액 카테고리 기준 4대 그룹 (무지출/기타는 MISC) */
export function resolveDominantGroup(dayLog: DayLog): DominantGroup {
  if (!dayLog || dayLog.noSpend || !dayLog.total) return 'MISC';

  const totals = amountByCategory(dayLog);
  let maxCategory: CategoryId = 'etc';
  let maxAmount = -1;
  for (const cat of ALL_CATEGORIES) {
    if (totals[cat] > maxAmount) {
      maxAmount = totals[cat];
      maxCategory = cat;
    }
  }

  if (maxAmount <= 0) return 'MISC';
  return GROUP_BY_CATEGORY[maxCategory];
}

/** 그룹 × 점수밴드 → 12유형 (TYPE_MATRIX 그대로) */
export function resolveTypeId(group: DominantGroup, score: number): FortuneTypeId {
  return TYPE_MATRIX[group][scoreBandOf(score)];
}

export interface ComputeEstimatedSavingInput {
  dayLog: DayLog;
  yesterdayTotal: number;
  dailyAvg: number;
}

/** 어제 지출 - (평균의 80%) 중 0 이상인 값 */
export function computeEstimatedSaving(input: ComputeEstimatedSavingInput): number {
  const { yesterdayTotal, dailyAvg } = input;
  return Math.max(0, yesterdayTotal - Math.round(dailyAvg * 0.8));
}

/** 지출 비중이 가장 낮은 카테고리 (동률은 고정 순서 중 첫번째) */
export function resolveLuckyCategory(dayLog: DayLog): CategoryId {
  const totals = amountByCategory(dayLog);
  let minCategory: CategoryId = ALL_CATEGORIES[0];
  let minAmount = Infinity;
  for (const cat of ALL_CATEGORIES) {
    if (totals[cat] < minAmount) {
      minAmount = totals[cat];
      minCategory = cat;
    }
  }
  return minCategory;
}

/** 지출 비중이 가장 높은 카테고리 (무지출이면 null) */
export function resolveCautionCategory(dayLog: DayLog): CategoryId | null {
  if (!dayLog || dayLog.noSpend || !dayLog.total) return null;

  const totals = amountByCategory(dayLog);
  let maxCategory: CategoryId | null = null;
  let maxAmount = 0;
  for (const cat of ALL_CATEGORIES) {
    if (totals[cat] > maxAmount) {
      maxAmount = totals[cat];
      maxCategory = cat;
    }
  }
  return maxCategory;
}
