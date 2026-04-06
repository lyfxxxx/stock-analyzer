# Harness Engineering Optimization - Stock Analyzer

## TL;DR

> **Quick Summary**: Apply Harness Engineering best practices from OpenAI and Anthropic to transform Stock Analyzer into an agent-readable, architecturally-enforced, observable codebase with automated quality loops.
> 
> **Deliverables**:
> - `AGENTS.md` + `docs/` structured knowledge base
> - Zod validation at all API boundaries
> - Structured logger replacing all `console.log`
> - Split stockStore into 3 domain stores (list, api, UI)
> - Architectural linter enforcing dependency rules
> - Error boundary Vue component
> - Retry/backoff for API calls
> - GitHub Actions CI pipeline
> - Playwright E2E evaluator infrastructure
> 
> **Estimated Effort**: Large (4 phases, ~2-3 days total)
> **Parallel Execution**: YES - 4 waves with internal parallelism
> **Critical Path**: T1 (docs) → T4 (Zod) → T7 (store split) → T12 (CI)

---

## Context

### Original Request
参考 OpenAI 和 Anthropic 的 Harness Engineering 文章，针对 Stock Analyzer 项目梳理并实施优化项。

### Interview Summary
**Key Discussions**:
- User selected scope: Critical + Important items (1-10 out of 14 identified)
- User selected strategy: Phased progressive implementation across 4 phases

**Research Findings**:
- stockStore.ts is a 509-line God Object doing state, API, DB, and calculations
- API clients have 50+ console.log debug statements each in production
- No Zod/runtime validation, no ESLint, no CI pipeline
- Raw IndexedDB wrapper (no `idb` library despite README claim)
- Zero observability infrastructure

### Metis Review (Oracle Consultation)
**Identified Gaps** (addressed):
- Store splitting limited to 3 stores max to prevent over-engineering
- Zod validation scoped to API boundaries only, not internal state
- console.log must be redirected to structured logger, not just deleted
- CI must not add external service dependencies
- DB migration path needed for existing IndexedDB data
- JSONP security in eastmoney.ts noted but scoped out (separate concern)
- Rate limiter + concurrency tension documented as known issue

---

## Work Objectives

### Core Objective
Transform Stock Analyzer from a monolithic, unobservable app into a Harness Engineering-ready codebase that is agent-readable, architecturally enforced, and has automated quality feedback loops.

### Concrete Deliverables
- `AGENTS.md` + `docs/` directory with architecture, API contracts, deployment guides
- `src/validation/` with Zod schemas for all API responses and StockData
- `src/utils/logger.ts` structured logger replacing all console.* calls
- 3 domain stores: `stockListStore`, `stockApiStore`, `stockUIStore`
- Custom architectural linter enforcing dependency directions
- `ErrorBoundary.vue` component wrapping all route views
- Retry/backoff utility replacing current single-retry approach
- `.github/workflows/ci.yml` with lint → type-check → test → build

### Definition of Done
- [ ] `npm run type-check` passes with zero errors
- [ ] `npm run test` passes with all existing tests
- [ ] `npm run build` succeeds
- [ ] Zero `console.log` in `src/` (verified by grep)
- [ ] All route views wrapped in ErrorBoundary
- [ ] CI workflow runs green on push

### Must Have
- All existing functionality preserved (no behavior changes)
- Zod schemas match existing TypeScript types exactly
- Store split maintains same public API surface during transition
- Structured logger works as drop-in replacement for console.*

### Must NOT Have (Guardrails)
- No new external services (no Sentry, no external logging)
- No behavior changes during store splitting - purely structural
- No "improving" types during Zod validation - mirror existing types
- No custom ESLint rules in Phase 1 - auto-fixable only
- No matrix builds or deployment steps in CI
- No per-component error boundaries - single route-level only
- No splitting stores beyond 3 (list, api, UI)

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** - ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (Vitest + Playwright listed)
- **Automated tests**: Tests-after (add tests after structural changes)
- **Framework**: Vitest for unit, Playwright for E2E evaluator
- **If TDD**: Not applicable - this is refactoring/infrastructure work

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend/UI**: Playwright - navigate, assert DOM, screenshot
- **CLI/Build**: Bash - run commands, validate output, check exit codes
- **File Verification**: Bash - grep for patterns, count occurrences

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation - docs + validation + logger cleanup):
├── Task 1: AGENTS.md + docs/ knowledge base [quick]
├── Task 2: Zod validation schemas [quick]
├── Task 3: Structured logger + console.log removal [quick]
└── Task 4: Playwright E2E evaluator setup [quick]

Wave 2 (Architecture - store split + linting + error boundaries):
├── Task 5: Split stockStore into 3 domain stores [deep]
├── Task 6: Architectural linter + ESLint setup [quick]
└── Task 7: ErrorBoundary.vue component [quick]

