import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, within, fireEvent, act } from "@testing-library/react";
import { mockAll } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";

mockAll();

const resetAll = vi.fn(async () => {});

vi.mock("@/hooks/useAppData", () => ({
  useAppData: () => ({
    loading: false,
    meta: { version: 1, noticeAckedAt: null, lastOpenDate: "2026-09-04", streakCount: 3, schemaMigratedAt: null },
    streak: 3,
    todayDate: "2026-09-05",
    yesterdayLog: { date: "2026-09-04", entries: [], noSpend: false, total: 0, updatedAt: 0 },
    todayFortune: null,
    refresh: vi.fn(async () => {}),
    resetAll,
  }),
}));

import Settings from "@/pages/Settings";

describe("Settings page", () => {
  beforeEach(() => {
    resetAll.mockClear();
  });

  it("AC-1: renders the four settings rows", () => {
    renderWithRouter(<Settings />);
    expect(screen.getByText("콘텐츠 안내")).toBeInTheDocument();
    expect(screen.getByText("데이터 보관 안내")).toBeInTheDocument();
    expect(screen.getByText("기록 요약")).toBeInTheDocument();
    expect(screen.getByText("데이터 전체 삭제")).toBeInTheDocument();
    // 44x44 hit area is guaranteed by TDS ListRow's default vertical/horizontal padding
    // (jsdom has no layout engine, so pixel geometry is verified visually via test:visual instead).
  });

  it("AC-4: data retention notice explains local-only storage with no recovery", () => {
    renderWithRouter(<Settings />);
    expect(
      screen.getByText("기기에만 저장돼서 앱을 지우면 복구할 수 없어요"),
    ).toBeInTheDocument();
  });

  it("AC-2: confirming reset calls resetAll once and shows a success toast", async () => {
    renderWithRouter(<Settings />);

    fireEvent.click(screen.getByTestId("reset-row"));

    const dialog = await screen.findByRole("alertdialog");
    const cancelBtn = within(dialog).getByRole("button", { name: "닫기" });
    expect(cancelBtn).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(within(dialog).getByRole("button", { name: "삭제하기" }));
    });

    expect(resetAll).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.getByText("기록을 모두 지웠어요")).toBeInTheDocument();
    });
  });

  it("AC-3: dismissing with 닫기 closes the dialog without calling resetAll", async () => {
    renderWithRouter(<Settings />);

    fireEvent.click(screen.getByTestId("reset-row"));
    const dialog = await screen.findByRole("alertdialog");

    fireEvent.click(within(dialog).getByRole("button", { name: "닫기" }));

    expect(resetAll).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("AC-5: source has no outlink/install-prompt/hardcoded-hex patterns", () => {
    const filePath = resolve(process.cwd(), "src/pages/Settings.tsx");
    const source = readFileSync(filePath, "utf-8");

    expect(source).not.toMatch(/window\.open/);
    expect(source).not.toMatch(/window\.location\.href/);
    expect(source).not.toMatch(/설치/);
    expect(source).not.toMatch(/다운로드/);
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});
