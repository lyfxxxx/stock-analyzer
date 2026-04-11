import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { HttpError, fetchWithTimeout, withRetry } from '../retry'
import { ZodError } from 'zod'

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn()
  }
}))

describe('retry utils', () => {
  describe('HttpError', () => {
    it('should create error with message, status and response', () => {
      const response = {} as Response
      const error = new HttpError('Not Found', 404, response)

      expect(error.message).toBe('Not Found')
      expect(error.status).toBe(404)
      expect(error.response).toBe(response)
      expect(error.name).toBe('HttpError')
    })

    it('should create error without response', () => {
      const error = new HttpError('Server Error', 500)

      expect(error.message).toBe('Server Error')
      expect(error.status).toBe(500)
      expect(error.response).toBeUndefined()
    })

    it('should be instance of Error', () => {
      const error = new HttpError('Test', 400)
      expect(error).toBeInstanceOf(Error)
    })

    it('should be catchable', () => {
      try {
        throw new HttpError('Catch me', 400)
      } catch (e) {
        expect(e).toBeInstanceOf(HttpError)
      }
    })
  })

  describe('fetchWithTimeout', () => {
    const mockFetch = vi.fn()

    beforeEach(() => {
      vi.stubGlobal('fetch', mockFetch)
    })

    afterEach(() => {
      vi.restoreAllMocks()
      vi.unstubAllGlobals()
    })

    it('should return response on successful fetch', async () => {
      const mockResponse = { ok: true } as Response
      mockFetch.mockResolvedValueOnce(mockResponse)

      const result = await fetchWithTimeout('https://example.com')

      expect(result).toBe(mockResponse)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      )
    })

    it('should pass options to fetch', async () => {
      const mockResponse = { ok: true } as Response
      mockFetch.mockResolvedValueOnce(mockResponse)

      const options: RequestInit = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true })
      }

      await fetchWithTimeout('https://example.com', options, 5000)

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({
          ...options,
          signal: expect.any(AbortSignal)
        })
      )
    })

    it('should use default timeout when not specified', async () => {
      const mockResponse = { ok: true } as Response
      mockFetch.mockResolvedValueOnce(mockResponse)

      await fetchWithTimeout('https://example.com')

      // Default timeout is 15000ms, verify fetch was called
      expect(mockFetch).toHaveBeenCalled()
    })

    it('should timeout and abort request', async () => {
      // Mock fetch that never resolves and listens for abort signal
      mockFetch.mockImplementationOnce((_url: string, options: RequestInit) =>
        new Promise((_resolve, reject) => {
          const signal = options.signal as AbortSignal | undefined
          if (signal) {
            signal.addEventListener('abort', () => {
              const err = new DOMException('The operation was aborted', 'AbortError')
              reject(err)
            })
          }
          // Never resolves on its own - will be aborted by timeout
        })
      )

      // Use a very short timeout (10ms)
      const timeoutPromise = fetchWithTimeout('https://example.com', {}, 10)

      // The promise should reject due to abort after timeout
      try {
        await timeoutPromise
        expect.unreachable('Expected fetchWithTimeout to reject on timeout')
      } catch (e: unknown) {
        // DOMException has name 'AbortError' in jsdom
        const err = e as { name?: string; message?: string }
        expect(
          err.name === 'AbortError' || (err.message?.includes('aborted') ?? false) || (err.message?.includes('Abort') ?? false)
        ).toBe(true)
      }
    })

    it('should clean up timeout on successful response', async () => {
      vi.useFakeTimers()

      const mockResponse = { ok: true } as Response
      mockFetch.mockResolvedValueOnce(mockResponse)

      const fetchPromise = fetchWithTimeout('https://example.com', {}, 10000)

      // Fast-forward time
      await vi.runAllTimersAsync()

      const result = await fetchPromise
      expect(result).toBe(mockResponse)

      vi.useRealTimers()
    })

    it('should clean up timeout on error response', async () => {
      vi.useFakeTimers()

      const mockResponse = { ok: false, status: 500 } as Response
      mockFetch.mockResolvedValueOnce(mockResponse)

      const fetchPromise = fetchWithTimeout('https://example.com', {}, 10000)

      await vi.runAllTimersAsync()

      const result = await fetchPromise
      expect(result).toBe(mockResponse)

      vi.useRealTimers()
    })
  })

  describe('withRetry', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    describe('success scenarios', () => {
      it('should return result on first call success', async () => {
        const mockFn = vi.fn().mockResolvedValueOnce('success')

        const result = await withRetry(mockFn)

        expect(result).toBe('success')
        expect(mockFn).toHaveBeenCalledTimes(1)
      })

      it('should handle async function success', async () => {
        const mockFn = vi.fn().mockResolvedValueOnce('async success')

        const result = await withRetry(mockFn)

        expect(result).toBe('async success')
      })
    })

    describe('error scenarios - non-retryable', () => {
      // Note: In test mode (VITEST=true), retries are disabled (maxRetries=0)
      // So all errors are thrown immediately without retry attempts

      it('should throw ZodError immediately', async () => {
        const zodError = new ZodError([])
        const mockFn = vi.fn().mockRejectedValueOnce(zodError)

        await expect(withRetry(mockFn)).rejects.toThrow()
        expect(mockFn).toHaveBeenCalledTimes(1)
      })

      it('should throw 400 error immediately', async () => {
        const error = new HttpError('Bad Request', 400)
        const mockFn = vi.fn().mockRejectedValueOnce(error)

        await expect(withRetry(mockFn)).rejects.toThrow('Bad Request')
        expect(mockFn).toHaveBeenCalledTimes(1)
      })

      it('should throw 401 error immediately', async () => {
        const error = new HttpError('Unauthorized', 401)
        const mockFn = vi.fn().mockRejectedValueOnce(error)

        await expect(withRetry(mockFn)).rejects.toThrow('Unauthorized')
        expect(mockFn).toHaveBeenCalledTimes(1)
      })

      it('should throw 403 error immediately', async () => {
        const error = new HttpError('Forbidden', 403)
        const mockFn = vi.fn().mockRejectedValueOnce(error)

        await expect(withRetry(mockFn)).rejects.toThrow('Forbidden')
        expect(mockFn).toHaveBeenCalledTimes(1)
      })

      it('should throw 404 error immediately', async () => {
        const error = new HttpError('Not Found', 404)
        const mockFn = vi.fn().mockRejectedValueOnce(error)

        await expect(withRetry(mockFn)).rejects.toThrow('Not Found')
        expect(mockFn).toHaveBeenCalledTimes(1)
      })

      it('should throw string error', async () => {
        const mockFn = vi.fn().mockRejectedValueOnce('string error')

        await expect(withRetry(mockFn)).rejects.toThrow('string error')
      })

      it('should throw Error object', async () => {
        const mockFn = vi.fn().mockRejectedValueOnce(new Error('test error'))

        await expect(withRetry(mockFn)).rejects.toThrow('test error')
      })
    })

    describe('error scenarios - retryable but skipped in test mode', () => {
      // In test mode, transient errors are still classified correctly
      // but no retry happens because effectiveMaxRetries=0

      it('should throw 429 immediately in test mode (no retry)', async () => {
        const error = new HttpError('Rate limited', 429)
        const mockFn = vi.fn().mockRejectedValueOnce(error)

        await expect(withRetry(mockFn)).rejects.toThrow('Rate limited')
        expect(mockFn).toHaveBeenCalledTimes(1)
      })

      it('should throw 500 immediately in test mode (no retry)', async () => {
        const error = new HttpError('Server Error', 500)
        const mockFn = vi.fn().mockRejectedValueOnce(error)

        await expect(withRetry(mockFn)).rejects.toThrow('Server Error')
        expect(mockFn).toHaveBeenCalledTimes(1)
      })

      it('should throw 502 immediately in test mode (no retry)', async () => {
        const error = new HttpError('Bad Gateway', 502)
        const mockFn = vi.fn().mockRejectedValueOnce(error)

        await expect(withRetry(mockFn)).rejects.toThrow('Bad Gateway')
        expect(mockFn).toHaveBeenCalledTimes(1)
      })

      it('should throw network error immediately in test mode', async () => {
        const error = new Error('network error')
        const mockFn = vi.fn().mockRejectedValueOnce(error)

        await expect(withRetry(mockFn)).rejects.toThrow('network error')
      })

      it('should throw timeout error immediately in test mode', async () => {
        const error = new Error('timeout error')
        const mockFn = vi.fn().mockRejectedValueOnce(error)

        await expect(withRetry(mockFn)).rejects.toThrow('timeout error')
      })

      it('should throw abort error immediately in test mode', async () => {
        const error = new Error('abort error')
        const mockFn = vi.fn().mockRejectedValueOnce(error)

        await expect(withRetry(mockFn)).rejects.toThrow('abort error')
      })

      it('should throw fetch error immediately in test mode', async () => {
        const error = new Error('fetch failed')
        const mockFn = vi.fn().mockRejectedValueOnce(error)

        await expect(withRetry(mockFn)).rejects.toThrow('fetch failed')
      })

      it('should throw connection error immediately in test mode', async () => {
        const error = new Error('connection refused')
        const mockFn = vi.fn().mockRejectedValueOnce(error)

        await expect(withRetry(mockFn)).rejects.toThrow('connection refused')
      })

      it('should throw load failed error immediately in test mode', async () => {
        const error = new Error('Load failed')
        const mockFn = vi.fn().mockRejectedValueOnce(error)

        await expect(withRetry(mockFn)).rejects.toThrow('Load failed')
      })

      it('should throw unknown error by default', async () => {
        const error = { unknown: 'error' }
        const mockFn = vi.fn().mockRejectedValueOnce(error)

        await expect(withRetry(mockFn)).rejects.toThrow()
      })
    })

    describe('custom retry options', () => {
      it('should use default options when not provided', async () => {
        const mockFn = vi.fn().mockResolvedValueOnce('success')

        await withRetry(mockFn)

        expect(mockFn).toHaveBeenCalledTimes(1)
      })

      it('should accept all custom options without error', async () => {
        const mockFn = vi.fn().mockResolvedValueOnce('success')

        const result = await withRetry(mockFn, {
          maxRetries: 5,
          baseDelay: 2000,
          maxDelay: 60000,
          timeout: 30000
        })

        expect(result).toBe('success')
      })
    })
  })
})
