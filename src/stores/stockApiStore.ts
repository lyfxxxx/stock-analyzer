import { defineStore } from 'pinia'
import type { StockData, TargetPriceConfig } from '@/types/stock'
import { fetchEastMoneyStockInfo, testEastMoneyAPI, searchStocksByName } from '@/api/eastmoney'
import { testTencentAPI, fetchTencentHKFinancialReport } from '@/api/tencent'
import { fetchAStockFinancialReport } from '@/api/financialReportA'
import { fetchHKStockFinancialReport } from '@/api/financialReportHK'
import { calculateNetCash, calculateFreeCashFlow, calculateValuations, calculatePERatio, getReportType, getSimpleMultiplier, projectAnnualValue } from '@/utils/calculator'
import { buildYearlyData } from '@/utils/excelParser'
import { logger } from '@/utils/logger'
import { useStockUIStore } from './stockUIStore'
import { useStockListStore } from './stockListStore'
import { stockDB } from '@/db'
import { fetchAllIndicatorsA } from '@/api/financialIndicatorsA'
import { fetchHKFinancialIndicators } from '@/api/financialIndicatorsHK'
import { calculateAllPRR, calculateWeightedAverageROE, type PRRInputs } from '@/utils/prr-calculator'

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

  async function fetchFinancialReport(code: string, market: 'HK' | 'A', marketCap: number, pbFromStockInfo?: number | null) {
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

      // ============================================
      // Fetch PRR indicators based on market type
      // ============================================
      let prrIndicators: {
        roe: number | null
        roa: number | null
        roeProjected: boolean
        roaProjected: boolean
        pb: number | null
        dividendPayoutRatio: number | null
        dividendHistory: { year: number; dividendPayoutRatio: number | null }[]
        yearlyIndicators: { year: number; roe: number | null; roa: number | null; dividendPayoutRatio: number | null }[]
      } = {
        roe: null,
        roa: null,
        roeProjected: false,
        roaProjected: false,
        pb: null,
        dividendPayoutRatio: null,
        dividendHistory: [],
        yearlyIndicators: []
      }

      try {
        if (market === 'A') {
          const indicatorResult = await fetchAllIndicatorsA(code, pbFromStockInfo)
          // Get current (latest) values with projection for non-annual reports
          const latestRoeData = indicatorResult.roeData[0]
          const latestRoaData = indicatorResult.roaData[0]

          if (latestRoeData && latestRoeData.roe !== null) {
            const reportType = getReportType(latestRoeData.reportDate)
            if (reportType !== 'annual') {
              prrIndicators.roe = latestRoeData.roe * getSimpleMultiplier(reportType)
              prrIndicators.roeProjected = true
            } else {
              prrIndicators.roe = latestRoeData.roe
              prrIndicators.roeProjected = false
            }
          }

          if (latestRoaData && latestRoaData.roa !== null) {
            const reportType = getReportType(latestRoaData.reportDate)
            if (reportType !== 'annual') {
              prrIndicators.roa = latestRoaData.roa * getSimpleMultiplier(reportType)
              prrIndicators.roaProjected = true
            } else {
              prrIndicators.roa = latestRoaData.roa
              prrIndicators.roaProjected = false
            }
          }

          prrIndicators.pb = indicatorResult.pb
          prrIndicators.dividendPayoutRatio = indicatorResult.dividendPayoutRatio
          prrIndicators.dividendHistory = indicatorResult.dividendHistory

          // Build yearly indicators from Dupont data
          if (indicatorResult.roeData.length > 0) {
            prrIndicators.yearlyIndicators = indicatorResult.roeData
              .map(d => ({
                year: new Date(d.reportDate).getFullYear(),
                roe: d.roe,
                roa: d.roa,
                dividendPayoutRatio: null as number | null
              }))
              .filter(d => d.roe !== null)
          }
        } else {
          // HK market
          const indicatorResult = await fetchHKFinancialIndicators(code)
          const latestRoe = indicatorResult.current.roe
          const latestRoa = indicatorResult.current.roa
          const reportDate = indicatorResult.current.reportDate
          const seasonalRatios = indicatorResult.seasonalRatios ?? null

          if (latestRoe !== null) {
            const reportType = getReportType(reportDate)
            if (reportType !== 'annual') {
              prrIndicators.roe = projectAnnualValue(latestRoe, reportType, seasonalRatios)
              prrIndicators.roeProjected = true
            } else {
              prrIndicators.roe = latestRoe
              prrIndicators.roeProjected = false
            }
          }

          if (latestRoa !== null) {
            const reportType = getReportType(reportDate)
            if (reportType !== 'annual') {
              prrIndicators.roa = projectAnnualValue(latestRoa, reportType, seasonalRatios)
              prrIndicators.roaProjected = true
            } else {
              prrIndicators.roa = latestRoa
              prrIndicators.roaProjected = false
            }
          }

          prrIndicators.pb = indicatorResult.current.pb
          prrIndicators.dividendPayoutRatio = indicatorResult.current.dividendPayoutRatio
          prrIndicators.yearlyIndicators = indicatorResult.yearlyData.map(d => ({
            year: d.year,
            roe: d.roe,
            roa: d.roa,
            dividendPayoutRatio: d.dividendPayoutRatio
          }))
        }

        logger.debug('stockApiStore', `PRR indicators fetched: roe=${prrIndicators.roe}, roa=${prrIndicators.roa}, pb=${prrIndicators.pb}, dividend=${prrIndicators.dividendPayoutRatio}`)
      } catch (indicatorError) {
        logger.warn('stockApiStore', 'Failed to fetch PRR indicators:', indicatorError)
        // Continue without indicators - they're optional
      }

      // ============================================
      // Calculate PRR values
      // ============================================
      let prrBase: number | null = null
      let prrAdjusted: number | null = null
      let prrCycle: number | null = null
      let prrIndex: number | null = null
      let prrDerived: number | null = null

      if (prrIndicators.roe !== null && peRatio !== null) {
        // Calculate weighted average ROE for cycle PRR
        const validYearlyRoes = prrIndicators.yearlyIndicators
          .filter(d => d.roe !== null && d.roe > 0)
          .map(d => ({ year: d.year, roe: d.roe! }))
        const weightedAvgRoe = calculateWeightedAverageROE(validYearlyRoes.length >= 3 ? validYearlyRoes : null)

        const prrInputs: PRRInputs = {
          peRatio,
          roe: prrIndicators.roe,
          pbRatio: prrIndicators.pb ?? undefined,
          dividendPayoutRatio: prrIndicators.dividendPayoutRatio != null
            ? (prrIndicators.dividendPayoutRatio <= 1 ? prrIndicators.dividendPayoutRatio * 100 : prrIndicators.dividendPayoutRatio)
            : undefined,
          roa: prrIndicators.roa ?? undefined,
        }

        const marketType = market === 'A' ? 'A' : 'H'
        const prrResult = calculateAllPRR(prrInputs, marketType)

        prrBase = prrResult.basePR
        prrAdjusted = prrResult.adjustedPR ?? null
        prrDerived = prrResult.derivedPR ?? null

        // Cycle PRR uses weighted average ROE if available, otherwise current ROE
        if (prrIndicators.pb !== null) {
          if (weightedAvgRoe !== null && weightedAvgRoe > 0) {
            // Use weighted average ROE for cycle PRR
            const cyclePRR = (prrIndicators.pb * 100) / (weightedAvgRoe * weightedAvgRoe)
            prrCycle = cyclePRR
          } else if (prrIndicators.roe > 0) {
            // Fallback to current ROE
            const cyclePRR = (prrIndicators.pb * 100) / (prrIndicators.roe * prrIndicators.roe)
            prrCycle = cyclePRR
          }
        }

        // Index PRR
        if (peRatio !== null && prrIndicators.pb !== null) {
          prrIndex = (peRatio * peRatio) / prrIndicators.pb / 100
        }
      }

      // ============================================
      // Merge PRR yearly data into yearlyData
      // ============================================
      const yearlyDataWithPRR = yearlyData.map(yData => {
        const matchingIndicator = prrIndicators.yearlyIndicators.find(
          ind => ind.year === yData.year
        )
        // For A-shares: use dividendHistory for per-year matching
        // For HK: yearlyIndicators already contains dividendPayoutRatio
        const matchingDividend = market === 'A'
          ? prrIndicators.dividendHistory.find(d => d.year === yData.year)
          : null
        const yearlyDividend = matchingIndicator?.dividendPayoutRatio
          ?? matchingDividend?.dividendPayoutRatio
          ?? undefined
        return {
          ...yData,
          roe: matchingIndicator?.roe ?? undefined,
          roa: matchingIndicator?.roa ?? undefined,
          dividendPayoutRatio: yearlyDividend,
        }
      })

      return {
        netCash,
        freeCashFlow,
        netProfit: latestNetProfit,
        currentRatio: financialData.currentRatio[0] ?? null,
        peRatio,
        valuation1,
        valuation2,
        yearlyData: yearlyDataWithPRR,
        baseCurrency: financialData.baseCurrency,
        source: 'api' as const,
        isUsingProjectedData: latestNetProfitProjected || latestFreeCashFlowProjected || latestNetCashProjected,
        netProfitProjected: latestNetProfitProjected,
        freeCashFlowProjected: latestFreeCashFlowProjected,
        netCashProjected: latestNetCashProjected,
        currentRatioProjected: financialData.currentRatioProjected[0] ?? false,
        peRatioProjected: financialData.peRatioProjected[0] ?? false,
        marketCap,
        // PRR fields
        roe: prrIndicators.roe,
        roa: prrIndicators.roa,
        roeProjected: prrIndicators.roeProjected,
        roaProjected: prrIndicators.roaProjected,
        pbRatio: prrIndicators.pb,
        dividendPayoutRatio: prrIndicators.dividendPayoutRatio,
        prrBase,
        prrAdjusted,
        prrCycle,
        prrIndex,
        prrDerived,
        prrSelectedFormula: 'base' as const,
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

      // 2. 获取最新财报数据并计算估值（传入已获取的PB，避免重复请求push2接口）
      const financialResult = await fetchFinancialReport(stock.code, stock.market, info.marketCap, info.pbRatio)

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
            targetValuation: 10,
            buyTargetValuation: 10,
            sellTargetValuation: 20
          } as TargetPriceConfig
        }),
        // PRR fields
        roe: financialResult.roe,
        roa: financialResult.roa,
        roeProjected: financialResult.roeProjected,
        roaProjected: financialResult.roaProjected,
        pbRatio: financialResult.pbRatio,
        dividendPayoutRatio: financialResult.dividendPayoutRatio,
        prrBase: financialResult.prrBase,
        prrAdjusted: financialResult.prrAdjusted,
        prrCycle: financialResult.prrCycle,
        prrIndex: financialResult.prrIndex,
        prrDerived: financialResult.prrDerived,
        prrSelectedFormula: financialResult.prrSelectedFormula ?? 'base',
      }
      await stockDB.put(updatedStock)

      // 如果需要自动加载数据（单股票更新时），否则由调用者控制
      if (loadAfterUpdate) {
        await list.loadStocks()
      }

      // 同步自动标签（估值变化后自动标签可能改变）
      try {
        const { useTagStore } = await import('./tagStore')
        const tagStore = useTagStore()
        if (!tagStore.initialized) {
          await tagStore.init()
        }
        await tagStore.syncAutoTags(updatedStock)
      } catch (tagErr) {
        logger.warn('stockApiStore', 'Failed to sync auto tags', { stockId: id, error: tagErr })
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

    // 批量同步自动标签
    try {
      const { useTagStore } = await import('./tagStore')
      const tagStore = useTagStore()
      if (!tagStore.initialized) {
        await tagStore.init()
      }
      const allStocks = list.stocks
      for (const stock of allStocks) {
        if (ids.includes(stock.id)) {
          await tagStore.syncAutoTags(stock)
        }
      }
    } catch (tagErr) {
      logger.warn('stockApiStore', 'Failed to batch sync auto tags', { error: tagErr })
    }

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
