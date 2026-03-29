<template>
  <div class="stock-detail-view">
    <header class="page-header">
      <div class="header-content">
        <button class="back-button" @click="goBack">
          <span>←</span>
          返回
        </button>
        <h1 v-if="stock">{{ stock.name }} ({{ stock.code }})</h1>
        <div class="header-actions">
          <button 
            class="update-button" 
            :disabled="isUpdating"
            @click="handleUpdateFinancialData"
          >
            <span v-if="isUpdating" class="spinner-small"></span>
            <span v-else>↻</span>
            更新财报数据
          </button>
        </div>
      </div>
    </header>

    <main class="main-content" v-if="stock">
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
      <div class="overview-section">
        <div class="overview-card">
          <span class="label">当前市值</span>
          <span class="value">{{ formatDisplayCurrency(stock.marketCap) }}</span>
        </div>
        <div class="overview-card">
          <span class="label">净现金</span>
          <span class="value">{{ formatDisplayCurrency(stock.netCash) }}</span>
        </div>
        <div class="overview-card" :class="{ 'projected': stock.isUsingProjectedData }">
          <span class="label">
            自由现金流
            <span v-if="stock.freeCashFlowProjected" class="projected-badge">预测</span>
          </span>
          <span class="value">{{ formatDisplayCurrency(stock.freeCashFlow) }}</span>
        </div>
        <div class="overview-card" :class="{ 'projected': stock.netProfitProjected }">
          <span class="label">
            净利润
            <span v-if="stock.netProfitProjected" class="projected-badge">预测</span>
          </span>
          <span class="value">{{ formatDisplayCurrency(stock.netProfit) }}</span>
        </div>
      </div>

      <!-- Valuation Results -->
      <div class="valuation-section">
        <h2>估值分析</h2>
        <div class="valuation-grid">
          <div class="valuation-box" :class="{ 'projected': stock.isUsingProjectedData }">
            <div class="val-header">
              <span class="val-title">
                估值1
                <span v-if="stock.isUsingProjectedData" class="projected-badge">预测</span>
              </span>
              <span class="val-formula">(市值 - 净现金) / 自由现金流</span>
            </div>
            <div class="val-result" :class="getValuationClass(stock.valuation1)">
              <template v-if="stock.valuation1 !== null">
                {{ stock.valuation1.toFixed(2) }}
              </template>
              <template v-else>
                <span class="na-value">N/A</span>
                <span class="tooltip-trigger">
                  ⓘ
                  <span class="tooltip-text">自由现金流为负时不计算估值</span>
                </span>
              </template>
            </div>
          </div>
          <div class="valuation-box" :class="{ 'projected': stock.isUsingProjectedData }">
            <div class="val-header">
              <span class="val-title">
                估值2
                <span v-if="stock.isUsingProjectedData" class="projected-badge">预测</span>
              </span>
              <span class="val-formula">(市值 - 净现金) / 净利润</span>
            </div>
            <div class="val-result" :class="getValuationClass(stock.valuation2)">
              {{ stock.valuation2.toFixed(2) }}
            </div>
          </div>
        </div>
      </div>

      <!-- Charts -->
      <div class="charts-section">
        <ValuationChart
          title="自由现金流趋势"
          :yearly-data="stock.yearlyData"
          data-type="freeCashFlow"
          :display-currency="displayCurrency"
          :exchange-rates="exchangeRates"
        />
        <ValuationChart
          title="净利润趋势"
          :yearly-data="stock.yearlyData"
          data-type="netProfit"
          :display-currency="displayCurrency"
          :exchange-rates="exchangeRates"
        />
      </div>

      <!-- Historical Data Table -->
      <div class="table-section">
        <div class="table-header">
          <h2>历史数据</h2>
          <button @click="toggleSortOrder" class="sort-button">
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
                <td>{{ data.year }}</td>
                <td :class="{ 'positive': data.freeCashFlow > 0, 'negative': data.freeCashFlow < 0 }">
                  {{ convertAndFormat(data.freeCashFlow) }}
                </td>
                <td :class="{ 'positive': data.netProfit > 0, 'negative': data.netProfit < 0 }">
                  {{ convertAndFormat(data.netProfit) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Actions -->
      <div class="actions-section">
        <button @click="deleteStock" :disabled="deleting" class="delete-button">
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
      <button @click="goBack" class="back-btn">返回首页</button>
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

type CurrencyType = 'HKD' | 'CNY' | 'USD'

const router = useRouter()
const route = useRoute()
const stockStore = useStockStore()

const stock = ref<StockData | null>(null)
const loading = ref(true)
const deleting = ref(false)
const isUpdating = ref(false)
const displayCurrency = ref<CurrencyType>('HKD')
const exchangeRates = ref<Record<string, number>>({ HKD: 1, USD: 7.75, CNY: 1.10 })
const sortOrder = ref<'asc' | 'desc'>('desc')

const sortedYearlyData = computed(() => {
  if (!stock.value) return []
  const data = [...stock.value.yearlyData]
  return sortOrder.value === 'asc' 
    ? data.sort((a, b) => a.year - b.year)
    : data.sort((a, b) => b.year - a.year)
})

const currencyUnit = computed(() => {
  const symbols: Record<CurrencyType, string> = { HKD: '亿港元', CNY: '亿人民币', USD: '亿美元' }
  return symbols[displayCurrency.value]
})

onMounted(async () => {
  const id = route.params.id as string
  try {
    stock.value = await stockStore.getStockById(id)
    if (stock.value) {
      displayCurrency.value = stock.value.market === 'A' ? 'CNY' : 'HKD'
    }
    try {
      const result = await fetchExchangeRates()
      exchangeRates.value = result.rates
    } catch (e) {
      console.error('Failed to fetch exchange rates:', e)
    }
  } finally {
    loading.value = false
  }
})

function toggleSortOrder() {
  sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
}

function convertCurrency(value: number, toCurrency: CurrencyType): number {
  const rate = exchangeRates.value[toCurrency] || 1
  return value * rate
}

function formatDisplayCurrency(value: number): string {
  const converted = convertCurrency(value, displayCurrency.value)
  const unitNames: Record<CurrencyType, string> = { HKD: '亿港元', CNY: '亿人民币', USD: '亿美元' }
  return `${converted.toFixed(2)}${unitNames[displayCurrency.value]}`
}

function convertAndFormat(value: number): string {
  const converted = convertCurrency(value, displayCurrency.value)
  const unitNames: Record<CurrencyType, string> = { HKD: '亿港元', CNY: '亿人民币', USD: '亿美元' }
  return `${converted.toFixed(2)}${unitNames[displayCurrency.value]}`
}

function getValuationClass(value: number | null): string {
  if (value === null) return 'na'
  if (value < 0) return 'negative'
  if (value < 10) return 'low'
  if (value < 20) return 'medium'
  return 'high'
}

async function deleteStock() {
  if (!stock.value) return
  
  if (!confirm('确定要删除这只股票吗？此操作不可撤销。')) {
    return
  }
  
  deleting.value = true
  try {
    await stockStore.deleteStock(stock.value.id)
    router.push('/')
  } finally {
    deleting.value = false
  }
}

async function handleUpdateFinancialData() {
  if (!stock.value || isUpdating.value) return
  
  isUpdating.value = true
  try {
    const updatedStock = await stockStore.updateStockWithRecalculation(stock.value.id)
    if (updatedStock) {
      stock.value = updatedStock
    }
  } catch (e) {
    console.error('Failed to update financial data:', e)
    alert('更新失败，请重试')
  } finally {
    isUpdating.value = false
  }
}

function goBack() {
  router.push('/')
}
</script>

<style scoped>
.stock-detail-view {
  min-height: 100vh;
  background: var(--bg-primary);
}

.page-header {
  background: var(--card-bg);
  border-bottom: 1px solid var(--border-color);
  padding: 0 24px;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 64px;
}

.back-button {
  display: flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: color 0.2s;
  padding: 0;
}

.back-button:hover {
  color: var(--text-primary);
}

.header-content h1 {
  margin: 0;
  font-size: 18px;
  color: var(--text-primary);
}

.header-actions {
  display: flex;
  gap: 12px;
}

.update-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.update-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
}

.update-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinner-small {
  width: 12px;
  height: 12px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.main-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 24px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.currency-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.currency-bar label {
  font-size: 14px;
  color: var(--text-secondary);
}

.currency-select {
  padding: 6px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 14px;
  color: var(--text-primary);
  cursor: pointer;
}

.currency-select:focus {
  outline: none;
  border-color: var(--primary-color);
}

.overview-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.overview-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.overview-card .label {
  font-size: 13px;
  color: var(--text-secondary);
}

.overview-card .value {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  font-family: 'JetBrains Mono', monospace;
}

.overview-card.projected {
  border-color: rgba(139, 92, 246, 0.4);
  background: rgba(139, 92, 246, 0.05);
}

.overview-card.projected .value {
  color: #a78bfa;
}

.currency-info {
  font-size: 12px;
  color: var(--text-muted);
}

.rate-warning {
  color: var(--warning-color);
  font-weight: bold;
  cursor: help;
}

.valuation-section {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 24px;
}

.valuation-section h2 {
  margin: 0 0 20px 0;
  font-size: 18px;
  color: var(--text-primary);
}

.valuation-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}

.valuation-box {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 20px;
}

.valuation-box.projected {
  border-color: rgba(139, 92, 246, 0.5);
  background: rgba(139, 92, 246, 0.08);
}

.val-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 16px;
}

