# Quick Filter Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the Stats Bar clickable to enable quick filtering by valuation and market type.

**Architecture:** Add `activeFilters` state to `stockUIStore`, transform Stats Bar items into toggle buttons, and extend `filteredStocks` computed property in `HomeView.vue` to apply filter conditions with AND logic.

**Tech Stack:** Vue 3.5 Composition API, Pinia 3.0, TypeScript 5.9, Vitest

**Design Doc:** `docs/plans/2026-04-20-quick-filter-design.md`

---

### Task 1: Add Filter State to stockUIStore

**Files:**
- Modify: `src/stores/stockUIStore.ts`
- Test: `src/stores/__tests__/stockUIStore.spec.ts` (create new)

**Step 1: Write the failing test**

Create `src/stores/__tests__/stockUIStore.spec.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useStockUIStore } from '../stockUIStore'

describe('stockUIStore - Filters', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('activeFilters', () => {
    it('should initialize with empty Set', () => {
      const store = useStockUIStore()
      expect(store.activeFilters).toBeInstanceOf(Set)
      expect(store.activeFilters.size).toBe(0)
    })

    it('should toggle filter on and off', () => {
      const store = useStockUIStore()
      
      store.toggleFilter('undervalued')
      expect(store.activeFilters.has('undervalued')).toBe(true)
      expect(store.activeFilters.size).toBe(1)
      
      store.toggleFilter('undervalued')
      expect(store.activeFilters.has('undervalued')).toBe(false)
      expect(store.activeFilters.size).toBe(0)
    })

    it('should support multiple active filters', () => {
      const store = useStockUIStore()
      
      store.toggleFilter('undervalued')
      store.toggleFilter('hk')
      
      expect(store.activeFilters.size).toBe(2)
      expect(store.activeFilters.has('undervalued')).toBe(true)
      expect(store.activeFilters.has('hk')).toBe(true)
    })

    it('should clear all filters', () => {
      const store = useStockUIStore()
      
      store.toggleFilter('undervalued')
      store.toggleFilter('hk')
      store.clearFilters()
      
      expect(store.activeFilters.size).toBe(0)
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/stores/__tests__/stockUIStore.spec.ts`
Expected: FAIL with "toggleFilter is not a function" or "activeFilters is undefined"

**Step 3: Write minimal implementation**

Modify `src/stores/stockUIStore.ts`:

```ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ApiTestResult, StockSearchResult } from '@/types/stock'

export const useStockUIStore = defineStore('stockUI', () => {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const apiTestResults = ref<ApiTestResult[]>([])
  const isApiAvailable = ref(true)
  const searchResults = ref<StockSearchResult[]>([])
  const isSearching = ref(false)
  const updateProgress = ref({ updated: 0, total: 0 })
  const isUpdatingAllStocks = ref(false)
  const currentlyUpdatingIds = ref<Set<string>>(new Set())
  
  // Quick filter state
  const activeFilters = ref<Set<string>>(new Set())

  function clearError() {
    error.value = null
  }

  function clearSearchResults() {
    searchResults.value = []
  }
  
  function toggleFilter(key: string) {
    if (activeFilters.value.has(key)) {
      activeFilters.value.delete(key)
    } else {
      activeFilters.value.add(key)
    }
  }
  
  function clearFilters() {
    activeFilters.value.clear()
  }

  return {
    loading,
    error,
    apiTestResults,
    isApiAvailable,
    searchResults,
    isSearching,
    updateProgress,
    isUpdatingAllStocks,
    currentlyUpdatingIds,
    activeFilters,
    clearError,
    clearSearchResults,
    toggleFilter,
    clearFilters
  }
})
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/stores/__tests__/stockUIStore.spec.ts`
Expected: All 4 tests pass

**Step 5: Run type check**

Run: `npm run type-check`
Expected: No errors

**Step 6: Commit**

```bash
git add src/stores/stockUIStore.ts src/stores/__tests__/stockUIStore.spec.ts
git commit -m "feat: add quick filter state to stockUIStore"
```

---

### Task 2: Transform Stats Bar into Clickable Buttons

**Files:**
- Modify: `src/views/HomeView.vue` (lines 28-47 for template, CSS section for styles)

**Step 1: Update template - Stats Bar items become buttons**

Replace lines 28-47 in `src/views/HomeView.vue`:

