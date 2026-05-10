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
                           │              │  IndexedDB  │◀────│  Zod 响应验证  │
                           │              │  (持久化)    │     │              │
                           │              └─────────────┘     └──────────────┘
                           │                     │
                           ▼                     ▼
                     ┌──────────────┐     ┌─────────────┐
                     │   响应式      │◀────│   Store      │
                     │   更新        │     │   状态       │
                     └──────────────┘     └─────────────┘
```

## 数据获取流程

### 添加股票完整流程

```
用户输入代码 + 选择市场
        │
        ▼
fetchStockInfo() ──▶ 东方财富 API ──▶ 股票名称、市值、PB、总股本
        │
        ▼
fetchFinancialReport() ──▶ 东方财富 财报 API ──▶ 三年财报数据
        │                      │（港股失败）
        │                      ▼
        │              腾讯财经 API（备用）
        │
        ├──▶ 并行获取 A 股财务指标 API ──▶ ROE、ROA、PB、分红率
        │    或 港股财务指标 API
        │
        ▼
calculateNetCash()、calculateFreeCashFlow()、calculateValuations()
calculateCurrentRatio()、calculatePERatio()
calculateAllPRR() ──▶ 基础PR、修正PR、周期PR、指标PR、衍生PR
        │
        ▼
用户预览 → 确认保存 ──▶ stockListStore.addStock() ──▶ IndexedDB
```

## API 契约

### 东方财富股票信息 API
- **接口地址**: `https://push2.eastmoney.com/api/qt/stock/get`
- **请求方式**: GET
- **参数**: `secid`（港股 `116.{code}`，A 股 `0.{code}` 或 `1.{code}`）、`fields=f57,f58,f116,f117`
- **响应格式**:
```json
{
  "data": {
    "f57": "00700",
    "f58": "腾讯控股",
    "f116": 3500000000000,
    "f117": 0.12
  }
}
```
- `f116`: 总市值，`f117`: PB 比率

### 东方财富总股本 API
- **接口地址**: `https://push2.eastmoney.com/api/qt/stock/get`
- **请求方式**: GET
- **参数**: `fields=f38`
- 返回 `f38`: 总股本（股）

### 东方财富股票搜索 API
- **接口地址**: `https://searchapi.eastmoney.com/api/suggest/get`
- **请求方式**: GET
- **参数**: `input`（搜索关键词）、`type=14`、`token=D43BF722C8E33BDC906FB84D85E326E8`

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

### 东方财富财务指标 API（A 股）
- **接口地址**: `https://datacenter.eastmoney.com/api/data/v1/get`
- **返回**: ROE、ROA、PB、分红率等指标

### 东方财富财务指标 API（港股）
- **接口地址**: `https://datacenter.eastmoney.com/api/data/get`
- **返回**: ROE、ROA、PB、分红率等指标

### 腾讯财经 API（港股备用）
- **接口地址**: `https://proxy.finance.qq.com/ifzqgtimg/stock`
- **请求方式**: GET
- 作为港股东方财富数据获取失败时的备用数据源
- 提供现金流量表数据

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
- **备用汇率**: USD: 7.75, CNY: 1.10
- **缓存策略**: localStorage 保存 24 小时

## Store 架构

### stockListStore（股票列表 Store）
- **文件**: `src/stores/stockListStore.ts`
- **职责**: 股票 CRUD + IndexedDB 持久化 + 目标价配置
- **状态**: `stocks`、`sortedStocks`、`stockCount`
- **操作**: `loadStocks`、`addStock`、`deleteStock`、`getStockById`、`updateStock`、`recalculateStock`、`updateTargetPriceConfig`、`updatePrrTargetPriceConfig`、`updatePrrFormula`、`updateTotalShares`、`getTargetPrice`、`resetTargetPriceConfig`

### stockApiStore（股票 API Store）
- **文件**: `src/stores/stockApiStore.ts`
- **职责**: 外部 API 调用 + 财务计算 + PRR 计算 + 财务指标获取
- **操作**: `testAPIs`、`fetchStockInfo`、`fetchFinancialReport`、`updateStockMarketCap`、`updateStockWithRecalculation`、`updateAllStocks`、`searchStocks`

### stockUIStore（UI 状态 Store）
- **文件**: `src/stores/stockUIStore.ts`
- **职责**: UI 状态管理（加载、错误、搜索、进度）
- **状态**: `loading`、`error`、`apiTestResults`、`isApiAvailable`、`searchResults`、`isSearching`、`updateProgress`、`isUpdatingAllStocks`、`currentlyUpdatingIds`
- **操作**: `clearError`、`clearSearchResults`

### stockStore（兼容门面）
- **文件**: `src/stores/stockStore.ts`
- **职责**: 向后兼容的组合门面，聚合以上 3 个 Store 的所有状态和操作
- **建议**: 新代码直接使用领域 Store

## 财务计算模块

### 传统计算（`src/utils/calculator.ts`）

| 函数 | 公式 | 说明 |
|------|------|------|
| `calculateNetCash` | 货币资金 − 有息负债 | 净现金 |
| `calculateFreeCashFlow` | 经营现金流 − 资本支出 | 自由现金流 |
| `calculateValuations` | (市值−净现金)/FCF 或 净利润 | 估值比率 |
| `calculateCurrentRatio` | 流动资产/流动负债 | 流动比率 |
| `calculatePERatio` | 市值/净利润 | 市盈率 |

### PRR 计算（`src/utils/prr-calculator.ts`）

| 函数 | 公式 | 说明 |
|------|------|------|
| `calculateBasePRR` | PE / ROE | 基础市赚率 |
| `calculateAdjustedPRR` | N × PE / ROE | 修正市赚率（N=50%/分红率） |
| `calculateCyclePRR` | PE / 加权ROE | 周期市赚率 |
| `calculateIndexPRR` | PE / (ROE×ROA)^0.5 | 指标市赚率 |
| `calculateDerivedPRR` | PE×PB / (ROE×分红率) | 衍生市赚率 |

### 目标价计算

| 模块 | 文件 | 说明 |
|------|------|------|
| 传统目标价 | `src/utils/targetPriceCalculator.ts` | 基于估值倍数的目标价 |
| PRR 目标价 | `src/utils/prr-target-price.ts` | 基于市赚率的目标价 |

## 验证层

所有 API 响应在边界处使用 Zod Schema 验证：

```typescript
// validation/apiSchemas.ts - API 响应验证
import { z } from 'zod'

export const eastMoneyStockInfoSchema = z.object({
  data: z.object({
    f57: z.string(),
    f58: z.string(),
    f116: z.number(),
  }),
})
```

```typescript
// validation/stockSchemas.ts - 股票数据验证
import { z } from 'zod'

export const stockDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  market: z.enum(['HK', 'A']),
  // ...
})
```

## 限流与重试

### 限流器（`src/utils/rateLimiter.ts`）
- 东方财富 API：每 500ms 最多 1 个请求
- 使用队列机制保证有序执行

### 重试机制（`src/utils/retry.ts`）
- 失败自动重试
- 港股财报失败时自动切换腾讯财经备用数据源
- 汇率 API 失败时使用预设的备用汇率

## 日志规范

所有日志使用结构化日志器，**禁止 `console.log`**：

```typescript
import { logger } from '@/utils/logger'

logger.debug('模块名', '消息', { 上下文 })
logger.info('模块名', '消息')
logger.warn('模块名', '消息')
logger.error('模块名', '消息', { error })
```
