<template>
  <div
    class="stock-card"
    :class="{ 'is-updating': isUpdating }"
    @click="handleClick($event)"
  >
    <div v-if="isUpdating" class="updating-overlay">
      <div class="spinner-sm"></div>
      <span>更新中...</span>
    </div>

    <!-- Row 1: Name + Code + Market -->
    <div class="card-header">
      <div class="stock-info">
        <span class="stock-name">{{ stock.name }}</span>
        <span class="stock-code font-mono-nums">{{ stock.code }}</span>
      </div>
      <span class="market-badge" :class="stock.market === 'HK' ? 'badge-hk' : 'badge-a'">
        {{ stock.market === 'HK' ? '港股' : 'A股' }}
      </span>
    </div>

    <!-- Tag Row -->
    <div class="tag-row" v-if="stockTags.length || true" @click.stop>
      <TagList
        :stock-id="stock.id"
        :stock-name="stock.name"
        :truncated="false"
        size="sm"
        :removable="true"
        :show-empty-hint="true"
        empty-text="点击添加标签"
      />
    </div>

    <!-- Row 2: Market Cap -->
    <div class="metric-row market-cap-row">
      <span class="metric-label">市值</span>
      <span class="metric-value font-mono-nums">{{ formatMarketCap(stock) }}</span>
      <span v-if="stock.rateSource === 'fallback'" class="rate-warning" title="汇率使用了备用值">*</span>
    </div>

    <!-- Row 3: Valuations side by side -->
    <div class="valuation-row">
      <div class="valuation-item" :class="getValuationBgClass(getCardValuation1())">
        <div class="valuation-label">
          <span>估值1</span>
          <span
            class="info-icon"
            @click.stop
            @mouseenter="showTooltip1 = true"
            @mouseleave="showTooltip1 = false"
          >ⓘ
            <span v-if="showTooltip1" class="tooltip-popup">{{ getValuation1Tooltip() }}</span>
          </span>
        </div>
        <div class="valuation-value font-mono-nums" :class="getValuationClass(getCardValuation1())">
          <template v-if="getCardValuation1() !== null">
            {{ getCardValuation1()!.toFixed(2) }}
          </template>
          <template v-else>
            <span class="na-text">N/A</span>
          </template>
        </div>
      </div>
      <div class="valuation-item" :class="getValuationBgClass(getCardValuation2())">
        <div class="valuation-label">
          <span>估值2</span>
          <span
            class="info-icon"
            @click.stop
            @mouseenter="showTooltip2 = true"
            @mouseleave="showTooltip2 = false"
          >ⓘ
            <span v-if="showTooltip2" class="tooltip-popup">{{ getValuation2Tooltip() }}</span>
          </span>
        </div>
        <div class="valuation-value font-mono-nums" :class="getValuationClass(getCardValuation2())">
          <template v-if="getCardValuation2() !== null">
            {{ getCardValuation2()!.toFixed(2) }}
          </template>
          <template v-else>
            <span class="na-text">N/A</span>
          </template>
        </div>
      </div>
      <div class="valuation-item" :class="getSelectedPrrBgClass()">
        <div class="valuation-label">
          <span>PRR</span>
          <button
            class="prr-formula-btn"
            @click.stop="showPrrFormulaDropdown = !showPrrFormulaDropdown"
            title="切换公式"
          >
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
          <span
            class="info-icon"
            @click.stop
            @mouseenter="showPrrTooltip = true"
            @mouseleave="showPrrTooltip = false"
          >ⓘ
            <span v-if="showPrrTooltip" class="tooltip-popup">{{ getSelectedPrrTooltip() }}</span>
          </span>
          <!-- PRR Formula Dropdown -->
          <div v-if="showPrrFormulaDropdown" class="prr-dropdown" @click.stop>
            <button
              v-for="formula in prrFormulaList"
              :key="formula.type"
              class="prr-dropdown-item"
              :class="{ 'is-active': formula.type === currentPrrFormula }"
              @click="selectPrrFormula(formula.type)"
            >
              <span class="prr-dropdown-name">{{ formula.name }}</span>
              <span class="prr-dropdown-value font-mono-nums">
                {{ formula.currentValue !== null ? formula.currentValue.toFixed(2) + 'PR' : '-' }}
              </span>
            </button>
          </div>
        </div>
        <div class="valuation-value font-mono-nums" :class="getSelectedPrrTextClass()" data-testid="prr-value">
          {{ getSelectedPrrDisplay() }}
        </div>
      </div>
    </div>

    <!-- Row 4: Target Price -->
    <div
      v-if="stock.targetPriceConfig?.enabled || (stock.prrTargetPriceConfig?.enabled && stock.targetPriceMethod === 'prr')"
      class="target-price-row"
      :class="getTargetPriceRowClass()"
    >
      <div class="target-price-area" @click.stop="showTargetPriceConfig = true">
        <div class="target-price-label">
          <span>目标价</span>
          <span v-if="stock.prrTargetPriceConfig?.enabled && stock.targetPriceMethod === 'prr'" class="prr-badge" title="基于PRR计算">PRR</span>
          <span
            class="info-icon"
            @click.stop
            @mouseenter="showTargetTooltip = true"
            @mouseleave="showTargetTooltip = false"
          >ⓘ
            <span v-if="showTargetTooltip" class="tooltip-popup">{{ getTargetPriceTooltip() }}</span>
          </span>
        </div>
        <template v-if="targetPriceResult.error">
          <span class="error-text">{{ getTargetPriceErrorText() }}</span>
        </template>
        <template v-else-if="targetPriceResult.price !== null">
          <div class="target-price-detail">
            <div v-if="currentPrice !== null" class="tp-row">
              <span class="tp-label">当前</span>
              <span class="price-num font-mono-nums">{{ currentPrice.toFixed(2) }}</span>
              <span class="price-unit">{{ priceUnit }}</span>
            </div>
            <div v-if="targetPriceResult.buyPrice !== null" class="tp-row">
              <span class="tp-label">买入</span>
              <span class="price-num font-mono-nums">{{ targetPriceResult.buyPrice.toFixed(2) }}</span>
              <span class="price-unit">{{ priceUnit }}</span>
              <span v-if="currentPrice !== null" class="tp-pct" :class="targetPriceResult.buyPrice >= currentPrice ? 'text-positive' : 'text-negative'">
                {{ ((targetPriceResult.buyPrice - currentPrice) / currentPrice * 100).toFixed(1) }}%
              </span>
            </div>
            <div v-if="targetPriceResult.sellPrice !== null && targetPriceResult.sellPrice !== (targetPriceResult.buyPrice ?? targetPriceResult.price)" class="tp-row">
              <span class="tp-label">卖出</span>
              <span class="price-num font-mono-nums">{{ targetPriceResult.sellPrice.toFixed(2) }}</span>
              <span class="price-unit">{{ priceUnit }}</span>
              <span v-if="currentPrice !== null" class="tp-pct" :class="targetPriceResult.sellPrice >= currentPrice ? 'text-positive' : 'text-negative'">
                {{ ((targetPriceResult.sellPrice - currentPrice) / currentPrice * 100).toFixed(1) }}%
              </span>
            </div>
          </div>
        </template>
        <template v-else>
          <span class="na-text">--</span>
        </template>
      </div>
      <button
        class="config-btn"
        @click.stop="showTargetPriceConfig = true"
        title="配置目标价"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      </button>
    </div>

    <!-- Row 4 (alt): Not configured -->
    <div
      v-else
      class="target-price-row target-price-empty"
      @click.stop="showTargetPriceConfig = true"
    >
      <div class="target-price-label">
        <span>目标价</span>
      </div>
      <div class="target-price-value">
        <span class="unconfigured-text">未设置</span>
        <span class="hint-text">点击配置</span>
      </div>
    </div>

    <!-- Target Price Config Modal (merged) -->
    <TargetPriceConfig
      :stock-id="stock.id"
      v-model:visible="showTargetPriceConfig"
      :initial-config="stock.targetPriceConfig"
      :initial-prr-config="stock.prrTargetPriceConfig ?? null"
      @saved="onTargetPriceSaved"
    />

    <!-- Row 5: Key metrics -->
    <div class="metrics-grid">
      <div class="metric-item">
        <span class="metric-label">PE</span>
        <span class="metric-value font-mono-nums" :class="getMetricClass('pe', stock.peRatio)">
          <template v-if="stock.peRatio !== null">{{ stock.peRatio.toFixed(1) }}x</template>
          <template v-else><span class="na-text">N/A</span></template>
        </span>
      </div>
      <div class="metric-item">
        <span class="metric-label">ROE</span>
        <span class="metric-value font-mono-nums">
          <template v-if="stock.roe != null">{{ stock.roe.toFixed(2) }}%</template>
          <template v-else><span class="na-text">-</span></template>
          <span v-if="stock.roeProjected" class="projected-badge">预</span>
        </span>
      </div>
      <div class="metric-item">
        <span class="metric-label">流动比率</span>
        <span class="metric-value font-mono-nums" :class="getMetricClass('currentRatio', stock.currentRatio)">
          <template v-if="stock.currentRatio !== null">{{ stock.currentRatio.toFixed(2) }}</template>
          <template v-else><span class="na-text">N/A</span></template>
        </span>
      </div>
      <div class="metric-item">
        <span class="metric-label">ROA</span>
        <span class="metric-value font-mono-nums">
          <template v-if="stock.roa != null">{{ stock.roa.toFixed(2) }}%</template>
          <template v-else><span class="na-text">-</span></template>
        </span>
      </div>
      <div class="metric-item">
        <span class="metric-label">净现金</span>
        <span class="metric-value font-mono-nums">
          {{ formatYi(stock.netCash) }}
        </span>
      </div>
      <div class="metric-item">
        <span class="metric-label">FCF</span>
        <span class="metric-value font-mono-nums" :class="{ 'text-positive': stock.freeCashFlow > 0, 'text-negative': stock.freeCashFlow < 0 }">
          {{ formatYi(stock.freeCashFlow) }}
        </span>
      </div>
    </div>

    <!-- Row 5: Footer -->
    <div class="card-footer">
      <span class="update-time">{{ formatDate(stock.updatedAt) }}</span>
      <span class="arrow">→</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { StockData } from '@/types/stock'
