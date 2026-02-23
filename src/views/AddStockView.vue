<template>
  <div class="add-stock-view">
    <header class="page-header">
      <div class="header-content">
        <button class="back-button" @click="goBack">
          <span>←</span>
          返回
        </button>
        <h1>{{ isEditMode ? '编辑股票' : '新增股票分析' }}</h1>
        <div class="placeholder"></div>
      </div>
    </header>

    <main class="main-content">
      <div class="form-container">
        <!-- Data Source Selector -->
        <div v-if="!isEditMode || !forcedManualMode" class="form-section">
          <h2>数据来源</h2>
          <div class="source-selector">
            <button
              :class="{ active: dataSourceMode === 'api' }"
              @click="setMode('api')"
              :disabled="forcedManualMode || !isApiAvailable"
              class="source-btn"
            >
              <span class="btn-icon">🤖</span>
              <span class="btn-text">API模式</span>
              <span v-if="!isApiAvailable" class="btn-badge unavailable">不可用</span>
            </button>
            <button
              :class="{ active: dataSourceMode === 'manual' }"
              @click="setMode('manual')"
              class="source-btn"
            >
              <span class="btn-icon">📄</span>
              <span class="btn-text">手动模式</span>
            </button>
          </div>
          <p v-if="!isApiAvailable && dataSourceMode === 'manual'" class="source-hint">
            API不可用，已自动切换到手动模式
          </p>
        </div>

        <!-- API Mode: Stock Info (Before Fetch) -->
        <div v-if="dataSourceMode === 'api' && !stockInfoFromApi" class="form-section">
          <h2>股票信息</h2>
          <p class="section-desc">输入股票代码或名称，自动获取股票信息及财报数据</p>
          
          <div class="form-row">
            <div class="form-group search-input-group">
              <label>股票名称或代码 <span class="required">*</span></label>
              <div class="search-input-wrapper">
                <input
                  v-model="form.code"
                  type="text"
                  placeholder="输入代码或名称搜索..."
                  class="form-input"
                  :class="{ 'input-error': !codeValidation.isValid }"
                  :disabled="isEditMode"
                  @keyup.enter="openSearchModal"
                >
                <button 
                  type="button" 
                  class="search-button" 
                  @click="openSearchModal"
                  :disabled="!form.code"
                  title="搜索"
                >
                  🔍
                </button>
              </div>
              <span v-if="!codeValidation.isValid" class="error-message">{{ codeValidation.message }}</span>
            </div>

            <div class="form-group">
              <label>市场 <span class="required">*</span></label>
              <select v-model="form.market" class="form-select" :disabled="true" @change="onMarketChange">
                <option value="HK">港股</option>
                <option value="A">A股</option>
              </select>
            </div>
          </div>

          <button
            @click="fetchFinancialData"
            :disabled="fetchLoading || !canFetch"
            class="fetch-data-button large"
            :class="{ 'loading': fetchLoading }"
          >
            <span v-if="fetchLoading" class="btn-spinner"></span>
            <span v-else>📊 获取财报数据</span>
          </button>

          <!-- Search Modal -->
          <div v-if="showSearchModal" class="modal-overlay" @click.self="closeSearchModal">
            <div class="modal-content">
              <div class="modal-header">
                <h3>搜索股票</h3>
                <button class="modal-close" @click="closeSearchModal">×</button>
              </div>
              <div class="modal-body">
                <div class="search-input-container">
                  <input
                    ref="searchInputRef"
                    v-model="searchQuery"
                    type="text"
                    placeholder="输入股票名称/代码..."
                    class="search-modal-input"
                    @input="onSearchInput"
                    @keyup.enter="performSearch"
                  >
                  <button class="search-modal-btn" @click="performSearch">🔍</button>
                </div>
                <div v-if="stockStore.isSearching" class="search-loading">
                  搜索中...
                </div>
                <div v-else-if="stockStore.searchResults.length > 0" class="search-results">
                  <div 
                    v-for="result in stockStore.searchResults" 
                    :key="result.fullCode"
                    class="search-result-item"
                    @click="selectSearchResult(result)"
                  >
                    <div class="result-main">
                      <span class="result-name">{{ result.name }}</span>
                      <span class="result-code">({{ result.fullCode }})</span>
                    </div>
                    <span class="result-market">{{ result.marketName }}</span>
                  </div>
                </div>
                <div v-else-if="searchQuery && searchPerformed" class="search-empty">
                  未找到匹配的股票
                </div>
              </div>
            </div>
          </div>

          <!-- Error State -->
          <div v-if="fetchError" class="fetch-error">
            <div class="error-icon">⚠️</div>
            <div class="error-content">
              <p class="error-title">获取财报数据失败</p>
              <p class="error-text">{{ fetchError }}</p>
              <div class="error-actions">
                <button
                  v-if="retryCount < MAX_RETRIES"
                  @click="retryFetch"
                  class="retry-btn"
                  :disabled="fetchLoading"
                >
                  重试
                </button>
                <button
                  @click="switchToManual"
                  class="switch-btn"
                >
                  {{ retryCount >= MAX_RETRIES ? '强制进入手动模式' : '切换到手动模式' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- API Mode: Stock Info (After Fetch) -->
        <div v-if="dataSourceMode === 'api' && stockInfoFromApi" class="form-section api-loaded-section">
          <div class="section-header">
            <h2>股票信息</h2>
            <button
              v-if="!isEditMode"
              @click="enableEditMode"
              class="edit-code-btn"
              :disabled="fetchLoading"
            >
              修改
            </button>
          </div>

          <div v-if="isEditingCode" class="edit-mode-notice">
            <p>正在修改股票代码，当前预览数据将被清除</p>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>股票代码</label>
              <input
                v-model="form.code"
                type="text"
                class="form-input"
                :class="{ 'disabled': !isEditingCode, 'input-error': !codeValidation.isValid }"
                :disabled="!isEditingCode"
                :placeholder="form.market === 'HK' ? '如: 00700' : '如: 600519'"
              >
              <span v-if="isEditingCode && !codeValidation.isValid" class="error-message">{{ codeValidation.message }}</span>
            </div>

            <div class="form-group">
              <label>市场</label>
              <select v-model="form.market" class="form-select" :class="{ 'disabled': !isEditingCode }" :disabled="!isEditingCode" @change="onMarketChange">
                <option value="HK">港股</option>
                <option value="A">A股</option>
              </select>
            </div>
          </div>

          <div v-if="isEditingCode" class="edit-actions">
            <button
              @click="cancelEditMode"
              class="cancel-btn"
              :disabled="fetchLoading"
            >
              取消
            </button>
            <button
              @click="fetchFinancialData"
              :disabled="fetchLoading || !canFetch"
              class="fetch-data-button"
              :class="{ 'loading': fetchLoading }"
            >
              <span v-if="fetchLoading" class="btn-spinner"></span>
              <span v-else>重新获取数据</span>
            </button>
          </div>

          <div v-else class="api-data-display">
            <div class="data-item">
              <span class="data-label">股票名称</span>
              <span class="data-value">{{ form.name }} <span class="check-mark">✓</span></span>
            </div>
            <div class="data-item">
              <span class="data-label">当前市值</span>
              <span class="data-value">{{ form.marketCap }} 亿{{ form.market === 'A' ? '人民币' : '港元' }} <span class="check-mark">✓</span></span>
            </div>
          </div>
        </div>

        <!-- Manual Mode: Full Stock Info Form -->
        <div v-if="dataSourceMode === 'manual'" class="form-section">
          <h2>股票信息</h2>
          <div class="form-row">
            <div class="form-group">
              <label>股票代码 <span class="required">*</span></label>
              <input
                v-model="form.code"
                type="text"
                :placeholder="form.market === 'HK' ? '如: 00700' : '如: 600519'"
                class="form-input"
                :class="{ 'input-error': !codeValidation.isValid }"
                :disabled="isEditMode"
              >
              <span v-if="!codeValidation.isValid" class="error-message">{{ codeValidation.message }}</span>
            </div>

            <div class="form-group">
              <label>市场 <span class="required">*</span></label>
              <select v-model="form.market" class="form-select" :disabled="isEditMode" @change="onMarketChange">
                <option value="HK">港股</option>
                <option value="A">A股</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label>股票名称 <span class="required">*</span></label>
            <input
              v-model="form.name"
              type="text"
              placeholder="股票名称"
              class="form-input"
              :class="{ 'input-error': !nameValidation.isValid }"
            >
            <span v-if="!nameValidation.isValid" class="error-message">{{ nameValidation.message }}</span>
          </div>

          <div class="form-group">
            <label>当前市值 <span class="required">*</span></label>
            <div class="market-cap-input-group">
              <input
                v-model.number="form.marketCap"
                type="number"
                placeholder="如: 1500"
                class="form-input"
                :class="{ 'input-error': !marketCapValidation.isValid }"
              >
              <div class="currency-display">{{ form.market === 'A' ? '亿人民币' : '亿港元' }}</div>
            </div>
            <span v-if="!marketCapValidation.isValid" class="error-message">{{ marketCapValidation.message }}</span>
          </div>
        </div>

        <!-- Manual Mode: Excel Upload -->
        <div v-if="dataSourceMode === 'manual'" class="form-section">
          <h2>上传财务报表</h2>
          <p class="section-desc">请上传以下Excel文件以获取财务数据（支持 .xlsx, .xls, .csv）</p>

          <ExcelUploader
            :validation-errors="validationErrors"
            @files-selected="handleFilesSelected"
          />
        </div>

        <!-- Generate Button (Manual Mode) -->
        <div v-if="dataSourceMode === 'manual'" class="form-actions">
          <button
            @click="generateData"
            :disabled="!canGenerate || generating"
            class="generate-button"
            :class="{ 'loading': generating }"
          >
            <span v-if="generating" class="btn-spinner"></span>
            <span v-else>生成数据</span>
          </button>
        </div>

        <!-- API Mode Loading State -->
        <div v-if="dataSourceMode === 'api' && fetchLoading && !previewData" class="loading-section">
          <div class="spinner-large"></div>
          <p class="loading-text">正在获取财报数据，请稍候...</p>
        </div>

        <!-- Preview Section -->
        <div v-if="previewData" class="preview-section">
          <!-- API Success Banner -->
          <div v-if="dataSourceMode === 'api'" class="api-success-banner">
            <span class="success-icon">✓</span>
            <span>已从API成功获取数据</span>
          </div>

          <h2>分析结果预览</h2>

          <div class="currency-selector">
            <label>显示币种：</label>
            <select v-model="displayCurrency" class="form-select">
              <option value="HKD">港元 (HK$)</option>
              <option value="CNY">人民币 (¥)</option>
              <option value="USD">美元 ($)</option>
            </select>
          </div>

          <div class="valuation-cards">
            <div class="valuation-card">
              <span class="val-label">当前市值</span>
              <span class="val-value">{{ formatDisplayCurrency(previewData.marketCap) }}</span>
            </div>
            <div class="valuation-card">
              <span class="val-label">净现金</span>
              <span class="val-value">{{ formatDisplayCurrency(previewData.netCash) }}</span>
            </div>
            <div class="valuation-card" :class="{ 'projected': previewData.isUsingProjectedData }">
              <span class="val-label">
                自由现金流
                <span v-if="previewData.isUsingProjectedData" class="projected-badge">预测</span>
              </span>
              <span class="val-value">{{ formatDisplayCurrency(previewData.freeCashFlow) }}</span>
            </div>
            <div class="valuation-card" :class="{ 'projected': previewData.isUsingProjectedData }">
              <span class="val-label">
                净利润
                <span v-if="previewData.isUsingProjectedData" class="projected-badge">预测</span>
              </span>
              <span class="val-value">{{ formatDisplayCurrency(previewData.netProfit) }}</span>
            </div>
            <div class="valuation-card highlight" :class="{ 'projected': previewData.isUsingProjectedData }">
              <span class="val-label">
                估值1 (市值-净现金)/自由现金流
                <span v-if="previewData.isUsingProjectedData" class="projected-badge">预测</span>
              </span>
              <span class="val-value">
                <template v-if="previewData.valuation1 !== null">
                  {{ previewData.valuation1.toFixed(2) }}
                </template>
                <template v-else>
                  <span class="na-value">N/A</span>
                  <span class="tooltip-trigger">
                    ⓘ
                    <span class="tooltip-text">自由现金流为负时不计算估值</span>
                  </span>
                </template>
              </span>
            </div>
            <div class="valuation-card highlight">
              <span class="val-label">估值2 (市值-净现金)/净利润</span>
              <span class="val-value">{{ previewData.valuation2.toFixed(2) }}</span>
            </div>
          </div>

          <div class="charts-grid">
            <ValuationChart
              title="自由现金流趋势"
              :yearly-data="previewData.yearlyData"
              data-type="freeCashFlow"
              :display-currency="displayCurrency"
              :exchange-rates="exchangeRates"
            />
            <ValuationChart
              title="净利润趋势"
              :yearly-data="previewData.yearlyData"
              data-type="netProfit"
              :display-currency="displayCurrency"
              :exchange-rates="exchangeRates"
            />
          </div>

          <div class="save-actions">
            <button @click="saveStock" :disabled="saving" class="save-button">
              {{ saving ? '保存中...' : '确认保存' }}
            </button>
            <button v-if="dataSourceMode === 'api'" @click="refetchData" :disabled="fetchLoading" class="reset-button">
              <span v-if="fetchLoading" class="btn-spinner small"></span>
              <span v-else>重新获取</span>
            </button>
            <button v-else @click="resetForm" class="reset-button">重新生成</button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, toRaw, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useStockStore } from '@/stores/stockStore'
import { useExcelParser, useValuation } from '@/composables/useExcelParser'
import { validateStockCode } from '@/utils/validator'
import { fetchExchangeRates } from '@/api/exchangeRate'
import type { ExcelData, StockAnalysisResult } from '@/types/stock'
import ExcelUploader from '@/components/ExcelUploader.vue'
import ValuationChart from '@/components/ValuationChart.vue'

type CurrencyType = 'HKD' | 'CNY' | 'USD'
type DataSourceMode = 'api' | 'manual'

const router = useRouter()
const route = useRoute()
const stockStore = useStockStore()
const { parseFiles, validationResult, validationErrors } = useExcelParser()
const { calculate } = useValuation()

const isEditMode = computed(() => !!route.params.id)
const editingStockId = computed(() => route.params.id as string)

// Data Source Mode
const dataSourceMode = ref<DataSourceMode>('api')
const isApiAvailable = ref(false)
const stockInfoFromApi = ref(false)

// API Fetch State
const fetchLoading = ref(false)
const fetchError = ref<string | null>(null)
const retryCount = ref(0)
const MAX_RETRIES = 1
const forcedManualMode = ref(false)
const isEditingCode = ref(false)

// Saved state for canceling edit
let savedFormState = {
  code: '',
  name: '',
  market: 'HK' as 'HK' | 'A',
  marketCap: 0
}

// Generate State
const generating = ref(false)
const saving = ref(false)

// Preview Data
const previewData = ref<StockAnalysisResult | null>(null)
const displayCurrency = ref<CurrencyType>('HKD')
const exchangeRates = ref<Record<string, number>>({ HKD: 1, USD: 7.75, CNY: 1.10 })

const form = reactive({
  code: '',
  name: '',
  market: '' as 'HK' | 'A',
  marketCap: 0,
  marketCapCurrency: 'HKD' as CurrencyType
})

const codeValidation = ref<{ isValid: boolean; message?: string }>({ isValid: true })
const nameValidation = ref<{ isValid: boolean; message?: string }>({ isValid: true })
const marketCapValidation = ref<{ isValid: boolean; message?: string }>({ isValid: true })

const showSearchModal = ref(false)
const searchQuery = ref('')
const searchPerformed = ref(false)
const searchInputRef = ref<HTMLInputElement | null>(null)
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null

const uploadedFiles = ref<Partial<Record<'benefit' | 'debt' | 'cash' | 'keyIndex', File>>>({})
const parsedExcelData = ref<ExcelData | null>(null)

onMounted(async () => {
  await stockStore.testAPIs()
  isApiAvailable.value = stockStore.isApiAvailable

  if (!isApiAvailable.value) {
    dataSourceMode.value = 'manual'
  }

  await fetchExchangeRatesData()

  if (isEditMode.value && editingStockId.value) {
    const stock = await stockStore.getStockById(editingStockId.value)
    if (stock) {
      form.code = stock.code
      form.name = stock.name
      form.market = stock.market
      form.marketCap = stock.marketCap
      form.marketCapCurrency = stock.market === 'A' ? 'CNY' : 'HKD'
      displayCurrency.value = stock.market === 'A' ? 'CNY' : 'HKD'
      codeValidation.value = { isValid: true }
      nameValidation.value = { isValid: true }
      marketCapValidation.value = { isValid: true }

      // Pre-fill preview data in edit mode
      previewData.value = {
        id: stock.id,
        name: stock.name,
        code: stock.code,
        market: stock.market,
        marketCap: stock.marketCap,
        netCash: stock.netCash,
        freeCashFlow: stock.freeCashFlow,
        netProfit: stock.netProfit,
        valuation1: stock.valuation1,
        valuation2: stock.valuation2,
        yearlyData: stock.yearlyData,
        baseCurrency: 'HKD',
        isUsingProjectedData: stock.isUsingProjectedData || false
      }
    }
  }
})

async function fetchExchangeRatesData() {
  try {
    const result = await fetchExchangeRates()
    exchangeRates.value = result.rates
  } catch (e) {
    console.error('Failed to fetch exchange rates:', e)
  }
}

function convertCurrency(value: number, toCurrency: CurrencyType): number {
  const rate = exchangeRates.value[toCurrency] || 1
  return value * rate
}

function formatDisplayCurrency(value: number | undefined): string {
  if (value === undefined || isNaN(value)) return '-'
  const converted = convertCurrency(value, displayCurrency.value)
  const unitNames: Record<CurrencyType, string> = {
    HKD: '亿港元',
    CNY: '亿人民币',
    USD: '亿美元'
  }
  return `${converted.toFixed(2)}${unitNames[displayCurrency.value]}`
}

function validateForm(): boolean {
  let isValid = true

  const codeResult = validateStockCode(form.code, form.market)
  codeValidation.value = codeResult
  if (!codeResult.isValid) isValid = false

  const existingStock = stockStore.stocks.find(
    s => s.code === form.code && s.market === form.market && s.id !== editingStockId.value
  )
  if (existingStock) {
    codeValidation.value = { isValid: false, message: '该股票已存在' }
    isValid = false
  }

  if (!form.name.trim()) {
    nameValidation.value = { isValid: false, message: '请输入股票名称' }
    isValid = false
  } else {
    nameValidation.value = { isValid: true }
  }

  if (!form.marketCap || form.marketCap <= 0) {
    marketCapValidation.value = { isValid: false, message: '请输入有效的市值' }
    isValid = false
  } else {
    marketCapValidation.value = { isValid: true }
  }

  const existingName = stockStore.stocks.find(
    s => s.name === form.name && s.market === form.market && s.id !== editingStockId.value
  )
  if (existingName) {
    nameValidation.value = { isValid: false, message: '该股票名称已存在' }
    isValid = false
  }

  return isValid
}

const canFetch = computed(() => {
  if (!form.code) return false
  if (!codeValidation.value.isValid) return false

  const existingStock = stockStore.stocks.find(
    s => s.code === form.code && s.market === form.market && s.id !== editingStockId.value
  )
  if (existingStock) return false

  return true
})

const canGenerate = computed(() => {
  if (!form.code) return false
  if (!codeValidation.value.isValid) return false

  if (!form.name || !form.marketCap) return false
  if (!nameValidation.value.isValid || !marketCapValidation.value.isValid) return false

  if (dataSourceMode.value === 'api') {
    // API mode: need to have fetched data
    return previewData.value !== null
  } else {
    // Manual mode: need uploaded Excel files
    return uploadedFiles.value.benefit &&
           uploadedFiles.value.debt &&
           uploadedFiles.value.cash &&
           validationResult.value?.isValid
  }
})

function onMarketChange() {
  if (form.code) {
    codeValidation.value = validateStockCode(form.code, form.market)
  }
  displayCurrency.value = form.market === 'A' ? 'CNY' : 'HKD'
}

function openSearchModal() {
  if (!form.code) return
  searchQuery.value = form.code
  searchPerformed.value = false
  stockStore.clearSearchResults()
  showSearchModal.value = true
  setTimeout(async () => {
    searchInputRef.value?.focus()
    if (searchQuery.value.trim()) {
      await performSearch()
    }
  }, 100)
}

function closeSearchModal() {
  showSearchModal.value = false
  searchQuery.value = ''
  searchPerformed.value = false
  stockStore.clearSearchResults()
}

function onSearchInput() {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }
  searchDebounceTimer = setTimeout(() => {
    performSearch()
  }, 300)
}

