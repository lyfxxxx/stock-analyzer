import { ref, computed } from 'vue'
import type { ExcelData, ExcelValidationResult, YearlyData } from '@/types/stock'
import { readExcelFile, extractFinancialData, buildYearlyData } from '@/utils/excelParser'
import { validateExcelData } from '@/utils/validator'
import { calculateNetCash, calculateFreeCashFlow, calculateValuations } from '@/utils/calculator'
import { fetchExchangeRates } from '@/api/exchangeRate'
import { logger } from '@/utils/logger'

export function useExcelParser() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const validationResult = ref<ExcelValidationResult | null>(null)
  const parsedData = ref<ExcelData | null>(null)

  const isValid = computed(() => validationResult.value?.isValid ?? false)
  const errors = computed(() => validationResult.value?.errors ?? [])

  async function parseFiles(files: {
    benefit?: File
    debt?: File
    cash?: File
    keyIndex?: File
  }) {
    loading.value = true
    error.value = null
    
    try {
      const excelData: Partial<ExcelData> = {}

      if (files.benefit) {
        excelData.benefit = await readExcelFile(files.benefit)
      }
      if (files.debt) {
        excelData.debt = await readExcelFile(files.debt)
      }
      if (files.cash) {
        excelData.cash = await readExcelFile(files.cash)
      }
      if (files.keyIndex) {
        excelData.keyIndex = await readExcelFile(files.keyIndex)
      }

      // Validate
      validationResult.value = validateExcelData(excelData as ExcelData)
      
      if (validationResult.value.isValid) {
        parsedData.value = excelData as ExcelData
      }

      return validationResult.value
    } catch (err) {
      error.value = err instanceof Error ? err.message : '解析Excel文件失败'
      return {
        isValid: false,
        errors: [{ file: '文件', field: '解析', message: error.value }]
      }
    } finally {
      loading.value = false
    }
  }

  function clearData() {
    parsedData.value = null
    validationResult.value = null
    error.value = null
  }

  return {
    loading,
    error,
    validationResult,
    parsedData,
    isValid,
    errors,
    validationErrors: errors,
    parseFiles,
    clearData
  }
}

export function useValuation() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function calculate(
    marketCap: number,
    excelData: ExcelData
  ): Promise<{
    netCash: number
    freeCashFlow: number
    netProfit: number
    currentRatio: number | null
    peRatio: number | null
    valuation1: number | null
    valuation2: number
    yearlyData: YearlyData[]
    baseCurrency: 'HKD'
    rateSource: 'api' | 'fallback'
    isUsingProjectedData: boolean
  } | null> {
    loading.value = true
    error.value = null

    try {
      // Fetch exchange rates
      const { rates, source: rateSource } = await fetchExchangeRates()

      // Extract financial data (with currency conversion)
      const financialData = extractFinancialData(excelData, rates)

      // Build yearly data using converted values (manual mode: no projected data)
      const yearlyData = buildYearlyData(
        financialData.years,
        financialData.operatingCashFlow,
        financialData.capitalExpenditure,
        financialData.netProfits
      )

      // Get latest year data (years is in descending order, so index 0 is the latest)
      const latestIndex = 0
      const latestCash = financialData.cashAndEquivalents[latestIndex] || 0
      const latestShortTermDebt = financialData.shortTermDebt[latestIndex] || 0
      const latestLongTermDebt = financialData.longTermDebt[latestIndex] || 0
      const latestOperatingCF = financialData.operatingCashFlow[latestIndex] || 0
      const latestCapEx = financialData.capitalExpenditure[latestIndex] || 0
      const latestNetProfit = financialData.netProfits[latestIndex] || 0

      // Calculate metrics
      const netCash = calculateNetCash(latestCash, latestShortTermDebt, latestLongTermDebt)
      const currentFreeCashFlow = calculateFreeCashFlow(latestOperatingCF, latestCapEx)
      const currentNetProfit = latestNetProfit

      // Calculate valuations
      const { valuation1, valuation2 } = calculateValuations(
        marketCap,
        netCash,
        currentFreeCashFlow,
        currentNetProfit
      )

      return {
        netCash,
        freeCashFlow: currentFreeCashFlow,
        netProfit: currentNetProfit,
        currentRatio: null,
        peRatio: null,
        valuation1,
        valuation2,
        yearlyData,
        baseCurrency: 'HKD',
        rateSource,
        isUsingProjectedData: false
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '计算估值失败'
      logger.error('useExcelParser', 'Valuation calculation error:', err)
      return null
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    calculate
  }
}
