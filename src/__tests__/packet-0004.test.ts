import { describe, it, expect, beforeEach, vi } from "vitest";
import { getDayLog, saveDayLog, listDayLogs, getMeta, patchMeta } from "@/lib/storage";
import type { DayLog, AppMeta } from "@/lib/types";

describe("저장소 CRUD + 입력 검증 + 손상 복구", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  // AC-1: saveDayLog + getDayLog basic flow
  it("AC-1: should save and retrieve DayLog from localStorage with correct total", () => {
    const dayLog: DayLog = {
      date: "2026-09-04",
      entries: [
        {
          id: "e1",
          category: "food",
          amount: 12000,
          memo: "점심",
          createdAt: 1757000000000,
        },
      ],
      noSpend: false,
      total: 12000,
      updatedAt: 1757000000000,
    };

    const saveResult = saveDayLog(dayLog);
    expect(saveResult.ok).toBe(true);

    // Verify key exists in localStorage
    const stored = JSON.parse(localStorage.getItem("sf.daylogs.v1") || "{}");
    expect(stored["2026-09-04"]).toBeDefined();

    // Verify retrieval
    const retrieved = getDayLog("2026-09-04");
    expect(retrieved.total).toBe(12000);
    expect(retrieved.entries).toHaveLength(1);
    expect(retrieved.entries[0].amount).toBe(12000);
  });

  // AC-2: total recalculation (ignoring caller's total)
  it("AC-2: should recalculate total from entries sum, ignoring caller's total", () => {
    const dayLog: DayLog = {
      date: "2026-09-05",
      entries: [
        {
          id: "e1",
          category: "food",
          amount: 10000,
          memo: "점심",
          createdAt: 1757000000000,
        },
        {
          id: "e2",
          category: "transport",
          amount: 5000,
          memo: "택시",
          createdAt: 1757000000001,
        },
      ],
      noSpend: false,
      total: 999, // intentionally wrong — should be recalculated
      updatedAt: 1757000000000,
    };

    const saveResult = saveDayLog(dayLog);
    expect(saveResult.ok).toBe(true);

    const retrieved = getDayLog("2026-09-05");
    expect(retrieved.total).toBe(15000); // 10000 + 5000, not 999
  });

  // AC-2b: noSpend normalization
  it("AC-2: should normalize entries and total to 0 when noSpend=true", () => {
    const dayLog: DayLog = {
      date: "2026-09-07",
      entries: [
        {
          id: "e1",
          category: "food",
          amount: 12000,
          memo: "점심",
          createdAt: 1757000000000,
        },
      ],
      noSpend: true,
      total: 12000, // will be overridden
      updatedAt: 1757000000000,
    };

    const saveResult = saveDayLog(dayLog);
    expect(saveResult.ok).toBe(true);

    const retrieved = getDayLog("2026-09-07");
    expect(retrieved.noSpend).toBe(true);
    expect(retrieved.entries).toEqual([]);
    expect(retrieved.total).toBe(0);
  });

  // AC-3: amount validation (0, >10M, decimal, NaN)
  it("AC-3: should reject invalid amounts (0, >10M, decimal, NaN) and not modify storage", () => {
    const invalidAmounts = [0, 10000001, 1.5, NaN];

    for (const amount of invalidAmounts) {
      localStorage.clear();
      const initialState = localStorage.getItem("sf.daylogs.v1") || "{}";

      const result = saveDayLog({
        date: "2026-09-06",
        entries: [
          {
            id: `e-${amount}`,
            category: "food",
            amount,
            memo: "",
            createdAt: Date.now(),
          },
        ],
        noSpend: false,
        total: amount,
        updatedAt: Date.now(),
      });

      expect(result.ok).toBe(false);
      expect(result.reason).toBe("INVALID_AMOUNT");
      expect(localStorage.getItem("sf.daylogs.v1")).toBe(initialState);
    }
  });

  // AC-4: corruption recovery
  it("AC-4: should recover from corrupted localStorage, return [], and initialize to '{}'", () => {
    localStorage.setItem("sf.daylogs.v1", "{{broken");

    const result = listDayLogs("2026-08-01", "2026-09-04");
    expect(result).toEqual([]);

    const recovered = localStorage.getItem("sf.daylogs.v1");
    expect(recovered).toBe("{}");
  });

  // AC-5: getMeta() returns DEFAULT_META when missing
  it("AC-5: should return DEFAULT_META when sf.meta.v1 missing", () => {
    localStorage.removeItem("sf.meta.v1");

    const meta = getMeta();

    // Verify it's a valid meta object with streakCount
    expect(typeof meta).toBe("object");
    expect(meta.streakCount).toBeGreaterThanOrEqual(0);
    expect(typeof meta.streakCount).toBe("number");
  });

  // AC-5b: patchMeta persists changes
  it("AC-5: should patchMeta and persist changes across getMeta calls", () => {
    localStorage.removeItem("sf.meta.v1");

    const patchResult = patchMeta({ streakCount: 3 });
    expect(patchResult.ok).toBe(true);

    const metaAfter = getMeta();
    expect(metaAfter.streakCount).toBe(3);
  });

  // AC-5c: no console.error in any path
  it("AC-5: should not call console.error in any storage operation", () => {
    const errorSpy = vi.spyOn(console, "error");

    localStorage.removeItem("sf.meta.v1");
    getMeta();
    patchMeta({ streakCount: 3 });
    getMeta();

    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
