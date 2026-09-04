import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { mockAll, mockNavigate } from '@/__tests__/__helpers__/mocks';
import { renderWithRouter } from '@/__tests__/__helpers__/test-utils';
import { saveDayLog, saveFortune } from '@/lib/storage';
import { getStats } from '@/lib/stats';
import { todayKST, addDays } from '@/lib/date';
import { formatNumber } from '@/lib/utils';
import type { DayLog, FortuneRecord, FortuneTypeId } from '@/lib/types';
import History from '@/pages/History';

mockAll();

const today = todayKST();

function makeDayLog(date: string, total: number): DayLog {
  return {
    date,
    entries: total > 0 ? [{ id: `e-${date}`, category: 'food', amount: total, memo: '', createdAt: Date.now() }] : [],
    noSpend: total === 0,
    total,
    updatedAt: Date.now(),
  };
}

function makeFortune(date: string, score: number, typeId: FortuneTypeId): FortuneRecord {
  return {
    date,
    basisDate: addDays(date, -1),
    score,
    typeId,
    headline: '헤드라인',
    advice: '조언',
    savingTip: '팁',
    luckyCategory: 'food',
    cautionCategory: null,
    estimatedSaving: 1000,
    alerts: [],
    yesterdayTotal: 10000,
    unlocked: true,
    createdAt: Date.now(),
  };
}

describe('/history 소비운세 히스토리', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('AC-1: 기록 3일이면 Sparkline·MiniBar·리스트 3건이 렌더된다', () => {
    const dates = [today, addDays(today, -1), addDays(today, -2)];
    dates.forEach((d, i) => {
      saveDayLog(makeDayLog(d, 12000 + i * 1000));
      saveFortune(makeFortune(d, 60 + i * 10, 'balance_master'));
    });

    renderWithRouter(<History />);

    expect(screen.getByTestId('history-sparkline')).toBeInTheDocument();
    expect(screen.getAllByTestId('history-category-bar').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByTestId('history-list-item')).toHaveLength(3);
  });

  it('AC-2: 기록 0건이면 빈 상태만 노출하고 CTA는 /input으로 이동한다', () => {
    renderWithRouter(<History />);

    expect(screen.getByTestId('history-empty')).toBeInTheDocument();
    expect(screen.queryByTestId('history-sparkline')).not.toBeInTheDocument();
    expect(screen.queryByTestId('history-category-bar')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '지출 기록하러 가기' }));
    expect(mockNavigate).toHaveBeenCalledWith('/input', undefined);
  });

  it('AC-3: 리스트 항목 탭 시 /result로 1회 이동하고 히트 영역이 44px 이상이다', () => {
    saveDayLog(makeDayLog(today, 12000));
    saveFortune(makeFortune(today, 80, 'gourmet_saver'));

    renderWithRouter(<History />);

    const items = screen.getAllByTestId('history-list-item');
    expect(items).toHaveLength(1);
    fireEvent.click(items[0]);

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/result', { state: { date: today } });
    expect(items[0]).toHaveStyle({ minHeight: '44px' });
  });

  it('AC-4: 35건 상태에서 초기 20건만 렌더되고 더 보기 1회 탭 시 35건 전부 렌더한다', () => {
    for (let i = 0; i < 35; i++) {
      saveDayLog(makeDayLog(addDays(today, -i), 1000 + i));
    }

    renderWithRouter(<History />);

    expect(screen.getAllByTestId('history-list-item')).toHaveLength(20);

    fireEvent.click(screen.getByRole('button', { name: '더 보기' }));

    expect(screen.getAllByTestId('history-list-item')).toHaveLength(35);
  });

  it('AC-5: 상단 요약 값이 getStats().dailyAvg와 동일한 천단위 콤마 문자열이고 HEX 색상이 없다', () => {
    const totals = [10000, 20000, 15000, 5000, 30000, 0, 8000];
    totals.forEach((t, i) => saveDayLog(makeDayLog(addDays(today, -i), t)));

    const { container } = renderWithRouter(<History />);

    const expected = getStats(today, 7).dailyAvg;
    expect(screen.getByTestId('history-avg-hero')).toHaveTextContent(formatNumber(expected));
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/);
  });
});
