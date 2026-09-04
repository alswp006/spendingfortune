import { describe, it, expect, vi, beforeEach } from "vitest";
import { computeFortune, unlockFortune } from "@/lib/computeFortune";
import * as storage from "@/lib/storage";
import { saveDayLog } from "@/lib/storage";
import { addDays } from "@/lib/date";
import { STORAGE_KEYS } from "@/lib/types";

const DATE = "2026-09-05";
const BASIS_DATE = "2026-09-04";

function seedBasisDayLog() {
  saveDayLog({
    date: BASIS_DATE,
    entries: [{ id: "e1", category: "food", amount: 12000, memo: "점심", createdAt: 1 }],
    noSpend: false,
    total: 12000,
    updatedAt: 1,
  });
}

describe("packet-0009: computeFortune 오케스트레이션(캐시·근거 가드·저장)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ==================== AC-1: Cache Hit Test ====================
  describe("AC-1: Cache Management", () => {
    it("AC-1[P0]: 기존 Fortune 레코드가 있으면 재호출 시 saveFortune을 호출하지 않음", () => {
      seedBasisDayLog();
      const first = computeFortune(DATE);
      expect(first.ok).toBe(true);

      const saveSpy = vi.spyOn(storage, "saveFortune");
      const second = computeFortune(DATE);

      expect(second.ok).toBe(true);
      expect(saveSpy).not.toHaveBeenCalled();
      if (first.ok && second.ok) {
        expect(second.value.createdAt).toBe(first.value.createdAt);
      }
    });

    it("AC-1[P0]: 첫 호출 시는 saveFortune을 정확히 1회 호출함", () => {
      seedBasisDayLog();
      const saveSpy = vi.spyOn(storage, "saveFortune");

      const result = computeFortune(DATE);

      expect(result.ok).toBe(true);
      expect(saveSpy).toHaveBeenCalledTimes(1);
      expect(saveSpy).toHaveBeenCalledWith(
        expect.objectContaining({ date: DATE, basisDate: BASIS_DATE })
      );
    });
  });

  // ==================== AC-2: Basis Log Guard ====================
  describe("AC-2: Basis Log Guard (NO_BASIS_LOG)", () => {
    it("AC-2[P0]: basisDate의 DayLog가 없을 때 { ok:false, reason:'NO_BASIS_LOG' } 반환", () => {
      const result = computeFortune(DATE);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe("NO_BASIS_LOG");
      }
    });

    it("AC-2[P0]: 근거 로그 없을 때 sf.fortunes.v1을 생성하지 않음", () => {
      computeFortune(DATE);

      expect(localStorage.getItem(STORAGE_KEYS.fortunes)).toBeNull();
    });
  });

  // ==================== AC-3: Record Structure & Constraints ====================
  describe("AC-3: Fortune Record Structure", () => {
    it("AC-3: 생성 레코드가 headline ≤ 40, advice ≤ 80, savingTip ≤ 60을 만족", () => {
      seedBasisDayLog();
      const result = computeFortune(DATE);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const record = result.value;
      expect(record.headline.length).toBeLessThanOrEqual(40);
      expect(record.headline.length).toBeGreaterThan(0);
      expect(record.advice.length).toBeLessThanOrEqual(80);
      expect(record.advice.length).toBeGreaterThan(0);
      expect(record.savingTip.length).toBeLessThanOrEqual(60);
      expect(record.savingTip.length).toBeGreaterThan(0);
    });

    it("AC-3: 생성 레코드가 alerts.length ≤ 2를 만족", () => {
      seedBasisDayLog();
      const result = computeFortune(DATE);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const record = result.value;
      expect(Array.isArray(record.alerts)).toBe(true);
      expect(record.alerts.length).toBeLessThanOrEqual(2);
    });

    it("AC-3: 생성 레코드가 unlocked === false, basisDate === addDays(date,-1)을 만족", () => {
      seedBasisDayLog();
      const expectedBasisDate = addDays(DATE, -1);

      const result = computeFortune(DATE);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const record = result.value;
      expect(record.unlocked).toBe(false);
      expect(record.basisDate).toBe(expectedBasisDate);
    });

    it("AC-3: 생성 레코드가 date, score, typeId, createdAt을 포함함", () => {
      seedBasisDayLog();
      const result = computeFortune(DATE);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const record = result.value;
      expect(record.date).toBe(DATE);
      expect(record.score).toBeGreaterThanOrEqual(0);
      expect(record.score).toBeLessThanOrEqual(100);
      expect(record.typeId).toBeTruthy();
      expect(record.createdAt).toBeTruthy();
      expect(typeof record.createdAt).toBe("number");
    });
  });

  // ==================== AC-4: Unlock ====================
  describe("AC-4: Unlock Fortune", () => {
    it("AC-4: unlockFortune 호출 후 저장된 레코드의 unlocked === true로 변경됨", () => {
      seedBasisDayLog();
      const created = computeFortune(DATE);
      expect(created.ok).toBe(true);

      const saveSpy = vi.spyOn(storage, "saveFortune");
      unlockFortune(DATE);

      expect(saveSpy).toHaveBeenCalled();
      const savedCall = saveSpy.mock.calls[0]?.[0];
      expect(savedCall?.unlocked).toBe(true);
    });

    it("AC-4: unlockFortune 호출 후 다른 필드는 모두 불변", () => {
      seedBasisDayLog();
      const created = computeFortune(DATE);
      expect(created.ok).toBe(true);
      if (!created.ok) return;

      unlockFortune(DATE);
      const after = computeFortune(DATE);

      expect(after.ok).toBe(true);
      if (!after.ok) return;
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
});
