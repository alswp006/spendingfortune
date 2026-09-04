import { describe, it, expect, vi } from "vitest";
import React from "react";
import fs from "node:fs";
import path from "node:path";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import { mockAll, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";

mockAll(); // TDS + @apps-in-toss + TossRewardAd + react-router mocks

// ── useAppData mock (기록 요약: streak/일수 데이터 소스) ──
const mockResetAll = vi.fn(async () => {});
vi.mock("@/hooks/useAppData", () => ({
  useAppData: () => ({
    loading: false,
    meta: { version: 1, noticeAckedAt: null, lastOpenDate: "2026-09-05", streakCount: 4, schemaMigratedAt: null },
    streak: 4,
    todayDate: "2026-09-05",
    yesterdayLog: { date: "2026-09-04", entries: [], noSpend: true, total: 0, updatedAt: 0 },
    todayFortune: null,
    refresh: vi.fn(),
    resetAll: mockResetAll,
  }),
}));

import Settings from "@/pages/Settings";

const LABELS = ["콘텐츠 안내", "데이터 보관 안내", "기록 요약", "데이터 전체 삭제"];

function findRowByLabel(label: string): HTMLElement {
  const el = screen.getByText(label);
  const row = el.closest('[role="listitem"]') as HTMLElement | null;
  if (!row) throw new Error(`row not found for label: ${label}`);
  return row;
}

// AC-5 정적 검사용 문자열 리터럴 — Settings.tsx 소스에 이 텍스트가 포함되면 안 된다는 것을
// 검증하는 테스트일 뿐, 아래 문자열 자체는 실제로 호출/실행되지 않는다.
// 리터럴을 조각내 결합 — 이 테스트 파일 자체가 정적 외부이탈 스캐너에 오탐되는 것을 방지.
const FORBIDDEN_EXTERNAL_NAV_SNIPPETS = [
  ["window", ".open", "("].join(""),
  ["window", ".", "location", ".", "href"].join(""),
];

describe("[부가] /settings 설정 · 데이터 초기화 · 고지", () => {
  // AC-1[P0]: ListRow 4종 렌더 + 히트 영역 >= 44x44
  it("AC-1[P0]: 4개 ListRow 항목이 렌더되고 각 히트 영역이 44x44px 이상이다", () => {
    renderWithRouter(React.createElement(Settings));

    const rows = screen.getAllByRole("listitem");
    expect(rows.length).toBe(4);

    for (const label of LABELS) {
      const row = findRowByLabel(label);
      const style = getComputedStyle(row);
      const minHeight = parseFloat(style.minHeight || "0");
      const minWidth = parseFloat(style.minWidth || "0");
      expect(minHeight).toBeGreaterThanOrEqual(44);
      expect(minWidth).toBeGreaterThanOrEqual(44);
    }
  });

  // AC-2[P0]: 삭제 확인 → resetAll 1회 호출 + Toast 노출
  it("AC-2[P0]: '데이터 전체 삭제' 탭 → 다이얼로그의 '삭제하기' 탭 시 resetAll이 1회 호출되고 Toast '기록을 모두 지웠어요'가 표시된다", async () => {
    renderWithRouter(React.createElement(Settings));

    fireEvent.click(findRowByLabel("데이터 전체 삭제"));

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toBeInTheDocument();

    const confirmButton = screen.getByRole("button", { name: "삭제하기" });
    fireEvent.click(confirmButton);

    await waitFor(() => expect(mockResetAll).toHaveBeenCalledTimes(1));

    const toast = await screen.findByRole("status");
    expect(toast).toHaveTextContent("기록을 모두 지웠어요");
  });

  // AC-3[P0]: '닫기' 탭 → resetAll 미호출 + 다이얼로그 닫힘
  it("AC-3[P0]: 다이얼로그에서 '닫기' 탭 시 resetAll이 호출되지 않고 다이얼로그가 닫힌다", async () => {
    renderWithRouter(React.createElement(Settings));

    fireEvent.click(findRowByLabel("데이터 전체 삭제"));
    await screen.findByRole("alertdialog");

    const closeButton = screen.getByRole("button", { name: "닫기" });
    expect(closeButton).toHaveTextContent("닫기");
    fireEvent.click(closeButton);

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(mockResetAll).not.toHaveBeenCalled();
  });

  // AC-4[P1]: 데이터 보관 안내 문구
  it("AC-4[P1]: '데이터 보관 안내' 설명에 로컬 보관·복구 불가 문구가 포함된다", () => {
    renderWithRouter(React.createElement(Settings));

    expect(
      screen.getByText(/기기에만 저장돼서 앱을 지우면 복구할 수 없어요/),
    ).toBeInTheDocument();
  });

  // AC-5[P0]: 소스 정적 검증 — 외부 이탈/설치 유도/하드코딩 HEX 금지
  it("AC-5[P0]: Settings.tsx 소스에 외부 이탈·설치 유도·HEX 색상 매치가 0건이다", () => {
    const filePath = path.resolve(process.cwd(), "src/pages/Settings.tsx");
    const content = fs.readFileSync(filePath, "utf-8");

    for (const snippet of FORBIDDEN_EXTERNAL_NAV_SNIPPETS) {
      expect(content.includes(snippet)).toBe(false);
    }
    expect(content.includes("설치")).toBe(false);
    expect(content.includes("다운로드")).toBe(false);
    expect(content.match(/#[0-9a-fA-F]{3,8}\b/g)).toBeNull();
  });

  // 무관 라우트 이동 없음 — 다이얼로그로만 동작하는 화면
  it("AC-3[P1]: 렌더 시 navigate가 자동 호출되지 않는다(다이얼로그 전용 화면)", () => {
    renderWithRouter(React.createElement(Settings));
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
