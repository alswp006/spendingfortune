import { describe, it, expect } from 'vitest';
import { getStats } from '@/lib/stats';
import type { Stats } from '@/lib/stats';
import { saveDayLog } from '@/lib/storage';
import { CATEGORY_LABEL, STORAGE_KEYS } from '@/lib/types';
import type { CategoryId, DayLog } from '@/lib/types';

function seedEntry(date: string, category: CategoryId, amount: number) {
  saveDayLog({
    date,
    entries: [{ id: `${date}-${category}`, category, amount, memo: '', createdAt: 0 }],
    noSpend: false,
    total: 0,
    updatedAt: 0,
  });
}

/** 저장소 검증을 우회해 임의(손상 포함) 레코드를 직접 심는다 */
function injectRaw(date: string, record: unknown) {
  const raw = localStorage.getItem(STORAGE_KEYS.dayLogs);
  const map = raw ? JSON.parse(raw) : {};
  map[date] = record;
  localStorage.setItem(STORAGE_KEYS.dayLogs, JSON.stringify(map));
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
    expect(stats.byCategory.food).toBe(30000);
    expect(stats.byCategory.cafe).toBe(10000);
  });

  it('AC-1: 구간 밖(endDate 이후·시작일 이전) 기록은 집계하지 않는다', () => {
    seedEntry('2026-08-28', 'food', 99000); // 시작일(08-29) 하루 전
    seedEntry('2026-08-29', 'food', 20000); // 시작일 경계 — 포함
    seedEntry('2026-09-04', 'food', 30000); // 종료일 경계 — 포함
    seedEntry('2026-09-05', 'food', 77000); // endDate 다음날

    const stats = getStats('2026-09-04', 7);

    expect(stats.total).toBe(50000);
    expect(stats.loggedDays).toBe(2);
  });

  it('AC-2: byCategory는 CATEGORY_LABEL의 8개 키를 그대로 가지며 값이 모두 유한수다', () => {
    seedEntry('2026-09-04', 'shopping', 60000);

    const stats = getStats('2026-09-04', 7);
    const keys = Object.keys(stats.byCategory);

    expect(keys.slice().sort()).toEqual(Object.keys(CATEGORY_LABEL).slice().sort());
    expect(keys).toHaveLength(8);
    for (const key of keys) {
      expect(Number.isFinite(stats.byCategory[key as CategoryId])).toBe(true);
    }
  });

  it('AC-3: 기록이 없으면 0으로 채워지고 직렬화 결과에 NaN/Infinity가 없다', () => {
    const stats = getStats('2026-09-04', 7);

    expect(stats.total).toBe(0);
    expect(stats.loggedDays).toBe(0);
    expect(stats.dailyAvg).toBe(0);

    const json = JSON.stringify(stats);
    expect(json.includes('NaN')).toBe(false);
    expect(json.includes('Infinity')).toBe(false);
    expect(json.includes('null')).toBe(false);
  });

  it('AC-4: 손상 레코드는 제외하고 무지출 날짜는 loggedDays에 포함한다', () => {
    seedEntry('2026-09-03', 'food', 20000);

    // 무지출 기록 — 지출은 0이지만 "기록한 날"이다
    saveDayLog({ date: '2026-09-01', entries: [], noSpend: true, total: 0, updatedAt: 0 });

    // 손상 레코드 — total이 문자열
    injectRaw('2026-09-02', {
      date: '2026-09-02',
      entries: [],
      noSpend: false,
      total: 'abc',
      updatedAt: 0,
    });

    expect(() => getStats('2026-09-04', 7)).not.toThrow();

    const stats = getStats('2026-09-04', 7);
    expect(stats.total).toBe(20000);
    expect(stats.loggedDays).toBe(2); // 09-01(무지출) + 09-03
    expect(stats.byCategory.food).toBe(20000);
    expect(stats.dailyAvg).toBe(10000);
  });

  it('AC-4: entries가 배열이 아니거나 amount가 숫자가 아니면 조용히 건너뛴다', () => {
    injectRaw('2026-09-02', {
      date: '2026-09-02',
      entries: null,
      noSpend: false,
      total: 5000,
      updatedAt: 0,
    });
    injectRaw('2026-09-03', {
      date: '2026-09-03',
      entries: [{ id: 'x', category: 'food', amount: '1만원', memo: '', createdAt: 0 }],
      noSpend: false,
      total: 0,
      updatedAt: 0,
    });
    injectRaw('2026-09-04', {
      date: '2026-09-04',
      entries: [{ id: 'y', category: 'unknown_cat', amount: 3000, memo: '', createdAt: 0 }],
      noSpend: false,
      total: 0,
      updatedAt: 0,
    });

    const stats: Stats = getStats('2026-09-04', 7);

    expect(stats.total).toBe(0);
    for (const key of Object.keys(stats.byCategory)) {
      expect(stats.byCategory[key as CategoryId]).toBe(0);
    }
    expect(Number.isFinite(stats.dailyAvg)).toBe(true);
  });

  it('days가 0·음수·비정수여도 예외 없이 빈 통계를 반환한다', () => {
    seedEntry('2026-09-04', 'food', 10000);

    for (const days of [0, -3, 1.5, Number.NaN]) {
      const stats = getStats('2026-09-04', days);
      expect(stats.total).toBe(0);
      expect(stats.loggedDays).toBe(0);
      expect(stats.dailyAvg).toBe(0);
      expect(Object.keys(stats.byCategory)).toHaveLength(8);
    }
  });

  it('같은 카테고리를 여러 날에 걸쳐 누적한다', () => {
    const logs: Record<string, DayLog> = {
      '2026-09-02': {
        date: '2026-09-02',
        entries: [{ id: 'a', category: 'food', amount: 20000, memo: '', createdAt: 0 }],
        noSpend: false,
        total: 20000,
        updatedAt: 0,
      },
      '2026-09-04': {
        date: '2026-09-04',
        entries: [{ id: 'b', category: 'food', amount: 30000, memo: '', createdAt: 0 }],
        noSpend: false,
        total: 30000,
        updatedAt: 0,
      },
    };
    localStorage.setItem(STORAGE_KEYS.dayLogs, JSON.stringify(logs));

    const stats = getStats('2026-09-04', 7);

    expect(stats.byCategory.food).toBe(50000);
    expect(stats.total).toBe(50000);
    expect(stats.loggedDays).toBe(2);
    expect(stats.dailyAvg).toBe(25000);
  });
});
