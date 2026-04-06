# Vite + ECharts Reference

## Vite Configuration

### Basic Config (vite.config.ts)
```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api/search': {
        target: 'https://searchapi.eastmoney.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/search/, '')
      }
    }
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: false
  }
})
```

### Environment Variables
```typescript
// .env.development
VITE_API_BASE_URL=https://push2.eastmoney.com

// .env.production
VITE_API_BASE_URL=https://push2.eastmoney.com

// Usage in code
const baseUrl = import.meta.env.VITE_API_BASE_URL
```

### Build Commands
```bash
npm run dev          # Development server with HMR
npm run build        # Production build + type check
npm run build-only   # Production build without type check
npm run type-check   # TypeScript compiler only
npm run preview      # Preview production build
```

## ECharts Integration

### Basic Chart Component
```vue
<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'

const chartRef = ref<HTMLElement | null>(null)
let chart: echarts.ECharts | null = null

const props = defineProps<{
  data: { year: number; value: number }[]
  title: string
}>()

const option = ref<EChartsOption>({
  title: { text: props.title },
  tooltip: { trigger: 'axis' },
  xAxis: {
    type: 'category',
    data: props.data.map(d => d.year)
  },
  yAxis: { type: 'value' },
  series: [{
    data: props.data.map(d => d.value),
    type: 'line',
    smooth: true
  }]
})

onMounted(() => {
  if (chartRef.value) {
    chart = echarts.init(chartRef.value)
    chart.setOption(option.value)
  }
})

onUnmounted(() => {
  chart?.dispose()
})

// Resize handler
const resizeObserver = new ResizeObserver(() => {
  chart?.resize()
})

watch(chartRef, (el) => {
  if (el) resizeObserver.observe(el)
}, { immediate: true })
</script>

<template>
  <div ref="chartRef" style="width: 100%; height: 400px;"></div>
</template>
```

### ECharts Chart Types Used
- **Line Chart**: FCF and profit trends over time
- **Bar Chart**: Year-over-year comparisons
- **Gauge**: Valuation ratio indicators

### ECharts Theme Customization
```typescript
const theme = {
  color: ['#4FC08D', '#FF6B6B', '#FFA500', '#3498DB'],
  textStyle: { fontFamily: 'system-ui, -apple-system, sans-serif' },
  grid: { top: 40, right: 20, bottom: 40, left: 60 }
}

echarts.init(domElement, theme)
```

## Performance Optimization

### Code Splitting
```typescript
// Lazy load routes
const HomeView = () => import('@/views/HomeView.vue')
const StockDetailView = () => import('@/views/StockDetailView.vue')
```

### ECharts Tree Shaking
```typescript
// Import only needed modules
import * as echarts from 'echarts/core'
import { LineChart, BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([LineChart, BarChart, GridComponent, TooltipComponent, CanvasRenderer])
```
