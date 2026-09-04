/**
 * Packet 0013 — /input 목록·무지출·저장 후 /result 이동 (Task 3.2)
 *
 * 범위: Input.tsx에 추가되는 "항목 목록 Card(삭제·합계) · 빈 상태 · 10건 상한 Toast ·
 * '어제 무지출이었어요' · 저장(saveDayLog → Toast → navigate) · 중복 탭 방지/실패 Toast".
 * 카테고리 칩·금액/메모 입력·검증(F2-AC-4/5/8/9)은 packet-0012(Task 3.1) 소관이라
 * 이 파일에서 다시 다루지 않는다.
 *
 * 이 패킷이 계약하는 신규 data-testid (Coder는 정확히 이 이름으로 렌더해야 한다):
 *  - "entry-item"      : 추가된 항목 각 행 (getAllByTestId로 개수 검증)
 *  - "entries-total"   : 항목 목록 상단/근처의 합계 텍스트 노드
 *  - "entries-empty"   : 항목 0건일 때의 EmptyState 래퍼
 *  - 삭제 버튼          : role="button", accessible name "삭제"
 *  - 무지출 버튼        : role="button", accessible name "어제 무지출이었어요"
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { screen, fireEvent, within } from "@testing-library/react";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { mockNavigate } from "@/__tests__/__helpers__/mocks";
import * as storage from "@/lib/storage";
import { getDayLog } from "@/lib/storage";
import { todayKST, addDays } from "@/lib/date";
import { CATEGORY_LABEL } from "@/lib/types";

import Input from "@/pages/Input";

const TODAY = todayKST();
const BASIS_DATE = addDays(TODAY, -1);

function selectCategory(label: string) {
  fireEvent.click(screen.getByRole("button", { name: label }));
}

function getAmountInput(): HTMLInputElement {
  return screen.getByTestId("amount-input") as HTMLInputElement;
}

function getMemoInput(): HTMLInputElement {
  return screen.getByTestId("memo-input") as HTMLInputElement;
}

/** 카테고리는 이미 선택돼 있다고 가정하고 금액만 채워 "추가"를 누른다 */
function addEntry(amount: string) {
  fireEvent.change(getAmountInput(), { target: { value: amount } });
  fireEvent.click(screen.getByRole("button", { name: "추가" }));
}

function submitButton(): HTMLElement {
  return screen.getByRole("button", { name: "운세 보기" });
}

