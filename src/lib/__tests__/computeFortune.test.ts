import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computeFortune, unlockFortune } from '@/lib/computeFortune';
import * as storage from '@/lib/storage';
import { saveDayLog } from '@/lib/storage';
import { addDays } from '@/lib/date';
import { STORAGE_KEYS } from '@/lib/types';

const DATE = '2026-09-05';
const BASIS_DATE = '2026-09-04';

function seedBasisDayLog() {
  saveDayLog({
    date: BASIS_DATE,
    entries: [{ id: 'e1', category: 'food', amount: 12000, memo: '점심', createdAt: 1 }],
    noSpend: false,
    total: 12000,
    updatedAt: 1,
  });
}

describe('computeFortune', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('AC-1: 캐시가 있으면 재계산·재저장 없이 즉시 반환한다', () => {
    seedBasisDayLog();
    const first = computeFortune(DATE);
    expect(first.ok).toBe(true);

    const saveSpy = vi.spyOn(storage, 'saveFortune');
    const second = computeFortune(DATE);

    expect(second.ok).toBe(true);
    expect(saveSpy).not.toHaveBeenCalled();
    if (first.ok && second.ok) {
      expect(second.value.createdAt).toBe(first.value.createdAt);
    }
  });

  it('AC-2: basisDate의 DayLog가 없으면 NO_BASIS_LOG를 반환하고 저장소를 건드리지 않는다', () => {
    const result = computeFortune(DATE);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('NO_BASIS_LOG');
    }
    expect(localStorage.getItem(STORAGE_KEYS.fortunes)).toBeNull();
  });

  it('AC-3: 생성 레코드가 문구 길이·alerts 개수·unlocked·basisDate 제약을 만족한다', () => {
    seedBasisDayLog();
    const result = computeFortune(DATE);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const record = result.value;

    expect(record.headline.length).toBeLessThanOrEqual(40);
    expect(record.advice.length).toBeLessThanOrEqual(80);
    expect(record.savingTip.length).toBeLessThanOrEqual(60);
    expect(record.alerts.length).toBeLessThanOrEqual(2);
    expect(record.unlocked).toBe(false);
    expect(record.basisDate).toBe(addDays(DATE, -1));
  });

  it('AC-4: unlockFortune 호출 후 unlocked만 true로 바뀌고 나머지 필드는 그대로다', () => {
    seedBasisDayLog();
    const created = computeFortune(DATE);
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const unlockResult = unlockFortune(DATE);
    expect(unlockResult.ok).toBe(true);

    const after = computeFortune(DATE);
    expect(after.ok).toBe(true);
    if (!after.ok) return;

    expect(after.value.unlocked).toBe(true);
    expect(after.value.date).toBe(created.value.date);
    expect(after.value.basisDate).toBe(created.value.basisDate);
    expect(after.value.score).toBe(created.value.score);
    expect(after.value.typeId).toBe(created.value.typeId);
    expect(after.value.headline).toBe(created.value.headline);
    expect(after.value.advice).toBe(created.value.advice);
    expect(after.value.savingTip).toBe(created.value.savingTip);
    expect(after.value.createdAt).toBe(created.value.createdAt);
  });
});
