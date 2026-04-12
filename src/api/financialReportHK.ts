import { financialReportRateLimiter } from '@/utils/rateLimiter'
import { fetchExchangeRates } from './exchangeRate'
import { calculateCurrentRatio } from '@/utils/calculator'
import { logger } from '@/utils/logger'
import type {
  FinancialReportData,
  FinancialReportError,
  HKStockBalanceSheetItem,
  HKStockIncomeStatementItem,
  HKStockCashFlowItem,
  ReportType,
} from '@/types/financialReport'
import type { CurrencyType } from '@/types/stock'
import { validateApiResponse } from '@/utils/validateApiResponse'
import { financialReportDataSchema } from '@/validation/apiSchemas'
import { withRetry, fetchWithTimeout, HttpError } from '@/utils/retry'
import {
  getReportType,
  getSimpleMultiplier,
  extractYearFromReportDate,
  isAnnualReport,
  type SeasonalRatios,
  type QuarterlyData,
  type FlexibleYearlyData,
  type FlexibleCurrentData,
  calculateSemiAnnualTTM,
  calculateHistoryTTM,
  calculateCurrentTTM,
  predictWithTTM,
  type TTMData,
  type ReportPeriodType,
} from '@/utils/calculator'

declare const __DEV__: boolean

const BASE_URL = 'https://datacenter.eastmoney.com/securities/api/data/v1/get'

interface ApiResponse<T> {
  version: string
  result: {
    pages: number
    data: T[]
    count: number
  } | null
  success: boolean
  message: string
  code: number
}

const BALANCE_CODES = {
  CASH_AND_EQUIVALENTS: '004002010',
  SHORT_TERM_DEPOSITS: '004002011',
  MEDIUM_LONG_TERM_DEPOSITS: '004001030',
  SHORT_TERM_INVESTMENTS: '004002008',
  RESTRICTED_CASH: '004002009',
  TOTAL_CURRENT_ASSETS: '004002999',
  SHORT_TERM_LOAN: '004011010',
  TOTAL_CURRENT_LIAB: '004011999',
  LONG_TERM_LOAN: '004020001',
} as const

const INCOME_CODES = {
  SHAREHOLDER_PROFIT: '004025002',
} as const

const CASH_FLOW_CODES = {
  OPERATING_CASH_FLOW: '003999',
  CAPITAL_EXPENDITURE: '005005',
  INVESTMENT_OTHER: '005997',
  INTANGIBLE_ASSETS: '005007',
} as const

function formatSecucode(code: string): string {
  if (code.includes('.HK')) {
    return code
  }
  const paddedCode = code.padStart(5, '0')
  return `${paddedCode}.HK`
}

function toHundredMillion(value: number | null): number {
  if (value === null || value === undefined) return 0
  return value / 100000000
}

async function fetchWithRateLimit<T>(url: string): Promise<T> {
  return financialReportRateLimiter.enqueue(async () => {
    return withRetry(async () => {
      const response = await fetchWithTimeout(url, {
        headers: {
          Referer: 'https://emweb.securities.eastmoney.com/',
        },
      })
      if (!response.ok) {
        throw new HttpError(`HTTP error! status: ${response.status}`, response.status, response)
      }
      return response.json()
    })
  })
}

async function fetchBalanceSheet(code: string): Promise<HKStockBalanceSheetItem[]> {
  const secucode = formatSecucode(code)
  const columns = 'SECUCODE,SECURITY_CODE,SECURITY_NAME_ABBR,REPORT_DATE,STD_ITEM_CODE,STD_ITEM_NAME,AMOUNT'
  const url = `${BASE_URL}?reportName=RPT_HKF10_FN_BALANCE_PC&columns=${columns}&filter=(SECUCODE%3D%22${secucode}%22)&pageNumber=1&pageSize=500&sortTypes=-1,1&sortColumns=REPORT_DATE,STD_ITEM_CODE&source=F10&client=PC`

  const data = await fetchWithRateLimit<ApiResponse<HKStockBalanceSheetItem>>(url)

  if (!data.success || !data.result?.data) {
    return []
  }

  return data.result.data
}

