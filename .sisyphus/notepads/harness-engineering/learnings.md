# Learnings

## Zod v4 API (2026-04-05)
- Zod v4 (4.3.6) installed. API differs from v3:
  - `safeParse()` still works but returns `result.error.issues` (not `result.error.errors`)
  - Type annotation for schema parameter: use `z.ZodType<T>` (not `z.ZodSchema<T>` or `z.core.$ZodType<T>`)
  - Issue `path` property is `PropertyKey[]` (can include symbols), not `(string | number)[]`
  - Use `String(e.path.join('.'))` to safely format paths
- Import style: `import { z } from 'zod'` works (classic mode)
- `z.enum()` for string literal unions, `z.literal()` for single values
- `z.record(z.string(), z.number())` for `Record<string, number>`

## Validation Pattern
- Created `validateApiResponse<T>(data: unknown, schema: z.ZodType<T>): T` in `src/utils/validateApiResponse.ts`
- Wraps all 4 API client return values: eastmoney, financialReportA, financialReportHK, exchangeRate
- Uses `safeParse()` to avoid try/catch overhead, throws descriptive error on failure
- `npm run type-check` passes cleanly after all changes

## Structured Logger (2026-04-05)
- Created `src/utils/logger.ts` with debug/info/warn/error levels
- Format: `[TIMESTAMP] [LEVEL] [module] message` with optional JSON context
- `debug` logs are automatically stripped in production via `import.meta.env.PROD`
- Replaced ALL console.log/error/warn calls across 11 files:
  - `src/api/financialReportA.ts` (~25 console.log → logger.debug)
  - `src/api/financialReportHK.ts` (~30 console.log → logger.debug)
  - `src/api/eastmoney.ts` (2 console.error → logger.error)
  - `src/api/exchangeRate.ts` (2 console.error → logger.error)
  - `src/stores/stockStore.ts` (5 console.error → logger.error)
  - `src/composables/useFinancialReport.ts` (1 console.error → logger.error)
  - `src/composables/useExcelParser.ts` (1 console.error → logger.error)
  - `src/utils/validateApiResponse.ts` (1 console.error → logger.error)
  - `src/utils/calculator.ts` (~15 console.log → logger.debug)
  - `src/views/StockDetailView.vue` (2 console.error → logger.error)
  - `src/components/ApiTester.vue` (1 console.error → logger.error)
- Only remaining console.* calls: logger.ts internal implementation + 1 test file (intentionally excluded)
- `npm run build` passes cleanly

## Playwright E2E Setup (2026-04-05)
- Playwright was already partially installed (`@playwright/test` in devDependencies)
- Existing `playwright.config.ts` had `testDir: './e2e'` with tests at root level
- Reorganized to `testDir: './e2e/tests'` with proper subdirectory structure:
  - `e2e/tests/` - test spec files
  - `e2e/fixtures/` - test data fixtures
  - `e2e/utils/` - shared test utilities
- Moved existing tests (`playwright.spec.ts`, `refresh-all.spec.ts`) into `e2e/tests/`
- Updated reporter to `[['list'], ['html', { open: 'never' }]]` for CI-friendly output
- Created `e2e/tests/home-page.spec.ts` - happy path test verifying:
  - Page title renders (h1 contains "StockAnalyzer")
  - Add button is visible
  - Empty state or stock list renders (no crash)
  - No console errors (excluding expected network errors from external APIs)
- `npm run test:e2e` and `npm run test:e2e:ui` scripts already existed in package.json
- Pre-existing test failure: `playwright.spec.ts` Edit Mode test times out looking for edit button - selectors don't match current UI
- External API network errors (`ERR_CONNECTION_CLOSED`) are expected and should be filtered in tests

## ESLint + Dependency Direction Setup (2026-04-05)
- ESLint flat config (`eslint.config.js`) with Vue + TypeScript support
- Required parsers: `vue-eslint-parser` (for .vue files) + `@typescript-eslint/parser` (for .ts files)
- Vue files MUST use `vue-eslint-parser` as primary parser, with `tsParser` as nested parser
- `no-console` rule enforced at error level, with exceptions for:
  - `src/utils/logger.ts` (it IS the logger implementation)
  - `src/**/__tests__/**` (test files may use console for debugging)
- Two pre-existing `console.*` calls in `AddStockView.vue` handled with `eslint-disable-next-line` comments
- `npm run lint` passes with 0 errors (61 warnings - all `@typescript-eslint/no-unused-vars` and `@typescript-eslint/no-explicit-any`)
- Dependency direction checker at `scripts/check-deps.ts`:
  - Scans all .ts/.vue files in src/, parses import statements
  - Enforces rules from docs/ARCHITECTURE.md
  - Detected 8 pre-existing violations:
    - 5 cross-store imports (stockApiStore↔stockUIStore, stockListStore↔stockUIStore, stockStore↔others)
    - 2 views→api direct imports (AddStockView, StockDetailView → exchangeRate)
  - Exit code 1 on violations, 0 on clean
- `vue-eslint-parser` was NOT already installed - had to add it separately
