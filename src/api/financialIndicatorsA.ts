/**
 * A-share Financial Indicators API
 *
 * Fetches: ROE, ROA (from Dupont API), PB (from real-time quote), Dividend Payout Ratio
 *
 * API Sources:
 * - RPT_F10_FINANCE_DUPONT: ROE, ROA
 * - RPT_F10_DIVIDEND_HISTOGRAM: Dividend Payout Ratio (DIVIDEND_PAY_PLAN)
 * - push2.eastmoney.com: PB (f167 field)
 */

import { z } from 'zod'
import { financialReportRateLimiter } from '@/utils/rateLimiter'
import { withRetry, fetchWithTimeout, HttpError } from '@/utils/retry'
import { validateApiResponse } from '@/utils/validateApiResponse'
import { logger } from '@/utils/logger'

// ============================================================
// Types
// ============================================================

export interface DupontData {
  reportDate: string
  roe: number | null   // ROE in percentage (e.g., 9.9 for 9.9%)
  roa: number | null   // ROA in percentage (e.g., 6.59 for 6.59%)
}

export interface DividendData {
  dividendPayoutRatio: number | null  // e.g., 0.7539 = 75.39%
  dividendNum: number | null         // historical dividend count
  dividendNewRatio: number | null     // dividend yield
  year: number | null                  // year derived from REPORT_DATE
}

export interface FinancialIndicatorsA {
  roeData: DupontData[]
  roaData: DupontData[]
  pb: number | null
  dividendPayoutRatio: number | null
}

export interface FetchAllIndicatorsResult {
  roeData: DupontData[]
  roaData: DupontData[]
  pb: number | null
  dividendPayoutRatio: number | null
  dividendHistory: { year: number; dividendPayoutRatio: number | null }[]
  errors: string[]
}

// ============================================================
// Zod Schemas
// ============================================================

const dupontItemSchema = z.object({
  REPORT_DATE: z.string(),
  ROE: z.number().nullable(),
  JROA: z.number().nullable(),
})

const dupontResponseSchema = z.object({
  version: z.string(),
  result: z.object({
    pages: z.number(),
    data: z.array(dupontItemSchema),
    count: z.number(),
  }).nullable(),
  success: z.boolean(),
  message: z.string(),
  code: z.number(),
})

const dividendHistogramItemSchema = z.object({
  SECUCODE: z.string(),
  SECURITY_CODE: z.string(),
  SECURITY_NAME_ABBR: z.string(),
  REPORT_DATE: z.string(),
  PARENTNETPROFIT: z.number().nullable(),
  DIVIDEND_PAY_IMPLE: z.number().nullable(),
  DIVIDEND_IMPLE: z.string().nullable(),
  DIVIDEND_PLAN: z.string().nullable(),
  DIVIDEND_PAY_PLAN: z.number().nullable(),
})

const dividendHistogramResponseSchema = z.object({
  version: z.string(),
  result: z.object({
    pages: z.number(),
    data: z.array(dividendHistogramItemSchema),
    count: z.number(),
  }).nullable(),
  success: z.boolean(),
  message: z.string(),
  code: z.number(),
})

// push2.eastmoney.com response schema
const quoteResponseSchema = z.object({
  rc: z.number(),
  rt: z.number(),
  svr: z.number(),
  lt: z.number(),
  d: z.number(),
  data: z.object({
    f57: z.string(),           // stock code
    f58: z.string(),           // stock name
    f167: z.number().nullable(), // PB ratio
  }).nullable(),
})

// ============================================================
// Helper Functions
// ============================================================

/**
 * Convert A-share code to secucode with .SH/.SZ suffix
 * - 6xxx → .SH (Shanghai)
 * - others → .SZ (Shenzhen)
 */
function formatSecucode(code: string): string {
  if (code.includes('.SH') || code.includes('.SZ')) {
    return code
  }
  if (code.startsWith('6')) {
    return `${code}.SH`
  }
  return `${code}.SZ`
}

/**
 * Convert A-share code to East Money secid format
 * - 6xxx → 1.xxx (Shanghai)
 * - others → 0.xxx (Shenzhen)
 */
function formatSecid(code: string): string {
  if (code.startsWith('6')) {
    return `1.${code}`
  }
  return `0.${code}`
}

/**
 * Fetch with rate limit and retry support
 */
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
// API Functions
// ============================================================

/**
 * Fetch ROE and ROA from Dupont analysis API
 * URL: https://datacenter.eastmoney.com/securities/api/data/v1/get?reportName=RPT_F10_FINANCE_DUPONT
 */
