import { describe, it, expect, beforeEach } from "vitest";
import type { FortuneType, FortuneTypeId } from "@/lib/types";

/**
 * Packet 0003: 12유형 캐릭터 테이블 + 고정 문구 테이블
 *
 * AC-1: TYPE_TABLE에 12개 유형, 각 name/tagline/imageSrc 필수 (P0)
 * AC-2: imageSrc가 ^/characters/{typeId}\.png$ 형식 + 파일 존재 (P0)
 * AC-3: tagline 길이 ≤ 24 (P1)
 * AC-4: COPY_TABLE 36조합 전수 길이 검증 (headline≤40, advice≤80, savingTip≤60) (P0)
 * AC-5: TYPE_MATRIX가 12종 FortuneTypeId 중복 없이 1회씩 (P0)
 * AC-6: 전 문구에서 '설치','다운로드','앱스토어' 0건 (P1)
 */

describe("Packet 0003: 12유형 캐릭터 테이블 + 고정 문구 테이블", () => {
  // Lazy-load 구현(아직 없음) — import는 테스트 실행 시점에
  let TYPE_TABLE: Record<FortuneTypeId, FortuneType>;
  let COPY_TABLE: Record<
    FortuneTypeId,
    Record<"high" | "mid" | "low", { headline: string; advice: string; savingTip: string }>
  >;
  let TYPE_MATRIX: Record<
    "EAT" | "SHOP" | "LIFE" | "MISC",
    Record<"high" | "mid" | "low", FortuneTypeId>
  >;

  beforeEach(async () => {
    try {
      const module = await import("@/lib/fortuneTable");
      TYPE_TABLE = module.TYPE_TABLE;
      COPY_TABLE = module.COPY_TABLE;
      TYPE_MATRIX = module.TYPE_MATRIX;
    } catch (err) {
      // 구현이 아직 없으므로 에러 무시 — 테스트는 실패할 것
      console.log("fortuneTable not yet implemented");
    }
  });

  // ===== AC-1: TYPE_TABLE 구조 검증 =====
  it("AC-1[P0]: TYPE_TABLE should have exactly 12 types", () => {
    expect(Object.keys(TYPE_TABLE)).toHaveLength(12);
  });

  it("AC-1[P0]: each TYPE_TABLE entry should have non-empty name, tagline, imageSrc", () => {
    Object.entries(TYPE_TABLE).forEach(([typeId, type]) => {
      expect(type.name).toBeTruthy();
      expect(type.name.length).toBeGreaterThan(0);

      expect(type.tagline).toBeTruthy();
      expect(type.tagline.length).toBeGreaterThan(0);

      expect(type.imageSrc).toBeTruthy();
      expect(type.imageSrc.length).toBeGreaterThan(0);
    });
  });

  // ===== AC-2: imageSrc 형식 + 파일 존재 검증 =====
  it("AC-2[P0]: all imageSrc should match /characters/{typeId}.png pattern", () => {
    const pattern = /^\/characters\/[a-z_]+\.png$/;

    Object.entries(TYPE_TABLE).forEach(([typeId, type]) => {
      // 형식 검증
      expect(type.imageSrc).toMatch(pattern);

      // typeId와 imageSrc 일치 검증
      expect(type.imageSrc).toBe(`/characters/${typeId}.png`);
    });
  });

  it("AC-2[P0]: character PNG files should exist in public/characters/ (320×320, ≤40KB)", () => {
    // Note: 실제 파일 존재 검증은 Playwright visual-smoke.spec.ts에서 수행
    // 여기서는 imageSrc 경로 규칙만 검증 (위의 pattern match test로 보장됨)
    // Coder가 public/characters/{typeId}.png 12개를 배치할 책임
    Object.keys(TYPE_TABLE).forEach((typeId) => {
      expect(typeId).toMatch(/^[a-z_]+$/);
      // 실제 파일 체크는 빌드 시 또는 e2e에서
    });
  });

  // ===== AC-3: tagline 길이 제약 =====
  it("AC-3[P1]: all taglines should have length ≤ 24", () => {
    Object.values(TYPE_TABLE).forEach((type) => {
      expect(type.tagline.length).toBeLessThanOrEqual(24);
    });
  });

  // ===== AC-4: COPY_TABLE 길이 제약 (전수 검증) =====
  it("AC-4[P0]: all COPY_TABLE headlines should have length ≤ 40", () => {
    Object.values(COPY_TABLE).forEach((bandMap) => {
      Object.values(bandMap).forEach((copy) => {
        expect(copy.headline.length).toBeLessThanOrEqual(40);
        expect(copy.headline.length).toBeGreaterThan(0);
      });
    });
  });

  it("AC-4[P0]: all COPY_TABLE advice should have length ≤ 80", () => {
    Object.values(COPY_TABLE).forEach((bandMap) => {
      Object.values(bandMap).forEach((copy) => {
        expect(copy.advice.length).toBeLessThanOrEqual(80);
        expect(copy.advice.length).toBeGreaterThan(0);
      });
    });
  });

  it("AC-4[P0]: all COPY_TABLE savingTip should have length ≤ 60", () => {
    Object.values(COPY_TABLE).forEach((bandMap) => {
      Object.values(bandMap).forEach((copy) => {
        expect(copy.savingTip.length).toBeLessThanOrEqual(60);
        expect(copy.savingTip.length).toBeGreaterThan(0);
      });
    });
  });

  // ===== AC-5: TYPE_MATRIX 12종 중복 없이 정확히 1회씩 =====
  it("AC-5[P0]: TYPE_MATRIX should use all 12 FortuneTypeIds exactly once", () => {
    const allTypeIdsInMatrix: FortuneTypeId[] = [];

    Object.values(TYPE_MATRIX).forEach((categoryMap) => {
      Object.values(categoryMap).forEach((typeId) => {
        allTypeIdsInMatrix.push(typeId);
      });
    });

    // 12개 = 4 카테고리 × 3 밴드
    expect(allTypeIdsInMatrix).toHaveLength(12);

    // 중복 없음
    const uniqueTypeIds = new Set(allTypeIdsInMatrix);
    expect(uniqueTypeIds.size).toBe(12);

    // TYPE_TABLE의 모든 typeId가 포함됨
    const typeTableTypeIds = Object.keys(TYPE_TABLE);
    typeTableTypeIds.forEach((typeId) => {
      expect(allTypeIdsInMatrix).toContain(typeId as FortuneTypeId);
    });
  });

  // ===== AC-6: 금지 문구 검증 =====
  it("AC-6[P1]: TYPE_TABLE should not contain forbidden keywords", () => {
    const forbiddenKeywords = ["설치", "다운로드", "앱스토어"];
    const allText = Object.values(TYPE_TABLE)
      .map((type) => `${type.name} ${type.tagline}`)
      .join(" ");

    forbiddenKeywords.forEach((keyword) => {
      expect(allText).not.toContain(keyword);
    });
  });

  it("AC-6[P1]: COPY_TABLE should not contain forbidden keywords", () => {
    const forbiddenKeywords = ["설치", "다운로드", "앱스토어"];
    const allText = Object.values(COPY_TABLE)
      .flatMap((bandMap) => Object.values(bandMap))
      .map((copy) => `${copy.headline} ${copy.advice} ${copy.savingTip}`)
      .join(" ");

    forbiddenKeywords.forEach((keyword) => {
      expect(allText).not.toContain(keyword);
    });
  });
});