.val-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.val-formula {
  font-size: 12px;
  color: var(--text-muted);
  font-family: 'JetBrains Mono', monospace;
}

.val-result {
  font-size: 42px;
  font-weight: 700;
  font-family: 'JetBrains Mono', monospace;
}

.val-result.low {
  color: var(--success-color);
}

.val-result.medium {
  color: var(--primary-color);
}

.val-result.high {
  color: var(--danger-color);
}

.val-result.negative {
  color: #ef4444;
}

.val-result.na {
  color: var(--text-muted);
}

.na-value {
  color: var(--text-muted);
}

.tooltip-trigger {
  margin-left: 6px;
  font-size: 14px;
  color: var(--text-secondary);
  cursor: help;
  position: relative;
}

.tooltip-text {
  visibility: hidden;
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: var(--bg-primary);
  color: var(--text-primary);
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: normal;
  white-space: nowrap;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  border: 1px solid var(--border-color);
  z-index: 10;
  opacity: 0;
  transition: opacity 0.2s;
}

.tooltip-trigger:hover .tooltip-text {
  visibility: visible;
  opacity: 1;
}

.projected-badge {
  display: inline-block;
  margin-left: 8px;
  padding: 2px 8px;
  font-size: 10px;
  font-weight: 600;
  color: #a78bfa;
  background: rgba(139, 92, 246, 0.15);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 4px;
  vertical-align: middle;
}

