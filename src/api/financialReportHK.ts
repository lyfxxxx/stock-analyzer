import { financialReportRateLimiter } from '@/utils/rateLimiter'
import { fetchExchangeRates } from './exchangeRate'
import type {
  FinancialReportData,
  FinancialReportError,
  HKStockBalanceSheetItem,
  HKStockIncomeStatementItem,
  HKStockCashFlowItem,
  ReportType,
} from '@/types/financialReport'
import type { CurrencyType } from '@/types/stock'
import {
  getReportType,
  getSimpleMultiplier,
  extractYearFromReportDate,
  isAnnualReport,
  type SeasonalRatios,
  type QuarterlyData,
} from '@/utils/calculator'

const BALANCE_CODES = {
  CASH_AND_EQUIVALENTS: '004002010',
  SHORT_TERM_DEPOSITS: '004002011',
  MEDIUM_LONG_TERM_DEPOSITS: '004001030',
  SHORT_TERM_INVESTMENTS: '004002008',
  RESTRICTED_CASH: '004002009',
  SHORT_TERM_LOAN: '004011010',
  LONG_TERM_LOAN: '004020001',
} as const

const INCOME_CODES = {
  SHAREHOLDER_PROFIT: '004025002',
} as const

const CASH_FLOW_CODES = {
  OPERATING_CASH_FLOW: '003999',
  CAPITAL_EXPENDITURE: '005005',
} as const

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
    const response = await fetch(url, {
      headers: {
        Referer: 'https://emweb.securities.eastmoney.com/',
      },
    })
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response.json()
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
        yearData.capitalExpenditure = -Math.abs(amount)
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

    const { rates } = await fetchExchangeRates()
    const toHKD = rates['CNY'] || 1.10

    const { profitRatios, cashFlowRatios } = calculateSeasonalRatiosFromData(incomeStatement, cashFlow)

    const allItems = [...balanceSheet, ...incomeStatement, ...cashFlow]
    const reportInfoByYear = getLatestReportInfoByYear(allItems)

    const balanceByYear = parseBalanceSheetByYearWithReportType(balanceSheet, reportInfoByYear)
    const incomeByYear = parseIncomeStatementByYearWithReportType(incomeStatement, reportInfoByYear)
    const cashFlowByYear = parseCashFlowByYearWithReportType(cashFlow, reportInfoByYear)

    const allYears = new Set<number>()
    balanceByYear.forEach((_, year) => allYears.add(year))
    incomeByYear.forEach((_, year) => allYears.add(year))
    cashFlowByYear.forEach((_, year) => allYears.add(year))

    const sortedYears = Array.from(allYears).sort((a, b) => b - a)

    const years: number[] = []
    const netProfits: number[] = []
    const cashAndEquivalents: number[] = []
    const shortTermDebt: number[] = []
    const longTermDebt: number[] = []
    const operatingCashFlow: number[] = []
    const capitalExpenditure: number[] = []
    const reportTypes: ReportType[] = []
    const isProjected: boolean[] = []

    for (const year of sortedYears) {
      const balance = balanceByYear.get(year)
      const income = incomeByYear.get(year)
      const cf = cashFlowByYear.get(year)

      if (!balance || !income || !cf) {
        continue
      }

      // Only income statement and cash flow statement need annualization
      // Balance sheet data is a point-in-time value, not projected
      const isYearProjected = !isAnnualReport(income.reportDate) ||
                              !isAnnualReport(cf.reportDate)

      let netProfitRaw = income.shareholderProfit
      let operatingCFRaw = cf.operatingCashFlow
      let capExRaw = cf.capitalExpenditure

      if (income.reportType !== 'annual') {
        netProfitRaw = projectValue(netProfitRaw, income.reportType, profitRatios)
      }

      if (cf.reportType !== 'annual') {
        operatingCFRaw = projectValue(operatingCFRaw, cf.reportType, cashFlowRatios)
        capExRaw = projectValue(capExRaw, cf.reportType, cashFlowRatios)
      }

      years.push(year)
      cashAndEquivalents.push(Math.round(balance.cashAndEquivalents * toHKD * 100) / 100)
      shortTermDebt.push(Math.round(balance.shortTermLoan * toHKD * 100) / 100)
      longTermDebt.push(Math.round(balance.longTermLoan * toHKD * 100) / 100)
      netProfits.push(Math.round(netProfitRaw * toHKD * 100) / 100)
      operatingCashFlow.push(Math.round(operatingCFRaw * toHKD * 100) / 100)
      capitalExpenditure.push(Math.round(capExRaw * toHKD * 100) / 100)
      reportTypes.push('annual')
      isProjected.push(isYearProjected)
    }

    if (years.length === 0) {
      return {
        data: null,
        error: {
          code: 'NO_DATA',
          message: '没有找到匹配的财务数据',
        },
      }
    }

    return {
      data: {
        years,
        netProfits,
        cashAndEquivalents,
        shortTermDebt,
        longTermDebt,
        operatingCashFlow,
        capitalExpenditure,
        currencyType: 'CNY' as CurrencyType,
        baseCurrency: 'HKD',
        source: 'api',
        reportTypes,
        isProjected,
      },
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
