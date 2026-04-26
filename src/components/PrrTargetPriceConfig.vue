<template>
  <Teleport to="body">
    <!-- Overlay -->
    <Transition name="fade">
      <div v-if="visible" class="config-overlay" @click="handleCancel">
        <!-- Modal/Panel -->
        <Transition name="slide-up">
          <div
            v-if="visible"
            class="config-panel"
            :class="{ 'is-mobile': isMobile }"
            @click.stop
          >
            <!-- Header -->
            <div class="panel-header">
              <h3 class="panel-title">PRR 目标价设置</h3>
              <button
                class="close-btn"
                @click="handleCancel"
                aria-label="关闭"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <!-- Content -->
            <div class="panel-content">
              <!-- Formula Selection Toggle -->
              <div class="config-section">
                <label class="section-label">估值公式</label>
                <div class="toggle-group formula-toggle-group">
                  <button
                    v-for="formula in formulaOptions"
                    :key="formula.type"
                    class="toggle-btn"
                    :class="{ 'is-active': localFormulaType === formula.type }"
                    @click="localFormulaType = formula.type"
                    type="button"
                  >
                    <span class="toggle-label-row">
                      <span class="toggle-label">{{ formula.name }}</span>
                      <span v-if="getFormulaCurrentValue(formula.type) !== null" class="toggle-value font-mono-nums">
                        {{ getFormulaCurrentValue(formula.type)?.toFixed(2) }}PR
                      </span>
                      <span v-else class="toggle-value font-mono-nums toggle-value-na">-</span>
                    </span>
                    <span class="toggle-desc">{{ formula.expression }}</span>
                  </button>
                </div>
              </div>

              <!-- Target PR Slider -->
              <div class="config-section">
                <div class="slider-header">
                  <label class="section-label">目标 PR</label>
                  <div class="slider-value-wrapper">
                    <input
                      type="number"
                      class="pr-input font-mono-nums"
                      v-model.number="localTargetPR"
                      :min="0.1"
                      :max="2.0"
                      :step="0.01"
                    />
                    <span class="pr-unit">PR</span>
                  </div>
                </div>
                <div class="slider-container">
                  <input
                    type="range"
                    class="valuation-slider"
                    :min="0.1"
                    :max="2.0"
                    :step="0.01"
                    v-model.number="localTargetPR"
                  />
                  <div class="slider-labels">
                    <span>0.1</span>
                    <span>1.0</span>
                    <span>2.0</span>
                  </div>
                </div>

                <!-- Quick Preset Buttons -->
                <div class="preset-buttons">
                  <button
                    class="preset-btn"
                    :class="{ 'is-active': Math.abs(localTargetPR - 0.4) < 0.005 }"
                    @click="localTargetPR = 0.4"
                    type="button"
                  >
                    0.4PR<span class="preset-desc">（4折）</span>
                  </button>
                  <button
                    class="preset-btn"
                    :class="{ 'is-active': Math.abs(localTargetPR - 0.5) < 0.005 }"
                    @click="localTargetPR = 0.5"
                    type="button"
                  >
                    0.5PR<span class="preset-desc">（5折）</span>
                  </button>
                  <button
                    class="preset-btn"
                    :class="{ 'is-active': Math.abs(localTargetPR - 0.6) < 0.005 }"
                    @click="localTargetPR = 0.6"
                    type="button"
                  >
                    0.6PR<span class="preset-desc">（6折）</span>
                  </button>
                  <button
                    class="preset-btn"
                    :class="{ 'is-active': Math.abs(localTargetPR - 1.0) < 0.005 }"
                    @click="localTargetPR = 1.0"
                    type="button"
                  >
                    1.0PR<span class="preset-desc">（合理）</span>
                  </button>
                </div>
              </div>

              <!-- Real-time Calculation Result -->
              <div class="config-section result-section">
                <label class="section-label">计算结果</label>
                <div class="calculation-result">
                  <div v-if="calculationError" class="error-message">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <span>{{ errorMessage }}</span>
                  </div>
                  <div v-else-if="calculatedPrice !== null" class="price-display">
                    <span class="price-label">目标价</span>
                    <span class="price-value font-mono-nums">{{ calculatedPrice.toFixed(2) }}</span>
                    <span class="price-unit">{{ priceUnit }}</span>
                  </div>
                  <div v-else class="waiting-message">
                    <span>调整上方参数查看目标价</span>
                  </div>
                </div>

                <!-- Formula Preview -->
                <div class="formula-explain" :class="{ 'has-error': calculationError }">
                  <span
                    class="info-trigger"
                    @mouseenter="showFormula = true"
                    @mouseleave="showFormula = false"
                    @touchstart="showFormula = true"
                    @touchend="showFormula = false"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                      <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                  </span>
                  <div class="formula-content">
                    <div class="formula-line">
                      <span class="formula-label">公式</span>
                      <span class="formula-text">目标市值 = targetPR × ROE × 净利润（基础市赚率反推）</span>
                    </div>
                    <div class="formula-line">
                      <span class="formula-label">计算</span>
                      <span class="formula-text">{{ formulaCalcText }}</span>
                    </div>
                    <div class="formula-line">
                      <span class="formula-label">结果</span>
                      <span class="formula-text">
                        目标价 = {{ targetMarketValue !== null ? formatYi(targetMarketValue) : '?' }} / {{ stock?.totalShares ?? '?' }}亿股 = {{ calculatedPrice?.toFixed(2) ?? '?' }} {{ priceUnit }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Price Comparison -->
                <div v-if="calculatedPrice !== null && stock" class="price-comparison">
                  <div class="comparison-item">
                    <span class="comparison-label">当前价</span>
                    <span class="comparison-value font-mono-nums">{{ stock.marketCap > 0 ? '≈' : '' }}{{ currentPriceDisplay }}</span>
                  </div>
                  <div class="comparison-item" :class="priceChangeClass">
                    <span class="comparison-label">空间</span>
                    <span class="comparison-value font-mono-nums">{{ priceChangeText }}</span>
                  </div>
                </div>
              </div>

              <!-- Current Stock Metrics (Reference) -->
              <div v-if="stock" class="metrics-reference">
                <div class="metric-row">
                  <span class="metric-label">ROE</span>
                  <span class="metric-value font-mono-nums">{{ stock.roe !== null && stock.roe !== undefined ? `${stock.roe.toFixed(2)}%` : '-' }}</span>
                </div>
                <div class="metric-row">
                  <span class="metric-label">净利润</span>
                  <span class="metric-value font-mono-nums">{{ formatYi(stock.netProfit) }}</span>
                </div>
                <div class="metric-row">
                  <span class="metric-label">总股本</span>
                  <span class="metric-value font-mono-nums">
                    {{ stock.totalShares !== null ? `${stock.totalShares} 亿股` : '待输入' }}
                  </span>
                </div>
                <div class="metric-row">
                  <span class="metric-label">总市值</span>
                  <span class="metric-value font-mono-nums">{{ formatYi(stock.marketCap) }}</span>
                </div>
              </div>
            </div>

            <!-- Footer Actions -->
            <div class="panel-footer">
              <button
                class="btn btn-secondary"
                @click="handleCancel"
                type="button"
              >
                取消
              </button>
              <button
                class="btn btn-primary"
                @click="handleConfirm"
                :disabled="!canConfirm"
                type="button"
              >
                确认保存
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import type { PRRFormulaType, PRRTargetPriceConfig } from '@/types/prr'
import { useStockListStore } from '@/stores/stockListStore'
import { calculatePRRTargetPrice, type PRRTargetPriceError } from '@/utils/prr-target-price'
import { formatYi } from '@/utils/formatters'
import { logger } from '@/utils/logger'

const props = defineProps<{
  stockId: string
  visible: boolean
  initialConfig: PRRTargetPriceConfig | null
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'saved'): void
}>()

