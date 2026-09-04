/**
 * Packet 0012 — /input 폼: 카테고리 칩 + 금액/메모 입력 (Task 3.1)
 *
 * ⚠️ 이 패킷의 원본 프롬프트 본문(AC 1~8: PersonaHeroCard/AxisMiniBars/TipsCard/
 * QuizResult/친구 코드/궁합)은 이 저장소(spendingfortune)와 무관한 다른 앱의 스펙이
 * 잘못 섞여 들어온 것으로 보인다 — `QuizResult`/`PersonaHeroCard`/친구 코드/궁합 같은
 * 타입·개념이 이 프로젝트의 types.ts/spec.md 어디에도 없다. 패킷 "제목"
 * ("/input 폼 — 카테고리 칩 + 금액/메모 입력")은 이 저장소의 실제 스펙과 정확히 일치하므로
 * (.ai-factory/spec.md F2, .ai-factory/task.md Task 3.1), 잘못된 AC 목록 대신
 * 이 프로젝트의 진짜 스펙(F2-AC-4, F2-AC-5, F2-AC-8, F2-AC-9 — Task 3.1 범위)을 기준으로
 * 테스트를 작성한다. 목록·저장·무지출·navigate 플로우(F2-AC-1/2/3/6/7)는 Task 3.2 소관이라
 * 이 패킷 범위 밖이다(스캐폴드 Input.tsx 주석 참조).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { mockNavigate } from "@/__tests__/__helpers__/mocks";
import { CATEGORY_LABEL, type CategoryId } from "@/lib/types";

import Input from "@/pages/Input";

const ALL_CATEGORY_IDS: CategoryId[] = [
  "food",
  "cafe",
  "shopping",
  "transport",
  "culture",
  "health",
  "living",
  "etc",
];

function selectCategory(label: string) {
  fireEvent.click(screen.getByRole("button", { name: label }));
}

function getAmountInput(): HTMLInputElement {
  return screen.getByTestId("amount-input") as HTMLInputElement;
}

function getMemoInput(): HTMLInputElement {
  return screen.getByTestId("memo-input") as HTMLInputElement;
}

describe("/input 폼 — 카테고리 칩 + 금액/메모 입력 (Task 3.1)", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    // jsdom에는 scrollIntoView가 구현돼 있지 않다 — 컴포넌트가 호출하는지만 spy로 검증.
    Element.prototype.scrollIntoView = vi.fn();
  });

  // ==================== F2-AC-9[P1]: Layout 계약 ====================
  it("F2-AC-9[P1]: 카테고리 칩 8종이 data-testid=category-chip-{CategoryId}로 모두 렌더된다", () => {
    renderWithRouter(React.createElement(Input));

    const chips = screen.getAllByTestId(/^category-chip-/);
    expect(chips).toHaveLength(8);
    for (const id of ALL_CATEGORY_IDS) {
      const chip = screen.getByTestId(`category-chip-${id}`);
      expect(chip.textContent).toContain(CATEGORY_LABEL[id]);
    }
  });

  it("F2-AC-9[P1]: 최상위는 SubmitFooter(data-testid=submit-footer) 안에 전체폭 '운세 보기' 버튼을 갖는다", () => {
    renderWithRouter(React.createElement(Input));

    const footer = screen.getByTestId("submit-footer");
    const cta = screen.getByRole("button", { name: "운세 보기" });
    expect(footer).toBeInTheDocument();
    expect(footer.contains(cta)).toBe(true);
  });

  // ==================== F2-AC-4[P1]: 빈 금액 거부 ====================
  it("F2-AC-4[P1]: 카테고리 선택 후 금액을 비운 채 '추가'를 누르면 인라인 에러가 뜨고 navigate가 호출되지 않는다", () => {
    renderWithRouter(React.createElement(Input));

    selectCategory(CATEGORY_LABEL.food);
    fireEvent.change(getAmountInput(), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "추가" }));

    expect(screen.getByText("금액을 입력해주세요")).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("F2-AC-4[P1]: 금액 0으로 '추가'를 눌러도 동일한 인라인 에러가 뜬다", () => {
    renderWithRouter(React.createElement(Input));

    selectCategory(CATEGORY_LABEL.food);
    fireEvent.change(getAmountInput(), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: "추가" }));

    expect(screen.getByText("금액을 입력해주세요")).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  // ==================== F2-AC-5[P1]: 한도 초과 금액 거부 ====================
  it("F2-AC-5[P1]: 금액 10000001로 '추가'를 누르면 한도 초과 에러가 뜨고 금액 부족 에러는 뜨지 않는다", () => {
    renderWithRouter(React.createElement(Input));

    selectCategory(CATEGORY_LABEL.shopping);
    fireEvent.change(getAmountInput(), { target: { value: "10000001" } });
    fireEvent.click(screen.getByRole("button", { name: "추가" }));

    expect(screen.getByText("1천만원 이하로 입력해주세요")).toBeInTheDocument();
    expect(screen.queryByText("금액을 입력해주세요")).not.toBeInTheDocument();
  });

  // ==================== F2-AC-8[P1]: 모바일 키보드 동작 ====================
  it("F2-AC-8[P1]: 금액 입력은 inputMode=numeric이며 포커스 시 scrollIntoView({block:'center'})가 호출된다", () => {
    renderWithRouter(React.createElement(Input));

    const amountInput = getAmountInput();
    expect(amountInput).toHaveAttribute("inputmode", "numeric");

    fireEvent.focus(amountInput);
    expect(amountInput.scrollIntoView).toHaveBeenCalledWith({ block: "center" });
  });

  it("F2-AC-8[P1]: 유효한 입력으로 '추가'에 성공하면 금액 입력이 blur되어 키보드가 닫힌다", () => {
    renderWithRouter(React.createElement(Input));

    const amountInput = getAmountInput();
    const blurSpy = vi.spyOn(amountInput, "blur");

    selectCategory(CATEGORY_LABEL.food);
    fireEvent.change(amountInput, { target: { value: "12000" } });
    fireEvent.click(screen.getByRole("button", { name: "추가" }));

    expect(blurSpy).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("금액을 입력해주세요")).not.toBeInTheDocument();
  });

  // ==================== DoD: 메모 30자 제한 ====================
  it("DoD: 메모 입력에 maxLength=30이 지정되어 있다", () => {
    renderWithRouter(React.createElement(Input));

    const memoInput = getMemoInput();
    expect(memoInput).toHaveAttribute("maxlength", "30");
  });
});
