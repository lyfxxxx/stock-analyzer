<template>
  <div class="detail-view">
    <div v-if="isThisStockUpdating" class="updating-overlay">
      <div class="spinner"></div>
      <p>正在更新财报数据...</p>
      <p class="update-hint">请稍候</p>
    </div>

    <!-- Sub-header -->
    <div class="sub-header">
      <div class="sub-header-inner">
        <button class="back-button" @click="goBack">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
          返回
        </button>
        <h1 v-if="stock" class="page-title">{{ stock.name }} <span class="page-code font-mono-nums">{{ stock.code }}</span></h1>
        <div class="sub-header-actions">
          <button class="action-btn update-btn" :disabled="isThisStockUpdating" @click="handleUpdateFinancialData">
            <span v-if="isThisStockUpdating" class="spinner-sm"></span>
            <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="23 4 23 10 17 10"></polyline>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
            </svg>
            更新财报
          </button>
        </div>
      </div>
    </div>

    <main v-if="stock" class="detail-content">
      <!-- Currency Selector -->
      <div class="currency-bar">
        <label>显示币种：</label>
        <select v-model="displayCurrency" class="currency-select">
          <option value="HKD">港元 (HK$)</option>
          <option value="CNY">人民币 (¥)</option>
          <option value="USD">美元 ($)</option>
        </select>
      </div>

      <!-- Overview Cards -->
      <div class="overview-grid">
        <div class="overview-card">
          <span class="card-label">当前市值</span>
          <span class="card-value font-mono-nums">{{ formatDisplayCurrency(stock.marketCap) }}</span>
        </div>
        <div class="overview-card">
          <span class="card-label">净现金</span>
          <span class="card-value font-mono-nums">{{ formatDisplayCurrency(stock.netCash) }}</span>
        </div>
        <div class="overview-card" :class="{ 'projected': stock.freeCashFlowProjected }">
          <span class="card-label">
            自由现金流
            <span v-if="stock.freeCashFlowProjected" class="projected-badge">预测</span>
          </span>
          <span class="card-value font-mono-nums" :class="{ 'text-positive': stock.freeCashFlow > 0, 'text-negative': stock.freeCashFlow < 0 }">
            {{ formatDisplayCurrency(stock.freeCashFlow) }}
          </span>
        </div>
        <div class="overview-card" :class="{ 'projected': stock.netProfitProjected }">
          <span class="card-label">
            净利润
            <span v-if="stock.netProfitProjected" class="projected-badge">预测</span>
          </span>
          <span class="card-value font-mono-nums" :class="{ 'text-positive': stock.netProfit > 0, 'text-negative': stock.netProfit < 0 }">
            {{ formatDisplayCurrency(stock.netProfit) }}
          </span>
        </div>
        <div class="overview-card">
          <span class="card-label">
            PE
            <span class="info-trigger" @click.stop>
              ⓘ
              <span class="info-text">PE = 市值 / 净利润</span>
            </span>
            <span v-if="stock.peRatioProjected" class="projected-badge">预测</span>
          </span>
          <span class="card-value font-mono-nums" :class="getPeClass(stock.peRatio)">
            <template v-if="stock.peRatio !== null">{{ stock.peRatio.toFixed(1) }}x</template>
            <template v-else><span class="na-text">N/A</span></template>
          </span>
        </div>
        <div class="overview-card">
          <span class="card-label">
            流动比率
            <span class="info-trigger" @click.stop>
              ⓘ
              <span class="info-text">流动比率 = 流动资产 / 流动负债</span>
            </span>
            <span v-if="stock.currentRatioProjected" class="projected-badge">预测</span>
          </span>
          <span class="card-value font-mono-nums" :class="getCurrentRatioClass(stock.currentRatio)">
            <template v-if="stock.currentRatio !== null">{{ stock.currentRatio.toFixed(2) }}</template>
            <template v-else><span class="na-text">N/A</span></template>
          </span>
        </div>
      </div>

      <!-- Valuation Analysis -->
      <section class="section-card">
        <h2 class="section-title">估值分析</h2>
        <div class="valuation-grid">
          <div class="valuation-box" :class="[getValuationBgClass(getVal1()), { 'projected': stock.isUsingProjectedData }]">
            <div class="val-header">
              <span class="val-title">估值1 <span v-if="stock.isUsingProjectedData" class="projected-badge">预测</span></span>
              <span class="val-formula" v-if="stock.currentRatio !== null && stock.currentRatio < 1.5">
                市值 / FCF <span class="method-note">(流动比率 &lt; 1.5)</span>
              </span>
              <span class="val-formula" v-else>
                (市值 - 净现金) / FCF <span class="method-note">(流动比率 ≥ 1.5)</span>
              </span>
            </div>
            <div class="val-result font-mono-nums" :class="getValuationClass(getVal1())">
              <template v-if="stock.currentRatio !== null && stock.currentRatio < 1.5">
                <template v-if="stock.freeCashFlow > 0">{{ (stock.marketCap / stock.freeCashFlow).toFixed(2) }}</template>
                <template v-else>
                  <span class="na-text">N/A</span>
                  <span class="info-trigger" @click.stop>⇢<span class="info-text">自由现金流为负时不计算估值</span></span>
                </template>
              </template>
              <template v-else>
                <template v-if="stock.valuation1 !== null">{{ stock.valuation1.toFixed(2) }}</template>
                <template v-else>
                  <span class="na-text">N/A</span>
                  <span class="info-trigger" @click.stop>⇢<span class="info-text">自由现金流为负时不计算估值</span></span>
                </template>
              </template>
            </div>
          </div>
          <div class="valuation-box" :class="[getValuationBgClass(getVal2()), { 'projected': stock.isUsingProjectedData }]">
            <div class="val-header">
              <span class="val-title">估值2 <span v-if="stock.isUsingProjectedData" class="projected-badge">预测</span></span>
              <span class="val-formula" v-if="stock.currentRatio !== null && stock.currentRatio < 1.5">
                PE = 市值 / 净利润 <span class="method-note">(流动比率 &lt; 1.5)</span>
              </span>
              <span class="val-formula" v-else>
                (市值 - 净现金) / 净利润 <span class="method-note">(流动比率 ≥ 1.5)</span>
              </span>
            </div>
            <div class="val-result font-mono-nums" :class="getValuationClass(getVal2())">
              <template v-if="stock.currentRatio !== null && stock.currentRatio < 1.5">
                <template v-if="stock.peRatio !== null">{{ stock.peRatio.toFixed(2) }}</template>
                <template v-else><span class="na-text">N/A</span></template>
              </template>
              <template v-else>{{ stock.valuation2.toFixed(2) }}</template>
            </div>
          </div>
        </div>
        <div class="valuation-note">
          <span class="note-icon">ⓘ</span>
          <span class="note-text">
            流动比率 ≥ 1.5：使用 (市值 - 净现金) 为基础计算，反映股东真实回报<br>
            流动比率 &lt; 1.5：使用 市值 为基础计算，反映整体企业价值
          </span>
        </div>
      </section>

      <!-- Charts -->
      <div class="charts-grid">
        <ValuationChart
          title="自由现金流趋势"
          :yearly-data="stock.yearlyData"
          data-type="freeCashFlow"
          :display-currency="displayCurrency"
          :exchange-rates="exchangeRates"
          :source-currency="stock.baseCurrency"
        />
        <ValuationChart
          title="净利润趋势"
          :yearly-data="stock.yearlyData"
          data-type="netProfit"
          :display-currency="displayCurrency"
          :exchange-rates="exchangeRates"
          :source-currency="stock.baseCurrency"
        />
      </div>

      <!-- Historical Data -->
      <section class="section-card">
        <div class="table-header">
          <h2 class="section-title">历史数据</h2>
          <button @click="toggleSortOrder" class="sort-btn">
            {{ sortOrder === 'asc' ? '从早到晚' : '从晚到早' }}
          </button>
        </div>
        <div class="data-table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>年份</th>
                <th>自由现金流 ({{ currencyUnit }})</th>
                <th>净利润 ({{ currencyUnit }})</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="data in sortedYearlyData" :key="data.year">
                <td class="font-mono-nums">{{ data.year }}</td>
                <td class="font-mono-nums" :class="{ 'text-positive': data.freeCashFlow > 0, 'text-negative': data.freeCashFlow < 0 }">
                  {{ convertAndFormat(data.freeCashFlow) }}
                </td>
                <td class="font-mono-nums" :class="{ 'text-positive': data.netProfit > 0, 'text-negative': data.netProfit < 0 }">
                  {{ convertAndFormat(data.netProfit) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Actions -->
      <div class="actions-section">
        <button @click="deleteStock" :disabled="deleting" class="delete-btn">
          {{ deleting ? '删除中...' : '删除此股票' }}
        </button>
      </div>
    </main>

    <div v-else-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>加载中...</p>
    </div>

    <div v-else class="error-state">
      <p>未找到股票数据</p>
      <button @click="goBack" class="back-link">返回首页</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useStockStore } from '@/stores/stockStore'
import { fetchExchangeRates } from '@/api/exchangeRate'
import type { StockData } from '@/types/stock'
import ValuationChart from '@/components/ValuationChart.vue'
import { logger } from '@/utils/logger'
import { getValuationLevel } from '@/utils/formatters'

type CurrencyType = 'HKD' | 'CNY' | 'USD' | 'OTHER'

const router = useRouter()
const route = useRoute()
const stockStore = useStockStore()

const stock = ref<StockData | null>(null)
const loading = ref(true)
const deleting = ref(false)
const displayCurrency = ref<CurrencyType>('HKD')
const exchangeRates = ref<Record<string, number>>({ HKD: 1, USD: 7.75, CNY: 1.10 })
const sortOrder = ref<'asc' | 'desc'>('desc')

const isThisStockUpdating = computed(() =>
  stock.value ? stockStore.currentlyUpdatingIds.has(stock.value.id) : false
)

const sortedYearlyData = computed(() => {
  if (!stock.value) return []
  const data = [...stock.value.yearlyData]
  return sortOrder.value === 'asc'
    ? data.sort((a, b) => a.year - b.year)
    : data.sort((a, b) => b.year - a.year)
})

const currencyUnit = computed(() => {
  const symbols: Record<CurrencyType, string> = { HKD: '亿港元', CNY: '亿人民币', USD: '亿美元', OTHER: '亿' }
  return symbols[displayCurrency.value] || symbols.OTHER
})

onMounted(async () => {
  const id = route.params.id as string
  try {
    stock.value = await stockStore.getStockById(id)
    if (stock.value) {
      displayCurrency.value = (stock.value.baseCurrency as CurrencyType) || (stock.value.market === 'A' ? 'CNY' : 'HKD')
    }
    try {
      const result = await fetchExchangeRates()
      exchangeRates.value = result.rates
    } catch (e) {
      logger.error('StockDetailView', 'Failed to fetch exchange rates:', e)
    }
  } finally {
    loading.value = false
  }
})

function toggleSortOrder() {
  sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
}

function convertCurrency(value: number, toCurrency: CurrencyType): number {
  const sourceCurrency = stock.value?.baseCurrency || 'HKD'
  if (sourceCurrency === toCurrency) return value
  const rate = exchangeRates.value[toCurrency] || 1
  return value / rate
}

function formatDisplayCurrency(value: number): string {
  const converted = convertCurrency(value, displayCurrency.value)
  const unitNames: Record<CurrencyType, string> = { HKD: '亿港元', CNY: '亿人民币', USD: '亿美元', OTHER: '亿' }
  return `${converted.toFixed(2)}${unitNames[displayCurrency.value] || unitNames.OTHER}`
}

function convertAndFormat(value: number): string {
  const converted = convertCurrency(value, displayCurrency.value)
  const unitNames: Record<CurrencyType, string> = { HKD: '亿港元', CNY: '亿人民币', USD: '亿美元', OTHER: '亿' }
  return `${converted.toFixed(2)}${unitNames[displayCurrency.value] || unitNames.OTHER}`
}

function getVal1(): number | null {
  if (!stock.value) return null
  const s = stock.value
  if (s.currentRatio !== null && s.currentRatio < 1.5) {
    if (s.freeCashFlow <= 0) return null
    return s.marketCap / s.freeCashFlow
  }
  return s.valuation1
}

function getVal2(): number | null {
  if (!stock.value) return null
  const s = stock.value
  if (s.currentRatio !== null && s.currentRatio < 1.5) {
    return s.peRatio
  }
  return s.valuation2
}

function getValuationClass(value: number | null): string {
  if (value === null) return 'val-na'
  if (value < 0) return 'val-negative'
  if (value < 10) return 'val-low'
  if (value < 20) return 'val-medium'
  return 'val-high'
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

function getPeClass(value: number | null): string {
  if (value === null) return 'metric-na'
  if (value < 12) return 'metric-low'
  if (value < 20) return 'metric-medium'
  return 'metric-high'
}

function getCurrentRatioClass(value: number | null): string {
  if (value === null) return 'metric-na'
  return value >= 1.5 ? 'metric-low' : 'metric-medium'
}

async function deleteStock() {
  if (!stock.value) return
  if (!confirm('确定要删除这只股票吗？此操作不可撤销。')) return
  deleting.value = true
  try {
    await stockStore.deleteStock(stock.value.id)
    router.push('/')
  } finally {
    deleting.value = false
  }
}

async function handleUpdateFinancialData() {
  if (!stock.value || isThisStockUpdating.value) return
  try {
    const updatedStock = await stockStore.updateStockWithRecalculation(stock.value.id)
    if (updatedStock) stock.value = updatedStock
  } catch (e) {
    logger.error('StockDetailView', 'Failed to update financial data:', e)
    alert('更新失败，请重试')
  }
}

function goBack() { router.push('/') }
</script>

<style scoped>
.detail-view { min-height: 100vh; background-color: var(--bg-primary); position: relative; }

/* Updating overlay */
.updating-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background-color: var(--bg-overlay); display: flex; flex-direction: column;
  align-items: center; justify-content: center; z-index: 9999; color: white; gap: 12px;
}
.spinner-sm {
  width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite;
}
.update-hint { font-size: 14px; color: rgba(255,255,255,0.6); }

@keyframes spin { to { transform: rotate(360deg); } }

/* Sub-header */
.sub-header {
  background-color: var(--header-bg); border-bottom: 1px solid var(--header-border);
  box-shadow: var(--header-shadow); position: sticky; top: 0; z-index: 100;
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
}
.sub-header-inner {
  max-width: 1400px; margin: 0 auto; padding: 0 24px;
  display: flex; align-items: center; height: 52px; gap: 16px;
}
.back-button {
  display: flex; align-items: center; gap: 6px; background: none; border: none;
  color: var(--text-secondary); font-size: 14px; cursor: pointer;
  transition: color var(--transition-fast); padding: 0; font-family: var(--font-sans);
}
.back-button:hover { color: var(--text-primary); }
.page-title { margin: 0; font-size: 16px; font-weight: 600; color: var(--text-primary); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.page-code { font-size: 13px; color: var(--text-muted); font-weight: 400; }
.sub-header-actions { display: flex; gap: 8px; }

.action-btn {
  display: flex; align-items: center; gap: 6px; padding: 6px 14px;
  font-size: 13px; font-weight: 500; border-radius: var(--radius-md, 6px);
  cursor: pointer; transition: all var(--transition-fast); font-family: var(--font-sans);
}
.update-btn {
  background-color: var(--brand-primary); color: white; border: none;
}
.update-btn:hover:not(:disabled) { background-color: var(--brand-primary-hover); }
.update-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Main content */
.detail-content {
  max-width: 1400px; margin: 0 auto; padding: 24px 24px 48px;
  display: flex; flex-direction: column; gap: 24px;
}

/* Currency bar */
.currency-bar {
  display: flex; align-items: center; gap: 12px; padding: 12px 16px;
  background-color: var(--bg-card); border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg, 8px);
}
.currency-bar label { font-size: 14px; color: var(--text-secondary); }
.currency-select {
  padding: 6px 12px; background-color: var(--bg-input); border: 1px solid var(--border-primary);
  border-radius: var(--radius-md, 6px); font-size: 14px; color: var(--text-primary); cursor: pointer;
  font-family: var(--font-sans);
}
.currency-select:focus { outline: none; border-color: var(--brand-primary); }

/* Overview grid */
.overview-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px;
}
.overview-card {
  background-color: var(--bg-card); border: 1px solid var(--border-primary);
  border-radius: var(--radius-xl, 12px); padding: 16px; display: flex; flex-direction: column; gap: 6px;
  transition: border-color var(--transition-base);
}
.overview-card.projected { border-color: var(--projected-border); background-color: var(--projected-bg); }
.card-label { font-size: 12px; color: var(--text-secondary); display: flex; align-items: center; gap: 4px; }
.card-value { font-size: 22px; font-weight: 700; color: var(--text-primary); }
.na-text { color: var(--text-muted); }

