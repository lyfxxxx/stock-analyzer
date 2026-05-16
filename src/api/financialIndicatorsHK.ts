import { financialReportRateLimiter } from '@/utils/rateLimiter'
import { logger } from '@/utils/logger'
import { withRetry, fetchWithTimeout, HttpError } from '@/utils/retry'
import { z } from 'zod'
import { validateApiResponse } from '@/utils/validateApiResponse'
import { getReportType, calculateSeasonalRatios, type SeasonalRatios, type QuarterlyData } from '@/utils/calculator'

declare const __DEV__: boolean

const BASE_URL = 'https://datacenter.eastmoney.com/securities/api/data/v1/get'

// ============================================================
// API Response Types (raw from East Money)
// ============================================================

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

/**
 * Raw indicator item from RPT_HKF10_FN_MAININDICATOR API.
 * Field names are HK-specific: ROE_AVG, ROA, PB_TTM
 */
export interface RawMainIndicatorItem {
  SECURITY_CODE: string
  SECURITY_NAME_ABBR: string
  REPORT_DATE: string
  ROE_AVG: number | null      // 平均ROE (%)
  ROE_YEARLY: number | null   // 年度ROE (%)
  ROA: number | null          // 总资产收益率 (%)
  PB_TTM: number | null       // 市净率TTM
}

/**
 * Raw dividend basic item from RPT_HKF10_MAIN_DIVBASIC API.
 */
export interface RawDivBasicItem {
  SECURITY_CODE: string
  YEAR: number
  PLAN_EXPLAIN: string | null
  IS_BFP: string  // "0" = normal dividend, "1" = equity incentive
}

/**
 * Raw income statement per-share item from RPT_HKF10_FN_INCOME_PC API.
 */
export interface RawIncomePCItem {
  SECUCODE: string
  REPORT_DATE: string
  STD_ITEM_CODE: string
  STD_ITEM_NAME: string
  AMOUNT: number | null
}

// ============================================================
// Zod Schemas for Response Validation
// ============================================================

export const rawMainIndicatorItemSchema = z.object({
  SECURITY_CODE: z.string(),
  SECURITY_NAME_ABBR: z.string(),
  REPORT_DATE: z.string(),
  ROE_AVG: z.number().nullable(),
  ROE_YEARLY: z.number().nullable(),
  ROA: z.number().nullable(),
  PB_TTM: z.number().nullable(),
})

const mainIndicatorResponseSchema = z.object({
  version: z.string(),
  result: z.object({
    pages: z.number(),
    data: z.array(rawMainIndicatorItemSchema),
    count: z.number(),
  }).nullable(),
  success: z.boolean(),
  message: z.string(),
  code: z.number(),
})

const divBasicItemSchema = z.object({
  SECURITY_CODE: z.string(),
  YEAR: z.union([z.number(), z.string()]).transform(val => typeof val === 'string' ? parseInt(val, 10) : val),
  PLAN_EXPLAIN: z.string().nullable(),
  IS_BFP: z.string(),
})

const divBasicResponseSchema = z.object({
  version: z.string(),
  result: z.object({
    pages: z.number(),
    data: z.array(divBasicItemSchema),
    count: z.number(),
  }).nullable(),
  success: z.boolean(),
  message: z.string(),
  code: z.number(),
})

const incomePCItemSchema = z.object({
  SECUCODE: z.string(),
  REPORT_DATE: z.string(),
  STD_ITEM_CODE: z.string(),
  STD_ITEM_NAME: z.string(),
  AMOUNT: z.number().nullable(),
})

const incomePCResponseSchema = z.object({
  version: z.string(),
  result: z.object({
    pages: z.number(),
    data: z.array(incomePCItemSchema),
    count: z.number(),
  }).nullable(),
  success: z.boolean(),
  message: z.string(),
  code: z.number(),
})

// ============================================================
// Processed Types for Consumer Use
// ============================================================

export interface YearlyIndicatorData {
  year: number
  roe: number | null       // ROE_AVG (平均ROE %)
  roa: number | null       // 总资产收益率 (%)
  dividendPayoutRatio: number | null  // 股息支付率 (decimal)
}

export interface ProcessedFinancialIndicators {
  /** Current year values (most recent report) */
  current: {
    roe: number | null
    roa: number | null
    pb: number | null       // PB_TTM
    dividendPayoutRatio: number | null
    reportDate: string
  }
  /** Historical yearly data (sorted by year descending) */
  yearlyData: YearlyIndicatorData[]
  /** Seasonal ratios for ROE/ROA projection */
  seasonalRatios: SeasonalRatios | null
}

