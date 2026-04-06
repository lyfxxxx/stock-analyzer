# 数据流与 API 契约

## 数据流架构

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│   用户       │────▶│   视图        │────▶│   Store      │────▶│   API 客户端   │
│   操作       │     │   (UI)       │     │   (状态)     │     │   (外部)      │
└─────────────┘     └──────────────┘     └─────────────┘     └──────────────┘
                           │                     │                     │
                           │                     ▼                     ▼
                           │              ┌─────────────┐     ┌──────────────┐
                           │              │  IndexedDB  │◀────│   响应验证     │
                           │              │  (持久化)    │     │              │
                           │              └─────────────┘     └──────────────┘
                           │                     │
                           ▼                     ▼
                     ┌──────────────┐     ┌─────────────┐
                     │   响应式      │◀────│   Store      │
                     │   更新        │     │   状态       │
                     └──────────────┘     └─────────────┘
```

## API 契约

### 东方财富股票信息 API
- **接口地址**: `https://push2.eastmoney.com/api/qt/stock/get`
- **请求方式**: GET
- **参数**: `secid`、`fields=f57,f58,f116`
- **响应格式**:
```json
{
  "data": {
    "f57": "00700",
    "f58": "腾讯控股",
    "f116": 3500000000000
  }
}
```

### 东方财富财报 API（A 股）
- **接口地址**: `https://datacenter.eastmoney.com/securities/api/data/get`
- **请求方式**: GET
- **参数**: `type`、`sty`、`filter`、`p`、`ps`、`sr`、`st`、`source`、`client`
- **响应格式**:
```json
{
  "success": true,
  "result": {
    "pages": 1,
    "data": [/* 报表条目 */],
    "count": 30
  }
}
```

### 东方财富财报 API（港股）
- **接口地址**: `https://datacenter.eastmoney.com/securities/api/data/v1/get`
- **请求方式**: GET
- **参数**: `reportName`、`columns`、`filter`、`pageNumber`、`pageSize`、`sortTypes`、`sortColumns`、`source`、`client`

### 汇率 API
- **接口地址**: `https://open.er-api.com/v6/latest/HKD`
- **请求方式**: GET
- **响应格式**:
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

## Store 架构

### stockListStore（股票列表 Store）
- **职责**: 股票 CRUD + IndexedDB 持久化
- **状态**: `stocks`、`sortedStocks`、`stockCount`
- **操作**: `loadStocks`、`addStock`、`deleteStock`、`getStockById`、`updateStock`、`recalculateStock`

### stockApiStore（股票 API Store）
- **职责**: 外部 API 调用 + 财务计算
- **状态**: `isApiAvailable`、`apiTestResults`
- **操作**: `testAPIs`、`fetchStockInfo`、`fetchFinancialReport`、`updateStockMarketCap`、`updateStockWithRecalculation`、`updateAllStocks`、`searchStocks`

### stockUIStore（UI 状态 Store）
- **职责**: UI 状态管理
- **状态**: `loading`、`error`、`searchResults`、`isSearching`、`updateProgress`、`isUpdatingAllStocks`、`currentlyUpdatingIds`
- **操作**: `clearError`、`clearSearchResults`

## 验证层

所有 API 响应在边界处使用 Zod 模式验证：

```typescript
// 验证流程示例
const response = await fetch(url)
const data = await response.json()
const validated = apiResponseSchema.parse(data)  // 无效时抛出异常
return validated
```

## 日志

所有日志使用结构化日志器：

```typescript
import { logger } from '@/utils/logger'

logger.debug('模块名', '消息', { 上下文 })
logger.info('模块名', '消息')
logger.warn('模块名', '消息')
logger.error('模块名', '消息', { error })
```

源代码中禁止使用 `console.log`、`console.error`、`console.warn`。
