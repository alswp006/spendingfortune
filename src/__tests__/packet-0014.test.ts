/**
 * Packet 0014 — /result 운세 결과 · 리워드 광고 게이트
 *
 * 범위: Result.tsx가 location.state.date(없으면 todayKST())로 computeFortune을 호출하고,
 * NO_BASIS_LOG면 빈 상태, unlocked===false면 TossRewardAd로 게이트, unlocked===true면
 * 즉시 결과(점수 히어로 · 캐릭터 이미지 · 조언 카드 · lucky/caution 칩 · 주의보 · 공유 CTA)를
 * 렌더한다는 것을 검증한다.
 *
 * 이 패킷이 계약하는 신규 data-testid (Coder는 정확히 이 이름으로 렌더해야 한다):
 *  - "result-alert" : 주의보(alerts) 각 항목 행 (getAllByTestId로 개수 검증, 최대 2개)
 *
 * TossRewardAd는 전역 목(vitest.setup.ts)이 children을 즉시 노출해버려 "게이트가 실제로
 * 걸렸는가"를 검증할 수 없다 — 이 파일에서만 로컬로 재정의해 실제 컴포넌트 prop 계약
 * (onRewarded)을 그대로 호출 스파이로 감싸 사용한다.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { mockAll, mockNavigate, mockLocation } from "@/__tests__/__helpers__/mocks";
import * as storage from "@/lib/storage";
import { saveDayLog, saveFortune, getFortune } from "@/lib/storage";
import { todayKST, addDays } from "@/lib/date";
import { TYPE_TABLE } from "@/lib/fortuneTable";
import { CATEGORY_LABEL } from "@/lib/types";
import type { FortuneRecord } from "@/lib/types";
import * as computeFortuneModule from "@/lib/computeFortune";
import { computeFortune } from "@/lib/computeFortune";

mockAll(); // TDS + @apps-in-toss + react-router mocks (TossRewardAd is re-mocked locally below)

const { tossRewardAdCalls } = vi.hoisted(() => ({
  tossRewardAdCalls: [] as Array<{ onRewarded?: () => void }>,
}));

vi.mock("@/components/TossRewardAd", () => ({
  TossRewardAd: (props: { children: React.ReactNode; onRewarded?: () => void }) => {
    tossRewardAdCalls.push(props);
    if (props.onRewarded) {
      setTimeout(props.onRewarded, 0);
    }
    return props.children;
  },
}));

import Result from "@/pages/Result";

const LOCK_MESSAGE = "광고를 보면 오늘의 소비운세가 열려요";

function seedBasisDayLog(basisDate: string, total = 12000) {
  saveDayLog({
    date: basisDate,
    entries: [{ id: "e1", category: "food", amount: total, memo: "점심", createdAt: 1 }],
    noSpend: false,
    total,
    updatedAt: 1,
  });
}

function makeRecord(date: string, overrides: Partial<FortuneRecord> = {}): FortuneRecord {
  return {
    date,
    basisDate: addDays(date, -1),
    score: 82,
    typeId: "gourmet_saver",
    headline: "오늘은 맛집에서 알뜰하게 즐긴 날이에요",
    advice: "좋아하는 메뉴를 골라도 지출이 자연스럽게 균형을 잡아요",
    savingTip: "점심 특선이나 세트 메뉴로 한 끼 비용을 줄여보세요",
    luckyCategory: "transport",
    cautionCategory: "food",
    estimatedSaving: 3000,
    alerts: [
      {
        rule: "CATEGORY_CONCENTRATION",
        level: "caution",
        category: "food",
        ratio: 0.6,
        message: "최근 7일 지출의 60%가 음식에 몰렸어요",
      },
      {
        rule: "SPIKE",
        level: "danger",
        category: null,
        ratio: 2.3,
        message: "어제 지출이 평소의 2.3배예요",
      },
    ],
    yesterdayTotal: 30000,
    unlocked: false,
    createdAt: Date.now(),
    ...overrides,
  };
}

describe("/result 운세 결과 — 리워드 광고 게이트", () => {
  beforeEach(() => {
    mockLocation.state = null;
    tossRewardAdCalls.length = 0;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    mockLocation.state = null;
  });

  // ==================== AC-1[P0]: computeFortune 호출 date 결정 ====================
  it("AC-1[P0]: state.date가 없으면 todayKST() 기준으로 computeFortune을 1회 호출한다", () => {
    const today = todayKST();
    seedBasisDayLog(addDays(today, -1));
    mockLocation.state = null;

    const spy = vi.spyOn(computeFortuneModule, "computeFortune");
    renderWithRouter(React.createElement(Result));

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(today);
  });

  it("AC-1[P0]: state.date가 있으면 그 날짜로 computeFortune을 1회 호출한다(오늘 날짜 아님)", () => {
    const stateDate = "2026-01-10";
    seedBasisDayLog(addDays(stateDate, -1));
    mockLocation.state = { date: stateDate };

    const spy = vi.spyOn(computeFortuneModule, "computeFortune");
    renderWithRouter(React.createElement(Result));

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(stateDate);
    expect(stateDate).not.toBe(todayKST());
  });

  // ==================== AC-2[P0]: NO_BASIS_LOG 빈 상태 ====================
  it("AC-2[P0]: 어제 기록이 없으면 빈 상태를 보여주고 버튼 탭 시 /input으로 1회 이동한다", () => {
    const date = "2026-02-01"; // 이 날짜의 basisDate(01-31)에는 daylog를 심지 않는다
    mockLocation.state = { date };

    renderWithRouter(React.createElement(Result));

    expect(screen.getByText("어제 기록이 없어서 운세를 만들 수 없어요")).toBeInTheDocument();
    const cta = screen.getByRole("button", { name: "어제 지출 기록하기" });
    expect(cta).toBeInTheDocument();

    fireEvent.click(cta);

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/input", undefined);
  });

  // ==================== AC-3[P0]: 잠금 상태 → 광고 게이트 → 언락 ====================
  it("AC-3[P0]: unlocked===false면 TossRewardAd로 게이트되고 잠금 문구가 보이며, 시청 완료 콜백 후 unlocked가 true로 바뀐다", async () => {
    const date = "2026-03-05";
    seedBasisDayLog(addDays(date, -1));
    mockLocation.state = { date };

    // 컴포넌트보다 먼저 계산해 결정론적 headline을 확보(캐시로 재사용됨)
    const computed = computeFortune(date);
    expect(computed.ok).toBe(true);
    if (!computed.ok) return;
    expect(computed.value.unlocked).toBe(false);

    renderWithRouter(React.createElement(Result));

    expect(screen.getByText(LOCK_MESSAGE)).toBeInTheDocument();
    expect(tossRewardAdCalls.length).toBeGreaterThanOrEqual(1);

    await waitFor(() => {
      expect(getFortune(date)?.unlocked).toBe(true);
    });
    expect(screen.getByText(computed.value.headline)).toBeInTheDocument();
  });

  // ==================== AC-4[P0]: 이미 unlocked인 재진입 ====================
  it("AC-4[P0]: unlocked===true로 재진입하면 게이트 없이 즉시 결과가 보이고 saveFortune은 호출되지 않는다", () => {
    const date = "2026-04-05";
    const record = makeRecord(date, { unlocked: true });
    saveFortune(record);
    mockLocation.state = { date };

    const saveSpy = vi.spyOn(storage, "saveFortune");
    renderWithRouter(React.createElement(Result));

    expect(tossRewardAdCalls.length).toBe(0);
    expect(screen.queryByText(LOCK_MESSAGE)).toBeNull();
    expect(screen.getByText(record.headline)).toBeInTheDocument();
    expect(saveSpy).not.toHaveBeenCalled();
  });

  // ==================== AC-5[P1]: 점수 히어로 · 캐릭터 · 공유 CTA ====================
  it("AC-5[P1]: 점수가 히어로로, 캐릭터 이미지가 160x160으로, 공유 버튼 탭 시 /share로 이동한다", () => {
    const date = "2026-05-05";
    const record = makeRecord(date, { unlocked: true, score: 82, typeId: "gourmet_saver" });
    saveFortune(record);
    mockLocation.state = { date };

    renderWithRouter(React.createElement(Result));

    expect(screen.getByText(/82/)).toBeInTheDocument();

    const typeInfo = TYPE_TABLE.gourmet_saver;
    const img = screen.getByRole("img", { name: typeInfo.name }) as HTMLImageElement;
    expect(img.getAttribute("src")).toBe(typeInfo.imageSrc);
    expect(img.width).toBe(160);
    expect(img.height).toBe(160);

    fireEvent.click(screen.getByRole("button", { name: "공유 카드 만들기" }));
    expect(mockNavigate).toHaveBeenCalledWith("/share", { state: { date } });
  });

  // ==================== AC-5[P1]: 주의보 · lucky/caution 칩 ====================
  it("AC-5[P1]: 주의보가 최대 2개 행으로, lucky/caution 카테고리가 칩으로 렌더된다", () => {
    const date = "2026-06-05";
    const record = makeRecord(date, {
      unlocked: true,
      luckyCategory: "transport",
      cautionCategory: "food",
    });
    saveFortune(record);
    mockLocation.state = { date };

    renderWithRouter(React.createElement(Result));

    const alertRows = screen.getAllByTestId("result-alert");
    expect(alertRows.length).toBe(record.alerts.length);
    expect(screen.getByText(record.alerts[0].message)).toBeInTheDocument();
    expect(screen.getByText(record.alerts[1].message)).toBeInTheDocument();

    expect(screen.getByText(CATEGORY_LABEL.transport)).toBeInTheDocument();
    expect(screen.getByText(CATEGORY_LABEL.food)).toBeInTheDocument();
  });
});
