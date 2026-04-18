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
              <h3 class="panel-title">目标价设置</h3>
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
              <!-- Valuation Type Toggle -->
              <div class="config-section">
                <label class="section-label">估值方法</label>
                <div class="toggle-group">
                  <button
                    class="toggle-btn"
                    :class="{ 'is-active': localValuationType === 1 }"
                    @click="localValuationType = 1"
                    type="button"
                  >
                    <span class="toggle-label">现金流折现 (FCF)</span>
                    <span class="toggle-desc">市值 / 自由现金流</span>
                  </button>
                  <button
                    class="toggle-btn"
                    :class="{ 'is-active': localValuationType === 2 }"
                    @click="localValuationType = 2"
                    type="button"
                  >
                    <span class="toggle-label">市盈率 (Net Profit)</span>
                    <span class="toggle-desc">市值 / 净利润</span>
                  </button>
                </div>
              </div>

              <!-- Target Valuation Slider -->
              <div class="config-section">
                <div class="slider-header">
                  <label class="section-label">目标估值倍数</label>
                  <span class="slider-value font-mono-nums">{{ localTargetValuation.toFixed(1) }}</span>
                </div>
                <div class="slider-container">
                  <input
                    type="range"
                    class="valuation-slider"
                    :min="0.1"
                    :max="50"
                    :step="0.1"
                    v-model.number="localTargetValuation"
                  />
                  <div class="slider-labels">
                    <span>0.1</span>
                    <span>25</span>
                    <span>50</span>
                  </div>
                </div>
              </div>

              <!-- Manual Total Shares Input -->
              <div v-if="stock && stock.totalShares === null" class="config-section">
                <label class="section-label">
                  总股本（亿股）
                  <span class="required-hint">* 必填</span>
                </label>
                <input
                  type="number"
                  class="shares-input"
                  v-model.number="localTotalShares"
                  placeholder="例如：10.5"
                  min="0.001"
                  step="0.001"
                />
                <p class="input-hint">市值数据缺失，需要手动输入总股本才能计算目标价</p>
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

                <!-- Formula Explanation -->
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
                  <span class="formula-text">
                    {{ formulaText }}
                  </span>
                  <span v-if="showFormula && !calculationError" class="formula-detail">
                    {{ formulaDetail }}
                  </span>
                </div>
              </div>

              <!-- Current Stock Metrics (Reference) -->
              <div v-if="stock" class="metrics-reference">
                <div class="metric-row">
                  <span class="metric-label">
                    {{ localValuationType === 1 ? '自由现金流 (FCF)' : '净利润' }}
                  </span>
                  <span class="metric-value font-mono-nums">
                    {{ formatYi(localValuationType === 1 ? stock.freeCashFlow : stock.netProfit) }}
                  </span>
                </div>
                <div class="metric-row">
                  <span class="metric-label">净现金</span>
                  <span class="metric-value font-mono-nums">{{ formatYi(stock.netCash) }}</span>
                </div>
                <div class="metric-row">
                  <span class="metric-label">总股本</span>
                  <span class="metric-value font-mono-nums">
                    {{ stock.totalShares !== null ? `${stock.totalShares} 亿股` : '待输入' }}
                  </span>
                </div>
                <div class="metric-row" v-if="stock.currentRatio !== null">
                  <span class="metric-label">流动比率</span>
                  <span class="metric-value font-mono-nums">{{ stock.currentRatio.toFixed(2) }}</span>
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
import type { TargetPriceConfig } from '@/types/stock'
import { useStockStore } from '@/stores/stockStore'
import { calculateTargetPrice, type TargetPriceError } from '@/utils/targetPriceCalculator'
import { formatYi } from '@/utils/formatters'
import { logger } from '@/utils/logger'

const props = defineProps<{
  stockId: string
  visible: boolean
  initialConfig: TargetPriceConfig | null
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'saved'): void
}>()

// Store
const stockStore = useStockStore()

// Mobile detection
const isMobile = ref(false)
let resizeHandler: (() => void) | null = null

// Local state
const localValuationType = ref<1 | 2>(1)
const localTargetValuation = ref(10.0)
const localTotalShares = ref<number | null>(null)
const showFormula = ref(false)

// Get stock data
const stock = computed(() => {
  return stockStore.stocks.find(s => s.id === props.stockId) || null
})

// Price unit based on stock market
const priceUnit = computed(() => {
  return stock.value?.market === 'A' ? '元' : '港元'
})

// Initialize from props
watch(() => props.visible, (isVisible) => {
  if (isVisible) {
    initializeFromProps()
    checkMobile()
  }
}, { immediate: true })

// Watch for stock changes to update local shares
watch(() => stock.value?.totalShares, (newShares) => {
  if (newShares !== null && newShares !== undefined) {
    localTotalShares.value = newShares
  }
}, { immediate: true })