.projected-badge {
  display: inline-flex; padding: 1px 6px; font-size: 10px; font-weight: 600;
  color: var(--projected-color); background-color: var(--projected-bg);
  border: 1px solid var(--projected-border); border-radius: var(--radius-sm, 4px); margin-left: 4px;
}

.info-trigger { position: relative; cursor: help; font-size: 12px; color: var(--text-muted); -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
.info-text {
  display: none; position: absolute; bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%);
  background-color: var(--bg-card); color: var(--text-primary); padding: 6px 10px;
  border-radius: var(--radius-md, 6px); font-size: 12px; font-weight: normal; white-space: nowrap;
  box-shadow: var(--shadow-lg); border: 1px solid var(--border-secondary); z-index: 100;
}
.info-trigger:hover .info-text, .info-trigger:active .info-text { display: block; }

.text-positive { color: var(--val-low) !important; }
.text-negative { color: var(--val-negative) !important; }
.metric-low { color: var(--val-low) !important; }
.metric-medium { color: var(--val-medium) !important; }
.metric-high { color: var(--val-high) !important; }
.metric-na { color: var(--text-muted) !important; }

/* Valuation */
.val-low { color: var(--val-low) !important; }
.val-medium { color: var(--val-medium) !important; }
.val-high { color: var(--val-high) !important; }
.val-negative { color: var(--val-negative) !important; }
.val-na { color: var(--val-na) !important; }