import type { Tag } from '@/types/tag'
import { useStockStore } from '@/stores/stockStore'
import { useStockListStore } from '@/stores/stockListStore'
import { useTagStore } from '@/stores/tagStore'
import { formatCurrency, formatYi, formatDate, getValuationClass, getValuationLevel } from '@/utils/formatters'
import { formatPRR, getPrrValuationBgClass, getPrrValuationLevel, getPrrValuationText, getPrrFormulaText, getPrrFormulaDescription, getPrrFormulaWithValues } from '@/utils/prr-formatter'
import type { PRRFormulaType } from '@/types/prr'
import TargetPriceConfig from './TargetPriceConfig.vue'
import TagChip from './TagChip.vue'
import TagList from './TagList.vue'


const showTooltip1 = ref(false)
const showTooltip2 = ref(false)
const showPrrTooltip = ref(false)
const showPrrFormulaDropdown = ref(false)
const showTargetTooltip = ref(false)
const showTargetPriceConfig = ref(false)

const stockStore = useStockStore()
const stockListStore = useStockListStore()
const tagStore = useTagStore()

const stockTags = computed(() => tagStore.getStockTags(props.stock.id))

const targetPriceResult = computed(() => stockStore.getTargetPrice(props.stock.id))

const currentPrice = computed(() => {
  if (!props.stock.totalShares || props.stock.totalShares === 0) return null
  return props.stock.marketCap / props.stock.totalShares
})

