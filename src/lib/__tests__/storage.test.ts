import { describe, it, expect, beforeEach } from "vitest";
import { getDayLog, saveDayLog, listDayLogs, getMeta, patchMeta, saveFortune, getFortune } from "@/lib/storage";
import { DEFAULT_META, STORAGE_KEYS, type FortuneRecord } from "@/lib/types";

function makeFortune(date: string, overrides: Partial<FortuneRecord> = {}): FortuneRecord {
  return {
    date,
    basisDate: "2026-09-04",
    score: 63,
    typeId: "balance_master",
    headline: "오늘은 균형 잡힌 소비를 했어요",
    advice: "이 흐름을 유지해보세요",
    savingTip: "고정비를 한 번 점검해보세요",
    luckyCategory: "food",
    cautionCategory: null,
    estimatedSaving: 0,
    alerts: [],
    yesterdayTotal: 12000,
    unlocked: false,
    createdAt: 1757000000000,
    ...overrides,
  };
}

describe("storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("getDayLog returns a safe empty default when the date is missing", () => {
    const log = getDayLog("2026-01-01");
    expect(log.entries).toEqual([]);
    expect(log.total).toBe(0);
    expect(log.noSpend).toBe(false);
  });

  it("listDayLogs returns entries within range sorted by date", () => {
    saveDayLog({
      date: "2026-09-03",
      entries: [{ id: "a", category: "food", amount: 1000, memo: "", createdAt: 1 }],
      noSpend: false,
      total: 1000,
      updatedAt: 1,
    });
    saveDayLog({
      date: "2026-09-01",
      entries: [{ id: "b", category: "cafe", amount: 2000, memo: "", createdAt: 2 }],
      noSpend: false,
      total: 2000,
      updatedAt: 2,
    });

    const logs = listDayLogs("2026-09-01", "2026-09-03");
    expect(logs.map((l) => l.date)).toEqual(["2026-09-01", "2026-09-03"]);
  });

  it("getMeta deep-equals DEFAULT_META when unset", () => {
    expect(getMeta()).toEqual(DEFAULT_META);
  });

  it("patchMeta merges and persists a partial update", () => {
    patchMeta({ lastOpenDate: "2026-09-05" });
    const meta = getMeta();
    expect(meta.lastOpenDate).toBe("2026-09-05");
    expect(meta.version).toBe(1);
  });

  it("getFortune returns null when the date is missing", () => {
    expect(getFortune("2026-09-05")).toBeNull();
  });

  it("saveFortune persists a record retrievable by date", () => {
    saveFortune(makeFortune("2026-09-05", { score: 80 }));
    const record = getFortune("2026-09-05");
    expect(record?.score).toBe(80);
    expect(record?.date).toBe("2026-09-05");
  });

  it("saveFortune evicts the oldest date once retention exceeds 30 days", () => {
    for (let i = 1; i <= 31; i++) {
      saveFortune(makeFortune(`2026-08-${String(i).padStart(2, "0")}`));
    }
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.fortunes) ?? "{}");
    expect(Object.keys(stored)).toHaveLength(30);
    expect(stored["2026-08-01"]).toBeUndefined();
    expect(stored["2026-08-31"]).toBeDefined();
  });

  it("ignores a schema-invalid fortune record instead of crashing", () => {
    localStorage.setItem(
      STORAGE_KEYS.fortunes,
      JSON.stringify({ "2026-09-02": { date: "2026-09-02", score: "abc" } })
    );
    expect(getFortune("2026-09-02")).toBeNull();
  });
});