export async function fetchDupontData(code: string): Promise<DupontData[]> {
  const secucode = formatSecucode(code)
  const url = `https://datacenter.eastmoney.com/securities/api/data/v1/get?reportName=RPT_F10_FINANCE_DUPONT&columns=ALL&filter=(SECURITY_CODE="${code}")&pageNumber=1&pageSize=50&sortColumns=REPORT_DATE&sortTypes=-1&source=HSF10&client=PC`

  logger.debug('financialIndicatorsA', `Fetching Dupont data for ${secucode}`)

  try {
    const data = await fetchWithRateLimit<z.infer<typeof dupontResponseSchema>>(url)

    if (!data.success || !data.result?.data) {
      logger.warn('financialIndicatorsA', `Dupont API returned no data for ${secucode}`)
      return []
    }

    const result: DupontData[] = data.result.data.map((item) => ({
      reportDate: item.REPORT_DATE,
      roe: item.ROE,
      roa: item.JROA,
    }))

    logger.debug('financialIndicatorsA', `Dupont data: ${result.length} records, latest ROE=${result[0]?.roe}, ROA=${result[0]?.roa}`)
    return result
  } catch (error) {
    logger.error('financialIndicatorsA', `Failed to fetch Dupont data for ${secucode}:`, error)
    throw error
  }
}

/**
 * Fetch dividend payout ratio from dividend histogram API
 * URL: https://datacenter.eastmoney.com/securities/api/data/v1/get?reportName=RPT_F10_DIVIDEND_HISTOGRAM
 *
 * Note: DIVIDEND_PAY_PLAN is pre-calculated full-year dividend payout ratio
 */
export async function fetchDividendPayoutRatio(code: string): Promise<DividendData> {
  const secucode = formatSecucode(code)
  const url = `https://datacenter.eastmoney.com/securities/api/data/v1/get?reportName=RPT_F10_DIVIDEND_HISTOGRAM&columns=SECUCODE,SECURITY_CODE,SECURITY_NAME_ABBR,REPORT_DATE,PARENTNETPROFIT,DIVIDEND_IMPLE,DIVIDEND_PAY_IMPLE,DIVIDEND_PLAN,DIVIDEND_PAY_PLAN&filter=(SECUCODE="${secucode}")&pageNumber=1&pageSize=100&sortTypes=1&sortColumns=REPORT_DATE&source=HSF10&client=PC`

  logger.debug('financialIndicatorsA', `Fetching dividend data for ${secucode}`)

  try {
    const data = await fetchWithRateLimit<z.infer<typeof dividendHistogramResponseSchema>>(url)

    if (!data.success || !data.result?.data || data.result.data.length === 0) {
      logger.warn('financialIndicatorsA', `Dividend API returned no data for ${secucode}`)
      return { dividendPayoutRatio: null, dividendNum: null, dividendNewRatio: null, year: null }
    }

    // Get the latest year with DIVIDEND_PAY_PLAN (full-year payout ratio)
    // Data is sorted ascending by REPORT_DATE, so last element is the latest
    const items = data.result.data
    let latestItem = null
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i]
      if (item && item.DIVIDEND_PAY_PLAN !== null) {
        latestItem = item
        break
      }
    }

    if (!latestItem) {
      return { dividendPayoutRatio: null, dividendNum: null, dividendNewRatio: null, year: null }
    }

    const year = latestItem.REPORT_DATE ? parseInt(latestItem.REPORT_DATE.substring(0, 4), 10) : null
    const result: DividendData = {
      dividendPayoutRatio: latestItem.DIVIDEND_PAY_PLAN,
      dividendNum: null,
      dividendNewRatio: null,
      year,
    }

    logger.debug('financialIndicatorsA', `Dividend data: payoutRatio=${result.dividendPayoutRatio}, year=${result.year}`)
    return result
  } catch (error) {
    logger.error('financialIndicatorsA', `Failed to fetch dividend data for ${secucode}:`, error)
    throw error
  }
}

/**
 * Fetch historical dividend payout ratio data
 */
export async function fetchDividendPayoutRatioHistory(code: string): Promise<DividendData[]> {
  const secucode = formatSecucode(code)
  const url = `https://datacenter.eastmoney.com/securities/api/data/v1/get?reportName=RPT_F10_DIVIDEND_HISTOGRAM&columns=SECUCODE,SECURITY_CODE,SECURITY_NAME_ABBR,REPORT_DATE,PARENTNETPROFIT,DIVIDEND_IMPLE,DIVIDEND_PAY_IMPLE,DIVIDEND_PLAN,DIVIDEND_PAY_PLAN&filter=(SECUCODE="${secucode}")&pageNumber=1&pageSize=100&sortTypes=1&sortColumns=REPORT_DATE&source=HSF10&client=PC`

  logger.debug('financialIndicatorsA', `Fetching dividend history for ${secucode}`)

  try {
    const data = await fetchWithRateLimit<z.infer<typeof dividendHistogramResponseSchema>>(url)

    if (!data.success || !data.result?.data || data.result.data.length === 0) {
      logger.warn('financialIndicatorsA', `Dividend history API returned no data for ${secucode}`)
      return []
    }

    const result: DividendData[] = data.result.data
      .filter(item => item.DIVIDEND_PAY_PLAN !== null)
      .map(item => {
        const reportDate = item.REPORT_DATE
        const year = reportDate ? parseInt(reportDate.substring(0, 4), 10) : null
        return {
          dividendPayoutRatio: item.DIVIDEND_PAY_PLAN,
          dividendNum: null,
          dividendNewRatio: null,
          year,
        }
      })

    logger.debug('financialIndicatorsA', `Dividend history: ${result.length} records`)
    return result
  } catch (error) {
    logger.error('financialIndicatorsA', `Failed to fetch dividend history for ${secucode}:`, error)
    return []
  }
}

