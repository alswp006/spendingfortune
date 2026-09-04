# Packet 0005: TDD Tests Summary

## Red Phase Status ✅
All tests written. Running `npx vitest run src/__tests__/packet-0005.test.ts` shows:
- **11 total tests**
- **2 passing** (AC-2 tests — `saveFortune` 30-day logic already implemented)
- **9 failing** (need implementation)

## Implementation Tasks (for Coder)

### Task 1: Add DayLog 90-day pruning to saveDayLog()
**Location:** `src/lib/storage.ts:saveDayLog()`

Current behavior: saves without pruning  
Expected behavior:
- Keep max 90 DayLog entries
- Remove oldest by date string order when exceeding
- Return `{ ok: true, value: log }` on success

**Failing tests:**
- "AC-1[P0]: saveDayLog prunes DayLog to 90 when exceeding with 91 keys"
- "AC-1[P0]: saveDayLog removes oldest date by date string order"

### Task 2: Add QuotaExceededError handling to saveDayLog()
**Location:** `src/lib/storage.ts:saveDayLog()`

Expected behavior:
- Wrap `writeDayLogsMap()` in try/catch for QuotaExceededError
- On error: call `pruneStorage()` once, then retry `writeDayLogsMap()` exactly once
- If retry also fails: return `{ ok: false, reason: 'QUOTA_EXCEEDED' }`
- Do NOT throw exception or log console.error

**Failing tests:**
- "AC-3[P0]: saveDayLog returns QUOTA_EXCEEDED when setItem fails twice"
- "AC-3[P0]: saveDayLog attempts setItem twice (initial + retry)"
- "AC-3[P0]: saveDayLog does not propagate QuotaExceededError exception"

### Task 3: Implement pruneStorage() function
**Location:** `src/lib/storage.ts` (new export)

**Signature:**
```typescript
export function pruneStorage(): { removedDayLogs: number; removedFortunes: number }
```

**Logic:**
1. Read current DayLog map
2. If length > 90: remove oldest N entries until length = 90, track count
3. Write back to storage
4. Read current Fortune map
5. If length > 30: remove oldest N entries until length = 30, track count
6. Write back to storage
7. Return `{ removedDayLogs, removedFortunes }` (both integers, 0 if no pruning)

**Failing tests:**
- "AC-4[P0]: pruneStorage returns object with integer removed counts"
- "AC-4[P0]: pruneStorage returns 0 counts when no pruning needed"
- "AC-4[P0]: pruneStorage actually removes oldest records from storage"

### Task 4: Add constants (optional refactor)
Consider adding to top of `storage.ts`:
```typescript
const DAYLOG_RETENTION_DAYS = 90;
// FORTUNE_RETENTION_DAYS = 30 already exists
```

## Test File Location
- `src/__tests__/packet-0005.test.ts` — 11 comprehensive tests covering all 4 ACs

## Key Implementation Notes

### Retention limits
- **DayLog:** 90 days (new, needs implementation)
- **Fortune:** 30 days (already implemented in `saveFortune`)

### Pruning strategy
Remove oldest by date string lexical order:
```typescript
const dates = Object.keys(map).sort();  // lexical = YYYY-MM-DD order
while (dates.length > limit) {
  delete map[dates.shift()];  // shift removes first (oldest)
}
```

### Error handling flow for saveDayLog with quota
```
saveDayLog(log)
│
└─ try: writeDayLogsMap(map)
   ├─ success → return { ok: true, value: log }
   └─ DOMException('QuotaExceededError')
      │
      ├─ pruneStorage()  [called once]
      │
      └─ try: writeDayLogsMap(map)  [retry once]
         ├─ success → return { ok: true, value: log }
         └─ DOMException('QuotaExceededError')
            └─ return { ok: false, reason: 'QUOTA_EXCEEDED' }
```

### Test expectations

| AC# | Scenario | Setup | Expected |
|-----|----------|-------|----------|
| 1 | Prune DayLog | 91 entries | Save succeeds, 90 remain, oldest removed |
| 2 | Prune Fortune | 31 entries | Save succeeds, 30 remain, getFortune matches |
| 3 | Quota error | setItem throws 2x | Return error, prune 1x, setItem 2x, no exception |
| 4 | Prune counts | 100 DL + 40 F | Return `{ removedDayLogs: 10, removedFortunes: 10 }` |

## Running Tests

```bash
# Run all packet 0005 tests
npx vitest run src/__tests__/packet-0005.test.ts

# Watch mode (for dev)
npx vitest watch src/__tests__/packet-0005.test.ts
```

## Acceptance Criteria Checklist

- [ ] AC-1: 91 daylogs → prune to 90, oldest removed
- [ ] AC-2: 31 fortunes → keep at 30, getFortune returns exact match
- [ ] AC-3: QuotaExceededError → prune once, retry once, return error
- [ ] AC-4: pruneStorage() returns `{ removedDayLogs, removedFortunes }` as integers

After implementation, all 11 tests should pass ✅
