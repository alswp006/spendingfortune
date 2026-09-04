import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { screen, waitFor } from "@testing-library/react";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { mockNavigate } from "@/__tests__/__helpers__/mocks";
import { STORAGE_KEYS, DEFAULT_META, type DayLog } from "@/lib/types";

// useAppData는 훅 단위(packet-0010)에서 이미 검증됐다 — 이 패킷은 그 반환값을 Home이
// 올바르게 렌더링하는지만 본다. vi.fn()으로 감싸 테스트마다 반환값을 자유롭게 바꾼다.
const mockUseAppData = vi.fn();
vi.mock("@/hooks/useAppData", () => ({
  useAppData: () => mockUseAppData(),
}));

import Home from "@/pages/Home";

function dayLog(overrides: Partial<DayLog> = {}): DayLog {
  return { date: "2026-09-04", entries: [], noSpend: false, total: 0, updatedAt: 0, ...overrides };
}

function baseState(overrides: Record<string, unknown> = {}) {
  return {
    loading: false,
    meta: { ...DEFAULT_META, streakCount: 5, lastOpenDate: "2026-09-05" },
    streak: 5,
    todayDate: "2026-09-05",
    yesterdayLog: dayLog({
      entries: [{ id: "e1", category: "food", amount: 12000, memo: "점심", createdAt: 1 }],
      total: 12000,
      updatedAt: 1,
    }),
    todayFortune: null,
    refresh: vi.fn(),
    resetAll: vi.fn(async () => {}),
    ...overrides,
  };
}

describe("/ 홈(오늘) 화면 — 스트릭·요약·상태 카드", () => {
  beforeEach(() => {
    mockUseAppData.mockReset();
    mockNavigate.mockClear();
  });

  // ==================== AC-1: 스트릭 배지 ====================
  it("AC-1[P0]: useAppData의 streak 값으로 streak-badge를 렌더한다", () => {
    mockUseAppData.mockReturnValue(baseState({ streak: 7 }));
    renderWithRouter(React.createElement(Home));

    const badge = screen.getByTestId("streak-badge");
    expect(badge).toBeInTheDocument();
    expect(badge.textContent).toContain("7");
  });

  it("AC-1[P0]: streak이 0이면 streak-badge에 0이 반영된다(예외 없음)", () => {
    mockUseAppData.mockReturnValue(baseState({ streak: 0 }));
    renderWithRouter(React.createElement(Home));

    expect(screen.getByTestId("streak-badge").textContent).toContain("0");
  });

  // ==================== AC-2: 어제 총 지출 SummaryHero ====================
  it("AC-2[P0]: SummaryHero(home-summary-hero)가 어제 총 지출을 콤마 포맷으로 보여준다", () => {
    mockUseAppData.mockReturnValue(
      baseState({
        yesterdayLog: dayLog({
          entries: [{ id: "e1", category: "food", amount: 12000, memo: "점심", createdAt: 1 }],
          total: 12000,
          updatedAt: 1,
        }),
      }),
    );
    renderWithRouter(React.createElement(Home));

    const hero = screen.getByTestId("home-summary-hero");
    expect(hero.textContent).toContain("12,000");
    expect(hero.textContent).toContain("원");
  });

  it("AC-2[P0]: 다른 총액(348,200원)으로 바뀌면 SummaryHero도 그 값을 반영한다", () => {
    mockUseAppData.mockReturnValue(
      baseState({
        yesterdayLog: dayLog({
          entries: [{ id: "e1", category: "cafe", amount: 348200, memo: "", createdAt: 1 }],
          total: 348200,
          updatedAt: 1,
        }),
      }),
    );
    renderWithRouter(React.createElement(Home));

    expect(screen.getByTestId("home-summary-hero").textContent).toContain("348,200");
  });

  // ==================== AC-3: 로딩 스켈레톤 ====================
  it("AC-3: loading===true이면 home-skeleton만 보이고 스트릭/요약은 렌더되지 않는다", () => {
    mockUseAppData.mockReturnValue(baseState({ loading: true }));
    renderWithRouter(React.createElement(Home));

    expect(screen.getByTestId("home-skeleton")).toBeInTheDocument();
    expect(screen.queryByTestId("streak-badge")).not.toBeInTheDocument();
    expect(screen.queryByTestId("home-summary-hero")).not.toBeInTheDocument();
  });

  // ==================== AC-4: 빈 상태 ====================
  it("AC-4: 어제 기록이 없으면(entries 0건, noSpend false) 빈 상태 문구가 보인다", () => {
    mockUseAppData.mockReturnValue(
      baseState({
        yesterdayLog: dayLog({ entries: [], noSpend: false, total: 0, updatedAt: 0 }),
      }),
    );
    renderWithRouter(React.createElement(Home));

    expect(screen.getByText("첫 기록을 남기면 내일부터 소비운세가 열려요")).toBeInTheDocument();
    expect(screen.queryByTestId("home-skeleton")).not.toBeInTheDocument();
  });

  // ==================== AC-5: 스토리지 손상 토스트 ====================
  it("AC-5[P0]: sf.daylogs.v1이 손상된 JSON이면 손상 안내 토스트가 뜬다", async () => {
    localStorage.setItem(STORAGE_KEYS.dayLogs, "{not-valid-json");
    mockUseAppData.mockReturnValue(baseState());
    renderWithRouter(React.createElement(Home));

    await waitFor(() => {
      expect(screen.getByText("기록을 불러오지 못해 초기화했어요")).toBeInTheDocument();
    });
  });

  it("AC-5[P0]: 저장소가 정상이면 손상 토스트가 뜨지 않는다", () => {
    localStorage.setItem(STORAGE_KEYS.dayLogs, JSON.stringify({}));
    mockUseAppData.mockReturnValue(baseState());
    renderWithRouter(React.createElement(Home));

    expect(screen.queryByText("기록을 불러오지 못해 초기화했어요")).not.toBeInTheDocument();
  });

  // ==================== AC-6: 오늘의 운세 카드·CTA는 이 패킷 범위 밖 ====================
  it("AC-6: todayFortune이 null이어도 크래시 없이 렌더되고 마운트 시 navigate가 호출되지 않는다(운세 카드·CTA는 후속 패킷)", () => {
    mockUseAppData.mockReturnValue(baseState({ todayFortune: null }));
    renderWithRouter(React.createElement(Home));

    expect(screen.getByTestId("streak-badge")).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