async function performSearch() {
  if (!searchQuery.value.trim()) return
  searchPerformed.value = true
  await stockStore.searchStocks(searchQuery.value.trim())
}

function selectSearchResult(result: typeof stockStore.searchResults[0]) {
  form.code = result.code
  form.market = result.market
  form.name = result.name
  codeValidation.value = { isValid: true }
  nameValidation.value = { isValid: true }
  closeSearchModal()
}

function setMode(mode: DataSourceMode) {
  if (forcedManualMode.value && mode === 'api') return
  dataSourceMode.value = mode
  resetFetchState()
}

function resetFetchState() {
  fetchError.value = null
  retryCount.value = 0
}

async function fetchFinancialData() {
  if (!canFetch.value) return

  fetchLoading.value = true
  fetchError.value = null

  try {
    // Step 1: Get stock info (name and market cap)
    const stockInfo = await stockStore.fetchStockInfo(form.code, form.market)
    if (stockInfo) {
      form.name = stockInfo.name
      form.marketCap = stockInfo.marketCap
      stockInfoFromApi.value = true
      validateForm()
      // 更新保存的状态
      savedFormState = {
        code: form.code,
        name: form.name,
        market: form.market,
        marketCap: form.marketCap
      }
    }

    // Step 2: Get financial report data
    const reportData = await stockStore.fetchFinancialReport(form.code, form.market, form.marketCap)

    if (reportData) {
      previewData.value = {
        id: `${form.market}${form.code}`,
        name: form.name,
        code: form.code,
        market: form.market,
        marketCap: form.marketCap,
        ...reportData
      }
      // 成功获取数据后，退出编辑模式并更新保存的状态
      isEditingCode.value = false
      // 更新保存的状态为当前最新值
      savedFormState = {
        code: form.code,
        name: form.name,
        market: form.market,
        marketCap: form.marketCap
      }
    }
  } catch (err) {
    fetchError.value = err instanceof Error ? err.message : '获取数据失败'
    // Clear stock info if fetch failed
    if (!isEditMode.value) {
      form.name = ''
      form.marketCap = 0
      stockInfoFromApi.value = false
    }
  } finally {
    fetchLoading.value = false
  }
}

