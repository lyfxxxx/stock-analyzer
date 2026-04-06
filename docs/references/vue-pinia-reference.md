# Vue 3 + Pinia Reference

## Vue 3 Composition API

### Core Reactivity
```typescript
import { ref, reactive, computed, watch, onMounted } from 'vue'

// ref - for primitive values
const count = ref(0)
count.value++

// reactive - for objects
const state = reactive({ name: 'Stock Analyzer', version: '1.0' })

// computed - derived state
const doubled = computed(() => count.value * 2)

// watch - side effects
watch(count, (newVal, oldVal) => {
  console.log(`Count changed from ${oldVal} to ${newVal}`)
})

// Lifecycle
onMounted(() => { /* DOM ready */ })
onUnmounted(() => { /* cleanup */ })
```

### `<script setup>` Syntax
```vue
<script setup lang="ts">
// Props
const props = defineProps<{
  stockCode: string
  market: 'HK' | 'A'
}>()

// Emits
const emit = defineEmits<{
  (e: 'update', data: StockData): void
  (e: 'delete', id: string): void
}>()

// Slots
const slots = defineSlots<{
  default(props: { stock: StockData }): any
  actions(): any
}>()
</script>
```

## Pinia Store Patterns

### Setup Store (Composition API style)
```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useStockStore = defineStore('stock', () => {
  // State
  const stocks = ref<StockData[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const sortedStocks = computed(() => 
    [...stocks.value].sort((a, b) => b.updatedAt - a.updatedAt)
  )

  // Actions
  async function loadStocks() {
    loading.value = true
    error.value = null
    try {
      stocks.value = await fetchFromDB()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
    } finally {
      loading.value = false
    }
  }

  return {
    stocks, loading, error, sortedStocks,
    loadStocks
  }
})
```

### Store Usage in Components
```vue
<script setup lang="ts">
import { useStockStore } from '@/stores/stockStore'

const stockStore = useStockStore()

// Access state
console.log(stockStore.stocks)

// Call actions
await stockStore.loadStocks()
</script>
```

### Store Best Practices
1. **One store per domain** - Don't create god stores
2. **No cross-store imports** - Each store is independent
3. **Actions handle async** - Keep components clean
4. **Loading/error state** - Every async action should manage these
5. **Return everything** - All state, getters, actions must be in return object

## TypeScript with Vue

### Typing Props
```typescript
interface StockCardProps {
  stock: StockData
  compact?: boolean
  currency?: 'HKD' | 'CNY' | 'USD'
}

const props = withDefaults(defineProps<StockCardProps>(), {
  compact: false,
  currency: 'HKD'
})
```

### Typing Emits
```typescript
const emit = defineEmits<{
  (e: 'select', stock: StockData): void
  (e: 'delete', id: string): void
  (e: 'error', error: Error): void
}>()
```

### Typing Refs
```typescript
const chartRef = ref<HTMLElement | null>(null)
const stocks = ref<StockData[]>([])
const loading = ref<boolean>(false)
```
