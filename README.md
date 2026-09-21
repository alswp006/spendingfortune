# SpendingFortune — Personalized Spending Fortune Teller

A mini-app that reveals your daily spending fortune. Record your daily expenses by category, and the app generates a personalized fortune type with tailored advice and spending insights based on your habits. Built for the Toss financial platform as an App-in-Toss mini-app.

## Features

- 💰 **Daily Spending Entry** — Record expenses by 8 categories (food, cafe, shopping, transport, culture, health, living, etc.)
- 🔮 **Personalized Fortune** — Generate daily fortune based on yesterday's spending patterns (12 unique fortune types)
- 📊 **Spending History** — Track and view past spending logs
- 🎴 **Shareable Cards** — Create and share fortune result cards with friends
- 🔔 **Smart Alerts** — Category concentration warnings and spending spike notifications
- 🎬 **Reward Ads** — Unlock fortune results via watched video ads
- ⚙️ **Settings** — Preferences, data reset, and app management
- 🎨 **Dark Mode** — Native dark mode support
- 📱 **Mobile Native Feel** — iOS 16+, Android 7+ compatible with haptic feedback

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Routing**: React Router 7
- **Design System**: TDS Mobile (@toss/tds-mobile)
- **SDK**: @apps-in-toss/web-framework
- **Styling**: Emotion, CSS custom properties
- **Testing**: Vitest (unit tests), Playwright (visual regression)
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+
- npm (not pnpm)

### Installation

```bash
npm install
```

### Development & Testing

Type checking:
```bash
npx tsc --noEmit
```

Run unit tests:
```bash
npx vitest run
```

Run visual regression tests:
```bash
npm run test:visual
```

Update visual test snapshots:
```bash
npm run test:visual:update
```

### Production Build

```bash
npx vite build
```

Outputs optimized production bundle to `dist/`. No development server is documented — use the test suite for verification.

### Deployment to Toss

Build for Apps-in-Toss platform:
```bash
npx ait build
```

Then submit through the Toss developer console for review. The app is hosted on Toss CDN (static rendering only).

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `VITE_TOSS_AD_SLOT_ID` | Reward ad slot ID for result unlock (from Toss console) | Optional | `'result-unlock'` |
| `VITE_TOSS_AD_GROUP_ID` | Banner ad group ID (from Toss console) | Optional | — |
| `VITE_TOSS_IAP_SKU` | In-app purchase product SKU (from Toss console) | Optional | — |

Create `.env.local` for local overrides:
```
VITE_TOSS_AD_SLOT_ID=your-custom-slot-id
VITE_TOSS_AD_GROUP_ID=your-group-id
```

## Project Structure

```
src/
├── pages/                # Page components
│   ├── Home.tsx         # Main home, streak display, yesterday's summary
│   ├── Input.tsx        # Daily expense entry by category
│   ├── Result.tsx       # Fortune result, advice, alerts
│   ├── History.tsx      # Past spending logs
│   ├── Share.tsx        # Shareable fortune card
│   ├── Settings.tsx     # Preferences, data management
│   └── __TdsGallery.tsx # Dev-only TDS component preview
├── components/          # Reusable TDS-based components
│   ├── Card.tsx
│   ├── ScreenScaffold.tsx
│   ├── SummaryHero.tsx
│   ├── Amount.tsx
│   ├── BottomCTA.tsx
│   ├── StateView.tsx (EmptyState, LoadingState)
│   ├── FloatingTabBar.tsx
│   ├── TossRewardAd.tsx
│   └── AdSection.tsx
├── hooks/               # Custom React hooks
│   ├── useAppData.ts    # Load/sync app state
│   ├── useTypedNavigate.ts  # Type-safe navigation
│   └── useContentNotice.ts
├── lib/                 # Utilities & business logic
│   ├── types.ts         # Domain types (FortuneType, DayLog, etc.)
│   ├── storage.ts       # localStorage helpers
│   ├── computeFortune.ts  # Fortune engine (scoring, typing)
│   ├── fortuneTable.ts  # 12 fortune types & metadata
│   ├── date.ts          # Date utilities (KST)
│   ├── utils.ts         # Formatting helpers
│   └── analytics.ts     # Toss SDK analytics wrapper
├── __tests__/           # Vitest unit tests
│   ├── packet-*.test.ts # Feature-level tests
│   └── __helpers__/     # Shared test utilities
└── main.tsx             # React entrypoint

e2e/
├── visual-smoke.spec.ts  # Playwright visual regression tests
└── __shots__/           # Captured visual test screenshots

apps-in-toss.config.ts  # SDK & deployment configuration
vite.config.ts          # Vite build settings
```

## Key Business Logic

### Fortune Engine (`src/lib/computeFortune.ts`)

Deterministic algorithm that maps yesterday's spending to one of 12 fortune types based on:
- Total spending amount
- Category distribution (concentration score)
- Spending pattern (spikes, consistency)
- Cumulative metadata

Each type has personalized:
- Lucky category (good to spend in)
- Caution category (risky)
- Saving tip & estimated savings
- Character image & tagline

### Storage Schema

**Day Logs** — localStorage key `sf.daylogs.v1`:
```json
{
  "YYYY-MM-DD": {
    "date": "YYYY-MM-DD",
    "entries": [
      { "id": "uuid", "category": "food", "amount": 12000, "memo": "...", "createdAt": 1234567890 }
    ],
    "noSpend": false,
    "total": 12000,
    "updatedAt": 1234567890
  }
}
```

**Fortune Unlocks** — localStorage key `sf.fortune_unlocks.v1`: set of dates (ISO 8601).

## Testing

- **Unit Tests** — Vitest with jsdom, `@testing-library/react`, shared test helpers
- **Visual Regression** — Playwright captures responsive screenshots (e2e/__shots__)
- **Layout Validation** — Tests verify Card counts, CTA widths, scaffold structure
- **Mock Strategy** — Pre-built helpers mock TDS, SDK, react-router, AppState

See `.claude/rules/testing.md` for full testing patterns.

## Deployment Checklist

Before finishing:
1. ✅ `npx tsc --noEmit` — TypeScript clean
2. ✅ `npx vitest run` — All tests pass
3. ✅ `npm run test:visual` — Visual regression clean
4. ✅ `npx vite build` — Production build succeeds
5. ✅ No console errors in production
6. ✅ No outlinks to external domains
7. ✅ All routes in App.tsx wired (no dangling imports)
8. ✅ Copy has no AI patterns ("멋진", "~해 보세요!", etc.)
9. ✅ Dark mode text readable
10. ✅ Safe area insets applied to fixed bottom elements

## Notes

- **app-in-toss.config.ts** — App name is locked (mismatch with console causes 4031 deploy error)
- **TDS Only** — No custom CSS for components; use TDS Spacing, Colors, Typography
- **No pnpm** — Use npm only (project constraints)
- **SDK Guardrails** — All SDK calls wrapped in try/catch (throws outside WebView)
- **No external analytics** — Toss `Analytics` SDK only
- **No dynamic SSR** — Static CSR build only

## License

MIT
