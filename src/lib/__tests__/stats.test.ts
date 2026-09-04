import { describe, it, expect } from 'vitest';
import { getStats } from '@/lib/stats';
import { saveDayLog } from '@/lib/storage';
import { STORAGE_KEYS } from '@/lib/types';
import type { CategoryId } from '@/lib/types';

function seedEntry(date: string, category: CategoryId, amount: number) {
  saveDayLog({
    date,
    entries: [{ id: `${date}-${category}`, category, amount, memo: '', createdAt: 0 }],
    noSpend: false,
    total: 0,
    updatedAt: 0,
  });
}

describe('getStats', () => {
  it('AC-1: 3일 기록(food/cafe/shopping)의 total/dailyAvg/loggedDays/byCategory 집계', () => {
    seedEntry('2026-08-29', 'food', 30000);
    seedEntry('2026-09-01', 'cafe', 10000);
    seedEntry('2026-09-04', 'shopping', 60000);

    const stats = getStats('2026-09-04', 7);

    expect(stats.total).toBe(100000);
    expect(stats.dailyAvg).toBe(33333);
    expect(stats.loggedDays).toBe(3);
    expect(stats.byCategory.shopping).toBe(60000);
  });

  it('AC-2: byCategory는 항상 8개 키를 가지며 값에 NaN/undefined가 없다', () => {
    const stats = getStats('2026-09-04', 7);
    const keys = Object.keys(stats.byCategory);

    expect(keys).toHaveLength(8);
    for (const key of keys) {
      const value = stats.byCategory[key as CategoryId];
      expect(value).not.toBeNaN();
      expect(value).not.toBeUndefined();
    }
  });

  it('AC-3: 기록이 없으면 dailyAvg는 0이고 결과에 Infinity/NaN 문자열이 없다', () => {
    const stats = getStats('2026-09-04', 7);

    expect(stats.loggedDays).toBe(0);
    expect(stats.dailyAvg).toBe(0);
    const json = JSON.stringify(stats);
    expect(json.includes('Infinity')).toBe(false);
    expect(json.includes('NaN')).toBe(false);
  });

  it('AC-4: 손상된 레코드는 예외 없이 집계에서 제외된다', () => {
    seedEntry('2026-09-03', 'food', 20000);

    // 손상된 레코드를 직접 localStorage에 주입 (total이 문자열)
    const raw = localStorage.getItem(STORAGE_KEYS.dayLogs);
    const map = raw ? JSON.parse(raw) : {};
    map['2026-09-02'] = { date: '2026-09-02', entries: [], noSpend: false, total: 'abc', updatedAt: 0 };
    localStorage.setItem(STORAGE_KEYS.dayLogs, JSON.stringify(map));

    expect(() => getStats('2026-09-04', 7)).not.toThrow();
    const stats = getStats('2026-09-04', 7);
    expect(stats.total).toBe(20000);
    expect(stats.loggedDays).toBe(1);
  });
});
