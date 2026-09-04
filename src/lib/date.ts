const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function toKSTParts(epochMs: number): { y: number; m: number; d: number } {
  const kstMs = epochMs + KST_OFFSET_MS;
  const kstDate = new Date(kstMs);
  return {
    y: kstDate.getUTCFullYear(),
    m: kstDate.getUTCMonth() + 1,
    d: kstDate.getUTCDate(),
  };
}

/** Asia/Seoul 기준 오늘 날짜 (YYYY-MM-DD) */
export function todayKST(now?: Date): string {
  const epochMs = (now ?? new Date()).getTime();
  const { y, m, d } = toKSTParts(epochMs);
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

/** date(YYYY-MM-DD) + delta일 → YYYY-MM-DD (KST 하루 경계 기준) */
export function addDays(date: string, delta: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const baseUtcMs = Date.UTC(y, m - 1, d);
  const shiftedMs = baseUtcMs + delta * MS_PER_DAY;
  const shifted = new Date(shiftedMs);
  return `${shifted.getUTCFullYear()}-${pad2(shifted.getUTCMonth() + 1)}-${pad2(shifted.getUTCDate())}`;
}

/** YYYY-MM-DD → '9월 4일' */
export function formatDate(date: string): string {
  const [, m, d] = date.split('-').map(Number);
  return `${m}월 ${d}일`;
}

/** date가 오늘(KST) 기준 days일 이내(과거 포함, 미래 제외)인지 검사 */
export function isWithinDays(date: string, days: number): boolean {
  const [y, m, d] = date.split('-').map(Number);
  const targetUtcMs = Date.UTC(y, m - 1, d);
  const [ty, tm, td] = todayKST().split('-').map(Number);
  const todayUtcMs = Date.UTC(ty, tm - 1, td);
  const diffDays = (todayUtcMs - targetUtcMs) / MS_PER_DAY;
  return diffDays >= 0 && diffDays < days;
}

/** date가 유효한 YYYY-MM-DD 형식/실존 날짜인지 검사 */
export function isValidDateKey(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const [y, m, d] = date.split('-').map(Number);
  if (m < 1 || m > 12) return false;
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  if (d < 1 || d > daysInMonth) return false;
  return true;
}
