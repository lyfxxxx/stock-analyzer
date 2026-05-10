<template>
  <div class="chart-container" :class="{ 'chart-dark': isDark }" data-testid="roe-chart">
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
import { useTheme } from '@/composables/useTheme'

use([BarChart, GridComponent, TooltipComponent, CanvasRenderer])

const props = defineProps<{
  title?: string
  yearlyData: YearlyData[]
  forecastRoe?: number | null
}>()

const { isDark } = useTheme()

const chartRef = ref<HTMLElement | null>(null)
let chart: ECharts | null = null
let resizeHandler: (() => void) | null = null

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

function predictNextYearROE(yearlyData: YearlyData[]): { year: number; roe: number; isProjected: boolean } | null {
  // Get last 3 years of valid ROE (not projected)
  const validRoes = yearlyData
    .filter(d => d.roe != null && !d.isProjected && d.roe !== undefined)
    .map(d => ({ year: d.year, roe: d.roe as number }))
    .slice(-3)

  if (validRoes.length < 3) {
    return null
  }

  const lastIndex = yearlyData.length - 1
  const lastData = yearlyData[lastIndex]
  // Only predict if last year is NOT projected
  if (!lastData || lastData.isProjected) {
    return null
  }

  // Calculate average YoY growth rate
  const roe0 = validRoes[0]
  const roe1 = validRoes[1]
  const roe2 = validRoes[2]
  if (!roe0 || !roe1 || !roe2) {
    return null
  }
  if (roe0.roe === 0 || roe1.roe === 0) {
    return null
  }

  const growth1 = (roe1.roe - roe0.roe) / roe0.roe
  const growth2 = (roe2.roe - roe1.roe) / roe1.roe
  const avgGrowth = (growth1 + growth2) / 2

  // Predict next year ROE
  const predictedROE = roe2.roe * (1 + avgGrowth)

  return {
    year: roe2.year + 1,
    roe: predictedROE,
    isProjected: true
  }
}

function updateChart() {
  if (!chart) return

  const colors = getThemeColors()

  // Sort data by year
  const sortedData = [...props.yearlyData].sort((a, b) => a.year - b.year)

  // Apply forecastRoe to the latest year's data if provided (estimated full-year ROE from partial report)
  // This replaces the partial-year value with the projected full-year estimate at the SAME year
  if (props.forecastRoe != null && sortedData.length > 0) {
    const lastIdx = sortedData.length - 1
    const lastItem = sortedData[lastIdx]
    if (lastItem) {
      lastItem.roe = props.forecastRoe
      lastItem.isProjected = true
    }
  }
  // NOTE: We do NOT predict future years. The forecastRoe represents the current year's
  // estimated full-year ROE, not a future year's prediction.

  // Build chart data
  const chartData = sortedData

  const years = chartData.map(d => d.year.toString())
  const roeValues = chartData.map(d => d.roe ?? 0)
  const isProjectedFlags = chartData.map(d => d.isProjected ?? false)

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
        formatter: '{value}%'
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
            ROE: ${value.toFixed(2)}%
          </div>
        `
      }
    },
    series: [
      {
        name: 'ROE',
        type: 'bar',
        data: roeValues.map((value, index) => ({
          value,
          isProjected: isProjectedFlags[index],
          itemStyle: {
            color: isProjectedFlags[index] ? projectedColor : actualColor,
            borderRadius: [4, 4, 0, 0]
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

watch(() => props.yearlyData, () => {
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