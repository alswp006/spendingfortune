import { describe, it, expect } from "vitest";
import { detectAlerts } from "@/lib/alerts";

describe("detectAlerts - 지름신 주의보 규칙 엔진", () => {
  // AC-1: CATEGORY_CONCENTRATION rule
  it("AC-1[P0]: CATEGORY_CONCENTRATION — 특정 카테고리 60% 비중 시 caution 반환", () => {
    const input = {
      byCategory: { shopping: 60000, food: 30000, cafe: 10000 },
      total: 100000,
      loggedDays: 3,
      yesterdayTotal: 30000,
      prev6DailyAvg: 20000,
    };
    const result = detectAlerts(input);

    const catAlert = result.find((a) => a.rule === "CATEGORY_CONCENTRATION");
    expect(catAlert).toBeDefined();
    expect(catAlert?.level).toBe("caution");
    expect(catAlert?.category).toBe("shopping");
    expect(catAlert?.ratio).toBe(0.6);
    expect(catAlert?.message).toBe("최근 7일 지출의 60%가 쇼핑에 몰렸어요");
  });

  // AC-2: SPIKE rule
  it("AC-2[P0]: SPIKE — 어제 지출이 평소의 3.0배 시 danger 반환", () => {
    const input = {
      byCategory: { food: 20000, cafe: 10000 },
      total: 30000,
      loggedDays: 2,
      yesterdayTotal: 60000,
      prev6DailyAvg: 20000,
    };
    const result = detectAlerts(input);

    const spikeAlert = result.find((a) => a.rule === "SPIKE");
    expect(spikeAlert).toBeDefined();
    expect(spikeAlert?.level).toBe("danger");
    expect(spikeAlert?.category).toBeNull();
    expect(spikeAlert?.ratio).toBe(3.0);
    expect(spikeAlert?.message).toBe("어제 지출이 평소의 3.0배예요");
  });

  // AC-3: Both rules triggered, danger first
  it("AC-3[P0]: SPIKE + CATEGORY_CONCENTRATION 동시 충족 시 danger가 먼저 정렬", () => {
    const input = {
      byCategory: { shopping: 60000, food: 20000 },
      total: 80000,
      loggedDays: 2,
      yesterdayTotal: 72000, // 36000(avg) × 2 = danger
      prev6DailyAvg: 36000,
    };
    const result = detectAlerts(input);

    expect(result.length).toBe(2);
    expect(result[0].level).toBe("danger");
    expect(result[0].rule).toBe("SPIKE");
    expect(result[1].level).toBe("caution");
    expect(result[1].rule).toBe("CATEGORY_CONCENTRATION");
  });

  // AC-4a: Insufficient data — loggedDays < 2
  it("AC-4a[P0]: loggedDays < 2 시 CATEGORY_CONCENTRATION 제외", () => {
    const input = {
      byCategory: { cafe: 20000 },
      total: 20000,
      loggedDays: 1,
      yesterdayTotal: 20000,
      prev6DailyAvg: 15000,
    };
    const result = detectAlerts(input);

    const catAlert = result.find((a) => a.rule === "CATEGORY_CONCENTRATION");
    expect(catAlert).toBeUndefined();
  });

  // AC-4b: prev6DailyAvg = 0 — zero division guard
  it("AC-4b[P0]: prev6DailyAvg = 0 시 SPIKE 제외 및 0 나눗셈 방지", () => {
    const input = {
      byCategory: { food: 10000 },
      total: 10000,
      loggedDays: 2,
      yesterdayTotal: 20000,
      prev6DailyAvg: 0,
    };
    const result = detectAlerts(input);

    const spikeAlert = result.find((a) => a.rule === "SPIKE");
    expect(spikeAlert).toBeUndefined();
  });

  // AC-4c: JSON.stringify result must not contain Infinity or NaN
  it("AC-4c[P0]: 결과 JSON에 Infinity 또는 NaN 없음", () => {
    const inputs = [
      { byCategory: {}, total: 0, loggedDays: 0, yesterdayTotal: 0, prev6DailyAvg: 0 },
      { byCategory: { food: 0 }, total: 0, loggedDays: 1, yesterdayTotal: 0, prev6DailyAvg: 0 },
      { byCategory: { shopping: 100000 }, total: 100000, loggedDays: 0, yesterdayTotal: 50000, prev6DailyAvg: 0 },
    ];

    inputs.forEach((input) => {
      const result = detectAlerts(input);
      const json = JSON.stringify(result);
      expect(json).not.toMatch(/Infinity|NaN/);
    });
  });

  // AC-5: No forbidden keywords in messages
  it("AC-5[P0]: 모든 메시지에 금지 표현(설치/다운로드/앱스토어/가입하기) 없음", () => {
    const inputs = [
      {
        byCategory: { shopping: 60000, food: 40000 },
        total: 100000,
        loggedDays: 2,
        yesterdayTotal: 80000,
        prev6DailyAvg: 20000,
      },
      {
        byCategory: { cafe: 5000 },
        total: 5000,
        loggedDays: 2,
        yesterdayTotal: 100000,
        prev6DailyAvg: 10000,
      },
    ];

    inputs.forEach((input) => {
      const result = detectAlerts(input);
      result.forEach((alert) => {
        expect(alert.message).not.toMatch(/설치|다운로드|앱스토어|가입하기/);
      });
    });
  });

  // Boundary test: SPIKE at exactly 2.0x ratio
  it("SPIKE boundary: yesterdayTotal / prev6DailyAvg = 2.0 시 danger 포함", () => {
    const input = {
      byCategory: { food: 20000 },
      total: 20000,
      loggedDays: 2,
      yesterdayTotal: 40000,
      prev6DailyAvg: 20000,
    };
    const result = detectAlerts(input);

    const spikeAlert = result.find((a) => a.rule === "SPIKE");
    expect(spikeAlert).toBeDefined();
    expect(spikeAlert?.level).toBe("danger");
    expect(spikeAlert?.ratio).toBe(2.0);
  });

  // Boundary test: CATEGORY_CONCENTRATION at exactly 0.5 ratio
  it("CATEGORY_CONCENTRATION boundary: category ratio = 0.5 시 caution 포함", () => {
    const input = {
      byCategory: { shopping: 50000, food: 50000 },
      total: 100000,
      loggedDays: 2,
      yesterdayTotal: 30000,
      prev6DailyAvg: 20000,
    };
    const result = detectAlerts(input);

    const catAlert = result.find((a) => a.rule === "CATEGORY_CONCENTRATION");
    expect(catAlert).toBeDefined();
    expect(catAlert?.level).toBe("caution");
    expect(catAlert?.ratio).toBe(0.5);
  });

  // Edge case: Empty byCategory (total = 0)
  it("Edge case: byCategory 비어있음 시 빈 배열 반환", () => {
    const input = {
      byCategory: {},
      total: 0,
      loggedDays: 7,
      yesterdayTotal: 0,
      prev6DailyAvg: 0,
    };
    const result = detectAlerts(input);

    expect(result).toEqual([]);
  });

  // Message format test: CATEGORY_CONCENTRATION message includes category name
  it("Message format: CATEGORY_CONCENTRATION 메시지에 카테고리명 포함", () => {
    const input = {
      byCategory: { food: 80000, shopping: 20000 },
      total: 100000,
      loggedDays: 2,
      yesterdayTotal: 30000,
      prev6DailyAvg: 20000,
    };
    const result = detectAlerts(input);

    const catAlert = result.find((a) => a.rule === "CATEGORY_CONCENTRATION");
    expect(catAlert?.message).toContain("음식");
    expect(catAlert?.message).toContain("80%");
  });

  // Message format test: SPIKE message includes ratio
  it("Message format: SPIKE 메시지에 배수 포함", () => {
    const input = {
      byCategory: { food: 10000 },
      total: 10000,
      loggedDays: 2,
      yesterdayTotal: 50000,
      prev6DailyAvg: 10000,
    };
    const result = detectAlerts(input);

    const spikeAlert = result.find((a) => a.rule === "SPIKE");
    expect(spikeAlert?.message).toContain("5.0배");
    expect(spikeAlert?.ratio).toBe(5.0);
  });
});
