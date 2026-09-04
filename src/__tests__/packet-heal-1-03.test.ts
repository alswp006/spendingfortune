/**
 * packet-heal-1-03: 전체 라우트 스모크 — 배선 무결성 최종 검증
 *
 * 두 결손 패킷(heal-1-01, heal-1-02) 병합 후 앱 전체가 실제로 조립되는지 정적으로 확인한다.
 * dev 서버는 쓰지 않는다 — 검증은 tsc·build·test 세 명령 + 소스 트리 정적 스캔으로만 한다.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { execSync } from "node:child_process";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { render, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockAll } from "@/__tests__/__helpers__/mocks";

mockAll();

const ROOT = process.cwd();

// ── 소스 트리 워커 ──
function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "dist" || name.startsWith(".")) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if ([".ts", ".tsx", ".js", ".jsx"].includes(extname(name))) out.push(full);
  }
  return out;
}

const SRC_FILES = walk(join(ROOT, "src"));

describe("전체 라우트 스모크 — 배선 무결성 최종 검증", () => {
  // AC-1[P0]: npx tsc --noEmit이 0 에러, npm run build가 exit code 0
  it(
    "AC-1[P0]: tsc --noEmit과 vite build가 에러 없이 통과한다",
    () => {
      expect(() =>
        execSync("npx tsc --noEmit", { cwd: ROOT, stdio: "pipe" }),
      ).not.toThrow();
      expect(() =>
        execSync("npx vite build", { cwd: ROOT, stdio: "pipe" }),
      ).not.toThrow();
    },
    60_000,
  );

  // AC-2[P0]: 6개 라우트 각각 크래시 없이 마운트되고, 탭-루트 라우트에서만
  // FloatingTabBar(role=tablist)가 렌더된다 (흐름 화면은 하단 CTA가 그 자리를 쓴다 — App.tsx TabLayout 설계).
  it("AC-2[P0]: 6개 라우트가 모두 throw 없이 렌더되고 FloatingTabBar가 탭-루트에서 렌더된다", async () => {
    const { default: App } = await import("@/App");

    const TAB_ROOT_ROUTES = ["/", "/history", "/settings"];
    const FLOW_ROUTES = ["/input", "/result", "/share"];

    for (const path of TAB_ROOT_ROUTES) {
      expect(() =>
        render(
          React.createElement(
            MemoryRouter,
            { initialEntries: [path] },
            React.createElement(App),
          ),
        ),
      ).not.toThrow();
      expect(document.querySelectorAll('[role="tablist"]').length).toBe(1);
      cleanup();
    }

    for (const path of FLOW_ROUTES) {
      expect(() =>
        render(
          React.createElement(
            MemoryRouter,
            { initialEntries: [path] },
            React.createElement(App),
          ),
        ),
      ).not.toThrow();
      expect(document.querySelectorAll('[role="tablist"]').length).toBe(0);
      cleanup();
    }
  });

  // AC-2b: navigate()가 참조하는 모든 정적 경로에 대응 Route가 App.tsx에 존재한다
  it("AC-2b: navigate() 대상 경로는 모두 App.tsx의 Route로 정의돼 있다", () => {
    const appSource = readFileSync(join(ROOT, "src/App.tsx"), "utf-8");
    const routePaths = [...appSource.matchAll(/<Route\s+path=["']([^"']+)["']/g)].map((m) => m[1]);

    const navigateTargets = new Set<string>();
    for (const file of SRC_FILES) {
      if (file.endsWith("App.tsx")) continue;
      const content = readFileSync(file, "utf-8");
      for (const m of content.matchAll(/navigate\(\s*['"]([^'"]+)['"]/g)) {
        navigateTargets.add(m[1]);
      }
    }

    expect(routePaths).toEqual(
      expect.arrayContaining(["/", "/input", "/result", "/history", "/share", "/settings"]),
    );
    for (const target of navigateTargets) {
      expect(routePaths).toContain(target);
    }
  });

  // AC-3[P0]: npm test(vitest run) 전체가 통과하고 실패 스위트 0건
  it(
    "AC-3[P0]: 이 파일을 제외한 전체 테스트 스위트가 실패 없이 통과한다",
    () => {
      expect(() =>
        execSync(
          'npx vitest run --exclude "src/__tests__/packet-heal-1-03.test.ts"',
          { cwd: ROOT, stdio: "pipe" },
        ),
      ).not.toThrow();
    },
    60_000,
  );

  // AC-4a[P0]: 소스 트리의 상대/별칭(import) 경로가 전부 실제 파일로 해석된다
  it("AC-4a[P0]: 소스 트리에 미해결 import 경로가 없다", () => {
    const unresolved: string[] = [];
    const CANDIDATE_EXT = ["", ".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.tsx"];

    for (const file of SRC_FILES) {
      const content = readFileSync(file, "utf-8");
      const importSpecifiers = [
        ...content.matchAll(/(?:import|export)[^'"]*from\s+['"](\.[^'"]+|@\/[^'"]+)['"]/g),
      ].map((m) => m[1]);

      for (const spec of importSpecifiers) {
        const base = spec.startsWith("@/")
          ? join(ROOT, "src", spec.slice(2))
          : join(dirname(file), spec);
        const resolved = CANDIDATE_EXT.some((ext) => existsSync(base + ext));
        if (!resolved) unresolved.push(`${file} -> ${spec}`);
      }
    }

    expect(unresolved).toEqual([]);
  });

  // AC-4b[P0]: HEX 색상 하드코딩(6/3자리) 0건 — TDS 토큰/CSS 변수만 허용
  it("AC-4b[P0]: 소스 트리에 하드코딩된 HEX 색상이 없다", () => {
    const offenders: string[] = [];
    const HEX_RE = /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g;

    for (const file of SRC_FILES) {
      if (file.endsWith(".test.ts") || file.endsWith(".test.tsx")) continue;
      const lines = readFileSync(file, "utf-8").split("\n");
      lines.forEach((line, i) => {
        const trimmed = line.trim();
        if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) return;
        if (/gate-allow:/.test(line)) return;
        const matches = line.match(HEX_RE);
        if (matches) offenders.push(`${file}:${i + 1} -> ${matches.join(", ")}`);
      });
    }

    expect(offenders).toEqual([]);
  });

  // AC-4c[P0]: 외부 이탈(신규 탭/동일 탭 하드 네비게이션) 0건 (토스 검수 — Outlink 금지, openURL SDK 사용)
  it("AC-4c[P0]: 외부 이탈 호출이 소스 트리에 없다", () => {
    const offenders: string[] = [];
    const OPEN_CALL_RE = new RegExp(["window", "\\.", "open", "\\s*\\("].join(""));
    const HREF_ASSIGN_RE = new RegExp(["window", "\\.", "location", "\\.", "href", "\\s*="].join(""));

    for (const file of SRC_FILES) {
      if (file.endsWith(".test.ts") || file.endsWith(".test.tsx")) continue;
      const content = readFileSync(file, "utf-8");
      if (OPEN_CALL_RE.test(content)) offenders.push(`${file}: forbidden external-open call`);
      if (HREF_ASSIGN_RE.test(content)) offenders.push(`${file}: forbidden external-href assign`);
    }

    expect(offenders).toEqual([]);
  });
});
