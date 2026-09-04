import type { AlertItem, AppMeta, DayLog, FortuneRecord, SpendingEntry } from '@/lib/types';
import { DEFAULT_META, STORAGE_KEYS } from '@/lib/types';
import type { Result } from '@/lib/types';

const FORTUNE_RETENTION_DAYS = 30;
const DAYLOG_RETENTION_DAYS = 90;

export function getItem<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setItem<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

/**
 * setItem이 실패하면(예: QuotaExceededError) pruneStorage()로 오래된 기록을 정리한 뒤
 * 1회만 재시도한다. 재시도도 실패하면 예외를 던지지 않고 실패 Result를 반환한다.
 */
function trySetWithQuotaRetry<T>(key: string, value: T): Result<undefined> {
  try {
    setItem(key, value);
    return { ok: true, value: undefined };
  } catch {
    pruneStorage();
    try {
      setItem(key, value);
      return { ok: true, value: undefined };
    } catch {
      return { ok: false, reason: 'QUOTA_EXCEEDED' };
    }
  }
}

export function removeItem(key: string): void {
  localStorage.removeItem(key);
}

function emptyDayLog(date: string): DayLog {
  return { date, entries: [], noSpend: false, total: 0, updatedAt: 0 };
}

function isValidEntry(e: unknown): e is SpendingEntry {
  if (!e || typeof e !== 'object') return false;
  const entry = e as Record<string, unknown>;
  return (
    typeof entry.id === 'string' &&
    typeof entry.category === 'string' &&
    typeof entry.amount === 'number' &&
    typeof entry.memo === 'string' &&
    typeof entry.createdAt === 'number'
  );
}

function isValidDayLog(d: unknown): d is DayLog {
  if (!d || typeof d !== 'object') return false;
  const log = d as Record<string, unknown>;
  return (
    typeof log.date === 'string' &&
    Array.isArray(log.entries) &&
    log.entries.every(isValidEntry) &&
    typeof log.noSpend === 'boolean' &&
    typeof log.total === 'number' &&
    typeof log.updatedAt === 'number'
  );
}

function readDayLogsMap(): Record<string, DayLog> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.dayLogs);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      localStorage.setItem(STORAGE_KEYS.dayLogs, '{}');
      return {};
    }
    const result: Record<string, DayLog> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (isValidDayLog(value)) {
        result[key] = value;
      }
    }
    return result;
  } catch {
    try {
      localStorage.setItem(STORAGE_KEYS.dayLogs, '{}');
    } catch {
      // ignore write failure
    }
    return {};
  }
}

function writeDayLogsMap(map: Record<string, DayLog>): Result<undefined> {
  return trySetWithQuotaRetry(STORAGE_KEYS.dayLogs, map);
}

export function getDayLog(date: string): DayLog {
  const map = readDayLogsMap();
  return map[date] ?? emptyDayLog(date);
}

function isValidAmount(amount: unknown): amount is number {
  return (
    typeof amount === 'number' &&
    Number.isInteger(amount) &&
    amount >= 1 &&
    amount <= 10_000_000
  );
}

export function saveDayLog(log: DayLog): Result<DayLog> {
  const entries = log.noSpend ? [] : log.entries ?? [];

  for (const entry of entries) {
    if (!isValidAmount(entry.amount)) {
      // rejected before touching the map — still ensure the key is initialized
      // so a missing store doesn't look different from an empty one
      try {
        if (localStorage.getItem(STORAGE_KEYS.dayLogs) === null) {
          localStorage.setItem(STORAGE_KEYS.dayLogs, '{}');
        }
      } catch {
        // best effort
      }
      return { ok: false, reason: 'INVALID_AMOUNT' };
    }
  }

  const map = readDayLogsMap();
  const total = log.noSpend ? 0 : entries.reduce((sum, e) => sum + e.amount, 0);

  const normalized: DayLog = {
    date: log.date,
    entries,
    noSpend: log.noSpend,
    total,
    updatedAt: log.updatedAt,
  };

  map[log.date] = normalized;

  const dates = Object.keys(map).sort();
  while (dates.length > DAYLOG_RETENTION_DAYS) {
    const oldest = dates.shift();
    if (oldest === undefined) break;
    delete map[oldest];
  }

  const writeResult = writeDayLogsMap(map);
  if (!writeResult.ok) {
    return writeResult;
  }

  return { ok: true, value: normalized };
}

export function listDayLogs(from: string, to: string): DayLog[] {
  const map = readDayLogsMap();
  return Object.values(map)
    .filter((log) => log.date >= from && log.date <= to)
    .sort((a, b) => a.date.localeCompare(b.date));
}

function isValidMeta(m: unknown): m is AppMeta {
  if (!m || typeof m !== 'object') return false;
  const meta = m as Record<string, unknown>;
  return (
    meta.version === 1 &&
    (typeof meta.noticeAckedAt === 'number' || meta.noticeAckedAt === null) &&
    (typeof meta.lastOpenDate === 'string' || meta.lastOpenDate === null) &&
    typeof meta.streakCount === 'number' &&
    (typeof meta.schemaMigratedAt === 'number' || meta.schemaMigratedAt === null)
  );
}

export function getMeta(): AppMeta {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.meta);
    if (!raw) return { ...DEFAULT_META };
    const parsed = JSON.parse(raw);
    if (!isValidMeta(parsed)) {
      localStorage.setItem(STORAGE_KEYS.meta, '{}');
      return { ...DEFAULT_META };
    }
    return parsed;
  } catch {
    try {
      localStorage.setItem(STORAGE_KEYS.meta, '{}');
    } catch {
      // ignore write failure
    }
    return { ...DEFAULT_META };
  }
}

