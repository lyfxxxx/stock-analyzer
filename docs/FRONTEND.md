# 前端规范 - 股票分析工具

## 样式方案

项目同时使用 **Tailwind CSS 4** 和 **CSS 变量**：
- 布局、间距、基础样式优先使用 Tailwind 工具类
- 主题颜色、阴影通过 `src/assets/theme.css` 中的 CSS 变量定义
- 组件特有样式使用 `<style scoped>` 块

### CSS 变量

所有组件可引用以下 CSS 变量（定义在 `theme.css`）：

```css
/* 主题颜色 */
--bg-primary       /* 页面背景 */
--bg-secondary     /* 卡片/容器背景 */
--text-primary     /* 主文字色 */
--text-secondary   /* 次要文字色 */
--brand-primary    /* 品牌主色 */
--brand-accent     /* 品牌强调色 */

/* 语义色 */
--color-success: #22c55e;
--color-warning: #f59e0b;
--color-danger: #ef4444;

/* 间距 */
--spacing-xs: 4px;
--spacing-sm: 8px;
--spacing-md: 16px;
--spacing-lg: 24px;
--spacing-xl: 32px;

/* 圆角 */
--radius-sm: 4px;
--radius-md: 8px;
--radius-lg: 12px;

/* 阴影 */
--shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);

/* 头部 */
--header-height: 56px;
--header-bg       /* 根据主题变化 */
--header-border
--header-shadow
```

### 主题系统

通过 `useTheme()` 组合函数实现浅色/深色/跟随系统三种模式：

```typescript
import { useTheme } from '@/composables/useTheme'

const { mode, resolved, isDark, setTheme, toggleTheme } = useTheme()

// mode: 'light' | 'dark' | 'system'（用户选择）
// resolved: 'light' | 'dark'（实际生效的主题）
// isDark: 当前是否为深色模式
// setTheme('dark'): 切换到深色
// toggleTheme(): 切换浅色/深色
```

实现原理：
- `<html>` 元素添加 `dark` 或 `light` CSS 类
- CSS 变量通过 `.dark {}` / `.light {}` 选择器响应不同值
- 跟随系统模式时，监听 `prefers-color-scheme` 变化

## Vue 组件模式

### 使用 `<script setup>` 的 Composition API

所有组件**必须**使用 Composition API + `<script setup lang="ts">`。

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import type { StockData } from '@/types/stock'
import { useStockListStore } from '@/stores/stockListStore'

const props = defineProps<{
  stock: StockData
  showActions?: boolean
}>()

const emit = defineEmits<{
  (e: 'delete', id: string): void
  (e: 'update', stock: StockData): void
}>()

const stockListStore = useStockListStore()
const isExpanded = ref(false)

const formattedValue = computed(() => {
  return props.stock.marketCap.toFixed(2)
})

function handleDelete() {
  emit('delete', props.stock.id)
}
</script>

<template>
  <div class="stock-card">
    <!-- 模板内容 -->
  </div>
</template>

<style scoped>
.stock-card {
  /* 组件特有样式 */
}
</style>
```

## 导入顺序

1. **外部库**（vue、vue-router、pinia、echarts、lodash）
2. **内部绝对路径**（`@/types/`、`@/stores/`、`@/utils/`、`@/components/`）
3. **相对路径**（本地模块，同目录）

```typescript
// ✅ 正确顺序
import { ref, computed, onMounted } from 'vue'
import type { StockData } from '@/types/stock'
import { useStockListStore } from '@/stores/stockListStore'
import { logger } from '@/utils/logger'
import StockCard from './StockCard.vue'

// ❌ 错误顺序（混排）
import StockCard from './StockCard.vue'
import { ref } from 'vue'
import { useStockListStore } from '@/stores/stockListStore'
```

## 组件中的错误处理

```vue
<script setup lang="ts">
import { useStockUIStore } from '@/stores/stockUIStore'
import { logger } from '@/utils/logger'

const uiStore = useStockUIStore()

async function loadData() {
  try {
    // Store 自行管理加载状态
    await someStoreAction()
  } catch (err) {
    // 使用结构化日志，禁止 console.log
    logger.error('MyComponent', '加载数据失败', { error: err })
    // 错误状态由 stockUIStore 管理
  }
}
</script>
```

### ErrorBoundary 组件

应用使用 `ErrorBoundary` 组件包裹整个应用，捕获未处理的异常：

```vue
<!-- App.vue -->
<template>
  <ErrorBoundary>
    <div class="app-layout">
      <RouterView />
    </div>
  </ErrorBoundary>
</template>
```

## 加载状态

加载状态集中在 `stockUIStore` 中：

```vue
<template>
  <div v-if="uiStore.loading" class="loading-spinner">
    加载中...
  </div>
  <div v-else-if="uiStore.error" class="error-banner">
    {{ uiStore.error }}
    <button @click="uiStore.clearError">关闭</button>
  </div>
  <div v-else>
    <!-- 内容 -->
  </div>
</template>
```

## Tailwind CSS 使用指南

### 基本用法

```html
<!-- 布局 -->
<div class="flex items-center justify-between gap-4 p-4">

<!-- 响应式 -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

<!-- 文本 -->
<span class="text-sm font-medium text-(--text-secondary)">

<!-- 结合 CSS 变量 -->
<div class="bg-(--bg-secondary) rounded-(--radius-md) shadow-(--shadow-sm)">
```

### Tailwind 与 Scoped CSS 的分工

| 场景 | 方案 |
|------|------|
| 布局、间距、Flex/Grid | Tailwind 工具类 |
| 文本大小、粗细、颜色 | Tailwind 工具类 |
| 主题颜色（随暗色/浅色变化） | CSS 变量 |
| 复杂动画 | `<style scoped>` |
| ECharts 图表容器 | `<style scoped>` |
| 组件特有形状/遮罩 | `<style scoped>` |

## 响应式设计

使用移动优先的 Tailwind 响应式断点：

```
sm: 640px   →  md: 768px   →  lg: 1024px   →  xl: 1280px
```

```html
<div class="px-4 md:px-6 lg:px-8">
  <!-- 移动端 padding 16px，平板 24px，桌面 32px -->
</div>
```

或使用 CSS 媒体查询：

```css
@media (max-width: 768px) {
  .component {
    padding: var(--spacing-sm);
  }
}
```

## 日志规范

**严禁使用 `console.log`**，使用结构化日志：

```typescript
import { logger } from '@/utils/logger'

logger.debug('StockCard', '初始化组件', { stockId: props.stock.id })
logger.info('StockCard', '数据加载完成')
logger.warn('StockCard', '估值数据异常', { valuation1: null })
logger.error('StockCard', 'API 调用失败', { error: err })
```

## 命名规范总结

| 类型 | 规范 | 示例 |
|------|------|------|
| 文件名 | kebab-case | `stock-card.vue`、`prr-calculator.ts` |
| 组件名 | PascalCase | `StockCard.vue`、`ThemeToggle.vue` |
| 类型名 | PascalCase | `StockData`、`PRRResult` |
| 函数名 | camelCase | `calculateNetCash`、`calculateAdjustedPRR` |
| 组合函数 | `use` 前缀 | `useTheme()`、`useExcelParser()` |
| Store 函数 | `use` 前缀 + Store 后缀 | `useStockListStore()` |
