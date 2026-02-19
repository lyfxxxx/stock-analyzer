import { financialReportRateLimiter } from '@/utils/rateLimiter'
import { fetchExchangeRates } from './exchangeRate'
import type {
  FinancialReportData,
  FinancialReportError,
  AStockBalanceSheetItem,
  AStockIncomeStatementItem,
  AStockCashFlowItem,
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

const BASE_URL = 'https://datacenter.eastmoney.com/securities/api/data/get'

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

interface YearReportData {
  year: number
  reportDate: string
  reportType: ReportType
  balance?: AStockBalanceSheetItem
  income?: AStockIncomeStatementItem
  cashFlow?: AStockCashFlowItem
}

function formatSecucode(code: string): string {
  if (code.includes('.SH') || code.includes('.SZ')) {
    return code
  }
  if (code.startsWith('6')) {
    return `${code}.SH`
  }
  return `${code}.SZ`
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

async function fetchBalanceSheet(code: string): Promise<AStockBalanceSheetItem[]> {
  const secucode = formatSecucode(code)
  const url = `${BASE_URL}?type=RPT_F10_FINANCE_GBALANCE&sty=F10_FINANCE_GBALANCE&filter=(SECUCODE%3D%22${secucode}%22)&p=1&ps=30&sr=-1&st=REPORT_DATE&source=HSF10&client=PC`

  const data = await fetchWithRateLimit<ApiResponse<AStockBalanceSheetItem>>(url)

  if (!data.success || !data.result?.data) {
    return []
  }

  return data.result.data
}

async function fetchIncomeStatement(code: string): Promise<AStockIncomeStatementItem[]> {
  const secucode = formatSecucode(code)
  const url = `${BASE_URL}?type=RPT_F10_FINANCE_GINCOME&sty=APP_F10_GINCOME&filter=(SECUCODE%3D%22${secucode}%22)&p=1&ps=30&sr=-1&st=REPORT_DATE&source=HSF10&client=PC`

  const data = await fetchWithRateLimit<ApiResponse<AStockIncomeStatementItem>>(url)

  if (!data.success || !data.result?.data) {
    return []
  }

  return data.result.data
}

async function fetchCashFlow(code: string): Promise<AStockCashFlowItem[]> {
  const secucode = formatSecucode(code)
  const url = `${BASE_URL}?type=RPT_F10_FINANCE_GCASHFLOW&sty=APP_F10_GCASHFLOW&filter=(SECUCODE%3D%22${secucode}%22)&p=1&ps=30&sr=-1&st=REPORT_DATE&source=HSF10&client=PC`

  const data = await fetchWithRateLimit<ApiResponse<AStockCashFlowItem>>(url)

  if (!data.success || !data.result?.data) {
    return []
  }

  return data.result.data
}

function getLatestReportByYear<T extends { REPORT_DATE: string }>(
  items: T[]
): Map<number, { item: T; reportType: ReportType; reportDate: string }> {
  const yearMap = new Map<number, { item: T; reportType: ReportType; reportDate: string }>()

  for (const item of items) {
    const reportDate = item.REPORT_DATE
    const year = extractYearFromReportDate(reportDate)
    const reportType = getReportType(reportDate)

    const existing = yearMap.get(year)
    if (!existing || reportDate > existing.reportDate) {
      yearMap.set(year, { item, reportType, reportDate })
    }
  }

  return yearMap
}

function calculateSeasonalRatiosFromData(
  incomeData: AStockIncomeStatementItem[],
  cashFlowData: AStockCashFlowItem[]
): { profitRatios: SeasonalRatios; cashFlowRatios: SeasonalRatios } {
  const defaultRatios: SeasonalRatios = { Q1: 0.25, H1: 0.5, Q3: 0.75 }

  const annualProfits = new Map<number, number>()
  const annualCashFlows = new Map<number, number>()

  for (const item of incomeData) {
    if (isAnnualReport(item.REPORT_DATE)) {
      const year = extractYearFromReportDate(item.REPORT_DATE)
      annualProfits.set(year, item.PARENT_NETPROFIT || 0)
    }
  }

  for (const item of cashFlowData) {
    if (isAnnualReport(item.REPORT_DATE)) {
      const year = extractYearFromReportDate(item.REPORT_DATE)
      annualCashFlows.set(year, item.NETCASH_OPERATE || 0)
    }
  }

  const profitQuarterly: QuarterlyData[] = []
  const cashFlowQuarterly: QuarterlyData[] = []

  for (const item of incomeData) {
    if (!isAnnualReport(item.REPORT_DATE)) {
      const year = extractYearFromReportDate(item.REPORT_DATE)
      profitQuarterly.push({
        year,
        reportType: getReportType(item.REPORT_DATE),
        value: item.PARENT_NETPROFIT || 0,
      })
    }
  }

  for (const item of cashFlowData) {
    if (!isAnnualReport(item.REPORT_DATE)) {
      const year = extractYearFromReportDate(item.REPORT_DATE)
      cashFlowQuarterly.push({
        year,
        reportType: getReportType(item.REPORT_DATE),
        value: item.NETCASH_OPERATE || 0,
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

export async function fetchAStockFinancialReport(
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

    const balanceByYear = getLatestReportByYear(balanceSheet)
    const incomeByYear = getLatestReportByYear(incomeStatement)
    const cashFlowByYear = getLatestReportByYear(cashFlow)

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
      const balanceEntry = balanceByYear.get(year)
      const incomeEntry = incomeByYear.get(year)
      const cashFlowEntry = cashFlowByYear.get(year)

      if (!balanceEntry || !incomeEntry || !cashFlowEntry) {
        continue
      }

      const balance = balanceEntry.item
      const income = incomeEntry.item
      const cf = cashFlowEntry.item

      const balanceReportType = balanceEntry.reportType
      const incomeReportType = incomeEntry.reportType
      const cashFlowReportType = cashFlowEntry.reportType

      // Only income statement and cash flow statement need annualization
      // Balance sheet data is a point-in-time value, not projected
      const isYearProjected = !isAnnualReport(income.REPORT_DATE) ||
                              !isAnnualReport(cf.REPORT_DATE)

      const monetaryFunds = balance.MONETARYFUNDS || 0
      const tradeFinAsset = balance.TRADE_FINASSET_NOTFVTPL || 0
      const totalCash = toHundredMillion(monetaryFunds + tradeFinAsset) * toHKD

      const shortLoan = toHundredMillion(balance.SHORT_LOAN) * toHKD
      const longLoan = toHundredMillion(balance.LONG_LOAN) * toHKD

      let netProfitRaw = toHundredMillion(income.PARENT_NETPROFIT)
      let operatingCFRaw = toHundredMillion(cf.NETCASH_OPERATE)
      let capExRaw = toHundredMillion(cf.CONSTRUCT_LONG_ASSET)

      if (incomeReportType !== 'annual') {
        netProfitRaw = projectValue(netProfitRaw, incomeReportType, profitRatios)
      }

      if (cashFlowReportType !== 'annual') {
        operatingCFRaw = projectValue(operatingCFRaw, cashFlowReportType, cashFlowRatios)
        capExRaw = projectValue(capExRaw, cashFlowReportType, cashFlowRatios)
      }

      const netProfit = netProfitRaw * toHKD
      const operatingCF = operatingCFRaw * toHKD
      const capEx = -Math.abs(capExRaw) * toHKD

      const finalReportType = isYearProjected ? 'annual' as ReportType : 'annual' as ReportType

      years.push(year)
      cashAndEquivalents.push(Math.round(totalCash * 100) / 100)
      shortTermDebt.push(Math.round(shortLoan * 100) / 100)
      longTermDebt.push(Math.round(longLoan * 100) / 100)
      netProfits.push(Math.round(netProfit * 100) / 100)
      operatingCashFlow.push(Math.round(operatingCF * 100) / 100)
      capitalExpenditure.push(Math.round(capEx * 100) / 100)
      reportTypes.push(finalReportType)
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