const priceUnit = computed(() => {
  return props.stock.market === 'A' ? '元' : '港元'
})

// PRR formula dropdown
const currentPrrFormula = computed<PRRFormulaType>(() => {
  return props.stock.prrSelectedFormula ?? 'base'
})

function getPrrValueForFormula(formula: PRRFormulaType): number | null {
  const stock = props.stock
  switch (formula) {
    case 'base': return stock.prrBase ?? null
    case 'adjusted': return stock.prrAdjusted ?? null
    case 'cycle': return stock.prrCycle ?? null
    case 'index': return stock.prrIndex ?? null
    case 'derived': return stock.prrDerived ?? null
  }
}

const prrFormulaList = computed(() => {
  const formulas: PRRFormulaType[] = ['base', 'adjusted', 'cycle', 'index', 'derived']
  return formulas.map(type => ({
    type,
    name: getPrrFormulaDescription(type),
    currentValue: getPrrValueForFormula(type)
  }))
})

async function selectPrrFormula(formula: PRRFormulaType) {
  showPrrFormulaDropdown.value = false
  try {
    await stockListStore.updatePrrFormula(props.stock.id, formula)
  } catch {
    // Error handled in store
  }
}

function formatMarketCap(stock: StockData): string {
  // formatCurrency already includes the unit (亿港元/亿人民币), so no need to add it again
  return formatCurrency(stock.marketCap, stock.market === 'A' ? 'CNY' : 'HKD')
}

