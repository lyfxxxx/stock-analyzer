<template>
  <div class="chart-container">
    <div class="chart-header">
      <h4>{{ title }}</h4>
      <div class="chart-legend">
        <span class="legend-item">
          <span class="legend-dot actual"></span>
          <span>实际值</span>
        </span>
        <span class="legend-item">
          <span class="legend-dot projected"></span>
          <span>预测值</span>
        </span>
      </div>
    </div>
    <div ref="chartRef" class="chart"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { init, use, graphic } from 'echarts/core'
import { BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { ECharts, EChartsCoreOption } from 'echarts/core'
import type { YearlyData } from '@/types/stock'

use([BarChart, GridComponent, TooltipComponent, CanvasRenderer])

type CurrencyType = 'HKD' | 'CNY' | 'USD'

const props = defineProps<{
  title: string
  yearlyData: YearlyData[]
  dataType: 'freeCashFlow' | 'netProfit'
  displayCurrency?: CurrencyType
  exchangeRates?: Record<string, number>
}>()

const chartRef = ref<HTMLElement | null>(null)
let chart: ECharts | null = null

const defaultRates: Record<string, number> = { HKD: 1, USD: 7.75, CNY: 1.10 }
const currentCurrency = ref<CurrencyType>('HKD')
const rates = ref<Record<string, number>>(defaultRates)

function convertCurrency(value: number): number {
  const currency = props.displayCurrency || 'HKD'
  const exchangeRates = props.exchangeRates || defaultRates
  const rate = exchangeRates[currency] || 1
  return value * rate
}

function getCurrencySymbol(): string {
  const symbols: Record<CurrencyType, string> = { HKD: 'HK$', CNY: '¥', USD: '$' }
  return symbols[currentCurrency.value]
}

function updateCurrency() {
  if (props.displayCurrency) {
    currentCurrency.value = props.displayCurrency
  }
  if (props.exchangeRates) {
    rates.value = props.exchangeRates
  }
}

function initChart() {
  if (!chartRef.value) return
  
  updateCurrency()
  chart = init(chartRef.value, 'dark')
  updateChart()
  
  const resizeHandler = () => chart?.resize()
  window.addEventListener('resize', resizeHandler)
  
  return () => {
    window.removeEventListener('resize', resizeHandler)
  }
}

function updateChart() {
  if (!chart) return
  
  updateCurrency()
  
  const sortedData = [...props.yearlyData].sort((a, b) => a.year - b.year)
  const years = sortedData.map(d => d.year.toString())
  const values = sortedData.map(d =>
    convertCurrency(props.dataType === 'freeCashFlow' ? d.freeCashFlow : d.netProfit)
  )
  const isProjected = sortedData.map(d => {
    if (props.dataType === 'freeCashFlow') {
      return d.freeCashFlowProjected ?? d.isProjected ?? false
    }
    return d.netProfitProjected ?? d.isProjected ?? false
  })
  
  const currencySymbol = getCurrencySymbol()
  
  const actualColor = new graphic.LinearGradient(0, 0, 0, 1, [
    { offset: 0, color: '#f59e0b' },
    { offset: 1, color: '#d97706' }
  ])

  const projectedColor = new graphic.LinearGradient(0, 0, 0, 1, [
    { offset: 0, color: '#a78bfa' },
    { offset: 1, color: '#7c3aed' }
  ])
  
  const option: EChartsCoreOption = {
    backgroundColor: 'transparent',
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: years,
      axisLine: {
        lineStyle: { color: '#475569' }
      },
      axisLabel: {
        color: '#94a3b8'
      }
    },
    yAxis: {
      type: 'value',
      axisLine: {
        show: false
      },
      axisLabel: {
        color: '#94a3b8',
        formatter: (value: number) => {
          return value >= 10000 ? `${(value / 10000).toFixed(1)}万` : String(value)
        }
      },
      splitLine: {
        lineStyle: {
          color: '#334155',
          type: 'dashed'
        }
      }
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e293b',
      borderColor: '#475569',
      textStyle: {
        color: '#f8fafc'
      },
      formatter: (params: any) => {
        const year = params[0].name
        const value = params[0].value
        const data = params[0].data
        const isProj = data?.isProjected ?? false
        const label = isProj ? ' (预测值)' : ''
        return `
          <div style="font-weight: 600; margin-bottom: 4px;">${year}年${label}</div>
          <div style="color: ${isProj ? '#9ca3af' : '#f59e0b'};">
            ${currencySymbol}${value.toFixed(2)}亿
          </div>
        `
      }
    },
    series: [
      {
        name: props.dataType === 'freeCashFlow' ? '自由现金流' : '净利润',
        type: 'bar',
        data: values.map((value, index) => ({
          value,
          isProjected: isProjected[index],
          itemStyle: {
            color: isProjected[index] ? projectedColor : actualColor,
            borderRadius: value >= 0 ? [4, 4, 0, 0] : [0, 0, 4, 4],
            borderDashOffset: isProjected[index] ? 5 : 0
          }
        })),
        barWidth: '50%',
        animationDuration: 1000
      }
    ]
  }
  
  chart.setOption(option)
}

onMounted(() => {
  initChart()
})

onUnmounted(() => {
  chart?.dispose()
})

watch(() => [props.yearlyData, props.displayCurrency, props.exchangeRates], () => {
  updateChart()
}, { deep: true })
</script>

<style scoped>
.chart-container {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 20px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.chart-header h4 {
  margin: 0;
  font-size: 16px;
  color: var(--text-primary);
}

.chart-legend {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--text-secondary);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 2px;
}

.legend-dot.actual {
  background: linear-gradient(180deg, #f59e0b 0%, #d97706 100%);
}

.legend-dot.projected {
  background: linear-gradient(180deg, #a78bfa 0%, #7c3aed 100%);
}

.chart {
  height: 300px;
}

@media (max-width: 640px) {
  .chart {
    height: 250px;
  }
  
  .chart-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .chart-legend {
    font-size: 11px;
    gap: 12px;
  }
}
</style>