// Store
const stockListStore = useStockListStore()

// Mobile detection
const isMobile = ref(false)
let resizeHandler: (() => void) | null = null

// Local state
const localFormulaType = ref<PRRFormulaType>('base')
const localTargetPR = ref(0.5)
const showFormula = ref(false)

// Formula options
const formulaOptions: Array<{
  type: PRRFormulaType
  name: string
  expression: string
}> = [
  { type: 'base', name: '基础市赚率', expression: 'PR = PE / ROE' },
  { type: 'adjusted', name: '修正市赚率', expression: 'PR = N × PE / ROE' },
  { type: 'cycle', name: '周期市赚率', expression: 'PR = PB × 100 / ROE²' },
  { type: 'index', name: '指数市赚率', expression: 'PR = PE² / PB / 100' },
  { type: 'derived', name: '衍生市赚率', expression: 'PR = PE / (k × ROA)' }
]

// Get stock data
const stock = computed(() => {
  return stockListStore.stocks.find(s => s.id === props.stockId) || null
})

// Price unit based on stock market
const priceUnit = computed(() => {
  return stock.value?.market === 'A' ? '元' : '港元'
})

// Current stock price (market cap / total shares)
const currentPrice = computed(() => {
  if (!stock.value || !stock.value.totalShares || stock.value.totalShares === 0) {
    return null
  }
  return stock.value.marketCap / stock.value.totalShares
})

