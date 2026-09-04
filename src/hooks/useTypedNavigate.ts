import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { RouteState } from '@/lib/types';

/** 앱이 정의한 6개 경로만 허용 — 오타·미등록 경로는 컴파일 시점에 막힌다. */
export type AppPath = keyof RouteState;

/**
 * RouteState 계약을 강제하는 navigate 래퍼.
 *
 * state가 필요 없는 경로는 인자 1개, 필요한 경로는 인자 2개를 강제한다.
 *   nav('/input');                      // OK
 *   nav('/result', { date: '2026-09-05' }); // OK
 *   nav('/result');                     // 컴파일 에러 (state 누락)
 *   nav('/result', { day: '...' });     // 컴파일 에러 (모양 불일치)
 */
export function useTypedNavigate() {
  const navigate = useNavigate();

  return useCallback(
    <P extends AppPath>(
      path: P,
      ...rest: RouteState[P] extends undefined ? [] : [state: RouteState[P]]
    ) => {
      const state = rest[0];
      navigate(path, state === undefined ? undefined : { state });
    },
    [navigate],
  );
}