Wave 3 (Quality Loop - retry + CI):
├── Task 8: Retry/backoff for API calls [unspecified-high]
└── Task 9: GitHub Actions CI pipeline [quick]

Wave FINAL (After ALL tasks — 4 parallel reviews):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay

Critical Path: T1 → T2 → T5 → T8 → T9 → F1-F4 → user okay
Parallel Speedup: ~60% faster than sequential
Max Concurrent: 4 (Wave 1)
```

### Dependency Matrix

- **T1**: - → T5, T6
- **T2**: - → T5, T8
- **T3**: - → T5, T6
- **T4**: - → F3
- **T5**: T1, T2, T3 → T8, T9
- **T6**: T1, T3 → T9
- **T7**: T5 → F3
- **T8**: T2, T5 → T9
- **T9**: T5, T6, T8 → F1, F2

### Agent Dispatch Summary

- **Wave 1**: **4** - T1 → `quick`, T2 → `quick`, T3 → `quick`, T4 → `quick`
- **Wave 2**: **3** - T5 → `deep`, T6 → `quick`, T7 → `quick`
- **Wave 3**: **2** - T8 → `unspecified-high`, T9 → `quick`
- **FINAL**: **4** - F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

> Implementation + Test = ONE Task. Never separate.
> EVERY task MUST have: Recommended Agent Profile + Parallelization info + QA Scenarios.

- [x] 1. Create AGENTS.md + docs/ Knowledge Base

  **What to do**:
  - Create `AGENTS.md` as table of contents (~100 lines max) pointing to docs/
  - Create `docs/` directory structure:
    - `docs/ARCHITECTURE.md` - Top-level domain map, package hierarchy, dependency directions
    - `docs/FRONTEND.md` - Vue component conventions, Composition API patterns, CSS variable usage
    - `docs/references/` - Library references (Vue, Pinia, Vite, ECharts llms.txt style)
    - `docs/design-docs/` - Data flow diagrams, store architecture, API contracts
    - `docs/exec-plans/` - Active/completed plan tracking
  - AGENTS.md should cover: code style, import order, testing patterns, DB conventions, naming conventions
  - Follow OpenAI's "progressive disclosure" pattern - small entry point, deep docs elsewhere

  **Must NOT do**:
  - Don't make AGENTS.md an encyclopedia (>100 lines)
  - Don't duplicate information already in README.md
  - Don't create empty placeholder docs - each file must have real content

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Documentation creation, well-defined structure, no complex logic
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `writing`: Not needed - this is technical documentation following project conventions

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4)
  - **Blocks**: T5 (store split needs architecture docs), T6 (linter needs conventions documented)
  - **Blocked By**: None (can start immediately)

  **References**:
  - `README.md` - Existing project documentation to extract conventions from
  - `AGENTS.md` (root) - Existing dev guide to reference for knowledge base structure
  - `src/` directory - Source structure to document
  - OpenAI article: "代码仓库即记录系统" section for docs/ layout pattern

  **Acceptance Criteria**:
  - [ ] `AGENTS.md` exists at project root, <100 lines, contains links to docs/
  - [ ] `docs/ARCHITECTURE.md` exists with domain map and dependency directions
  - [ ] `docs/FRONTEND.md` exists with Vue conventions
  - [ ] `docs/references/` exists with at least 2 reference files
  - [ ] `docs/design-docs/` exists with at least data flow documentation
  - [ ] All docs contain real content (not empty placeholders)

  **QA Scenarios**:
  ```
  Scenario: AGENTS.md is valid table of contents
    Tool: Bash
    Steps:
      1. Run: wc -l AGENTS.md
      2. Assert: line count <= 100
      3. Run: grep -c "docs/" AGENTS.md
      4. Assert: at least 3 references to docs/ directory
    Expected Result: AGENTS.md is concise and references docs/
    Evidence: .sisyphus/evidence/task-1-agents-md-check.txt

  Scenario: All docs/ files have real content
    Tool: Bash
    Steps:
      1. Run: find docs/ -name "*.md" -exec wc -l {} \;
      2. Assert: each file has >= 10 lines of content
      3. Run: find docs/ -name "*.md" -size 0
      4. Assert: no empty files found
    Expected Result: All documentation files have substantive content
    Evidence: .sisyphus/evidence/task-1-docs-content-check.txt
  ```

  **Commit**: YES (groups with 2, 3, 4)
  - Message: `docs(harness): create AGENTS.md and docs/ knowledge base`
  - Pre-commit: `grep -c "docs/" AGENTS.md`

- [x] 2. Add Zod Validation at API Boundaries

  **What to do**:
  - Install `zod` dependency
  - Create `src/validation/` directory with Zod schemas:
    - `apiSchemas.ts` - Schemas for East Money API responses, financial report responses, exchange rate responses
    - `stockSchemas.ts` - Schema for StockData type
  - Create `src/utils/validateApiResponse.ts` utility function that validates and parses API responses
  - Wrap all API client return values with validation:
    - `fetchEastMoneyStockInfo` → validate with zod
    - `fetchAStockFinancialReport` → validate with zod
    - `fetchHKStockFinancialReport` → validate with zod
    - `fetchExchangeRates` → validate with zod
  - Schemas must mirror existing TypeScript types exactly (no type improvements)

  **Must NOT do**:
  - Don't change existing TypeScript types
  - Don't validate internal state or component props
  - Don't add validation to utility functions (calculator, excelParser)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Schema definition is mechanical - map existing types to Zod
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `writing`: Not needed - code generation from existing types

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4)
  - **Blocks**: T5 (store split benefits from validated data), T8 (retry needs validated responses)
  - **Blocked By**: None (can start immediately)

  **References**:
  - `src/types/stock.ts` - Existing StockData and related types to mirror in Zod
  - `src/types/financialReport.ts` - Financial report types to mirror
  - `src/api/eastmoney.ts` - API response shapes to validate
  - `src/api/financialReportA.ts` - A-share API response shapes
  - `src/api/financialReportHK.ts` - HK-share API response shapes
  - `src/api/exchangeRate.ts` - Exchange rate response shape
  - Official docs: `https://zod.dev/?id=basic-usage` - Zod validation syntax

  **Acceptance Criteria**:
  - [ ] `zod` installed in package.json dependencies
  - [ ] `src/validation/apiSchemas.ts` exists with schemas for all 4 API response types
  - [ ] `src/validation/stockSchemas.ts` exists with StockData schema
  - [ ] `src/utils/validateApiResponse.ts` exists with generic validation wrapper
  - [ ] All 4 API clients use validation on return values
  - [ ] `npm run type-check` passes

  **QA Scenarios**:
  ```
  Scenario: Zod schemas validate correct API responses
    Tool: Bash (node REPL)
    Steps:
      1. Import apiSchemas from src/validation/apiSchemas.ts
      2. Call schema.parse() with a valid mock API response object
      3. Assert: returns parsed data without error
      4. Call schema.parse() with an invalid response (missing required field)
      5. Assert: throws ZodError
    Expected Result: Schemas correctly accept valid data and reject invalid data
    Evidence: .sisyphus/evidence/task-2-zod-validation-test.txt

  Scenario: API clients use validation
    Tool: Bash
    Steps:
      1. Run: grep -r "validateApiResponse\|\.parse(" src/api/
      2. Assert: at least 4 files use validation
      3. Run: grep -r "zod" src/validation/
      4. Assert: schemas import from zod
    Expected Result: All API clients use Zod validation
    Evidence: .sisyphus/evidence/task-2-api-validation-usage.txt
  ```

  **Commit**: YES (groups with 1, 3, 4)
  - Message: `feat(validation): add Zod schemas at API boundaries`
  - Pre-commit: `npm run type-check`