const currentPriceDisplay = computed(() => {
  if (currentPrice.value === null) return '-'
  return `${currentPrice.value.toFixed(2)} ${priceUnit.value}`
})

// Get PRR value for each formula type
function getFormulaCurrentValue(formulaType: PRRFormulaType): number | null {
  if (!stock.value) return null
  switch (formulaType) {
    case 'base':
      return stock.value.prrBase ?? null
    case 'adjusted':
      return stock.value.prrAdjusted ?? null
    case 'cycle':
      return stock.value.prrCycle ?? null
    case 'index':
      return stock.value.prrIndex ?? null
    case 'derived':
      return stock.value.prrDerived ?? null
    default:
      return null
  }
}

// Initialize from props
watch(() => props.visible, (isVisible) => {
  if (isVisible) {
    initializeFromProps()
    checkMobile()
  }
}, { immediate: true })

function initializeFromProps() {
  if (props.initialConfig) {
    localFormulaType.value = props.initialConfig.formulaType
    localTargetPR.value = props.initialConfig.targetPR
  } else {
    // Defaults
    localFormulaType.value = 'base'
    localTargetPR.value = 0.5
  }
}

function checkMobile() {
  if (typeof window !== 'undefined') {
    isMobile.value = window.innerWidth <= 768
    resizeHandler = () => {
      isMobile.value = window.innerWidth <= 768
    }
    window.addEventListener('resize', resizeHandler)
  }
}

onUnmounted(() => {
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler)
    resizeHandler = null
  }
})

// Target market value calculation
const targetMarketValue = computed(() => {
  if (!stock.value) return null
  if (stock.value.roe === null || stock.value.roe === undefined) return null
  if (stock.value.netProfit === null || stock.value.netProfit === 0) return null
  return localTargetPR.value * stock.value.roe * stock.value.netProfit
})

// Calculation result
const calculationResult = computed(() => {
  if (!stock.value) {
    return { price: null as number | null, error: null as PRRTargetPriceError | null }
  }

  return calculatePRRTargetPrice({
    targetPR: localTargetPR.value,
    roe: stock.value.roe ?? null,
    netProfit: stock.value.netProfit ?? null,
    totalShares: stock.value.totalShares ?? null
  })
})

const calculatedPrice = computed(() => calculationResult.value.price)
const calculationError = computed(() => calculationResult.value.error)

const errorMessage = computed(() => {
  switch (calculationError.value) {
    case 'SHARES_MISSING':
      return '缺少总股本数据'
    case 'SHARES_ZERO':
      return '总股本不能为零'
    case 'ROE_ZERO':
      return '请先获取ROE数据'
    case 'NETPROFIT_ZERO':
      return '缺少净利润数据'
    case 'TARGET_PR_INVALID':
      return '目标PR值无效'
    default:
      return '计算失败'
  }
})

// Formula calculation text for display
const formulaCalcText = computed(() => {
  if (!stock.value) return '-'
  const roe = stock.value.roe ?? null
  const netProfit = stock.value.netProfit ?? null
  if (roe === null || netProfit === null) return '-'
  return `${localTargetPR.value.toFixed(2)} × ${roe.toFixed(2)}% × ${formatYi(netProfit)}`
})

// Price change comparison
const priceChangePercent = computed(() => {
  if (calculatedPrice.value === null || currentPrice.value === null || currentPrice.value === 0) {
    return null
  }
  return ((calculatedPrice.value - currentPrice.value) / currentPrice.value) * 100
})

const priceChangeText = computed(() => {
  if (priceChangePercent.value === null) return '-'
  const sign = priceChangePercent.value >= 0 ? '+' : ''
  return `${sign}${priceChangePercent.value.toFixed(1)}%`
})

const priceChangeClass = computed(() => {
  if (priceChangePercent.value === null) return ''
  if (priceChangePercent.value > 0) return 'up'
  if (priceChangePercent.value < 0) return 'down'
  return ''
})

// Can confirm
const canConfirm = computed(() => {
  if (calculationError.value) {
    return false
  }
  return calculatedPrice.value !== null || stock.value?.totalShares === null
})

// Handlers
function handleCancel() {
  emit('update:visible', false)
}