async function fetchIncomeStatement(code: string): Promise<HKStockIncomeStatementItem[]> {
  const secucode = formatSecucode(code)
  const columns = 'SECUCODE,SECURITY_CODE,SECURITY_NAME_ABBR,REPORT_DATE,STD_ITEM_CODE,STD_ITEM_NAME,AMOUNT'
  const url = `${BASE_URL}?reportName=RPT_HKF10_FN_INCOME_PC&columns=${columns}&filter=(SECUCODE%3D%22${secucode}%22)&pageNumber=1&pageSize=500&sortTypes=-1,1&sortColumns=REPORT_DATE,STD_ITEM_CODE&source=F10&client=PC`

  const data = await fetchWithRateLimit<ApiResponse<HKStockIncomeStatementItem>>(url)

  if (!data.success || !data.result?.data) {
    return []
  }

  return data.result.data
}

async function fetchCashFlow(code: string): Promise<HKStockCashFlowItem[]> {
  const secucode = formatSecucode(code)
  const columns = 'SECUCODE,SECURITY_CODE,SECURITY_NAME_ABBR,REPORT_DATE,STD_ITEM_CODE,STD_ITEM_NAME,AMOUNT'
  const url = `${BASE_URL}?reportName=RPT_HKF10_FN_CASHFLOW_PC&columns=${columns}&filter=(SECUCODE%3D%22${secucode}%22)&pageNumber=1&pageSize=500&sortTypes=-1,1&sortColumns=REPORT_DATE,STD_ITEM_CODE&source=F10&client=PC`

  const data = await fetchWithRateLimit<ApiResponse<HKStockCashFlowItem>>(url)

  if (!data.success || !data.result?.data) {
    return []
  }

  return data.result.data
}

interface YearlyReportInfo {
  reportDate: string
  reportType: ReportType
}

function getLatestReportInfoByYear<T extends { REPORT_DATE: string }>(
  items: T[]
): Map<number, { reportDate: string; reportType: ReportType }> {
  const yearMap = new Map<number, { reportDate: string; reportType: ReportType }>()

  for (const item of items) {
    const reportDate = item.REPORT_DATE
    const year = extractYearFromReportDate(reportDate)
    const reportType = getReportType(reportDate)

    const existing = yearMap.get(year)
    if (!existing || reportDate > existing.reportDate) {
      yearMap.set(year, { reportDate, reportType })
    }
  }

  return yearMap
}

interface YearlyBalanceData {
  cashAndEquivalents: number
  shortTermLoan: number
  longTermLoan: number
  totalCurrentAssets: number | null
  totalCurrentLiabilities: number | null
  reportDate: string
  reportType: ReportType
}

function parseBalanceSheetByYearWithReportType(
  items: HKStockBalanceSheetItem[],
  reportInfoByYear: Map<number, { reportDate: string; reportType: ReportType }>
): Map<number, YearlyBalanceData> {
  const result = new Map<number, YearlyBalanceData>()

  for (const item of items) {
    const year = extractYearFromReportDate(item.REPORT_DATE)
    const reportInfo = reportInfoByYear.get(year)

    if (!reportInfo || item.REPORT_DATE !== reportInfo.reportDate) {
      continue
    }

    if (!result.has(year)) {
      result.set(year, {
        cashAndEquivalents: 0,
        shortTermLoan: 0,
        longTermLoan: 0,
        totalCurrentAssets: null,
        totalCurrentLiabilities: null,
        reportDate: reportInfo.reportDate,
        reportType: reportInfo.reportType,
      })
    }

    const yearData = result.get(year)!
    const amount = toHundredMillion(item.AMOUNT)

    switch (item.STD_ITEM_CODE) {
      case BALANCE_CODES.CASH_AND_EQUIVALENTS:
      case BALANCE_CODES.SHORT_TERM_DEPOSITS:
      case BALANCE_CODES.MEDIUM_LONG_TERM_DEPOSITS:
      case BALANCE_CODES.SHORT_TERM_INVESTMENTS:
      case BALANCE_CODES.RESTRICTED_CASH:
        yearData.cashAndEquivalents += amount
        break
      case BALANCE_CODES.SHORT_TERM_LOAN:
        yearData.shortTermLoan = amount
        break
      case BALANCE_CODES.LONG_TERM_LOAN:
        yearData.longTermLoan = amount
        break
      case BALANCE_CODES.TOTAL_CURRENT_ASSETS:
        yearData.totalCurrentAssets = amount
        break
      case BALANCE_CODES.TOTAL_CURRENT_LIAB:
        yearData.totalCurrentLiabilities = amount
        break
    }
  }

  return result
}

