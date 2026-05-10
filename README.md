# 股票分析工具

<p align="center">
  <img src="https://img.shields.io/badge/Vue-3.5.28-4FC08D?style=flat-square&logo=vue.js" alt="Vue.js">
  <img src="https://img.shields.io/badge/TypeScript-5.9.3-3178C6?style=flat-square&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Vite-8.0.8-646CFF?style=flat-square&logo=vite" alt="Vite">
  <img src="https://img.shields.io/badge/Pinia-3.0.4-yellow?style=flat-square" alt="Pinia">
  <img src="https://img.shields.io/badge/ECharts-6.0.0-FF6B6B?style=flat-square" alt="ECharts">
  <img src="https://img.shields.io/badge/Tailwind_CSS-4.2-06B6D4?style=flat-square&logo=tailwindcss" alt="Tailwind CSS">
</p>

---

## 📖 项目简介

**股票分析工具**是一个基于 Web 的港股与 A 股估值分析应用。通过 API 自动获取财务数据或手动上传 Excel，帮助投资者快速计算关键财务指标、估值比率与目标价。

### ✨ 核心功能

- 🔄 **双数据源** — API 模式（东方财富 / 腾讯财经）或手动模式（Excel 上传）
- 📊 **财务指标** — 市值、净现金、自由现金流、净利润、流动比率、PE、ROE、ROA、PB、分红率
- 🧮 **多维度估值** — 传统估值比率 + PRR（市赚率）估值体系
- 🎯 **目标价计算** — 传统估值法与 PRR 法双模式目标价估算
- 💱 **多币种** — 港元、人民币、美元，支持实时汇率转换
- 📈 **数据可视化** — ECharts 生成 FCF/净利润趋势图、ROE 趋势图、分红率图表
- 💾 **本地存储** — IndexedDB 持久化数据存储
- 🔄 **自动刷新** — 每日自动更新市值
- 🌗 **暗色模式** — 支持浅色 / 深色 / 跟随系统三种主题
- 📱 **响应式设计** — 移动端友好

---

## 🚀 快速开始

### 环境要求

- **Node.js**: `^20.19.0 || >=22.12.0`
- **包管理器**: npm / yarn / pnpm

### 安装

```bash
# 克隆仓库
git clone <repository-url>
cd stock-analyzer

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

应用将在 `http://localhost:5173` 可用。

### 可用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 生产构建（含类型检查） |
| `npm run preview` | 预览生产构建 |
| `npm run test` | 运行 Vitest 单元测试 |
| `npm run test:watch` | 监听模式运行测试 |
| `npm run test:coverage` | 生成测试覆盖率报告 |
| `npm run test:integration` | 运行实时 API 集成测试 |
| `npm run test:e2e` | 运行 Playwright E2E 测试 |
| `npm run lint` | 运行 ESLint 检查 |
| `npm run lint:fix` | 自动修复 ESLint 问题 |

---

## 📊 使用指南

### 添加股票

**API 模式**
1. 输入股票代码（如腾讯：`00700`）
2. 选择市场（港股 / A 股）
3. 点击"获取财报数据"自动拉取
4. 系统自动获取：股票信息 → 三年财报 → 财务指标（ROE/ROA/PB/分红率）
5. 预览数据并保存

**手动模式**
1. 手动输入股票基本信息
2. 上传 Excel 文件：
   - **利润表** — 净利润数据
   - **资产负债表** — 现金、负债、流动性数据
   - **现金流量表** — 经营现金流、资本支出
3. 生成数据并保存

### 查看分析

- **概览卡片**: 市值、净现金、自由现金流、净利润、流动比率、PE
- **估值比率**: 两种传统估值方法，颜色编码
  - 绿色: 低估值（< 10）
  - 橙色: 中等估值（10-20）
  - 红色: 高估值（> 20）
- **PRR 估值**: 市赚率体系 — 基础 PR、修正 PR、周期 PR、指标 PR、衍生 PR
- **目标价**: 传统估值法与 PRR 法的双模式目标价计算
- **趋势图表**: FCF 趋势、净利润趋势、ROE 趋势、分红率趋势
- **数据表格**: 按年份可排序的财务明细表

---

## 🏗️ 技术架构

### 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | Vue 3（Composition API）+ TypeScript |
| 构建工具 | Vite 8 |
| 状态管理 | Pinia |
| 数据库 | IndexedDB（idb 封装） |
| 图表库 | ECharts 6 |
| CSS 框架 | Tailwind CSS 4 |
| 数据验证 | Zod 4 |
| 路由 | Vue Router 5 |
| HTTP 客户端 | 原生 Fetch API |
| 单元测试 | Vitest + Vue Test Utils |
| E2E 测试 | Playwright |
| Excel 解析 | SheetJS (xlsx) |

