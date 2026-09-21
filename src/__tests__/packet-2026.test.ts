/**
 * [개선] 갈 수 없는 화면 1개에 진입점 만들기 — /share 진입점 검증
 *
 * 정적 스캔으로 /share 로 가는 navigate/nav/Link 가 다른 화면에 존재하는지 확인한다.
 * (navigate 는 useTypedNavigate 별칭 nav 로도 불리므로 식별자를 가리지 않는다.)
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const PAGES_DIR = join(process.cwd(), "src", "pages");
const read = (p: string) => readFileSync(p, "utf8");

const pageFiles = readdirSync(PAGES_DIR)
  .filter((f) => f.endsWith(".tsx") && !f.startsWith("__"))
  .map((f) => ({ name: f, src: read(join(PAGES_DIR, f)) }));

const CALL = /\b\w*[nN]av\w*\(\s*['"`]\/share['"`]/;
const LINK = /<Link[^>]*\bto=\{?\s*['"`]\/share['"`]/;
const entryPages = pageFiles.filter(
  (f) => f.name !== "Share.tsx" && (CALL.test(f.src) || LINK.test(f.src)),
);

describe("[개선] 갈 수 없는 화면 1개에 진입점 만들기", () => {
  it("AC-1: Share 외 화면에 /share 로 가는 navigate() 또는 <Link>가 하나 이상 있다", () => {
    expect(entryPages.length).toBeGreaterThanOrEqual(1);
    expect(entryPages.every((f) => f.name !== "Share.tsx")).toBe(true);
  });

  it("AC-1: /share 진입은 Share 가 요구하는 { date } state 를 함께 넘긴다", () => {
    const withState = entryPages.filter((f) =>
      /\b\w*[nN]av\w*\(\s*['"`]\/share['"`]\s*,\s*\{\s*date\b/.test(f.src),
    );
    expect(withState.length).toBeGreaterThanOrEqual(1);
    expect(withState[0].src).toMatch(/\/share/);
  });

  it("AC-2: 진입점은 결과·목록·입력 등 흐름상의 화면(Result/History/Home/Input)에 있다", () => {
    const names = entryPages.map((f) => f.name);
    const flow = ["Result.tsx", "History.tsx", "Home.tsx", "Input.tsx"];
    expect(names.some((n) => flow.includes(n))).toBe(true);
    expect(names).not.toContain("Settings.tsx");
  });

  it("AC-2: 진입점은 클릭 핸들러(onClick)에 연결돼 있다", () => {
    const linked = entryPages.some((f) => {
      const handler = f.src.match(/const (\w+)\s*=\s*\(\)\s*=>\s*\{[^}]*\/share/s)?.[1];
      return handler
        ? new RegExp(`onClick=\\{${handler}\\}`).test(f.src)
        : /onClick=\{\(\)\s*=>\s*\w*[nN]av\w*\(\s*['"`]\/share/.test(f.src) || LINK.test(f.src);
    });
    expect(linked).toBe(true);
    expect(entryPages.length).toBeGreaterThan(0);
  });

  it("AC-3: App.tsx 에 /share Route 가 그대로 남아 있고 Share 페이지를 렌더한다", () => {
    const app = read(join(process.cwd(), "src", "App.tsx"));
    expect(app).toMatch(/<Route\s+path="\/share"\s+element=\{<Share\s*\/>\}/);
    expect(app).toMatch(/import Share from '\.\/pages\/Share'/);
  });

  it("AC-3: 기존 라우트 경로가 모두 유지된다", () => {
    const app = read(join(process.cwd(), "src", "App.tsx"));
    for (const p of ["/", "/history", "/settings", "/input", "/result", "/share"]) {
      expect(app).toContain(`path="${p}"`);
    }
  });
});