interface YearlyIncomeData {
  shareholderProfit: number
  reportDate: string
  reportType: ReportType
}

function parseIncomeStatementByYearWithReportType(
  items: HKStockIncomeStatementItem[],
  reportInfoByYear: Map<number, { reportDate: string; reportType: ReportType }>
): Map<number, YearlyIncomeData> {
  const result = new Map<number, YearlyIncomeData>()

  for (const item of items) {
    const year = extractYearFromReportDate(item.REPORT_DATE)
    const reportInfo = reportInfoByYear.get(year)

    if (!reportInfo || item.REPORT_DATE !== reportInfo.reportDate) {
      continue
    }

    if (!result.has(year)) {
      result.set(year, {
        shareholderProfit: 0,
        reportDate: reportInfo.reportDate,
        reportType: reportInfo.reportType,
      })
    }

    const yearData = result.get(year)!
    const amount = toHundredMillion(item.AMOUNT)

    switch (item.STD_ITEM_CODE) {
      case INCOME_CODES.SHAREHOLDER_PROFIT:
        yearData.shareholderProfit = amount
        break
    }
  }

  return result
}

interface YearlyCashFlowData {
  operatingCashFlow: number
  capitalExpenditure: number
  reportDate: string
  reportType: ReportType
}

function parseCashFlowByYearWithReportType(
  items: HKStockCashFlowItem[],
  reportInfoByYear: Map<number, { reportDate: string; reportType: ReportType }>
): Map<number, YearlyCashFlowData> {
  const result = new Map<number, YearlyCashFlowData>()

  for (const item of items) {
    const year = extractYearFromReportDate(item.REPORT_DATE)
    const reportInfo = reportInfoByYear.get(year)

    if (!reportInfo || item.REPORT_DATE !== reportInfo.reportDate) {
      continue
    }

    if (!result.has(year)) {
      result.set(year, {
        operatingCashFlow: 0,
        capitalExpenditure: 0,
        reportDate: reportInfo.reportDate,
        reportType: reportInfo.reportType,
      })
    }

    const yearData = result.get(year)!
    const amount = toHundredMillion(item.AMOUNT)

    switch (item.STD_ITEM_CODE) {
      case CASH_FLOW_CODES.OPERATING_CASH_FLOW:
        yearData.operatingCashFlow = amount
        break
      case CASH_FLOW_CODES.CAPITAL_EXPENDITURE:
      case CASH_FLOW_CODES.INVESTMENT_OTHER:
      case CASH_FLOW_CODES.INTANGIBLE_ASSETS:
        yearData.capitalExpenditure += -Math.abs(amount)
        break
    }
  }

  return result
}