async function handleConfirm() {
  try {
    const config: PRRTargetPriceConfig = {
      enabled: true,
      formulaType: localFormulaType.value,
      targetPR: localTargetPR.value
    }

    await stockListStore.updatePrrTargetPriceConfig(props.stockId, config)
    await stockListStore.updatePrrFormula(props.stockId, localFormulaType.value)

    logger.info('PrrTargetPriceConfig', 'PRR target price config saved', {
      stockId: props.stockId,
      config
    })
    emit('saved')
    emit('update:visible', false)
  } catch (err) {
    logger.error('PrrTargetPriceConfig', 'Failed to save PRR target price config', { error: err })
  }
}
</script>

<style scoped>
/* Overlay */
.config-overlay {
  position: fixed;
  inset: 0;
  background-color: var(--bg-overlay);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Panel */
.config-panel {
  background-color: var(--bg-card);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
  width: 100%;
  max-width: 520px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Mobile: bottom sheet */
.config-panel.is-mobile {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  max-width: 100%;
  max-height: 85vh;
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  border: none;
  border-top: 1px solid var(--border-primary);
}

/* Header */
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--border-primary);
  flex-shrink: 0;
}

.panel-title {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  color: var(--text-muted);
  transition: background-color var(--transition-fast), color var(--transition-fast);
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  cursor: pointer;
}

.close-btn:hover {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

/* Content */
.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

/* Sections */
.config-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.section-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

/* Toggle Group */
.toggle-group {
  display: grid;
  gap: var(--space-2);
}

.formula-toggle-group {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.toggle-btn {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--space-3);
  padding-left: var(--space-3);
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  min-height: 44px;
  text-align: left;
  position: relative;
  flex: 1 1 140px;
  min-width: 120px;
  
  /* Active left-border highlight via pseudo-element */
  overflow: hidden;
}

.toggle-btn::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background-color: transparent;
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  transition: background-color var(--transition-fast);
}

.toggle-btn:hover {
  border-color: var(--border-hover);
  background-color: var(--bg-tertiary);
}

.toggle-btn.is-active {
  background-color: var(--brand-primary-light);
  border-color: var(--brand-primary);
  box-shadow: 0 0 0 1px var(--brand-primary);
}

.toggle-btn.is-active::before {
  background-color: var(--brand-primary);
}

.toggle-btn .toggle-label-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  width: 100%;
  gap: var(--space-2);
}

.toggle-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.toggle-desc {
  font-size: 11px;
  color: var(--text-muted);
}

.toggle-value {
  font-size: 11px;
  color: var(--brand-primary);
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}

.toggle-value-na {
  color: var(--text-muted);
}

.toggle-btn.is-active .toggle-label {
  color: var(--brand-primary);
}

/* Slider */
.slider-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.slider-value-wrapper {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.pr-input {
  width: 80px;
  padding: var(--space-2);
  background-color: var(--bg-input);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  font-size: 16px;
  font-weight: 600;
  color: var(--brand-primary);
  text-align: right;
  min-height: 36px;
}

.pr-input:focus {
  outline: none;
  border-color: var(--brand-primary);
}

.pr-unit {
  font-size: 14px;
  color: var(--text-muted);
}

.slider-container {
  padding: var(--space-2) 0;
}

.valuation-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 8px;
  background: var(--bg-secondary);
  border-radius: 4px;
  outline: none;
  cursor: pointer;
}

.valuation-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 24px;
  height: 24px;
  background: var(--brand-primary);
  border-radius: 50%;
  cursor: pointer;
  box-shadow: var(--shadow-sm);
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
}

.valuation-slider::-webkit-slider-thumb:hover {
  transform: scale(1.1);
  box-shadow: var(--shadow-md);
}

.valuation-slider::-moz-range-thumb {
  width: 24px;
  height: 24px;
  background: var(--brand-primary);
  border-radius: 50%;
  cursor: pointer;
  border: none;
  box-shadow: var(--shadow-sm);
}

.slider-labels {
  display: flex;
  justify-content: space-between;
  margin-top: var(--space-1);
  font-size: 11px;
  color: var(--text-muted);
}

/* Preset Buttons */
.preset-buttons {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-2);
  margin-top: var(--space-2);
}

.preset-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: var(--space-2) var(--space-1);
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  min-height: 44px;
}

.preset-btn:hover {
  border-color: var(--border-hover);
  background-color: var(--bg-tertiary);
}

.preset-btn.is-active {
  background-color: var(--brand-primary-light);
  border-color: var(--brand-primary);
  color: var(--brand-primary);
}

.preset-desc {
  font-size: 10px;
  font-weight: 400;
  color: var(--text-muted);
}

.preset-btn.is-active .preset-desc {
  color: var(--brand-primary);
  opacity: 0.8;
}

