<template>
  <div class="chart-container" :class="{ 'chart-dark': isDark }">
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
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { init, use, graphic } from 'echarts/core'
import { BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { ECharts, EChartsCoreOption } from 'echarts/core'
import type { YearlyData, CurrencyType } from '@/types/stock'
import { useTheme } from '@/composables/useTheme'

use([BarChart, GridComponent, TooltipComponent, CanvasRenderer])

const props = defineProps<{
  title: string
  yearlyData: YearlyData[]
  dataType: 'freeCashFlow' | 'netProfit'
  displayCurrency?: CurrencyType
  exchangeRates?: Record<string, number>
  sourceCurrency?: CurrencyType
}>()

const { isDark } = useTheme()

const chartRef = ref<HTMLElement | null>(null)
let chart: ECharts | null = null
let resizeHandler: (() => void) | null = null

const defaultRates: Record<string, number> = { HKD: 1, USD: 7.75, CNY: 1.10 }
const currentCurrency = ref<CurrencyType>('HKD')
const rates = ref<Record<string, number>>(defaultRates)

function getThemeColors() {
  const style = getComputedStyle(document.documentElement)
  return {
    textPrimary: style.getPropertyValue('--text-primary').trim() || (isDark.value ? '#f1f5f9' : '#0f1729'),
    textSecondary: style.getPropertyValue('--text-secondary').trim() || (isDark.value ? '#94a3b8' : '#4a5568'),
    textMuted: style.getPropertyValue('--text-muted').trim() || (isDark.value ? '#5f6b7f' : '#8b95a8'),
    borderPrimary: style.getPropertyValue('--border-secondary').trim() || (isDark.value ? '#2a3654' : '#d0d4df'),
    bgCard: style.getPropertyValue('--bg-card').trim() || (isDark.value ? '#151d30' : '#ffffff'),
    brandPrimary: style.getPropertyValue('--brand-primary').trim() || (isDark.value ? '#f59e0b' : '#d97706'),
    projectedColor: style.getPropertyValue('--projected-color').trim() || (isDark.value ? '#a78bfa' : '#7c3aed'),
  }
}

function convertCurrency(value: number): number {
  const currency = props.displayCurrency || 'HKD'
  const sourceCurrency = props.sourceCurrency || 'HKD'
  if (sourceCurrency === currency) return value
  const exchangeRates = props.exchangeRates || defaultRates
  let rate;
  if (sourceCurrency === 'HKD') {
    rate = exchangeRates[currency] || 1
  } else {
    // HKD --> 目标
    const hkd2target = exchangeRates[currency] || 1
    // sourceCurrency --> HKD
    const src2hkd = 1 / (exchangeRates[sourceCurrency] || 1)
    rate = src2hkd * hkd2target
  }
  return value * rate
}

function getCurrencySymbol(): string {
  const symbols: Record<CurrencyType, string> = { HKD: 'HK$', CNY: '¥', USD: '$', OTHER: '$' }
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

function updateChart() {
  if (!chart) return

  updateCurrency()

  const colors = getThemeColors()
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
    { offset: 0, color: colors.brandPrimary },
    { offset: 1, color: isDark.value ? '#b45309' : '#92400e' }
  ])

  const projectedColor = new graphic.LinearGradient(0, 0, 0, 1, [
    { offset: 0, color: colors.projectedColor },
    { offset: 1, color: isDark.value ? '#6d28d9' : '#5b21b6' }
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
        lineStyle: { color: colors.borderPrimary }
      },
      axisLabel: {
        color: colors.textSecondary
      }
    },
    yAxis: {
      type: 'value',
      axisLine: {
        show: false
      },
      axisLabel: {
        color: colors.textSecondary,
        formatter: (value: number) => {
          return value >= 10000 ? `${(value / 10000).toFixed(1)}万亿` : String(value)
        }
      },
      splitLine: {
        lineStyle: {
          color: colors.borderPrimary,
          type: 'dashed'
        }
      }
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.bgCard,
      borderColor: colors.borderPrimary,
      textStyle: {
        color: colors.textPrimary
      },
      formatter: (params: any) => {
        const year = params[0].name
        const value = params[0].value
        const data = params[0].data
        const isProj = data?.isProjected ?? false
        const label = isProj ? ' (预测值)' : ''
        return `
          <div style="font-weight: 600; margin-bottom: 4px;">${year}年${label}</div>
          <div style="color: ${isProj ? colors.projectedColor : colors.brandPrimary};">
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

  chart.setOption(option, true)
}

function initChart() {
  if (!chartRef.value) return

  const theme = isDark.value ? 'dark' : undefined
  chart = init(chartRef.value, theme)

  updateChart()

  resizeHandler = () => chart?.resize()
  window.addEventListener('resize', resizeHandler)
}

onMounted(() => {
  initChart()
})

onUnmounted(() => {
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler)
  }
  chart?.dispose()
})

watch(() => [props.yearlyData, props.displayCurrency, props.exchangeRates], () => {
  updateChart()
}, { deep: true })

watch(isDark, () => {
  // Re-create chart on theme change to apply new colors
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler)
  }
  chart?.dispose()
  initChart()
})
</script>

<style scoped>
.chart-container {
  background-color: var(--bg-card);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-xl);
  padding: 20px;
  transition: background-color var(--transition-slow), border-color var(--transition-slow);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.chart-header h4 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
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
  background: linear-gradient(180deg, var(--brand-primary) 0%, var(--brand-primary-hover, var(--brand-primary)) 100%);
}

.legend-dot.projected {
  background: linear-gradient(180deg, var(--projected-color) 0%, var(--brand-accent, var(--projected-color)) 100%);
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
    gap: 8px;
  }

  .chart-legend {
    font-size: 11px;
    gap: 12px;
  }
}
</style>