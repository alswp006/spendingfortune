import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DayLog, FortuneRecord } from "@/lib/types";

// Mock dependencies at module level
vi.mock("@/lib/dayLog");
vi.mock("@/lib/storage");
vi.mock("@/lib/fortuneEngine", () => ({
  scoreAndClassify: vi.fn().mockReturnValue({ score: 85, type: "lucky" }),
  getHeadline: vi.fn().mockReturnValue("오늘은 좋은 날"),
  getAdvice: vi.fn().mockReturnValue("긍정적으로 생각하세요"),
  getSavingTip: vi.fn().mockReturnValue("저축을 하세요"),
}));
vi.mock("@/lib/alerts", () => ({
  detectAlerts: vi.fn().mockReturnValue([]),
}));
vi.mock("@/lib/stats", () => ({
  getStats: vi.fn().mockReturnValue({ savingRate: 0.6 }),
}));

import { computeFortune, unlockFortune } from "@/lib/computeFortune";
import { getDayLog } from "@/lib/dayLog";
import { getFortune as storageFortune, saveFortune } from "@/lib/storage";
import { addDays } from "@/lib/dateUtils";

const mockGetDayLog = getDayLog as ReturnType<typeof vi.fn>;
const mockSaveFortune = saveFortune as ReturnType<typeof vi.fn>;
const mockStorageFortune = storageFortune as ReturnType<typeof vi.fn>;

