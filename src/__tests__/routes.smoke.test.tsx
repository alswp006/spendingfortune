/**
 * 전체 라우트 스모크 — 배선 무결성.
 *
 * packet-heal-1-03.test.ts는 tsc/build/vitest를 execSync로 다시 돌리는 무거운 게이트다.
 * 이 파일은 그 중 "라우트가 실제로 마운트되는가"만 떼어낸 빠른 상시 스모크로,
 * 새 화면을 붙일 때마다 ROUTES에 한 줄 추가해 회귀를 잡는다.
 *
 * 검증 대상은 배선뿐이다 — 각 화면의 세부 동작은 pages/__tests__/*가 맡는다.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockAll, mockLocation } from "@/__tests__/__helpers__/mocks";
import App from "@/App";

mockAll();

/** App.tsx의 라우트 테이블과 1:1. tabBar=탭 루트(하단 탭 노출), false=흐름 화면. */
const ROUTES: Array<{ path: string; tabBar: boolean }> = [
  { path: "/", tabBar: true },
  { path: "/history", tabBar: true },
  { path: "/settings", tabBar: true },
  { path: "/input", tabBar: false },
  { path: "/result", tabBar: false },
  { path: "/share", tabBar: false },
];

function renderRoute(path: string) {
  // FloatingTabBar의 활성 탭 판정은 useLocation을 읽는다 — 전역 목이 useLocation을
  // 가로채므로(mocks.ts) MemoryRouter 경로와 같은 값을 손으로 맞춰준다.
  mockLocation.pathname = path;
  mockLocation.state = null;
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe("전체 라우트 스모크", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    errorSpy.mockRestore();
  });

  it.each(ROUTES)("$path 가 크래시 없이 마운트되고 내용을 그린다", ({ path }) => {
    expect(() => renderRoute(path)).not.toThrow();

    // 흰 화면 방지 — 마운트만 되고 아무것도 안 그리는 경우를 잡는다.
    const root = document.body.firstElementChild;
    expect(root).not.toBeNull();
    expect((root?.textContent ?? "").trim().length).toBeGreaterThan(0);
  });

  it.each(ROUTES)("$path 의 하단 탭 노출이 App.tsx 설계와 일치한다", ({ path, tabBar }) => {
    renderRoute(path);
    // 탭 루트에서만 1회. 흐름 화면(/input·/result·/share)은 하단 CTA가 그 자리를 쓴다.
    expect(document.querySelectorAll('[role="tablist"]').length).toBe(tabBar ? 1 : 0);
  });

  it("미정의 경로는 홈으로 대체되며 탭바가 한 번만 붙는다", () => {
    mockLocation.pathname = "/";
    mockLocation.state = null;
    expect(() =>
      render(
        <MemoryRouter initialEntries={["/nope-not-a-route"]}>
          <App />
        </MemoryRouter>,
      ),
    ).not.toThrow();
    expect(document.querySelectorAll('[role="tablist"]').length).toBe(1);
  });

  it("6개 라우트 마운트 중 console.error가 발생하지 않는다", () => {
    // 토스 검수 기준: 프로덕션 콘솔 에러 0건. DOM 중첩 경고·미처리 거부를 여기서 잡는다.
    for (const { path } of ROUTES) {
      renderRoute(path);
      cleanup();
    }
    expect(errorSpy.mock.calls.map((c) => String(c[0]))).toEqual([]);
  });
});