- [x] 3. Structured Logger + Console.log Removal

  **What to do**:
  - Create `src/utils/logger.ts` with structured logging utility:
    - Levels: debug, info, warn, error
    - Each log includes: timestamp, level, module name, message, optional context object
    - Environment-aware: debug logs disabled in production build
    - API: `logger.debug(module, message, context?)`, `logger.info(...)`, etc.
  - Replace ALL `console.log`, `console.error`, `console.warn` in:
    - `src/api/financialReportA.ts` (~50+ console.log calls)
    - `src/api/financialReportHK.ts` (~50+ console.log calls)
    - `src/api/eastmoney.ts` (console.error calls)
    - `src/api/exchangeRate.ts` (console.error calls)
    - `src/stores/stockStore.ts` (console.error calls)
    - `src/composables/*.ts` (console.error calls)
  - Debug-level logs (detailed financial data dumps) → `logger.debug()`
  - Error logs → `logger.error()`
  - Warning logs → `logger.warn()`

  **Must NOT do**:
  - Don't just delete console.log - redirect to structured logger
  - Don't change log message content (preserve for debugging continuity)
  - Don't add external logging libraries (keep it lightweight)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Mechanical find-and-replace with pattern transformation
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4)
  - **Blocks**: T5 (clean baseline for store split), T6 (linter can enforce no-console)
  - **Blocked By**: None (can start immediately)

  **References**:
  - `src/api/financialReportA.ts` - ~50 console.log calls to replace (lines 264-520)
  - `src/api/financialReportHK.ts` - ~50 console.log calls to replace (lines 437-722)
  - `src/api/eastmoney.ts` - console.error calls (lines 44, 206)
  - `src/api/exchangeRate.ts` - console.error calls (lines 48, 80)
  - `src/stores/stockStore.ts` - console.error calls (lines 41, 110, 356, 467)
  - `src/composables/useFinancialReport.ts` - console.error (line 143)
  - `src/composables/useExcelParser.ts` - console.error (line 155)

  **Acceptance Criteria**:
  - [ ] `src/utils/logger.ts` exists with debug/info/warn/error levels
  - [ ] Zero `console.log` in `src/` directory (verified by grep)
  - [ ] Zero `console.error` in `src/` directory (all replaced with logger.error)
  - [ ] `npm run build` succeeds (no broken imports)
  - [ ] Debug logs are stripped/disabled in production build

  **QA Scenarios**:
  ```
  Scenario: No console.log remains in source
    Tool: Bash
    Steps:
      1. Run: grep -rn "console\.log\|console\.error\|console\.warn" src/ --include="*.ts" --include="*.vue"
      2. Assert: zero matches found
    Expected Result: All console.* calls replaced with logger
    Evidence: .sisyphus/evidence/task-3-no-console-check.txt

  Scenario: Logger module works correctly
    Tool: Bash (node REPL)
    Steps:
      1. Import logger from src/utils/logger.ts
      2. Call logger.debug('test', 'debug message', { key: 'value' })
      3. Call logger.error('test', 'error message')
      4. Assert: output includes timestamp, level, module, message
    Expected Result: Logger produces structured output with all required fields
    Evidence: .sisyphus/evidence/task-3-logger-output-test.txt
  ```

  **Commit**: YES (groups with 1, 2, 4)
  - Message: `refactor(logging): replace console.* with structured logger`
  - Pre-commit: `grep -rn "console\." src/ --include="*.ts" | wc -l`

