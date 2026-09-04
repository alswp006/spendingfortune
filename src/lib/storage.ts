import type { AlertItem, AppMeta, DayLog, FortuneRecord, SpendingEntry } from '@/lib/types';
import { DEFAULT_META, STORAGE_KEYS } from '@/lib/types';
import type { Result } from '@/lib/types';

const FORTUNE_RETENTION_DAYS = 30;

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
      localStorage.setItem(STORAGE_KEYS.dayLogs, '{}');
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

function writeDayLogsMap(map: Record<string, DayLog>): void {
  localStorage.setItem(STORAGE_KEYS.dayLogs, JSON.stringify(map));
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
  const map = readDayLogsMap();
  const entries = log.noSpend ? [] : log.entries ?? [];

  for (const entry of entries) {
    if (!isValidAmount(entry.amount)) {
      return { ok: false, reason: 'INVALID_AMOUNT' };
    }
  }

  const total = log.noSpend ? 0 : entries.reduce((sum, e) => sum + e.amount, 0);

  const normalized: DayLog = {
    date: log.date,
    entries,
    noSpend: log.noSpend,
    total,
    updatedAt: log.updatedAt,
  };

  map[log.date] = normalized;
  writeDayLogsMap(map);

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
      localStorage.setItem(STORAGE_KEYS.fortunes, '{}');
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

function writeFortunesMap(map: Record<string, FortuneRecord>): void {
  localStorage.setItem(STORAGE_KEYS.fortunes, JSON.stringify(map));
}

/** 운세 저장 (날짜 키, 최근 30일 초과 시 오래된 날짜부터 삭제) */
export function saveFortune(f: FortuneRecord): void {
  const map = readFortunesMap();
  map[f.date] = f;

  const dates = Object.keys(map).sort();
  while (dates.length > FORTUNE_RETENTION_DAYS) {
    const oldest = dates.shift();
    if (oldest === undefined) break;
    delete map[oldest];
  }

  writeFortunesMap(map);
}

/** 운세 단건 조회 (없거나 손상된 경우 null) */
export function getFortune(date: string): FortuneRecord | null {
  const map = readFortunesMap();
  return map[date] ?? null;
}