// ============================================================
// Internal Helpers
// ============================================================

function extractYearFromReportDate(reportDate: string): number {
  // REPORT_DATE format: "2025-12-31 00:00:00" or "2025-12-31"
  const match = reportDate.match(/^(\d{4})/)
  if (match && match[1]) {
    return parseInt(match[1], 10)
  }
  return new Date(reportDate).getFullYear()
}

/**
 * Parse per-share dividend from PLAN_EXPLAIN string.
 *
 * Examples:
 * - "每股派港币0.688元" → 0.688 (HKD)
 * - "每股派人民币0.239元(相当于港币0.26104元)" → 0.239 (RMB)
 *
 * Logic:
 * - If contains "人民币", extract RMB amount
 * - Otherwise, extract HKD amount
 */
function parsePerShareDividend(planExplain: string | null): number | null {
  if (!planExplain) return null

  // Check if it's RMB (内地企业)
  if (planExplain.includes('人民币')) {
    const match = planExplain.match(/人民币([\d.]+)元/)
    if (match && match[1]) {
      return parseFloat(match[1])
    }
  }

  // Otherwise extract HKD (香港企业)
  const match = planExplain.match(/港币([\d.]+)元/)
  if (match && match[1]) {
    return parseFloat(match[1])
  }

  return null
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

// ============================================================
// Main API Functions
// ============================================================

/**
 * Fetch main financial indicators from RPT_HKF10_FN_MAININDICATOR API.
 *
 * @param code - HK stock code (e.g., "00700" or "00001")
 * @returns Array of yearly indicator data with ROE_AVG, ROA, PB_TTM
 */
export async function fetchMainIndicator(code: string): Promise<RawMainIndicatorItem[]> {
  // Format code: pad to 5 digits if needed (HK stocks use 5-digit codes)
  const paddedCode = code.padStart(5, '0')

  const columns = 'SECURITY_CODE,SECURITY_NAME_ABBR,REPORT_DATE,ROE_AVG,ROE_YEARLY,ROA,PB_TTM'
  const url = `${BASE_URL}?reportName=RPT_HKF10_FN_MAININDICATOR&columns=${columns}&filter=(SECURITY_CODE%3D%22${paddedCode}%22)&pageNumber=1&pageSize=50&sortColumns=REPORT_DATE&sortTypes=-1&source=F10&client=PC`

  logger.debug('financialIndicatorsHK', `Fetching main indicators for code: ${paddedCode}`)

  const rawData = await fetchWithRateLimit<unknown>(url)
  const validatedData = validateApiResponse(rawData, mainIndicatorResponseSchema)

  if (!validatedData.success || !validatedData.result?.data) {
    logger.debug('financialIndicatorsHK', 'No indicator data returned from API')
    return []
  }

  logger.debug('financialIndicatorsHK', `Fetched ${validatedData.result.data.length} indicator records`)

  return validatedData.result.data
}

/**
 * Fetch dividend basic data from RPT_HKF10_MAIN_DIVBASIC API.
 *
 * @param code - HK stock code (e.g., "00700" or "00001")
 * @returns Array of dividend basic items
 */
export async function fetchDivBasic(code: string): Promise<RawDivBasicItem[]> {
  const paddedCode = code.padStart(5, '0')

  const url = `${BASE_URL}?reportName=RPT_HKF10_MAIN_DIVBASIC&columns=SECURITY_CODE,YEAR,PLAN_EXPLAIN,IS_BFP&filter=(SECURITY_CODE%3D%22${paddedCode}%22)(IS_BFP%3D%220%22)&pageNumber=1&pageSize=100&sortTypes=-1,-1&sortColumns=NOTICE_DATE,EX_DIVIDEND_DATE&source=F10&client=PC`

  logger.debug('financialIndicatorsHK', `Fetching dividend basic data for code: ${paddedCode}`)

  const rawData = await fetchWithRateLimit<unknown>(url)
  const validatedData = validateApiResponse(rawData, divBasicResponseSchema)

  if (!validatedData.success || !validatedData.result?.data) {
    logger.debug('financialIndicatorsHK', 'No dividend basic data returned from API')
    return []
  }

  logger.debug('financialIndicatorsHK', `Fetched ${validatedData.result.data.length} dividend basic records`)

  return validatedData.result.data
}

/**
 * Fetch income statement per-share data from RPT_HKF10_FN_INCOME_PC API.
 *
 * @param secucode - HK stock secucode (e.g., "00700.HK")
 * @returns Array of income statement items
 */
export async function fetchIncomePC(secucode: string): Promise<RawIncomePCItem[]> {
  const url = `${BASE_URL}?reportName=RPT_HKF10_FN_INCOME_PC&columns=SECUCODE,REPORT_DATE,STD_ITEM_CODE,STD_ITEM_NAME,AMOUNT&filter=(SECUCODE%3D%22${secucode}%22)&pageNumber=1&pageSize=500&sortTypes=-1,1&sortColumns=REPORT_DATE,STD_ITEM_CODE&source=F10&client=PC`

  logger.debug('financialIndicatorsHK', `Fetching income statement per-share data for: ${secucode}`)

  const rawData = await fetchWithRateLimit<unknown>(url)
  const validatedData = validateApiResponse(rawData, incomePCResponseSchema)

  if (!validatedData.success || !validatedData.result?.data) {
    logger.debug('financialIndicatorsHK', 'No income statement per-share data returned from API')
    return []
  }

  logger.debug('financialIndicatorsHK', `Fetched ${validatedData.result.data.length} income statement per-share records`)

  return validatedData.result.data
}

/**
 * Fetch and calculate dividend payout ratio from DIVBASIC + INCOME_PC.
 *
 * Calculation: per-share dividend / basic EPS (STD_ITEM_CODE = 004027002)
 *
 * @param code - HK stock code (e.g., "00700" or "00001")
 * @returns Object with current and yearly dividend payout ratio data
 */
export async function fetchHKDividendPayoutData(
  code: string
): Promise<{
  current: { dividendPayoutRatio: number | null }
  yearlyData: { year: number; dividendPayoutRatio: number | null }[]
}> {
  const paddedCode = code.padStart(5, '0')
  const secucode = `${paddedCode}.HK`

  // Fetch both APIs in parallel
  const [divBasicData, incomePCData] = await Promise.all([
    fetchDivBasic(code),
    fetchIncomePC(secucode),
  ])

  if (divBasicData.length === 0) {
    logger.debug('financialIndicatorsHK', 'No dividend basic data available')
    return {
      current: { dividendPayoutRatio: null },
      yearlyData: [],
    }
  }

  // Extract EPS by year (STD_ITEM_CODE = 004027002 = basic EPS)
  const epsByYear = new Map<number, number>()
  for (const item of incomePCData) {
    if (item.STD_ITEM_CODE === '004027002' && item.AMOUNT !== null) {
      const year = extractYearFromReportDate(item.REPORT_DATE)
      // Keep the latest EPS for each year (data is sorted by REPORT_DATE desc)
      if (!epsByYear.has(year)) {
        epsByYear.set(year, item.AMOUNT)
      }
    }
  }

  // Sum per-share dividends by year (multiple dividends per year possible)
  const dividendByYear = new Map<number, number>()
  for (const item of divBasicData) {
    const perShareDividend = parsePerShareDividend(item.PLAN_EXPLAIN)
    if (perShareDividend !== null) {
      const existing = dividendByYear.get(item.YEAR) || 0
      dividendByYear.set(item.YEAR, existing + perShareDividend)
    }
  }

  // Calculate payout ratio per year
  const yearlyData: { year: number; dividendPayoutRatio: number | null }[] = []
  for (const [year, totalDividend] of dividendByYear) {
    const eps = epsByYear.get(year)
    if (eps !== undefined && eps > 0) {
      const payoutRatio = totalDividend / eps
      yearlyData.push({ year, dividendPayoutRatio: payoutRatio })
    } else {
      // EPS not available or negative
      yearlyData.push({ year, dividendPayoutRatio: null })
    }
  }

  // Sort by year descending
  yearlyData.sort((a, b) => b.year - a.year)

  // Get current (latest year) payout ratio
  const current = yearlyData.length > 0 && yearlyData[0]
    ? { dividendPayoutRatio: yearlyData[0].dividendPayoutRatio }
    : { dividendPayoutRatio: null }

  logger.debug('financialIndicatorsHK', `Dividend payout data: current=${current.dividendPayoutRatio}, years=${yearlyData.map(d => d.year).join(',')}`)

  return {
    current,
    yearlyData,
  }
}

/**
 * Fetch and process HK stock financial indicators.
 * Returns current year values and historical yearly data.
 *
 * @param code - HK stock code (e.g., "00700" or "00001")
 * @returns Processed financial indicators with current values and yearly history
 */
export async function fetchHKFinancialIndicators(
  code: string
): Promise<ProcessedFinancialIndicators> {
  // Fetch main indicators and dividend data in parallel
  const [rawData, dividendData] = await Promise.all([
    fetchMainIndicator(code),
    fetchHKDividendPayoutData(code),
  ])

  if (rawData.length === 0) {
    return {
      current: {
        roe: null,
        roa: null,
        pb: null,
        dividendPayoutRatio: dividendData.current.dividendPayoutRatio,
        reportDate: '',
      },
      yearlyData: dividendData.yearlyData.map(d => ({
        year: d.year,
        roe: null,
        roa: null,
        dividendPayoutRatio: d.dividendPayoutRatio,
      })),
      seasonalRatios: null,
    }
  }

  // Sort by report date descending to get most recent first
  const sortedData = [...rawData].sort(
    (a, b) => new Date(b.REPORT_DATE).getTime() - new Date(a.REPORT_DATE).getTime()
  )

  // Current (most recent) values
  const latest = sortedData[0]
  if (!latest) {
    return {
      current: {
        roe: null,
        roa: null,
        pb: null,
        dividendPayoutRatio: dividendData.current.dividendPayoutRatio,
        reportDate: '',
      },
      yearlyData: dividendData.yearlyData.map(d => ({
        year: d.year,
        roe: null,
        roa: null,
        dividendPayoutRatio: d.dividendPayoutRatio,
      })),
      seasonalRatios: null,
    }
  }
  const current = {
    roe: latest.ROE_AVG,          // Use ROE_AVG as the ROE field (平均ROE)
    roa: latest.ROA,
    pb: latest.PB_TTM,
    dividendPayoutRatio: dividendData.current.dividendPayoutRatio,
    reportDate: latest.REPORT_DATE,
  }

  // Build historical yearly data (deduplicated by year, taking the latest report per year)
  const yearMap = new Map<number, YearlyIndicatorData>()

  for (const item of sortedData) {
    const year = extractYearFromReportDate(item.REPORT_DATE)

    // Only keep the latest report for each year
    if (!yearMap.has(year)) {
      yearMap.set(year, {
        year,
        roe: item.ROE_AVG,
        roa: item.ROA,
        dividendPayoutRatio: null, // Will be filled from dividend data
      })
    }
  }

  // Merge dividend payout ratio from dividend data
  for (const divItem of dividendData.yearlyData) {
    const existing = yearMap.get(divItem.year)
    if (existing) {
      existing.dividendPayoutRatio = divItem.dividendPayoutRatio
    } else {
      // Add year with only dividend data (no ROE/ROA)
      yearMap.set(divItem.year, {
        year: divItem.year,
        roe: null,
        roa: null,
        dividendPayoutRatio: divItem.dividendPayoutRatio,
      })
    }
  }

  // Convert to array and sort by year descending
  const yearlyData = Array.from(yearMap.values()).sort((a, b) => b.year - a.year)

  // Compute seasonal ROE ratios from quarterly data
  const quarterlyRoeData: QuarterlyData[] = []
  const annualRoeMap = new Map<number, number>()

  for (const item of sortedData) {
    const year = extractYearFromReportDate(item.REPORT_DATE)
    const reportType = getReportType(item.REPORT_DATE)
    if (reportType !== 'annual' && item.ROE_AVG != null) {
      quarterlyRoeData.push({ year, reportType, value: item.ROE_AVG })
    }
  }

  for (const d of yearlyData) {
    if (d.roe != null) {
      annualRoeMap.set(d.year, d.roe)
    }
  }

  const seasonalRatios = quarterlyRoeData.length >= 2
    ? calculateSeasonalRatios(quarterlyRoeData, annualRoeMap)
    : null

  logger.debug('financialIndicatorsHK', `current: roe=${current.roe}, roa=${current.roa}, pb=${current.pb}, dividend=${current.dividendPayoutRatio}, yearlyDataYears: ${yearlyData.map(d => d.year).join(',')}`)

  return {
    current,
    yearlyData,
    seasonalRatios,
  }
}