function calculateSeasonalRatiosFromData(
  incomeData: HKStockIncomeStatementItem[],
  cashFlowData: HKStockCashFlowItem[]
): { profitRatios: SeasonalRatios; cashFlowRatios: SeasonalRatios } {
  const defaultRatios: SeasonalRatios = { Q1: 0.25, H1: 0.5, Q3: 0.75 }

  const annualProfits = new Map<number, number>()
  const annualCashFlows = new Map<number, number>()

  for (const item of incomeData) {
    if (isAnnualReport(item.REPORT_DATE) && item.STD_ITEM_CODE === INCOME_CODES.SHAREHOLDER_PROFIT) {
      const year = extractYearFromReportDate(item.REPORT_DATE)
      annualProfits.set(year, item.AMOUNT || 0)
    }
  }

  for (const item of cashFlowData) {
    if (isAnnualReport(item.REPORT_DATE) && item.STD_ITEM_CODE === CASH_FLOW_CODES.OPERATING_CASH_FLOW) {
      const year = extractYearFromReportDate(item.REPORT_DATE)
      annualCashFlows.set(year, item.AMOUNT || 0)
    }
  }

  const profitQuarterly: QuarterlyData[] = []
  const cashFlowQuarterly: QuarterlyData[] = []

  for (const item of incomeData) {
    if (!isAnnualReport(item.REPORT_DATE) && item.STD_ITEM_CODE === INCOME_CODES.SHAREHOLDER_PROFIT) {
      const year = extractYearFromReportDate(item.REPORT_DATE)
      profitQuarterly.push({
        year,
        reportType: getReportType(item.REPORT_DATE),
        value: item.AMOUNT || 0,
      })
    }
  }

  for (const item of cashFlowData) {
    if (!isAnnualReport(item.REPORT_DATE) && item.STD_ITEM_CODE === CASH_FLOW_CODES.OPERATING_CASH_FLOW) {
      const year = extractYearFromReportDate(item.REPORT_DATE)
      cashFlowQuarterly.push({
        year,
        reportType: getReportType(item.REPORT_DATE),
        value: item.AMOUNT || 0,
      })
    }
  }

  const profitRatios = calculateRatios(profitQuarterly, annualProfits, defaultRatios)
  const cashFlowRatios = calculateRatios(cashFlowQuarterly, annualCashFlows, defaultRatios)

  return { profitRatios, cashFlowRatios }
}

function calculateRatios(
  quarterlyData: QuarterlyData[],
  annualData: Map<number, number>,
  defaultRatios: SeasonalRatios
): SeasonalRatios {
  const q1Ratios: number[] = []
  const h1Ratios: number[] = []
  const q3Ratios: number[] = []

  for (const q of quarterlyData) {
    const annualValue = annualData.get(q.year)
    if (!annualValue || annualValue === 0) continue
    
    if (q.value <= 0) continue

    const ratio = q.value / annualValue
    if (q.reportType === 'Q1') q1Ratios.push(ratio)
    else if (q.reportType === 'H1') h1Ratios.push(ratio)
    else if (q.reportType === 'Q3') q3Ratios.push(ratio)
  }

  const avgQ1 = q1Ratios.length >= 2 ? q1Ratios.reduce((a, b) => a + b, 0) / q1Ratios.length : defaultRatios.Q1
  const avgH1 = h1Ratios.length >= 2 ? h1Ratios.reduce((a, b) => a + b, 0) / h1Ratios.length : defaultRatios.H1
  const avgQ3 = q3Ratios.length >= 2 ? q3Ratios.reduce((a, b) => a + b, 0) / q3Ratios.length : defaultRatios.Q3

  return {
    Q1: Math.max(0.1, Math.min(0.4, avgQ1)),
    H1: Math.max(0.2, Math.min(0.7, avgH1)),
    Q3: Math.max(0.4, Math.min(0.9, avgQ3)),
  }
}

function projectValue(
  value: number,
  reportType: ReportType,
  seasonalRatios: SeasonalRatios
): number {
  if (reportType === 'annual') return value

  const ratio = seasonalRatios[reportType]
  if (ratio > 0) {
    return value / ratio
  }

  return value * getSimpleMultiplier(reportType)
}

