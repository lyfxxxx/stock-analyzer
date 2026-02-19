import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { StockData, StockAnalysisResult, ApiTestResult } from '@/types/stock'
import { stockDB } from '@/db'
import { fetchEastMoneyStockInfo, testEastMoneyAPI } from '@/api/eastmoney'
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
        financialData.isProjected
      )

      const latestIndex = 0
      const latestCash = financialData.cashAndEquivalents[latestIndex] || 0
      const latestShortTermDebt = financialData.shortTermDebt[latestIndex] || 0
      const latestLongTermDebt = financialData.longTermDebt[latestIndex] || 0
      const latestOperatingCF = financialData.operatingCashFlow[latestIndex] || 0
      const latestCapEx = financialData.capitalExpenditure[latestIndex] || 0
      const latestNetProfit = financialData.netProfits[latestIndex] || 0
      const latestIsProjected = financialData.isProjected[latestIndex] || false

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
        isUsingProjectedData: latestIsProjected
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

  return {
    stocks,
    loading,
    error,
    apiTestResults,
    isApiAvailable,
    
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
    updateStock,
    recalculateStock
  }
})