export function patchMeta(patch: Partial<AppMeta>): Result<AppMeta> {
  const current = getMeta();
  const next: AppMeta = { ...current, ...patch, version: 1 };
  localStorage.setItem(STORAGE_KEYS.meta, JSON.stringify(next));
  return { ok: true, value: next };
}

function isValidAlertItem(a: unknown): a is AlertItem {
  if (!a || typeof a !== 'object') return false;
  const item = a as Record<string, unknown>;
  return (
    typeof item.rule === 'string' &&
    typeof item.level === 'string' &&
    (typeof item.category === 'string' || item.category === null) &&
    typeof item.message === 'string' &&
    typeof item.ratio === 'number'
  );
}

function isValidFortuneRecord(f: unknown): f is FortuneRecord {
  if (!f || typeof f !== 'object') return false;
  const record = f as Record<string, unknown>;
  return (
    typeof record.date === 'string' &&
    typeof record.basisDate === 'string' &&
    typeof record.score === 'number' &&
    typeof record.typeId === 'string' &&
    typeof record.headline === 'string' &&
    typeof record.advice === 'string' &&
    typeof record.savingTip === 'string' &&
    typeof record.luckyCategory === 'string' &&
    (typeof record.cautionCategory === 'string' || record.cautionCategory === null) &&
    typeof record.estimatedSaving === 'number' &&
    Array.isArray(record.alerts) &&
    record.alerts.every(isValidAlertItem) &&
    typeof record.yesterdayTotal === 'number' &&
    typeof record.unlocked === 'boolean' &&
    typeof record.createdAt === 'number'
  );
}

function readFortunesMap(): Record<string, FortuneRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.fortunes);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      localStorage.setItem(STORAGE_KEYS.fortunes, '{}');
      return {};
    }
    const result: Record<string, FortuneRecord> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (isValidFortuneRecord(value)) {
        result[key] = value;
      }
    }
    return result;
  } catch {
    try {
      localStorage.setItem(STORAGE_KEYS.fortunes, '{}');
    } catch {
      // ignore write failure
    }
    return {};
  }
}

function writeFortunesMap(map: Record<string, FortuneRecord>): Result<undefined> {
  return trySetWithQuotaRetry(STORAGE_KEYS.fortunes, map);
}

/** 운세 저장 (날짜 키, 최근 30일 초과 시 오래된 날짜부터 삭제) */
export function saveFortune(f: FortuneRecord): Result<FortuneRecord> {
  const map = readFortunesMap();
  map[f.date] = f;

  const dates = Object.keys(map).sort();
  while (dates.length > FORTUNE_RETENTION_DAYS) {
    const oldest = dates.shift();
    if (oldest === undefined) break;
    delete map[oldest];
  }

  const writeResult = writeFortunesMap(map);
  if (!writeResult.ok) {
    return writeResult;
  }

  return { ok: true, value: f };
}

/** 운세 단건 조회 (없거나 손상된 경우 null) */
export function getFortune(date: string): FortuneRecord | null {
  const map = readFortunesMap();
  return map[date] ?? null;
}

/**
 * 보존 정책 정리: DayLog는 90일, Fortune은 30일 초과분을 날짜 오름차순(最古)부터 삭제한다.
 * pruneStorage 자신의 저장은 재시도 대상인 setItem을 거치지 않는다(quota 재시도 루프 안에서
 * 호출되므로 순환 호출을 피하기 위해 localStorage.setItem을 직접 사용).
 */
export function pruneStorage(): { removedDayLogs: number; removedFortunes: number } {
  let removedDayLogs = 0;
  try {
    const dayLogMap = readDayLogsMap();
    const dayLogDates = Object.keys(dayLogMap).sort();
    while (dayLogDates.length - removedDayLogs > DAYLOG_RETENTION_DAYS) {
      const oldest = dayLogDates[removedDayLogs];
      delete dayLogMap[oldest];
      removedDayLogs++;
    }
    if (removedDayLogs > 0) {
      localStorage.setItem(STORAGE_KEYS.dayLogs, JSON.stringify(dayLogMap));
    }
  } catch {
    // best-effort prune — never throw
  }

  let removedFortunes = 0;
  try {
    const fortuneMap = readFortunesMap();
    const fortuneDates = Object.keys(fortuneMap).sort();
    while (fortuneDates.length - removedFortunes > FORTUNE_RETENTION_DAYS) {
      const oldest = fortuneDates[removedFortunes];
      delete fortuneMap[oldest];
      removedFortunes++;
    }
    if (removedFortunes > 0) {
      localStorage.setItem(STORAGE_KEYS.fortunes, JSON.stringify(fortuneMap));
    }
  } catch {
    // best-effort prune — never throw
  }

  return { removedDayLogs, removedFortunes };
}

/**
 * 계약(src/lib/contract.ts) 준수용 진입점 — pruneStorage()를 실행하고 fortune 삭제
 * 건수만 { removedCount }로 반환한다 (다른 패킷은 이 이름·시그니처를 그대로 가정한다).
 */
export async function pruneFortunes(): Promise<{ removedCount: number }> {
  const { removedFortunes } = pruneStorage();
  return { removedCount: removedFortunes };
}