```vue
<!-- Stats Bar -->
<div class="stats-bar">
  <button class="stat-item stat-button" @click="goToAdd">
    <span class="stat-value font-mono-nums">{{ stockStore.stockCount }}</span>
    <span class="stat-label">只股票</span>
  </button>
  <button 
    class="stat-item stat-button"
    :class="{ active: uiStore.activeFilters.has('undervalued') }"
    @click="uiStore.toggleFilter('undervalued')"
  >
    <span class="stat-value font-mono-nums val-low">{{ lowValCount }}</span>
    <span class="stat-label">低估值</span>
  </button>
  <div class="stat-divider"></div>
  <button 
    class="stat-item stat-button"
    :class="{ active: uiStore.activeFilters.has('hk') }"
    @click="uiStore.toggleFilter('hk')"
  >
    <span class="stat-value font-mono-nums">{{ hkCount }}</span>
    <span class="stat-label">港股</span>
  </button>
  <button 
    class="stat-item stat-button"
    :class="{ active: uiStore.activeFilters.has('a') }"
    @click="uiStore.toggleFilter('a')"
  >
    <span class="stat-value font-mono-nums">{{ ashareCount }}</span>
    <span class="stat-label">A股</span>
  </button>
</div>
```

**Step 2: Import stockUIStore in script section**

Modify the script section (around line 126):

```ts
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useStockStore } from '@/stores/stockStore'
import { useStockUIStore } from '@/stores/stockUIStore'
import type { StockData } from '@/types/stock'
import ApiTester from '@/components/ApiTester.vue'
import StockCard from '@/components/StockCard.vue'
import StockTable from '@/components/StockTable.vue'
import ViewToggle from '@/components/ViewToggle.vue'

const router = useRouter()
const stockStore = useStockStore()
const uiStore = useStockUIStore()
```

**Step 3: Add CSS for clickable Stats Bar buttons**

Add to the `<style scoped>` section (after `.stat-divider` rules):

```css
.stat-button {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font-family: inherit;
  border-radius: var(--radius-lg, 8px);
  transition: background-color var(--transition-fast), color var(--transition-fast);
}

.stat-button:hover {
  background-color: var(--bg-tertiary);
}

.stat-button.active {
  background-color: var(--brand-primary);
  color: white;
}

.stat-button.active .stat-label {
  color: rgba(255, 255, 255, 0.85);
}

.stat-button.active .stat-value {
  color: white;
}

.stat-button.active:hover {
  background-color: var(--brand-primary-hover);
}
```

**Step 4: Run type check**

Run: `npm run type-check`
Expected: No errors

**Step 5: Run lint**

Run: `npm run lint`
Expected: No errors

**Step 6: Commit**

```bash
git add src/views/HomeView.vue
git commit -m "feat: make Stats Bar clickable for quick filtering"
```

---

### Task 3: Implement Filter Logic in filteredStocks

**Files:**
- Modify: `src/views/HomeView.vue` (lines 149-158 for filteredStocks computed)

**Step 1: Write the failing test**

Add to existing test file or create `src/views/__tests__/HomeView.spec.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ref, computed } from 'vue'
import type { StockData } from '@/types/stock'

// Mock stock data for testing
const mockStocks: StockData[] = [
  {
    id: '1',
    name: '腾讯',
    code: '00700',
    market: 'HK',
    marketCap: 3000,
    netCash: 100,
    freeCashFlow: 200,
    netProfit: 150,
    valuation1: 8,
    valuation2: 10,
    yearlyData: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    baseCurrency: 'HKD',
    currentRatio: null,
    peRatio: null,
    totalShares: null,
    targetPriceConfig: null
  },
  {
    id: '2',
    name: '茅台',
    code: '600519',
    market: 'A',
    marketCap: 2000,
    netCash: 50,
    freeCashFlow: 100,
    netProfit: 80,
    valuation1: 15,
    valuation2: 12,
    yearlyData: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    baseCurrency: 'CNY',
    currentRatio: null,
    peRatio: null,
    totalShares: null,
    targetPriceConfig: null
  },
  {
    id: '3',
    name: '美团',
    code: '03690',
    market: 'HK',
    marketCap: 1500,
    netCash: 80,
    freeCashFlow: 120,
    netProfit: 60,
    valuation1: 5,
    valuation2: 8,
    yearlyData: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    baseCurrency: 'HKD',
    currentRatio: null,
    peRatio: null,
    totalShares: null,
    targetPriceConfig: null
  }
]

describe('HomeView - Filter Logic', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should filter by undervalued (valuation1 < 10)', () => {
    const uiStore = useStockUIStore()
    uiStore.toggleFilter('undervalued')
    
    // Should return 腾讯 (8) and 美团 (5), not 茅台 (15)
    const result = mockStocks.filter(s => s.valuation1 !== null && s.valuation1 < 10)
    expect(result).toHaveLength(2)
    expect(result.map(s => s.code)).toContain('00700')
    expect(result.map(s => s.code)).toContain('03690')
  })

  it('should filter by HK market', () => {
    const result = mockStocks.filter(s => s.market === 'HK')
    expect(result).toHaveLength(2)
    expect(result.map(s => s.code)).toContain('00700')
    expect(result.map(s => s.code)).toContain('03690')
  })

  it('should filter by A-share market', () => {
    const result = mockStocks.filter(s => s.market === 'A')
    expect(result).toHaveLength(1)
    expect(result[0].code).toBe('600519')
  })

  it('should combine filters with AND logic', () => {
    // HK + undervalued should only return 腾讯 and 美团 (both HK and valuation1 < 10)
    let result = mockStocks.filter(s => s.market === 'HK')
    result = result.filter(s => s.valuation1 !== null && s.valuation1 < 10)
    
    expect(result).toHaveLength(2)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/views/__tests__/HomeView.spec.ts`
