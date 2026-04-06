# Architecture - Stock Analyzer

## Domain Map

```
┌─────────────────────────────────────────────────────────┐
│                     Views (UI Layer)                     │
│  HomeView  │  AddStockView  │  StockDetailView           │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│                   Components (Reusable)                   │
│  StockCard  │  ValuationChart  │  ExcelUploader          │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│              Stores (State Management - Pinia)            │
│  stockListStore  │  stockApiStore  │  stockUIStore       │
└──────┬───────────────────┬──────────────────┬────────────┘
       │                   │                  │
┌──────▼──────┐   ┌────────▼────────┐  ┌──────▼──────┐
│     DB      │   │     API         │  │    Utils    │
│  IndexedDB  │   │  East Money     │  │ Calculator  │
│  (stocks)   │   │  Exchange Rate  │  │ Validator   │
│             │   │  Financial Rpt  │  │ Logger      │
└─────────────┘   └─────────────────┘  └─────────────┘
```

## Dependency Directions (ENFORCED)

```
Views → Components → Stores → API/Utils/DB
                          → Types (always allowed)
```

### Allowed Dependencies
| From | Can Import From |
|------|----------------|
| Views | Components, Stores, Types |
| Components | Other Components, Stores, Types, Utils |
| Stores | API, Utils, DB, Types |
| API | Utils, Types |
| Utils | Types only |
| DB | Types only |

### Forbidden Dependencies
| From | Cannot Import From |
|------|-------------------|
| Utils | Stores, API, Views, Components |
| DB | Stores, API, Views, Components |
| API | Stores, Views, Components |
| Stores | Other Stores (no cross-store) |
| Views | API directly (must go through stores) |

## Package Hierarchy

```
src/
├── types/              # TypeScript types (no dependencies)
├── validation/         # Zod schemas (depends on types)
├── utils/              # Pure functions (depends on types)
├── db/                 # IndexedDB layer (depends on types)
├── api/                # External API clients (depends on utils, types)
├── stores/             # Pinia stores (depends on api, db, utils, types)
├── composables/        # Vue composition functions (depends on api, utils, types)
├── components/         # Vue components (depends on stores, utils, types)
├── views/              # Route-level views (depends on components, stores, types)
├── router/             # Vue Router config (depends on views, types)
└── App.vue / main.ts   # App entry (depends on everything)
```

## Store Architecture

### stockListStore
- **Responsibility**: Stock CRUD + IndexedDB persistence
- **State**: `stocks`, `sortedStocks`, `stockCount`
- **Actions**: `loadStocks`, `addStock`, `deleteStock`, `getStockById`, `updateStock`, `recalculateStock`

### stockApiStore
- **Responsibility**: External API calls + financial calculations
- **State**: `isApiAvailable`, `apiTestResults`
- **Actions**: `testAPIs`, `fetchStockInfo`, `fetchFinancialReport`, `updateStockMarketCap`, `updateStockWithRecalculation`, `updateAllStocks`, `searchStocks`

### stockUIStore
- **Responsibility**: UI state management
- **State**: `loading`, `error`, `searchResults`, `isSearching`, `updateProgress`, `isUpdatingAllStocks`, `currentlyUpdatingIds`
- **Actions**: `clearError`, `clearSearchResults`

## Data Flow

```
User Action → View → Store Action → API Call → Response Validation → Store State → View Update
                                    ↓
                              IndexedDB (persist)
                                    ↓
                              Store State (reactive)
```

## Key Design Decisions

1. **Composition API only** - No Options API, all components use `<script setup lang="ts">`
2. **Single source of truth** - IndexedDB is the persistent store; Pinia is the reactive cache
3. **API boundary validation** - All external API responses validated with Zod schemas
4. **Structured logging** - No console.log; use `src/utils/logger.ts` with levels (debug/info/warn/error)
5. **Rate limiting** - All East Money API calls go through `financialReportRateLimiter` (500ms interval)
6. **Currency normalization** - All values in 亿元 (hundred million yuan), HKD as base currency
