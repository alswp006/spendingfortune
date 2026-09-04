import { describe, it, expect, vi, beforeEach } from "vitest";
import * as storage from "@/lib/storage";
import { STORAGE_KEYS, type DayLog, type FortuneRecord } from "@/lib/types";

function dateAt(offsetDays: number): string {
  const base = new Date(Date.UTC(2026, 0, 1));
  base.setUTCDate(base.getUTCDate() + offsetDays);
  return base.toISOString().slice(0, 10);
}

function makeDayLog(date: string): DayLog {
  return { date, entries: [], noSpend: true, total: 0, updatedAt: Date.parse(date) };
}

function makeFortune(date: string): FortuneRecord {
  return {
    date,
    basisDate: date,
    score: 50,
    typeId: "balance_master",
    headline: "오늘도 무난했어요",
    advice: "이대로 유지해보세요",
    savingTip: "고정비를 점검해보세요",
    luckyCategory: "food",
    cautionCategory: null,
    estimatedSaving: 0,
    alerts: [],
    yesterdayTotal: 0,
    unlocked: false,
    createdAt: Date.parse(date),
  };
}

describe("storage retention & quota handling", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("AC-1: saveDayLog evicts the oldest date once retention exceeds 90 days", () => {
    for (let i = 0; i < 91; i++) {
      storage.saveDayLog(makeDayLog(dateAt(i)));
    }
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.dayLogs) ?? "{}");
    expect(Object.keys(stored)).toHaveLength(90);
    expect(stored[dateAt(0)]).toBeUndefined();
    expect(stored[dateAt(90)]).toBeDefined();
  });

  it("AC-2: saveFortune keeps only 30 records and getFortune returns a deep-equal record", () => {
    for (let i = 0; i < 31; i++) {
      storage.saveFortune(makeFortune(dateAt(i)));
    }
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.fortunes) ?? "{}");
    expect(Object.keys(stored)).toHaveLength(30);

    const record = storage.getFortune(dateAt(30));
    expect(record).toEqual(makeFortune(dateAt(30)));
  });

  it("AC-3: saveDayLog degrades to QUOTA_EXCEEDED without throwing when setItem always throws", () => {
    // pre-seed valid empty maps so read functions never take the self-repair write path
    localStorage.setItem(STORAGE_KEYS.dayLogs, "{}");
    localStorage.setItem(STORAGE_KEYS.fortunes, "{}");

    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota exceeded", "QuotaExceededError");
    });
    const getItemSpy = vi.spyOn(Storage.prototype, "getItem");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    let result: ReturnType<typeof storage.saveDayLog> | undefined;
    expect(() => {
      result = storage.saveDayLog(makeDayLog("2026-09-05"));
    }).not.toThrow();

    expect(result).toEqual({ ok: false, reason: "QUOTA_EXCEEDED" });
    expect(errorSpy).not.toHaveBeenCalled();
    expect(setItemSpy).toHaveBeenCalledTimes(2);

    // fortunes map is only ever read by pruneStorage during this saveDayLog flow —
    // exactly one read proves pruneStorage ran exactly once
    const fortunesReads = getItemSpy.mock.calls.filter(([key]) => key === STORAGE_KEYS.fortunes);
    expect(fortunesReads).toHaveLength(1);
  });

  it("AC-4: pruneStorage returns integer removal counts", () => {
    for (let i = 0; i < 5; i++) {
      storage.saveDayLog(makeDayLog(dateAt(i)));
      storage.saveFortune(makeFortune(dateAt(i)));
    }
    const result = storage.pruneStorage();
    expect(Number.isInteger(result.removedDayLogs)).toBe(true);
    expect(Number.isInteger(result.removedFortunes)).toBe(true);
  });

  it("AC-5: pruneFortunes removes fortunes beyond the 30-day retention and reports the count", async () => {
    for (let i = 0; i < 35; i++) {
      storage.saveFortune(makeFortune(dateAt(i)));
    }
    // saveFortune already evicts down to 30 as records are added, so a direct
    // write bypassing eviction is needed to prove pruneFortunes performs its own cleanup
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEYS.fortunes) ?? "{}");
    raw[dateAt(-1)] = makeFortune(dateAt(-1));
    raw[dateAt(-2)] = makeFortune(dateAt(-2));
    localStorage.setItem(STORAGE_KEYS.fortunes, JSON.stringify(raw));

    const result = await storage.pruneFortunes();

    expect(result.removedCount).toBe(2);
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.fortunes) ?? "{}");
    expect(Object.keys(stored)).toHaveLength(30);
    expect(stored[dateAt(-1)]).toBeUndefined();
    expect(stored[dateAt(-2)]).toBeUndefined();
  });
});
