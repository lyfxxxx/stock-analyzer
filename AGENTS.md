# AGENTS.md - 股票分析工具

> AI Agent 目录索引。深入文档请查看链接。

## 项目概况
- **技术栈**: Vue 3.5 + TypeScript 5.9 + Vite 8.0 + Pinia 3.0 + ECharts 6.0 + Tailwind CSS 4.2
- **领域**: 港股与 A 股股票估值分析工具
- **数据验证**: Zod 4
- **数据源**: 东方财富 API（股票信息、财报、财务指标）、腾讯财经 API（港股备用）、open.er-api.com（汇率）

## 快速开始
```bash
npm run dev          # 开发服务器（端口 5173）
npm run build        # 构建（含类型检查）
npm run test         # 运行 Vitest 测试
npm run test:e2e     # 运行 Playwright E2E 测试
npm run lint         # 运行 ESLint
npm run lint:fix     # 自动修复 ESLint 问题
```

## 代码规范
- **文件名**: kebab-case（`stock-card.vue`、`eastmoney.ts`）
- **组件名**: PascalCase（`StockCard.vue`、`ThemeToggle.vue`）
- **类型名**: PascalCase（`StockData`、`ApiStockInfo`、`PRRResult`）
- **函数名**: camelCase（`calculateNetCash`、`calculateAdjustedPRR`）
- **导入顺序**: 外部库 → `@/` 绝对路径 → 相对路径
- **API 风格**: Composition API + `<script setup lang="ts">`
- **样式方案**: Tailwind CSS 4 + CSS 变量（`src/assets/theme.css`）
- **货币单位**: 所有值以 亿元 为单位，港币为基准

## 架构

### Store 分层（3 Store + 1 Facade）

| Store | 文件 | 职责 |
|-------|------|------|
| `stockListStore` | `src/stores/stockListStore.ts` | 股票 CRUD + IndexedDB 持久化 |
| `stockApiStore` | `src/stores/stockApiStore.ts` | API 调用 + 财务计算 + PRR 计算 |
| `stockUIStore` | `src/stores/stockUIStore.ts` | UI 状态（loading、error、搜索、刷新进度） |
| `stockStore` | `src/stores/stockStore.ts` | **兼容门面**，组合以上 3 个 Store |

> 旧代码通过 `useStockStore()` 访问，新代码建议直接使用领域 Store。

- [领域地图与依赖方向](docs/ARCHITECTURE.md)
- [数据流与 API 契约](docs/design-docs/)

## 前端
- [Vue 规范与模式](docs/FRONTEND.md)

## 参考资料
- [Vue + Pinia](docs/references/vue-pinia-reference.md)
- [Vite + ECharts](docs/references/vite-echarts-reference.md)

## 关键路径
- 源码: `src/` | 类型: `src/types/` | 状态管理: `src/stores/`
- API: `src/api/` | 工具: `src/utils/` | 测试: `src/**/__tests__/`
- 验证: `src/validation/` | 组合函数: `src/composables/`

## 核心功能模块

| 模块 | 路径 | 说明 |
|------|------|------|
| 传统估值 | `src/utils/calculator.ts` | 净现金、自由现金流、估值1/2、PE、流动比率 |
| PRR 估值 | `src/utils/prr-calculator.ts` | 市赚率：基础PR、修正PR、周期PR、指标PR、衍生PR |
| 传统目标价 | `src/utils/targetPriceCalculator.ts` | 基于估值倍数的目标价计算 |
| PRR 目标价 | `src/utils/prr-target-price.ts` | 基于市赚率的目标价计算 |
| 数据获取 | `src/api/eastmoney.ts`、`src/api/tencent.ts` | 东方财富 + 腾讯财经双数据源 |
| 财务指标 | `src/api/financialIndicatorsA.ts`、`src/api/financialIndicatorsHK.ts` | ROE/ROA/PB/分红率 |
| 主题切换 | `src/composables/useTheme.ts` | 浅色/深色/跟随系统 |
| Excel 解析 | `src/composables/useExcelParser.ts` | 手动上传模式 |

## 关键规则
1. **禁止 `console.log`** — 使用 `src/utils/logger.ts` 结构化日志（debug/info/warn/error）
2. **边界验证** — 使用 `src/validation/` 中的 Zod Schema 验证 API 响应
3. **禁止跨 Store 导入** — 每个领域 Store 独立，通过 `stockStore.ts` 门面组合
4. **依赖方向** — Views → Stores → API/Utils/DB（不可反向）
5. **所有 API 调用需限流** — 使用 `src/utils/rateLimiter.ts`（每 500ms 1 个请求）
6. **需要实际验证** — 完成修改后请使用 Playwright MCP 或 DevTools MCP 回测实际场景
