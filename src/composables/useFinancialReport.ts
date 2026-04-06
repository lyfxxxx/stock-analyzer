import { ref, computed } from 'vue'
import type { FinancialReportData, FinancialReportError, MarketType } from '@/types/financialReport'
import type { YearlyData } from '@/types/stock'
import { fetchAStockFinancialReport } from '@/api/financialReportA'
import { fetchHKStockFinancialReport } from '@/api/financialReportHK'
import { calculateNetCash, calculateFreeCashFlow, calculateValuations } from '@/utils/calculator'
import { buildYearlyData } from '@/utils/excelParser'
import { logger } from '@/utils/logger'

export function detectMarket(code: string): MarketType {
  const cleanCode = code.replace(/\.(SH|SZ|HK)$/, '')
  if (/^\d{5}$/.test(cleanCode) || cleanCode.length === 5) {
    return 'HK'
  }
  return 'A'
}

export function useFinancialReport() {
  const loading = ref(false)
  const error = ref<FinancialReportError | null>(null)
  const data = ref<FinancialReportData | null>(null)

  async function fetch(code: string, market?: MarketType): Promise<FinancialReportData | null> {
    loading.value = true
    error.value = null
    data.value = null

    try {
      const detectedMarket = market || detectMarket(code)
      
      const result = detectedMarket === 'HK'
        ? await fetchHKStockFinancialReport(code)
        : await fetchAStockFinancialReport(code)

      if (result.error) {
        error.value = result.error
        return null
      }

      data.value = result.data
      return result.data
    } catch (err) {
      error.value = {
        code: 'NETWORK_ERROR',
        message: '获取财务数据失败',
        details: err instanceof Error ? err.message : String(err),
      }
      return null
    } finally {
      loading.value = false
    }
  }

  function clear() {
    loading.value = false
    error.value = null
    data.value = null
  }

  return {
    loading,
    error,
    data,
    fetch,
    clear,
  }
}

export function useFinancialReportValuation() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function calculate(
    marketCap: number,
    code: string,
    market?: MarketType
  ): Promise<{
    netCash: number
    freeCashFlow: number
    netProfit: number
    valuation1: number | null
    valuation2: number
    yearlyData: YearlyData[]
    baseCurrency: 'HKD'
    source: 'api'
    isUsingProjectedData: boolean
  } | null> {
    loading.value = true
    error.value = null

    try {
      const detectedMarket = market || detectMarket(code)
      
      const result = detectedMarket === 'HK'
        ? await fetchHKStockFinancialReport(code)
        : await fetchAStockFinancialReport(code)

      if (result.error || !result.data) {
        error.value = result.error?.message || '获取财务数据失败'
        return null
      }

      const financialData = result.data

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
        baseCurrency: 'HKD',
        source: 'api',
        isUsingProjectedData: latestIsProjected,
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '计算估值失败'
      logger.error('useFinancialReport', 'FinancialReportValuation error:', err)
      return null
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    calculate,
  }
}