const props = defineProps<{
  stock: StockData
  isUpdating?: boolean
}>()

const emit = defineEmits<{
  (e: 'click', stock: StockData): void
}>()

function handleClick(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (target.closest('.info-icon') || target.closest('.tooltip-popup') || target.closest('.target-price-area') || target.closest('.prr-dropdown') || target.closest('.prr-formula-btn')) return
  showPrrFormulaDropdown.value = false
  emit('click', props.stock)
}

function getCardValuation1(): number | null {
  const stock = props.stock
  if (stock.currentRatio !== null && stock.currentRatio < 1.5) {
    if (stock.freeCashFlow <= 0) return null
    return stock.marketCap / stock.freeCashFlow
  }
  return stock.valuation1
}

function getCardValuation2(): number | null {
  const stock = props.stock
  if (stock.currentRatio !== null && stock.currentRatio < 1.5) {
    return stock.peRatio
  }
  return stock.valuation2
}

function getSelectedPrrDisplay(): string {
  const stock = props.stock
  const formula = stock.prrSelectedFormula ?? 'base'
  let prrValue: number | null = null
  switch (formula) {
    case 'base': prrValue = stock.prrBase ?? null; break
    case 'adjusted': prrValue = stock.prrAdjusted ?? null; break
    case 'cycle': prrValue = stock.prrCycle ?? null; break
    case 'index': prrValue = stock.prrIndex ?? null; break
    case 'derived': prrValue = stock.prrDerived ?? null; break
  }
  return formatPRR(prrValue)
}

function getSelectedPrrBgClass(): string {
  const stock = props.stock
  const formula = stock.prrSelectedFormula ?? 'base'
  let prrValue: number | null = null
  switch (formula) {
    case 'base': prrValue = stock.prrBase ?? null; break
    case 'adjusted': prrValue = stock.prrAdjusted ?? null; break
    case 'cycle': prrValue = stock.prrCycle ?? null; break
    case 'index': prrValue = stock.prrIndex ?? null; break
    case 'derived': prrValue = stock.prrDerived ?? null; break
  }
  const marketMap: Record<string, 'A' | 'H' | 'US'> = { HK: 'H', A: 'A' }
  const marketType = marketMap[stock.market] ?? 'H'
  const level = getPrrValuationLevel(prrValue, marketType)
  return getPrrValuationBgClass(level)
}

function getSelectedPrrTextClass(): string {
  const stock = props.stock
  const formula = stock.prrSelectedFormula ?? 'base'
  let prrValue: number | null = null
  switch (formula) {
    case 'base': prrValue = stock.prrBase ?? null; break
    case 'adjusted': prrValue = stock.prrAdjusted ?? null; break
    case 'cycle': prrValue = stock.prrCycle ?? null; break
    case 'index': prrValue = stock.prrIndex ?? null; break
    case 'derived': prrValue = stock.prrDerived ?? null; break
  }
  const marketMap: Record<string, 'A' | 'H' | 'US'> = { HK: 'H', A: 'A' }
  const marketType = marketMap[stock.market] ?? 'H'
  const level = getPrrValuationLevel(prrValue, marketType)
  return `val-${level}`
}

