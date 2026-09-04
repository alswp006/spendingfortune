import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { computeStreak, useAppData } from "@/hooks/useAppData";
import { getMeta, patchMeta } from "@/lib/storage";
import { STORAGE_KEYS, type DayLog } from "@/lib/types";

function log(date: string, overrides: Partial<DayLog> = {}): DayLog {
  return {
    date,
    entries: [],
    noSpend: true,
    total: 0,
    updatedAt: 1,
    ...overrides,
  };
}

describe("useAppData — 앱 상태 훅 + 스트릭 계산", () => {
  // AC-1[P0]: 연속 3일 기록 → streak 3, 훅 마운트 후 meta.streakCount에 반영
  it("AC-1[P0]: 2026-09-02/03/04 연속 기록 시 computeStreak === 3", () => {
    const logs = [log("2026-09-02"), log("2026-09-03"), log("2026-09-04")];
    expect(computeStreak(logs, "2026-09-04")).toBe(3);
  });

  it("AC-1[P0]: 훅 마운트 후 sf.meta.v1.streakCount === 3", async () => {
    localStorage.setItem(
      STORAGE_KEYS.dayLogs,
      JSON.stringify({
        "2026-09-02": log("2026-09-02"),
        "2026-09-03": log("2026-09-03"),
        "2026-09-04": log("2026-09-04"),
      }),
    );

    const { result } = renderHook(() => useAppData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.streak).toBe(3);
    const stored = getMeta();
    expect(stored.streakCount).toBe(3);
  });

  // AC-2[P0]: 하루 비면 streak 리셋, 기록 0건이면 0 + 예외 없음
  it("AC-2[P0]: 2026-09-03이 비면 computeStreak(...,'2026-09-04') === 1", () => {
    const logs = [log("2026-09-02"), log("2026-09-04")];
    expect(computeStreak(logs, "2026-09-04")).toBe(1);
  });

  it("AC-2[P0]: 기록 0건이면 computeStreak === 0이고 예외를 던지지 않는다", () => {
    expect(() => computeStreak([], "2026-09-04")).not.toThrow();
    expect(computeStreak([], "2026-09-04")).toBe(0);
  });

  // AC-3[P0]: resetAll — daylogs/fortunes만 제거, noticeAckedAt 보존
  it("AC-3[P0]: resetAll() 후 daylogs/fortunes는 null, streakCount는 0, noticeAckedAt은 보존된다", async () => {
    localStorage.setItem(
      STORAGE_KEYS.dayLogs,
      JSON.stringify({ "2026-09-04": log("2026-09-04") }),
    );
    localStorage.setItem(STORAGE_KEYS.fortunes, JSON.stringify({}));
    patchMeta({ noticeAckedAt: 1234567890, streakCount: 5 });

    const { result } = renderHook(() => useAppData());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.resetAll();
    });

    expect(localStorage.getItem(STORAGE_KEYS.dayLogs)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.fortunes)).toBeNull();

    const meta = getMeta();
    expect(meta.streakCount).toBe(0);
    expect(meta.noticeAckedAt).toBe(1234567890);
  });

  // AC-4[P0]: 초기 마운트 시 loading true 1회 관측 후 false로 전이
  it("AC-4[P0]: 마운트 직후 loading === true였다가 false로 전이한다", async () => {
    const { result } = renderHook(() => useAppData());

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.loading).toBe(false);
  });

  it("AC-4: loading이 false가 된 뒤에는 todayDate가 채워져 있다", async () => {
    const { result } = renderHook(() => useAppData());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(typeof result.current.todayDate).toBe("string");
    expect(result.current.todayDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
