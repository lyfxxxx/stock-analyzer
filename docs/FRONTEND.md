# 前端规范 - 股票分析器

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
  /* 使用 CSS 变量的样式 */
}
</style>
```

## CSS 变量

所有组件应引用 `src/assets/base.css` 中定义的 CSS 变量：

```css
/* 可用变量 */
--color-primary: #4FC08D;
--color-danger: #FF6B6B;
--color-warning: #FFA500;
--color-text: #2C3E50;
--color-text-light: #7F8C8D;
--color-bg: #F5F7FA;
--color-card-bg: #FFFFFF;
--color-border: #E4E7ED;

--spacing-xs: 4px;
--spacing-sm: 8px;
--spacing-md: 16px;
--spacing-lg: 24px;
--spacing-xl: 32px;

--radius-sm: 4px;
--radius-md: 8px;
--radius-lg: 12px;

--shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
```

## 导入顺序

1. **外部库**（vue、vue-router、pinia、echarts）
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
    // 使用结构化日志，不要用 console
    logger.error('MyComponent', '加载数据失败', { error: err })
    // 错误状态由 stockUIStore 管理
  }
}
</script>
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

## 响应式设计

使用移动优先的 CSS 媒体查询：

```css
.component {
  /* 移动优先（默认） */
  padding: var(--spacing-sm);
}

@media (min-width: 768px) {
  .component {
    padding: var(--spacing-md);
  }
}

@media (min-width: 1024px) {
  .component {
    padding: var(--spacing-lg);
  }
}
```
