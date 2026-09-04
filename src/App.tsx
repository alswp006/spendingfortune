import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Home from './pages/Home';
import Input from './pages/Input';
import Result from './pages/Result';
import History from './pages/History';
import Share from './pages/Share';
import Settings from './pages/Settings';
import { FloatingTabBar, type TabItem } from './components/FloatingTabBar';

// Dev-only TDS Gallery route — `import.meta.env.DEV` is statically replaced
// (true in dev, false in prod) so the entire import + Route is tree-shaken
// from production builds. Verify with: `grep -r "TdsGallery" dist/` → empty.
const DevTdsGallery = import.meta.env.DEV
  ? lazy(() => import('./pages/__TdsGallery'))
  : null;

/** 하단 탭 3개 — 탭이 이동시키는 경로는 모두 아래 Route에 등록돼 있어야 한다. */
const TABS: TabItem[] = [
  { label: '오늘', path: '/' },
  { label: '히스토리', path: '/history' },
  { label: '설정', path: '/settings' },
];

/**
 * 탭 루트 레이아웃 — /, /history, /settings 에서만 FloatingTabBar를 렌더한다.
 * (/input·/result·/share는 흐름 화면이라 탭바 없이 하단 CTA가 자리를 쓴다.)
 * 탭바는 position:fixed라 본문 마지막이 가리지 않도록 같은 높이의 스페이서를 둔다.
 */
function TabLayout() {
  return (
    <>
      <Outlet />
      <div style={{ height: 'calc(56px + env(safe-area-inset-bottom))' }} aria-hidden="true" />
      <FloatingTabBar items={TABS} />
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<TabLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/history" element={<History />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      <Route path="/input" element={<Input />} />
      <Route path="/result" element={<Result />} />
      <Route path="/share" element={<Share />} />

      {DevTdsGallery && (
        <Route
          path="/__tds-gallery"
          element={
            <Suspense fallback={null}>
              <DevTdsGallery />
            </Suspense>
          }
        />
      )}

      {/* 미정의 경로는 홈으로 — 뒤로가기 스택을 더럽히지 않도록 replace */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