- [x] 4. Playwright E2E Evaluator Infrastructure

  **What to do**:
  - Set up Playwright for E2E testing (if not already configured)
  - Create `e2e/` directory with evaluator test structure:
    - `e2e/fixtures/` - Test data fixtures
    - `e2e/tests/` - E2E test scenarios
    - `e2e/utils/` - Shared test utilities
  - Create evaluator grading criteria as test assertions:
    - **Design Quality**: UI renders without layout issues
    - **Functionality**: Core user flows work (add stock, view details, delete stock)
    - **Error Handling**: Graceful error display for API failures
  - Create initial E2E test covering the happy path:
    - Navigate to home page
    - Add a stock via search
    - View stock detail page
    - Verify valuation metrics display
  - Create `npm run test:e2e` script in package.json

  **Must NOT do**:
  - Don't write exhaustive E2E tests - just the infrastructure + 1 happy path test
  - Don't add visual regression testing (out of scope)
  - Don't test external API calls (mock them)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Infrastructure setup with well-documented Playwright patterns
  - **Skills**: `playwright`
    - `playwright`: Direct skill match for E2E test setup and browser automation

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3)
  - **Blocks**: F3 (final QA uses this infrastructure)
  - **Blocked By**: None (can start immediately)

  **References**:
  - `playwright.config.ts` - Existing Playwright config (if exists)
  - `e2e/` directory - Existing E2E tests (if any)
  - `package.json` - test:e2e script definition
  - `src/views/HomeView.vue` - Home page to test
  - `src/views/StockDetailView.vue` - Detail view to test
  - Official docs: `https://playwright.dev/docs/intro` - Playwright setup

  **Acceptance Criteria**:
  - [ ] Playwright installed and configured
  - [ ] `e2e/` directory exists with tests/ and fixtures/ subdirectories
  - [ ] At least 1 E2E test covering the happy path
  - [ ] `npm run test:e2e` runs successfully
  - [ ] Evaluator grading criteria documented in test comments

  **QA Scenarios**:
  ```
  Scenario: E2E test infrastructure runs
    Tool: Bash
    Steps:
      1. Run: npm run test:e2e -- --reporter=list
      2. Assert: at least 1 test passes
      3. Assert: exit code is 0
    Expected Result: E2E test suite runs and passes
    Evidence: .sisyphus/evidence/task-4-e2e-run.txt

  Scenario: E2E directory structure exists
    Tool: Bash
    Steps:
      1. Run: find e2e/ -type f -name "*.ts" | sort
      2. Assert: at least 1 test file exists
      3. Assert: fixtures/ directory exists
    Expected Result: E2E directory structure is properly set up
    Evidence: .sisyphus/evidence/task-4-e2e-structure.txt
  ```

  **Commit**: YES (groups with 1, 2, 3)
  - Message: `test(e2e): set up Playwright evaluator infrastructure`
  - Pre-commit: `npm run test:e2e -- --reporter=list`

---