describe("/input 목록·무지출·저장 후 /result 이동 (Task 3.2)", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==================== AC-1[P0]: 항목 저장 후 /result 이동 ====================
  it("AC-1[P0]: 식비 12000+메모 '점심' 추가 후 '운세 보기' → DayLog가 저장되고 /result로 이동한다", () => {
    renderWithRouter(React.createElement(Input));

    selectCategory(CATEGORY_LABEL.food);
    fireEvent.change(getAmountInput(), { target: { value: "12000" } });
    fireEvent.change(getMemoInput(), { target: { value: "점심" } });
    fireEvent.click(screen.getByRole("button", { name: "추가" }));

    fireEvent.click(submitButton());

    const log = getDayLog(BASIS_DATE);
    expect(log.total).toBe(12000);
    expect(log.noSpend).toBe(false);
    expect(log.entries.length).toBe(1);
    expect(log.entries[0].memo).toBe("점심");
    expect(screen.getByText("저장했어요")).toBeInTheDocument();
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/result", { state: { date: TODAY } });
  });

  // ==================== AC-2[P0]: 무지출 저장 후 /result 이동 ====================
  it("AC-2[P0]: 항목 0건에서 '어제 무지출이었어요' 탭 → DayLog가 noSpend:true로 저장되고 /result로 이동한다", () => {
    renderWithRouter(React.createElement(Input));

    fireEvent.click(screen.getByRole("button", { name: "어제 무지출이었어요" }));

    const log = getDayLog(BASIS_DATE);
    expect(log.total).toBe(0);
    expect(log.noSpend).toBe(true);
    expect(log.entries).toEqual([]);
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/result", { state: { date: TODAY } });
  });

  // ==================== AC-3[P1]: 목록 삭제 + 합계 갱신 ====================
  it("AC-3[P1]: 식비 12000+카페/간식 4500에서 두 번째 항목을 삭제하면 목록 1건·합계 12,000원이 되고 삭제 버튼 히트영역은 44x44 이상이다", () => {
    renderWithRouter(React.createElement(Input));

    selectCategory(CATEGORY_LABEL.food);
    addEntry("12000");
    selectCategory(CATEGORY_LABEL.cafe);
    addEntry("4500");

    expect(screen.getAllByTestId("entry-item")).toHaveLength(2);

    const deleteButtons = screen.getAllByRole("button", { name: "삭제" });
    expect(deleteButtons).toHaveLength(2);
    expect(deleteButtons[1]).toHaveStyle({ minWidth: "44px", minHeight: "44px" });

    fireEvent.click(deleteButtons[1]);

    expect(screen.getAllByTestId("entry-item")).toHaveLength(1);
    expect(screen.getByTestId("entries-total").textContent).toContain("12,000원");
  });

  // ==================== AC-4[P1]: 10건 상한 + 빈 상태 ====================
  it("AC-4[P1]: 항목 10건에서 '추가'를 누르면 상한 Toast가 뜨고 항목 수는 10을 유지한다", () => {
    renderWithRouter(React.createElement(Input));

    selectCategory(CATEGORY_LABEL.etc);
    for (let i = 0; i < 10; i++) {
      addEntry(String(1000 + i));
    }
    expect(screen.getAllByTestId("entry-item")).toHaveLength(10);

    addEntry("5000");

    expect(screen.getByText("하루에 최대 10건까지 기록할 수 있어요")).toBeInTheDocument();
    expect(screen.getAllByTestId("entry-item")).toHaveLength(10);
  });

  it("AC-4[P1]: 항목 0건이면 EmptyState(아이콘+안내문)가 뜨고 '운세 보기'는 비활성이다", () => {
    renderWithRouter(React.createElement(Input));

    const empty = screen.getByTestId("entries-empty");
    expect(empty).toBeInTheDocument();
    expect(screen.getByText("어제 쓴 돈을 하나씩 담아주세요")).toBeInTheDocument();
    // 빈 상태 아이콘은 로컬 일러스트(Asset.Image)다 — Asset.ContentIcon은 static.toss.im을
    // fetch하다 실패하면 throw해 트리를 언마운트시켜(흰 화면 + console.error) 쓰지 않는다.
    expect(within(empty).getByRole("img")).toBeInTheDocument();
    expect(submitButton()).toBeDisabled();
  });

  // ==================== AC-5[P1]: 중복 탭 방지 + 저장 실패 처리 ====================
  it("AC-5[P1]: 저장 중 '운세 보기'를 3회 연타해도 saveDayLog는 1회만 호출된다", () => {
    const saveSpy = vi.spyOn(storage, "saveDayLog");
    renderWithRouter(React.createElement(Input));

    selectCategory(CATEGORY_LABEL.food);
    addEntry("12000");

    fireEvent.click(submitButton());
    expect(submitButton()).toBeDisabled();
    fireEvent.click(submitButton());
    fireEvent.click(submitButton());

    expect(saveSpy).toHaveBeenCalledTimes(1);
  });

  it("AC-5[P1]: 저장 결과가 ok:false면 실패 Toast만 뜨고 콘솔 에러·화면 이동은 없다", () => {
    vi.spyOn(storage, "saveDayLog").mockReturnValue({ ok: false, reason: "QUOTA_EXCEEDED" });
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    renderWithRouter(React.createElement(Input));

    selectCategory(CATEGORY_LABEL.food);
    addEntry("12000");
    fireEvent.click(submitButton());

    expect(screen.getByText("저장하지 못했어요. 다시 시도해주세요")).toBeInTheDocument();
    expect(consoleErrorSpy).toHaveBeenCalledTimes(0);
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
