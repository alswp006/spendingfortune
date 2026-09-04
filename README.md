🇺🇸 [한국어](./README.ko.md)

# SpendingFortune

앱인토스 (Vite + React + TDS) 어제 지출을 입력하면 오늘의 소비운세와 절약 조언을 리워드 광고 시청 후 알려주는 매일 콘텐츠 운세 콘텐츠(자몽다)와 가계부 콘텐츠는 각각 검증됐지만 둘을 결합한 시도는 없다. 매일 켜는 습관형 콘텐츠가 필요한데, 순수 가계부는 토스 본체 기능과 겹쳐 서드파티가 밀리기 쉽다.

## Tech Stack

- React 18.0.0
- TypeScript
- Vitest

## Routes

| Path | Description |
|------|-------------|
| `/History` | History |
| `/Home` | Home |
| `/Input` | Input |
| `/Result` | Result |
| `/Settings` | Settings |
| `/Share` | Share |

## Getting Started

```bash
pnpm install
pnpm dev
```

## Development

```bash
pnpm typecheck    # Type checking
pnpm test         # Run tests
pnpm build        # Production build
```

## Design Documents

See `.ai-factory/` directory for full design artifacts:
- `prd.md` — Product Requirements Document
- `spec.md` — Technical Specification
- `task.md` — Epic/Task Breakdown

---
Built with [AI Factory](https://github.com/alswp006/ai-factory) · Last synced: 2026-09-04