/* Calculation Result */
.result-section {
  padding: var(--space-4);
  background-color: var(--bg-secondary);
  border-radius: var(--radius-lg);
}

.calculation-result {
  margin-bottom: var(--space-3);
}

.error-message {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-danger);
  font-size: 13px;
}

.price-display {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
}

.price-label {
  font-size: 13px;
  color: var(--text-muted);
}

.price-value {
  font-size: 32px;
  font-weight: 700;
  color: var(--brand-primary);
}

.price-unit {
  font-size: 14px;
  color: var(--text-muted);
}

.waiting-message {
  color: var(--text-muted);
  font-size: 13px;
}

/* Formula Explain */
.formula-explain {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  font-size: 12px;
  color: var(--text-muted);
  position: relative;
}

.formula-explain.has-error {
  opacity: 0.5;
}

.info-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  color: var(--brand-primary);
  cursor: help;
  flex-shrink: 0;
  margin-top: 2px;
}

.formula-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.formula-line {
  display: flex;
  gap: var(--space-2);
}

.formula-label {
  color: var(--text-muted);
  flex-shrink: 0;
  width: 40px;
}

.formula-text {
  color: var(--text-primary);
}

/* Price Comparison */
.price-comparison {
  display: flex;
  gap: var(--space-4);
  margin-top: var(--space-3);
  padding-top: var(--space-3);
  border-top: 1px solid var(--border-primary);
}

.comparison-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.comparison-item.up .comparison-value {
  color: var(--color-danger);
}

.comparison-item.down .comparison-value {
  color: var(--color-success);
}

.comparison-label {
  font-size: 11px;
  color: var(--text-muted);
}

.comparison-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

/* Metrics Reference */
.metrics-reference {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2);
  padding: var(--space-3);
  background-color: var(--bg-secondary);
  border-radius: var(--radius-md);
}

.metric-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.metric-row .metric-label {
  font-size: 11px;
  color: var(--text-muted);
}

.metric-row .metric-value {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

/* Footer */
.panel-footer {
  display: flex;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-5);
  border-top: 1px solid var(--border-primary);
  flex-shrink: 0;
}

.btn {
  flex: 1;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all var(--transition-fast);
  min-height: 44px;
}

.btn-secondary {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-primary);
}

.btn-secondary:hover {
  background-color: var(--bg-tertiary);
}

.btn-primary {
  background-color: var(--brand-primary);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: var(--brand-primary-hover);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--transition-base);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform var(--transition-base), opacity var(--transition-base);
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(20px);
  opacity: 0;
}

/* Mobile styles */
@media (max-width: 768px) {
  .config-panel.is-mobile {
    max-height: 85vh;
  }

  .panel-content {
    padding: var(--space-4);
  }

  .formula-toggle-group {
    flex-direction: column;
  }
  .toggle-btn {
    flex: 1 1 auto;
    min-width: 0;
  }

  .preset-buttons {
    grid-template-columns: repeat(2, 1fr);
  }

  .metrics-reference {
    grid-template-columns: 1fr 1fr;
  }

  .panel-footer {
    padding: var(--space-4);
    gap: var(--space-3);
  }

  .price-comparison {
    flex-direction: column;
    gap: var(--space-2);
  }

  .panel-header {
    padding: var(--space-3) var(--space-4);
  }

  .panel-title {
    font-size: 15px;
  }

  .toggle-btn {
    padding: var(--space-3) var(--space-2);
  }

  .toggle-label {
    font-size: 12px;
  }

  .toggle-desc {
    font-size: 10px;
  }

  .price-value {
    font-size: 28px;
  }

  .btn {
    padding: var(--space-3);
    font-size: 13px;
  }

  .panel-footer {
    flex-direction: row;
    gap: var(--space-2);
  }

  .panel-footer .btn {
    flex: 1;
  }
}

/* Ensure slider is touch-friendly */
@media (max-width: 480px) {
  .valuation-slider {
    height: 44px;
  }

  .valuation-slider::-webkit-slider-thumb {
    width: 32px;
    height: 32px;
  }

  .valuation-slider::-moz-range-thumb {
    width: 32px;
    height: 32px;
  }
}

/* Touch targets - ensure minimum 44px */
.toggle-btn,
.btn,
.preset-btn {
  min-height: 44px;
  min-width: 44px;
}

/* Focus states */
.btn:focus-visible,
.toggle-btn:focus-visible,
.preset-btn:focus-visible,
.pr-input:focus-visible {
  outline: 2px solid var(--brand-primary);
  outline-offset: 2px;
}
</style>
