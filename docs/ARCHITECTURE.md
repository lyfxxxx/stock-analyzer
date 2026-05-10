# 架构文档 - 股票分析工具

## 领域地图

```
┌──────────────────────────────────────────────────────────────────┐
│                        视图层（Views）                            │
│     HomeView  │  AddStockView  │  StockDetailView                │
└─────────────────────────┬────────────────────────────────────────┘
                          │
┌─────────────────────────▼────────────────────────────────────────┐
│                     组件层（Components）                          │
│  StockCard │ StockTable │ ValuationChart │ DividendChart         │
│  RoeChart  │ ExcelUploader │ ApiTester │ ErrorBoundary           │
│  ThemeToggle │ ViewToggle │ TargetPriceConfig │ PrrTargetPriceConfig │
└─────────────────────────┬────────────────────────────────────────┘
                          │
┌─────────────────────────▼────────────────────────────────────────┐
│                  状态管理层（Pinia Stores）                        │
│                                                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ stockListStore   │  │ stockApiStore    │  │ stockUIStore    │  │
│  │ 股票CRUD+持久化   │  │ API调用+财务计算  │  │ UI状态管理      │  │
│  └────────┬────────┘  └───────┬─────────┘  └───────┬─────────┘  │
│           └───────────────────┼────────────────────┘             │
│                               │                                   │
│                 ┌─────────────▼─────────────┐                     │
│                 │     stockStore (门面)       │                     │
│                 │       向后兼容组合          │                     │
│                 └───────────────────────────┘                     │
└──────┬───────────────────┬───────────────────┬───────────────────┘
       │                   │                   │
┌──────▼──────┐   ┌────────▼────────┐  ┌───────▼────────┐
│   数据库层   │   │   API 服务层     │  │   工具与验证层  │
│  IndexedDB  │   │  东方财富 API    │  │  计算器        │
│  (idb)      │   │  腾讯财经 API    │  │  PRR 计算器    │
│             │   │  汇率 API       │  │  目标价计算器   │
│             │   │  财报 API       │  │  限流器/重试    │
│             │   │  财务指标 API    │  │  Zod 验证      │
└─────────────┘   └─────────────────┘  │  结构化日志     │
                                        └────────────────┘
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
| Store | 其他 Store（禁止跨 Store，通过门面组合） |
| 视图（Views） | 直接导入 API（必须通过 Store） |

## 包层级结构

```
src/
├── types/              # TypeScript 类型（无依赖）
│   ├── stock.ts           # StockData、YearlyData、TargetPriceConfig
│   ├── financialReport.ts # 财报 API 请求/响应类型
│   └── prr.ts             # PRR 估值类型（PRRFormulaType 等）
├── validation/         # Zod 验证 Schema（依赖 types）
│   ├── apiSchemas.ts      # API 响应验证
│   └── stockSchemas.ts    # 股票数据验证
├── utils/              # 纯函数（依赖 types）
│   ├── calculator.ts      # 传统财务计算
│   ├── prr-calculator.ts  # PRR 市赚率计算
│   ├── targetPriceCalculator.ts # 传统目标价
│   ├── prr-target-price.ts      # PRR 目标价
│   ├── excelParser.ts     # Excel 解析
│   ├── formatters.ts      # 数值/日期格式化
│   ├── rateLimiter.ts     # API 限流
│   ├── retry.ts           # 重试逻辑
│   ├── validator.ts       # 通用验证
│   ├── validateApiResponse.ts # API 响应验证
│   ├── prr-formatter.ts   # PRR 结果格式化
│   └── logger.ts          # 结构化日志
├── db/                 # IndexedDB 层（依赖 types）
│   └── index.ts           # idb 封装
├── api/                # 外部 API 客户端（依赖 utils、types）
│   ├── eastmoney.ts       # 东方财富通用 API
│   ├── tencent.ts         # 腾讯财经备用 API
│   ├── financialReportA.ts   # A 股财报
│   ├── financialReportHK.ts  # 港股财报
│   ├── financialIndicatorsA.ts  # A 股财务指标
│   ├── financialIndicatorsHK.ts # 港股财务指标
│   └── exchangeRate.ts    # 汇率获取
├── stores/             # Pinia Store（依赖 api、db、utils、types）
│   ├── stockListStore.ts  # 股票 CRUD + IndexedDB 持久化
│   ├── stockApiStore.ts   # API 调用 + 财务/PRR 计算
│   ├── stockUIStore.ts    # UI 状态管理
│   └── stockStore.ts      # 兼容门面
├── composables/        # Vue 组合函数（依赖 api、utils、types）
│   ├── useExcelParser.ts  # Excel 解析组合函数
│   ├── useFinancialReport.ts # 财报获取组合函数
│   └── useTheme.ts        # 主题管理（浅色/深色/系统）
├── components/         # Vue 组件（依赖 stores、utils、types）
│   ├── StockCard.vue       # 股票概览卡片
│   ├── StockTable.vue      # 年度财务数据表格
│   ├── ValuationChart.vue  # 估值趋势图表
│   ├── DividendChart.vue   # 分红率趋势图
│   ├── RoeChart.vue        # ROE 趋势图
│   ├── ExcelUploader.vue   # Excel 上传
│   ├── ApiTester.vue       # API 测试
│   ├── TargetPriceConfig.vue    # 传统目标价配置
│   ├── PrrTargetPriceConfig.vue # PRR 目标价配置
│   ├── ErrorBoundary.vue   # 错误边界
│   ├── ThemeToggle.vue     # 主题切换
│   ├── ViewToggle.vue      # 视图模式切换
│   └── icons/              # 图标组件
├── views/              # 路由级视图（依赖 components、stores、types）
│   ├── HomeView.vue        # 首页（股票列表 + 快速筛选）
│   ├── AddStockView.vue    # 添加/编辑股票
│   └── StockDetailView.vue # 股票详情
├── router/             # Vue Router 配置（依赖 views、types）
│   └── index.ts
└── App.vue / main.ts   # 应用入口（依赖所有模块）
```

## Store 架构

### stockListStore（股票列表 Store）
- **文件**: `src/stores/stockListStore.ts`
- **职责**: 股票 CRUD + IndexedDB 持久化 + 目标价配置
- **状态**: `stocks`、`sortedStocks`、`stockCount`
- **操作**: `loadStocks`、`addStock`、`deleteStock`、`getStockById`、`updateStock`、`recalculateStock`、`updateTargetPriceConfig`、`updatePrrTargetPriceConfig`、`updatePrrFormula`、`updateTotalShares`、`getTargetPrice`、`resetTargetPriceConfig`

### stockApiStore（股票 API Store）
- **文件**: `src/stores/stockApiStore.ts`
- **职责**: 外部 API 调用 + 财务计算 + PRR 计算 + 财务指标获取
- **数据流**: 东方财富优先 → 港股失败时切换腾讯财经
- **操作**: `testAPIs`、`fetchStockInfo`、`fetchFinancialReport`、`updateStockMarketCap`、`updateStockWithRecalculation`、`updateAllStocks`、`searchStocks`

### stockUIStore（UI 状态 Store）
- **文件**: `src/stores/stockUIStore.ts`
- **职责**: UI 状态管理（加载、错误、搜索、进度）
- **状态**: `loading`、`error`、`apiTestResults`、`isApiAvailable`、`searchResults`、`isSearching`、`updateProgress`、`isUpdatingAllStocks`、`currentlyUpdatingIds`
- **操作**: `clearError`、`clearSearchResults`

### stockStore（兼容门面）
- **文件**: `src/stores/stockStore.ts`
- **职责**: 向后兼容的组合门面，聚合以上 3 个 Store 的所有状态和操作
- **建议**: 新代码直接使用领域 Store，避免通过门面间接访问

## 数据流

```
用户操作 → 视图 → Store 操作 → API 调用 → Zod 响应验证 → Store 状态 → 视图更新
                                    ↓
                              IndexedDB（持久化）
                                    ↓
                              Store 状态（响应式）
