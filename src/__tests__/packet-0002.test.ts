import { describe, it, expect } from "vitest";
import {
  todayKST,
  addDays,
  formatDate,
  isValidDateKey,
} from "@/lib/date";

describe("날짜 유틸(KST) todayKST/addDays/formatDate", () => {
  // AC-1: todayKST() 반환값이 정규식 ^\d{4}-\d{2}-\d{2}$와 일치
  describe("AC-1: todayKST format validation", () => {
    it("should return date string matching YYYY-MM-DD pattern", () => {
      const result = todayKST();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      // Verify all components are valid
      const [year, month, day] = result.split("-").map(Number);
      expect(year).toBeGreaterThan(2000);
      expect(month).toBeGreaterThanOrEqual(1);
      expect(month).toBeLessThanOrEqual(12);
      expect(day).toBeGreaterThanOrEqual(1);
      expect(day).toBeLessThanOrEqual(31);
    });
  });

  // AC-2: UTC 기준 시간 주입하면 KST 변환 검증
  describe("AC-2: UTC to KST conversion", () => {
    it("should return next day when UTC time crosses KST midnight (23:30 UTC = 08:30 KST+1)", () => {
      // 2026-09-04T23:30:00Z = 2026-09-05T08:30:00 KST
      const utcDate = new Date("2026-09-04T23:30:00Z");
      const result = todayKST(utcDate);
      expect(result).toBe("2026-09-05");
    });

    it("should return same day when UTC time is before KST midnight (00:10 UTC = 09:10 KST)", () => {
      // 2026-09-04T00:10:00Z = 2026-09-04T09:10:00 KST
      const utcDate = new Date("2026-09-04T00:10:00Z");
      const result = todayKST(utcDate);
      expect(result).toBe("2026-09-04");
    });

    it("should handle KST midnight boundary exactly (15:00 UTC = 00:00 KST)", () => {
      // 2026-09-04T15:00:00Z = 2026-09-05T00:00:00 KST (exactly midnight)
      const utcDate = new Date("2026-09-04T15:00:00Z");
      const result = todayKST(utcDate);
      expect(result).toBe("2026-09-05");
    });

    it("should handle KST midnight boundary one second before (14:59:59 UTC = 23:59:59 KST)", () => {
      // 2026-09-04T14:59:59Z = 2026-09-04T23:59:59 KST (one second before midnight)
      const utcDate = new Date("2026-09-04T14:59:59Z");
      const result = todayKST(utcDate);
      expect(result).toBe("2026-09-04");
    });
  });

  // AC-3: addDays 월말, 윤년 처리
  describe("AC-3: addDays with boundary cases", () => {
    it("should subtract one day from March 1st to February 28th", () => {
      const result = addDays("2026-03-01", -1);
      expect(result).toBe("2026-02-28");
    });

    it("should add one day from December 31st to next year January 1st", () => {
      const result = addDays("2026-12-31", 1);
      expect(result).toBe("2027-01-01");
    });

    it("should handle leap year: Feb 28 + 1 day = Feb 29 in 2028", () => {
      // 2028 is a leap year
      const result = addDays("2028-02-28", 1);
      expect(result).toBe("2028-02-29");
    });

    it("should handle leap year: Feb 29 + 1 day = Mar 1 in 2028", () => {
      const result = addDays("2028-02-29", 1);
      expect(result).toBe("2028-03-01");
    });

    it("should handle non-leap year: Feb 28 + 1 day = Mar 1 in 2026", () => {
      // 2026 is not a leap year
      const result = addDays("2026-02-28", 1);
      expect(result).toBe("2026-03-01");
    });

    it("should add multiple days", () => {
      const result = addDays("2026-09-01", 5);
      expect(result).toBe("2026-09-06");
    });

    it("should subtract multiple days", () => {
      const result = addDays("2026-09-06", -5);
      expect(result).toBe("2026-09-01");
    });

    it("should handle zero delta", () => {
      const result = addDays("2026-09-04", 0);
      expect(result).toBe("2026-09-04");
    });
  });

  // AC-4: isValidDateKey 형식 검증
  describe("AC-4: isValidDateKey format validation", () => {
    it("should reject single-digit month: '2026-9-4' returns false", () => {
      const result = isValidDateKey("2026-9-4");
      expect(result).toBe(false);
    });

    it("should reject single-digit day: '2026-09-4' returns false", () => {
      const result = isValidDateKey("2026-09-4");
      expect(result).toBe(false);
    });

    it("should accept valid date key: '2026-09-04' returns true", () => {
      const result = isValidDateKey("2026-09-04");
      expect(result).toBe(true);
    });

    it("should reject malformed input: empty string", () => {
      const result = isValidDateKey("");
      expect(result).toBe(false);
    });

    it("should reject non-date string: '2026/09/04'", () => {
      const result = isValidDateKey("2026/09/04");
      expect(result).toBe(false);
    });

    it("should reject invalid month: '2026-13-04'", () => {
      const result = isValidDateKey("2026-13-04");
      expect(result).toBe(false);
    });

    it("should reject invalid day: '2026-09-32'", () => {
      const result = isValidDateKey("2026-09-32");
      expect(result).toBe(false);
    });

    it("should accept Feb 28 in non-leap year", () => {
      const result = isValidDateKey("2026-02-28");
      expect(result).toBe(true);
    });

    it("should reject Feb 29 in non-leap year", () => {
      const result = isValidDateKey("2026-02-29");
      expect(result).toBe(false);
    });

    it("should accept Feb 29 in leap year", () => {
      const result = isValidDateKey("2028-02-29");
      expect(result).toBe(true);
    });
  });

  // formatDate 테스트 (부가 검증)
  describe("formatDate Korean display", () => {
    it("should format date as Korean short form: '2026-09-04' → '9월 4일'", () => {
      const result = formatDate("2026-09-04");
      expect(result).toBe("9월 4일");
    });

    it("should format with correct Korean ordinal for various dates", () => {
      expect(formatDate("2026-01-01")).toBe("1월 1일");
      expect(formatDate("2026-12-31")).toBe("12월 31일");
      expect(formatDate("2026-02-28")).toBe("2월 28일");
    });

    it("should not include leading zero in Korean output", () => {
      const result = formatDate("2026-09-04");
      // Should be "9월" not "09월", and "4일" not "04일"
      expect(result).toMatch(/^\d{1,2}월 \d{1,2}일$/);
    });
  });
});
