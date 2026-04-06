# Vue 3 + Pinia 参考手册

## Vue 3 Composition API

### 核心响应式
```typescript
import { ref, reactive, computed, watch, onMounted } from 'vue'

// ref - 用于基本类型值
const count = ref(0)
count.value++

// reactive - 用于对象
const state = reactive({ name: '股票分析器', version: '1.0' })

// computed - 派生状态
const doubled = computed(() => count.value * 2)

// watch - 副作用监听
watch(count, (newVal, oldVal) => {
  console.log(`计数从 ${oldVal} 变为 ${newVal}`)
})

// 生命周期
onMounted(() => { /* DOM 就绪 */ })
onUnmounted(() => { /* 清理 */ })
```

### `<script setup>` 语法
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

## Pinia Store 模式

### Setup Store（Composition API 风格）
```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useStockStore = defineStore('stock', () => {
  // 状态
  const stocks = ref<StockData[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // 计算属性
  const sortedStocks = computed(() => 
    [...stocks.value].sort((a, b) => b.updatedAt - a.updatedAt)
  )

  // 操作
  async function loadStocks() {
    loading.value = true
    error.value = null
    try {
      stocks.value = await fetchFromDB()
    } catch (err) {
      error.value = err instanceof Error ? err.message : '未知错误'
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

### 组件中使用 Store
```vue
<script setup lang="ts">
import { useStockStore } from '@/stores/stockStore'

const stockStore = useStockStore()

// 访问状态
console.log(stockStore.stocks)

// 调用操作
await stockStore.loadStocks()
</script>
```

### Store 最佳实践
1. **一个领域一个 Store** - 不要创建上帝 Store
2. **禁止跨 Store 导入** - 每个 Store 独立
3. **操作处理异步** - 保持组件简洁
4. **加载/错误状态** - 每个异步操作都应管理这些状态
5. **全部返回** - 所有状态、计算属性、操作必须放在 return 对象中

## Vue 中的 TypeScript

### Props 类型
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

### Emits 类型
```typescript
const emit = defineEmits<{
  (e: 'select', stock: StockData): void
  (e: 'delete', id: string): void
  (e: 'error', error: Error): void
}>()
```

### Ref 类型
```typescript
const chartRef = ref<HTMLElement | null>(null)
const stocks = ref<StockData[]>([])
const loading = ref<boolean>(false)
```
