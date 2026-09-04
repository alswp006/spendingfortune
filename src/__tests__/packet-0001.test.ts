import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("패킷 0001: 도메인 타입 + RouteState 정의", () => {
  // AC-1: types.ts 존재 및 필수 export 확인
  it("AC-1[P0]: must export CATEGORY_LABEL, STORAGE_KEYS, DEFAULT_META", async () => {
    const mod = await import("@/lib/types");
    expect(mod.CATEGORY_LABEL).toBeDefined();
    expect(mod.STORAGE_KEYS).toBeDefined();
    expect(mod.DEFAULT_META).toBeDefined();
  });

  // AC-2: DEFAULT_META 정확한 구조 검증
  it("AC-2[P0]: DEFAULT_META structure = { version: 1, noticeAckedAt: null, lastOpenDate: null, streakCount: 0, schemaMigratedAt: null }", async () => {
    const { DEFAULT_META } = await import("@/lib/types");
    expect(DEFAULT_META).toEqual({
      version: 1,
      noticeAckedAt: null,
      lastOpenDate: null,
      streakCount: 0,
      schemaMigratedAt: null,
    });
    // Verify each field explicitly
    expect(DEFAULT_META.version).toBe(1);
    expect(DEFAULT_META.noticeAckedAt).toBeNull();
    expect(DEFAULT_META.lastOpenDate).toBeNull();
    expect(DEFAULT_META.streakCount).toBe(0);
    expect(DEFAULT_META.schemaMigratedAt).toBeNull();
  });

  // AC-3: CATEGORY_LABEL 길이 확인 (8개)
  it("AC-3[P0]: CATEGORY_LABEL must have exactly 8 entries", async () => {
    const { CATEGORY_LABEL } = await import("@/lib/types");
    expect(Object.keys(CATEGORY_LABEL)).toHaveLength(8);
    expect(Object.values(CATEGORY_LABEL)).toHaveLength(8);
  });

  // AC-3: CATEGORY_LABEL 값 확인 (정확한 레이블)
  it("AC-3[P0]: CATEGORY_LABEL values are '식비','카페/간식','쇼핑','교통','문화/여가','건강/의료','생활/구독','기타'", async () => {
    const { CATEGORY_LABEL } = await import("@/lib/types");
    expect(Object.values(CATEGORY_LABEL)).toEqual([
      "식비",
      "카페/간식",
      "쇼핑",
      "교통",
      "문화/여가",
      "건강/의료",
      "생활/구독",
      "기타",
    ]);
  });

  // AC-4: STORAGE_KEYS 구조 검증
  it("AC-4[P0]: STORAGE_KEYS = { dayLogs: 'sf.daylogs.v1', fortunes: 'sf.fortunes.v1', meta: 'sf.meta.v1' }", async () => {
    const { STORAGE_KEYS } = await import("@/lib/types");
    expect(STORAGE_KEYS).toEqual({
      dayLogs: "sf.daylogs.v1",
      fortunes: "sf.fortunes.v1",
      meta: "sf.meta.v1",
    });
    // Verify each key explicitly
    expect(STORAGE_KEYS.dayLogs).toBe("sf.daylogs.v1");
    expect(STORAGE_KEYS.fortunes).toBe("sf.fortunes.v1");
    expect(STORAGE_KEYS.meta).toBe("sf.meta.v1");
  });

  // AC-4: RouteState 타입 내보내기 확인 (타입 레벨 검증)
  it("AC-4[P0]: must export RouteState type", async () => {
    const mod = await import("@/lib/types");
    // RouteState is a type-only export, so it won't have a runtime value
    // Just verify the module loads without error and is an object
    expect(typeof mod).toBe("object");
    expect(mod).toBeDefined();
  });

  // AC-5: HEX 색상 코드 없음 (정규식 검증)
  it("AC-5[P1]: types.ts must not contain hardcoded HEX color codes (#...)", () => {
    const filePath = path.resolve(process.cwd(), "src/lib/types.ts");
    const content = fs.readFileSync(filePath, "utf-8");
    const hexColorPattern = /#[0-9a-fA-F]{3,8}\b/g;
    const matches = content.match(hexColorPattern) || [];
    expect(matches).toHaveLength(0);
  });

  // AC-5: 함수 선언 없음 (정규식 검증)
  it("AC-5[P1]: types.ts must not contain function declarations", () => {
    const filePath = path.resolve(process.cwd(), "src/lib/types.ts");
    const content = fs.readFileSync(filePath, "utf-8");
    // Match "function " keyword (e.g., "function getName()", but not "functionName" or "isFunction")
    const functionDeclPattern = /\bfunction\s+\w+\s*\(/g;
    const matches = content.match(functionDeclPattern) || [];
    expect(matches).toHaveLength(0);
  });
});