- [x] 5. Split stockStore into 3 Domain Stores

  **What to do**:
  - Split `src/stores/stockStore.ts` (509 lines) into 3 focused stores:
    - **`stockListStore`** - Stock CRUD operations + IndexedDB interactions
      - State: `stocks`, `sortedStocks`, `stockCount`
      - Actions: `loadStocks`, `addStock`, `deleteStock`, `getStockById`, `updateStock`, `recalculateStock`
    - **`stockApiStore`** - External API calls + financial calculations
      - State: `isApiAvailable`, `apiTestResults`
      - Actions: `testAPIs`, `fetchStockInfo`, `fetchFinancialReport`, `updateStockMarketCap`, `updateStockWithRecalculation`, `updateAllStocks`, `searchStocks`
    - **`stockUIStore`** - UI state management
      - State: `loading`, `error`, `searchResults`, `isSearching`, `updateProgress`, `isUpdatingAllStocks`, `currentlyUpdatingIds`
      - Actions: `clearError`, `clearSearchResults`
  - Create a facade/composable `useStockFacade()` that provides the same API as the original `useStockStore()` for backward compatibility during transition
  - Update all component imports to use the new stores
  - Ensure `normalizeStockData` stays in the DB layer (stockListStore)
  - Run all existing tests to verify no behavior changes

  **Must NOT do**:
  - Don't change any business logic or calculation behavior
  - Don't split beyond 3 stores (no per-domain stores)
  - Don't change the public API surface - components should work the same way
  - Don't modify test assertions - tests should pass as-is

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Complex refactoring with high risk of breaking changes. Requires careful dependency analysis, cross-file updates, and behavior preservation verification.
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (Wave 2 start)
  - **Blocks**: T7 (ErrorBoundary depends on clean store structure), T8 (retry depends on api store), T9 (CI depends on all stores working)
  - **Blocked By**: T1 (architecture docs), T2 (validated data), T3 (clean logging baseline)

  **References**:
  - `src/stores/stockStore.ts` - Full 509-line store to split (READ ENTIRE FILE)
  - `src/stores/__tests__/stockStore.spec.ts` - Existing tests to preserve behavior
  - `src/db/index.ts` - DB layer where normalizeStockData should stay
  - `src/views/HomeView.vue` - Component using stockStore
  - `src/views/AddStockView.vue` - Component using stockStore
  - `src/views/StockDetailView.vue` - Component using stockStore
  - `src/components/` - All components that import useStockStore

  **Acceptance Criteria**:
  - [ ] `src/stores/stockListStore.ts` exists with CRUD + DB operations
  - [ ] `src/stores/stockApiStore.ts` exists with API calls + calculations
  - [ ] `src/stores/stockUIStore.ts` exists with UI state
  - [ ] Original `stockStore.ts` removed or re-exports from new stores
  - [ ] All component imports updated to use new stores
  - [ ] `npm run test` passes with all existing tests
  - [ ] `npm run type-check` passes
  - [ ] No circular dependencies between stores

  **QA Scenarios**:
  ```
  Scenario: Store split maintains same functionality
    Tool: Bash
    Steps:
      1. Run: npm run test
      2. Assert: all tests pass (0 failures)
      3. Run: npm run type-check
      4. Assert: zero type errors
    Expected Result: All existing tests pass, no type errors
    Evidence: .sisyphus/evidence/task-5-store-split-tests.txt

  Scenario: No circular dependencies between stores
    Tool: Bash
    Steps:
      1. Run: grep -rn "from '@/stores/" src/stores/*.ts
      2. Assert: no store imports another store (cross-store dependencies)
      3. Verify: each store only imports from types/, db/, api/, utils/
    Expected Result: Stores have no circular or cross-store dependencies
    Evidence: .sisyphus/evidence/task-5-no-circular-deps.txt

  Scenario: Build succeeds after store split
    Tool: Bash
    Steps:
      1. Run: npm run build
      2. Assert: build completes with exit code 0
      3. Assert: no type errors in build output
    Expected Result: Production build succeeds
    Evidence: .sisyphus/evidence/task-5-build-success.txt
  ```

  **Commit**: YES
  - Message: `refactor(store): split stockStore into list, api, and UI stores`
  - Pre-commit: `npm run test && npm run type-check`