/* Valuation background classes */
.valuation-box.val-low-bg { background-color: var(--val-low-bg) !important; }
.valuation-box.val-medium-bg { background-color: var(--val-medium-bg) !important; }
.valuation-box.val-high-bg { background-color: var(--val-high-bg) !important; }
.valuation-box.val-negative-bg { background-color: var(--val-negative-bg) !important; }
.valuation-box.val-na-bg { background-color: var(--val-na-bg) !important; }

.section-card {
  background-color: var(--bg-card); border: 1px solid var(--border-primary);
  border-radius: var(--radius-xl, 12px); padding: 24px;
}
.section-title { margin: 0 0 20px 0; font-size: 17px; font-weight: 600; color: var(--text-primary); }

.valuation-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
.valuation-box {
  background-color: var(--bg-secondary); border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg, 10px); padding: 20px;
}
.valuation-box.projected { border-color: var(--projected-border); background-color: var(--projected-bg); }
.val-header { display: flex; flex-direction: column; gap: 4px; margin-bottom: 16px; }
.val-title { font-size: 14px; font-weight: 600; color: var(--text-primary); }
.val-formula { font-size: 12px; color: var(--text-muted); }
.method-note { color: var(--brand-primary); font-size: 11px; margin-left: 4px; }
.val-result { font-size: 36px; font-weight: 700; }

