import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getStats } from '@/lib/stats';
import { saveDayLog, getDayLog } from '@/lib/storage';
import { STORAGE_KEYS } from '@/lib/types';
import type { CategoryId, DayLog } from '@/lib/types';

/**
 * Packet heal-1-01: getStats 통계 모듈 신설 — 미해결 import 제거로 tsc·빌드 복구
 *
 * AC 1: TypeScript 컴파일 통과 (TS2307 0건)
 * AC 2: 프로덕션 빌드 통과 (Cannot find module 0건)
 * AC 3: 2026-08-29~2026-09-04 구간 특정 데이터 집계 정확성
 * AC 4: byCategory 8개 키 + Number.isFinite 검증
 * AC 5: 빈 데이터 처리 (NaN/Infinity 없음)
 * AC 6: 손상/noSpend 레코드 방어적 처리
 */

describe('Packet heal-1-01: getStats 통계 모듈', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // ============================================================================
  // AC 1: TypeScript 컴파일 통과 (TS2307 0건)
  // 검증: npx tsc --noEmit (bash에서 수동 실행)
  // 테스트는 구현이 타입 안전하다는 것을 확인
  // ============================================================================

  it('AC-1[P0]: getStats 함수는 정확한 타입 시그니처를 제공한다', () => {
    // getStats(endDate: string, days: number) → StatsResult
    // stats: { total: number; loggedDays: number; byCategory: Record<CategoryId, number>; dailyAvg: number }
    const stats = getStats('2026-09-04', 7);

    // 반환값이 정확한 구조를 가진다
    expect(stats).toHaveProperty('total');
    expect(stats).toHaveProperty('loggedDays');
    expect(stats).toHaveProperty('byCategory');
    expect(stats).toHaveProperty('dailyAvg');

    // 타입 안전성: 모든 값이 예상 타입을 가진다
    expect(typeof stats.total).toBe('number');
    expect(typeof stats.loggedDays).toBe('number');
    expect(typeof stats.byCategory).toBe('object');
    expect(typeof stats.dailyAvg).toBe('number');
  });

  // ============================================================================
  // AC 2: 프로덕션 빌드 통과 (Cannot find module 0건)
  // 검증: npm run build (bash에서 수동 실행)
  // 테스트는 모든 의존성(storage, types, date 등)이 올바르게 해석된다는 것을 확인
  // ============================================================================

  it('AC-2[P0]: 모든 의존성(storage/types/date)이 올바르게 해석되고 빌드 가능하다', () => {
    // getDayLog, saveDayLog 등 storage 모듈이 정상 import됨을 확인
    const dayLog: DayLog = {
      date: '2026-09-04',
      entries: [
        { id: '1', category: 'food', amount: 30000, memo: '', createdAt: 0 },
      ],
      noSpend: false,
      total: 30000,
      updatedAt: Date.now(),
    };

    const result = saveDayLog(dayLog);
    expect(result.ok).toBe(true);

    if (result.ok) {
      const retrieved = getDayLog('2026-09-04');
      expect(retrieved.total).toBe(30000);
    }
  });

  // ============================================================================
  // AC 3[P0]: 2026-08-29~2026-09-04 구간 데이터 집계 (3일, 3 카테고리)
  // ============================================================================

  it('AC-3[P0]: 2026-08-29~2026-09-04 구간에 food/cafe/shopping 각 1건씩 기록 → total:100000, loggedDays:3, dailyAvg:33333', () => {
    // 3가지 카테고리, 3가지 다른 날짜에 각 1건씩 기록
    const entries = [
      { date: '2026-08-29', category: 'food' as CategoryId, amount: 30000 },
      { date: '2026-09-01', category: 'cafe' as CategoryId, amount: 10000 },
      { date: '2026-09-04', category: 'shopping' as CategoryId, amount: 60000 },
    ];

    for (const entry of entries) {
      saveDayLog({
        date: entry.date,
        entries: [
          {
            id: `${entry.date}-${entry.category}`,
            category: entry.category,
            amount: entry.amount,
            memo: '',
            createdAt: 0,
          },
        ],
        noSpend: false,
        total: 0,
        updatedAt: 0,
      });
    }

    const stats = getStats('2026-09-04', 7);

    // 정확한 값 검증
    expect(stats.total).toBe(100000);
    expect(stats.loggedDays).toBe(3);
    expect(stats.dailyAvg).toBe(33333); // Math.round(100000 / 3) = 33333
  });

  it('AC-3[P0]: byCategory는 정확한 카테고리별 합계를 반영한다', () => {
    // 같은 카테고리 여러 건 + 다른 카테고리
    saveDayLog({
      date: '2026-09-04',
      entries: [
        { id: '1', category: 'food', amount: 15000, memo: '', createdAt: 0 },
        { id: '2', category: 'food', amount: 15000, memo: '', createdAt: 0 },
        { id: '3', category: 'shopping', amount: 50000, memo: '', createdAt: 0 },
      ],
      noSpend: false,
      total: 0,
      updatedAt: 0,
    });

    const stats = getStats('2026-09-04', 1);

    // 카테고리별 정확한 합계
    expect(stats.byCategory.food).toBe(30000);
    expect(stats.byCategory.shopping).toBe(50000);
    expect(stats.total).toBe(80000);
  });

  // ============================================================================
  // AC 4[P0]: byCategory 구조 검증 (8개 키, 모든 값 Number.isFinite)
  // ============================================================================

  it('AC-4[P0]: byCategory는 정확히 8개의 카테고리 키를 가지며 모든 값이 Number.isFinite를 만족한다', () => {
    const stats = getStats('2026-09-04', 7);

    const categories: CategoryId[] = [
      'food',
      'cafe',
      'shopping',
      'transport',
      'culture',
      'health',
      'living',
      'etc',
    ];

    // 8개 카테고리가 모두 존재
    for (const cat of categories) {
      expect(stats.byCategory).toHaveProperty(cat);
    }

    // 정확히 8개 키
    const keys = Object.keys(stats.byCategory);
    expect(keys).toHaveLength(8);

    // 모든 값이 Number.isFinite를 만족
    for (const cat of categories) {
      expect(Number.isFinite(stats.byCategory[cat])).toBe(true);
    }
  });

  it('AC-4[P0]: byCategory의 모든 값은 유효한 숫자이며 undefined/NaN가 아니다', () => {
    saveDayLog({
      date: '2026-09-04',
      entries: [
        { id: '1', category: 'food', amount: 25000, memo: '', createdAt: 0 },
      ],
      noSpend: false,
      total: 0,
      updatedAt: 0,
    });

    const stats = getStats('2026-09-04', 7);

    for (const [key, value] of Object.entries(stats.byCategory)) {
      expect(value).not.toBeNaN();
      expect(value).not.toBeUndefined();
      expect(typeof value).toBe('number');
    }
  });

  // ============================================================================
  // AC 5[P0]: 빈 데이터 처리 (NaN/Infinity 없음)
  // ============================================================================

  it('AC-5[P0]: 기록이 0건이면 total:0, loggedDays:0, dailyAvg:0', () => {
    const stats = getStats('2026-09-04', 7);

    expect(stats.total).toBe(0);
    expect(stats.loggedDays).toBe(0);
    expect(stats.dailyAvg).toBe(0);
  });

  it('AC-5[P0]: JSON.stringify(stats) 결과에 "NaN" 또는 "Infinity" 문자열이 없다', () => {
    const stats = getStats('2026-09-04', 7);

    const json = JSON.stringify(stats);

    expect(json).not.toContain('NaN');
    expect(json).not.toContain('Infinity');
  });

  it('AC-5[P0]: dailyAvg가 0으로 나누지 않는 경우, Math.round 결과가 정확하다', () => {
    // 3일 기록 → dailyAvg = Math.round(total / 3)
    saveDayLog({
      date: '2026-09-02',
      entries: [{ id: '1', category: 'food', amount: 10000, memo: '', createdAt: 0 }],
      noSpend: false,
      total: 0,
      updatedAt: 0,
    });
    saveDayLog({
      date: '2026-09-03',
      entries: [{ id: '2', category: 'cafe', amount: 20000, memo: '', createdAt: 0 }],
      noSpend: false,
      total: 0,
      updatedAt: 0,
    });
    saveDayLog({
      date: '2026-09-04',
      entries: [{ id: '3', category: 'shopping', amount: 30000, memo: '', createdAt: 0 }],
      noSpend: false,
      total: 0,
      updatedAt: 0,
    });

    const stats = getStats('2026-09-04', 3);

    expect(stats.total).toBe(60000);
    expect(stats.loggedDays).toBe(3);
    expect(stats.dailyAvg).toBe(20000); // Math.round(60000 / 3) = 20000
  });

  // ============================================================================
  // AC 6[P0]: 손상/noSpend 레코드 방어적 처리
  // ============================================================================

  it('AC-6[P0]: 손상된 레코드(total이 문자열 등)는 예외를 던지지 않고 집계에서 제외된다', () => {
    // 유효한 레코드 하나 저장
    saveDayLog({
      date: '2026-09-03',
      entries: [{ id: '1', category: 'food', amount: 20000, memo: '', createdAt: 0 }],
      noSpend: false,
      total: 0,
      updatedAt: 0,
    });

    // 손상된 레코드를 직접 localStorage에 주입
    const raw = localStorage.getItem(STORAGE_KEYS.dayLogs);
    const map = raw ? JSON.parse(raw) : {};
    map['2026-09-02'] = {
      date: '2026-09-02',
      entries: [],
      noSpend: false,
      total: 'abc', // 손상: total이 문자열
      updatedAt: 0,
    };
    localStorage.setItem(STORAGE_KEYS.dayLogs, JSON.stringify(map));

    // 함수가 예외를 던지지 않음
    expect(() => {
      getStats('2026-09-04', 7);
    }).not.toThrow();

    const stats = getStats('2026-09-04', 7);

    // 손상된 레코드는 제외, 유효한 레코드만 집계
    expect(stats.total).toBe(20000);
    expect(stats.loggedDays).toBe(1);
  });

  it('AC-6[P0]: noSpend:true 레코드는 loggedDays에 포함되고 total에는 포함되지 않는다', () => {
    // noSpend 날짜
    saveDayLog({
      date: '2026-09-02',
      entries: [],
      noSpend: true, // 무지출 마크
      total: 0,
      updatedAt: 0,
    });

    // 지출 있는 날짜
    saveDayLog({
      date: '2026-09-03',
      entries: [{ id: '1', category: 'food', amount: 15000, memo: '', createdAt: 0 }],
      noSpend: false,
      total: 0,
      updatedAt: 0,
    });

    const stats = getStats('2026-09-04', 7);

    // loggedDays: noSpend 포함하여 2일
    expect(stats.loggedDays).toBe(2);

    // total: 지출만 포함하여 15000
    expect(stats.total).toBe(15000);

    // dailyAvg: Math.round(15000 / 2) = 7500
    expect(stats.dailyAvg).toBe(7500);
  });

  it('AC-6[P0]: 범위 밖 날짜(startDate 이전/endDate 이후)는 제외되고 범위 내 날짜만 집계된다', () => {
    // 범위 전: 2026-08-20 (7일 범위 밖)
    saveDayLog({
      date: '2026-08-20',
      entries: [
        { id: 'out1', category: 'food', amount: 100000, memo: '', createdAt: 0 },
      ],
      noSpend: false,
      total: 0,
      updatedAt: 0,
    });

    // 범위 내: 2026-09-04 (endDate)
    saveDayLog({
      date: '2026-09-04',
      entries: [
        { id: 'in1', category: 'cafe', amount: 5000, memo: '', createdAt: 0 },
      ],
      noSpend: false,
      total: 0,
      updatedAt: 0,
    });

    // 범위 후: 2026-09-10 (7일 범위 밖)
    saveDayLog({
      date: '2026-09-10',
      entries: [
        { id: 'out2', category: 'shopping', amount: 200000, memo: '', createdAt: 0 },
      ],
      noSpend: false,
      total: 0,
      updatedAt: 0,
    });

    // 7일 범위로 조회 (2026-08-29 ~ 2026-09-04)
    const stats = getStats('2026-09-04', 7);

    // 범위 내 항목만 집계 (5000원)
    expect(stats.total).toBe(5000);
    expect(stats.loggedDays).toBe(1);
    expect(stats.byCategory.cafe).toBe(5000);
    expect(stats.byCategory.food).toBe(0); // 범위 밖 제외
    expect(stats.byCategory.shopping).toBe(0); // 범위 밖 제외
  });

  // ============================================================================
  // Integration: 복합 시나리오
  // ============================================================================

  it('Integration: 실제 사용 패턴 — 다양한 날짜·카테고리·noSpend 섞임', () => {
    // 날짜 1: 식비 + 카페
    saveDayLog({
      date: '2026-08-29',
      entries: [
        { id: '1', category: 'food', amount: 15000, memo: '', createdAt: 0 },
        { id: '2', category: 'cafe', amount: 5000, memo: '', createdAt: 0 },
      ],
      noSpend: false,
      total: 0,
      updatedAt: 0,
    });

    // 날짜 2: 무지출
    saveDayLog({
      date: '2026-08-30',
      entries: [],
      noSpend: true,
      total: 0,
      updatedAt: 0,
    });

    // 날짜 3: 쇼핑
    saveDayLog({
      date: '2026-09-01',
      entries: [{ id: '3', category: 'shopping', amount: 100000, memo: '', createdAt: 0 }],
      noSpend: false,
      total: 0,
      updatedAt: 0,
    });

    const stats = getStats('2026-09-04', 7);

    // 검증
    expect(stats.total).toBe(120000); // 15000 + 5000 + 100000
    expect(stats.loggedDays).toBe(3); // 3일 (무지출 포함)
    expect(stats.byCategory.food).toBe(15000);
    expect(stats.byCategory.cafe).toBe(5000);
    expect(stats.byCategory.shopping).toBe(100000);
    expect(stats.dailyAvg).toBe(40000); // Math.round(120000 / 3)

    // byCategory 모든 키 유효성
    const categories: CategoryId[] = [
      'food',
      'cafe',
      'shopping',
      'transport',
      'culture',
      'health',
      'living',
      'etc',
    ];
    for (const cat of categories) {
      expect(Number.isFinite(stats.byCategory[cat])).toBe(true);
    }

    // JSON 직렬화 안전성
    const json = JSON.stringify(stats);
    expect(json).not.toContain('NaN');
    expect(json).not.toContain('Infinity');
  });
});