export async function fetchHKStockFinancialReport(
  code: string
): Promise<{ data: FinancialReportData | null; error: FinancialReportError | null }> {
  try {
    const [balanceSheet, incomeStatement, cashFlow] = await Promise.all([
      fetchBalanceSheet(code),
      fetchIncomeStatement(code),
      fetchCashFlow(code),
    ])

    if (balanceSheet.length === 0 || incomeStatement.length === 0 || cashFlow.length === 0) {
      return {
        data: null,
        error: {
          code: 'NO_DATA',
          message: '无法获取完整的财务报表数据',
          details: `资产负债表: ${balanceSheet.length}条, 利润表: ${incomeStatement.length}条, 现金流量表: ${cashFlow.length}条`,
        },
      }
    }

    // ====== 日志：API返回的原始数据 ======
    logger.debug('financialReportHK', '========== 财务数据获取开始 ==========')
    logger.debug('financialReportHK', `股票代码: ${code}`)
    logger.debug('financialReportHK', `资产负债表记录数: ${balanceSheet.length}`)
    logger.debug('financialReportHK', `利润表记录数: ${incomeStatement.length}`)
    logger.debug('financialReportHK', `现金流量表记录数: ${cashFlow.length}`)

    // 输出利润表的报告日期分布
    const incomeReportTypes = new Map<string, number>()
    for (const item of incomeStatement) {
      const type = getReportType(item.REPORT_DATE)
      incomeReportTypes.set(type, (incomeReportTypes.get(type) || 0) + 1)
    }
    logger.debug('financialReportHK', '利润表报告类型分布:', Object.fromEntries(incomeReportTypes))

    // 输出现金流量表的报告日期分布
    const cfReportTypes = new Map<string, number>()
    for (const item of cashFlow) {
      const type = getReportType(item.REPORT_DATE)
      cfReportTypes.set(type, (cfReportTypes.get(type) || 0) + 1)
    }
    logger.debug('financialReportHK', '现金流量表报告类型分布:', Object.fromEntries(cfReportTypes))

    const { rates } = await fetchExchangeRates()
    const toHKD = 1 / (rates['CNY'] || 1.10)
    logger.debug('financialReportHK', `汇率 CNY -> HKD: 1 / ${rates['CNY'] || 1.10} = ${toHKD}`)

    const { profitRatios, cashFlowRatios } = calculateSeasonalRatiosFromData(incomeStatement, cashFlow)

    // ====== 日志：季节性比例 ======
    logger.debug('financialReportHK', '========== 季节性比例计算结果 ==========')
    logger.debug('financialReportHK', '净利润季节性比例:', profitRatios)
    logger.debug('financialReportHK', '现金流季节性比例:', cashFlowRatios)

    const balanceReportInfoByYear = getLatestReportInfoByYear(balanceSheet)
    const incomeReportInfoByYear = getLatestReportInfoByYear(incomeStatement)
    const cashFlowReportInfoByYear = getLatestReportInfoByYear(cashFlow)

    const balanceByYear = parseBalanceSheetByYearWithReportType(balanceSheet, balanceReportInfoByYear)
    const incomeByYear = parseIncomeStatementByYearWithReportType(incomeStatement, incomeReportInfoByYear)
    const cashFlowByYear = parseCashFlowByYearWithReportType(cashFlow, cashFlowReportInfoByYear)

    const allYears = new Set<number>()
    balanceByYear.forEach((_, year) => allYears.add(year))
    incomeByYear.forEach((_, year) => allYears.add(year))
    cashFlowByYear.forEach((_, year) => allYears.add(year))

    const sortedYears = Array.from(allYears).sort((a, b) => b - a)

    // ====== 收集历史期间明细数据（用于TTM预测算法） ======
    // 港股只有 H1 和 Annual，使用 h1 和 annual 作为 key
    const periodDataByYear = new Map<number, { 
      profit: { h1?: number; annual?: number }, 
      cf: { h1?: number; annual?: number } 
    }>()

    // 收集利润表数据 - 只收集股东利润 (STD_ITEM_CODE = 004025002)
    for (const item of incomeStatement) {
      if (item.STD_ITEM_CODE !== INCOME_CODES.SHAREHOLDER_PROFIT) continue
      
      const year = extractYearFromReportDate(item.REPORT_DATE)
      const type = getReportType(item.REPORT_DATE)
      const value = toHundredMillion(item.AMOUNT)

      if (!periodDataByYear.has(year)) {
        periodDataByYear.set(year, { profit: {}, cf: {} })
      }
      const data = periodDataByYear.get(year)!

      if (type === 'H1') data.profit.h1 = value
      else if (type === 'annual') data.profit.annual = value
    }

    // 收集现金流量表数据 - 只收集运营现金流 (STD_ITEM_CODE = 003999)
    for (const item of cashFlow) {
      if (item.STD_ITEM_CODE !== CASH_FLOW_CODES.OPERATING_CASH_FLOW) continue
      
      const year = extractYearFromReportDate(item.REPORT_DATE)
      const type = getReportType(item.REPORT_DATE)
      const value = toHundredMillion(item.AMOUNT)

      if (!periodDataByYear.has(year)) {
        periodDataByYear.set(year, { profit: {}, cf: {} })
      }
      const data = periodDataByYear.get(year)!

      if (type === 'H1') data.cf.h1 = value
      else if (type === 'annual') data.cf.annual = value
    }

    // 构建TTM算法需要的历史数据（需要h1和annual）
    const ttmHistoryProfit: FlexibleYearlyData[] = []
    const ttmHistoryCF: FlexibleYearlyData[] = []

    for (const [year, data] of periodDataByYear) {
      if (data.profit.h1 !== undefined && data.profit.annual !== undefined) {
        ttmHistoryProfit.push({
          year,
          h1: data.profit.h1,
          annual: data.profit.annual
        })
      }
      if (data.cf.h1 !== undefined && data.cf.annual !== undefined) {
        ttmHistoryCF.push({
          year,
          h1: data.cf.h1,
          annual: data.cf.annual
        })
      }
    }

    // 按年份排序（从旧到新）
    ttmHistoryProfit.sort((a, b) => a.year - b.year)
    ttmHistoryCF.sort((a, b) => a.year - b.year)

    logger.debug('financialReportHK', '历史H1+Annual净利润数据(用于TTM算法):', ttmHistoryProfit.slice(-3))
    logger.debug('financialReportHK', '历史H1+Annual现金流数据(用于TTM算法):', ttmHistoryCF.slice(-3))

    // ====== 计算历史TTM数据（港股半年度模式） ======
    const reportType: ReportPeriodType = 'semi'
    const profitTTMHistory = calculateHistoryTTM(ttmHistoryProfit, reportType)
    const cfTTMHistory = calculateHistoryTTM(ttmHistoryCF, reportType)

    logger.debug('financialReportHK', '历史净利润TTM数据:', profitTTMHistory.slice(-3))
    logger.debug('financialReportHK', '历史现金流TTM数据:', cfTTMHistory.slice(-3))

    // ====== 计算当前TTM ======
    const currentYear = sortedYears[0] || new Date().getFullYear()
    const currentYearData = periodDataByYear.get(currentYear)
    const prevYearData = periodDataByYear.get(currentYear - 1)

    let currentProfitTTM: number | null = null
    let currentCFTTM: number | null = null

    if (currentYearData && prevYearData) {
      // 计算净利润TTM
      const profitTTMResult = calculateCurrentTTM(
        { year: currentYear - 1, h1: prevYearData.profit.h1, annual: prevYearData.profit.annual },
        { h1: currentYearData.profit.h1 },
        reportType
      )
      if (profitTTMResult) {
        currentProfitTTM = profitTTMResult.ttm
        logger.debug('financialReportHK', `当前净利润TTM: ${currentProfitTTM} (使用${profitTTMResult.usedReportType}数据)`)
      }

      // 计算现金流TTM
      const cfTTMResult = calculateCurrentTTM(
        { year: currentYear - 1, h1: prevYearData.cf.h1, annual: prevYearData.cf.annual },
        { h1: currentYearData.cf.h1 },
        reportType
      )
      if (cfTTMResult) {
        currentCFTTM = cfTTMResult.ttm
        logger.debug('financialReportHK', `当前现金流TTM: ${currentCFTTM} (使用${cfTTMResult.usedReportType}数据)`)
      }
    }

    // ====== 使用TTM算法进行预测 ======
    const profitTTMPrediction = predictWithTTM(profitTTMHistory)
    const cfTTMPrediction = predictWithTTM(cfTTMHistory)

    logger.debug('financialReportHK', 'TTM净利润预测:', profitTTMPrediction)
    logger.debug('financialReportHK', 'TTM现金流预测:', cfTTMPrediction)

    const years: number[] = []
    const netProfits: number[] = []
    const cashAndEquivalents: number[] = []
    const shortTermDebt: number[] = []
    const longTermDebt: number[] = []
    const operatingCashFlow: number[] = []
    const capitalExpenditure: number[] = []
    const reportTypes: ReportType[] = []
    const isProjected: boolean[] = []
    const netProfitProjected: boolean[] = []
    const freeCashFlowProjected: boolean[] = []
    const netCashProjected: boolean[] = []
    const currentRatio: (number | null)[] = []
    const currentRatioProjected: boolean[] = []

    for (const year of sortedYears) {
      const balance = balanceByYear.get(year)
      const income = incomeByYear.get(year)
      const cf = cashFlowByYear.get(year)

      // 至少要有利润表，否则跳过该年份
      if (!income) {
        continue
      }

      const balanceItem = balance
      const incomeItem = income
      const cfItem = cf

      const incomeReportType = incomeItem.reportType
      const balanceReportType = balanceItem?.reportType || 'Q3'
      const cashFlowReportType = cfItem?.reportType || 'Q3' // 默认 Q3 以触发预测

      // 只有当利润表不是年报时，才将年份标记为预测值
      // 现金流即使只有H1，也可以用TTM预测，不影响年份的"实际/预测"标记
      const isYearProjected = incomeReportType !== 'annual'

      let netProfitRaw = incomeItem.shareholderProfit
      let operatingCFRaw = cfItem?.operatingCashFlow || 0
      let capExRaw = cfItem?.capitalExpenditure || 0

      logger.debug('financialReportHK', `========== ${year}年度预测计算 ==========`)
      logger.debug('financialReportHK', `报告类型: ${incomeReportType}, ${cashFlowReportType}`)
      logger.debug('financialReportHK', `原始净利润: ${netProfitRaw}, 原始运营现金流: ${operatingCFRaw}, 原始资本开支: ${capExRaw}`)

      // 对于预测年份（非年报），使用TTM预测值
      if (incomeReportType !== 'annual') {
        if (currentProfitTTM !== null && profitTTMPrediction.confidence !== 'low') {
          // 使用当前TTM作为预测值（TTM本身就是滚动12个月数据，更接近真实年度值）
          netProfitRaw = currentProfitTTM
          logger.debug('financialReportHK', `使用当前TTM作为净利润预测: ${netProfitRaw}`)
        } else {
          // 后备：使用原有季节性比例算法
          netProfitRaw = projectValue(netProfitRaw, incomeReportType, profitRatios)
          logger.debug('financialReportHK', `使用原有算法预测净利润: ${netProfitRaw}`)
        }
      }

      if (cashFlowReportType !== 'annual') {
        if (currentCFTTM !== null && cfTTMPrediction.confidence !== 'low') {
          // 使用当前TTM作为预测值
          operatingCFRaw = currentCFTTM
          logger.debug('financialReportHK', `使用当前TTM作为运营现金流预测: ${operatingCFRaw}`)
        } else {
          // 后备：使用原有季节性比例算法
          operatingCFRaw = projectValue(operatingCFRaw, cashFlowReportType, cashFlowRatios)
          logger.debug('financialReportHK', `使用原有算法预测运营现金流: ${operatingCFRaw}`)
        }
        
        capExRaw = projectValue(capExRaw, cashFlowReportType, cashFlowRatios)
      }

      const freeCashFlow = operatingCFRaw - Math.abs(capExRaw)
      logger.debug('financialReportHK', `最终自由现金流: ${operatingCFRaw} - ${Math.abs(capExRaw)} = ${freeCashFlow}`)

      years.push(year)
      cashAndEquivalents.push(Math.round((balanceItem?.cashAndEquivalents || 0) * toHKD * 100) / 100)
      shortTermDebt.push(Math.round((balanceItem?.shortTermLoan || 0) * toHKD * 100) / 100)
      longTermDebt.push(Math.round((balanceItem?.longTermLoan || 0) * toHKD * 100) / 100)
      netProfits.push(Math.round(netProfitRaw * toHKD * 100) / 100)
      operatingCashFlow.push(Math.round(operatingCFRaw * toHKD * 100) / 100)
      capitalExpenditure.push(Math.round(capExRaw * toHKD * 100) / 100)
      reportTypes.push('annual')
      isProjected.push(isYearProjected)
      netProfitProjected.push(incomeReportType !== 'annual')
      freeCashFlowProjected.push(cashFlowReportType !== 'annual')
      netCashProjected.push(balanceReportType !== 'annual')

      const cr = calculateCurrentRatio(
        balanceItem?.totalCurrentAssets ?? null,
        balanceItem?.totalCurrentLiabilities ?? null
      )
      currentRatio.push(cr)
      currentRatioProjected.push(balanceReportType !== 'annual')
    }

    logger.debug('financialReportHK', '========== 年度数据处理完成 ==========')

    if (years.length === 0) {
      return {
        data: null,
        error: {
          code: 'NO_DATA',
          message: '没有找到匹配的财务数据',
        },
      }
    }

    // ====== 日志：最终返回数据 ======
    logger.debug('financialReportHK', '========== 最终返回数据 ==========')
    logger.debug('financialReportHK', '年份:', years)
    logger.debug('financialReportHK', '净利润:', netProfits)
    logger.debug('financialReportHK', '运营现金流:', operatingCashFlow)
    logger.debug('financialReportHK', '资本开支:', capitalExpenditure)
    logger.debug('financialReportHK', '自由现金流(计算值):', netProfits.map((np, i) => (operatingCashFlow[i] || 0) - Math.abs(capitalExpenditure[i] || 0)))
    logger.debug('financialReportHK', '是否为预测数据:', isProjected)
    logger.debug('financialReportHK', '净利润是否为预测:', netProfitProjected)
    logger.debug('financialReportHK', '自由现金流是否为预测:', freeCashFlowProjected)
    logger.debug('financialReportHK', '净现金是否为预测:', netCashProjected)
    logger.debug('financialReportHK', '流动比率:', currentRatio)
    logger.debug('financialReportHK', '流动比率是否为预测:', currentRatioProjected)
    logger.debug('financialReportHK', '========== 财务数据获取结束 ==========')

    return {
      data: validateApiResponse({
        years,
        netProfits,
        cashAndEquivalents,
        shortTermDebt,
        longTermDebt,
        operatingCashFlow,
        capitalExpenditure,
        currentRatio,
        currentRatioProjected,
        peRatio: netProfits.map(() => null),
        peRatioProjected: netProfits.map(() => false),
        currencyType: 'CNY' as CurrencyType,
        baseCurrency: 'HKD',
        source: 'api',
        reportTypes,
        isProjected,
        netProfitProjected,
        freeCashFlowProjected,
        netCashProjected,
      }, financialReportDataSchema),
      error: null,
    }
  } catch (err) {
    return {
      data: null,
      error: {
        code: 'NETWORK_ERROR',
        message: '网络请求失败',
        details: err instanceof Error ? err.message : String(err),
      },
    }
  }
}