- [x] 6. Architectural Linter + ESLint Setup

  **What to do**:
  - Install ESLint with Vue + TypeScript support:
    - `eslint`, `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin`
    - `eslint-plugin-vue`
  - Create `eslint.config.js` (flat config) with:
    - `eslint:recommended` rules
    - `@typescript-eslint/recommended` rules
    - `vue/recommended` rules
    - `no-console` rule (error level - enforces Task 3's logger migration)
    - Auto-fixable rules only in Phase 1
  - Create custom architectural lint rule (as standalone script `scripts/check-deps.ts`):
    - Enforce dependency directions: stores cannot import from views, views cannot import from utils directly
    - Allowed: components → stores, stores → api/utils/db, api → utils, views → components/stores
    - Forbidden: utils → stores, db → api, views → api (must go through stores)
  - Add `npm run lint` and `npm run lint:fix` scripts

  **Must NOT do**:
  - Don't add custom rules beyond dependency direction and no-console
  - Don't enforce code formatting (no Prettier integration in Phase 1)
  - Don't add complexity rules or JSDoc requirements

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Configuration-driven setup with well-documented ESLint patterns
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T7)
  - **Parallel Group**: Wave 2 (with T5, T7)
  - **Blocks**: T9 (CI runs lint)
  - **Blocked By**: T1 (docs define conventions), T3 (no-console rule depends on logger)

  **References**:
  - `AGENTS.md` - Code style conventions to encode as lint rules
  - `docs/ARCHITECTURE.md` - Dependency directions to enforce
  - `package.json` - Add lint scripts
  - Official docs: `https://eslint.vuejs.org/user-guide/` - Vue ESLint setup

  **Acceptance Criteria**:
  - [ ] `eslint.config.js` exists with flat config
  - [ ] ESLint dependencies installed in package.json devDependencies
  - [ ] `npm run lint` runs with zero errors on current codebase
  - [ ] `no-console` rule enforced (error level)
  - [ ] Dependency direction script exists at `scripts/check-deps.ts`
  - [ ] `npm run lint:fix` auto-fixes what it can

  **QA Scenarios**:
  ```
  Scenario: ESLint runs successfully
    Tool: Bash
    Steps:
      1. Run: npm run lint
      2. Assert: exit code 0
      3. Assert: zero errors in output
    Expected Result: ESLint passes on entire codebase
    Evidence: .sisyphus/evidence/task-6-eslint-pass.txt

  Scenario: no-console rule catches violations
    Tool: Bash
    Steps:
      1. Temporarily add console.log('test') to a .ts file
      2. Run: npm run lint
      3. Assert: error reported for no-console
      4. Remove the test console.log
    Expected Result: no-console rule correctly catches console.* usage
    Evidence: .sisyphus/evidence/task-6-no-console-rule.txt

  Scenario: Dependency direction script exists and runs
    Tool: Bash
    Steps:
      1. Run: npx tsx scripts/check-deps.ts
      2. Assert: no violations in current code (or violations documented)
      3. Assert: exit code 0
    Expected Result: Dependency direction enforcement is active
    Evidence: .sisyphus/evidence/task-6-dep-direction.txt
  ```

  **Commit**: YES (groups with T7)
  - Message: `chore(lint): add ESLint + architectural dependency rules`
  - Pre-commit: `npm run lint`

- [x] 7. ErrorBoundary Vue Component

  **What to do**:
  - Create `src/components/ErrorBoundary.vue` with:
    - Captures render errors in child components via `errorCaptured` lifecycle hook
    - Displays user-friendly error message with retry button
    - Logs error details via structured logger (from Task 3)
    - Falls back to showing error state instead of crashing the entire app
  - Wrap all route-level views in App.vue or router with ErrorBoundary:
    - HomeView → ErrorBoundary(HomeView)
    - AddStockView → ErrorBoundary(AddStockView)
    - StockDetailView → ErrorBoundary(StockDetailView)
  - ErrorBoundary should accept optional `fallback` slot for custom error UI
  - ErrorBoundary should accept optional `onError` callback prop for error reporting

  **Must NOT do**:
  - Don't add per-component error boundaries (route-level only)
  - Don't add external error tracking services
  - Don't change existing error handling in stores/components

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single Vue component with well-defined lifecycle hook pattern
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T6)
  - **Parallel Group**: Wave 2 (with T5, T6)
  - **Blocks**: F3 (final QA tests error boundary behavior)
  - **Blocked By**: T5 (needs clean store structure first)

  **References**:
  - `src/App.vue` - Where ErrorBoundary will be integrated
  - `src/router/index.ts` - Route definitions to wrap
  - `src/utils/logger.ts` - Structured logger from Task 3
  - Official docs: `https://vuejs.org/api/composition-api-lifecycle.html#errorcaptured` - errorCaptured hook

  **Acceptance Criteria**:
  - [ ] `src/components/ErrorBoundary.vue` exists with errorCaptured hook
  - [ ] All 3 route views wrapped in ErrorBoundary
  - [ ] ErrorBoundary displays user-friendly error message
  - [ ] ErrorBoundary has retry button that re-renders child
  - [ ] Errors are logged via structured logger
  - [ ] `npm run build` succeeds

  **QA Scenarios**:
  ```
  Scenario: ErrorBoundary catches render errors
    Tool: Bash (node REPL + Vue Test Utils)
    Steps:
      1. Create a test component that throws during render
      2. Wrap it with ErrorBoundary
      3. Mount and assert: error message is displayed
      4. Assert: original error is logged via logger
    Expected Result: ErrorBoundary catches and displays render errors gracefully
    Evidence: .sisyphus/evidence/task-7-error-boundary-catches.txt

  Scenario: ErrorBoundary retry works
    Tool: Bash (node REPL + Vue Test Utils)
    Steps:
      1. Create test component that throws on first render, succeeds on second
      2. Wrap with ErrorBoundary
      3. Trigger retry (click retry button)
      4. Assert: component renders successfully after retry
    Expected Result: Retry button successfully re-renders child component
    Evidence: .sisyphus/evidence/task-7-error-boundary-retry.txt

  Scenario: All routes wrapped in ErrorBoundary
    Tool: Bash
    Steps:
      1. Run: grep -rn "ErrorBoundary" src/App.vue src/router/
      2. Assert: all 3 route views are wrapped
    Expected Result: All routes have error boundary protection
    Evidence: .sisyphus/evidence/task-7-all-routes-wrapped.txt
  ```

  **Commit**: YES (groups with T6)
  - Message: `feat(ui): add ErrorBoundary component for route-level error handling`
  - Pre-commit: `npm run build`