function getSelectedPrrTooltip(): string {
  const stock = props.stock
  const formula = stock.prrSelectedFormula ?? 'base'
  const formulaText = getPrrFormulaText(formula as PRRFormulaType)
  let prrValue: number | null = null
  switch (formula) {
    case 'base': prrValue = stock.prrBase ?? null; break
    case 'adjusted': prrValue = stock.prrAdjusted ?? null; break
    case 'cycle': prrValue = stock.prrCycle ?? null; break
    case 'index': prrValue = stock.prrIndex ?? null; break
    case 'derived': prrValue = stock.prrDerived ?? null; break
  }
  const formulaWithValues = getPrrFormulaWithValues(formula as PRRFormulaType, {
    peRatio: stock.peRatio ?? null,
    roe: stock.roe ?? null,
    pbRatio: stock.pbRatio ?? null,
    dividendPayoutRatio: stock.dividendPayoutRatio ?? null,
    roa: stock.roa ?? null,
  })
  return `${formulaText}\n${formulaWithValues}\n结果: ${prrValue !== null ? prrValue.toFixed(2) + 'PR' : '-'} (${getPrrValuationText(prrValue, stock.market === 'A' ? 'A' : 'H')})`
}

function getMetricClass(type: 'pe' | 'currentRatio', value: number | null): string {
  if (value === null) return 'metric-na'
  if (type === 'pe') {
    if (value < 12) return 'metric-low'
    if (value < 20) return 'metric-medium'
    return 'metric-high'
  }
  return value >= 1.5 ? 'metric-low' : 'metric-medium'
}

function getValuationBgClass(value: number | null): string {
  const level = getValuationLevel(value)
  const bgClassMap: Record<string, string> = {
    low: 'val-low-bg',
    medium: 'val-medium-bg',
    high: 'val-high-bg',
    negative: 'val-negative-bg',
    na: 'val-na-bg',
  }
  return bgClassMap[level] ?? ''
}

function getValuation1Tooltip(): string {
  const stock = props.stock
  const formula = stock.currentRatio !== null && stock.currentRatio < 1.5
    ? '市值/FCF'
    : '(市值-净现金)/FCF'
  if (stock.currentRatio !== null && stock.currentRatio < 1.5) {
    return `${formula} = ${formatCurrency(stock.marketCap, stock.market === 'A' ? 'CNY' : 'HKD')} / ${formatYi(stock.freeCashFlow)} (流动比率<1.5)`
  }
  return `${formula} = (${formatCurrency(stock.marketCap, stock.market === 'A' ? 'CNY' : 'HKD')} - ${formatYi(stock.netCash)}) / ${formatYi(stock.freeCashFlow)}`
}

function getValuation2Tooltip(): string {
  const stock = props.stock
  const formula = stock.currentRatio !== null && stock.currentRatio < 1.5
    ? 'PE'
    : '(市值-净现金)/净利润'
  if (stock.currentRatio !== null && stock.currentRatio < 1.5) {
    return `${formula} (流动比率<1.5，使用PE)`
  }
  return `${formula} = (${formatCurrency(stock.marketCap, stock.market === 'A' ? 'CNY' : 'HKD')} - ${formatYi(stock.netCash)}) / ${formatYi(stock.netProfit)}`
}

function getTargetPriceRowClass(): string {
  if (targetPriceResult.value.error) return 'target-row-error'
  if (targetPriceResult.value.price === null) return 'target-row-pending'

  // Compare with current price (approximated via market cap / shares)
  // If price available, compare; otherwise just show the target price
  return 'target-row-calculated'
}

