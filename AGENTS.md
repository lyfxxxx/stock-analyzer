# AGENTS.md - Stock Analyzer Development Guide

This file provides context for AI agents working on the Stock Analyzer project.

---

## Project Overview

**Stock Analyzer** is a Vue 3 + TypeScript web application for stock valuation. It supports both Hong Kong stocks (HK) and A-shares, with dual data input modes (API and Excel upload).

### Tech Stack
- **Frontend**: Vue 3.5 (Composition API) + TypeScript 5.9
- **Build Tool**: Vite 7.3
- **State Management**: Pinia 3.0
- **Database**: IndexedDB (via `idb` wrapper)
- **Charts**: ECharts 6.0
- **Testing**: Vitest 4.0 + Playwright 1.58
- **Styling**: CSS Variables + Scoped CSS

---

## Build & Test Commands

### Development
```bash
npm run dev              # Start Vite dev server (port 5173)
```

### Building
```bash
npm run build           # Full build with type checking
npm run build-only      # Build without type checking
npm run type-check      # Run TypeScript compiler only
npm run preview         # Preview production build
```

### Testing
```bash
npm run test            # Run all unit tests once
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Generate coverage report
npm run test:e2e        # Run Playwright e2e tests
npm run test:e2e:ui     # Run Playwright with UI
```

### Running a Single Test
```bash
# Using vitest directly with file path
npx vitest run src/utils/__tests__/calculator.spec.ts
npx vitest run src/api/__tests__/financialReport.spec.ts
npx vitest run src/stores/__tests__/stockStore.spec.ts
```

---

## Code Style Guidelines

### General Principles
- Follow existing patterns in the codebase
- Keep functions small and focused
- Add JSDoc comments for complex functions
- Use meaningful variable names (English)

### Vue Components
- Use **Composition API** with `<script setup>` syntax
- Define props with `defineProps<{...}>()`
- Define emits with `defineEmits<{ (e: 'event', ...): void }>()`
- Use scoped styles (`<style scoped>`)
- Reference CSS variables from `src/assets/base.css`

### TypeScript
- Enable **strict mode** (inherited from @vue/tsconfig)
- Use **absolute imports** with `@/` alias (e.g., `import { X } from '@/types/stock'`)
- Define types in `src/types/` directory
- Avoid `any` - use proper types or `unknown`
- Use interfaces for object shapes, types for unions/primitives

### Import Order
1. External libraries (vue, vue-router, pinia, etc.)
2. Internal absolute imports (`@/...`)
3. Relative imports (local modules)

```typescript
// ✅ Correct
import { ref, computed } from 'vue'
import type { StockData } from '@/types/stock'
import { calculateNetCash } from '@/utils/calculator'
import { useStockStore } from '@/stores/stockStore'

// ❌ Avoid
import { useStockStore } from '@/stores/stockStore'
import { ref } from 'vue'
import type { StockData } from '@/types/stock'
```

### Naming Conventions
- **Files**: kebab-case (`stock-card.vue`, `eastmoney.ts`)
- **Components**: PascalCase (`StockCard.vue`, `ValuationChart.vue`)
- **Types/Interfaces**: PascalCase (`StockData`, `ApiStockInfo`)
- **Functions**: camelCase (`calculateNetCash`, `fetchStockInfo`)
- **Constants**: SCREAMING_SNAKE_CASE where appropriate

### Error Handling
- Use try-catch for async operations
- Log errors with `console.error()` for debugging
- Return null/error values rather than throwing in expected error paths
- Handle API failures gracefully with user-friendly messages

```typescript
// ✅ Good
async function fetchData() {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    return await response.json()
  } catch (error) {
    console.error('Failed to fetch data:', error)
    return null
  }
}

// ❌ Avoid empty catch blocks
try { ... } catch (e) { }
```

### Testing
- Test files: `*.spec.ts` in `__tests__` directories
- Use Vitest (`describe`, `it`, `expect`)
- Follow existing test patterns (see `src/utils/__tests__/calculator.spec.ts`)
- Group tests with `describe` blocks
- Write descriptive test names

---

## Project Structure

```
src/
├── api/              # API clients (East Money, Exchange rates)
├── components/       # Vue components
├── composables/      # Composition functions
├── db/               # IndexedDB configuration
├── stores/           # Pinia stores
├── types/            # TypeScript types
├── utils/            # Utility functions
├── views/            # Page views
├── router/           # Vue Router
├── assets/           # CSS, images
├── App.vue
└── main.ts
```

### Key Paths
- Source: `src/`
- Types: `src/types/`
- Utils: `src/utils/`
- Tests: `src/**/__tests__/`

---

## Configuration

### Path Aliases
- `@/` → `src/`

### TypeScript Config
- Extends `@vue/tsconfig/tsconfig.dom.json`
- Strict mode enabled
- Vue type support via `vue-tsc`

### Vite Config
- Dev server port: 5173
- Proxy configured for East Money API search

---

## Common Development Tasks

### Adding a New API
1. Create file in `src/api/`
2. Add types to `src/types/`
3. Add tests in `src/api/__tests__/`
4. Use rate limiter for external API calls

### Adding a New Component
1. Create Vue file in `src/components/`
2. Use Composition API with `<script setup lang="ts">`
3. Define props and emits with TypeScript
4. Use scoped styles with CSS variables

### Adding a Utility Function
1. Create/extend file in `src/utils/`
2. Add TypeScript types
3. Export with JSDoc comments
4. Add tests in `src/utils/__tests__/`

### Working with IndexedDB
- Use the `idb` library wrapper
- See `src/db/index.ts` for patterns

---

## Browser Compatibility

- Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- Requires: IndexedDB, ES2020+, CSS Grid/Flexbox

---

## Notes for AI Agents

1. **No ESLint/Prettier**: Project does not have ESLint or Prettier configured
2. **Chinese Comments**: Some legacy code has Chinese comments - preserve them
3. **Currency Values**: All financial values are in 亿元 (hundred million yuan)
4. **Base Currency**: Internal calculations use HKD as base currency
5. **Rate Limiting**: Use the rate limiter (`src/utils/rateLimiter.ts`) for API calls
6. **Chinese Market Data**: East Money API may block non-Chinese IPs - handle gracefully
