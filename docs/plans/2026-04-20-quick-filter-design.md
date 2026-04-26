# Quick Filter Design - Stats Bar Clickable

**Date**: 2026-04-20
**Status**: Approved

## Problem

HomeView 的 Stats Bar 只显示低估值/港股/A股的数量统计，用户无法直接通过点击筛选出对应股票。目前唯一的筛选方式是文本搜索（按名称/代码）。

## Solution

将 Stats Bar 改造为可点击的筛选按钮，点击后自动过滤股票列表。

## Architecture

### State Management

筛选状态放在 `stockUIStore`（UI 状态，不持久化）：

```ts
// stockUIStore.ts 新增
const activeFilters = ref<Set<string>>(new Set())

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
```

### Filter Logic

在 `HomeView.vue` 扩展 `filteredStocks` 计算属性，在现有文本搜索基础上叠加筛选条件（AND 逻辑）：

```ts
const filterConfig = [
  { key: 'undervalued', label: '低估值', filter: (s: StockData) => s.valuation1 !== null && s.valuation1 < 10 },
  { key: 'hk', label: '港股', filter: (s: StockData) => s.market === 'HK' },
  { key: 'a', label: 'A股', filter: (s: StockData) => s.market === 'A' },
]
```

筛选逻辑：先文本搜索，再快速筛选，两者 AND 叠加。

### Stats Bar UI

- Stats Bar 的每个统计项改为 `<button>` 元素
- 激活状态：高亮背景色 `var(--brand-primary)` + 白字
- Hover 状态：轻微背景变化
- 统计数字始终显示**总数**（不受筛选影响）
- 移动端允许横向滚动

## Edge Cases

| Scenario | Handling |
|----------|----------|
| 筛选后结果为空 | 显示"没有符合条件的股票"，保留筛选状态 |
| 筛选 + 搜索同时使用 | AND 逻辑 |
| 筛选期间新增/更新股票 | 自动重新计算 |
| 移动端显示 | Stats Bar 横向滚动 |

## Files Changed

| File | Change |
|------|--------|
| `src/stores/stockUIStore.ts` | 新增 `activeFilters`, `toggleFilter`, `clearFilters` |
| `src/views/HomeView.vue` | Stats Bar 改为可点击按钮，扩展 `filteredStocks` 逻辑 |
| `src/assets/base.css` | 新增筛选按钮 CSS 变量（可选） |

## Future Extensions

- 新增更多筛选维度（PE<15、净现金>0、流动比率>2）
- 标签式快捷按钮栏（方案B）
- 筛选面板（方案C）