function getTargetPriceErrorText(): string {
  const error = targetPriceResult.value.error
  if (!error) return ''
  switch (error) {
    case 'SHARES_MISSING': return '缺总股本'
    case 'SHARES_ZERO': return '总股本为0'
    case 'METRIC_ZERO': return '指标为0'
    case 'METRIC_NEGATIVE': return '指标为负'
    case 'VALUATION_INVALID': return '估值无效'
    default: return '计算失败'
  }
}

function getTargetPriceTooltip(): string {
  const stock = props.stock
  if (stock.prrTargetPriceConfig?.enabled && stock.targetPriceMethod === 'prr') {
    const prrConfig = stock.prrTargetPriceConfig
    const buyTargetPR = prrConfig.buyTargetPR ?? prrConfig.targetPR
    const sellTargetPR = prrConfig.sellTargetPR ?? prrConfig.targetPR
    let text = `PRR目标: ${prrConfig.targetPR.toFixed(2)}PR`
    if (buyTargetPR !== prrConfig.targetPR || sellTargetPR !== prrConfig.targetPR) {
      text += ` (买入: ${buyTargetPR.toFixed(2)}PR, 卖出: ${sellTargetPR.toFixed(2)}PR)`
    }
    return text
  }
  const config = stock.targetPriceConfig
  if (!config) return ''

  const method = config.valuationType === 1 ? '市值/FCF' : '市值/净利润'
  return `${method} × ${config.targetValuation.toFixed(1)}`
}

function onTargetPriceSaved() {
  // Config saved, targetPriceResult will auto-update via computed
}
</script>

<style scoped>
.stock-card {
  position: relative;
  background-color: var(--bg-card);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-xl, 12px);
  padding: 20px;
  cursor: pointer;
  transition: border-color var(--transition-base), box-shadow var(--transition-base), transform var(--transition-fast);
}

.stock-card:hover {
  border-color: var(--border-hover);
  box-shadow: var(--shadow-md);
}

.stock-card.is-updating {
  opacity: 0.8;
  pointer-events: none;
}

.updating-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: var(--bg-overlay);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  z-index: 10;
  border-radius: var(--radius-xl, 12px);
  color: white;
  font-size: 14px;
  font-weight: 500;
}

.spinner-sm {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Header */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.stock-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.stock-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stock-code {
  font-size: 13px;
  color: var(--text-muted);
}

.market-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
  border-radius: var(--radius-sm, 4px);
  flex-shrink: 0;
  letter-spacing: 0.02em;
}

/* Market Cap */
.market-cap-row {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.metric-label {
  font-size: 12px;
  color: var(--text-muted);
}

.metric-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}

.rate-warning {
  color: var(--color-warning);
  font-weight: bold;
  cursor: help;
  font-size: 12px;
}

/* Valuations */
.valuation-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
  margin-bottom: 14px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border-primary);
}

.valuation-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.valuation-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-secondary);
}

.valuation-value {
  font-size: 26px;
  font-weight: 700;
  line-height: 1.2;
}

.valuation-value.val-low { color: var(--val-low); }
.valuation-value.val-medium { color: var(--val-medium); }
.valuation-value.val-high { color: var(--val-high); }
.valuation-value.val-negative { color: var(--val-negative); }
.valuation-value.val-na { color: var(--val-na); }

/* PRR valuation text colors */
.valuation-value.val-low { color: var(--val-low) !important; }
.valuation-value.val-medium { color: var(--val-medium) !important; }
.valuation-value.val-high { color: var(--val-high) !important; }
.valuation-value.val-unknown { color: var(--val-na) !important; }

/* Valuation background classes */
.valuation-item.val-low-bg {
  background-color: var(--val-low-bg);
  border-radius: var(--radius-md, 6px);
  padding: 8px 10px;
}
.valuation-item.val-medium-bg {
  background-color: var(--val-medium-bg);
  border-radius: var(--radius-md, 6px);
  padding: 8px 10px;
}
.valuation-item.val-high-bg {
  background-color: var(--val-high-bg);
  border-radius: var(--radius-md, 6px);
  padding: 8px 10px;
}
.valuation-item.val-negative-bg {
  background-color: var(--val-negative-bg);
  border-radius: var(--radius-md, 6px);
  padding: 8px 10px;
}
.valuation-item.val-na-bg {
  background-color: var(--val-na-bg);
  border-radius: var(--radius-md, 6px);
  padding: 8px 10px;
}

