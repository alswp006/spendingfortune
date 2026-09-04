import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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

describe("/input 저장·목록·무지출", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("AC-1: 지출 1건 추가 후 저장 — getDayLog + Toast + navigate", () => {
    renderWithRouter(<Input />);

    selectCategory("식비");
    addEntry("12000", "점심");
    fireEvent.click(submitButton());

    const log = getDayLog(basisDate);
    expect(log.total).toBe(12000);
    expect(log.noSpend).toBe(false);
    expect(log.entries).toHaveLength(1);

    expect(screen.getByText("저장했어요")).toBeInTheDocument();
    expect(mockNavigate).toHaveBeenCalledWith("/result", { state: { date: today } });
  });

  it("AC-2: 무지출 원탭 저장", () => {
    renderWithRouter(<Input />);

    fireEvent.click(screen.getByRole("button", { name: "어제 무지출이었어요" }));

    const log = getDayLog(basisDate);
    expect(log.total).toBe(0);
    expect(log.noSpend).toBe(true);
    expect(log.entries).toEqual([]);

    expect(mockNavigate).toHaveBeenCalledWith("/result", { state: { date: today } });
  });

  it("AC-3: 두 번째 항목 삭제 시 목록 1건 + 합계 갱신", () => {
    renderWithRouter(<Input />);

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

  it("AC-4: 10건 상한 Toast + 항목 수 유지", () => {
    renderWithRouter(<Input />);

    selectCategory("식비");
    for (let i = 0; i < 10; i++) {
      addEntry(String(1000 + i));
    }
    expect(screen.getAllByTestId("entry-item")).toHaveLength(10);

    addEntry("5000");

    expect(screen.getByText("하루에 최대 10건까지 기록할 수 있어요")).toBeInTheDocument();
    expect(screen.getAllByTestId("entry-item")).toHaveLength(10);
  });

  it("AC-4: 항목 0건이면 EmptyState + 운세 보기 disabled", () => {
    renderWithRouter(<Input />);

    expect(screen.getByTestId("entries-empty")).toBeInTheDocument();
    expect(screen.getByText("어제 쓴 돈을 하나씩 담아주세요")).toBeInTheDocument();
    expect(submitButton()).toBeDisabled();
  });

  it("AC-5: 3회 연타해도 saveDayLog는 1회만 호출되고 loading 상태를 보인다", () => {
    const saveSpy = vi.spyOn(storage, "saveDayLog");
    renderWithRouter(<Input />);

    selectCategory("식비");
    addEntry("12000");

    fireEvent.click(submitButton());
    expect(submitButton()).toBeDisabled();
    fireEvent.click(submitButton());
    fireEvent.click(submitButton());

    expect(saveSpy).toHaveBeenCalledTimes(1);
  });

  it("AC-5: 저장 실패 시 실패 Toast를 보여주고 console.error를 찍지 않는다", () => {
    vi.spyOn(storage, "saveDayLog").mockReturnValue({ ok: false, reason: "QUOTA_EXCEEDED" });
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    renderWithRouter(<Input />);

    selectCategory("식비");
    addEntry("12000");
    fireEvent.click(submitButton());

    expect(screen.getByText("저장하지 못했어요. 다시 시도해주세요")).toBeInTheDocument();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
