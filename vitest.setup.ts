/**
 * Vitest setup — runs before each test file.
 *
 * Handles:
 *  - localStorage isolation between tests (prevents cross-test pollution)
 *  - requestAnimationFrame shim for jsdom (needed for animate/countup utilities)
 *  - sessionStorage isolation
 *  - console.error filtering (React Router warnings etc.)
 */

import { beforeEach, afterEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
// ── 전역 모듈 목 (TDS · 앱인토스 SDK · 리워드 광고 래퍼) ──
// setup 파일은 테스트 파일의 import보다 먼저 실행되므로, 여기서 등록해야 테스트 파일이
// 직접 import한 심볼(예: generateHapticFeedback)도 목을 잡는다. 헬퍼(mockTds() 등) 안에서
// 등록하면 등록이 import 뒤로 밀려 실물/목 두 인스턴스가 공존한다 —
// 그 상태에서는 spy 단언이 실패하고 Router 컨텍스트가 갈라진다(자세한 설명은 mocks.ts).
(globalThis as Record<string, unknown>).__TOSS_GLOBAL_MOCKS__ = true;
// 팩토리는 동적 import로 가져온다 — vi.mock은 파일 최상단으로 호이스팅되므로 상단 import
// 바인딩을 직접 참조하면 초기화 전 접근(ReferenceError)이 된다.
const helpers = () => import("./src/__tests__/__helpers__/mocks");
vi.mock("@toss/tds-mobile", async () => (await helpers()).tdsFactory());
vi.mock("@apps-in-toss/web-framework", async () => (await helpers()).appsInTossFactory());
vi.mock("@/components/TossRewardAd", async () => (await helpers()).tossRewardAdFactory());
vi.mock("react-router-dom", async () => (await helpers()).routerFactory());

// ── localStorage / sessionStorage isolation ──
// jsdom's storage persists between tests by default. Clear it to prevent pollution.
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

// ── requestAnimationFrame shim for jsdom ──
// jsdom does NOT implement rAF natively, so animate/countup code hangs forever.
// Shim that immediately invokes callback with a monotonic timestamp.
if (typeof globalThis.requestAnimationFrame !== "function") {
  let now = 0;
  globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
    now += 16;
    return setTimeout(() => cb(now), 0) as unknown as number;
  }) as typeof globalThis.requestAnimationFrame;
  globalThis.cancelAnimationFrame = ((id: number) => clearTimeout(id)) as typeof globalThis.cancelAnimationFrame;
}

// ── afterEach reset ──
afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers(); // in case a test used fake timers
});
