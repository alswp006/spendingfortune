import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { screen, fireEvent, within } from "@testing-library/react";
import { mockAll, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { saveDayLog, saveFortune } from "@/lib/storage";
import { getStats } from "@/lib/stats";
import { todayKST, addDays } from "@/lib/date";
import { formatNumber } from "@/lib/utils";
import { TYPE_TABLE } from "@/lib/fortuneTable";
import type { DayLog, FortuneRecord, FortuneTypeId } from "@/lib/types";

import History from "@/pages/History";

mockAll();

function makeDayLog(date: string, total: number): DayLog {
  return {
    date,
    entries:
      total > 0
        ? [{ id: `entry-${date}`, category: "food", amount: total, memo: "", createdAt: Date.now() }]
        : [],
    noSpend: total === 0,
    total,
    updatedAt: Date.now(),
  };
}

function makeFortune(
  date: string,
  score: number,
  typeId: FortuneTypeId,
  yesterdayTotal = 10000,
): FortuneRecord {
  return {
    date,
    basisDate: addDays(date, -1),
    score,
    typeId,
    headline: "헤드라인",
    advice: "조언",
    savingTip: "팁",
    luckyCategory: "food",
    cautionCategory: null,
    estimatedSaving: 1000,
    alerts: [],
    yesterdayTotal,
    unlocked: true,
    createdAt: Date.now(),
  };
}

describe("[부가] /history 7일 소비운세 히스토리", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it("AC-1[P0]: 기록 3일 존재 시 골격(Top·Sparkline·MiniBar·리스트 3건)이 렌더된다", () => {
    const today = todayKST();
    const d0 = today;
    const d1 = addDays(today, -1);
    const d2 = addDays(today, -2);

    saveDayLog(makeDayLog(d0, 12000));
    saveDayLog(makeDayLog(d1, 30000));
    saveDayLog(makeDayLog(d2, 5000));
    saveFortune(makeFortune(d0, 80, "gourmet_saver"));
    saveFortune(makeFortune(d1, 60, "cafe_addict"));
    saveFortune(makeFortune(d2, 40, "smart_shopper"));

    renderWithRouter(React.createElement(History));

    expect(screen.getByText("소비운세 히스토리")).toBeInTheDocument();
    expect(screen.getAllByTestId("history-sparkline")).toHaveLength(1);
    expect(screen.getAllByTestId("history-category-bar")).toHaveLength(1);
    expect(screen.getAllByTestId("history-list-item")).toHaveLength(3);
  });

  it("AC-1[P0]: 리스트 항목에 날짜별 총액·점수·유형이 표시된다", () => {
    const today = todayKST();
    const d0 = today;
    const d1 = addDays(today, -1);

    saveDayLog(makeDayLog(d0, 12000));
    saveDayLog(makeDayLog(d1, 30000));
    saveFortune(makeFortune(d0, 80, "gourmet_saver"));
    saveFortune(makeFortune(d1, 60, "cafe_addict"));

    renderWithRouter(React.createElement(History));

    expect(screen.getByText(`${formatNumber(12000)}원`)).toBeInTheDocument();
    expect(screen.getByText("80점")).toBeInTheDocument();
    expect(screen.getByText(TYPE_TABLE.gourmet_saver.name)).toBeInTheDocument();
    expect(screen.getByText(`${formatNumber(30000)}원`)).toBeInTheDocument();
    expect(screen.getByText("60점")).toBeInTheDocument();
    expect(screen.getByText(TYPE_TABLE.cafe_addict.name)).toBeInTheDocument();
  });

  it("AC-2: 기록 0건이면 시각화 없이 빈 상태(아이콘+안내+CTA)만 노출되고 CTA는 /input으로 이동한다", () => {
    renderWithRouter(React.createElement(History));

    expect(screen.queryByTestId("history-sparkline")).not.toBeInTheDocument();
    expect(screen.queryByTestId("history-category-bar")).not.toBeInTheDocument();
    expect(screen.queryAllByTestId("history-list-item")).toHaveLength(0);

    const empty = screen.getByTestId("history-empty");
    expect(within(empty).getByRole("img")).toBeInTheDocument();
    expect(screen.getByText("아직 기록이 없어요")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "지출 기록하러 가기" }));
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/input", undefined);
  });

  it("AC-3[P0]: 리스트 항목 탭 시 해당 날짜로 /result 이동 + 히트 영역이 44px 이상이다", () => {
    const today = todayKST();
    saveDayLog(makeDayLog(today, 12000));
    saveFortune(makeFortune(today, 80, "gourmet_saver"));

    renderWithRouter(React.createElement(History));

    const items = screen.getAllByTestId("history-list-item");
    expect(items).toHaveLength(1);

    fireEvent.click(items[0]);

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/result", { state: { date: today } });
    expect(items[0]).toHaveStyle({ minHeight: "44px" });
  });

  it("AC-4: 35건 기록 시 초기 20건만 렌더되고 '더 보기' 1회 탭 시 35건 전부 렌더된다", () => {
    const today = todayKST();
    for (let i = 0; i < 35; i++) {
      saveDayLog(makeDayLog(addDays(today, -i), 1000 + i));
    }

    renderWithRouter(React.createElement(History));

    expect(screen.getAllByTestId("history-list-item")).toHaveLength(20);

    fireEvent.click(screen.getByRole("button", { name: "더 보기" }));

    expect(screen.getAllByTestId("history-list-item")).toHaveLength(35);
  });

  it("AC-5: 최근 7일 하루 평균이 getStats().dailyAvg와 동일한 콤마 문자열로 표시되고 하드코딩 HEX가 없다", () => {
    const today = todayKST();
    const totals = [10000, 20000, 15000, 5000, 30000, 0, 8000];
    totals.forEach((t, i) => saveDayLog(makeDayLog(addDays(today, -i), t)));

    const { container } = renderWithRouter(React.createElement(History));

    const expected = getStats(today, 7).dailyAvg;
    expect(expected).toBeGreaterThan(0);
    expect(screen.getByTestId("history-avg-hero").textContent).toContain(formatNumber(expected));
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,6}\b/);
  });
});
