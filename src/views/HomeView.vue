<template>
  <div class="home-view">
    <header class="page-header">
      <div class="header-content">
        <div class="logo">
          <span class="logo-icon">S</span>
          <h1>StockAnalyzer</h1>
        </div>
        <div class="header-actions">
          <button 
            v-if="stockStore.stockCount > 0" 
            class="update-all-button" 
            :disabled="isUpdatingAll"
            @click="refreshAllMarketCaps"
          >
            <span v-if="isUpdatingAll" class="spinner-small"></span>
            <span v-else>↻</span>
            更新全部
          </button>
          <button class="add-button" @click="goToAdd">
            <span class="btn-icon">+</span>
            新增股票
          </button>
        </div>
      </div>
    </header>

    <main class="main-content">
      <ApiTester @update:available="handleApiAvailability" />
      
      <div v-if="stockStore.loading" class="loading-state">
        <div class="spinner"></div>
        <p>加载中...</p>
      </div>

      <div v-else-if="stockStore.stockCount === 0" class="empty-state">
        <div class="empty-icon">S</div>
        <h3>还没有股票数据</h3>
        <p>点击右上角"新增股票"开始分析</p>
      </div>

      <template v-else>
        <div class="search-bar">
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="搜索股票名称或代码..."
            class="search-input"
          >
          <span v-if="searchQuery" class="search-clear" @click="searchQuery = ''">✕</span>
        </div>

        <div v-if="filteredStocks.length === 0" class="no-results">
          <p>没有找到匹配的股票</p>
        </div>

        <div v-else class="stocks-grid">
          <StockCard
            v-for="stock in filteredStocks"
            :key="stock.id"
            :stock="stock"
            @click="goToDetail(stock.id)"
          />
        </div>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useStockStore } from '@/stores/stockStore'
import ApiTester from '@/components/ApiTester.vue'
import StockCard from '@/components/StockCard.vue'

const router = useRouter()
const stockStore = useStockStore()

const isApiAvailable = ref(false)
const isUpdatingAll = ref(false)
const searchQuery = ref('')

const filteredStocks = computed(() => {
  if (!searchQuery.value.trim()) {
    return stockStore.sortedStocks
  }
  const query = searchQuery.value.toLowerCase()
  return stockStore.stocks.filter(stock => 
    stock.name.toLowerCase().includes(query) ||
    stock.code.toLowerCase().includes(query)
  )
})

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
  if (!isApiAvailable.value || isUpdatingAll.value) return
  
  isUpdatingAll.value = true
  try {
    for (const stock of stockStore.stocks) {
      try {
        await stockStore.updateStockWithRecalculation(stock.id)
      } catch (e) {
        console.error(`Failed to update ${stock.code}:`, e)
      }
    }
    updateRefreshDate()
  } finally {
    isUpdatingAll.value = false
  }
}

function handleApiAvailability(available: boolean) {
  isApiAvailable.value = available
}

function goToAdd() {
  router.push('/add')
}

function goToDetail(id: string) {
  router.push(`/stock/${id}`)
}

onMounted(async () => {
  await stockStore.loadStocks()
  await stockStore.testAPIs()
  isApiAvailable.value = stockStore.isApiAvailable
  
  if (isApiAvailable.value && stockStore.stocks.length > 0 && shouldRefreshToday()) {
    await refreshAllMarketCaps()
  }
})
</script>

<style scoped>
.home-view {
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
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 64px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, var(--primary-color), var(--accent-color));
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: white;
  font-size: 18px;
}

.logo h1 {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  background: linear-gradient(135deg, var(--primary-color), var(--accent-color));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.add-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: var(--accent-color);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.add-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
}

.update-all-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.update-all-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
}

.update-all-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinner-small {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.btn-icon {
  font-size: 18px;
  font-weight: 300;
}

.main-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  color: var(--text-secondary);
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

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100px 20px;
  text-align: center;
}

.empty-icon {
  width: 80px;
  height: 80px;
  background: var(--card-bg);
  border: 2px solid var(--border-color);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  font-weight: 700;
  color: var(--primary-color);
  margin-bottom: 24px;
}

.empty-state h3 {
  margin: 0 0 8px 0;
  font-size: 20px;
  color: var(--text-primary);
}

.empty-state p {
  margin: 0;
  color: var(--text-secondary);
}

.search-bar {
  position: relative;
  margin-bottom: 24px;
}

.search-input {
  width: 100%;
  padding: 12px 16px;
  padding-right: 40px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 14px;
  color: var(--text-primary);
  transition: border-color 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: var(--primary-color);
}

.search-input::placeholder {
  color: var(--text-muted);
}

.search-clear {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  cursor: pointer;
  color: var(--text-muted);
  font-size: 14px;
  padding: 4px;
}

.search-clear:hover {
  color: var(--text-primary);
}

.no-results {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-secondary);
}

.stocks-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
}

@media (max-width: 768px) {
  .page-header {
    padding: 0 16px;
  }
  
  .header-content {
    height: 56px;
  }
  
  .logo h1 {
    font-size: 18px;
  }
  
  .add-button {
    padding: 8px 14px;
    font-size: 13px;
  }
  
  .main-content {
    padding: 16px;
  }
  
  .stocks-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}
</style>