```

### 典型数据流：添加股票

1. 用户在 AddStockView 输入股票代码
2. 调用 `stockApiStore.fetchStockInfo()` 获取基本信息
3. 调用 `stockApiStore.fetchFinancialReport()` 获取三年财报
4. 财报获取过程中同时拉取财务指标（ROE/ROA/PB/分红率）
5. Store 内执行财务计算（净现金、FCF、估值）、PRR 计算
6. 用户确认后调用 `stockListStore.addStock()` 持久化到 IndexedDB
7. 页面路由到 HomeView，`sortedStocks` 自动响应式更新

## 关键设计决策

1. **仅使用 Composition API** — 不使用 Options API，所有组件使用 `<script setup lang="ts">`
2. **单一数据源** — IndexedDB 是持久存储；Pinia 是响应式缓存
3. **API 边界验证** — 所有外部 API 响应使用 Zod Schema 验证
4. **结构化日志** — 禁止 `console.log`；使用 `src/utils/logger.ts` 分级日志（debug/info/warn/error）
5. **限流保护** — 东方财富 API 调用通过 `rateLimiter`（500ms 间隔）
6. **双数据源回退** — 港股优先东方财富，失败自动切换腾讯财经
7. **货币标准化** — 所有值以 亿元 为单位，港币为基准
8. **Store 隔离** — 禁止跨 Store 直接导入，通过 `stockStore.ts` 门面组合
9. **主题系统** — 支持浅色/深色/跟随系统，CSS 变量响应式切换