function initializeFromProps() {
  if (props.initialConfig) {
    localValuationType.value = props.initialConfig.valuationType
    localTargetValuation.value = props.initialConfig.targetValuation
  } else {
    // Defaults
    localValuationType.value = 1
    localTargetValuation.value = 10.0
  }
  // Initialize shares from stock
  if (stock.value?.totalShares !== null && stock.value?.totalShares !== undefined) {
    localTotalShares.value = stock.value.totalShares
  } else {
    localTotalShares.value = null
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

// Calculation result
const calculationResult = computed(() => {
  if (!stock.value) {
    return { price: null as number | null, error: null as TargetPriceError | null }
  }

  const totalShares = stock.value.totalShares ?? localTotalShares.value

  return calculateTargetPrice({
    targetValuation: localTargetValuation.value,
    valuationType: localValuationType.value,
    freeCashFlow: stock.value.freeCashFlow,
    netProfit: stock.value.netProfit,
    netCash: stock.value.netCash,
    totalShares,
    currentRatio: stock.value.currentRatio
  })
})

const calculatedPrice = computed(() => calculationResult.value.price)
const calculationError = computed(() => calculationResult.value.error)

const errorMessage = computed(() => {
  switch (calculationError.value) {
    case 'SHARES_MISSING':
      return '总股本数据缺失，请手动输入'
    case 'SHARES_ZERO':
      return '总股本不能为零'
    case 'METRIC_ZERO':
      return '该指标为零，无法计算目标价'
    case 'METRIC_NEGATIVE':
      return '该指标为负，无法计算目标价'
    case 'VALUATION_INVALID':
      return '估值倍数无效'
    default:
      return '计算失败'
  }
})

const formulaText = computed(() => {
  if (!stock.value) return '请先选择股票'

  const metricLabel = localValuationType.value === 1 ? 'FCF' : '净利润'
  const metricValue = localValuationType.value === 1 ? stock.value.freeCashFlow : stock.value.netProfit

  if (stock.value.currentRatio !== null && stock.value.currentRatio < 1.5) {
    return `市值 / ${metricLabel}`
  }
  return `(市值 - 净现金) / ${metricLabel}`
})

const formulaDetail = computed(() => {
  if (!stock.value) return ''

  const metricLabel = localValuationType.value === 1 ? '自由现金流' : '净利润'
  const metricValue = localValuationType.value === 1 ? stock.value.freeCashFlow : stock.value.netProfit
  const useNetCash = stock.value.currentRatio === null || stock.value.currentRatio >= 1.5

  if (useNetCash) {
    return `(${localTargetValuation.value} × ${formatYi(metricValue)} + ${formatYi(stock.value.netCash)}) / ${localTotalShares.value ?? '?'} = ${calculatedPrice.value?.toFixed(2) ?? '?'} ${priceUnit.value}`
  }
  return `(${localTargetValuation.value} × ${formatYi(metricValue)}) / ${localTotalShares.value ?? '?'} = ${calculatedPrice.value?.toFixed(2) ?? '?'} ${priceUnit.value}`
})

// Can confirm
const canConfirm = computed(() => {
  // Must have no error OR be a shares-missing error (which user can fix by entering shares)
  if (calculationError.value === 'SHARES_MISSING' && localTotalShares.value === null) {
    return false
  }
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
  // If shares missing and user entered them, update them first
  if (stock.value && stock.value.totalShares === null && localTotalShares.value !== null) {
    try {
      await stockStore.updateTotalShares(props.stockId, localTotalShares.value)
      logger.info('TargetPriceConfig', 'Total shares updated', { stockId: props.stockId, shares: localTotalShares.value })
    } catch (err) {
      logger.error('TargetPriceConfig', 'Failed to update total shares', { error: err })
      return
    }
  }

  // Save config
  try {
    await stockStore.updateTargetPriceConfig(props.stockId, {
      enabled: true,
      valuationType: localValuationType.value,
      targetValuation: localTargetValuation.value
    })
    logger.info('TargetPriceConfig', 'Target price config saved', {
      stockId: props.stockId,
      config: {
        enabled: true,
        valuationType: localValuationType.value,
        targetValuation: localTargetValuation.value
      }
    })
    emit('saved')
    emit('update:visible', false)
  } catch (err) {
    logger.error('TargetPriceConfig', 'Failed to save target price config', { error: err })
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
  max-width: 480px;
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

.required-hint {
  font-size: 11px;
  font-weight: 400;
  color: var(--color-danger);
}

/* Toggle Group */
.toggle-group {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2);
}

.toggle-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: var(--space-3);
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  min-height: 44px;
  text-align: left;
}

.toggle-btn:hover {
  border-color: var(--border-hover);
}

.toggle-btn.is-active {
  background-color: var(--brand-primary-light);
  border-color: var(--brand-primary);
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

.toggle-btn.is-active .toggle-label {
  color: var(--brand-primary);
}

/* Slider */
.slider-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.slider-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--brand-primary);
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

/* Shares Input */
.shares-input {
  width: 100%;
  padding: var(--space-3);
  background-color: var(--bg-input);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  font-size: 15px;
  color: var(--text-primary);
  transition: border-color var(--transition-fast);
  min-height: 44px;
}

.shares-input:focus {
  outline: none;
  border-color: var(--brand-primary);
}

.shares-input::placeholder {
  color: var(--text-muted);
}

.input-hint {
  font-size: 12px;
  color: var(--text-muted);
  margin: 0;
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
  align-items: center;
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
}

.formula-text {
  flex: 1;
}

.formula-detail {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background-color: var(--bg-card);
  color: var(--text-primary);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  font-size: 11px;
  white-space: nowrap;
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--border-primary);
  z-index: 10;
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

  .toggle-group {
    gap: var(--space-2);
  }

  .metrics-reference {
    grid-template-columns: 1fr;
  }

  .panel-footer {
    padding: var(--space-4);
    gap: var(--space-3);
  }

  .formula-detail {
    white-space: normal;
    max-width: 200px;
  }

  /* 375px specific adjustments */
  .config-panel.is-mobile {
    max-height: 90vh;
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

  .slider-value {
    font-size: 18px;
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
.btn {
  min-height: 44px;
  min-width: 44px;
}

.shares-input {
  min-height: 44px;
}

/* Focus states */
.btn:focus-visible,
.toggle-btn:focus-visible,
.shares-input:focus-visible {
  outline: 2px solid var(--brand-primary);
  outline-offset: 2px;
}
</style>