Expected: Tests pass (logic tests) or fail if HomeView not yet updated

**Step 3: Implement filter logic in filteredStocks**

Replace the `filteredStocks` computed property (lines 149-158):

```ts
const filteredStocks = computed(() => {
  let result = stockStore.sortedStocks
  
  // Text search filter
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(stock =>
      stock.name.toLowerCase().includes(query) ||
      stock.code.toLowerCase().includes(query)
    )
  }
  
  // Quick filters (AND logic)
  if (uiStore.activeFilters.size > 0) {
    result = result.filter(stock => {
      if (uiStore.activeFilters.has('undervalued') && 
          !(stock.valuation1 !== null && stock.valuation1 < 10)) return false
      if (uiStore.activeFilters.has('hk') && stock.market !== 'HK') return false
      if (uiStore.activeFilters.has('a') && stock.market !== 'A') return false
      return true
    })
  }
  
  return result
})
```

**Step 4: Update no-results message**

Modify line 99-101 to show more contextual message:

```vue
<div v-if="filteredStocks.length === 0" class="no-results">
  <p v-if="searchQuery || uiStore.activeFilters.size > 0">
    没有找到符合条件的股票
  </p>
  <p v-else>
    没有找到匹配的股票
  </p>
</div>
```

**Step 5: Run type check**

Run: `npm run type-check`
Expected: No errors

**Step 6: Run all tests**

Run: `npm run test`
Expected: All tests pass

**Step 7: Run lint**

Run: `npm run lint`
Expected: No errors

**Step 8: Commit**

```bash
git add src/views/HomeView.vue src/views/__tests__/HomeView.spec.ts
git commit -m "feat: implement quick filter logic in filteredStocks"
```

---

### Task 4: Mobile Responsive Adjustments

**Files:**
- Modify: `src/views/HomeView.vue` (responsive CSS section, lines 488-522)

**Step 1: Add mobile responsive CSS for Stats Bar**

Add to the `@media (max-width: 768px)` section:

```css
@media (max-width: 768px) {
  /* ... existing rules ... */
  
  .stats-bar {
    padding: 12px 16px 0;
    gap: 12px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  
  .stats-bar::-webkit-scrollbar {
    display: none;
  }
  
  .stat-item {
    flex-shrink: 0;
  }
  
  .stat-button {
    padding: 4px 8px;
  }
}
```

**Step 2: Run type check and lint**

Run: `npm run type-check && npm run lint`
Expected: No errors

**Step 3: Run build**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/views/HomeView.vue
git commit -m "style: add mobile responsive styles for quick filter buttons"
```

---

### Task 5: Final Verification

**Step 1: Run full test suite**

Run: `npm run test`
Expected: All tests pass

**Step 2: Run type check**

Run: `npm run type-check`
Expected: No errors

**Step 3: Run build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 4: Run lint**

Run: `npm run lint`
Expected: No errors

**Step 5: Final commit (if needed)**

```bash
git status
git add .
git commit -m "chore: final verification and cleanup"
```

---

## Summary

| Task | Files Changed | Estimated Time |
|------|--------------|----------------|
| 1. Filter State | `stockUIStore.ts`, `stockUIStore.spec.ts` | 10 min |
| 2. Stats Bar Buttons | `HomeView.vue` (template + CSS) | 15 min |
| 3. Filter Logic | `HomeView.vue` (script), `HomeView.spec.ts` | 15 min |
| 4. Mobile Responsive | `HomeView.vue` (CSS) | 5 min |
| 5. Verification | All tests, build, lint | 5 min |

**Total: ~50 minutes, 5 commits**
