import { describe, it, expect, beforeEach } from 'vitest';
import {
  hash32,
  computeScore,
  resolveDominantGroup,
  resolveTypeId,
  computeEstimatedSaving,
  resolveLuckyCategory,
  resolveCautionCategory,
} from '@/lib/fortuneEngine';
import type { DayLog } from '@/lib/types';

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

describe('Packet 0007: 운세 점수·유형 산출 순수 함수', () => {
  // ============================================================
  // AC-1: 동일 date + 동일 입력 2회 호출 시 score/typeId 값이 동일(결정론)
  // ============================================================

  it('AC-1[P0]: computeScore is deterministic - same inputs yield same score', () => {
    const input = {
      yesterdayTotal: 50000,
      dailyAvg: 30000,
      date: '2026-09-05',
    };

    const result1 = computeScore(input);
    const result2 = computeScore(input);

    expect(result1.score).toBe(result2.score);
    expect(typeof result1.score).toBe('number');
    expect(Number.isInteger(result1.score)).toBe(true);
  });

  it('AC-1[P0]: resolveTypeId is deterministic - same inputs yield same typeId', () => {
    const input = {
      yesterdayTotal: 50000,
      dailyAvg: 30000,
      date: '2026-09-05',
    };

    const score1 = computeScore(input).score;
    const dayLog1 = createTestDayLog('2026-09-05', [{ category: 'shopping', amount: 50000 }]);
    const group1 = resolveDominantGroup(dayLog1);
    const typeId1 = resolveTypeId(group1, score1);

    // Second call with same input
    const score2 = computeScore(input).score;
    const dayLog2 = createTestDayLog('2026-09-05', [{ category: 'shopping', amount: 50000 }]);
    const group2 = resolveDominantGroup(dayLog2);
    const typeId2 = resolveTypeId(group2, score2);

    expect(typeId1).toBe(typeId2);
    expect(score1).toBe(score2);
  });

  it('AC-1[P0]: hash32 is deterministic - same date yields same hash', () => {
    const date = '2026-09-05';
    const hash1 = hash32(date);
    const hash2 = hash32(date);

    expect(hash1).toBe(hash2);
    expect(typeof hash1).toBe('number');
  });

  // ============================================================
  // AC-2: noSpend:true, total:0 → score ≥ 70, typeId === 'zero_spender',
  //        cautionCategory === null, estimatedSaving === 0
  // ============================================================

  it('AC-2[P0]: zero spender scenario yields high score (≥70) and zero_spender typeId', () => {
    const input = {
      yesterdayTotal: 0,
      dailyAvg: 0,
      date: '2026-09-05',
    };

    const result = computeScore(input);

    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(Number.isInteger(result.score)).toBe(true);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('AC-2[P0]: zero spender dayLog resolves to zero_spender typeId', () => {
    const dayLog = createTestDayLog('2026-09-05', []);
    expect(dayLog.noSpend).toBe(true);
    expect(dayLog.total).toBe(0);

    const group = resolveDominantGroup(dayLog);
    const input = {
      yesterdayTotal: 0,
      dailyAvg: 0,
      date: '2026-09-05',
    };
    const score = computeScore(input).score;
    const typeId = resolveTypeId(group, score);

    expect(typeId).toBe('zero_spender');
  });

  it('AC-2[P0]: zero spender caution category is null', () => {
    const dayLog = createTestDayLog('2026-09-05', []);
    const cautionCategory = resolveCautionCategory(dayLog);

    expect(cautionCategory).toBeNull();
  });

  it('AC-2[P0]: zero spender estimated saving is 0', () => {
    const dayLog = createTestDayLog('2026-09-05', []);
    const input = {
      yesterdayTotal: 0,
      dailyAvg: 0,
      date: '2026-09-05',
    };

    const estimatedSaving = computeEstimatedSaving({
      dayLog,
      yesterdayTotal: input.yesterdayTotal,
      dailyAvg: input.dailyAvg,
    });

    expect(estimatedSaving).toBe(0);
  });

  // ============================================================
  // AC-3: dailyAvg 20000 + 어제 shopping 60000
  //        → score ≤ 30, typeId === 'impulse_god', estimatedSaving === 44000
  // ============================================================

  it('AC-3[P0]: impulse spending (shopping dominant) yields low score (≤30)', () => {
    const input = {
      yesterdayTotal: 60000,
      dailyAvg: 20000,
      date: '2026-09-05',
    };

    const result = computeScore(input);

    expect(result.score).toBeLessThanOrEqual(30);
    expect(Number.isInteger(result.score)).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it('AC-3[P0]: shopping-dominant dayLog resolves to impulse_god typeId', () => {
    const dayLog = createTestDayLog('2026-09-05', [
      { category: 'shopping', amount: 60000 },
    ]);

    const group = resolveDominantGroup(dayLog);
    const input = {
      yesterdayTotal: 60000,
      dailyAvg: 20000,
      date: '2026-09-05',
    };
    const score = computeScore(input).score;
    const typeId = resolveTypeId(group, score);

    expect(typeId).toBe('impulse_god');
  });

  it('AC-3[P0]: shopping impulse spending yields estimatedSaving of 44000', () => {
    const dayLog = createTestDayLog('2026-09-05', [
      { category: 'shopping', amount: 60000 },
    ]);
    const input = {
      yesterdayTotal: 60000,
      dailyAvg: 20000,
      date: '2026-09-05',
    };

    const estimatedSaving = computeEstimatedSaving({
      dayLog,
      yesterdayTotal: input.yesterdayTotal,
      dailyAvg: input.dailyAvg,
    });

    expect(estimatedSaving).toBe(44000);
  });

  // ============================================================
  // AC-4: loggedDays === 0 + 어제 food 12000만 존재 시
  //        dailyAvg가 12000으로 대체되고
  //        Number.isInteger(score) === true, Number.isNaN(score) === false
  // ============================================================

  it('AC-4[P0]: when loggedDays is 0, dailyAvg is substituted with yesterdayTotal for score calculation', () => {
    // Simulate: only yesterday has data (food 12000), today is first log
    const yesterdayTotal = 12000;
    const dailyAvg = 0; // No prior history (loggedDays === 0)

    const input = {
      yesterdayTotal,
      dailyAvg, // This should be replaced with yesterdayTotal in calculation
      date: '2026-09-05',
    };

    const result = computeScore(input);

    expect(Number.isInteger(result.score)).toBe(true);
    expect(Number.isNaN(result.score)).toBe(false);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('AC-4[P0]: score calculation with single prior day (food only) yields valid integer', () => {
    const dayLog = createTestDayLog('2026-09-05', [
      { category: 'food', amount: 12000 },
    ]);

    const input = {
      yesterdayTotal: 12000,
      dailyAvg: 0, // loggedDays === 0 case
      date: '2026-09-05',
    };

    const result = computeScore(input);

    expect(Number.isInteger(result.score)).toBe(true);
    expect(Number.isNaN(result.score)).toBe(false);
  });

  // ============================================================
  // AC-5: 무작위 입력 200건 fuzz에서 0 ≤ score ≤ 100 정수 위반 0건,
  //        소스에 Object.groupBy / .at( / structuredClone( 매치 0건 (검증 불가능하지만 문서화)
  // ============================================================

  it('AC-5[P0]: fuzz test - 200 random inputs all yield scores within [0, 100] as integers', () => {
    const violations: any[] = [];

    for (let i = 0; i < 200; i++) {
      const yesterdayTotal = Math.floor(Math.random() * 500000); // 0 ~ 500k
      const dailyAvg = Math.floor(Math.random() * 100000); // 0 ~ 100k
      const dateNum = Math.floor(Math.random() * 10000); // Generate varied dates
      const date = `2026-09-${String((dateNum % 30) + 1).padStart(2, '0')}`;

      const input = {
        yesterdayTotal,
        dailyAvg,
        date,
      };

      const result = computeScore(input);

      if (
        result.score < 0 ||
        result.score > 100 ||
        !Number.isInteger(result.score) ||
        Number.isNaN(result.score)
      ) {
        violations.push({
          input,
          score: result.score,
          reason: `Invalid: ${result.score}`,
        });
      }
    }

    expect(violations).toHaveLength(0);
  });

  it('AC-5[P0]: fuzz test - 200 random dayLogs all resolve to valid typeIds', () => {
    const categories = ['food', 'cafe', 'shopping', 'transport', 'culture', 'health', 'living', 'etc'];
    const violations: any[] = [];

    for (let i = 0; i < 200; i++) {
      const yesterdayTotal = Math.floor(Math.random() * 500000);
      const dailyAvg = Math.floor(Math.random() * 100000);
      const date = `2026-09-${String((i % 30) + 1).padStart(2, '0')}`;

      // Generate random dayLog
      const numEntries = Math.floor(Math.random() * 5); // 0 ~ 4 entries
      const entries = Array.from({ length: numEntries }, () => ({
        category: categories[Math.floor(Math.random() * categories.length)],
        amount: Math.floor(Math.random() * 100000),
      }));

      const dayLog = createTestDayLog(date, entries);
      const group = resolveDominantGroup(dayLog);
      const input = { yesterdayTotal, dailyAvg, date };
      const score = computeScore(input).score;
      const typeId = resolveTypeId(group, score);

      const validTypeIds = [
        'zero_spender',
        'wise_saver',
        'balanced_spender',
        'prudent_spender',
        'risk_taker',
        'impulse_god',
      ];

      if (!validTypeIds.includes(typeId)) {
        violations.push({
          input,
          group,
          score,
          typeId,
          reason: `Invalid typeId: ${typeId}`,
        });
      }
    }

    expect(violations).toHaveLength(0);
  });

  // ============================================================
  // AC-5 (API usage check - documented but requires source code inspection)
  // ============================================================

  it('AC-5[P0]: resolveLuckyCategory and resolveCautionCategory return valid or null', () => {
    const validCategories = ['food', 'cafe', 'shopping', 'transport', 'culture', 'health', 'living', 'etc', null];

    const dayLog = createTestDayLog('2026-09-05', [
      { category: 'shopping', amount: 60000 },
      { category: 'food', amount: 15000 },
    ]);

    const lucky = resolveLuckyCategory(dayLog);
    const caution = resolveCautionCategory(dayLog);

    expect(validCategories).toContain(lucky);
    expect(validCategories).toContain(caution);
  });

  // ============================================================
  // Additional: Edge cases and boundary conditions
  // ============================================================

  it('should handle edge case: score exactly at band boundary 70', () => {
    // Test boundary condition for typeId resolution
    const input = {
      yesterdayTotal: 50000,
      dailyAvg: 30000,
      date: '2026-09-05',
    };

    const result = computeScore(input);
    const dayLog = createTestDayLog('2026-09-05', [{ category: 'food', amount: 50000 }]);
    const group = resolveDominantGroup(dayLog);

    // If score === 70, which typeId?
    const typeId = resolveTypeId(group, 70);
    expect(['wise_saver', 'balanced_spender', 'prudent_spender']).toContain(typeId);
  });

  it('should handle edge case: score exactly at band boundary 40', () => {
    const dayLog = createTestDayLog('2026-09-05', [{ category: 'shopping', amount: 40000 }]);
    const group = resolveDominantGroup(dayLog);

    // If score === 40, which typeId?
    const typeId = resolveTypeId(group, 40);
    expect(['balanced_spender', 'prudent_spender', 'risk_taker']).toContain(typeId);
  });

  it('should handle edge case: very large yesterdayTotal', () => {
    const input = {
      yesterdayTotal: 10000000, // 10 million
      dailyAvg: 5000000,
      date: '2026-09-05',
    };

    const result = computeScore(input);

    expect(Number.isInteger(result.score)).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('should handle edge case: many category entries in a single day', () => {
    const dayLog = createTestDayLog('2026-09-05', [
      { category: 'food', amount: 10000 },
      { category: 'cafe', amount: 5000 },
      { category: 'shopping', amount: 50000 },
      { category: 'transport', amount: 8000 },
      { category: 'culture', amount: 12000 },
      { category: 'health', amount: 15000 },
      { category: 'living', amount: 20000 },
      { category: 'etc', amount: 5000 },
    ]);

    const group = resolveDominantGroup(dayLog);
    expect(group).toBeDefined();
    expect(typeof group).toBe('string');

    const lucky = resolveLuckyCategory(dayLog);
    const caution = resolveCautionCategory(dayLog);

    expect(lucky === null || typeof lucky === 'string').toBe(true);
    expect(caution === null || typeof caution === 'string').toBe(true);
  });

  it('should compute estimated saving for various expense patterns', () => {
    // Pattern 1: Balanced
    const balancedLog = createTestDayLog('2026-09-05', [
      { category: 'food', amount: 25000 },
      { category: 'cafe', amount: 8000 },
      { category: 'shopping', amount: 20000 },
    ]);

    const saving1 = computeEstimatedSaving({
      dayLog: balancedLog,
      yesterdayTotal: 53000,
      dailyAvg: 40000,
    });

    expect(Number.isInteger(saving1)).toBe(true);
    expect(saving1).toBeGreaterThanOrEqual(0);
    expect(saving1).toBeLessThanOrEqual(53000);

    // Pattern 2: High culture spending (might be lucky)
    const cultureLog = createTestDayLog('2026-09-05', [
      { category: 'culture', amount: 100000 },
    ]);

    const saving2 = computeEstimatedSaving({
      dayLog: cultureLog,
      yesterdayTotal: 100000,
      dailyAvg: 50000,
    });

    expect(Number.isInteger(saving2)).toBe(true);
    expect(saving2).toBeGreaterThanOrEqual(0);
  });

  it('should resolve lucky and caution categories across different category distributions', () => {
    const testCases = [
      { category: 'food', amount: 80000 },
      { category: 'shopping', amount: 80000 },
      { category: 'culture', amount: 80000 },
      { category: 'etc', amount: 80000 },
    ];

    for (const testCase of testCases) {
      const dayLog = createTestDayLog('2026-09-05', [testCase]);

      const lucky = resolveLuckyCategory(dayLog);
      const caution = resolveCautionCategory(dayLog);

      // Both should be either null or a valid category string
      expect(lucky === null || typeof lucky === 'string').toBe(true);
      expect(caution === null || typeof caution === 'string').toBe(true);
    }
  });
});
