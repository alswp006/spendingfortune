import { describe, it, expect, beforeEach } from 'vitest';
import { getStats } from '@/lib/stats';
import type { DayLog } from '@/lib/types';
import { STORAGE_KEYS } from '@/lib/types';

// ---- Helpers ----

function createTestDayLog(date: string, entries: Array<{ category: string; amount: number }>): DayLog {
  const total = entries.reduce((sum, e) => sum + e.amount, 0);
  return {
    date,
    entries: entries.map((e, i) => ({
      id: `${date}-e${i}`,
      category: e.category as any,
      amount: e.amount,
      memo: '',
      createdAt: Date.now(),
    })),
    noSpend: entries.length === 0,
    total,
    updatedAt: Date.now(),
  };
}

// ---- Tests ----

describe('Packet 0006: 통계 집계 getStats', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ============================================================
  // AC-1: 7일 구간에 3건(3일) → total:100000, dailyAvg:33333, loggedDays:3
  // ============================================================

  it('AC-1[P0]: getStats calculates correct total, dailyAvg, and loggedDays for multi-day, multi-category spending', () => {
    // Setup: 2026-08-29 ~ 2026-09-04 중 3일간 각각 다른 카테고리 지출
    const daylogs: Record<string, DayLog> = {
      '2026-08-29': createTestDayLog('2026-08-29', [{ category: 'food', amount: 30000 }]),
      '2026-09-02': createTestDayLog('2026-09-02', [{ category: 'cafe', amount: 10000 }]),
      '2026-09-04': createTestDayLog('2026-09-04', [{ category: 'shopping', amount: 60000 }]),
    };
    localStorage.setItem(STORAGE_KEYS.dayLogs, JSON.stringify(daylogs));

    // Call: getStats for 7 days ending 2026-09-04
    const result = getStats('2026-09-04', 7);

    // Verify total
    expect(result.total).toBe(100000);

    // Verify dailyAvg = Math.round(100000 / 3) = 33333
    expect(result.dailyAvg).toBe(33333);

    // Verify loggedDays (3 days with entries)
    expect(result.loggedDays).toBe(3);

    // Verify byCategory has shopping with 60000
    expect(result.byCategory.shopping).toBe(60000);
  });

  it('AC-1[P0]: byCategory has correct values for all categories in result', () => {
    const daylogs: Record<string, DayLog> = {
      '2026-08-29': createTestDayLog('2026-08-29', [{ category: 'food', amount: 30000 }]),
      '2026-09-02': createTestDayLog('2026-09-02', [{ category: 'cafe', amount: 10000 }]),
      '2026-09-04': createTestDayLog('2026-09-04', [{ category: 'shopping', amount: 60000 }]),
    };
    localStorage.setItem(STORAGE_KEYS.dayLogs, JSON.stringify(daylogs));

    const result = getStats('2026-09-04', 7);

    // Verify all categories present
    expect(result.byCategory.food).toBe(30000);
    expect(result.byCategory.cafe).toBe(10000);
    expect(result.byCategory.shopping).toBe(60000);
  });

  // ============================================================
  // AC-2: byCategory always has 8 keys, no NaN/undefined
  // ============================================================

  it('AC-2[P0]: byCategory always has exactly 8 category keys', () => {
    const daylogs: Record<string, DayLog> = {
      '2026-09-04': createTestDayLog('2026-09-04', [{ category: 'food', amount: 50000 }]),
    };
    localStorage.setItem(STORAGE_KEYS.dayLogs, JSON.stringify(daylogs));

    const result = getStats('2026-09-04', 7);

    // Count keys
    const keys = Object.keys(result.byCategory);
    expect(keys).toHaveLength(8);

    // Verify all expected categories are present
    const expectedCategories = ['food', 'cafe', 'shopping', 'transport', 'culture', 'health', 'living', 'etc'];
    expect(keys.sort()).toEqual(expectedCategories.sort());
  });

  it('AC-2[P0]: byCategory contains no NaN or undefined values', () => {
    // Test with empty data
    localStorage.setItem(STORAGE_KEYS.dayLogs, JSON.stringify({}));
    let result = getStats('2026-09-04', 7);

    for (const [key, value] of Object.entries(result.byCategory)) {
      expect(Number.isNaN(value)).toBe(false);
      expect(value).not.toBeUndefined();
      expect(typeof value).toBe('number');
    }

    // Test with data
    const daylogs: Record<string, DayLog> = {
      '2026-09-04': createTestDayLog('2026-09-04', [{ category: 'shopping', amount: 100000 }]),
    };
    localStorage.setItem(STORAGE_KEYS.dayLogs, JSON.stringify(daylogs));
    result = getStats('2026-09-04', 7);

    for (const [key, value] of Object.entries(result.byCategory)) {
      expect(Number.isNaN(value)).toBe(false);
      expect(value).not.toBeUndefined();
      expect(typeof value).toBe('number');
    }
  });

  // ============================================================
  // AC-3: loggedDays === 0 → dailyAvg === 0, no 'Infinity'/'NaN' in JSON
  // ============================================================

  it('AC-3[P0]: when no logs exist, loggedDays is 0 and dailyAvg is 0', () => {
    // Empty storage
    localStorage.setItem(STORAGE_KEYS.dayLogs, JSON.stringify({}));

    const result = getStats('2026-09-04', 7);

    expect(result.loggedDays).toBe(0);
    expect(result.dailyAvg).toBe(0);
    expect(result.total).toBe(0);
  });

  it('AC-3[P0]: JSON.stringify result contains no Infinity or NaN strings', () => {
    localStorage.setItem(STORAGE_KEYS.dayLogs, JSON.stringify({}));

    const result = getStats('2026-09-04', 7);
    const jsonStr = JSON.stringify(result);

    expect(jsonStr).not.toContain('Infinity');
    expect(jsonStr).not.toContain('NaN');
    expect(jsonStr).not.toContain('null'); // dailyAvg should be 0, not null
  });

  it('AC-3[P0]: noSpend days (no entries) are still counted as loggedDays', () => {
    // Day with no entries and noSpend=true
    const daylogs: Record<string, DayLog> = {
      '2026-09-04': {
        date: '2026-09-04',
        entries: [],
        noSpend: true,
        total: 0,
        updatedAt: Date.now(),
      },
    };
    localStorage.setItem(STORAGE_KEYS.dayLogs, JSON.stringify(daylogs));

    const result = getStats('2026-09-04', 7);

    // Should count 1 day even though no spending
    expect(result.loggedDays).toBe(1);
    expect(result.total).toBe(0);
    expect(result.dailyAvg).toBe(0);
  });

  // ============================================================
  // AC-4: Corrupted records (total: 'abc') are excluded, no exception
  // ============================================================

  it('AC-4[P0]: corrupted record with invalid total is excluded from aggregation', () => {
    const daylogs: Record<string, DayLog> = {
      '2026-09-03': {
        date: '2026-09-03',
        entries: [],
        noSpend: false,
        total: 'abc' as any, // Corrupted
        updatedAt: Date.now(),
      },
      '2026-09-04': createTestDayLog('2026-09-04', [{ category: 'food', amount: 50000 }]),
    };
    localStorage.setItem(STORAGE_KEYS.dayLogs, JSON.stringify(daylogs));

    const result = getStats('2026-09-04', 7);

    // Only valid record is counted
    expect(result.total).toBe(50000);
    expect(result.loggedDays).toBe(1);
    expect(result.byCategory.food).toBe(50000);
  });

  it('AC-4[P0]: getStats does not throw when encountering corrupted records', () => {
    const daylogs: Record<string, DayLog> = {
      '2026-09-02': {
        date: '2026-09-02',
        entries: [],
        noSpend: false,
        total: NaN as any, // Corrupted
        updatedAt: Date.now(),
      },
      '2026-09-03': {
        date: '2026-09-03',
        entries: undefined as any, // Corrupted
        noSpend: false,
        total: 'invalid' as any,
        updatedAt: Date.now(),
      },
      '2026-09-04': createTestDayLog('2026-09-04', [{ category: 'shopping', amount: 75000 }]),
    };
    localStorage.setItem(STORAGE_KEYS.dayLogs, JSON.stringify(daylogs));

    // Should not throw
    expect(() => {
      const result = getStats('2026-09-04', 7);
      expect(result.total).toBe(75000);
    }).not.toThrow();
  });

  // ============================================================
  // Additional: Date range correctness
  // ============================================================

  it('should only include logs within the date range (endDate - days + 1 to endDate)', () => {
    const daylogs: Record<string, DayLog> = {
      '2026-08-28': createTestDayLog('2026-08-28', [{ category: 'food', amount: 10000 }]), // Before range
      '2026-08-29': createTestDayLog('2026-08-29', [{ category: 'food', amount: 20000 }]), // Inside range
      '2026-09-04': createTestDayLog('2026-09-04', [{ category: 'food', amount: 30000 }]), // Inside range
      '2026-09-05': createTestDayLog('2026-09-05', [{ category: 'food', amount: 40000 }]), // After range
    };
    localStorage.setItem(STORAGE_KEYS.dayLogs, JSON.stringify(daylogs));

    const result = getStats('2026-09-04', 7);

    // Should only include 2026-08-29 (20000) and 2026-09-04 (30000)
    expect(result.total).toBe(50000);
    expect(result.loggedDays).toBe(2);
  });

  it('should handle multiple entries per day correctly', () => {
    const daylogs: Record<string, DayLog> = {
      '2026-09-04': createTestDayLog('2026-09-04', [
        { category: 'food', amount: 15000 },
        { category: 'cafe', amount: 8000 },
        { category: 'shopping', amount: 45000 },
      ]),
    };
    localStorage.setItem(STORAGE_KEYS.dayLogs, JSON.stringify(daylogs));

    const result = getStats('2026-09-04', 7);

    expect(result.total).toBe(68000);
    expect(result.loggedDays).toBe(1);
    expect(result.byCategory.food).toBe(15000);
    expect(result.byCategory.cafe).toBe(8000);
    expect(result.byCategory.shopping).toBe(45000);
  });

  it('should accumulate same category across multiple days', () => {
    const daylogs: Record<string, DayLog> = {
      '2026-09-02': createTestDayLog('2026-09-02', [{ category: 'food', amount: 20000 }]),
      '2026-09-04': createTestDayLog('2026-09-04', [{ category: 'food', amount: 30000 }]),
    };
    localStorage.setItem(STORAGE_KEYS.dayLogs, JSON.stringify(daylogs));

    const result = getStats('2026-09-04', 7);

    expect(result.total).toBe(50000);
    expect(result.byCategory.food).toBe(50000);
    expect(result.loggedDays).toBe(2);
    expect(result.dailyAvg).toBe(25000); // Math.round(50000 / 2)
  });
});
