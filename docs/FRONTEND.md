# Frontend Conventions - Stock Analyzer

## Vue Component Patterns

### Composition API with `<script setup>`

All components MUST use Composition API with `<script setup lang="ts">`.

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
    <!-- template content -->
  </div>
</template>

<style scoped>
.stock-card {
  /* styles using CSS variables */
}
</style>
```

## CSS Variables

All components should reference CSS variables from `src/assets/base.css`:

```css
/* Available variables */
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

## Import Order

1. **External libraries** (vue, vue-router, pinia, echarts)
2. **Internal absolute imports** (`@/types/`, `@/stores/`, `@/utils/`, `@/components/`)
3. **Relative imports** (local modules, same directory)

```typescript
// ✅ Correct order
import { ref, computed, onMounted } from 'vue'
import type { StockData } from '@/types/stock'
import { useStockListStore } from '@/stores/stockListStore'
import { logger } from '@/utils/logger'
import StockCard from './StockCard.vue'

// ❌ Wrong order (mixed)
import StockCard from './StockCard.vue'
import { ref } from 'vue'
import { useStockListStore } from '@/stores/stockListStore'
```

## Error Handling in Components

```vue
<script setup lang="ts">
import { useStockUIStore } from '@/stores/stockUIStore'
import { logger } from '@/utils/logger'

const uiStore = useStockUIStore()

async function loadData() {
  try {
    // Store handles its own loading state
    await someStoreAction()
  } catch (err) {
    // Log with structured logger, not console
    logger.error('MyComponent', 'Failed to load data', { error: err })
    // Store error state is managed by stockUIStore
  }
}
</script>
```

## Loading States

Loading state is centralized in `stockUIStore`:

```vue
<template>
  <div v-if="uiStore.loading" class="loading-spinner">
    Loading...
  </div>
  <div v-else-if="uiStore.error" class="error-banner">
    {{ uiStore.error }}
    <button @click="uiStore.clearError">Dismiss</button>
  </div>
  <div v-else>
    <!-- Content -->
  </div>
</template>
```

## Responsive Design

Use CSS media queries with mobile-first approach:

```css
.component {
  /* Mobile first (default) */
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
