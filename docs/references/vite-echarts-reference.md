# Vite + ECharts 参考手册

## Vite 配置

### 基础配置（vite.config.ts）
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

### 环境变量
```typescript
// .env.development
VITE_API_BASE_URL=https://push2.eastmoney.com

// .env.production
VITE_API_BASE_URL=https://push2.eastmoney.com

// 代码中使用
const baseUrl = import.meta.env.VITE_API_BASE_URL
```

### 构建命令
```bash
npm run dev          # 开发服务器（含 HMR 热更新）
npm run build        # 生产构建 + 类型检查
npm run build-only   # 生产构建（不含类型检查）
npm run type-check   # 仅 TypeScript 编译检查
npm run preview      # 预览生产构建
```

## ECharts 集成

### 基础图表组件
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

// 尺寸变化监听
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

### 使用的图表类型
- **折线图**: 自由现金流和净利润趋势
- **柱状图**: 年度同比对比
- **仪表盘**: 估值比率指标

### ECharts 主题定制
```typescript
const theme = {
  color: ['#4FC08D', '#FF6B6B', '#FFA500', '#3498DB'],
  textStyle: { fontFamily: 'system-ui, -apple-system, sans-serif' },
  grid: { top: 40, right: 20, bottom: 40, left: 60 }
}

echarts.init(domElement, theme)
```

## 性能优化

### 代码分割
```typescript
// 路由懒加载
const HomeView = () => import('@/views/HomeView.vue')
const StockDetailView = () => import('@/views/StockDetailView.vue')
```

### ECharts 按需引入
```typescript
// 仅导入需要的模块
import * as echarts from 'echarts/core'
import { LineChart, BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([LineChart, BarChart, GridComponent, TooltipComponent, CanvasRenderer])
```
