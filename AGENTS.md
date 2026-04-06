# AGENTS.md - Stock Analyzer

> Table of contents for AI agents. Follow links for deep documentation.

## Project
- **Stack**: Vue 3.5 + TypeScript 5.9 + Vite 7.3 + Pinia 3.0 + ECharts 6.0
- **Domain**: Stock valuation tool for HK stocks and A-shares
- **Data Sources**: East Money API (financial data), open.er-api.com (exchange rates)

## Quick Start
```bash
npm run dev          # Dev server (port 5173)
npm run build        # Build with type checking
npm run test         # Run Vitest tests
npm run test:e2e     # Run Playwright E2E tests
npm run lint         # Run ESLint
npm run lint:fix     # Auto-fix ESLint issues
```

## Code Conventions
- **Files**: kebab-case (`stock-card.vue`, `eastmoney.ts`)
- **Components**: PascalCase (`StockCard.vue`)
- **Types**: PascalCase (`StockData`, `ApiStockInfo`)
- **Functions**: camelCase (`calculateNetCash`)
- **Import Order**: External → `@/` absolute → Relative
- **API**: Composition API with `<script setup lang="ts">`
- **Currency**: All values in 亿元 (hundred million yuan), HKD base

## Architecture
- [Domain Map & Dependency Directions](docs/ARCHITECTURE.md)
- [Data Flow & API Contracts](docs/design-docs/)

## Frontend
- [Vue Conventions & Patterns](docs/FRONTEND.md)

## References
- [Vue + Pinia](docs/references/vue-pinia-reference.md)
- [Vite + ECharts](docs/references/vite-echarts-reference.md)

## Key Paths
- Source: `src/` | Types: `src/types/` | Stores: `src/stores/`
- API: `src/api/` | Utils: `src/utils/` | Tests: `src/**/__tests__/`

## Critical Rules
1. **No `console.log`** - Use `src/utils/logger.ts` structured logger
2. **Validate at boundaries** - Zod schemas in `src/validation/`
3. **No cross-store imports** - Each store is independent
4. **Dependency direction** - Views → Stores → API/Utils/DB (never reverse)
5. **Rate limit all API calls** - Use `financialReportRateLimiter`
