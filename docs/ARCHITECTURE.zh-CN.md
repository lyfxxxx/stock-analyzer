# 架构文档 - 股票分析器

## 领域地图

```
┌─────────────────────────────────────────────────────────┐
│                     视图层（UI Layer）                    │
│  HomeView  │  AddStockView  │  StockDetailView           │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│                   组件层（可复用组件）                     │
│  StockCard  │  ValuationChart  │  ExcelUploader          │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│              状态管理层（Pinia Stores）                    │
│  stockListStore  │  stockApiStore  │  stockUIStore       │
└──────┬───────────────────┬──────────────────┬────────────┘
       │                   │                  │
┌──────▼──────┐   ┌────────▼────────┐  ┌──────▼──────┐
│   数据库层   │   │   API 层        │  │  工具层     │
│  IndexedDB  │   │  东方财富 API    │  │ 计算器      │
│  (股票数据)  │   │  汇率 API       │  │ 验证器      │
│             │   │  财报 API       │  │ 日志器      │
└─────────────┘   └─────────────────┘  └─────────────┘
```

## 依赖方向（强制执行）

```
Views → Components → Stores → API/Utils/DB
                           → Types（始终允许）
```

### 允许的依赖关系
| 从 | 可导入 |
|------|----------------|
| 视图（Views） | 组件、Store、类型 |
| 组件（Components） | 其他组件、Store、类型、工具 |
| Store | API、工具、数据库、类型 |
| API | 工具、类型 |
| 工具（Utils） | 仅类型 |
| 数据库（DB） | 仅类型 |

### 禁止的依赖关系
| 从 | 不可导入 |
|------|-------------------|
| 工具（Utils） | Store、API、视图、组件 |
| 数据库（DB） | Store、API、视图、组件 |
| API | Store、视图、组件 |
| Store | 其他 Store（禁止跨 Store） |
| 视图（Views） | 直接导入 API（必须通过 Store） |

## 包层级结构

```
src/
├── types/              # TypeScript 类型（无依赖）
├── validation/         # Zod 模式（依赖 types）
├── utils/              # 纯函数（依赖 types）
├── db/                 # IndexedDB 层（依赖 types）
├── api/                # 外部 API 客户端（依赖 utils、types）
├── stores/             # Pinia Store（依赖 api、db、utils、types）
├── composables/        # Vue 组合函数（依赖 api、utils、types）
├── components/         # Vue 组件（依赖 stores、utils、types）
├── views/              # 路由级视图（依赖 components、stores、types）
├── router/             # Vue Router 配置（依赖 views、types）
└── App.vue / main.ts   # 应用入口（依赖所有模块）
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

## 数据流

```
用户操作 → 视图 → Store 操作 → API 调用 → 响应验证 → Store 状态 → 视图更新
                                    ↓
                              IndexedDB（持久化）
                                    ↓
                              Store 状态（响应式）
```

## 关键设计决策

1. **仅使用 Composition API** - 不使用 Options API，所有组件使用 `<script setup lang="ts">`
2. **单一数据源** - IndexedDB 是持久存储；Pinia 是响应式缓存
3. **API 边界验证** - 所有外部 API 响应使用 Zod 模式验证
4. **结构化日志** - 禁止 console.log；使用 `src/utils/logger.ts` 分级日志（debug/info/warn/error）
5. **限流** - 所有东方财富 API 调用通过 `financialReportRateLimiter`（500ms 间隔）
6. **货币标准化** - 所有值以 亿元 为单位，港币为基准货币