- [x] 8. Retry/Backoff for API Calls

  **What to do**:
  - Create `src/utils/retry.ts` with retry utility:
    - Exponential backoff with jitter
    - Configurable: maxRetries (default 3), baseDelay (default 1000ms), maxDelay (default 30000ms)
    - Retry only on transient errors (network errors, 5xx, timeout)
    - Don't retry on 4xx client errors (except 429 rate limit)
    - Return last error after all retries exhausted
  - Update existing API clients to use retry utility:
    - `fetchEastMoneyStockInfo` - wrap fetch with retry
    - `fetchAStockFinancialReport` - wrap fetchWithRateLimit with retry
    - `fetchHKStockFinancialReport` - wrap fetchWithRateLimit with retry
    - `fetchExchangeRates` - wrap fetch with retry
  - Update rate limiter to work with retry (retries should respect rate limit queue)
  - Add timeout to all fetch calls (default 15s)

  **Must NOT do**:
  - Don't retry on validation errors (Zod parse failures)
  - Don't change the rate limiter's core queue logic
  - Don't add circuit breaker (out of scope for this phase)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Requires careful error classification, backoff algorithm implementation, and integration with existing rate limiter
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on store split completing)
  - **Parallel Group**: Wave 3 (sequential start)
  - **Blocks**: T9 (CI needs stable API layer), F3 (QA tests retry behavior)
  - **Blocked By**: T2 (Zod validation - don't retry validation errors), T5 (store split - api store interface)

  **References**:
  - `src/utils/rateLimiter.ts` - Existing rate limiter to integrate with
  - `src/api/eastmoney.ts` - API client needing retry wrapper
  - `src/api/financialReportA.ts` - API client needing retry wrapper
  - `src/api/financialReportHK.ts` - API client needing retry wrapper
  - `src/api/exchangeRate.ts` - API client needing retry wrapper
  - `src/validation/apiSchemas.ts` - Zod schemas to distinguish validation vs network errors

  **Acceptance Criteria**:
  - [ ] `src/utils/retry.ts` exists with exponential backoff + jitter
  - [ ] All 4 API clients use retry utility
  - [ ] Retry respects rate limiter queue
  - [ ] All fetch calls have 15s timeout
  - [ ] 4xx errors (except 429) are NOT retried
  - [ ] Zod validation errors are NOT retried
  - [ ] `npm run test` passes

  **QA Scenarios**:
  ```
  Scenario: Retry succeeds after transient failure
    Tool: Bash (node REPL)
    Steps:
      1. Import retry from src/utils/retry.ts
      2. Create mock function that fails twice then succeeds
      3. Call retry(mockFn, { maxRetries: 3, baseDelay: 100 })
      4. Assert: function succeeds on 3rd attempt
      5. Assert: total delay follows exponential backoff pattern
    Expected Result: Retry succeeds after transient failures with correct backoff
    Evidence: .sisyphus/evidence/task-8-retry-success.txt

  Scenario: Retry gives up after max attempts
    Tool: Bash (node REPL)
    Steps:
      1. Import retry from src/utils/retry.ts
      2. Create mock function that always throws network error
      3. Call retry(mockFn, { maxRetries: 2, baseDelay: 50 })
      4. Assert: function is called exactly 3 times (initial + 2 retries)
      5. Assert: last error is returned
    Expected Result: Retry exhausts after max attempts and returns last error
    Evidence: .sisyphus/evidence/task-8-retry-exhaust.txt

  Scenario: 4xx errors are not retried
    Tool: Bash (node REPL)
    Steps:
      1. Import retry from src/utils/retry.ts
      2. Create mock function that throws HTTP 404 error
      3. Call retry(mockFn, { maxRetries: 3, baseDelay: 50 })
      4. Assert: function is called exactly 1 time (no retries)
      5. Assert: 404 error is returned immediately
    Expected Result: Client errors fail immediately without retry
    Evidence: .sisyphus/evidence/task-8-no-retry-4xx.txt
  ```

  **Commit**: YES
  - Message: `feat(api): add retry/backoff with exponential backoff and jitter`
  - Pre-commit: `npm run test`

- [x] 9. GitHub Actions CI Pipeline

  **What to do**:
  - Create `.github/workflows/ci.yml` with single workflow:
    - Trigger: push to main, pull_request to main
    - Steps: npm ci → npm run lint → npm run type-check → npm run test → npm run build
    - Upload build artifacts on success
    - Fail fast on any step failure
  - No matrix builds, no deployment steps, no coverage gates
  - Use Node.js 20.x (matching project requirements)
  - Cache node_modules for faster runs
  - Target: complete within 5 minutes

  **Must NOT do**:
  - Don't add deployment steps
  - Don't add matrix builds (multiple Node versions)
  - Don't add coverage gates
  - Don't add external service integrations

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Standard CI configuration with well-documented GitHub Actions patterns
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (after T8)
  - **Blocks**: F1, F2 (final verification uses CI)
  - **Blocked By**: T5 (stores must be split), T6 (lint must exist), T8 (retry must be stable)

  **References**:
  - `package.json` - Scripts to run in CI
  - `.node-version` or `engines` in package.json - Node version requirement
  - Official docs: `https://docs.github.com/en/actions/automating-builds-and-tests/building-and-testing-nodejs` - Node.js CI

  **Acceptance Criteria**:
  - [ ] `.github/workflows/ci.yml` exists
  - [ ] Workflow triggers on push to main and PR to main
  - [ ] All 4 steps run: lint, type-check, test, build
  - [ ] Workflow completes within 5 minutes
  - [ ] Build artifacts uploaded on success

  **QA Scenarios**:
  ```
  Scenario: CI workflow file is valid
    Tool: Bash
    Steps:
      1. Run: cat .github/workflows/ci.yml
      2. Assert: workflow has correct trigger (push + pull_request)
      3. Assert: workflow has all 4 steps (lint, type-check, test, build)
      4. Assert: uses Node.js 20.x
    Expected Result: CI workflow file is properly configured
    Evidence: .sisyphus/evidence/task-9-ci-workflow.txt

  Scenario: CI steps run locally in sequence
    Tool: Bash
    Steps:
      1. Run: npm ci
      2. Run: npm run lint
      3. Run: npm run type-check
      4. Run: npm run test
      5. Run: npm run build
      6. Assert: all steps complete with exit code 0
    Expected Result: All CI steps pass locally
    Evidence: .sisyphus/evidence/task-9-ci-steps-local.txt
  ```

  **Commit**: YES
  - Message: `ci: add GitHub Actions workflow for lint, type-check, test, build`
  - Pre-commit: `npm run lint && npm run type-check && npm run test && npm run build`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + linter + `npm run test`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names (data/result/item/temp).
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill if UI)
  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration (features working together, not isolation). Test edge cases: empty state, invalid input, rapid actions. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination: Task N touching Task M's files. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **Wave 1 (T1-T4)**: `docs(harness): create AGENTS.md, docs/, validation, logger, e2e infrastructure`
  - Files: `AGENTS.md`, `docs/**`, `src/validation/**`, `src/utils/logger.ts`, `src/utils/validateApiResponse.ts`, `e2e/**`
  - Pre-commit: `npm run type-check`

