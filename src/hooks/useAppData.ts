import { useCallback, useEffect, useState } from 'react';
import type { AppMeta, DayLog, FortuneRecord } from '@/lib/types';
import { STORAGE_KEYS } from '@/lib/types';
import { addDays, todayKST } from '@/lib/date';
import { getDayLog, getFortune, getMeta, listDayLogs, patchMeta, removeItem } from '@/lib/storage';

const STREAK_LOOKBACK_DAYS = 90;

/** logs 중 endDate에서 거꾸로 연속 기록된 날짜 수 (기록 없으면 0, 예외 없음) */
export function computeStreak(logs: DayLog[], endDate: string): number {
  const dates = new Set(logs.map((l) => l.date));
  let count = 0;
  let cursor = endDate;
  while (dates.has(cursor)) {
    count++;
    cursor = addDays(cursor, -1);
  }
  return count;
}

export interface UseAppDataResult {
  loading: boolean;
  meta: AppMeta;
  streak: number;
  todayDate: string;
  yesterdayLog: DayLog;
  todayFortune: FortuneRecord | null;
  refresh: () => Promise<void>;
  resetAll: () => Promise<void>;
}

/** 앱 전역 상태: 오늘/어제 기준 데이터 + 스트릭을 읽어 meta에 반영한다 */
export function useAppData(): UseAppDataResult {
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<AppMeta>(() => getMeta());
  const [streak, setStreak] = useState(0);
  const [todayDate, setTodayDate] = useState(() => todayKST());
  const [yesterdayLog, setYesterdayLog] = useState<DayLog>(() => getDayLog(addDays(todayKST(), -1)));
  const [todayFortune, setTodayFortune] = useState<FortuneRecord | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    // 마이크로태스크 하나를 양보해 마운트 직후 loading===true를 관측 가능하게 한다.
    await Promise.resolve();

    const today = todayKST();
    const yesterday = addDays(today, -1);
    const recentLogs = listDayLogs(addDays(yesterday, -(STREAK_LOOKBACK_DAYS - 1)), yesterday);
    const nextStreak = computeStreak(recentLogs, yesterday);

    const patchResult = patchMeta({ streakCount: nextStreak, lastOpenDate: today });
    const nextMeta = patchResult.ok ? patchResult.value : getMeta();

    setTodayDate(today);
    setYesterdayLog(getDayLog(yesterday));
    setTodayFortune(getFortune(today));
    setStreak(nextStreak);
    setMeta(nextMeta);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resetAll = useCallback(async () => {
    removeItem(STORAGE_KEYS.dayLogs);
    removeItem(STORAGE_KEYS.fortunes);
    patchMeta({ streakCount: 0 });
    await load();
  }, [load]);

  return { loading, meta, streak, todayDate, yesterdayLog, todayFortune, refresh: load, resetAll };
}
