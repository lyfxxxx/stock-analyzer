import type { YearlyData, CurrencyType } from '@/types/stock'
import type { ReportType } from '@/types/financialReport'

/**
 * Convert financial data from original currency to target currency (HKD)
 * Note: The input value should already be in hundred million yuan (亿元)
 * This function only handles currency conversion
 * 
 * @param value - Value in hundred million yuan (亿元)
 * @param currencyType - Original currency type (USD/HKD/CNY)
 * @param rates - Exchange rates (base: HKD)
 * @returns Value in hundred million HKD (亿元 HKD)
 */
export function convertFinancialData(
  value: number,
  currencyType: CurrencyType,
  rates: Record<string, number>
): number {
  const rate = rates[currencyType] || 1
  return value * rate
}

/**
 * Convert array of financial data values
 */
export function convertFinancialDataArray(
  values: number[],
  currencyType: CurrencyType,
  rates: Record<string, number>
): number[] {
  return values.map(v => convertFinancialData(v, currencyType, rates))
}

/**
 * Calculate net cash from balance sheet data
 * Net Cash = Cash and Cash Equivalents - Interest-bearing Debt
 */
export function calculateNetCash(
  cashAndEquivalents: number,
  shortTermDebt: number,
  longTermDebt: number
): number {
  const interestBearingDebt = shortTermDebt + longTermDebt
  return cashAndEquivalents - interestBearingDebt
}

/**
 * Calculate free cash flow from cash flow statement
 * Free Cash Flow = Operating Cash Flow - Capital Expenditure
 */
export function calculateFreeCashFlow(
  operatingCashFlow: number,
  capitalExpenditure: number
): number {
  return operatingCashFlow - Math.abs(capitalExpenditure)
}

/**
 * Calculate valuation metrics
 * Valuation1 = (Market Cap - Net Cash) / Free Cash Flow
 * Valuation2 = (Market Cap - Net Cash) / Net Profit
 */
export function calculateValuations(
  marketCap: number,
  netCash: number,
  freeCashFlow: number,
  netProfit: number
): { valuation1: number | null; valuation2: number } {
  const adjustedMarketCap = marketCap - netCash
  
  const valuation1 = freeCashFlow > 0 ? adjustedMarketCap / freeCashFlow : null
  const valuation2 = netProfit !== 0 ? adjustedMarketCap / netProfit : 0

  return {
    valuation1: valuation1 !== null ? Math.round(valuation1 * 100) / 100 : null,
    valuation2: Math.round(valuation2 * 100) / 100
  }
}

/**
 * Calculate growth rate from recent years
 * Uses average of year-over-year growth rates
 */
export function calculateGrowthRate(data: number[]): number {
  if (data.length < 2) return 0

  const growthRates: number[] = []
  for (let i = 1; i < data.length; i++) {
    const prev = data[i - 1] ?? 0
    const curr = data[i] ?? 0
    if (prev !== 0) {
      growthRates.push((curr - prev) / Math.abs(prev))
    }
  }

  if (growthRates.length === 0) return 0

  const avgGrowth = growthRates.reduce((a, b) => a + b, 0) / growthRates.length
  return Math.round(avgGrowth * 100) / 100
}

/**
 * Project current year values based on historical growth
 */
export function projectCurrentYear(yearlyData: YearlyData[]): YearlyData {
  const currentYear = new Date().getFullYear()
  
  if (yearlyData.length === 0) {
    return { year: currentYear, freeCashFlow: 0, netProfit: 0 }
  }

  const sortedData = [...yearlyData].sort((a, b) => a.year - b.year)
  const recent3Years = sortedData.slice(-3)
  
  const fcfValues = recent3Years.map(d => d.freeCashFlow)
  const profitValues = recent3Years.map(d => d.netProfit)
  
  const fcfGrowth = calculateGrowthRate(fcfValues)
  const profitGrowth = calculateGrowthRate(profitValues)
  
  const lastYear = sortedData[sortedData.length - 1] ?? { freeCashFlow: 0, netProfit: 0 }
  
  return {
    year: currentYear,
    freeCashFlow: Math.round((lastYear.freeCashFlow ?? 0) * (1 + fcfGrowth) * 100) / 100,
    netProfit: Math.round((lastYear.netProfit ?? 0) * (1 + profitGrowth) * 100) / 100
  }
}

/**
 * Parse number from various formats
 */
export function parseNumber(value: any): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    // Remove unit suffixes like 亿元, 万元, etc.
    const cleaned = value.replace(/[亿元万元,\s]/g, '')
    const num = parseFloat(cleaned)
    return isNaN(num) ? 0 : num
  }
  return 0
}

/**
 * Format number for display
 */
export function formatNumber(num: number, decimals: number = 2): string {
  if (isNaN(num) || !isFinite(num)) return '-'
  return num.toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })
}

/**
 * Format currency in 亿元
 */
export function formatCurrency(num: number): string {
  if (isNaN(num) || !isFinite(num)) return '-'
  return `${formatNumber(num)} 亿元`
}

/**
 * Get report type from report date string
 */
export function getReportType(reportDate: string): ReportType {
  if (reportDate.includes('-12-31')) return 'annual'
  if (reportDate.includes('-09-30')) return 'Q3'
  if (reportDate.includes('-06-30')) return 'H1'
  if (reportDate.includes('-03-31')) return 'Q1'
  return 'annual'
}

/**
 * Get simple annualized multiplier for report type
 * Used as fallback when historical data is insufficient
 */
export function getSimpleMultiplier(reportType: ReportType): number {
  switch (reportType) {
    case 'Q1': return 4.0
    case 'H1': return 2.0
    case 'Q3': return 4 / 3
    default: return 1.0
  }
}

/**
 * Seasonal ratios for projecting annual values
 * Each ratio represents the average proportion of annual value
 */
export interface SeasonalRatios {
  Q1: number
  H1: number
  Q3: number
}

/**
 * Historical quarterly data for calculating seasonal ratios
 */
export interface QuarterlyData {
  year: number
  reportType: ReportType
  value: number
}

/**
 * Calculate seasonal ratios from historical data
 * Requires at least 2 years of data with matching report types
 */
export function calculateSeasonalRatios(
  historicalQuarterly: QuarterlyData[],
  historicalAnnual: Map<number, number>
): SeasonalRatios {
  const defaultRatios: SeasonalRatios = { Q1: 0.25, H1: 0.5, Q3: 0.75 }

  const q1Ratios: number[] = []
  const h1Ratios: number[] = []
  const q3Ratios: number[] = []

  for (const q of historicalQuarterly) {
    const annualValue = historicalAnnual.get(q.year)
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
    Q3: Math.max(0.4, Math.min(0.9, avgQ3))
  }
}

/**
 * Project annual value from quarterly/semi-annual data
 * Uses seasonal ratios if available, falls back to simple multiplier
 */
export function projectAnnualValue(
  currentValue: number,
  reportType: ReportType,
  seasonalRatios: SeasonalRatios | null
): number {
  if (reportType === 'annual') return currentValue

  if (seasonalRatios) {
    const ratio = seasonalRatios[reportType]
    if (ratio > 0) {
      return currentValue / ratio
    }
  }

  return currentValue * getSimpleMultiplier(reportType)
}

/**
 * Extract year from report date string
 */
export function extractYearFromReportDate(reportDate: string): number {
  return parseInt(reportDate.substring(0, 4), 10)
}

/**
 * Check if report is annual (12-31)
 */
export function isAnnualReport(reportDate: string): boolean {
  return reportDate.includes('-12-31')
}
