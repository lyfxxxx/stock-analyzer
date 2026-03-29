import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { StockData, StockAnalysisResult, ApiTestResult, StockSearchResult } from '@/types/stock'
import { stockDB } from '@/db'
import { fetchEastMoneyStockInfo, testEastMoneyAPI, searchStocksByName } from '@/api/eastmoney'
import { fetchAStockFinancialReport } from '@/api/financialReportA'
import { fetchHKStockFinancialReport } from '@/api/financialReportHK'
import { calculateNetCash, calculateFreeCashFlow, calculateValuations } from '@/utils/calculator'
import { buildYearlyData } from '@/utils/excelParser'

export const useStockStore = defineStore('stock', () => {
  const stocks = ref<StockData[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const apiTestResults = ref<ApiTestResult[]>([])
  const isApiAvailable = ref(true)
  
  const searchResults = ref<StockSearchResult[]>([])
  const isSearching = ref(false)
  
  // 新增：更新进度跟踪
  const updateProgress = ref({ updated: 0, total: 0 })

  const sortedStocks = computed(() => {
    return [...stocks.value].sort((a, b) => b.updatedAt - a.updatedAt)
  })

  const stockCount = computed(() => stocks.value.length)

  async function loadStocks() {
    loading.value = true
    error.value = null
    try {
      await stockDB.init()
      stocks.value = await stockDB.getAll()
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载数据失败'
      console.error('Load stocks error:', err)
    } finally {
      loading.value = false
    }
  }

  async function addStock(stock: StockData) {
    loading.value = true
    error.value = null
    try {
      await stockDB.init()
      await stockDB.put(stock)
      await loadStocks()
    } catch (err) {
      error.value = err instanceof Error ? err.message : '添加股票失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deleteStock(id: string) {
    loading.value = true
    error.value = null
    try {
      await stockDB.init()
      await stockDB.delete(id)
      await loadStocks()
    } catch (err) {
      error.value = err instanceof Error ? err.message : '删除股票失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function getStockById(id: string): Promise<StockData | null> {
    try {
      await stockDB.init()
      return await stockDB.get(id)
    } catch (err) {
      console.error('Get stock error:', err)
      return null
    }
  }

  async function testAPIs() {
    loading.value = true
    apiTestResults.value = []
    
    try {
      const eastMoneyResult = await testEastMoneyAPI()
      apiTestResults.value = [eastMoneyResult]
      isApiAvailable.value = eastMoneyResult.status === 'success'
    } catch (err) {
      console.error('API test error:', err)
      isApiAvailable.value = false
    } finally {
      loading.value = false
    }
  }

  async function fetchStockInfo(code: string, market: 'HK' | 'A') {
    loading.value = true
    error.value = null
    
    try {
      const result = await fetchEastMoneyStockInfo(code, market)
      
      if (!result) {
        throw new Error('无法获取股票信息，请检查代码是否正确')
      }
      
      return result
    } catch (err) {
      error.value = err instanceof Error ? err.message : '获取股票信息失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchFinancialReport(code: string, market: 'HK' | 'A', marketCap: number) {
    loading.value = true
    error.value = null
    
    try {
      const reportResult = market === 'HK'
        ? await fetchHKStockFinancialReport(code)
        : await fetchAStockFinancialReport(code)
      
      if (reportResult.error || !reportResult.data) {
        throw new Error(reportResult.error?.message || '获取财报数据失败')
      }
      
      const financialData = reportResult.data
      
      const yearlyData = buildYearlyData(
        financialData.years,
        financialData.operatingCashFlow,
        financialData.capitalExpenditure,
        financialData.netProfits,
        financialData.isProjected,
        financialData.netProfitProjected,
        financialData.freeCashFlowProjected,
        financialData.netCashProjected
      )

      const latestIndex = 0
      const latestCash = financialData.cashAndEquivalents[latestIndex] || 0
      const latestShortTermDebt = financialData.shortTermDebt[latestIndex] || 0
      const latestLongTermDebt = financialData.longTermDebt[latestIndex] || 0
      const latestOperatingCF = financialData.operatingCashFlow[latestIndex] || 0
      const latestCapEx = financialData.capitalExpenditure[latestIndex] || 0
      const latestNetProfit = financialData.netProfits[latestIndex] || 0
      const latestNetProfitProjected = financialData.netProfitProjected[latestIndex] || false
      const latestFreeCashFlowProjected = financialData.freeCashFlowProjected[latestIndex] || false
      const latestNetCashProjected = financialData.netCashProjected[latestIndex] || false

      const netCash = calculateNetCash(latestCash, latestShortTermDebt, latestLongTermDebt)
      const freeCashFlow = calculateFreeCashFlow(latestOperatingCF, latestCapEx)
      const { valuation1, valuation2 } = calculateValuations(
        marketCap,
        netCash,
        freeCashFlow,
        latestNetProfit
      )

      return {
        netCash,
        freeCashFlow,
        netProfit: latestNetProfit,
        valuation1,
        valuation2,
        yearlyData,
        baseCurrency: 'HKD' as const,
        source: 'api' as const,
        isUsingProjectedData: latestNetProfitProjected || latestFreeCashFlowProjected || latestNetCashProjected,
        netProfitProjected: latestNetProfitProjected,
        freeCashFlowProjected: latestFreeCashFlowProjected,
        netCashProjected: latestNetCashProjected,
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '获取财报数据失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  function clearError() {
    error.value = null
  }

  async function updateStockMarketCap(id: string) {
    loading.value = true
    error.value = null
    
    try {
      const stock = await stockDB.get(id)
      if (!stock) {
        throw new Error('股票不存在')
      }
      
      const info = await fetchStockInfo(stock.code, stock.market)
      if (info) {
        const updatedStock = {
          ...stock,
          marketCap: info.marketCap,
          updatedAt: Date.now()
        }
        await stockDB.put(updatedStock)
        await loadStocks()
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '更新市值失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  // 新增：更新市值并重新计算估值
  // loadAfterUpdate: 是否在更新后自动加载数据，批量更新时设为false以避免频繁重载
  async function updateStockWithRecalculation(id: string, loadAfterUpdate: boolean = true) {
    error.value = null
    
    // 只有在非批量更新模式下才设置 loading 状态
    if (loadAfterUpdate !== false) {
      loading.value = true
    }
    
    try {
      const stock = await stockDB.get(id)
      if (!stock) {
        throw new Error('股票不存在')
      }
      
      // 1. 获取最新市值
      const info = await fetchStockInfo(stock.code, stock.market)
      if (!info) {
        throw new Error('获取市值失败')
      }
      
      // 2. 获取最新财报数据并计算估值
      const financialResult = await fetchFinancialReport(stock.code, stock.market, info.marketCap)
      
      // 3. 保存完整的股票数据（包含新市值和新估值）
      const updatedStock: StockData = {
        ...stock,
        name: info.name,
        marketCap: info.marketCap,
        netCash: financialResult.netCash,
        freeCashFlow: financialResult.freeCashFlow,
        netProfit: financialResult.netProfit,
        valuation1: financialResult.valuation1,
        valuation2: financialResult.valuation2,
        yearlyData: financialResult.yearlyData,
        isUsingProjectedData: financialResult.isUsingProjectedData,
        updatedAt: Date.now()
      }
      await stockDB.put(updatedStock)
      
      // 如果需要自动加载数据（单股票更新时），否则由调用者控制
      if (loadAfterUpdate) {
        await loadStocks()
      }
      
      return updatedStock
    } catch (err) {
      error.value = err instanceof Error ? err.message : '更新并重新计算估值失败'
      throw err
    } finally {
      // 只有在非批量更新模式下才管理 loading 状态
      // 批量更新时由 updateAllStocks 统一管理
      if (loadAfterUpdate !== false) {
        loading.value = false
      }
    }
  }
  // 新增：并行更新多个股票（动态并发限制）
  async function updateAllStocks(ids: string[]): Promise<{ success: number; failed: number }> {
    loading.value = true
    error.value = null
    let success = 0
    let failed = 0

    // 动态计算并发限制：最低5个，最多 ids.length
    // 公式: max(5, Math.ceil(ids.length / 3))
    const CONCURRENCY_LIMIT = Math.max(5, Math.ceil(ids.length / 3))
    
    // 初始化进度
    updateProgress.value = { updated: 0, total: ids.length }
    
    // 分批处理，每批最多 CONCURRENCY_LIMIT 个
    for (let i = 0; i < ids.length; i += CONCURRENCY_LIMIT) {
      const batch = ids.slice(i, i + CONCURRENCY_LIMIT)
      
      const results = await Promise.allSettled(
        batch.map(async (id) => {
          try {
            // 批量更新时不自动加载数据，避免频繁重载导致UI闪烁
            await updateStockWithRecalculation(id, false)
            return { id, success: true }
          } catch (err) {
            console.error(`Failed to update ${id}:`, err)
            return { id, success: false }
          }
        })
      )
      
      // 统计结果并更新进度
      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value.success) {
          success++
        } else {
          failed++
        }
      })
      
      // 更新进度
      updateProgress.value = { updated: success + failed, total: ids.length }
    }
    
    // 重新加载所有股票数据（只在最后加载一次）
    await loadStocks()
    
    // 清除进度
    updateProgress.value = { updated: 0, total: 0 }
    
    loading.value = false
    return { success, failed }
  }

  async function updateStock(id: string, data: { name: string; marketCap: number }) {
    loading.value = true
    error.value = null
    
    try {
      const stock = await stockDB.get(id)
      if (!stock) {
        throw new Error('股票不存在')
      }
      
      const updatedStock = {
        ...stock,
        name: data.name,
        marketCap: data.marketCap,
        updatedAt: Date.now()
      }
      await stockDB.put(updatedStock)
      await loadStocks()
    } catch (err) {
      error.value = err instanceof Error ? err.message : '更新股票失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function recalculateStock(
    id: string,
    data: {
      name: string
      marketCap: number
      netCash: number
      freeCashFlow: number
      netProfit: number
      valuation1: number | null
      valuation2: number
      yearlyData: { year: number; freeCashFlow: number; netProfit: number }[]
    }
  ) {
    loading.value = true
    error.value = null
    
    try {
      const stock = await stockDB.get(id)
      if (!stock) {
        throw new Error('股票不存在')
      }
      
      const updatedStock: StockData = {
        ...stock,
        name: data.name,
        marketCap: data.marketCap,
        netCash: data.netCash,
        freeCashFlow: data.freeCashFlow,
        netProfit: data.netProfit,
        valuation1: data.valuation1,
        valuation2: data.valuation2,
        yearlyData: data.yearlyData,
        updatedAt: Date.now()
      }
      await stockDB.put(updatedStock)
      await loadStocks()
    } catch (err) {
      error.value = err instanceof Error ? err.message : '重新计算失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function searchStocks(query: string, market?: 'HK' | 'A') {
    isSearching.value = true
    searchResults.value = []
    try {
      searchResults.value = await searchStocksByName(query, market)
    } catch (err) {
      console.error('Search stocks error:', err)
      searchResults.value = []
    } finally {
      isSearching.value = false
    }
  }

  function clearSearchResults() {
    searchResults.value = []
  }

  return {
    stocks,
    loading,
    error,
    apiTestResults,
    isApiAvailable,
    searchResults,
    isSearching,
    updateProgress,
    
    sortedStocks,
    stockCount,
    
    loadStocks,
    addStock,
    deleteStock,
    getStockById,
    testAPIs,
    fetchStockInfo,
    fetchFinancialReport,
    clearError,
    updateStockMarketCap,
    updateStockWithRecalculation,
    updateAllStocks,
    updateStock,
    recalculateStock,
    searchStocks,
    clearSearchResults
  }
})