.valuation-note {
  margin-top: 12px; padding: 12px; background-color: var(--bg-secondary);
  border-radius: var(--radius-lg, 8px); display: flex; align-items: flex-start; gap: 8px;
}
.note-icon { color: var(--brand-primary); font-size: 14px; }
.note-text { font-size: 12px; color: var(--text-secondary); line-height: 1.6; }

/* Charts */
.charts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 24px; }

/* Table */
.table-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.sort-btn {
  padding: 6px 12px; background-color: var(--bg-secondary); border: 1px solid var(--border-primary);
  border-radius: var(--radius-md, 6px); font-size: 13px; color: var(--text-secondary);
  cursor: pointer; transition: all var(--transition-fast); font-family: var(--font-sans);
}
.sort-btn:hover { background-color: var(--brand-primary); color: white; border-color: var(--brand-primary); }

.data-table-wrapper { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th, .data-table td { padding: 12px 16px; text-align: left; border-bottom: 1px solid var(--border-primary); }
.data-table th { font-weight: 600; color: var(--text-secondary); font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
.data-table td { color: var(--text-primary); }
.data-table tr:hover td { background-color: var(--bg-card-hover); }

/* Delete */
.actions-section { display: flex; justify-content: center; padding-top: 16px; border-top: 1px solid var(--border-primary); }
.delete-btn {
  padding: 10px 24px; background: transparent; color: var(--color-danger-text);
  border: 1px solid var(--color-danger); border-radius: var(--radius-lg, 8px);
  font-size: 14px; cursor: pointer; transition: all var(--transition-fast); font-family: var(--font-sans);
}
.delete-btn:hover:not(:disabled) { background-color: var(--color-danger); color: white; }
.delete-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Loading / Error */
.loading-state, .error-state {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; padding: 100px 20px;
}
.spinner {
  width: 32px; height: 32px; border: 3px solid var(--border-secondary);
  border-top-color: var(--brand-primary); border-radius: 50%;
  animation: spin 0.8s linear infinite; margin-bottom: 16px;
}
.error-state p { color: var(--text-secondary); margin-bottom: 16px; }
.back-link {
  padding: 10px 20px; background-color: var(--brand-primary); color: white;
  border: none; border-radius: var(--radius-md, 6px); cursor: pointer; font-family: var(--font-sans);
}

@media (max-width: 768px) {
  .sub-header-inner { padding: 0 16px; height: 48px; }
  .page-title { font-size: 14px; }
  .update-btn .update-btn-text { display: none; }
  .detail-content { padding: 16px 16px 32px; gap: 16px; }
  .overview-grid { grid-template-columns: repeat(2, 1fr); }
  .valuation-grid { grid-template-columns: 1fr; }
  .charts-grid { grid-template-columns: 1fr; }
  .val-result { font-size: 28px; }
}
</style>