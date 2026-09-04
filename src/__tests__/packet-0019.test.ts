import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import fs from "node:fs";
import path from "node:path";
import { render, screen, renderHook, act, fireEvent } from "@testing-library/react";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import { getMeta, patchMeta } from "@/lib/storage";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";

// TDS + SDK + react-router-dom are globally mocked by vitest.setup.ts (see mocks.ts).
// Home renders through @toss/tds-mobile + useAppData — stub the latter so this packet's
// tests don't depend on unrelated date/streak internals (same pattern as packet-0018).
vi.mock("@/hooks/useAppData", () => ({
  useAppData: () => ({
    loading: false,
    meta: { version: 1, noticeAckedAt: null, lastOpenDate: "2026-09-05", streakCount: 2, schemaMigratedAt: null },
    streak: 2,
    todayDate: "2026-09-05",
    yesterdayLog: { date: "2026-09-04", entries: [], noSpend: true, total: 0, updatedAt: 0 },
    todayFortune: null,
    refresh: vi.fn(),
    resetAll: vi.fn(async () => {}),
  }),
}));

import { useContentNotice } from "@/hooks/useContentNotice";
import { AdSection } from "@/components/AdSection";
import Home from "@/pages/Home";

let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
  vi.unstubAllEnvs();
});

describe("배너 광고 배치 + 콘텐츠 고지 다이얼로그 + 검수 폴리시", () => {
  it("AC-1[P0]: noticeAckedAt===null 첫 진입 시 useContentNotice가 open===true이고 고지 문구를 반환한다", () => {
    expect(getMeta().noticeAckedAt).toBeNull();
    const { result } = renderHook(() => useContentNotice());
    expect(result.current.open).toBe(true);
    expect(result.current.description).toContain("재미용 콘텐츠이며, 투자·금융 자문이 아니에요");
  });

  it("AC-1[P0]: acknowledge() 호출 시 patchMeta({noticeAckedAt}) 1회 반영 + tickWeak 햅틱 1회 + open이 false로 닫힌다", () => {
    const { result } = renderHook(() => useContentNotice());
    expect(result.current.open).toBe(true);

    act(() => {
      result.current.acknowledge();
    });

    expect(result.current.open).toBe(false);
    expect(typeof getMeta().noticeAckedAt).toBe("number");
    expect(getMeta().noticeAckedAt).toBeGreaterThan(0);
    expect(generateHapticFeedback).toHaveBeenCalledTimes(1);
    expect(generateHapticFeedback).toHaveBeenCalledWith({ type: "tickWeak" });
  });

  it("AC-1: Home 첫 진입 시 AlertDialog가 표시되고 '확인' 탭 시 재노출을 막는 noticeAckedAt이 저장된다", () => {
    renderWithRouter(React.createElement(Home));

    const dialog = screen.getByRole("alertdialog");
    expect(dialog.textContent).toContain("재미용 콘텐츠이며, 투자·금융 자문이 아니에요");

    const confirmButton = screen.getByRole("button", { name: "확인" });
    fireEvent.click(confirmButton);

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(typeof getMeta().noticeAckedAt).toBe("number");
  });

  it("AC-2[P0]: noticeAckedAt이 이미 설정된 상태로 재마운트하면 AlertDialog가 렌더되지 않는다(0건)", () => {
    patchMeta({ noticeAckedAt: Date.now() });

    const { result } = renderHook(() => useContentNotice());
    expect(result.current.open).toBe(false);

    renderWithRouter(React.createElement(Home));
    expect(screen.queryAllByRole("alertdialog").length).toBe(0);
    expect(consoleErrorSpy).toHaveBeenCalledTimes(0);
  });

  it("AC-3[P0]: AdSection이 AdSlot에 adGroupId=import.meta.env.VITE_TOSS_AD_GROUP_ID를 전달하고 위아래 Spacing size=16을 렌더한다", () => {
    vi.stubEnv("VITE_TOSS_AD_GROUP_ID", "test-ad-group-123");

    const { container } = render(React.createElement(AdSection));

    const adSlot = container.querySelector('[data-ad-group-id="test-ad-group-123"]');
    expect(adSlot).not.toBeNull();
    expect(adSlot?.getAttribute("data-ad-group-id")).toBe(import.meta.env.VITE_TOSS_AD_GROUP_ID);

    const spacers = container.querySelectorAll('[data-spacing="16"]');
    expect(spacers.length).toBeGreaterThanOrEqual(2);
  });

  it("AC-4[P0]: 홈 화면에서 AdSection이 home-cta보다 DOM 순서상 뒤에 위치한다", () => {
    patchMeta({ noticeAckedAt: Date.now() });
    const { container } = renderWithRouter(React.createElement(Home));

    const cta = container.querySelector('[data-testid="home-cta"]');
    const adSection = container.querySelector('[data-testid="ad-section"]');
    expect(cta).not.toBeNull();
    expect(adSection).not.toBeNull();

    const position = cta!.compareDocumentPosition(adSection!);
    // Node.DOCUMENT_POSITION_FOLLOWING === 4: adSection이 cta 뒤(문서 순서상 이후)에 있다
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("AC-5[P0]: 전체 소스에 앱 설치 유도 문구·외부 이탈 API·하드코딩 HEX 색상이 없다", () => {
    const srcDir = path.resolve(__dirname, "..");
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === "__tests__") continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.(tsx?|ts)$/.test(entry.name)) files.push(full);
      }
    };
    walk(srcDir);

    const forbiddenInstallCopy = /설치하|다운로드 받|앱스토어/;
    const forbiddenNavigation = /window\.open\(|window\.location\.href\s*=/;
    const hexColor = /#[0-9a-fA-F]{3,8}\b/;

    const violations: string[] = [];
    for (const file of files) {
      const content = fs.readFileSync(file, "utf-8");
      if (forbiddenInstallCopy.test(content)) violations.push(`install-copy: ${file}`);
      if (forbiddenNavigation.test(content)) violations.push(`navigation: ${file}`);
      if (hexColor.test(content)) violations.push(`hex-color: ${file}`);
    }

    expect(violations).toEqual([]);
  });
});
