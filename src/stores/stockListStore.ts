import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { StockData } from '@/types/stock'
import { stockDB } from '@/db'
import { logger } from '@/utils/logger'
import { useStockUIStore } from './stockUIStore'
import { fetchStockTotalShares } from '@/api/eastmoney'
import { calculateTargetPrice } from '@/utils/targetPriceCalculator'
import type { TargetPriceConfig } from '@/types/stock'

export const useStockListStore = defineStore('stockList', () => {
  const stocks = ref<StockData[]>([])

  // Debounce state for lazy backfill
  const backfillDebounceTimers = new Map<string, ReturnType<typeof setTimeout>>()
  const backfillPending = new Set<string>()
  let backfillDebounceTimeout: ReturnType<typeof setTimeout> | null = null
  const BACKFILL_DEBOUNCE_MS = 500

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
    if (normalized.totalShares === undefined) {
      normalized.totalShares = null
    }
    if (normalized.targetPriceConfig === undefined) {
      normalized.targetPriceConfig = null
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

      const normalized = normalizeStockData(stock)

      // Lazy backfill: if totalShares is null and not already pending, trigger fetch
      if (normalized.totalShares === null && !backfillPending.has(id)) {
        backfillPending.add(id)

        // Debounce the actual fetch to prevent excessive API requests
        if (backfillDebounceTimeout) {
          clearTimeout(backfillDebounceTimeout)
        }
        backfillDebounceTimeout = setTimeout(async () => {
          try {
            const fetchedShares = await fetchStockTotalShares(normalized.code, normalized.market)
            if (fetchedShares !== null) {
              const updated = { ...normalized, totalShares: fetchedShares }
              await stockDB.put(updated)
              // Update the reactive stocks ref if this stock is loaded
              const idx = stocks.value.findIndex(s => s.id === normalized.id)
              if (idx !== -1) {
                stocks.value[idx] = updated
              }
            }
          } catch (err) {
            logger.error('stockListStore', 'Backfill totalShares failed:', err)
          } finally {
            backfillPending.delete(normalized.id)
          }
        }, BACKFILL_DEBOUNCE_MS)
      }

      return normalized
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

  async function updateTargetPriceConfig(
    id: string,
    config: TargetPriceConfig
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
        targetPriceConfig: {
          enabled: config.enabled,
          valuationType: config.valuationType,
          targetValuation: config.targetValuation
        },
        updatedAt: Date.now()
      }
      await stockDB.put(updatedStock)
      await loadStocks()
    } catch (err) {
      ui.error = err instanceof Error ? err.message : '更新目标价配置失败'
      throw err
    } finally {
      ui.loading = false
    }
  }

  function getTargetPrice(id: string) {
    const stock = stocks.value.find(s => s.id === id)
    if (!stock) {
      return { price: null as number | null, error: null }
    }

    const config = stock.targetPriceConfig
    if (!config || !config.enabled) {
      return { price: null as number | null, error: null }
    }

    return calculateTargetPrice({
      targetValuation: config.targetValuation,
      valuationType: config.valuationType,
      freeCashFlow: stock.freeCashFlow ?? 0,
      netProfit: stock.netProfit ?? 0,
      netCash: stock.netCash ?? 0,
      totalShares: stock.totalShares,
      currentRatio: stock.currentRatio
    })
  }

  async function resetTargetPriceConfig(id: string) {
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
        targetPriceConfig: null,
        updatedAt: Date.now()
      }
      await stockDB.put(updatedStock)
      await loadStocks()
    } catch (err) {
      ui.error = err instanceof Error ? err.message : '重置目标价配置失败'
      throw err
    } finally {
      ui.loading = false
    }
  }

  async function updateTotalShares(id: string, shares: number) {
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
        totalShares: shares,
        updatedAt: Date.now()
      }
      await stockDB.put(updatedStock)
      await loadStocks()
    } catch (err) {
      ui.error = err instanceof Error ? err.message : '更新总股本失败'
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
    updateTargetPriceConfig,
    getTargetPrice,
    resetTargetPriceConfig,
    updateTotalShares,
    normalizeStockData
  }
})
