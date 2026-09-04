import type { AlertItem, CategoryId, CATEGORY_LABEL } from './types';

export interface DetectAlertsInput {
  byCategory: Record<string, number>;
  total: number;
  loggedDays: number;
  yesterdayTotal: number;
  prev6DailyAvg: number;
}

/**
 * 지름신 주의보 규칙 엔진
 * R1: CATEGORY_CONCENTRATION (loggedDays ≥ 2 && 특정 카테고리 비중 ≥ 50%)
 * R2: SPIKE (prev6DailyAvg > 0 && yesterdayTotal / prev6DailyAvg ≥ 2.0)
 * 최대 2개 반환, danger가 먼저 정렬
 */
export function detectAlerts(input: DetectAlertsInput): AlertItem[] {
  // TODO: Implement rule engine
  // - R1: CATEGORY_CONCENTRATION
  // - R2: SPIKE
  // - Guard against zero division
  // - Return max 2 alerts, sorted by level (danger first)
  return [];
}
