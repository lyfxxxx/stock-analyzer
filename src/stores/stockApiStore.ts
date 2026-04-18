import { defineStore } from 'pinia'
import type { StockData, TargetPriceConfig } from '@/types/stock'
import { fetchEastMoneyStockInfo, testEastMoneyAPI, searchStocksByName } from '@/api/eastmoney'
import { testTencentAPI, fetchTencentHKFinancialReport } from '@/api/tencent'
import { fetchAStockFinancialReport } from '@/api/financialReportA'
import { fetchHKStockFinancialReport } from '@/api/financialReportHK'
import { fetchExchangeRates } from '@/api/exchangeRate'
import { calculateNetCash, calculateFreeCashFlow, calculateValuations, calculatePERatio } from '@/utils/calculator'
import { buildYearlyData } from '@/utils/excelParser'
import { logger } from '@/utils/logger'
import { useStockUIStore } from './stockUIStore'
import { useStockListStore } from './stockListStore'
import { stockDB } from '@/db'

export const useStockApiStore = defineStore('stockApi', () => {
  async function testAPIs() {
    const ui = useStockUIStore()
    ui.loading = true
    ui.apiTestResults = []

    try {
      // 测试东方财富 API
      const eastMoneyResult = await testEastMoneyAPI()
      
      // 测试腾讯 API
      const tencentResult = await testTencentAPI()
      
      ui.apiTestResults = [eastMoneyResult, tencentResult]
      ui.isApiAvailable = eastMoneyResult.status === 'success' || tencentResult.status === 'success'
    } catch (err) {
      logger.error('stockApiStore', 'API test error:', err)
      ui.isApiAvailable = false
    } finally {
      ui.loading = false
    }
  }

  async function fetchStockInfo(code: string, market: 'HK' | 'A') {
    const ui = useStockUIStore()
    ui.loading = true
    ui.error = null

    try {
      const result = await fetchEastMoneyStockInfo(code, market)

      if (!result) {
        throw new Error('无法获取股票信息，请检查代码是否正确')
      }

      return result
    } catch (err) {
      ui.error = err instanceof Error ? err.message : '获取股票信息失败'
      throw err
    } finally {
      ui.loading = false
    }
  }

  async function fetchFinancialReport(code: string, market: 'HK' | 'A', marketCap: number) {
    const ui = useStockUIStore()
    ui.loading = true
    ui.error = null

    try {
      let reportResult
      
      if (market === 'HK') {
        // 优先使用东方财富，失败则使用腾讯
        const eastMoneyResult = await fetchHKStockFinancialReport(code)
        
        if (eastMoneyResult.error || !eastMoneyResult.data) {
          logger.warn('stockApiStore', '东方财富港股API失败，尝试腾讯API')
          const tencentResult = await fetchTencentHKFinancialReport(code)
          
          if (tencentResult.error || !tencentResult.data) {
            throw new Error(tencentResult.error?.message || '获取财报数据失败')
          }
          reportResult = tencentResult
        } else {
          reportResult = eastMoneyResult
        }
      } else {
        reportResult = await fetchAStockFinancialReport(code)
      }

      if (reportResult.error || !reportResult.data) {
        throw new Error(reportResult.error?.message || '获取财报数据失败')
      }

      const financialData = reportResult.data

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

      // 如果获取的是港股，市值单位是HKD，A股则为CNY

      const netCash = calculateNetCash(latestCash, latestShortTermDebt, latestLongTermDebt)
      const freeCashFlow = calculateFreeCashFlow(latestOperatingCF, latestCapEx)
      const peRatio = calculatePERatio(marketCap, latestNetProfit)
      const { valuation1, valuation2 } = calculateValuations(
        marketCap,
        netCash,
        freeCashFlow,
        latestNetProfit
      )

      const yearlyData = buildYearlyData(
        financialData.years,
        financialData.operatingCashFlow,
        financialData.capitalExpenditure,
        financialData.netProfits,
        financialData.isProjected,
        financialData.netProfitProjected,
        financialData.freeCashFlowProjected,
        financialData.netCashProjected,
        financialData.currentRatioProjected,
        financialData.peRatioProjected
      )

      return {
        netCash,
        freeCashFlow,
        netProfit: latestNetProfit,
        currentRatio: financialData.currentRatio[0] ?? null,
        peRatio,
        valuation1,
        valuation2,
        yearlyData,
        baseCurrency: financialData.baseCurrency,
        source: 'api' as const,
        isUsingProjectedData: latestNetProfitProjected || latestFreeCashFlowProjected || latestNetCashProjected,
        netProfitProjected: latestNetProfitProjected,
        freeCashFlowProjected: latestFreeCashFlowProjected,
        netCashProjected: latestNetCashProjected,
        currentRatioProjected: financialData.currentRatioProjected[0] ?? false,
        peRatioProjected: financialData.peRatioProjected[0] ?? false,
        marketCap,
      }
    } catch (err) {
      ui.error = err instanceof Error ? err.message : '获取财报数据失败'
      throw err
    } finally {
      ui.loading = false
    }
  }

  async function updateStockMarketCap(id: string) {
    const ui = useStockUIStore()
    const list = useStockListStore()
    ui.loading = true
    ui.error = null

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
          totalShares: info.totalShares,
          updatedAt: Date.now()
        }
        await stockDB.put(updatedStock)
        await list.loadStocks()
      }
    } catch (err) {
      ui.error = err instanceof Error ? err.message : '更新市值失败'
      throw err
    } finally {
      ui.loading = false
    }
  }

  async function updateStockWithRecalculation(id: string, loadAfterUpdate: boolean = true) {
    const ui = useStockUIStore()
    const list = useStockListStore()
    ui.error = null

    // 添加到正在更新的ID集合
    ui.currentlyUpdatingIds.add(id)

    // 只有在非批量更新模式下才设置 loading 状态
    if (loadAfterUpdate !== false) {
      ui.loading = true
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
      // 注意：市值已经在 fetchFinancialReport 中转换为 HKD（如果是港股）
      const updatedStock: StockData = {
        ...stock,
        name: info.name,
        marketCap: financialResult.marketCap ?? info.marketCap,
        netCash: financialResult.netCash,
        freeCashFlow: financialResult.freeCashFlow,
        netProfit: financialResult.netProfit,
        currentRatio: financialResult.currentRatio,
        peRatio: financialResult.peRatio,
        valuation1: financialResult.valuation1,
        valuation2: financialResult.valuation2,
        yearlyData: financialResult.yearlyData,
        isUsingProjectedData: financialResult.isUsingProjectedData,
        netProfitProjected: financialResult.netProfitProjected,
        freeCashFlowProjected: financialResult.freeCashFlowProjected,
        netCashProjected: financialResult.netCashProjected,
        currentRatioProjected: financialResult.currentRatioProjected,
        peRatioProjected: financialResult.peRatioProjected,
        updatedAt: Date.now(),
        ...(info.totalShares !== null && { totalShares: info.totalShares }),
        // Auto-set target price config if not already configured
        ...(!stock.targetPriceConfig && info.totalShares !== null && {
          targetPriceConfig: {
            enabled: true,
            valuationType: 1 as const,
            targetValuation: 10
          } as TargetPriceConfig
        })
      }
      await stockDB.put(updatedStock)

      // 如果需要自动加载数据（单股票更新时），否则由调用者控制
      if (loadAfterUpdate) {
        await list.loadStocks()
      }

      return updatedStock
    } catch (err) {
      ui.error = err instanceof Error ? err.message : '更新并重新计算估值失败'
      throw err
    } finally {
      // 从正在更新的ID集合中移除
      ui.currentlyUpdatingIds.delete(id)

      // 只有在非批量更新模式下才管理 loading 状态
      // 批量更新时由 updateAllStocks 统一管理
      if (loadAfterUpdate !== false) {
        ui.loading = false
      }
    }
  }

  async function updateAllStocks(ids: string[]): Promise<{ success: number; failed: number }> {
    const ui = useStockUIStore()
    const list = useStockListStore()
    ui.isUpdatingAllStocks = true
    ui.loading = true
    ui.error = null
    let success = 0
    let failed = 0

    // 动态计算并发限制：最低5个，最多 ids.length
    // 公式: max(5, Math.ceil(ids.length / 3))
    const CONCURRENCY_LIMIT = Math.max(5, Math.ceil(ids.length / 3))

    // 初始化进度
    ui.updateProgress = { updated: 0, total: ids.length }
    ids.forEach(id => ui.currentlyUpdatingIds.add(id))

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
            logger.error('stockApiStore', `Failed to update ${id}:`, err)
            return { id, success: false }
          }
        })
      )

      // 统计结果并更新进度
      results.forEach((result, idx) => {
        const id = batch[idx]
        if (id !== undefined) {
          ui.currentlyUpdatingIds.delete(id)
        }
        if (result.status === 'fulfilled' && result.value.success) {
          success++
        } else {
          failed++
        }
      })

      // 更新进度
      ui.updateProgress = { updated: success + failed, total: ids.length }
    }

    // 重新加载所有股票数据（只在最后加载一次）
    await list.loadStocks()

    // 清除进度
    ui.updateProgress = { updated: 0, total: 0 }
    ui.isUpdatingAllStocks = false
    ui.currentlyUpdatingIds.clear()

    ui.loading = false
    return { success, failed }
  }

  async function searchStocks(query: string, market?: 'HK' | 'A') {
    const ui = useStockUIStore()
    ui.isSearching = true
    ui.searchResults = []
    try {
      ui.searchResults = await searchStocksByName(query, market)
    } catch (err) {
      logger.error('stockApiStore', 'Search stocks error:', err)
      ui.searchResults = []
    } finally {
      ui.isSearching = false
    }
  }

  return {
    testAPIs,
    fetchStockInfo,
    fetchFinancialReport,
    updateStockMarketCap,
    updateStockWithRecalculation,
    updateAllStocks,
    searchStocks
  }
})
