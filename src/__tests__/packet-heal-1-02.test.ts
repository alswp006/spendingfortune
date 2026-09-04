import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import { mockAll, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import * as storage from "@/lib/storage";
import { getDayLog } from "@/lib/storage";
import { todayKST, addDays } from "@/lib/date";

import Input from "@/pages/Input";

mockAll();

const today = todayKST();
const basisDate = addDays(today, -1);

function selectCategory(label: string) {
  fireEvent.click(screen.getByRole("button", { name: label }));
}

function addEntry(amount: string, memo = "") {
  fireEvent.change(screen.getByTestId("amount-input"), { target: { value: amount } });
  if (memo) {
    fireEvent.change(screen.getByTestId("memo-input"), { target: { value: memo } });
  }
  fireEvent.click(screen.getByRole("button", { name: "추가" }));
}

function submitButton(): HTMLElement {
  return screen.getByRole("button", { name: "운세 보기" });
}

describe("/input 항목 목록·무지출·저장 후 /result 이동 완성", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("AC-1[P0]: 식비 12000 + 메모 '점심' 추가 후 '운세 보기' 탭 시 저장·Toast·navigate가 정확히 일어난다", () => {
    renderWithRouter(React.createElement(Input));

    selectCategory("식비");
    addEntry("12000", "점심");
    fireEvent.click(submitButton());

    const log = getDayLog(basisDate);
    expect(log.total).toBe(12000);
    expect(log.noSpend).toBe(false);
    expect(log.entries).toHaveLength(1);

    expect(screen.getByText("저장했어요")).toBeInTheDocument();
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/result", { state: { date: today } });
  });

  it("AC-2[P0]: 항목 0건에서 '어제 무지출이었어요' 탭 시 noSpend 로그 저장 + 동일한 navigate 호출", () => {
    renderWithRouter(React.createElement(Input));

    fireEvent.click(screen.getByRole("button", { name: "어제 무지출이었어요" }));

    const log = getDayLog(basisDate);
    expect(log.total).toBe(0);
    expect(log.noSpend).toBe(true);
    expect(log.entries).toEqual([]);

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/result", { state: { date: today } });
  });

  it("AC-3: 두 번째 항목 삭제 시 목록이 1건으로 줄고 합계가 '12,000원'으로 재계산되며 삭제 버튼은 44px 이상 히트영역을 갖는다", () => {
    renderWithRouter(React.createElement(Input));

    selectCategory("식비");
    addEntry("12000");
    selectCategory("카페/간식");
    addEntry("4500");

    const deleteButtons = screen.getAllByRole("button", { name: "삭제" });
    expect(deleteButtons).toHaveLength(2);
    expect(deleteButtons[1]).toHaveStyle({ minWidth: "44px", minHeight: "44px" });

    fireEvent.click(deleteButtons[1]);

    expect(screen.getAllByTestId("entry-item")).toHaveLength(1);
    expect(screen.getByTestId("entries-total").textContent).toContain("12,000원");
  });

  it("AC-4: 항목이 이미 10건일 때 추가하면 상한 Toast가 뜨고 항목 수는 10으로 유지된다", () => {
    renderWithRouter(React.createElement(Input));

    selectCategory("식비");
    for (let i = 0; i < 10; i++) {
      addEntry(String(1000 + i));
    }
    expect(screen.getAllByTestId("entry-item")).toHaveLength(10);

    addEntry("5000");

    expect(screen.getByText("하루에 최대 10건까지 기록할 수 있어요")).toBeInTheDocument();
    expect(screen.getAllByTestId("entry-item")).toHaveLength(10);
  });

  it("AC-4: 항목 0건이면 Asset 아이콘과 안내 문구를 갖춘 EmptyState가 렌더된다", () => {
    renderWithRouter(React.createElement(Input));

    expect(screen.getByTestId("entries-empty")).toBeInTheDocument();
    expect(screen.getByText("어제 쓴 돈을 하나씩 담아주세요")).toBeInTheDocument();
    expect(screen.queryAllByTestId("entry-item")).toHaveLength(0);
  });

  it("AC-5[P0]: 저장 버튼을 연속 2회 탭해도 saveDayLog·navigate는 각각 1회만 호출된다", () => {
    const saveSpy = vi.spyOn(storage, "saveDayLog");
    renderWithRouter(React.createElement(Input));

    selectCategory("식비");
    addEntry("12000");

    fireEvent.click(submitButton());
    expect(submitButton()).toBeDisabled();
    fireEvent.click(submitButton());
    fireEvent.click(submitButton());

    expect(saveSpy).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it("AC-5[P0]: saveDayLog가 실패하면 navigate는 호출되지 않고 실패 Toast가 뜨며 버튼이 재활성화된다 (console.error 없음)", () => {
    vi.spyOn(storage, "saveDayLog").mockReturnValue({ ok: false, reason: "QUOTA_EXCEEDED" });
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    renderWithRouter(React.createElement(Input));

    selectCategory("식비");
    addEntry("12000");
    fireEvent.click(submitButton());

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.getByText("저장하지 못했어요. 다시 시도해주세요")).toBeInTheDocument();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(submitButton()).not.toBeDisabled();
  });
});
