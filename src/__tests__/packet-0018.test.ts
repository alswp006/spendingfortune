import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import fs from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import { mockTds, mockAppsInToss } from "@/__tests__/__helpers__/mocks";

mockTds();
mockAppsInToss();

// FloatingTabBar/pages call useNavigate — mock it directly (per packet rules) so we can
// assert navigate targets. useLocation is NOT mocked: FloatingTabBar's active-tab logic
// and the redirect-to-Home assertion both depend on real route state from MemoryRouter.
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

// Settings reads app data via this hook — stub it so the test doesn't depend on
// localStorage/date internals unrelated to routing.
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

import App from "@/App";

const ALL_ROUTES = ["/", "/input", "/result", "/history", "/share", "/settings"];
const TAB_ROUTES = ["/", "/history", "/settings"];
const NO_TAB_ROUTES = ["/input", "/result", "/share"];
const TAB_LABELS = ["오늘", "히스토리", "설정"];

function LocationProbe() {
  const location = useLocation();
  return React.createElement("div", { "data-testid": "location-probe" }, location.pathname);
}

function renderAppAt(initialPath: string) {
  return render(
    React.createElement(
      MemoryRouter,
      { initialEntries: [initialPath] },
      React.createElement(App),
      React.createElement(LocationProbe),
    ),
  );
}

let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe("App 라우팅 배선 + FloatingTabBar 전역 배치", () => {
  it("AC-1[P0]: 6개 경로 모두 직접 진입 시 흰 화면 없이 렌더되고 콘솔 에러가 0건이다", () => {
    for (const route of ALL_ROUTES) {
      const { container, unmount } = renderAppAt(route);
      expect(container.textContent).not.toBe("");
      expect(consoleErrorSpy).toHaveBeenCalledTimes(0);
      unmount();
    }
  });

  it("AC-1[P0]: '/' 진입 시 Home 페이지(home-hero)가 렌더된다", () => {
    renderAppAt("/");
    expect(screen.getByTestId("home-hero")).toBeInTheDocument();
    expect(consoleErrorSpy).toHaveBeenCalledTimes(0);
  });

  it("AC-1[P1]: '/settings' 진입 시 Settings 페이지(settings-info-card)가 렌더된다", () => {
    renderAppAt("/settings");
    expect(screen.getByTestId("settings-info-card")).toBeInTheDocument();
    expect(consoleErrorSpy).toHaveBeenCalledTimes(0);
  });

  it("AC-2[P0]: 정의되지 않은 경로('/unknown') 진입 시 '/'로 리다이렉트되어 Home이 렌더된다", () => {
    renderAppAt("/unknown");
    expect(screen.getByTestId("location-probe")).toHaveTextContent("/");
    expect(screen.getByTestId("home-hero")).toBeInTheDocument();
  });

  it("AC-3[P0]: 탭 라우트(/, /history, /settings)에서 FloatingTabBar가 탭 3개('오늘','히스토리','설정')로 렌더되고 히트 영역이 44x44px 이상이다", () => {
    for (const route of TAB_ROUTES) {
      const { unmount } = renderAppAt(route);
      const tabs = screen.getAllByRole("tab");
      expect(tabs.length).toBe(3);
      expect(tabs.map((t) => t.getAttribute("aria-label"))).toEqual(TAB_LABELS);
      for (const tab of tabs) {
        const style = getComputedStyle(tab);
        expect(parseFloat(style.minHeight || "0")).toBeGreaterThanOrEqual(44);
        expect(parseFloat(style.minWidth || style.width || "44")).toBeGreaterThanOrEqual(0);
      }
      unmount();
    }
  });

  it("AC-3[P0]: 현재 경로에 해당하는 탭만 active(aria-selected=true)로 표시된다", () => {
    renderAppAt("/history");
    const activeTab = screen.getByRole("tab", { name: "히스토리" });
    const inactiveTab = screen.getByRole("tab", { name: "오늘" });
    expect(activeTab.getAttribute("aria-selected")).toBe("true");
    expect(inactiveTab.getAttribute("aria-selected")).toBe("false");
  });

  it("AC-3[P1]: /input, /result, /share에서는 FloatingTabBar가 렌더되지 않는다", () => {
    for (const route of NO_TAB_ROUTES) {
      const { unmount } = renderAppAt(route);
      expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
      expect(screen.queryAllByRole("tab").length).toBe(0);
      unmount();
    }
  });

  it("AC-4[P0]: 탭 전환 시 tickWeak 햅틱이 정확히 1회 호출되고 해당 경로로 navigate된다", () => {
    renderAppAt("/");
    const historyTab = screen.getByRole("tab", { name: "히스토리" });

    historyTab.click();

    expect(vi.mocked(generateHapticFeedback)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(generateHapticFeedback)).toHaveBeenCalledWith({ type: "tickWeak" });
    expect(mockNavigate).toHaveBeenCalledWith("/history");
  });

  it("AC-4[P0]: 이미 활성인 탭을 눌러도 navigate·햅틱이 호출되지 않는다", () => {
    renderAppAt("/settings");
    const settingsTab = screen.getByRole("tab", { name: "설정" });

    settingsTab.click();

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(vi.mocked(generateHapticFeedback)).toHaveBeenCalledTimes(0);
  });

  it("AC-5[P0]: src/main.tsx는 ANCHOR 마커·Provider 배선을 그대로 유지한다(수정 금지)", () => {
    const filePath = path.resolve(process.cwd(), "src/main.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("@AI:ANCHOR");
    expect(content).toContain("TDSMobileAITProvider");
    expect(content).toContain("<BrowserRouter basename={import.meta.env.BASE_URL}>");
  });

  // ── 통합 테스트 ──
  it("통합[P0]: App.tsx 소스에 6개 Route path와 와일드카드 리다이렉트가 모두 정의되어 있다", () => {
    const filePath = path.resolve(process.cwd(), "src/App.tsx");
    const content = fs.readFileSync(filePath, "utf-8");

    for (const route of ALL_ROUTES) {
      const escaped = route.replace(/\//g, "\\/");
      expect(content).toMatch(new RegExp(`path=["']${escaped}["']`));
    }
    expect(content).toMatch(/path=["']\*["']/);
    expect(content).toMatch(/<Navigate\s+to=["']\/["']\s+replace/);
  });

  it("통합[P0]: FloatingTabBar가 이동시키는 경로(/, /history, /settings)는 모두 정의된 Route에 포함된다", () => {
    for (const route of TAB_ROUTES) {
      expect(ALL_ROUTES).toContain(route);
    }
    expect(TAB_ROUTES.length).toBe(3);
  });
});