describe("packet-0009: computeFortune 오케스트레이션(캐시·근거 가드·저장)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  // ==================== AC-1: Cache Hit Test ====================
  describe("AC-1: Cache Management", () => {
    it("AC-1[P0]: 기존 Fortune 레코드가 있으면 재호출 시 saveFortune을 호출하지 않음", () => {
      const date = "2026-09-05";
      const existingRecord: FortuneRecord = {
        date,
        basisDate: "2026-09-04",
        score: 85,
        type: "lucky",
        headline: "오늘은 좋은 날",
        advice: "긍정적으로 생각하세요",
        savingTip: "저축을 하세요",
        alerts: [],
        unlocked: false,
        createdAt: "2026-09-05T10:00:00Z",
      };

      mockStorageFortune.mockReturnValue(existingRecord);

      // First call
      const result1 = computeFortune(date);
      // Second call
      const result2 = computeFortune(date);

      expect(result1.ok).toBe(true);
      expect(result2.ok).toBe(true);
      expect(result1.data?.createdAt).toBe(existingRecord.createdAt);
      expect(result2.data?.createdAt).toBe(existingRecord.createdAt);
      expect(mockSaveFortune).not.toHaveBeenCalled();
    });

    it("AC-1[P0]: 첫 호출 시는 saveFortune을 정확히 1회 호출함", () => {
      const date = "2026-09-05";
      const basisDate = "2026-09-04";

      mockStorageFortune.mockReturnValue(null); // No cache
      mockGetDayLog.mockReturnValue({
        date: basisDate,
        income: 5000000,
        expense: 2000000,
      } as DayLog);

      const result = computeFortune(date);

      expect(result.ok).toBe(true);
      expect(mockSaveFortune).toHaveBeenCalledTimes(1);
      expect(mockSaveFortune).toHaveBeenCalledWith(
        expect.objectContaining({
          date,
          basisDate,
        })
      );
    });
  });

  // ==================== AC-2: Basis Log Guard ====================
  describe("AC-2: Basis Log Guard (NO_BASIS_LOG)", () => {
    it("AC-2[P0]: getDayLog('2026-09-04') === null일 때 { ok:false, reason:'NO_BASIS_LOG' } 반환", () => {
      const date = "2026-09-05";

      mockStorageFortune.mockReturnValue(null);
      mockGetDayLog.mockReturnValue(null);

      const result = computeFortune(date);

      expect(result.ok).toBe(false);
      expect(result.reason).toBe("NO_BASIS_LOG");
      expect(result.data).toBeUndefined();
    });

    it("AC-2[P0]: 근거 로그 없을 때 saveFortune을 호출하지 않음", () => {
      const date = "2026-09-05";

      mockStorageFortune.mockReturnValue(null);
      mockGetDayLog.mockReturnValue(null);

      computeFortune(date);

      expect(mockSaveFortune).not.toHaveBeenCalled();
    });
  });

  // ==================== AC-3: Record Structure & Constraints ====================
  describe("AC-3: Fortune Record Structure", () => {
    it("AC-3: 생성 레코드가 headline ≤ 40, advice ≤ 80, savingTip ≤ 60을 만족", () => {
      const date = "2026-09-05";
      const basisDate = "2026-09-04";

      mockStorageFortune.mockReturnValue(null);
      mockGetDayLog.mockReturnValue({
        date: basisDate,
        income: 5000000,
        expense: 2000000,
      } as DayLog);

      const result = computeFortune(date);

      expect(result.ok).toBe(true);
      const record = result.data!;
      expect(record.headline.length).toBeLessThanOrEqual(40);
      expect(record.headline.length).toBeGreaterThan(0);
      expect(record.advice.length).toBeLessThanOrEqual(80);
      expect(record.advice.length).toBeGreaterThan(0);
      expect(record.savingTip.length).toBeLessThanOrEqual(60);
      expect(record.savingTip.length).toBeGreaterThan(0);
    });

    it("AC-3: 생성 레코드가 alerts.length ≤ 2를 만족", () => {
      const date = "2026-09-05";
      const basisDate = "2026-09-04";

      mockStorageFortune.mockReturnValue(null);
      mockGetDayLog.mockReturnValue({
        date: basisDate,
        income: 5000000,
        expense: 2000000,
      } as DayLog);

      const result = computeFortune(date);

      expect(result.ok).toBe(true);
      const record = result.data!;
      expect(Array.isArray(record.alerts)).toBe(true);
      expect(record.alerts.length).toBeLessThanOrEqual(2);
    });

    it("AC-3: 생성 레코드가 unlocked === false, basisDate === addDays(date,-1)을 만족", () => {
      const date = "2026-09-05";
      const basisDate = "2026-09-04";
      const expectedBasisDate = addDays(date, -1);

      mockStorageFortune.mockReturnValue(null);
      mockGetDayLog.mockReturnValue({
        date: basisDate,
        income: 5000000,
        expense: 2000000,
      } as DayLog);

      const result = computeFortune(date);

      expect(result.ok).toBe(true);
      const record = result.data!;
      expect(record.unlocked).toBe(false);
      expect(record.basisDate).toBe(expectedBasisDate);
    });

    it("AC-3: 생성 레코드가 date, score, type, createdAt을 포함함", () => {
      const date = "2026-09-05";
      const basisDate = "2026-09-04";

      mockStorageFortune.mockReturnValue(null);
      mockGetDayLog.mockReturnValue({
        date: basisDate,
        income: 5000000,
        expense: 2000000,
      } as DayLog);

      const result = computeFortune(date);

      expect(result.ok).toBe(true);
      const record = result.data!;
      expect(record.date).toBe(date);
      expect(record.score).toBeGreaterThanOrEqual(0);
      expect(record.score).toBeLessThanOrEqual(100);
      expect(record.type).toBeTruthy();
      expect(record.createdAt).toBeTruthy();
      expect(typeof record.createdAt).toBe("string");
    });
  });

  // ==================== AC-4: Unlock ====================
  describe("AC-4: Unlock Fortune", () => {
    it("AC-4: unlockFortune 호출 후 저장된 레코드의 unlocked === true로 변경됨", () => {
      const date = "2026-09-05";
      const originalRecord: FortuneRecord = {
        date,
        basisDate: "2026-09-04",
        score: 85,
        type: "lucky",
        headline: "오늘은 좋은 날",
        advice: "긍정적으로 생각하세요",
        savingTip: "저축을 하세요",
        alerts: [],
        unlocked: false,
        createdAt: "2026-09-05T10:00:00Z",
      };

      // Mock should return the updated record after saveFortune is called with unlocked:true
      let storedRecord = originalRecord;
      mockStorageFortune.mockImplementation(() => storedRecord);
      mockSaveFortune.mockImplementation((record) => {
        storedRecord = record;
      });

      // Unlock
      unlockFortune(date);

      // Verify saveFortune was called with unlocked:true
      expect(mockSaveFortune).toHaveBeenCalled();
      const savedCall = mockSaveFortune.mock.calls[0]?.[0];
      expect(savedCall?.unlocked).toBe(true);
    });

    it("AC-4: unlockFortune 호출 후 다른 필드는 모두 불변", () => {
      const date = "2026-09-05";
      const originalRecord: FortuneRecord = {
        date,
        basisDate: "2026-09-04",
        score: 85,
        type: "lucky",
        headline: "오늘은 좋은 날",
        advice: "긍정적으로 생각하세요",
        savingTip: "저축을 하세요",
        alerts: [],
        unlocked: false,
        createdAt: "2026-09-05T10:00:00Z",
      };

      let storedRecord = originalRecord;
      mockStorageFortune.mockImplementation(() => storedRecord);
      mockSaveFortune.mockImplementation((record) => {
        storedRecord = record;
      });

      unlockFortune(date);

      const savedCall = mockSaveFortune.mock.calls[0]?.[0];
      expect(savedCall?.date).toBe(originalRecord.date);
      expect(savedCall?.basisDate).toBe(originalRecord.basisDate);
      expect(savedCall?.score).toBe(originalRecord.score);
      expect(savedCall?.type).toBe(originalRecord.type);
      expect(savedCall?.headline).toBe(originalRecord.headline);
      expect(savedCall?.advice).toBe(originalRecord.advice);
      expect(savedCall?.savingTip).toBe(originalRecord.savingTip);
      expect(savedCall?.createdAt).toBe(originalRecord.createdAt);
    });
  });
});