### 项目结构

```
stock-analyzer/
├── src/
│   ├── api/                    # API 客户端
│   │   ├── eastmoney.ts           # 东方财富通用 API（股票信息、搜索、总股本）
│   │   ├── tencent.ts             # 腾讯财经 API（港股备用数据源）
│   │   ├── financialReportA.ts    # A 股财报 API
│   │   ├── financialReportHK.ts   # 港股财报 API
│   │   ├── financialIndicatorsA.ts  # A 股财务指标 API（ROE/ROA/PB/分红率）
│   │   ├── financialIndicatorsHK.ts # 港股财务指标 API
│   │   └── exchangeRate.ts        # 汇率 API
│   ├── components/             # Vue 组件
│   │   ├── StockCard.vue          # 股票概览卡片
│   │   ├── ValuationChart.vue     # 估值趋势图表
│   │   ├── ExcelUploader.vue      # Excel 上传组件
│   │   ├── ApiTester.vue          # API 连通性测试
│   │   ├── StockTable.vue         # 年度财务数据表格
│   │   ├── DividendChart.vue      # 分红率趋势图
│   │   ├── RoeChart.vue           # ROE 趋势图
│   │   ├── TargetPriceConfig.vue  # 传统目标价配置
│   │   ├── PrrTargetPriceConfig.vue # PRR 目标价配置
│   │   ├── ErrorBoundary.vue      # 错误边界组件
│   │   ├── ThemeToggle.vue        # 主题切换按钮
│   │   ├── ViewToggle.vue         # 视图切换（卡片/表格）
│   │   └── icons/                 # 图标组件
│   ├── composables/            # 组合式函数
│   │   ├── useExcelParser.ts      # Excel 解析逻辑
│   │   ├── useFinancialReport.ts  # 财报获取逻辑
│   │   └── useTheme.ts            # 主题管理（浅色/深色/系统）
│   ├── db/                     # IndexedDB 层
│   │   └── index.ts
│   ├── stores/                 # Pinia 状态管理
│   │   ├── stockListStore.ts      # 股票 CRUD + 持久化
│   │   ├── stockApiStore.ts       # API 调用 + 财务计算
│   │   ├── stockUIStore.ts        # UI 状态
│   │   └── stockStore.ts          # 兼容门面（组合上述 3 个 Store）
│   ├── types/                  # TypeScript 类型定义
│   │   ├── stock.ts               # 核心股票类型
│   │   ├── financialReport.ts     # 财报类型
│   │   └── prr.ts                 # PRR 估值类型
│   ├── utils/                  # 工具函数
│   │   ├── calculator.ts          # 财务计算（净现金/自由现金流/估值/PE等）
│   │   ├── prr-calculator.ts      # PRR 市赚率计算
│   │   ├── targetPriceCalculator.ts # 传统目标价计算
│   │   ├── prr-target-price.ts    # PRR 目标价计算
│   │   ├── excelParser.ts         # Excel 数据解析
│   │   ├── formatters.ts          # 数据格式化
│   │   ├── rateLimiter.ts         # API 限流器
│   │   ├── retry.ts               # 重试机制
│   │   ├── validator.ts           # 数据验证
│   │   ├── validateApiResponse.ts # API 响应验证
│   │   ├── prr-formatter.ts       # PRR 结果格式化
│   │   └── logger.ts              # 结构化日志
│   ├── validation/             # Zod 验证模式
│   │   ├── apiSchemas.ts          # API 响应 Schema
│   │   └── stockSchemas.ts        # 股票数据 Schema
│   ├── views/                  # 路由页面
│   │   ├── HomeView.vue           # 首页（股票列表 + 快速筛选）
│   │   ├── AddStockView.vue       # 添加/编辑股票
│   │   └── StockDetailView.vue    # 股票详情
│   ├── router/                 # Vue Router 配置
│   ├── assets/                 # 静态资源（CSS、SVG）
│   ├── App.vue                 # 应用根组件
│   └── main.ts                 # 应用入口
├── docs/                       # 项目文档
├── e2e/                        # Playwright E2E 测试
├── public/                     # 公共静态文件
│   └── _redirects              # SPA 路由重定向
└── dist/                       # 构建输出
```

---

## 🧮 计算方法

### 财务指标

```
净现金 = 货币资金 — 有息负债（短期借款 + 长期借款）
自由现金流 = 经营活动现金流净额 — 资本支出
PE = 市值 / 净利润
流动比率 = 流动资产 / 流动负债
```

