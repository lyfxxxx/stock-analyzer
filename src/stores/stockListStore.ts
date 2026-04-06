import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { StockData } from '@/types/stock'
import { stockDB } from '@/db'
import { logger } from '@/utils/logger'
import { useStockUIStore } from './stockUIStore'

export const useStockListStore = defineStore('stockList', () => {
  const stocks = ref<StockData[]>([])

  const sortedStocks = computed(() => {
    return [...stocks.value].sort((a, b) => b.updatedAt - a.updatedAt)
  })

  const stockCount = computed(() => stocks.value.length)

  function normalizeStockData(stock: Record<string, any>): StockData {
    const normalized = stock as StockData
    if (normalized.netProfitProjected === undefined) {
      normalized.netProfitProjected = normalized.isUsingProjectedData ?? false
    }
    if (normalized.freeCashFlowProjected === undefined) {
      normalized.freeCashFlowProjected = normalized.isUsingProjectedData ?? false
    }
    if (normalized.netCashProjected === undefined) {
      normalized.netCashProjected = normalized.isUsingProjectedData ?? false
    }
    if (normalized.currentRatio === undefined) {
      normalized.currentRatio = null
    }
    if (normalized.currentRatioProjected === undefined) {
      normalized.currentRatioProjected = false
    }
    if (normalized.peRatio === undefined) {
      normalized.peRatio = null
    }
    if (normalized.peRatioProjected === undefined) {
      normalized.peRatioProjected = false
    }
    return normalized
  }

  async function loadStocks() {
    const ui = useStockUIStore()
    ui.loading = true
    ui.error = null
    try {
      await stockDB.init()
      const rawStocks = await stockDB.getAll()
      stocks.value = rawStocks.map(normalizeStockData)
    } catch (err) {
      ui.error = err instanceof Error ? err.message : '加载数据失败'
      logger.error('stockListStore', 'Load stocks error:', err)
    } finally {
      ui.loading = false
    }
  }

  async function addStock(stock: StockData) {
    const ui = useStockUIStore()
    ui.loading = true
    ui.error = null
    try {
      await stockDB.init()
      await stockDB.put(stock)
      await loadStocks()
    } catch (err) {
      ui.error = err instanceof Error ? err.message : '添加股票失败'
      throw err
    } finally {
      ui.loading = false
    }
  }

  async function deleteStock(id: string) {
    const ui = useStockUIStore()
    ui.loading = true
    ui.error = null
    try {
      await stockDB.init()
      await stockDB.delete(id)
      await loadStocks()
    } catch (err) {
      ui.error = err instanceof Error ? err.message : '删除股票失败'
      throw err
    } finally {
      ui.loading = false
    }
  }

  async function getStockById(id: string): Promise<StockData | null> {
    try {
      await stockDB.init()
      const stock = await stockDB.get(id)
      if (!stock) return null
      return normalizeStockData(stock)
    } catch (err) {
      logger.error('stockListStore', 'Get stock error:', err)
      return null
    }
  }

  async function updateStock(id: string, data: { name: string; marketCap: number }) {
    const ui = useStockUIStore()
    ui.loading = true
    ui.error = null
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
      ui.error = err instanceof Error ? err.message : '更新股票失败'
      throw err
    } finally {
      ui.loading = false
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
    const ui = useStockUIStore()
    ui.loading = true
    ui.error = null
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
      ui.error = err instanceof Error ? err.message : '重新计算失败'
      throw err
    } finally {
      ui.loading = false
    }
  }

  return {
    stocks,
    sortedStocks,
    stockCount,
    loadStocks,
    addStock,
    deleteStock,
    getStockById,
    updateStock,
    recalculateStock,
    normalizeStockData
  }
})