/* Info icon & tooltip */
.info-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  font-size: 11px;
  font-weight: 600;
  font-style: normal;
  color: var(--text-muted);
  background-color: var(--bg-tertiary);
  border-radius: 50%;
  cursor: help;
  position: relative;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  flex-shrink: 0;
  transition: background-color var(--transition-fast), color var(--transition-fast);
  line-height: 1;
}

.info-icon:hover {
  background-color: var(--brand-primary-light);
  color: var(--brand-primary);
}

.tooltip-popup {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background-color: var(--bg-card);
  color: var(--text-primary);
  padding: 8px 12px;
  border-radius: var(--radius-md, 6px);
  font-size: 12px;
  font-weight: 400;
  white-space: nowrap;
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--border-secondary);
  z-index: 100;
  pointer-events: none;
  line-height: 1.5;
}

.tooltip-popup::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 6px solid transparent;
  border-top-color: var(--border-secondary);
}

.na-text {
  color: var(--text-muted);
  font-size: 16px;
}

/* Target Price Row */
.target-price-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 14px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border-primary);
}

.target-price-area {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  cursor: pointer;
  padding: 8px 10px;
  background-color: var(--bg-secondary);
  border-radius: var(--radius-md, 6px);
  transition: background-color var(--transition-fast);
}

.target-price-area:hover {
  background-color: var(--bg-tertiary);
}

.target-price-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-secondary);
}

.target-price-detail {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.tp-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.tp-label {
  font-size: 12px;
  color: var(--text-muted);
  min-width: 2.2em;
}

.tp-pct {
  font-size: 11px;
  font-weight: 600;
  margin-left: auto;
}

.price-num {
  font-size: 15px;
  font-weight: 700;
  color: var(--brand-primary);
  line-height: 1.3;
}

.price-unit {
  font-size: 11px;
  color: var(--text-muted);
}

.error-text {
  font-size: 13px;
  color: var(--color-danger);
}

.target-row-calculated .price-num {
  color: var(--brand-primary);
}

.target-row-error .target-price-area {
  background-color: var(--val-negative-bg);
}

.target-row-pending .target-price-area {
  opacity: 0.7;
}

/* Config button */
.config-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md, 6px);
  color: var(--text-muted);
  cursor: pointer;
  transition: all var(--transition-fast);
  flex-shrink: 0;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.config-btn:hover {
  background-color: var(--brand-primary-light);
  border-color: var(--brand-primary);
  color: var(--brand-primary);
}

/* Ensure config-btn icon is centered and sized appropriately */
.config-btn svg {
  width: 18px;
  height: 18px;
}

/* Empty/unconfigured state */
.target-price-empty {
  cursor: pointer;
  margin-bottom: 14px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border-primary);
  min-height: 44px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.target-price-empty:hover .unconfigured-text {
  color: var(--brand-primary);
}

.unconfigured-text {
  font-size: 14px;
  color: var(--text-muted);
  transition: color var(--transition-fast);
}

.hint-text {
  font-size: 11px;
  color: var(--text-muted);
  margin-left: 6px;
  opacity: 0.7;
}

@media (max-width: 640px) {
  .target-price-empty {
    padding: 10px 12px;
    margin-bottom: 12px;
  }

  .unconfigured-text {
    font-size: 13px;
  }

  .hint-text {
    font-size: 10px;
  }
}

/* Metrics Grid */
.metrics-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.metric-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.metric-item .metric-label {
  font-size: 11px;
  color: var(--text-muted);
}

.metric-item .metric-value {
  font-size: 14px;
  font-weight: 600;
}

.metric-low { color: var(--val-low) !important; }
.metric-medium { color: var(--val-medium) !important; }
.metric-high { color: var(--val-high) !important; }
.metric-na { color: var(--text-muted) !important; }

