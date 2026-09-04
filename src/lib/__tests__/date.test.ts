import { describe, it, expect } from 'vitest';
import { todayKST, addDays, formatDate, isValidDateKey } from '@/lib/date';
import fs from 'node:fs';
import path from 'node:path';

describe('todayKST', () => {
  it('AC-1: returns YYYY-MM-DD format', () => {
    expect(todayKST()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('AC-2: rolls over to next KST day near midnight boundary', () => {
    expect(todayKST(new Date('2026-09-04T23:30:00Z'))).toBe('2026-09-05');
    expect(todayKST(new Date('2026-09-04T00:10:00Z'))).toBe('2026-09-04');
  });
});

describe('addDays', () => {
  it('AC-3: handles month/year/leap-year boundaries', () => {
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });
});

describe('formatDate', () => {
  it('formats date as "9월 4일"', () => {
    expect(formatDate('2026-09-04')).toBe('9월 4일');
  });
});

describe('isValidDateKey', () => {
  it('AC-4: rejects non-padded and accepts padded dates', () => {
    expect(isValidDateKey('2026-9-4')).toBe(false);
    expect(isValidDateKey('2026-09-04')).toBe(true);
  });

  it('rejects out-of-range values', () => {
    expect(isValidDateKey('2026-13-01')).toBe(false);
    expect(isValidDateKey('2026-02-30')).toBe(false);
  });
});

describe('source constraints', () => {
  it('AC-5: never uses .at(, Object.groupBy, or structuredClone(', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../date.ts'), 'utf-8');
    expect(src.includes('.at(')).toBe(false);
    expect(src.includes('Object.groupBy')).toBe(false);
    expect(src.includes('structuredClone(')).toBe(false);
  });
});