async function retryFetch() {
  retryCount.value++
  await fetchFinancialData()

  // 只有在重试次数超过最大限制且仍然有错误时，才强制切换到手动模式
  // 但不再自动切换，让用户自己选择
  if (fetchError.value && retryCount.value >= MAX_RETRIES) {
    // 记录已达到最大重试次数，但不自动切换模式
    console.log(`已达到最大重试次数 (${MAX_RETRIES})，请手动选择切换到手动模式`)
  }
}

function enableEditMode() {
  // 保存当前状态以便取消时恢复
  savedFormState = {
    code: form.code,
    name: form.name,
    market: form.market,
    marketCap: form.marketCap
  }

  // 清除预览数据，进入编辑模式
  previewData.value = null
  isEditingCode.value = true
  stockInfoFromApi.value = false
  resetFetchState()
}

function cancelEditMode() {
  // 恢复之前保存的状态
  form.code = savedFormState.code
  form.name = savedFormState.name
  form.market = savedFormState.market
  form.marketCap = savedFormState.marketCap

  // 退出编辑模式
  isEditingCode.value = false
  stockInfoFromApi.value = true
}

function switchToManual() {
  if (retryCount.value >= MAX_RETRIES) {
    forcedManualMode.value = true
  }
  dataSourceMode.value = 'manual'
  resetFetchState()

  // Clear auto-fetched data if any
  if (!isEditMode.value && stockInfoFromApi.value) {
    form.name = ''
    form.marketCap = 0
    stockInfoFromApi.value = false
  }
}