.charts-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 24px;
}

.table-section {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 24px;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.table-header h2 {
  margin: 0;
  font-size: 18px;
  color: var(--text-primary);
}

.sort-button {
  padding: 6px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.sort-button:hover {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.data-table-wrapper {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
}

.data-table th {
  font-weight: 600;
  color: var(--text-secondary);
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.data-table td {
  color: var(--text-primary);
  font-family: 'JetBrains Mono', monospace;
}

.data-table tr:hover {
  background: var(--bg-secondary);
}

.positive {
  color: var(--success-color);
}

.negative {
  color: var(--danger-color);
}

.actions-section {
  display: flex;
  justify-content: center;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
}

.delete-button {
  padding: 12px 24px;
  background: transparent;
  color: var(--danger-color);
  border: 1px solid var(--danger-color);
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.delete-button:hover:not(:disabled) {
  background: var(--danger-color);
  color: white;
}

.delete-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100px 20px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-state p {
  color: var(--text-secondary);
  margin-bottom: 16px;
}

.back-btn {
  padding: 10px 20px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

@media (max-width: 768px) {
  .page-header {
    padding: 0 16px;
  }
  
  .main-content {
    padding: 20px 16px;
  }
  
  .overview-section {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .valuation-grid {
    grid-template-columns: 1fr;
  }
  
  .charts-section {
    grid-template-columns: 1fr;
  }
  
  .val-result {
    font-size: 32px;
  }
}
</style>
