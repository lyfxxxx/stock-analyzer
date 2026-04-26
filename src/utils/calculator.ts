import type { YearlyData, CurrencyType } from '@/types/stock'
import type { ReportType } from '@/types/financialReport'
import { logger } from '@/utils/logger'

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
 * Calculate current ratio = Current Assets / Current Liabilities
 * Returns null if either value is 0 or null
 */
export function calculateCurrentRatio(
  currentAssets: number | null,
  currentLiabilities: number | null
): number | null {
  if (!currentAssets || !currentLiabilities) return null
  if (currentAssets === 0 || currentLiabilities === 0) return null
  const ratio = currentAssets / currentLiabilities
  return Math.round(ratio * 100) / 100
}

/**
 * Calculate PE ratio = Market Cap / Net Profit
 * Returns null if either value is 0, null, or negative
 */
export function calculatePERatio(
  marketCap: number | null,
  netProfit: number | null
): number | null {
  if (!marketCap || !netProfit) return null
  if (marketCap === 0 || netProfit === 0) return null
  if (netProfit < 0) return null
  const ratio = marketCap / netProfit
  return Math.round(ratio * 10) / 10
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
 * Convert a stored dividend payout ratio value to display percentage.
 * A-shares API returns decimal (e.g., 0.50 = 50%), while HK API may return
 * percentage number (e.g., 1.95 = 1.95%). This normalizes both to percentage.
 */
export function toDisplayPercentage(value: number | null): number | null {
  if (value === null || value === undefined || isNaN(value)) return null
  return value > 1 ? value : value * 100
}

/**
 * Format dividend payout ratio for display.
 */
export function formatDividendPayoutRatio(value: number | null, decimals: number = 2): string {
  const displayValue = toDisplayPercentage(value)
  if (displayValue === null) return '-'
  return `${displayValue.toFixed(decimals)}%`
}

/**
 * Get report type from report date string
 */
export function getReportType(reportDate: string): ReportType {
  const dateStr = String(reportDate)
  if (dateStr.includes('-12-31')) return 'annual'
  if (dateStr.includes('-09-30')) return 'Q3'
  if (dateStr.includes('-06-30')) return 'H1'
  if (dateStr.includes('-03-31')) return 'Q1'
  
  // 对于港股等非 12-31 结账日的公司，如果不是以上标准季度末，默认作为年报处理（或至少不作为预测）
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
  return getReportType(reportDate) === 'annual'
}

/**
 * 灵活的年度预测接口
 * 兼容港股（H1+Annual）和A股（Q1+H1+Q3+Annual）两种报告制度
 */
export interface FlexibleYearlyData {
  year: number
  h1?: number      // 半年度（港股独立半年报，或A股Q2累计）
  annual?: number  // 年度
  q1?: number      // Q1季度（累计）
  q2?: number      // Q2/H1季度（累计）
  q3?: number      // Q3季度（累计）
  q4?: number      // Q4/年度
}

export interface FlexibleCurrentData {
  h1?: number
  annual?: number
  q1?: number
  q2?: number
  q3?: number
  q4?: number
  [key: string]: number | undefined
}

/**
 * TTM (Trailing Twelve Months) 数据接口
 * TTM = 过去12个月的滚动数据
 */
export interface TTMData {
  year: number
  ttm: number
  reportType: 'semi' | 'q1' | 'h1' | 'q3' | 'annual'  // 报告类型
}

/**
 * 报告类型枚举
 */
export type ReportPeriodType = 'semi' | 'quarterly'

/**
 * 港股半年度TTM计算
 * TTM = 去年下半年 + 今年上半年
 *     = (Annual_去年 - H1_去年) + H1_今年
 * 
 * @param lastYearAnnual - 去年年度数据
 * @param lastYearH1 - 去年上半年数据
 * @param currentYearH1 - 今年上半年数据
 * @returns TTM值
 */
export function calculateSemiAnnualTTM(
  lastYearAnnual: number,
  lastYearH1: number,
  currentYearH1: number
): number {
  const lastYearSecondHalf = lastYearAnnual - lastYearH1
  return lastYearSecondHalf + currentYearH1
}

/**
 * A股季度累计TTM计算
 * A股报告是累计数据：Q1、H1(Q1+Q2)、Q3累计(Q1+Q2+Q3)、Annual
 * 
 * TTM计算方式（基于不同报告期）：
 * - Q1报告后：TTM = 去年Annual - 去年Q3累计 + 今年Q1
 * - H1报告后：TTM = 去年Annual - 去年H1 + 今年H1
 * - Q3报告后：TTM = 去年Annual - 去年Q3累计 + 今年Q3累计
 * 
 * @param lastYearAnnual - 去年年度数据
 * @param lastYearCumulative - 去年同期累计数据
 * @param currentCumulative - 今年同期累计数据
 * @returns TTM值
 */
export function calculateQuarterlyTTM(
  lastYearAnnual: number,
  lastYearCumulative: number,
  currentCumulative: number
): number {
  const lastYearRemainder = lastYearAnnual - lastYearCumulative
  return lastYearRemainder + currentCumulative
}

/**
 * 检测数据报告类型
 * @param data - 年度数据
 * @returns 'semi' 表示港股半年度，'quarterly' 表示A股季度
 */
export function detectReportType(data: FlexibleYearlyData[]): ReportPeriodType {
  // 检查是否有Q1或Q3数据（A股季度报告特征）
  const hasQ1 = data.some(d => d.q1 !== undefined)
  const hasQ3 = data.some(d => d.q3 !== undefined)
  
  if (hasQ1 || hasQ3) {
    return 'quarterly'
  }
  return 'semi'
}

/**
 * 批量计算历史TTM数据（兼容港股和A股）
 * 
 * @param historyData - 历史年度数据数组
 * @param reportType - 报告类型：'semi' 港股半年度，'quarterly' A股季度
 * @returns TTM数据数组
 */
export function calculateHistoryTTM(
  historyData: FlexibleYearlyData[],
  reportType?: ReportPeriodType
): TTMData[] {
  const ttmData: TTMData[] = []
  
  // 自动检测报告类型
  const actualReportType = reportType || detectReportType(historyData)
  
  // 按年份排序（从旧到新）
  const sorted = [...historyData].sort((a, b) => a.year - b.year)
  
  if (actualReportType === 'semi') {
    // 港股半年度模式
    for (let i = 1; i < sorted.length; i++) {
      const prevYear = sorted[i - 1]!
      const currYear = sorted[i]!
      
      if (
        prevYear.annual !== undefined &&
        prevYear.h1 !== undefined &&
        currYear.h1 !== undefined
      ) {
        const ttm = calculateSemiAnnualTTM(prevYear.annual, prevYear.h1, currYear.h1)
        ttmData.push({
          year: currYear.year,
          ttm,
          reportType: 'semi'
        })
      }
    }
  } else {
    // A股季度累计模式
    // 优先使用Q3累计数据（覆盖更广），其次H1，最后Q1
    for (let i = 1; i < sorted.length; i++) {
      const prevYear = sorted[i - 1]!
      const currYear = sorted[i]!
      
      if (prevYear.annual === undefined) continue
      
      // 尝试Q3累计
      if (currYear.q3 !== undefined && prevYear.q3 !== undefined) {
        const ttm = calculateQuarterlyTTM(prevYear.annual, prevYear.q3, currYear.q3)
        ttmData.push({ year: currYear.year, ttm, reportType: 'q3' })
      }
      // 尝试H1累计
      else if (currYear.h1 !== undefined && prevYear.h1 !== undefined) {
        const ttm = calculateQuarterlyTTM(prevYear.annual, prevYear.h1, currYear.h1)
        ttmData.push({ year: currYear.year, ttm, reportType: 'h1' })
      }
      // 尝试Q1
      else if (currYear.q1 !== undefined && prevYear.q1 !== undefined) {
        const ttm = calculateQuarterlyTTM(prevYear.annual, prevYear.q1, currYear.q1)
        ttmData.push({ year: currYear.year, ttm, reportType: 'q1' })
      }
    }
  }
  
  return ttmData
}

/**
 * 计算当前TTM（兼容港股和A股）
 * 
 * @param prevYearData - 去年数据
 * @param currentYearData - 今年数据
 * @param reportType - 报告类型
 * @returns TTM值和使用的报告类型，或null表示无法计算
 */
export function calculateCurrentTTM(
  prevYearData: FlexibleYearlyData,
  currentYearData: FlexibleCurrentData,
  reportType: ReportPeriodType
): { ttm: number; usedReportType: 'q1' | 'h1' | 'q3' } | null {
  
  if (prevYearData.annual === undefined) return null
  
  if (reportType === 'semi') {
    // 港股半年度模式
    if (prevYearData.h1 !== undefined && currentYearData.h1 !== undefined) {
      const ttm = calculateSemiAnnualTTM(prevYearData.annual, prevYearData.h1, currentYearData.h1)
      return { ttm, usedReportType: 'h1' }
    }
  } else {
    // A股季度累计模式
    // 优先级：Q3 > H1 > Q1
    
    if (currentYearData.q3 !== undefined && prevYearData.q3 !== undefined) {
      const ttm = calculateQuarterlyTTM(prevYearData.annual, prevYearData.q3, currentYearData.q3)
      return { ttm, usedReportType: 'q3' }
    }
    
    if (currentYearData.h1 !== undefined && prevYearData.h1 !== undefined) {
      const ttm = calculateQuarterlyTTM(prevYearData.annual, prevYearData.h1, currentYearData.h1)
      return { ttm, usedReportType: 'h1' }
    }
    
    if (currentYearData.q1 !== undefined && prevYearData.q1 !== undefined) {
      const ttm = calculateQuarterlyTTM(prevYearData.annual, prevYearData.q1, currentYearData.q1)
      return { ttm, usedReportType: 'q1' }
    }
  }
  
  return null
}

/**
 * 兼容旧版本的TTM计算函数（保留向后兼容）
 * @deprecated 请使用 calculateSemiAnnualTTM
 */
export function calculateTTM(
  lastYearAnnual: number,
  lastYearH1: number,
  currentYearH1: number
): number {
  return calculateSemiAnnualTTM(lastYearAnnual, lastYearH1, currentYearH1)
}

/**
 * 使用TTM进行预测
 * 基于历史TTM增长率预测未来TTM
 * 
 * @param historyTTM - 历史TTM数据数组
 * @param currentTTM - 当前TTM值
 * @returns 预测结果
 */
export function predictWithTTM(
  historyTTM: TTMData[]
): {
  predictedTTM: number
  avgGrowthRate: number
  confidence: 'high' | 'medium' | 'low'
  details: {
    historyCount: number
    growthRates: number[]
    latestTTM: number
  }
} {
  if (historyTTM.length === 0) {
    return {
      predictedTTM: 0,
      avgGrowthRate: 0,
      confidence: 'low',
      details: {
        historyCount: 0,
        growthRates: [],
        latestTTM: 0
      }
    }
  }
  
  // 按年份排序（从旧到新）
  const sorted = [...historyTTM].sort((a, b) => a.year - b.year)
  
  // 计算历史增长率
  const growthRates: number[] = []
  for (let i = 1; i < sorted.length; i++) {
    const prevTTM = sorted[i - 1]!.ttm
    const currTTM = sorted[i]!.ttm
    
    if (prevTTM !== 0) {
      const growthRate = (currTTM - prevTTM) / Math.abs(prevTTM)
      // 过滤异常增长率（超过100%或低于-50%可能是数据异常）
      if (growthRate >= -0.5 && growthRate <= 1.0) {
        growthRates.push(growthRate)
      }
    }
  }
  
  // 计算平均增长率
  let avgGrowthRate = 0
  if (growthRates.length > 0) {
    avgGrowthRate = growthRates.reduce((a, b) => a + b, 0) / growthRates.length
  }
  
  // 最新TTM值
  const latestTTM = sorted[sorted.length - 1]!.ttm
  
  // 预测未来TTM（使用50%的增长率权重，避免过度反应）
  const predictedTTM = latestTTM * (1 + avgGrowthRate * 0.5)
  
  // 置信度判断
  let confidence: 'high' | 'medium' | 'low' = 'low'
  if (sorted.length >= 5 && growthRates.length >= 3) {
    confidence = 'high'
  } else if (sorted.length >= 3 && growthRates.length >= 2) {
    confidence = 'medium'
  }
  
  logger.debug('calculator', `[TTM算法] 历史TTM数量: ${sorted.length}`)
  logger.debug('calculator', `[TTM算法] 有效增长率数量: ${growthRates.length}`)
  logger.debug('calculator', `[TTM算法] 历史增长率:`, growthRates.map(g => (g * 100).toFixed(1) + '%'))
  logger.debug('calculator', `[TTM算法] 平均增长率: ${(avgGrowthRate * 100).toFixed(2)}%`)
  logger.debug('calculator', `[TTM算法] 最新TTM: ${latestTTM.toFixed(2)}`)
  logger.debug('calculator', `[TTM算法] 预测TTM: ${predictedTTM.toFixed(2)}`)
  logger.debug('calculator', `[TTM算法] 置信度: ${confidence}`)
  
  return {
    predictedTTM: Math.round(predictedTTM * 100) / 100,
    avgGrowthRate: Math.round(avgGrowthRate * 10000) / 10000,
    confidence,
    details: {
      historyCount: sorted.length,
      growthRates,
      latestTTM
    }
  }
}

/**
 * 兼容版预测算法：季节性比例 + 同比增长修正
 * 支持港股（H1+Annual）和A股（Q1+Q2+Q3+Q4）两种数据结构
 * 
 * @param historyYearlyData - 历史年度数据数组
 * @param currentPeriodData - 当前年度已披露期间数据
 * @param periodType - 数据类型：'h1' 表示港股半年报模式，'quarterly' 表示季度模式
 * @returns 预测结果 { predictedValue, growthRate, confidence, details }
 */
export function predictFullYearFlexible(
  historyYearlyData: FlexibleYearlyData[],
  currentPeriodData: FlexibleCurrentData,
  periodType: 'h1' | 'quarterly' = 'h1'
): { 
  predictedValue: number
  growthRate: number
  confidence: 'high' | 'medium' | 'low'
  details: {
    avgRatio: number
    currentSum: number
    validHistoryYears: number
    lastYearSamePeriod: number
  }
} {
  // 确定要使用的期间标识
  let periodKeys: string[]
  let annualKey: string
  
  if (periodType === 'h1') {
    periodKeys = ['h1']
    annualKey = 'annual'
  } else {
    periodKeys = ['q1', 'q2', 'q3', 'q4']
    annualKey = 'q4'
  }
  
  // 获取当前已披露的期间
  const disclosedPeriods = periodKeys.filter(k => 
    currentPeriodData[k] !== undefined && currentPeriodData[k] !== null
  )
  
  if (disclosedPeriods.length === 0 || historyYearlyData.length === 0) {
    return { 
      predictedValue: 0, 
      growthRate: 0, 
      confidence: 'low',
      details: { avgRatio: 0, currentSum: 0, validHistoryYears: 0, lastYearSamePeriod: 0 }
    }
  }

  // 计算当前已披露期间的合计值
  const currentSum = disclosedPeriods.reduce((sum, k) => sum + (currentPeriodData[k] || 0), 0)

  // 1. 计算历史同期占全年的平均比例
  let totalRatio = 0
  let validYears = 0
  const ratioDetails: { year: number; ratio: number; periodSum: number; annual: number }[] = []
  
  for (const yearData of historyYearlyData) {
    const annualValue = yearData[annualKey as keyof FlexibleYearlyData]
    
    // 跳过年报数据为空、0或负的年份
    if (annualValue === undefined || annualValue === null || annualValue <= 0) continue
    
    // 计算该年份同期的合计值
    const periodSum = disclosedPeriods.reduce((sum, k) => {
      const val = yearData[k as keyof FlexibleYearlyData]
      return sum + (val !== undefined && val !== null ? val : 0)
    }, 0)
    
    // 跳过期间数据为空的年份
    if (periodSum === 0) continue
    
    const ratio = periodSum / annualValue
    
    // 合理性检查：比例应该在 0.1 到 0.9 之间
    if (ratio >= 0.1 && ratio <= 0.9) {
      totalRatio += ratio
      validYears++
      ratioDetails.push({ year: yearData.year, ratio, periodSum, annual: annualValue })
    }
  }
  
  const avgRatio = validYears > 0 ? totalRatio / validYears : 0.5

  logger.debug('calculator', `[Gemini算法] 期间类型: ${periodType}, 已披露期间: ${disclosedPeriods.join(',')}`)
  logger.debug('calculator', `[Gemini算法] 当前已披露合计: ${currentSum}`)
  logger.debug('calculator', `[Gemini算法] 有效历史年份数: ${validYears}`)
  logger.debug('calculator', `[Gemini算法] 历史比例详情:`, ratioDetails.slice(-3))
  logger.debug('calculator', `[Gemini算法] 平均比例: ${avgRatio}`)

  // 2. 基础预测值
  let basePrediction = 0
  if (avgRatio > 0) {
    basePrediction = currentSum / avgRatio
  }

  // 3. 计算同比增长率
  let growthRate = 0
  let lastYearSamePeriod = 0
  const lastYear = historyYearlyData[historyYearlyData.length - 1]
  
  if (lastYear) {
    lastYearSamePeriod = disclosedPeriods.reduce((sum, k) => {
      const val = lastYear[k as keyof FlexibleYearlyData]
      return sum + (val !== undefined && val !== null ? val : 0)
    }, 0)
    
    // 计算增长率
    if (lastYearSamePeriod > 0 && currentSum > 0) {
      growthRate = (currentSum - lastYearSamePeriod) / lastYearSamePeriod
    } else if (lastYearSamePeriod < 0 && currentSum < 0) {
      // 两者都为负时，计算改善幅度
      growthRate = (Math.abs(lastYearSamePeriod) - Math.abs(currentSum)) / Math.abs(lastYearSamePeriod)
    } else if (lastYearSamePeriod > 0 && currentSum < 0) {
      // 从正转负，大幅恶化
      growthRate = -1
    } else if (lastYearSamePeriod < 0 && currentSum > 0) {
      // 从负转正，大幅改善
      growthRate = 1
    }
    
    logger.debug('calculator', `[Gemini算法] 去年同期: ${lastYearSamePeriod}, 增长率: ${growthRate}`)
  }

  // 4. 结合季节性预测和增长率修正
  // 增长率修正权重为0.3，避免过度反应
  const predictedValue = basePrediction * (1 + growthRate * 0.3)
  
  logger.debug('calculator', `[Gemini算法] 基础预测: ${basePrediction}, 最终预测: ${predictedValue}`)

  // 5. 置信度判断
  let confidence: 'high' | 'medium' | 'low' = 'low'
  if (periodType === 'h1') {
    // 港股：H1披露后置信度较高
    confidence = 'high'
  } else {
    // A股：根据季度数量判断
    if (disclosedPeriods.length >= 3) {
      confidence = 'high'
    } else if (disclosedPeriods.length >= 2) {
      confidence = 'medium'
    }
  }

  return {
    predictedValue: Math.round(predictedValue * 100) / 100,
    growthRate: Math.round(growthRate * 10000) / 10000,
    confidence,
    details: {
      avgRatio,
      currentSum,
      validHistoryYears: validYears,
      lastYearSamePeriod
    }
  }
}

/**
 * Gemini推荐算法：季节性比例 + 同比增长修正（原版本，保留兼容）
 * 用于预测全年数据
 * 
 * @param historyYearlyData - 历史年度数据数组，每项包含四个季度的数据
 * @param currentQuarterlyData - 当前年度已披露季度数据，如 {q1: 10, q2: 15, q3: 20}
 * @returns 预测结果 { predictedValue, growthRate, confidence }
 */
export function predictFullYearWithSeasonalAndGrowth(
  historyYearlyData: { year: number; q1: number; q2: number; q3: number; q4: number }[],
  currentQuarterlyData: { q1?: number; q2?: number; q3?: number }
): { predictedValue: number; growthRate: number; confidence: 'high' | 'medium' | 'low' } {
  
  const currentQuarters = Object.keys(currentQuarterlyData).filter(k => currentQuarterlyData[k as keyof typeof currentQuarterlyData] !== undefined)
  const numQuarters = currentQuarters.length
  
  if (numQuarters === 0 || historyYearlyData.length === 0) {
    return { predictedValue: 0, growthRate: 0, confidence: 'low' }
  }

  // 1. 计算历史同期的平均占比 (Weight)
  let totalWeight = 0
  let validYears = 0
  
  for (const yearData of historyYearlyData) {
    const annualTotal = yearData.q1 + yearData.q2 + yearData.q3 + yearData.q4
    
    // 跳过年度数据为0或负的年份
    if (annualTotal <= 0) continue
    
    const ytdTotal = currentQuarters.reduce((sum, q) => {
      const quarterValue = yearData[q as keyof typeof yearData] ?? 0
      return sum + quarterValue
    }, 0)
    
    const weight = ytdTotal / annualTotal
    totalWeight += weight
    validYears++
  }
  
  const avgWeight = validYears > 0 ? totalWeight / validYears : 0

  // 2. 计算当前已披露的总额
  const currentYTD = currentQuarters.reduce((sum, q) => {
    return sum + (currentQuarterlyData[q as keyof typeof currentQuarterlyData] ?? 0)
  }, 0)

  // 3. 基础预测值 (基于季节性)
  let basePrediction = 0
  if (avgWeight > 0) {
    basePrediction = currentYTD / avgWeight
  }

  // 4. 计算同比增长率修正 (Momentum)
  // 比较今年 YTD 与去年 YTD 的增速
  let growthRate = 0
  const lastYear = historyYearlyData[historyYearlyData.length - 1]
  
  if (lastYear) {
    const lastYearYTD = currentQuarters.reduce((sum, q) => {
      const quarterValue = lastYear[q as keyof typeof lastYear] ?? 0
      return sum + quarterValue
    }, 0)
    
    // 只有当去年和今年YTD都为正时才能计算有意义的增长率
    if (lastYearYTD > 0 && currentYTD > 0) {
      growthRate = (currentYTD - lastYearYTD) / lastYearYTD
    } else if (lastYearYTD < 0 && currentYTD < 0) {
      // 两者都为负时，计算改善幅度
      growthRate = (Math.abs(lastYearYTD) - Math.abs(currentYTD)) / Math.abs(lastYearYTD)
    }
    // 如果异号（一边正一边负），增长率保持为0
  }

  // 5. 结合季节性预测和增长率修正
  // 使用加权平均：基础预测 * (1 + growthRate * 0.3)
  // 增长率修正权重为0.3，避免过度反应
  const predictedValue = basePrediction * (1 + growthRate * 0.3)

  // 6. 置信度判断
  let confidence: 'high' | 'medium' | 'low' = 'low'
  if (numQuarters >= 3) {
    confidence = 'high'
  } else if (numQuarters >= 2) {
    confidence = 'medium'
  }

  return {
    predictedValue: Math.round(predictedValue * 100) / 100,
    growthRate: Math.round(growthRate * 10000) / 10000,
    confidence
  }
}
