import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { StockData } from '@/types/stock'
import { stockDB } from '@/db'
import { logger } from '@/utils/logger'
import { useStockUIStore } from './stockUIStore'
import { fetchStockTotalShares } from '@/api/eastmoney'
import { calculateTargetPrice } from '@/utils/targetPriceCalculator'
import type { TargetPriceConfig } from '@/types/stock'
import type { PRRFormulaType, PRRTargetPriceConfig } from '@/types/prr'
import { calculatePRRTargetPrice } from '@/utils/prr-target-price'

export const useStockListStore = defineStore('stockList', () => {
  const stocks = ref<StockData[]>([])

  // Debounce state for lazy backfill
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
    // PRR fields normalization
    if (normalized.roe === undefined) {
      normalized.roe = null
    }
    if (normalized.roa === undefined) {
      normalized.roa = null
    }
    if (normalized.roeProjected === undefined) {
      normalized.roeProjected = false
    }
    if (normalized.roaProjected === undefined) {
      normalized.roaProjected = false
    }
    if (normalized.pbRatio === undefined) {
      normalized.pbRatio = null
    }
    if (normalized.dividendPayoutRatio === undefined) {
      normalized.dividendPayoutRatio = null
    }
    if (normalized.prrBase === undefined) {
      normalized.prrBase = null
    }
    if (normalized.prrAdjusted === undefined) {
      normalized.prrAdjusted = null
    }
    if (normalized.prrCycle === undefined) {
      normalized.prrCycle = null
    }
    if (normalized.prrIndex === undefined) {
      normalized.prrIndex = null
    }
    if (normalized.prrDerived === undefined) {
      normalized.prrDerived = null
    }
    if (normalized.prrSelectedFormula === undefined) {
      normalized.prrSelectedFormula = 'base'
    }
    if (normalized.prrTargetPriceConfig === undefined) {
      normalized.prrTargetPriceConfig = null
    }
    if (normalized.targetPriceMethod === undefined) {
      // Backward compatibility: if prrTargetPriceConfig exists, default to 'prr'
      // Otherwise if targetPriceConfig exists, default to 'traditional'
      if (normalized.prrTargetPriceConfig?.enabled) {
        normalized.targetPriceMethod = 'prr'
      } else if (normalized.targetPriceConfig?.enabled) {
        normalized.targetPriceMethod = 'traditional'
      } else {
        normalized.targetPriceMethod = 'traditional'
      }
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
        updatedAt: Date.now(),
        // Preserve existing PRR fields (recalculation requires API access to indicators)
        roe: stock.roe,
        roa: stock.roa,
        pbRatio: stock.pbRatio,
        dividendPayoutRatio: stock.dividendPayoutRatio,
        prrBase: stock.prrBase,
        prrAdjusted: stock.prrAdjusted,
        prrCycle: stock.prrCycle,
        prrIndex: stock.prrIndex,
        prrDerived: stock.prrDerived,
        prrSelectedFormula: stock.prrSelectedFormula,
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

  async function updatePrrFormula(
    id: string,
    formula: PRRFormulaType
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
        prrSelectedFormula: formula,
        updatedAt: Date.now()
      }
      await stockDB.put(updatedStock)
      await loadStocks()
    } catch (err) {
      ui.error = err instanceof Error ? err.message : '更新PRR公式失败'
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
        targetPriceMethod: 'traditional',
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

  async function updatePrrTargetPriceConfig(
    id: string,
    config: PRRTargetPriceConfig
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
        prrTargetPriceConfig: {
          enabled: config.enabled,
          formulaType: config.formulaType,
          targetPR: config.targetPR
        },
        targetPriceMethod: 'prr',
        updatedAt: Date.now()
      }
      await stockDB.put(updatedStock)
      await loadStocks()
    } catch (err) {
      ui.error = err instanceof Error ? err.message : '更新PRR目标价配置失败'
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

    const method = stock.targetPriceMethod ?? 'traditional'

    if (method === 'prr') {
      const prrConfig = stock.prrTargetPriceConfig
      if (prrConfig && prrConfig.enabled) {
        return calculatePRRTargetPrice({
          targetPR: prrConfig.targetPR,
          roe: stock.roe ?? null,
          netProfit: stock.netProfit ?? null,
          totalShares: stock.totalShares
        })
      }
      return { price: null as number | null, error: null }
    }

    // Traditional target price
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
    updatePrrFormula,
    updateTargetPriceConfig,
    updatePrrTargetPriceConfig,
    getTargetPrice,
    resetTargetPriceConfig,
    updateTotalShares,
    normalizeStockData
  }
})