- **Wave 2 (T5)**: `refactor(store): split stockStore into list, api, and UI stores`
  - Files: `src/stores/stockListStore.ts`, `src/stores/stockApiStore.ts`, `src/stores/stockUIStore.ts`, all component imports
  - Pre-commit: `npm run test && npm run type-check`

- **Wave 2 (T6-T7)**: `feat(ui): add ESLint, dependency checker, ErrorBoundary component`
  - Files: `eslint.config.js`, `scripts/check-deps.ts`, `src/components/ErrorBoundary.vue`, `src/App.vue`
  - Pre-commit: `npm run lint && npm run build`

- **Wave 3 (T8)**: `feat(api): add retry/backoff with exponential backoff and jitter`
  - Files: `src/utils/retry.ts`, all API client files
  - Pre-commit: `npm run test`

- **Wave 3 (T9)**: `ci: add GitHub Actions workflow for lint, type-check, test, build`
  - Files: `.github/workflows/ci.yml`
  - Pre-commit: `npm run lint && npm run type-check && npm run test && npm run build`

---

## Success Criteria

### Verification Commands
```bash
npm run type-check  # Expected: 0 errors
npm run lint        # Expected: 0 errors
npm run test        # Expected: all tests pass
npm run build       # Expected: successful build
grep -rn "console\." src/ --include="*.ts" --include="*.vue"  # Expected: 0 matches
```

### Final Checklist
- [ ] All "Must Have" present (AGENTS.md, Zod validation, structured logger, 3 stores, ErrorBoundary, retry, CI)
- [ ] All "Must NOT Have" absent (no external services, no behavior changes, no type changes, no per-component boundaries)
- [ ] All tests pass
- [ ] Zero console.* in source
- [ ] CI workflow runs green