/**
 * Fetch PB ratio from East Money real-time quote API
 * URL: https://push2.eastmoney.com/api/qt/stock/get
 * Field: f167 = PB ratio
 *
 * Uses same pattern as fetchEastMoneyStockInfo in eastmoney.ts
 * Note: This does NOT use financialReportRateLimiter as it's a different API endpoint
 */
export async function fetchPBFromQuote(code: string): Promise<number | null> {
  const secid = formatSecid(code)
  const url = `https://push2.eastmoney.com/api/qt/stock/get?secid=${secid}&fields=f57,f58,f167&ut=bd1d9ddb04089700cf9c27f6f7426281&fltt=2`

  logger.debug('financialIndicatorsA', `Fetching PB from quote for ${secid}`)

  try {
    const response = await fetchWithTimeout(
      url,
      {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
          'Origin': 'https://emweb.securities.eastmoney.com',
          'Referer': 'https://emweb.securities.eastmoney.com/',
        },
      },
      10000 // 10 second timeout
    )

    if (!response.ok) {
      throw new HttpError(`HTTP error! status: ${response.status}`, response.status, response)
    }

    const data = await response.json()

    // Validate response structure - return null if validation fails (non-critical data)
    try {
      const parsed = validateApiResponse(data, quoteResponseSchema)

      if (!parsed.data) {
        logger.warn('financialIndicatorsA', `Quote API returned no data for ${secid}`)
        return null
      }

      const pb = parsed.data.f167 !== null ? parsed.data.f167 / 100 : null
      logger.debug('financialIndicatorsA', `PB from quote: ${pb}`)
      return pb
    } catch (validationError) {
      logger.warn('financialIndicatorsA', `Quote response validation failed for ${secid}:`, validationError)
      return null
    }
  } catch (error) {
    logger.error('financialIndicatorsA', `Failed to fetch PB from quote for ${secid}:`, error)
    // Return null instead of throwing to allow partial results
    return null
  }
}

/**
 * Fetch all financial indicators in parallel using Promise.allSettled
 * Uses financialReportRateLimiter for all requests
 * Returns partial results even if some APIs fail
 *
 * @param code - Stock code
 * @param pbFromStockInfo - Optional PB ratio already fetched from stock info API (push2)
 *                          If provided, skips the separate PB fetch to reduce API calls
 */
export async function fetchAllIndicatorsA(code: string, pbFromStockInfo?: number | null): Promise<FetchAllIndicatorsResult> {
  const errors: string[] = []
  let roeData: DupontData[] = []
  let roaData: DupontData[] = []
  let pb: number | null = pbFromStockInfo ?? null
  let dividendPayoutRatio: number | null = null
  let dividendHistory: { year: number; dividendPayoutRatio: number | null }[] = []

  // Fetch all indicators in parallel using Promise.allSettled
  // Skip PB fetch if already provided from stock info API (use resolved promise as placeholder)
  const results = await Promise.allSettled([
    fetchDupontData(code),
    fetchDividendPayoutRatio(code),
    fetchDividendPayoutRatioHistory(code),
    pb === null ? fetchPBFromQuote(code) : Promise.resolve(null),
  ] as const)

  // Process Dupont data (index 0)
  if (results[0].status === 'fulfilled') {
    roeData = results[0].value.filter(d => d.roe !== null)
    roaData = results[0].value.filter(d => d.roa !== null)
  } else {
    errors.push(`ROE/ROA fetch failed: ${results[0].reason instanceof Error ? results[0].reason.message : String(results[0].reason)}`)
  }

  // Process Dividend data (index 1)
  if (results[1].status === 'fulfilled') {
    dividendPayoutRatio = results[1].value.dividendPayoutRatio
  } else {
    errors.push(`Dividend fetch failed: ${results[1].reason instanceof Error ? results[1].reason.message : String(results[1].reason)}`)
  }

  // Process Dividend history (index 2)
  if (results[2].status === 'fulfilled') {
    dividendHistory = results[2].value
      .filter(d => d.year !== null && d.dividendPayoutRatio !== null)
      .map(d => ({ year: d.year!, dividendPayoutRatio: d.dividendPayoutRatio }))
  }

  // Process PB data (index 3, only if not provided from stock info)
  if (pbFromStockInfo === undefined || pbFromStockInfo === null) {
    if (results[3].status === 'fulfilled') {
      pb = results[3].value
    } else {
      errors.push(`PB fetch failed: ${results[3].reason instanceof Error ? results[3].reason.message : String(results[3].reason)}`)
    }
  }

  logger.debug('financialIndicatorsA', `fetchAllIndicatorsA completed for ${code}: roeData=${roeData.length}, roaData=${roaData.length}, pb=${pb}, dividend=${dividendPayoutRatio}, dividendHistory=${dividendHistory.length}, errors=${errors.length}`)

  return {
    roeData,
    roaData,
    pb,
    dividendPayoutRatio,
    dividendHistory,
    errors,
  }
}