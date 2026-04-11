import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchExchangeRates, getExchangeRate } from '../exchangeRate'
import { withRetry, fetchWithTimeout, HttpError } from '@/utils/retry'
import { validateApiResponse } from '@/utils/validateApiResponse'
import { logger } from '@/utils/logger'

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

describe('Exchange Rate API', () => {
  const CACHE_KEY = 'exchangeRates_HKD'
  const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

  let mockLocalStorage: {
    getItem: ReturnType<typeof vi.fn>
    setItem: ReturnType<typeof vi.fn>
    removeItem: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    vi.clearAllMocks()

    mockLocalStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn()
    }

    vi.stubGlobal('localStorage', mockLocalStorage)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  describe('fetchExchangeRates', () => {
    it('should return cached rates when cache is valid', async () => {
      const cachedData = {
        rates: { USD: 7.8, HKD: 1.0, CNY: 1.05 },
        source: 'api' as const,
        lastUpdate: Date.now() - 1000 // 1 second ago
      }
      mockLocalStorage.getItem.mockReturnValueOnce(JSON.stringify(cachedData))

      const result = await fetchExchangeRates()

      expect(result.rates).toEqual(cachedData.rates)
      expect(result.source).toBe('api')
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith(CACHE_KEY)
    })

    it('should fetch from API when cache is empty', async () => {
      mockLocalStorage.getItem.mockReturnValueOnce(null)

      const apiResponse = {
        result: 'success',
        rates: {
          USD: 7.85,
          CNY: 1.12
        }
      }

      ;(fetchWithTimeout as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(apiResponse)
      })

      const result = await fetchExchangeRates()

      expect(result.rates).toEqual({
        HKD: 1.0,
        USD: 7.85,
        CNY: 1.12
      })
      expect(result.source).toBe('api')
      expect(mockLocalStorage.setItem).toHaveBeenCalled()
    })

    it('should use fallback rates when API returns non-success result', async () => {
      mockLocalStorage.getItem.mockReturnValueOnce(null)

      const apiResponse = {
        result: 'error',
        rates: {}
      }

      ;(fetchWithTimeout as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(apiResponse)
      })

      const result = await fetchExchangeRates()

      expect(result.rates).toEqual({
        USD: 7.75,
        HKD: 1.0,
        CNY: 1.10
      })
      expect(result.source).toBe('fallback')
    })

    it('should use fallback rates when HTTP error occurs', async () => {
      mockLocalStorage.getItem.mockReturnValueOnce(null)

      ;(fetchWithTimeout as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new HttpError('HTTP 500', 500)
      )

      const result = await fetchExchangeRates()

      expect(result.rates).toEqual({
        USD: 7.75,
        HKD: 1.0,
        CNY: 1.10
      })
      expect(result.source).toBe('fallback')
      expect(logger.error).toHaveBeenCalled()
    })

    it('should use fallback rates when network error occurs', async () => {
      mockLocalStorage.getItem.mockReturnValueOnce(null)

      ;(fetchWithTimeout as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Network error')
      )

      const result = await fetchExchangeRates()

      expect(result.rates).toEqual({
        USD: 7.75,
        HKD: 1.0,
        CNY: 1.10
      })
      expect(result.source).toBe('fallback')
    })

    it('should use fallback rates when rates are missing in response', async () => {
      mockLocalStorage.getItem.mockReturnValueOnce(null)

      const apiResponse = {
        result: 'success',
        rates: {} // Missing USD and CNY
      }

      ;(fetchWithTimeout as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(apiResponse)
      })

      const result = await fetchExchangeRates()

      expect(result.rates).toEqual({
        HKD: 1.0,
        USD: 7.75, // fallback
        CNY: 1.10  // fallback
      })
      expect(result.source).toBe('api')
    })

    it('should call validateApiResponse before returning', async () => {
      mockLocalStorage.getItem.mockReturnValueOnce(null)

      const apiResponse = {
        result: 'success',
        rates: {
          USD: 7.85,
          CNY: 1.12
        }
      }

      ;(fetchWithTimeout as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(apiResponse)
      })

      await fetchExchangeRates()

      expect(validateApiResponse).toHaveBeenCalled()
    })

    it('should not call localStorage.setItem when using cache', async () => {
      const cachedData = {
        rates: { USD: 7.8, HKD: 1.0, CNY: 1.05 },
        source: 'api' as const,
        lastUpdate: Date.now() - 1000
      }
      mockLocalStorage.getItem.mockReturnValueOnce(JSON.stringify(cachedData))

      await fetchExchangeRates()

      expect(mockLocalStorage.setItem).not.toHaveBeenCalled()
    })
  })

  describe('getCachedRates', () => {
    it('should return null when localStorage returns null', async () => {
      mockLocalStorage.getItem.mockReturnValueOnce(null)

      const apiResponse = {
        result: 'success',
        rates: { USD: 7.85, CNY: 1.12 }
      }

      ;(fetchWithTimeout as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(apiResponse)
      })

      // Call through fetchExchangeRates to test getCachedRates
      const result = await fetchExchangeRates()

      // Should still get API data since cache was empty
      expect(result.source).toBe('api')
    })

    it('should return null and remove item when cache is expired', async () => {
      const expiredData = {
        rates: { USD: 7.8, HKD: 1.0, CNY: 1.05 },
        source: 'api' as const,
        lastUpdate: Date.now() - (CACHE_DURATION + 1000) // 24 hours + 1 second ago
      }
      mockLocalStorage.getItem.mockReturnValueOnce(JSON.stringify(expiredData))

      const apiResponse = {
        result: 'success',
        rates: { USD: 7.85, CNY: 1.12 }
      }

      ;(fetchWithTimeout as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(apiResponse)
      })

      const result = await fetchExchangeRates()

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(CACHE_KEY)
      expect(result.source).toBe('api') // Fetched from API, not cache
    })

    it('should return null when JSON.parse fails', async () => {
      mockLocalStorage.getItem.mockReturnValueOnce('invalid json{')

      const apiResponse = {
        result: 'success',
        rates: { USD: 7.85, CNY: 1.12 }
      }

      ;(fetchWithTimeout as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(apiResponse)
      })

      const result = await fetchExchangeRates()

      // Should fall back to API
      expect(result.source).toBe('api')
    })

    it('should return cached data when cache is valid', async () => {
      const validCache = {
        rates: { USD: 7.8, HKD: 1.0, CNY: 1.05 },
        source: 'api' as const,
        lastUpdate: Date.now()
      }
      mockLocalStorage.getItem.mockReturnValueOnce(JSON.stringify(validCache))

      const result = await fetchExchangeRates()

      expect(result.rates).toEqual(validCache.rates)
      expect(result.source).toBe('api')
    })
  })

  describe('setCachedRates', () => {
    it('should store rates in localStorage on success', async () => {
      mockLocalStorage.getItem.mockReturnValueOnce(null)

      const apiResponse = {
        result: 'success',
        rates: { USD: 7.85, CNY: 1.12 }
      }

      ;(fetchWithTimeout as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(apiResponse)
      })

      await fetchExchangeRates()

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        CACHE_KEY,
        expect.stringContaining('"rates"')
      )
    })

    it('should not throw when localStorage.setItem fails with quota exceeded', async () => {
      const apiResponse = {
        result: 'success',
        rates: { USD: 7.85, CNY: 1.12 }
      }

      // Set up setItem to fail BEFORE setting up getItem to return null
      // This ensures the mock is ready when setCachedRates is called
      mockLocalStorage.setItem.mockRejectedValueOnce(new Error('QuotaExceededError'))
      mockLocalStorage.getItem.mockReturnValueOnce(null)

      ;(fetchWithTimeout as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(apiResponse)
      })

      // Should not throw - the error is caught internally
      let threw = false
      let result: Awaited<ReturnType<typeof fetchExchangeRates>> | undefined
      try {
        result = await fetchExchangeRates()
      } catch {
        threw = true
      }

      expect(threw).toBe(false)
      expect(result?.rates.USD).toBe(7.85)
    })
  })

  describe('getExchangeRate', () => {
    const rates: Record<string, number> = {
      USD: 7.85,
      HKD: 1.0,
      CNY: 1.12
    }

    it('should return 1 when from and to are the same currency', () => {
      expect(getExchangeRate('USD', 'USD', rates)).toBe(1)
      expect(getExchangeRate('HKD', 'HKD', rates)).toBe(1)
      expect(getExchangeRate('CNY', 'CNY', rates)).toBe(1)
    })

    it('should calculate HKD to USD correctly', () => {
      // HKD to USD = 1 / (rates.USD) = 1 / 7.85
      const result = getExchangeRate('HKD', 'USD', rates)
      expect(result).toBeCloseTo(1 / 7.85, 5)
    })

    it('should calculate USD to HKD correctly', () => {
      // USD to HKD = rates.USD = 7.85
      const result = getExchangeRate('USD', 'HKD', rates)
      expect(result).toBe(7.85)
    })

    it('should calculate HKD to CNY correctly', () => {
      // HKD to CNY = 1 / (rates.CNY) = 1 / 1.12
      const result = getExchangeRate('HKD', 'CNY', rates)
      expect(result).toBeCloseTo(1 / 1.12, 5)
    })

    it('should calculate CNY to HKD correctly', () => {
      // CNY to HKD = rates.CNY = 1.12
      const result = getExchangeRate('CNY', 'HKD', rates)
      expect(result).toBe(1.12)
    })

    it('should calculate cross-currency rate (USD to CNY)', () => {
      // USD to CNY = (rates.USD) / (rates.CNY) = 7.85 / 1.12
      const result = getExchangeRate('USD', 'CNY', rates)
      expect(result).toBeCloseTo(7.85 / 1.12, 5)
    })

    it('should calculate cross-currency rate (CNY to USD)', () => {
      // CNY to USD = (rates.CNY) / (rates.USD) = 1.12 / 7.85
      const result = getExchangeRate('CNY', 'USD', rates)
      expect(result).toBeCloseTo(1.12 / 7.85, 5)
    })

    it('should return 1 for unknown to currency when from is HKD', () => {
      // HKD to unknown = 1 / (rates.unknown || 1) = 1 / 1 = 1
      const result = getExchangeRate('HKD', 'EUR', rates)
      expect(result).toBe(1)
    })

    it('should return 1 for unknown from currency when to is HKD', () => {
      // unknown to HKD = rates.unknown || 1 = 1
      const result = getExchangeRate('EUR', 'HKD', rates)
      expect(result).toBe(1)
    })

    it('should handle empty rates object', () => {
      const emptyRates: Record<string, number> = {}
      expect(getExchangeRate('HKD', 'USD', emptyRates)).toBe(1)
      expect(getExchangeRate('USD', 'HKD', emptyRates)).toBe(1)
      expect(getExchangeRate('USD', 'CNY', emptyRates)).toBeCloseTo(1, 5)
    })
  })
})
