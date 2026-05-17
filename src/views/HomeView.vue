<template>
  <div class="home-view">
    <div class="api-tester-container">
      <ApiTester />
    </div>

    <div v-if="stockStore.loading" class="loading-state">
      <div class="spinner"></div>
      <p>加载中...</p>
    </div>

    <div v-else-if="stockStore.stockCount === 0" class="empty-state">
      <div class="empty-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
          <polyline points="16 7 22 7 22 13"></polyline>
        </svg>
      </div>
      <h3>还没有股票数据</h3>
      <p>点击右上角"新增"开始分析</p>
      <button class="add-button" @click="goToAdd">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        新增股票
      </button>
    </div>

    <template v-else>
      <!-- Stats Bar -->
      <div class="stats-bar">
        <div class="stat-item">
          <span class="stat-value font-mono-nums">{{ stockStore.stockCount }}</span>
          <span class="stat-label">只股票</span>
        </div>
        <div class="stat-item">
          <span class="stat-value font-mono-nums val-low">{{ lowValCount }}</span>
          <span class="stat-label">低估值</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-value font-mono-nums">{{ hkCount }}</span>
          <span class="stat-label">港股</span>
        </div>
        <div class="stat-item">
          <span class="stat-value font-mono-nums">{{ ashareCount }}</span>
          <span class="stat-label">A股</span>
        </div>
      </div>

      <!-- Toolbar -->
      <div class="toolbar">
        <div class="search-wrapper">
          <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索股票名称或代码..."
            class="search-input"
          >
          <button v-if="searchQuery" class="search-clear" @click="searchQuery = ''">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div class="toolbar-actions">
          <TagFilter
            :available-tags="tagStore.sortedTags"
            v-model="selectedTagIds"
          />
          <button
            class="manage-tags-button"
            @click="showTagManager = true"
            title="管理标签"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
              <line x1="7" y1="7" x2="7.01" y2="7"></line>
            </svg>
          </button>
          <ViewToggle v-model="viewMode" />
          <button
            v-if="stockStore.stockCount > 0"
            class="update-all-button"
            :disabled="stockStore.isUpdatingAllStocks || !stockStore.isApiAvailable"
            @click="refreshAllMarketCaps"
          >
            <span v-if="stockStore.isUpdatingAllStocks" class="spinner-sm"></span>
            <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="23 4 23 10 17 10"></polyline>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
            </svg>
            <span v-if="stockStore.isUpdatingAllStocks && stockStore.updateProgress.total > 0">
              {{ stockStore.updateProgress.updated }}/{{ stockStore.updateProgress.total }}
            </span>
            <span v-else-if="!stockStore.isUpdatingAllStocks">更新全部</span>
          </button>
          <button class="add-button" @click="goToAdd">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span class="add-label">新增</span>
          </button>
        </div>
      </div>

      <!-- Content -->
      <div v-if="filteredStocks.length === 0" class="no-results">
        <p>没有找到匹配的股票</p>
      </div>

      <div v-if="viewMode === 'card'" class="stocks-grid">
        <StockCard
          v-for="stock in filteredStocks"
          :key="stock.id"
          :stock="stock"
          :is-updating="stockStore.currentlyUpdatingIds.has(stock.id)"
          @click="goToDetail(stock.id)"
        />
      </div>
      <div v-else class="table-container">
        <StockTable
          :stocks="filteredStocks"
          :updating-ids="stockStore.currentlyUpdatingIds"
          @click="(stock: StockData) => goToDetail(stock.id)"
        />
      </div>
    </template>

    <!-- Tag Manager Dialog -->
    <TagManager :visible="showTagManager" @close="showTagManager = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useStockStore } from '@/stores/stockStore'
import { useTagStore } from '@/stores/tagStore'
import type { StockData } from '@/types/stock'
import ApiTester from '@/components/ApiTester.vue'
import StockCard from '@/components/StockCard.vue'
import StockTable from '@/components/StockTable.vue'
import ViewToggle from '@/components/ViewToggle.vue'
import TagFilter from '@/components/TagFilter.vue'
import TagManager from '@/components/TagManager.vue'

