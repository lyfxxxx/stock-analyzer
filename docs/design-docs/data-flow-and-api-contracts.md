# Data Flow & API Contracts

## Data Flow Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│   User       │────▶│   View       │────▶│   Store      │────▶│   API Client  │
│   Action     │     │   (UI)       │     │   (State)    │     │   (External)  │
└─────────────┘     └──────────────┘     └─────────────┘     └──────────────┘
                           │                     │                     │
                           │                     ▼                     ▼
                           │              ┌─────────────┐     ┌──────────────┐
                           │              │   IndexedDB  │◀────│   Response    │
                           │              │   (Persist)  │     │   Validation  │
                           │              └─────────────┘     └──────────────┘
                           │                     │
                           ▼                     ▼
                     ┌──────────────┐     ┌─────────────┐
                     │   Reactive   │◀────│   Store      │
                     │   Update     │     │   State      │
                     └──────────────┘     └─────────────┘
```

## API Contracts

### East Money Stock Info API
- **Endpoint**: `https://push2.eastmoney.com/api/qt/stock/get`
- **Method**: GET
- **Parameters**: `secid`, `fields=f57,f58,f116`
- **Response Shape**:
```json
{
  "data": {
    "f57": "00700",
    "f58": "Tencent Holdings",
    "f116": 3500000000000
  }
}
```

### East Money Financial Report API (A-Shares)
- **Endpoint**: `https://datacenter.eastmoney.com/securities/api/data/get`
- **Method**: GET
- **Parameters**: `type`, `sty`, `filter`, `p`, `ps`, `sr`, `st`, `source`, `client`
- **Response Shape**:
```json
{
  "success": true,
  "result": {
    "pages": 1,
    "data": [/* report items */],
    "count": 30
  }
}
```

### East Money Financial Report API (HK Stocks)
- **Endpoint**: `https://datacenter.eastmoney.com/securities/api/data/v1/get`
- **Method**: GET
- **Parameters**: `reportName`, `columns`, `filter`, `pageNumber`, `pageSize`, `sortTypes`, `sortColumns`, `source`, `client`

### Exchange Rate API
- **Endpoint**: `https://open.er-api.com/v6/latest/HKD`
- **Method**: GET
- **Response Shape**:
```json
{
  "result": "success",
  "rates": {
    "USD": 0.129,
    "CNY": 0.909,
    "HKD": 1.0
  }
}
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

## Validation Layer

All API responses are validated with Zod schemas at the boundary:

```typescript
// Example validation flow
const response = await fetch(url)
const data = await response.json()
const validated = apiResponseSchema.parse(data)  // Throws if invalid
return validated
```

## Logging

All logging uses the structured logger:

```typescript
import { logger } from '@/utils/logger'

logger.debug('module', 'message', { context })
logger.info('module', 'message')
logger.warn('module', 'message')
logger.error('module', 'message', { error })
```

No `console.log`, `console.error`, `console.warn` allowed in source code.
