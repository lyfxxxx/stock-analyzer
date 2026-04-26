import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchMainIndicator, fetchHKFinancialIndicators, fetchDivBasic, fetchIncomePC, fetchHKDividendPayoutData } from '../financialIndicatorsHK'
import { withRetry, fetchWithTimeout, HttpError } from '@/utils/retry'
import { validateApiResponse } from '@/utils/validateApiResponse'
import { logger } from '@/utils/logger'
import { financialReportRateLimiter } from '@/utils/rateLimiter'

// Mock dependencies
vi.mock('@/utils/retry', () => ({
  withRetry: vi.fn((fn) => fn()),
  fetchWithTimeout: vi.fn(),
  HttpError: class HttpError extends Error {
    constructor(
      message: string,
      public status: number,
      public response?: Response
    ) {
      super(message)
      this.name = 'HttpError'
    }
  }
}))

vi.mock('@/utils/validateApiResponse', () => ({
  validateApiResponse: vi.fn((data) => data)
}))

vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn()
  }
}))

vi.mock('@/utils/rateLimiter', () => ({
  financialReportRateLimiter: {
    enqueue: vi.fn((fn) => fn())
  }
}))

describe('financialIndicatorsHK', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('fetchMainIndicator', () => {
    const mockApiResponse = {
      version: '1.0',
      success: true,
      result: {
        pages: 1,
        count: 3,
        data: [
          {
            SECURITY_CODE: '00700',
            SECURITY_NAME_ABBR: '腾讯控股',
            REPORT_DATE: '2024-12-31 00:00:00',
            ROE_AVG: 22.15,
            ROE_YEARLY: 22.15,
            ROA: 12.34,
            PB_TTM: 3.45
          },
          {
            SECURITY_CODE: '00700',
            SECURITY_NAME_ABBR: '腾讯控股',
            REPORT_DATE: '2023-12-31 00:00:00',
            ROE_AVG: 21.50,
            ROE_YEARLY: 21.50,
            ROA: 11.80,
            PB_TTM: 3.20
          }
        ]
      },
      message: '',
      code: 0
    }

    it('should fetch main indicators and return raw data', async () => {
      ;(fetchWithTimeout as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiResponse)
      })

      const result = await fetchMainIndicator('00700')

      expect(result).toEqual(mockApiResponse.result?.data)
      expect(result.length).toBe(2)
      expect(result[0].ROE_AVG).toBe(22.15)
      expect(result[1].ROA).toBe(11.80)
      expect(validateApiResponse).toHaveBeenCalled()
    })

    it('should return empty array when API returns no data', async () => {
      const emptyResponse = {
        version: '1.0',
        success: false,
        result: null,
        message: 'No data',
        code: 0
      }

      ;(fetchWithTimeout as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(emptyResponse)
      })

      const result = await fetchMainIndicator('00700')

      expect(result).toEqual([])
    })

    it('should handle HTTP errors gracefully', async () => {
      ;(fetchWithTimeout as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new HttpError('HTTP 500', 500)
      )

      await expect(fetchMainIndicator('00700')).rejects.toThrow(HttpError)
    })

    it('should pad stock code to 5 digits', async () => {
      ;(fetchWithTimeout as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiResponse)
      })

      await fetchMainIndicator('700')

      const url = (fetchWithTimeout as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
      expect(url).toContain('SECURITY_CODE%3D%2200700%22')
    })

    it('should use correct API endpoint and parameters', async () => {
      ;(fetchWithTimeout as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiResponse)
      })

      await fetchMainIndicator('00700')

      const url = (fetchWithTimeout as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
      expect(url).toContain('reportName=RPT_HKF10_FN_MAININDICATOR')
      expect(url).toContain('source=F10')
      expect(url).toContain('client=PC')
      expect(url).toContain('sortColumns=REPORT_DATE')
      expect(url).toContain('sortTypes=-1')
    })
  })

  describe('fetchHKFinancialIndicators', () => {
    const mockRawData = [
      {
        SECURITY_CODE: '00700',
        SECURITY_NAME_ABBR: '腾讯控股',
        REPORT_DATE: '2024-12-31 00:00:00',
        ROE_AVG: 22.15,
        ROE_YEARLY: 22.15,
        ROA: 12.34,
        PB_TTM: 3.45
      },
      {
        SECURITY_CODE: '00700',
        SECURITY_NAME_ABBR: '腾讯控股',
        REPORT_DATE: '2024-06-30 00:00:00',  // Mid-year report for same year
        ROE_AVG: 10.50,
        ROE_YEARLY: null,
        ROA: 6.00,
        PB_TTM: 3.40
      },
      {
        SECURITY_CODE: '00700',
        SECURITY_NAME_ABBR: '腾讯控股',
        REPORT_DATE: '2023-12-31 00:00:00',
        ROE_AVG: 21.50,
        ROE_YEARLY: 21.50,
        ROA: 11.80,
        PB_TTM: 3.20
      },
      {
        SECURITY_CODE: '00700',
        SECURITY_NAME_ABBR: '腾讯控股',
        REPORT_DATE: '2022-12-31 00:00:00',
        ROE_AVG: 20.00,
        ROE_YEARLY: 20.00,
        ROA: 10.50,
        PB_TTM: 2.80
      }
    ]

    const mockDivBasicData = [
      { SECURITY_CODE: '00700', YEAR: 2024, PLAN_EXPLAIN: '每股派港币3.00元', IS_BFP: '0' },
      { SECURITY_CODE: '00700', YEAR: 2023, PLAN_EXPLAIN: '每股派港币2.50元', IS_BFP: '0' },
    ]

    const mockIncomePCData = [
      { SECUCODE: '00700.HK', REPORT_DATE: '2024-12-31', STD_ITEM_CODE: '004027002', STD_ITEM_NAME: '每股基本盈利', AMOUNT: 10.00 },
      { SECUCODE: '00700.HK', REPORT_DATE: '2023-12-31', STD_ITEM_CODE: '004027002', STD_ITEM_NAME: '每股基本盈利', AMOUNT: 9.00 },
    ]

    it('should return current year values and historical yearly data', async () => {
      ;(fetchWithTimeout as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
        if (url.includes('RPT_HKF10_FN_MAININDICATOR')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              version: '1.0',
              success: true,
              result: { pages: 1, data: mockRawData, count: 4 },
              message: '',
              code: 0
            })
          })
        }
        if (url.includes('RPT_HKF10_MAIN_DIVBASIC')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              version: '1.0',
              success: true,
              result: { pages: 1, data: mockDivBasicData, count: 2 },
              message: '',
              code: 0
            })
          })
        }
        if (url.includes('RPT_HKF10_FN_INCOME_PC')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              version: '1.0',
              success: true,
              result: { pages: 1, data: mockIncomePCData, count: 2 },
              message: '',
              code: 0
            })
          })
        }
        return Promise.reject(new Error('Unexpected URL'))
      })

      const result = await fetchHKFinancialIndicators('00700')

      // Current should be the most recent (2024-12-31)
      expect(result.current.roe).toBe(22.15)
      expect(result.current.roa).toBe(12.34)
      expect(result.current.pb).toBe(3.45)
      expect(result.current.dividendPayoutRatio).toBe(0.30) // 3.00 / 10.00
      expect(result.current.reportDate).toBe('2024-12-31 00:00:00')

      // Yearly data should have 3 entries (2024, 2023, 2022)
      expect(result.yearlyData.length).toBe(3)
    })

    it('should deduplicate by year keeping the latest report', async () => {
      ;(fetchWithTimeout as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
        if (url.includes('RPT_HKF10_FN_MAININDICATOR')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              version: '1.0',
              success: true,
              result: { pages: 1, data: mockRawData, count: 4 },
              message: '',
              code: 0
            })
          })
        }
        if (url.includes('RPT_HKF10_MAIN_DIVBASIC')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              version: '1.0',
              success: true,
              result: { pages: 1, data: mockDivBasicData, count: 2 },
              message: '',
              code: 0
            })
          })
        }
        if (url.includes('RPT_HKF10_FN_INCOME_PC')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              version: '1.0',
              success: true,
              result: { pages: 1, data: mockIncomePCData, count: 2 },
              message: '',
              code: 0
            })
          })
        }
        return Promise.reject(new Error('Unexpected URL'))
      })

      const result = await fetchHKFinancialIndicators('00700')

      // Should have exactly 3 years (2024, 2023, 2022)
      expect(result.yearlyData.length).toBe(3)

      // 2024 should use the latest (annual) data, not mid-year
      const year2024 = result.yearlyData.find(d => d.year === 2024)
      expect(year2024?.roe).toBe(22.15)  // Annual report ROE
      expect(year2024?.dividendPayoutRatio).toBe(0.30)  // From dividend data
    })

    it('should sort yearly data by year descending', async () => {
      ;(fetchWithTimeout as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
        if (url.includes('RPT_HKF10_FN_MAININDICATOR')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              version: '1.0',
              success: true,
              result: { pages: 1, data: mockRawData, count: 4 },
              message: '',
              code: 0
            })
          })
        }
        if (url.includes('RPT_HKF10_MAIN_DIVBASIC')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              version: '1.0',
              success: true,
              result: { pages: 1, data: mockDivBasicData, count: 2 },
              message: '',
              code: 0
            })
          })
        }
        if (url.includes('RPT_HKF10_FN_INCOME_PC')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              version: '1.0',
              success: true,
              result: { pages: 1, data: mockIncomePCData, count: 2 },
              message: '',
              code: 0
            })
          })
        }
        return Promise.reject(new Error('Unexpected URL'))
      })

      const result = await fetchHKFinancialIndicators('00700')

      expect(result.yearlyData[0].year).toBe(2024)
      expect(result.yearlyData[1].year).toBe(2023)
      expect(result.yearlyData[2].year).toBe(2022)
    })

    it('should handle null values in raw data', async () => {
      const dataWithNulls = [
        {
          SECURITY_CODE: '00700',
          SECURITY_NAME_ABBR: '腾讯控股',
          REPORT_DATE: '2024-12-31 00:00:00',
          ROE_AVG: null,  // null ROE
          ROE_YEARLY: null,
          ROA: null,     // null ROA
          PB_TTM: null   // null PB
        }
      ]

      ;(fetchWithTimeout as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
        if (url.includes('RPT_HKF10_FN_MAININDICATOR')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              version: '1.0',
              success: true,
              result: { pages: 1, data: dataWithNulls, count: 1 },
              message: '',
              code: 0
            })
          })
        }
        if (url.includes('RPT_HKF10_MAIN_DIVBASIC')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              version: '1.0',
              success: true,
              result: { pages: 1, data: [], count: 0 },
              message: '',
              code: 0
            })
          })
        }
        if (url.includes('RPT_HKF10_FN_INCOME_PC')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              version: '1.0',
              success: true,
              result: { pages: 1, data: [], count: 0 },
              message: '',
              code: 0
            })
          })
        }
        return Promise.reject(new Error('Unexpected URL'))
      })

      const result = await fetchHKFinancialIndicators('00700')

      expect(result.current.roe).toBeNull()
      expect(result.current.roa).toBeNull()
      expect(result.current.pb).toBeNull()
      expect(result.current.dividendPayoutRatio).toBeNull()
    })

    it('should return empty structure when no data available', async () => {
      const emptyResponse = {
        version: '1.0',
        success: false,
        result: null,
        message: 'No data',
        code: 0
      }

      ;(fetchWithTimeout as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(emptyResponse)
        })
      })

      const result = await fetchHKFinancialIndicators('99999')

      expect(result.current.roe).toBeNull()
      expect(result.current.roa).toBeNull()
      expect(result.current.pb).toBeNull()
      expect(result.current.dividendPayoutRatio).toBeNull()
      expect(result.current.reportDate).toBe('')
      expect(result.yearlyData).toEqual([])
    })

    it('should use ROE_AVG as the ROE field', async () => {
      const data = [
        {
          SECURITY_CODE: '00700',
          SECURITY_NAME_ABBR: '腾讯控股',
          REPORT_DATE: '2024-12-31 00:00:00',
          ROE_AVG: 22.15,
          ROE_YEARLY: 20.00,  // Different from ROE_AVG
          ROA: 12.34,
          PB_TTM: 3.45
        }
      ]

      ;(fetchWithTimeout as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
        if (url.includes('RPT_HKF10_FN_MAININDICATOR')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              version: '1.0',
              success: true,
              result: { pages: 1, data, count: 1 },
              message: '',
              code: 0
            })
          })
        }
        if (url.includes('RPT_HKF10_MAIN_DIVBASIC')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              version: '1.0',
              success: true,
              result: { pages: 1, data: [], count: 0 },
              message: '',
              code: 0
            })
          })
        }
        if (url.includes('RPT_HKF10_FN_INCOME_PC')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              version: '1.0',
              success: true,
              result: { pages: 1, data: [], count: 0 },
              message: '',
              code: 0
            })
          })
        }
        return Promise.reject(new Error('Unexpected URL'))
      })

      const result = await fetchHKFinancialIndicators('00700')

      // Should use ROE_AVG, not ROE_YEARLY
      expect(result.current.roe).toBe(22.15)
    })

    it('should log debug information', async () => {
      ;(fetchWithTimeout as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
        if (url.includes('RPT_HKF10_FN_MAININDICATOR')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              version: '1.0',
              success: true,
              result: { pages: 1, data: mockRawData, count: 4 },
              message: '',
              code: 0
            })
          })
        }
        if (url.includes('RPT_HKF10_MAIN_DIVBASIC')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              version: '1.0',
              success: true,
              result: { pages: 1, data: mockDivBasicData, count: 2 },
              message: '',
              code: 0
            })
          })
        }
        if (url.includes('RPT_HKF10_FN_INCOME_PC')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              version: '1.0',
              success: true,
              result: { pages: 1, data: mockIncomePCData, count: 2 },
              message: '',
              code: 0
            })
          })
        }
        return Promise.reject(new Error('Unexpected URL'))
      })

      await fetchHKFinancialIndicators('00700')

      expect(logger.debug).toHaveBeenCalledWith(
        'financialIndicatorsHK',
        expect.stringContaining('Fetching main indicators')
      )
      expect(logger.debug).toHaveBeenCalledWith(
        'financialIndicatorsHK',
        expect.stringContaining('current: roe=')
      )
    })
  })

  describe('fetchDivBasic', () => {
    it('should fetch dividend basic data successfully', async () => {
      const mockResponse = {
        version: '1.0',
        success: true,
        result: {
          pages: 1,
          count: 2,
          data: [
            { SECURITY_CODE: '00700', YEAR: 2024, PLAN_EXPLAIN: '每股派港币3.00元', IS_BFP: '0' },
            { SECURITY_CODE: '00700', YEAR: 2023, PLAN_EXPLAIN: '每股派港币2.50元', IS_BFP: '0' },
          ]
        },
        message: '',
        code: 0
      }

      ;(fetchWithTimeout as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await fetchDivBasic('00700')

      expect(result).toEqual(mockResponse.result?.data)
      expect(result.length).toBe(2)
      expect(result[0].PLAN_EXPLAIN).toBe('每股派港币3.00元')
    })

    it('should return empty array when no data', async () => {
      ;(fetchWithTimeout as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          version: '1.0',
          success: false,
          result: null,
          message: 'No data',
          code: 0
        })
      })

      const result = await fetchDivBasic('00700')

      expect(result).toEqual([])
    })
  })

  describe('fetchIncomePC', () => {
    it('should fetch income statement per-share data successfully', async () => {
      const mockResponse = {
        version: '1.0',
        success: true,
        result: {
          pages: 1,
          count: 2,
          data: [
            { SECUCODE: '00700.HK', REPORT_DATE: '2024-12-31', STD_ITEM_CODE: '004027002', STD_ITEM_NAME: '每股基本盈利', AMOUNT: 10.00 },
            { SECUCODE: '00700.HK', REPORT_DATE: '2023-12-31', STD_ITEM_CODE: '004027002', STD_ITEM_NAME: '每股基本盈利', AMOUNT: 9.00 },
          ]
        },
        message: '',
        code: 0
      }

      ;(fetchWithTimeout as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await fetchIncomePC('00700.HK')

      expect(result).toEqual(mockResponse.result?.data)
      expect(result.length).toBe(2)
      expect(result[0].AMOUNT).toBe(10.00)
    })

    it('should return empty array when no data', async () => {
      ;(fetchWithTimeout as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          version: '1.0',
          success: false,
          result: null,
          message: 'No data',
          code: 0
        })
      })

      const result = await fetchIncomePC('00700.HK')

      expect(result).toEqual([])
    })
  })

  describe('fetchHKDividendPayoutData', () => {
    it('should calculate dividend payout ratio correctly', async () => {
      const mockDivBasicResponse = {
        version: '1.0',
        success: true,
        result: {
          pages: 1,
          count: 2,
          data: [
            { SECURITY_CODE: '00700', YEAR: 2024, PLAN_EXPLAIN: '每股派港币3.00元', IS_BFP: '0' },
            { SECURITY_CODE: '00700', YEAR: 2023, PLAN_EXPLAIN: '每股派港币2.50元', IS_BFP: '0' },
          ]
        },
        message: '',
        code: 0
      }

      const mockIncomePCResponse = {
        version: '1.0',
        success: true,
        result: {
          pages: 1,
          count: 2,
          data: [
            { SECUCODE: '00700.HK', REPORT_DATE: '2024-12-31', STD_ITEM_CODE: '004027002', STD_ITEM_NAME: '每股基本盈利', AMOUNT: 10.00 },
            { SECUCODE: '00700.HK', REPORT_DATE: '2023-12-31', STD_ITEM_CODE: '004027002', STD_ITEM_NAME: '每股基本盈利', AMOUNT: 9.00 },
          ]
        },
        message: '',
        code: 0
      }

      ;(fetchWithTimeout as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
        if (url.includes('RPT_HKF10_MAIN_DIVBASIC')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockDivBasicResponse)
          })
        }
        if (url.includes('RPT_HKF10_FN_INCOME_PC')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockIncomePCResponse)
          })
        }
        return Promise.reject(new Error('Unexpected URL'))
      })

      const result = await fetchHKDividendPayoutData('00700')

      expect(result.current.dividendPayoutRatio).toBe(0.30) // 3.00 / 10.00
      expect(result.yearlyData.length).toBe(2)
      expect(result.yearlyData[0].year).toBe(2024)
      expect(result.yearlyData[0].dividendPayoutRatio).toBe(0.30)
      expect(result.yearlyData[1].year).toBe(2023)
      expect(result.yearlyData[1].dividendPayoutRatio).toBeCloseTo(0.278, 2) // 2.50 / 9.00
    })

    it('should handle RMB dividend correctly', async () => {
      const mockDivBasicResponse = {
        version: '1.0',
        success: true,
        result: {
          pages: 1,
          count: 1,
          data: [
            { SECURITY_CODE: '00696', YEAR: 2024, PLAN_EXPLAIN: '每股派人民币0.239元(相当于港币0.26104元)', IS_BFP: '0' },
          ]
        },
        message: '',
        code: 0
      }

      const mockIncomePCResponse = {
        version: '1.0',
        success: true,
        result: {
          pages: 1,
          count: 1,
          data: [
            { SECUCODE: '00696.HK', REPORT_DATE: '2024-12-31', STD_ITEM_CODE: '004027002', STD_ITEM_NAME: '每股基本盈利', AMOUNT: 0.71 },
          ]
        },
        message: '',
        code: 0
      }

      ;(fetchWithTimeout as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
        if (url.includes('RPT_HKF10_MAIN_DIVBASIC')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockDivBasicResponse)
          })
        }
        if (url.includes('RPT_HKF10_FN_INCOME_PC')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockIncomePCResponse)
          })
        }
        return Promise.reject(new Error('Unexpected URL'))
      })

      const result = await fetchHKDividendPayoutData('00696')

      expect(result.current.dividendPayoutRatio).toBeCloseTo(0.337, 2) // 0.239 / 0.71
    })

    it('should return null when no dividend data', async () => {
      ;(fetchWithTimeout as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            version: '1.0',
            success: false,
            result: null,
            message: 'No data',
            code: 0
          })
        })
      })

      const result = await fetchHKDividendPayoutData('00700')

      expect(result.current.dividendPayoutRatio).toBeNull()
      expect(result.yearlyData).toEqual([])
    })

    it('should return null when EPS is negative', async () => {
      const mockDivBasicResponse = {
        version: '1.0',
        success: true,
        result: {
          pages: 1,
          count: 1,
          data: [
            { SECURITY_CODE: '00700', YEAR: 2024, PLAN_EXPLAIN: '每股派港币3.00元', IS_BFP: '0' },
          ]
        },
        message: '',
        code: 0
      }

      const mockIncomePCResponse = {
        version: '1.0',
        success: true,
        result: {
          pages: 1,
          count: 1,
          data: [
            { SECUCODE: '00700.HK', REPORT_DATE: '2024-12-31', STD_ITEM_CODE: '004027002', STD_ITEM_NAME: '每股基本盈利', AMOUNT: -5.00 },
          ]
        },
        message: '',
        code: 0
      }

      ;(fetchWithTimeout as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
        if (url.includes('RPT_HKF10_MAIN_DIVBASIC')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockDivBasicResponse)
          })
        }
        if (url.includes('RPT_HKF10_FN_INCOME_PC')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockIncomePCResponse)
          })
        }
        return Promise.reject(new Error('Unexpected URL'))
      })

      const result = await fetchHKDividendPayoutData('00700')

      expect(result.current.dividendPayoutRatio).toBeNull()
    })

    it('should sum multiple dividends per year', async () => {
      const mockDivBasicResponse = {
        version: '1.0',
        success: true,
        result: {
          pages: 1,
          count: 2,
          data: [
            { SECURITY_CODE: '00001', YEAR: 2024, PLAN_EXPLAIN: '每股派港币1.514元', IS_BFP: '0' }, // Final dividend
            { SECURITY_CODE: '00001', YEAR: 2024, PLAN_EXPLAIN: '每股派港币0.688元', IS_BFP: '0' }, // Interim dividend
          ]
        },
        message: '',
        code: 0
      }

      const mockIncomePCResponse = {
        version: '1.0',
        success: true,
        result: {
          pages: 1,
          count: 1,
          data: [
            { SECUCODE: '00001.HK', REPORT_DATE: '2024-12-31', STD_ITEM_CODE: '004027002', STD_ITEM_NAME: '每股基本盈利', AMOUNT: 4.46 },
          ]
        },
        message: '',
        code: 0
      }

      ;(fetchWithTimeout as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
        if (url.includes('RPT_HKF10_MAIN_DIVBASIC')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockDivBasicResponse)
          })
        }
        if (url.includes('RPT_HKF10_FN_INCOME_PC')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockIncomePCResponse)
          })
        }
        return Promise.reject(new Error('Unexpected URL'))
      })

      const result = await fetchHKDividendPayoutData('00001')

      // Total dividend = 1.514 + 0.688 = 2.202
      // Payout ratio = 2.202 / 4.46 ≈ 0.4937
      expect(result.current.dividendPayoutRatio).toBeCloseTo(0.494, 2)
    })
  })
})