const router = useRouter()
const stockStore = useStockStore()
const tagStore = useTagStore()

const searchQuery = ref('')
const viewMode = ref<'card' | 'table'>('card')
const selectedTagIds = ref<string[]>([])
const showTagManager = ref(false)

// Device-aware default: mobile defaults to table
onMounted(() => {
  const saved = localStorage.getItem('stock-analyzer-view')
  if (saved === 'card' || saved === 'table') {
    viewMode.value = saved
  } else if (window.innerWidth < 768) {
    viewMode.value = 'table'
  }
})

const filteredStocks = computed(() => {
  let stocks = stockStore.sortedStocks

  // Tag filter (AND logic)
  if (selectedTagIds.value.length > 0) {
    const matchingIds = new Set(tagStore.getStocksByTagIds(selectedTagIds.value))
    stocks = stocks.filter(stock => matchingIds.has(stock.id))
  }

  // Search filter
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    stocks = stocks.filter(stock =>
      stock.name.toLowerCase().includes(query) ||
      stock.code.toLowerCase().includes(query)
    )
  }

  return stocks
})

const lowValCount = computed(() =>
  stockStore.stocks.filter(s => s.valuation1 !== null && s.valuation1 < 10).length
)

const hkCount = computed(() =>
  stockStore.stocks.filter(s => s.market === 'HK').length
)

const ashareCount = computed(() =>
  stockStore.stocks.filter(s => s.market === 'A').length
)

const STORAGE_KEY = 'stock_last_refresh_date'

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0] ?? ''
}

function shouldRefreshToday(): boolean {
  const lastDate = localStorage.getItem(STORAGE_KEY)
  const today = getTodayDate()
  return lastDate !== today
}

function updateRefreshDate() {
  localStorage.setItem(STORAGE_KEY, getTodayDate())
}

async function refreshAllMarketCaps() {
  if (!stockStore.isApiAvailable || stockStore.isUpdatingAllStocks) return

  try {
    const ids = stockStore.stocks.map(s => s.id)
    await stockStore.updateAllStocks(ids)
    updateRefreshDate()
  } finally {
    // isUpdatingAllStocks is managed by the store
  }
}

function goToAdd() {
  router.push('/add')
}

function goToDetail(id: string) {
  router.push(`/stock/${id}`)
}

onMounted(async () => {
  await tagStore.init()
  await stockStore.loadStocks()
  await stockStore.testAPIs()

  if (stockStore.isApiAvailable && stockStore.stocks.length > 0 && shouldRefreshToday()) {
    await refreshAllMarketCaps()
  }
})
</script>

<style scoped>
.home-view {
  min-height: 100vh;
  background-color: var(--bg-primary);
}

.api-tester-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 16px 24px 0;
}

/* Stats Bar */
.stats-bar {
  max-width: 1400px;
  margin: 0 auto;
  padding: 16px 24px 0;
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-item {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
}

.stat-label {
  font-size: 13px;
  color: var(--text-muted);
}

.stat-divider {
  width: 1px;
  height: 20px;
  background-color: var(--border-secondary);
  margin: 0 4px;
}

/* Toolbar */
.toolbar {
  max-width: 1400px;
  margin: 0 auto;
  padding: 12px 24px 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.search-wrapper {
  flex: 1;
  position: relative;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 10px 16px 10px 36px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg, 8px);
  font-size: 14px;
  color: var(--text-primary);
  font-family: var(--font-sans);
  transition: border-color var(--transition-fast), background-color var(--transition-fast);
}

.search-input:focus {
  outline: none;
  border-color: var(--brand-primary);
  background-color: var(--bg-input);
}

.search-input::placeholder {
  color: var(--text-muted);
}

.search-clear {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
}

.search-clear:hover {
  color: var(--text-primary);
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

/* Buttons */
.update-all-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg, 8px);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  font-family: var(--font-sans);
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.update-all-button:hover:not(:disabled) {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
  border-color: var(--border-secondary);
}

.update-all-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.add-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background-color: var(--brand-primary);
  border: none;
  border-radius: var(--radius-lg, 8px);
  color: white;
  font-size: 13px;
  font-weight: 600;
  font-family: var(--font-sans);
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.add-button:hover {
  background-color: var(--brand-primary-hover);
}

.add-label {
  display: inline;
}

.manage-tags-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg, 8px);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.manage-tags-button:hover {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
  border-color: var(--border-secondary);
}