### 传统估值比率

```
估值1 = (市值 — 净现金) / 自由现金流
估值2 = (市值 — 净现金) / 净利润
```

### PRR（市赚率）估值

PRR 体系由多个计算公式组成：

```
基础 PR = PE / ROE
修正因子 N = 50% / 分红率
修正 PR = N × PE / ROE
周期 PR = 5 年加权平均 ROE 替代 ROE
指标 PR = ROE × ROA 替代 ROE
衍生 PR = PE × PB / (ROE × 分红率)
```

估值判断：
- PR < 1.0 → 低估，建议买入
- 1.0 ≤ PR ≤ 1.5 → 合理，建议持有
- PR > 1.5 → 高估，建议卖出

### 目标价计算

**传统法**:
- 当流动比率 ≥ 1.5 时：`目标价 = (目标估值倍数 × 财务指标 + 净现金) / 总股本`
- 当流动比率 < 1.5 时：`目标价 = (目标估值倍数 × 财务指标) / 总股本`
- 财务指标为自由现金流（估值1）或净利润（估值2）

**PRR 法**: `目标价 = (目标PR × ROE × 净利润) / 总股本`

**说明**:
- 自由现金流为负时，估值1 显示 "N/A"
- A 股数据转换为港元等值，便于统一比较
- 预测数据（季报推算）标记"预测"标签
- 汇率使用 open.er-api.com 实时汇率，备用汇率：USD 7.75, CNY 1.10

---

## 🌐 API 集成

### 数据来源

#### 东方财富 API
- **股票信息**: `push2.eastmoney.com/api/qt/stock/get`
  - 支持港股（`116.xxx`）和 A 股（`0.xxx` / `1.xxx`）
  - 返回：股票名称、市值、实时价格、总股本
- **A 股财报**: `datacenter.eastmoney.com/securities/api/data/get`
  - 资产负债表、利润表、现金流量表，最多 30 年历史
- **港股财报**: `datacenter.eastmoney.com/api/data/v1/get`
- **A 股财务指标**: `datacenter.eastmoney.com/api/data/v1/get`
  - ROE、ROA、PB、分红率等指标
- **港股财务指标**: `datacenter.eastmoney.com/api/data/get`

#### 腾讯财经 API（港股备用）
- **接口**: `proxy.finance.qq.com/ifzqgtimg/stock`
- 作为东方财富港股数据的备用数据源，提供现金流量表等数据

#### 汇率 API
- **提供商**: `open.er-api.com/v6/latest/HKD`
- **备用汇率**: USD: 7.75, CNY: 1.10
- **缓存**: localStorage 保存 24 小时

### 限流保护

- 东方财富 API 调用限流（每 500ms 1 个请求）
- 自动重试机制，失败后切换备用数据源
- Referer 头伪装以兼容东方财富 API

---

## 🧪 测试

```bash
npm run test              # 运行单元测试
npm run test:coverage     # 覆盖率报告（v8）
npm run test:watch        # 监听模式
npm run test:integration  # 实时 API 集成测试
npm run test:e2e          # Playwright E2E 测试
```

### 测试覆盖

- **工具函数**: calculator、prr-calculator、targetPriceCalculator、excelParser、validator
- **API 模块**: 东方财富集成、腾讯财经集成、汇率获取
- **组件**: Vue 组件单元测试
- **E2E**: Playwright 浏览器端到端测试

### 实时 API 集成测试

实时 API 测试默认**禁用**，避免触发东方财富限流：

```bash
npm run test:integration                # 运行集成测试
VITE_LIVE_API_TESTS=true npm run test   # 手动启用
```

---

## 🚀 部署

### Cloudflare Pages（推荐）

1. 推送代码到 GitHub 仓库
2. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
3. Pages → 创建项目 → 连接 Git 仓库
4. 构建设置：
   ```
   构建命令: npm run build
   输出目录: dist
   ```
5. 部署完成后访问 `https://<project-name>.pages.dev`

### 手动部署

```bash
npm run build          # 构建
# 将 dist/ 目录部署到任意静态托管服务
```

---

## 📚 文档

- [架构文档](docs/ARCHITECTURE.md) — 领域地图、依赖方向、Store 架构
- [前端规范](docs/FRONTEND.md) — Vue 组件模式、CSS 变量、导入顺序
- [数据流与 API 契约](docs/design-docs/data-flow-and-api-contracts.zh-CN.md)
- [PRR 估值方法论](docs/research/prr-valuation-methodology.md)
- [东方财富 API 调研](docs/research/eastmoney-financial-indicators-api.md)

---

## 📝 许可证

MIT
