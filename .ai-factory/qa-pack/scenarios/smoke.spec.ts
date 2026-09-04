import { test, expect } from '@playwright/test';

// nightcrew Sentinel smoke 팩 — Factory 산출(§7.1)
// 핵심 막: 어제 지출 카테고리/금액 간단 입력 (수동, localStorage), 오늘의 소비운세 텍스트+이미지 (매일 갱신, 리워드 광고 후 공개), 지름신 주의보 — 과소비 카테고리 감지 알림, 12유형 소비운세 캐릭터, 결과 공유 카드
// 토스 브릿지 의존 구간(로그인·결제)은 외부 재현 불가 — 화면 도달 확인까지만.
const ROUTES = ["/","/History","/Home","/Input","/Result"];
// WebView 밖 실행에서만 나는 콘솔 에러는 무시(앱인토스 관례 — toss visual-smoke 템플릿 계승)
const IGNORED_CONSOLE = [/SafeAreaInsets/i, /granite/i, /apps-in-toss/i];

for (const route of ROUTES) {
  test(`smoke: ${route} 렌더링과 콘솔 에러 없음`, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !IGNORED_CONSOLE.some((re) => re.test(msg.text()))) errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(String(err)));
    await page.goto(route);
    await expect(page.locator('body')).toBeVisible();
    expect(errors).toEqual([]);
  });
}
