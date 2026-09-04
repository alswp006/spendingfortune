🇰🇷 [English](./README.md)

# SpendingFortune

앱인토스 (Vite + React + TDS) 어제 지출을 입력하면 오늘의 소비운세와 절약 조언을 리워드 광고 시청 후 알려주는 매일 콘텐츠 운세 콘텐츠(자몽다)와 가계부 콘텐츠는 각각 검증됐지만 둘을 결합한 시도는 없다. 매일 켜는 습관형 콘텐츠가 필요한데, 순수 가계부는 토스 본체 기능과 겹쳐 서드파티가 밀리기 쉽다.

## 기술 스택

- React 18.0.0
- TypeScript
- Vitest

## 라우트

| 경로 | 설명 |
|------|------|
| `/History` | 히스토리 |
| `/Home` | 홈 |
| `/Input` | 입력 |
| `/Result` | 결과 |
| `/Settings` | 설정 |
| `/Share` | 공유 |

## 시작하기

```bash
pnpm install
pnpm dev
```

## 개발

```bash
pnpm typecheck    # 타입 검사
pnpm test         # 테스트 실행
pnpm build        # 프로덕션 빌드
```

## 설계 문서

`.ai-factory/` 디렉토리에서 전체 설계 결과물을 확인할 수 있습니다:
- `prd.md` — 상품 요구사항 문서
- `spec.md` — 기술 명세서
- `task.md` — Epic/Task 분석

---
[AI Factory](https://github.com/alswp006/ai-factory)로 제작됨 · 마지막 동기화: 2026-09-04
