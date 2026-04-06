# AGENTS.md - 股票分析器

> AI Agent 目录索引。深入文档请查看链接。

## 项目概况
- **技术栈**: Vue 3.5 + TypeScript 5.9 + Vite 7.3 + Pinia 3.0 + ECharts 6.0
- **领域**: 港股与 A 股股票估值分析工具
- **数据源**: 东方财富 API（财务数据）、open.er-api.com（汇率）

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
- **组件名**: PascalCase（`StockCard.vue`）
- **类型名**: PascalCase（`StockData`、`ApiStockInfo`）
- **函数名**: camelCase（`calculateNetCash`）
- **导入顺序**: 外部库 → `@/` 绝对路径 → 相对路径
- **API 风格**: Composition API + `<script setup lang="ts">`
- **货币单位**: 所有值以 亿元 为单位，港币为基准

## 架构
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

## 关键规则
1. **禁止 `console.log`** - 使用 `src/utils/logger.ts` 结构化日志
2. **边界验证** - 使用 `src/validation/` 中的 Zod 模式
3. **禁止跨 Store 导入** - 每个 Store 独立
4. **依赖方向** - Views → Stores → API/Utils/DB（不可反向）
5. **所有 API 调用需限流** - 使用 `financialReportRateLimiter`
