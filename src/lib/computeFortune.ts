import type { FortuneRecord, Result } from '@/lib/types';
import { getDayLog, getFortune, saveFortune } from '@/lib/storage';
import { addDays } from '@/lib/date';
import {
  computeScore,
  computeEstimatedSaving,
  resolveDominantGroup,
  resolveTypeId,
  resolveLuckyCategory,
  resolveCautionCategory,
  scoreBandOf,
} from '@/lib/fortuneEngine';
import { COPY_TABLE } from '@/lib/fortuneTable';
import { detectAlerts } from '@/lib/alerts';
import { getStats } from '@/lib/stats';

// 운세 오케스트레이션: 캐시 → 근거일 가드 → 점수/유형/문구/주의보 조립 → 1회 저장

export function computeFortune(date: string): Result<FortuneRecord> {
  const cached = getFortune(date);
  if (cached) {
    return { ok: true, value: cached };
  }

  const basisDate = addDays(date, -1);
  const dayLog = getDayLog(basisDate);
  if (dayLog.updatedAt === 0) {
    return { ok: false, reason: 'NO_BASIS_LOG' };
  }

  const weekStats = getStats(basisDate, 7);
  const yesterdayTotal = dayLog.total;
  const dailyAvg = weekStats.dailyAvg;

  const { score } = computeScore({ yesterdayTotal, dailyAvg, date });
  const group = resolveDominantGroup(dayLog);
  const typeId = resolveTypeId(group, score);
  const band = scoreBandOf(score);
  const copy = COPY_TABLE[typeId][band];

  const prev6Stats = getStats(addDays(basisDate, -1), 6);
  const alerts = detectAlerts({
    byCategory: weekStats.byCategory,
    total: weekStats.total,
    loggedDays: weekStats.loggedDays,
    yesterdayTotal,
    prev6DailyAvg: prev6Stats.dailyAvg,
  });

  const record: FortuneRecord = {
    date,
    basisDate,
    score,
    typeId,
    headline: copy.headline,
    advice: copy.advice,
    savingTip: copy.savingTip,
    luckyCategory: resolveLuckyCategory(dayLog),
    cautionCategory: resolveCautionCategory(dayLog),
    estimatedSaving: computeEstimatedSaving({ dayLog, yesterdayTotal, dailyAvg }),
    alerts,
    yesterdayTotal,
    unlocked: false,
    createdAt: Date.now(),
  };

  const saveResult = saveFortune(record);
  if (!saveResult.ok) {
    return saveResult;
  }

  return { ok: true, value: saveResult.value };
}

/** 리워드 광고 시청 완료 후 unlocked=true로 갱신. 다른 필드는 그대로 보존한다 */
export function unlockFortune(date: string): Result<FortuneRecord> {
  const existing = getFortune(date);
  if (!existing) {
    return { ok: false, reason: 'NOT_FOUND' };
  }
  if (existing.unlocked) {
    return { ok: true, value: existing };
  }
  return saveFortune({ ...existing, unlocked: true });
}
