import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  fetchDupontData,
  fetchDividendPayoutRatio,
  fetchPBFromQuote,
  fetchAllIndicatorsA,
} from '../financialIndicatorsA'

// Helper to create mock fetch response
function createMockResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// Mock the retry module to bypass actual network calls
// This ensures fetchWithTimeout returns proper Response objects
vi.mock('@/utils/retry', () => ({
  withRetry: vi.fn((fn) => fn()),
  fetchWithTimeout: vi.fn().mockImplementation((url: string) => {
    // Default mock - return error response for unexpected URLs
    return Promise.resolve(createMockResponse({ error: 'Not implemented' }, 500))
  }),
}))

// Mock the rate limiter to bypass 500ms delays
vi.mock('@/utils/rateLimiter', () => ({
  financialReportRateLimiter: {
    enqueue: vi.fn((fn: () => Promise<unknown>) => fn()),
    clear: vi.fn(),
  },
}))

describe('financialIndicatorsA', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('fetchDupontData', () => {
    it('should fetch ROE and ROA data successfully', async () => {
      const mockResponse = {
        version: '1.0',
        result: {
          pages: 1,
          data: [
            { REPORT_DATE: '2024-12-31 00:00:00', ROE: 9.9, JROA: 6.59 },
            { REPORT_DATE: '2023-12-31 00:00:00', ROE: 10.5, JROA: 7.1 },
          ],
          count: 2,
        },
        success: true,
        message: 'success',
        code: 0,
      }

      // Mock fetchWithTimeout to return the mock response
      const { fetchWithTimeout } = await import('@/utils/retry')
      ;(fetchWithTimeout as ReturnType<typeof vi.fn>).mockResolvedValueOnce(createMockResponse(mockResponse))

      const result = await fetchDupontData('600519')

      expect(result).toHaveLength(2)
      expect(result[0].roe).toBe(9.9)
      expect(result[0].roa).toBe(6.59)
      expect(result[0].reportDate).toBe('2024-12-31 00:00:00')
      expect(result[1].roe).toBe(10.5)
    })

    it('should handle null ROE/ROA values', async () => {
      const mockResponse = {
        version: '1.0',
        result: {
          pages: 1,
          data: [
            { REPORT_DATE: '2024-12-31 00:00:00', ROE: null, JROA: null },
          ],
          count: 1,
        },
        success: true,
        message: 'success',
        code: 0,
      }

      const { fetchWithTimeout } = await import('@/utils/retry')
      ;(fetchWithTimeout as ReturnType<typeof vi.fn>).mockResolvedValueOnce(createMockResponse(mockResponse))

      const result = await fetchDupontData('600519')

      expect(result).toHaveLength(1)
      expect(result[0].roe).toBeNull()
      expect(result[0].roa).toBeNull()
    })

    it('should return empty array when API returns no data', async () => {
      const mockResponse = {
        version: '1.0',
        result: null,
        success: false,
        message: 'no data',
        code: 0,
      }

      const { fetchWithTimeout } = await import('@/utils/retry')
      ;(fetchWithTimeout as ReturnType<typeof vi.fn>).mockResolvedValueOnce(createMockResponse(mockResponse))

      const result = await fetchDupontData('999999')

      expect(result).toEqual([])
    })

    it('should handle network errors', async () => {
      const { fetchWithTimeout } = await import('@/utils/retry')
      ;(fetchWithTimeout as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network timeout'))

      await expect(fetchDupontData('600519')).rejects.toThrow('Network timeout')
    })
  })

  describe('fetchDividendPayoutRatio', () => {
    it('should fetch dividend payout ratio successfully', async () => {
      const mockResponse = {
        version: '1.0',
        result: {
          pages: 1,
          data: [
            { SECUCODE: '600519.SH', SECURITY_CODE: '600519', SECURITY_NAME_ABBR: '贵州茅台', REPORT_DATE: '2025-12-31', PARENTNETPROFIT: 1000000000, DIVIDEND_PAY_IMPLE: 0.79, DIVIDEND_IMPLE: '10派79元', DIVIDEND_PLAN: '10派79元', DIVIDEND_PAY_PLAN: 0.79 },
          ],
          count: 1,
        },
        success: true,
        message: 'success',
        code: 0,
      }

      const { fetchWithTimeout } = await import('@/utils/retry')
      ;(fetchWithTimeout as ReturnType<typeof vi.fn>).mockResolvedValueOnce(createMockResponse(mockResponse))

      const result = await fetchDividendPayoutRatio('600519')

      expect(result.dividendPayoutRatio).toBe(0.79)
    })

    it('should handle null dividend payout ratio', async () => {
      const mockResponse = {
        version: '1.0',
        result: {
          pages: 1,
          data: [
            { SECUCODE: '600519.SH', SECURITY_CODE: '600519', SECURITY_NAME_ABBR: '贵州茅台', REPORT_DATE: '2025-12-31', PARENTNETPROFIT: 1000000000, DIVIDEND_PAY_IMPLE: null, DIVIDEND_IMPLE: null, DIVIDEND_PLAN: null, DIVIDEND_PAY_PLAN: null },
          ],
          count: 1,
        },
        success: true,
        message: 'success',
        code: 0,
      }

      const { fetchWithTimeout } = await import('@/utils/retry')
      ;(fetchWithTimeout as ReturnType<typeof vi.fn>).mockResolvedValueOnce(createMockResponse(mockResponse))

      const result = await fetchDividendPayoutRatio('600519')

      expect(result.dividendPayoutRatio).toBeNull()
    })

    it('should return null values when API returns no data', async () => {
      const mockResponse = {
        version: '1.0',
        result: {
          pages: 1,
          data: [],
          count: 0,
        },
        success: true,
        message: 'success',
        code: 0,
      }

      const { fetchWithTimeout } = await import('@/utils/retry')
      ;(fetchWithTimeout as ReturnType<typeof vi.fn>).mockResolvedValueOnce(createMockResponse(mockResponse))

      const result = await fetchDividendPayoutRatio('999999')

      expect(result.dividendPayoutRatio).toBeNull()
    })

    it('should handle network errors', async () => {
      const { fetchWithTimeout } = await import('@/utils/retry')
      ;(fetchWithTimeout as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network timeout'))

      await expect(fetchDividendPayoutRatio('600519')).rejects.toThrow('Network timeout')
    })
  })

  describe('fetchPBFromQuote', () => {
    it('should fetch PB ratio successfully', async () => {
      const mockResponse = {
        rc: 0,
        rt: 4,
        svr: 1,
        lt: 1,
        d: 1,
        data: { f57: '600519', f58: '贵州茅台', f167: 6.74 },
      }

      const { fetchWithTimeout } = await import('@/utils/retry')
      ;(fetchWithTimeout as ReturnType<typeof vi.fn>).mockResolvedValue(createMockResponse(mockResponse))

      const result = await fetchPBFromQuote('600519')

      expect(result).toBe(0.0674)
    })

    it('should handle null PB value', async () => {
      const mockResponse = {
        rc: 0,
        rt: 4,
        svr: 1,
        lt: 1,
        d: 1,
        data: { f57: '600519', f58: '贵州茅台', f167: null },
      }

      const { fetchWithTimeout } = await import('@/utils/retry')
      ;(fetchWithTimeout as ReturnType<typeof vi.fn>).mockResolvedValue(createMockResponse(mockResponse))

      const result = await fetchPBFromQuote('600519')

      expect(result).toBeNull()
    })

    it('should return null when data is empty', async () => {
      const mockResponse = {
        rc: 0,
        rt: 4,
        svr: 1,
        lt: 1,
        d: 1,
        data: null,
      }

      const { fetchWithTimeout } = await import('@/utils/retry')
      ;(fetchWithTimeout as ReturnType<typeof vi.fn>).mockResolvedValue(createMockResponse(mockResponse))

      const result = await fetchPBFromQuote('999999')

      expect(result).toBeNull()
    })

    it('should handle network errors', async () => {
      const { fetchWithTimeout } = await import('@/utils/retry')
      ;(fetchWithTimeout as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network timeout'))

      // fetchPBFromQuote returns null on error (to allow partial results)
      const result = await fetchPBFromQuote('600519')
      expect(result).toBeNull()
    })
  })

  describe('fetchAllIndicatorsA', () => {
    it('should fetch all indicators successfully', async () => {
      const { fetchWithTimeout } = await import('@/utils/retry')
      const mockDupontResponse = {
        version: '1.0',
        result: {
          pages: 1,
          data: [{ REPORT_DATE: '2024-12-31 00:00:00', ROE: 9.9, JROA: 6.59 }],
          count: 1,
        },
        success: true,
        message: 'success',
        code: 0,
      }
      const mockDividendResponse = {
        version: '1.0',
        result: {
          pages: 1,
          data: [{ SECUCODE: '600519.SH', SECURITY_CODE: '600519', SECURITY_NAME_ABBR: '贵州茅台', REPORT_DATE: '2025-12-31', PARENTNETPROFIT: 1000000000, DIVIDEND_PAY_IMPLE: 0.79, DIVIDEND_IMPLE: '10派79元', DIVIDEND_PLAN: '10派79元', DIVIDEND_PAY_PLAN: 0.79 }],
          count: 1,
        },
        success: true,
        message: 'success',
        code: 0,
      }
      const mockQuoteResponse = {
        rc: 0,
        rt: 4,
        svr: 1,
        lt: 1,
        d: 1,
        data: { f57: '600519', f58: '贵州茅台', f167: 6.74 },
      }

      // Mock fetchWithTimeout to return different responses based on URL
      ;(fetchWithTimeout as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
        if (url.includes('RPT_F10_FINANCE_DUPONT')) {
          return Promise.resolve(createMockResponse(mockDupontResponse))
        }
        if (url.includes('RPT_F10_DIVIDEND_HISTOGRAM')) {
          return Promise.resolve(createMockResponse(mockDividendResponse))
        }
        if (url.includes('push2.eastmoney.com')) {
          return Promise.resolve(createMockResponse(mockQuoteResponse))
        }
        return Promise.reject(new Error('Unexpected URL'))
      })

      const result = await fetchAllIndicatorsA('600519')

      expect(result.roeData).toHaveLength(1)
      expect(result.roeData[0].roe).toBe(9.9)
      expect(result.roaData).toHaveLength(1)
      expect(result.roaData[0].roa).toBe(6.59)
      expect(result.pb).toBe(0.0674)
      expect(result.dividendPayoutRatio).toBe(0.79)
      expect(result.errors).toHaveLength(0)
    })

    it('should return partial results when one API fails', async () => {
      const { fetchWithTimeout } = await import('@/utils/retry')
      const mockDupontResponse = {
        version: '1.0',
        result: {
          pages: 1,
          data: [{ REPORT_DATE: '2024-12-31 00:00:00', ROE: 9.9, JROA: 6.59 }],
          count: 1,
        },
        success: true,
        message: 'success',
        code: 0,
      }
      const mockQuoteResponse = {
        rc: 0,
        rt: 4,
        svr: 1,
        lt: 1,
        d: 1,
        data: { f57: '600519', f58: '贵州茅台', f167: 6.74 },
      }

      ;(fetchWithTimeout as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
        if (url.includes('RPT_F10_FINANCE_DUPONT')) {
          return Promise.resolve(createMockResponse(mockDupontResponse))
        }
        if (url.includes('RPT_F10_DIVIDEND_HISTOGRAM')) {
          // Return 500 error for dividend API
          return Promise.resolve(createMockResponse({}, 500))
        }
        if (url.includes('push2.eastmoney.com')) {
          return Promise.resolve(createMockResponse(mockQuoteResponse))
        }
        return Promise.reject(new Error('Unexpected URL'))
      })

      const result = await fetchAllIndicatorsA('600519')

      expect(result.roeData).toHaveLength(1)
      expect(result.roeData[0].roe).toBe(9.9)
      expect(result.pb).toBe(0.0674)
      expect(result.dividendPayoutRatio).toBeNull()
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain('Dividend fetch failed')
    })

    it('should return partial results when multiple APIs fail', async () => {
      const { fetchWithTimeout } = await import('@/utils/retry')
      const mockDupontResponse = {
        version: '1.0',
        result: {
          pages: 1,
          data: [{ REPORT_DATE: '2024-12-31 00:00:00', ROE: 9.9, JROA: 6.59 }],
          count: 1,
        },
        success: true,
        message: 'success',
        code: 0,
      }

      ;(fetchWithTimeout as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
        if (url.includes('RPT_F10_FINANCE_DUPONT')) {
          return Promise.resolve(createMockResponse(mockDupontResponse))
        }
        if (url.includes('RPT_F10_DIVIDEND_HISTOGRAM')) {
          return Promise.resolve(createMockResponse({}, 500))
        }
        if (url.includes('push2.eastmoney.com')) {
          return Promise.resolve(createMockResponse({}, 500))
        }
        return Promise.reject(new Error('Unexpected URL'))
      })

      const result = await fetchAllIndicatorsA('600519')

      expect(result.roeData).toHaveLength(1)
      expect(result.roaData).toHaveLength(1)
      expect(result.pb).toBeNull()
      expect(result.dividendPayoutRatio).toBeNull()
      // PB returns null on error (doesn't throw), so only 1 error (Dividend)
      expect(result.errors).toHaveLength(1)
    })

    it('should return empty arrays when all APIs fail', async () => {
      const { fetchWithTimeout } = await import('@/utils/retry')

      ;(fetchWithTimeout as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
        if (url.includes('RPT_F10_FINANCE_DUPONT')) {
          return Promise.resolve(createMockResponse({}, 500))
        }
        if (url.includes('RPT_F10_DIVIDEND_HISTOGRAM')) {
          return Promise.resolve(createMockResponse({}, 500))
        }
        if (url.includes('push2.eastmoney.com')) {
          return Promise.resolve(createMockResponse({}, 500))
        }
        return Promise.reject(new Error('Unexpected URL'))
      })

      const result = await fetchAllIndicatorsA('600519')

      expect(result.roeData).toEqual([])
      expect(result.roaData).toEqual([])
      expect(result.pb).toBeNull()
      expect(result.dividendPayoutRatio).toBeNull()
      // PB returns null on error (doesn't throw), so only 2 errors (Dupont and Dividend)
      expect(result.errors).toHaveLength(2)
    })

    it('should filter out null ROE/ROA values from results', async () => {
      const { fetchWithTimeout } = await import('@/utils/retry')
      const mockDupontResponse = {
        version: '1.0',
        result: {
          pages: 1,
          data: [
            { REPORT_DATE: '2024-12-31 00:00:00', ROE: null, JROA: 6.59 },
            { REPORT_DATE: '2023-12-31 00:00:00', ROE: 9.9, JROA: null },
            { REPORT_DATE: '2022-12-31 00:00:00', ROE: 10.5, JROA: 7.1 },
          ],
          count: 3,
        },
        success: true,
        message: 'success',
        code: 0,
      }
      const mockDividendResponse = {
        version: '1.0',
        result: {
          pages: 1,
          data: [{ SECUCODE: '600519.SH', SECURITY_CODE: '600519', SECURITY_NAME_ABBR: '贵州茅台', REPORT_DATE: '2025-12-31', PARENTNETPROFIT: 1000000000, DIVIDEND_PAY_IMPLE: 0.79, DIVIDEND_IMPLE: '10派79元', DIVIDEND_PLAN: '10派79元', DIVIDEND_PAY_PLAN: 0.79 }],
          count: 1,
        },
        success: true,
        message: 'success',
        code: 0,
      }
      const mockQuoteResponse = {
        rc: 0,
        rt: 4,
        svr: 1,
        lt: 1,
        d: 1,
        data: { f57: '600519', f58: '贵州茅台', f167: 6.74 },
      }

      ;(fetchWithTimeout as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
        if (url.includes('RPT_F10_FINANCE_DUPONT')) {
          return Promise.resolve(createMockResponse(mockDupontResponse))
        }
        if (url.includes('RPT_F10_DIVIDEND_HISTOGRAM')) {
          return Promise.resolve(createMockResponse(mockDividendResponse))
        }
        if (url.includes('push2.eastmoney.com')) {
          return Promise.resolve(createMockResponse(mockQuoteResponse))
        }
        return Promise.reject(new Error('Unexpected URL'))
      })

      const result = await fetchAllIndicatorsA('600519')

      // ROE filtered: only 2023 and 2022 have non-null ROE
      expect(result.roeData).toHaveLength(2)
      expect(result.roeData[0].roe).toBe(9.9)
      expect(result.roeData[1].roe).toBe(10.5)

      // ROA filtered: only 2024 and 2022 have non-null ROA
      expect(result.roaData).toHaveLength(2)
      expect(result.roaData[0].roa).toBe(6.59)
      expect(result.roaData[1].roa).toBe(7.1)
    })

    it('should handle PB returning null gracefully', async () => {
      const { fetchWithTimeout } = await import('@/utils/retry')
      const mockDupontResponse = {
        version: '1.0',
        result: {
          pages: 1,
          data: [{ REPORT_DATE: '2024-12-31 00:00:00', ROE: 9.9, JROA: 6.59 }],
          count: 1,
        },
        success: true,
        message: 'success',
        code: 0,
      }
      const mockDividendResponse = {
        version: '1.0',
        result: {
          pages: 1,
          data: [{ SECUCODE: '600519.SH', SECURITY_CODE: '600519', SECURITY_NAME_ABBR: '贵州茅台', REPORT_DATE: '2025-12-31', PARENTNETPROFIT: 1000000000, DIVIDEND_PAY_IMPLE: 0.79, DIVIDEND_IMPLE: '10派79元', DIVIDEND_PLAN: '10派79元', DIVIDEND_PAY_PLAN: 0.79 }],
          count: 1,
        },
        success: true,
        message: 'success',
        code: 0,
      }
      const mockQuoteResponse = {
        rc: 0,
        rt: 4,
        svr: 1,
        lt: 1,
        d: 1,
        data: { f57: '600519', f58: '贵州茅台', f167: null },
      }

      ;(fetchWithTimeout as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
        if (url.includes('RPT_F10_FINANCE_DUPONT')) {
          return Promise.resolve(createMockResponse(mockDupontResponse))
        }
        if (url.includes('RPT_F10_DIVIDEND_HISTOGRAM')) {
          return Promise.resolve(createMockResponse(mockDividendResponse))
        }
        if (url.includes('push2.eastmoney.com')) {
          return Promise.resolve(createMockResponse(mockQuoteResponse))
        }
        return Promise.reject(new Error('Unexpected URL'))
      })

      const result = await fetchAllIndicatorsA('600519')

      expect(result.pb).toBeNull()
      expect(result.roeData).toHaveLength(1)
      expect(result.dividendPayoutRatio).toBe(0.79)
      expect(result.errors).toHaveLength(0)
    })
  })
})