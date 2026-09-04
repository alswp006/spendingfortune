import type { AlertItem, AlertLevel, CategoryId } from './types';

export interface DetectAlertsInput {
  byCategory: Record<string, number | undefined>;
  total: number;
  loggedDays: number;
  yesterdayTotal: number;
  prev6DailyAvg: number;
}

// 주의보 메시지 전용 짧은 라벨 (CATEGORY_LABEL과 다름 — 문장에 자연스럽게 붙도록)
const ALERT_CATEGORY_LABEL: Record<CategoryId, string> = {
  food: '음식',
  cafe: '카페',
  shopping: '쇼핑',
  transport: '교통',
  culture: '문화',
  health: '건강',
  living: '생활',
  etc: '기타',
};

const LEVEL_RANK: Record<AlertLevel, number> = { danger: 0, caution: 1 };

/**
 * 지름신 주의보 규칙 엔진
 * R1: CATEGORY_CONCENTRATION (loggedDays ≥ 2 && 특정 카테고리 비중 ≥ 50%)
 * R2: SPIKE (prev6DailyAvg > 0 && yesterdayTotal / prev6DailyAvg ≥ 2.0)
 * 최대 2개 반환, danger가 먼저 정렬
 */
export function detectAlerts(input: DetectAlertsInput): AlertItem[] {
  const { byCategory, total, loggedDays, yesterdayTotal, prev6DailyAvg } = input;
  const alerts: AlertItem[] = [];

  // R1: CATEGORY_CONCENTRATION
  if (loggedDays >= 2 && total > 0) {
    let topCategory: string | null = null;
    let topRatio = 0;
    for (const [category, amount] of Object.entries(byCategory)) {
      const ratio = (amount ?? 0) / total;
      if (ratio > topRatio) {
        topRatio = ratio;
        topCategory = category;
      }
    }
    if (topCategory && topRatio >= 0.5) {
      const rounded = Math.round(topRatio * 100) / 100;
      const label = ALERT_CATEGORY_LABEL[topCategory as CategoryId] ?? topCategory;
      alerts.push({
        rule: 'CATEGORY_CONCENTRATION',
        level: 'caution',
        category: topCategory as CategoryId,
        ratio: rounded,
        message: `최근 7일 지출의 ${Math.round(topRatio * 100)}%가 ${label}에 몰렸어요`,
      });
    }
  }

  // R2: SPIKE
  if (prev6DailyAvg > 0) {
    const ratio = yesterdayTotal / prev6DailyAvg;
    if (ratio >= 2) {
      const rounded = Math.round(ratio * 10) / 10;
      alerts.push({
        rule: 'SPIKE',
        level: 'danger',
        category: null,
        ratio: rounded,
        message: `어제 지출이 평소의 ${rounded.toFixed(1)}배예요`,
      });
    }
  }

  return alerts.sort((a, b) => LEVEL_RANK[a.level] - LEVEL_RANK[b.level]).slice(0, 2);
}
