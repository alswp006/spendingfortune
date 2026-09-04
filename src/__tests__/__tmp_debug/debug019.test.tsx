import { describe, it, expect, vi } from "vitest";
import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";

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

import Home from "@/pages/Home";

describe("debug", () => {
  it("debug click via fireEvent", () => {
    renderWithRouter(React.createElement(Home));
    const confirmButton = screen.getByRole("button", { name: "확인" });
    fireEvent.click(confirmButton);
    console.log("after fireEvent, dialog present?", screen.queryAllByRole("alertdialog").length);
  });
});
