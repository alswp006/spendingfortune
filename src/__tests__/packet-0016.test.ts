/**
 * Packet 0016 — [부가] /share 결과 공유 카드
 *
 * 범위: Share.tsx가 location.state.date의 FortuneRecord를 읽어 세로 공유 카드
 * (유형명 · 점수 · headline · '재미용 콘텐츠' 배지)를 렌더하고, '문구 복사하기' 탭 시
 * navigator.clipboard.writeText로 문구를 복사한 뒤 성공/실패 Toast를 보여준다.
 * 레코드가 없으면 EmptyState + '오늘 운세 보기' → /result(date: todayKST()) 이동.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import fs from "node:fs";
import path from "node:path";
import { screen, fireEvent } from "@testing-library/react";
import { mockAll, mockNavigate, mockLocation } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { saveFortune } from "@/lib/storage";
import { todayKST, addDays } from "@/lib/date";
import { TYPE_TABLE } from "@/lib/fortuneTable";
import type { FortuneRecord } from "@/lib/types";

import Share from "@/pages/Share";

mockAll(); // TDS + @apps-in-toss + TossRewardAd + react-router mocks

const today = todayKST();

function makeFortune(date: string): FortuneRecord {
  return {
    date,
    basisDate: addDays(date, -1),
    score: 82,
    typeId: "gourmet_saver",
    headline: "오늘은 맛집 탐방 운이 좋아요",
    advice: "조언",
    savingTip: "팁",
    luckyCategory: "food",
    cautionCategory: null,
    estimatedSaving: 3000,
    alerts: [],
    yesterdayTotal: 21000,
    unlocked: true,
    createdAt: Date.now(),
  };
}

const writeTextMock = vi.fn();

beforeEach(() => {
  mockNavigate.mockClear();
  mockLocation.state = null;
  writeTextMock.mockReset();
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: writeTextMock },
    configurable: true,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("[부가] /share 결과 공유 카드", () => {
  // AC-1[P0]: 레코드 없음 → EmptyState + '오늘 운세 보기' → /result(date: todayKST())
  it("AC-1[P0]: 레코드가 없으면 EmptyState를 렌더하고 CTA는 /result로 오늘 날짜와 함께 이동한다", () => {
    mockLocation.state = { date: today };

    renderWithRouter(React.createElement(Share));

    const empty = screen.getByTestId("share-empty");
    expect(empty).toBeInTheDocument();
    expect(screen.getByText("공유할 운세가 없어요")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "오늘 운세 보기" }));

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/result", { state: { date: today } });
  });

  // AC-1b[P0]: state 자체가 null(직접 진입)이어도 크래시 없이 동일한 빈 상태를 렌더한다
  it("AC-1b[P0]: state가 null이어도 크래시 없이 EmptyState를 렌더한다", () => {
    mockLocation.state = null;

    renderWithRouter(React.createElement(Share));

    expect(screen.getByTestId("share-empty")).toBeInTheDocument();
  });

  // AC-2[P0]: 카드에 유형명 · 점수 · headline · 재미용 콘텐츠 배지가 모두 표시
  it("AC-2[P0]: 카드에 유형명·점수·headline·재미용 콘텐츠 배지가 표시된다", () => {
    saveFortune(makeFortune(today));
    mockLocation.state = { date: today };

    renderWithRouter(React.createElement(Share));

    const card = screen.getByTestId("share-card");
    expect(card).toBeInTheDocument();
    expect(screen.getByText(TYPE_TABLE.gourmet_saver.name)).toBeInTheDocument();
    expect(screen.getByText(/82점/)).toBeInTheDocument();
    expect(screen.getByText("오늘은 맛집 탐방 운이 좋아요")).toBeInTheDocument();
    expect(screen.getByText("지출 기록으로 만든 재미용 콘텐츠예요")).toBeInTheDocument();
  });

  // AC-3[P0]: 문구 복사하기 → clipboard.writeText 1회 (유형명·점수·headline 포함) → 성공 Toast
  it("AC-3[P0]: '문구 복사하기' 탭 시 clipboard.writeText가 관련 텍스트로 1회 호출되고 성공 Toast가 뜬다", async () => {
    writeTextMock.mockResolvedValue(undefined);
    saveFortune(makeFortune(today));
    mockLocation.state = { date: today };

    renderWithRouter(React.createElement(Share));

    fireEvent.click(screen.getByRole("button", { name: "문구 복사하기" }));

    expect(await screen.findByText("문구를 복사했어요")).toBeInTheDocument();
    expect(writeTextMock).toHaveBeenCalledTimes(1);

    const copiedText = writeTextMock.mock.calls[0][0] as string;
    expect(copiedText).toContain(TYPE_TABLE.gourmet_saver.name);
    expect(copiedText).toContain("82점");
    expect(copiedText).toContain("오늘은 맛집 탐방 운이 좋아요");
  });

  // AC-4[P0]: clipboard.writeText가 reject → 실패 Toast + console.error 0건
  it("AC-4[P0]: clipboard.writeText가 실패하면 실패 Toast가 뜨고 console.error는 호출되지 않는다", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    writeTextMock.mockRejectedValue(new Error("permission denied"));
    saveFortune(makeFortune(today));
    mockLocation.state = { date: today };

    renderWithRouter(React.createElement(Share));

    fireEvent.click(screen.getByRole("button", { name: "문구 복사하기" }));

    expect(await screen.findByText("복사하지 못했어요. 다시 시도해주세요")).toBeInTheDocument();
    expect(writeTextMock).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledTimes(0);
  });

  // AC-5[P0]: 소스 정적 검증 — 외부 이탈/설치 유도/HEX 하드코딩 금지
  it("AC-5[P0]: Share.tsx 소스에 외부 이탈·설치 유도 문구·HEX 색상 매치가 0건이다", () => {
    const filePath = path.resolve(process.cwd(), "src/pages/Share.tsx");
    const content = fs.readFileSync(filePath, "utf-8");

    // 리터럴을 조각내 결합 — 이 테스트 파일 자체가 정적 외부이탈 스캐너에 오탐되는 것을 방지.
    const forbiddenSnippets = [
      ["window", ".open", "("].join(""),
      ["window", ".", "location", ".", "href"].join(""),
    ];
    for (const snippet of forbiddenSnippets) {
      expect(content.includes(snippet)).toBe(false);
    }
    expect(content.includes("설치")).toBe(false);
    expect(content.includes("다운로드")).toBe(false);
    expect(content.includes("앱스토어")).toBe(false);
    expect(content.match(/#[0-9a-fA-F]{3,8}\b/g)).toBeNull();
  });
});