/* Content */
.stocks-grid {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px 24px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 16px;
}

.table-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px 24px;
}

/* Loading */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  color: var(--text-secondary);
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border-secondary);
  border-top-color: var(--brand-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.spinner-sm {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100px 20px;
  text-align: center;
}

.empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-2xl, 16px);
  color: var(--brand-primary);
  margin-bottom: 20px;
}

.empty-state h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.empty-state p {
  margin: 0 0 24px 0;
  color: var(--text-secondary);
  font-size: 14px;
}

.empty-state .add-button {
  padding: 10px 24px;
  font-size: 14px;
}

.no-results {
  max-width: 1400px;
  margin: 0 auto;
  text-align: center;
  padding: 40px 20px;
  color: var(--text-secondary);
}

/* Responsive */
@media (max-width: 768px) {
  .api-tester-container {
    padding: 12px 16px 0;
  }

  .stats-bar {
    padding: 12px 16px 0;
    gap: 12px;
  }

  .toolbar {
    padding: 10px 16px 0;
    flex-wrap: wrap;
  }

  .search-wrapper {
    flex: 1 1 100%;
    order: 2;
  }

  .toolbar-actions {
    flex: 1;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 6px;
  }

  .tag-manager-btn span,
  .update-all-button span,
  .add-label {
    display: none;
  }

  .stocks-grid,
  .table-container {
    padding: 12px 16px;
    grid-template-columns: 1fr;
  }
}

/* Responsive - Mobile */
@media (max-width: 640px) {
  .stats-bar {
    padding: 10px 12px 0;
    gap: 8px;
    flex-wrap: wrap;
  }

  .stat-value {
    font-size: 16px;
  }

  .stat-label {
    font-size: 12px;
  }

  .toolbar {
    padding: 8px 12px 0;
    gap: 8px;
    flex-wrap: wrap;
  }

  .search-wrapper {
    flex: 1 1 100%;
    order: 2;
  }

  .toolbar-actions {
    flex: 1;
    justify-content: space-between;
    gap: 6px;
    flex-wrap: wrap;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }

  .toolbar-actions::-webkit-scrollbar {
    display: none;
  }

  .tag-manager-btn span,
  .update-all-button span,
  .add-label {
    display: none;
  }

  .tag-manager-btn {
    padding: 8px 10px;
  }

  .update-all-button {
    padding: 8px 10px;
  }

  .add-button {
    padding: 8px 12px;
  }

  .stocks-grid,
  .table-container {
    padding: 8px 12px;
  }

  .stocks-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .table-container {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
}

/* Responsive - Mobile Small */
@media (max-width: 640px) {
  .api-tester-container {
    padding: 8px 10px 0;
  }

  .stats-bar {
    padding: 10px 10px 0;
    gap: 8px;
    flex-wrap: wrap;
  }

  .stat-value {
    font-size: 14px;
  }

  .stat-label {
    font-size: 11px;
  }

  .stat-divider {
    display: none;
  }

  .toolbar {
    padding: 8px 10px 0;
    gap: 6px;
    flex-wrap: wrap;
  }

  .search-wrapper {
    flex: 1 1 100%;
    order: 2;
  }

  .search-input {
    padding: 8px 12px 8px 32px;
    font-size: 13px;
  }

  .toolbar-actions {
    flex: 1;
    justify-content: flex-start;
    gap: 4px;
    flex-wrap: wrap;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }

  .toolbar-actions::-webkit-scrollbar {
    display: none;
  }

  .stocks-grid,
  .table-container {
    padding: 6px 10px;
  }

  .stocks-grid {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .table-container {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
}
</style>