async function handleFilesSelected(files: Partial<Record<'benefit' | 'debt' | 'cash' | 'keyIndex', File>>) {
  uploadedFiles.value = files

  if (files.benefit && files.debt && files.cash) {
    const result = await parseFiles(files)
    if (result.isValid && result.data) {
      parsedExcelData.value = result.data
    }
  }

  validateForm()
}

async function generateData() {
  if (!validateForm()) return

  generating.value = true

  try {
    if (parsedExcelData.value) {
      const result = await calculate(form.marketCap, parsedExcelData.value)
      if (result) {
        previewData.value = {
          id: `${form.market}${form.code}`,
          name: form.name,
          code: form.code,
          market: form.market,
          marketCap: form.marketCap,
          ...result
        }
      }
    }
  } finally {
    generating.value = false
  }
}

async function saveStock() {
  if (!previewData.value) return

  saving.value = true
  try {
    if (isEditMode.value && editingStockId.value) {
      await stockStore.recalculateStock(editingStockId.value, {
        name: form.name,
        marketCap: form.marketCap,
        netCash: previewData.value.netCash,
        freeCashFlow: previewData.value.freeCashFlow,
        netProfit: previewData.value.netProfit,
        valuation1: previewData.value.valuation1,
        valuation2: previewData.value.valuation2,
        yearlyData: previewData.value.yearlyData
      })
    } else {
      const stockData = {
        ...toRaw(previewData.value),
        id: `${previewData.value.market}${previewData.value.code}_${Date.now()}`,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
      await stockStore.addStock(stockData)
    }
    router.push('/')
  } finally {
    saving.value = false
  }
}

function resetForm() {
  previewData.value = null
  parsedExcelData.value = null
  uploadedFiles.value = {}
  stockInfoFromApi.value = false
  resetFetchState()

  if (!isEditMode.value) {
    form.name = ''
    form.marketCap = 0
  }
}

async function refetchData() {
  previewData.value = null
  stockInfoFromApi.value = false
  resetFetchState()
  await fetchFinancialData()
}

function goBack() {
  router.push('/')
}

function formatCurrency(value: number | undefined): string {
  if (value === undefined || isNaN(value)) return '-'
  return `${value.toFixed(2)} 亿元`
}
</script>

<style scoped>
.add-stock-view {
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
  max-width: 900px;
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

.placeholder {
  width: 60px;
}

.main-content {
  max-width: 900px;
  margin: 0 auto;
  padding: 32px 24px;
}

.form-container {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.form-section {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 24px;
}

.form-section h2 {
  margin: 0 0 20px 0;
  font-size: 16px;
  color: var(--text-primary);
}

.section-desc {
  margin: -12px 0 16px 0;
  font-size: 14px;
  color: var(--text-secondary);
}

.source-selector {
  display: flex;
  gap: 16px;
}

.source-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px 24px;
  background: var(--bg-secondary);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.source-btn:hover:not(:disabled) {
  border-color: var(--primary-color);
}

.source-btn.active {
  border-color: var(--primary-color);
  background: rgba(245, 158, 11, 0.1);
}

.source-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-icon {
  font-size: 20px;
}

.btn-text {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.btn-badge {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: 4px;
}

.btn-badge.unavailable {
  background: var(--danger-color);
  color: white;
}

.source-hint {
  margin-top: 12px;
  font-size: 13px;
  color: var(--text-secondary);
  font-style: italic;
}

.form-row {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 16px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.required {
  color: var(--danger-color);
}

.form-input,
.form-select {
  width: 100%;
  padding: 10px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 14px;
  color: var(--text-primary);
  transition: border-color 0.2s;
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: var(--primary-color);
}

.input-error {
  border-color: var(--danger-color) !important;
}

.error-message {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--danger-color);
}

.field-hint {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-muted);
  font-style: italic;
}

.form-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-input.disabled,
.form-select.disabled {
  background: var(--bg-secondary);
  color: var(--text-secondary);
  opacity: 0.6;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h2 {
  margin: 0;
  font-size: 16px;
  color: var(--text-primary);
}

.edit-code-btn {
  padding: 6px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.edit-code-btn:hover:not(:disabled) {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.edit-code-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.edit-mode-notice {
  margin-bottom: 16px;
  padding: 12px 16px;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 8px;
}

.edit-mode-notice p {
  margin: 0;
  font-size: 13px;
  color: var(--primary-color);
}

.edit-actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--border-color);
}

.cancel-btn {
  padding: 12px 24px;
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-btn:hover:not(:disabled) {
  border-color: var(--text-primary);
  color: var(--text-primary);
}

.cancel-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.api-loaded-section {
  border-color: rgba(34, 197, 94, 0.3);
}

.api-data-display {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin: 16px 0 0 0;
  padding: 16px;
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  border-radius: 8px;
}

.api-data-display .data-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.api-data-display .data-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.api-data-display .data-value {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.check-mark {
  color: var(--success-color);
  font-weight: bold;
  margin-left: 8px;
}

.market-cap-input-group {
  display: flex;
  gap: 8px;
}

.market-cap-input-group .form-input {
  flex: 1;
}

.currency-display {
  padding: 10px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 14px;
  color: var(--text-secondary);
  min-width: 70px;
  text-align: center;
}

.fetch-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.fetch-data-button {
  padding: 14px 32px;
  background: linear-gradient(135deg, var(--primary-color), #d97706);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.fetch-data-button.large {
  width: 100%;
  padding: 16px 32px;
  font-size: 16px;
  margin-top: 8px;
}

.fetch-data-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(245, 158, 11, 0.3);
}

.fetch-data-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.fetch-error {
  display: flex;
  gap: 16px;
  padding: 20px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
}

.error-icon {
  font-size: 24px;
}

.error-content {
  flex: 1;
}

.error-title {
  margin: 0 0 8px 0;
  font-weight: 600;
  color: var(--danger-color);
}

.error-text {
  margin: 0 0 16px 0;
  font-size: 14px;
  color: var(--text-secondary);
}

.error-actions {
  display: flex;
  gap: 12px;
}

.retry-btn {
  padding: 8px 16px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.retry-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.switch-btn {
  padding: 8px 16px;
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.switch-btn:hover {
  border-color: var(--text-primary);
  color: var(--text-primary);
}

.form-actions {
  display: flex;
  justify-content: center;
}

.generate-button {
  padding: 14px 48px;
  background: linear-gradient(135deg, var(--primary-color), #d97706);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.generate-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(245, 158, 11, 0.3);
}

.generate-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 24px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  gap: 16px;
}

.spinner-large {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-text {
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
}

.preview-section {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 24px;
}

.api-success-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  border-radius: 8px;
  margin-bottom: 20px;
  color: var(--success-color);
  font-size: 14px;
  font-weight: 500;
}

.api-success-banner .success-icon {
  font-size: 16px;
}

.preview-section h2 {
  margin: 0 0 20px 0;
  font-size: 16px;
  color: var(--text-primary);
}

.currency-selector {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.currency-selector label {
  font-size: 14px;
  color: var(--text-secondary);
}

.currency-selector .form-select {
  width: auto;
  min-width: 150px;
}

.valuation-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}

.valuation-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.valuation-card.highlight {
  border-color: var(--primary-color);
  background: rgba(245, 158, 11, 0.1);
}

.valuation-card.highlight.projected {
  border-color: rgba(139, 92, 246, 0.5);
  background: rgba(139, 92, 246, 0.08);
}

.val-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.val-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  font-family: 'JetBrains Mono', monospace;
}

.na-value {
  color: var(--text-muted);
}

.tooltip-trigger {
  margin-left: 4px;
  font-size: 12px;
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

.valuation-card.projected {
  border-color: rgba(139, 92, 246, 0.4);
  background: rgba(139, 92, 246, 0.05);
}

.valuation-card.projected .val-value {
  color: #a78bfa;
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.save-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
}

.save-button {
  padding: 12px 32px;
  background: var(--success-color);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.save-button:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}

.save-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.reset-button {
  padding: 12px 32px;
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.reset-button:hover:not(:disabled) {
  border-color: var(--text-primary);
  color: var(--text-primary);
}

.reset-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-spinner.small {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: currentColor;
}

@media (max-width: 768px) {
  .page-header {
    padding: 0 16px;
  }

  .main-content {
    padding: 20px 16px;
  }

  .source-selector {
    flex-direction: column;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .market-cap-input-group {
    flex-direction: column;
  }

  .currency-display {
    text-align: left;
  }

  .fetch-error {
    flex-direction: column;
    gap: 12px;
  }

  .error-actions {
    flex-direction: column;
  }

  .valuation-cards {
    grid-template-columns: repeat(2, 1fr);
  }

  .charts-grid {
    grid-template-columns: 1fr;
  }

  .save-actions {
    flex-direction: column;
  }
}

.search-input-group {
  flex: 1;
}

.search-input-wrapper {
  display: flex;
  gap: 8px;
}

.search-input-wrapper .form-input {
  flex: 1;
}

.search-button {
  padding: 8px 12px;
  background: var(--btn-primary-bg);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.search-button:hover:not(:disabled) {
  background: var(--btn-primary-hover-bg);
}

.search-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--card-bg);
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  color: var(--text-primary);
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.modal-close:hover {
  color: var(--text-primary);
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
}

.search-input-container {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.search-modal-input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 14px;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.search-modal-input:focus {
  outline: none;
  border-color: var(--btn-primary-bg);
}

.search-modal-btn {
  padding: 10px 16px;
  background: var(--btn-primary-bg);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.search-modal-btn:hover {
  background: var(--btn-primary-hover-bg);
}

.search-loading,
.search-empty {
  text-align: center;
  padding: 20px;
  color: var(--text-secondary);
}

.search-results {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.search-result-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--bg-primary);
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.search-result-item:hover {
  background: var(--btn-primary-bg);
  color: white;
}

.search-result-item:hover .result-market {
  color: rgba(255, 255, 255, 0.8);
}

.result-main {
  display: flex;
  gap: 8px;
  align-items: center;
}

.result-name {
  font-weight: 500;
}

.result-code {
  color: var(--text-secondary);
  font-size: 13px;
}

.result-market {
  color: var(--text-secondary);
  font-size: 13px;
}
</style>