.text-positive { color: var(--val-low); }
.text-negative { color: var(--val-negative); }

/* PRR Formula Dropdown */
.prr-formula-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 3px;
  transition: background-color var(--transition-fast), color var(--transition-fast);
  flex-shrink: 0;
  line-height: 1;
}

.prr-formula-btn:hover {
  background-color: var(--brand-primary-light);
  color: var(--brand-primary);
}

.prr-formula-btn svg {
  display: block;
}

.valuation-label {
  position: relative;
}

.prr-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: auto;
  z-index: 50;
  min-width: 170px;
  background-color: var(--bg-card);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md, 6px);
  box-shadow: var(--shadow-lg);
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.prr-dropdown-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 7px 10px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  color: var(--text-primary);
  border-radius: var(--radius-sm, 4px);
  text-align: left;
  transition: background-color var(--transition-fast);
  white-space: nowrap;
}

.prr-dropdown-item:hover {
  background-color: var(--bg-secondary);
}

.prr-dropdown-item.is-active {
  background-color: var(--brand-primary-light);
  color: var(--brand-primary);
  font-weight: 600;
}

.prr-dropdown-name {
  flex: 1;
  min-width: 0;
}

.prr-dropdown-value {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  flex-shrink: 0;
}

.prr-dropdown-item.is-active .prr-dropdown-value {
  color: var(--brand-primary);
}

/* PRR Badge in Target Price */
.prr-badge {
  display: inline-flex;
  align-items: center;
  padding: 1px 5px;
  font-size: 9px;
  font-weight: 700;
  color: var(--brand-primary);
  background-color: var(--brand-primary-light);
  border-radius: 3px;
  letter-spacing: 0.02em;
  line-height: 1.3;
}

/* PRR Target Config Button */
.prr-target-config-btn {
  margin-left: 0;
}

.prr-target-config-btn svg {
  color: var(--brand-primary);
}

.prr-target-config-btn:hover svg {
  color: var(--brand-primary);
}

/* Footer */
.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--border-primary);
}

.update-time {
  font-size: 11px;
  color: var(--text-muted);
}

.arrow {
  font-size: 16px;
  color: var(--brand-primary);
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.stock-card:hover .arrow {
  opacity: 1;
}

/* Tag Row */
.tag-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border-primary);
}

.tag-chips-wrapper {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.tag-overflow {
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 600;
}

.tag-add-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  font-size: 16px;
  font-weight: 700;
  line-height: 1;
  color: var(--text-muted);
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 50%;
  cursor: pointer;
  transition: all var(--transition-fast);
  padding: 0;
  flex-shrink: 0;
}

.tag-add-btn:hover {
  color: var(--brand-primary);
  border-color: var(--brand-primary);
  background-color: var(--brand-primary-light);
}

@media (max-width: 640px) {
  .stock-card {
    padding: 16px;
  }

  .valuation-row {
    gap: 10px;
  }

  .valuation-value {
    font-size: 22px;
  }

  .metric-value {
    font-size: 16px;
  }

  .card-header {
    flex-direction: row;
    align-items: center;
    gap: 8px;
  }

  .market-cap-row {
    margin-bottom: 12px;
  }

  /* Target price row mobile adjustments */
  .target-price-row {
    margin-bottom: 12px;
    padding-bottom: 12px;
  }

  .target-price-area {
    padding: 10px 12px;
  }

  .target-price-label {
    font-size: 11px;
  }

  .price-num {
    font-size: 14px;
  }

  .price-unit {
    font-size: 10px;
  }

  .tp-label {
    font-size: 11px;
  }

  .tp-pct {
    font-size: 10px;
  }

  /* Config button already 44x44, ensure icon scales */
  .config-btn svg {
    width: 16px;
    height: 16px;
  }

  /* Prevent horizontal scroll */
  .stock-card {
    max-width: 100%;
    overflow-x: hidden;
  }

  /* PRR dropdown aligns to the right on mobile to avoid overflow clipping */
  .prr-dropdown {
    left: auto;
    right: 0;
  }
}
</style>