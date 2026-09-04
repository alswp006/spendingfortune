import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { saveDayLog, getFortune, saveFortune, pruneStorage, getDayLog } from '@/lib/storage';
import type { DayLog, FortuneRecord } from '@/lib/types';
import { STORAGE_KEYS } from '@/lib/types';

// ---- Helpers ----

function createTestDayLog(date: string): DayLog {
  return {
    date,
    entries: [],
    noSpend: true,
    total: 0,
    updatedAt: Date.now(),
  };
}

function createTestFortune(date: string): FortuneRecord {
  return {
    date,
    basisDate: date,
    score: 100,
    typeId: 'smart_shopper',
    headline: 'Test Fortune',
    advice: 'Test advice',
    savingTip: 'Test tip',
    luckyCategory: 'food',
    cautionCategory: null,
    estimatedSaving: 10000,
    alerts: [],
    yesterdayTotal: 0,
    unlocked: true,
    createdAt: Date.now(),
  };
}

// ---- Tests ----

describe('Packet 0005: 보존 정책(90일/30일) + Quota 대응 + Fortune 저장소', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================
  // AC-1: 91일치 → 90일로 pruning (oldest 삭제)
  // ============================================================

  it('AC-1[P0]: saveDayLog prunes DayLog to 90 when exceeding with 91 keys', () => {
    // Pre-populate with 91 days (2024-01-01 to 2024-04-02)
    const daylogs: Record<string, DayLog> = {};
    const baseDate = new Date('2024-01-01');
    const datesBefore: string[] = [];

    for (let i = 0; i < 91; i++) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      daylogs[dateStr] = createTestDayLog(dateStr);
      datesBefore.push(dateStr);
    }
    datesBefore.sort();
    const oldestBefore = datesBefore[0];

    localStorage.setItem(STORAGE_KEYS.dayLogs, JSON.stringify(daylogs));

    // Add new day (should prune oldest)
    const newDate = '2024-04-03';
    const newLog = createTestDayLog(newDate);
    const result = saveDayLog(newLog);

    // Verify: ok:true
    expect(result.ok).toBe(true);

    // Verify: exactly 90 daylogs after save
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.dayLogs) || '{}');
    const storedDates = Object.keys(stored).sort();
    expect(storedDates).toHaveLength(90);

    // Verify: oldest was removed
    expect(storedDates).not.toContain(oldestBefore);

    // Verify: new date is present
    expect(storedDates).toContain(newDate);

    // Verify: remaining oldest is third-oldest original (first two removed to reach 90)
    expect(storedDates[0]).toBe(datesBefore[2]);
  });

  it('AC-1[P0]: saveDayLog removes oldest date by date string order', () => {
    const daylogs: Record<string, DayLog> = {};
    // Explicitly set dates in reverse order to verify sorting
    const dateOrder = ['2024-01-15', '2024-01-10', '2024-01-05', '2024-01-20'];
    for (const date of dateOrder) {
      daylogs[date] = createTestDayLog(date);
    }

    // Pad to 91
    for (let i = 5; i < 91; i++) {
      daylogs[`2024-02-${String(i).padStart(2, '0')}`] = createTestDayLog(`2024-02-${String(i).padStart(2, '0')}`);
    }

    localStorage.setItem(STORAGE_KEYS.dayLogs, JSON.stringify(daylogs));

    // Save new entry
    saveDayLog(createTestDayLog('2024-03-01'));

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.dayLogs) || '{}');
    expect(Object.keys(stored)).toHaveLength(90);
    // Oldest (2024-01-05) should be gone
    expect(stored['2024-01-05']).toBeUndefined();
  });

  // ============================================================
  // AC-2: 31일치 → 30일로 pruning + getFortune deep-equal
  // ============================================================

  it('AC-2[P0]: saveFortune keeps exactly 30 when exceeding 31', () => {
    // Setup 31 fortunes
    const fortunes: Record<string, FortuneRecord> = {};
    const baseDate = new Date('2024-01-01');
    for (let i = 0; i < 31; i++) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      fortunes[dateStr] = createTestFortune(dateStr);
    }
    localStorage.setItem(STORAGE_KEYS.fortunes, JSON.stringify(fortunes));

    // Verify 31 before
    let stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.fortunes) || '{}');
    expect(Object.keys(stored)).toHaveLength(31);

    // Save another (triggers prune)
    const newDate = '2024-02-01';
    const newFortune = createTestFortune(newDate);
    saveFortune(newFortune);

    // Verify exactly 30 after
    stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.fortunes) || '{}');
    expect(Object.keys(stored)).toHaveLength(30);

    // Verify oldest (2024-01-01) was removed
    expect(stored['2024-01-01']).toBeUndefined();

    // Verify new date is there
    expect(stored[newDate]).toBeDefined();
  });

  it('AC-2[P0]: getFortune returns exact stored record with deep equality', () => {
    const testDate = '2024-01-15';
    const testFortune: FortuneRecord = {
      date: testDate,
      basisDate: testDate,
      score: 85,
      typeId: 'balance_master',
      headline: 'Balance is key',
      advice: 'Manage your spending wisely',
      savingTip: 'Set a daily budget',
      luckyCategory: 'food',
      cautionCategory: 'shopping',
      estimatedSaving: 50000,
      alerts: [
        {
          rule: 'CATEGORY_CONCENTRATION',
          level: 'caution',
          category: 'shopping',
          message: 'High shopping spend',
          ratio: 0.35,
        },
      ],
      yesterdayTotal: 100000,
      unlocked: true,
      createdAt: 1705276800000,
    };

    saveFortune(testFortune);
    const retrieved = getFortune(testDate);

    expect(retrieved).toEqual(testFortune);
    expect(retrieved?.score).toBe(85);
    expect(retrieved?.headline).toBe('Balance is key');
    expect(retrieved?.alerts).toHaveLength(1);
    expect(retrieved?.alerts[0].ratio).toBe(0.35);
    expect(retrieved?.cautionCategory).toBe('shopping');
  });

  // ============================================================
  // AC-3: QuotaExceededError handling: prune + retry + return error
  // ============================================================

  it('AC-3[P0]: saveDayLog returns QUOTA_EXCEEDED when setItem fails twice', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    let callCount = 0;

    // Mock setItem to throw QuotaExceededError on first and second calls
    const originalSetItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) {
      callCount++;
      if (key === STORAGE_KEYS.dayLogs && callCount <= 2) {
        throw new DOMException('QuotaExceededError', 'QuotaExceededError');
      }
      return originalSetItem.call(this, key, value);
    });

    const result = saveDayLog(createTestDayLog('2024-01-15'));

    // Verify error response
    expect(result).toEqual({ ok: false, reason: 'QUOTA_EXCEEDED' });

    // Verify no console.error
    expect(consoleErrorSpy).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it('AC-3[P0]: saveDayLog attempts setItem twice (initial + retry)', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    // Make it always throw
    setItemSpy.mockImplementation(() => {
      throw new DOMException('QuotaExceededError', 'QuotaExceededError');
    });

    saveDayLog(createTestDayLog('2024-01-15'));

    // Count calls for STORAGE_KEYS.dayLogs only (ignore other keys like meta)
    const daylogCalls = setItemSpy.mock.calls.filter((call) => call[0] === STORAGE_KEYS.dayLogs);
    expect(daylogCalls).toHaveLength(2);

    setItemSpy.mockRestore();
  });

  it('AC-3[P0]: saveDayLog does not propagate QuotaExceededError exception', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    setItemSpy.mockImplementation(() => {
      throw new DOMException('QuotaExceededError', 'QuotaExceededError');
    });

    // Should not throw
    expect(() => {
      saveDayLog(createTestDayLog('2024-01-15'));
    }).not.toThrow();

    setItemSpy.mockRestore();
  });

  // ============================================================
  // AC-4: pruneStorage return value
  // ============================================================

  it('AC-4[P0]: pruneStorage returns object with integer removed counts', () => {
    // Setup 100 daylogs (90 limit)
    const daylogs: Record<string, DayLog> = {};
    const baseDate = new Date('2024-01-01');
    for (let i = 0; i < 100; i++) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      daylogs[dateStr] = createTestDayLog(dateStr);
    }
    localStorage.setItem(STORAGE_KEYS.dayLogs, JSON.stringify(daylogs));

    // Setup 40 fortunes (30 limit)
    const fortunes: Record<string, FortuneRecord> = {};
    for (let i = 0; i < 40; i++) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      fortunes[dateStr] = createTestFortune(dateStr);
    }
    localStorage.setItem(STORAGE_KEYS.fortunes, JSON.stringify(fortunes));

    const result = pruneStorage();

    // Verify structure
    expect(result).toHaveProperty('removedDayLogs');
    expect(result).toHaveProperty('removedFortunes');

    // Verify types
    expect(typeof result.removedDayLogs).toBe('number');
    expect(typeof result.removedFortunes).toBe('number');

    // Verify integers
    expect(Number.isInteger(result.removedDayLogs)).toBe(true);
    expect(Number.isInteger(result.removedFortunes)).toBe(true);

    // Verify counts (100→90 = 10 removed, 40→30 = 10 removed)
    expect(result.removedDayLogs).toBe(10);
    expect(result.removedFortunes).toBe(10);
  });

  it('AC-4[P0]: pruneStorage returns 0 counts when no pruning needed', () => {
    // Setup 30 daylogs (at limit, no prune)
    const daylogs: Record<string, DayLog> = {};
    for (let i = 1; i <= 30; i++) {
      const date = `2024-01-${String(i).padStart(2, '0')}`;
      daylogs[date] = createTestDayLog(date);
    }
    localStorage.setItem(STORAGE_KEYS.dayLogs, JSON.stringify(daylogs));

    // Setup 20 fortunes (under limit, no prune)
    const fortunes: Record<string, FortuneRecord> = {};
    for (let i = 1; i <= 20; i++) {
      const date = `2024-01-${String(i).padStart(2, '0')}`;
      fortunes[date] = createTestFortune(date);
    }
    localStorage.setItem(STORAGE_KEYS.fortunes, JSON.stringify(fortunes));

    const result = pruneStorage();

    expect(result.removedDayLogs).toBe(0);
    expect(result.removedFortunes).toBe(0);
  });

  it('AC-4[P0]: pruneStorage actually removes oldest records from storage', () => {
    // Setup 100 daylogs with predictable dates
    const daylogs: Record<string, DayLog> = {};
    const baseDate = new Date('2024-01-01');
    const allDates: string[] = [];

    for (let i = 0; i < 100; i++) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      daylogs[dateStr] = createTestDayLog(dateStr);
      allDates.push(dateStr);
    }
    allDates.sort();
    localStorage.setItem(STORAGE_KEYS.dayLogs, JSON.stringify(daylogs));

    const oldestTenBefore = allDates.slice(0, 10);

    pruneStorage();

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.dayLogs) || '{}');
    const remainingDates = Object.keys(stored).sort();

    // Should have exactly 90
    expect(remainingDates).toHaveLength(90);

    // Oldest 10 should be gone
    for (const oldDate of oldestTenBefore) {
      expect(remainingDates).not.toContain(oldDate);
    }

    // Remaining should be the newest 90
    expect(remainingDates[0]).toBe(allDates[10]);
  });
});
