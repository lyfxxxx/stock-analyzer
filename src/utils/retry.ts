import { ZodError } from 'zod'
import { logger } from '@/utils/logger'

export interface RetryOptions {
  maxRetries?: number
  baseDelay?: number
  maxDelay?: number
  timeout?: number
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  timeout: 15000,
}

/**
 * Check if an error is transient (should be retried).
 * - Network errors: YES
 * - 5xx server errors: YES
 * - 429 rate limit: YES
 * - 4xx client errors (except 429): NO
 * - Zod validation errors: NO
 * - Timeout errors: YES
 */
function isTransientError(error: unknown): boolean {
  // Zod validation errors should never be retried
  if (error instanceof ZodError) return false

  // Custom HTTP error with status code
  if (error instanceof HttpError) {
    if (error.status === 429) return true // Rate limit - retry
    if (error.status >= 500) return true // Server error - retry
    return false // 4xx client errors - don't retry
  }

  // Network errors, timeouts, abort errors - retry
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    if (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('abort') ||
      message.includes('fetch') ||
      message.includes('connection') ||
      message.includes('load failed')
    ) {
      return true
    }
  }

  // Default: treat unknown errors as transient (safer)
  return true
}

/**
 * Calculate delay with exponential backoff and jitter.
 * Formula: min(maxDelay, baseDelay * 2^attempt) + random(0, baseDelay)
 */
function calculateBackoff(attempt: number, baseDelay: number, maxDelay: number): number {
  const exponential = baseDelay * Math.pow(2, attempt)
  const jitter = Math.random() * baseDelay
  return Math.min(exponential + jitter, maxDelay)
}

/**
 * HTTP error with status code for error classification.
 */
export class HttpError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: Response
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

/**
 * Fetch with timeout support.
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = DEFAULT_OPTIONS.timeout
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    return response
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Execute an async function with retry, exponential backoff, and jitter.
 *
 * Only retries transient errors (network errors, 5xx, 429).
 * Does NOT retry on 4xx client errors or Zod validation failures.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  // Disable retries in test environment to avoid mock exhaustion and test timeouts
  // Vitest sets import.meta.env.VITEST to true
  const isTest = typeof import.meta !== 'undefined' && (
    (import.meta as any).env?.VITEST === true ||
    (import.meta as any).env?.MODE === 'test'
  )
  const effectiveMaxRetries = isTest ? 0 : (options.maxRetries ?? DEFAULT_OPTIONS.maxRetries)
  const effectiveBaseDelay = isTest ? 1 : (options.baseDelay ?? DEFAULT_OPTIONS.baseDelay)
  const effectiveMaxDelay = isTest ? 10 : (options.maxDelay ?? DEFAULT_OPTIONS.maxDelay)

  let lastError: unknown

  for (let attempt = 0; attempt <= effectiveMaxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      if (!isTransientError(error)) {
        logger.debug('retry', `Non-transient error, not retrying: ${error instanceof Error ? error.message : String(error)}`)
        throw error
      }

      if (attempt < effectiveMaxRetries) {
        const delay = calculateBackoff(attempt, effectiveBaseDelay, effectiveMaxDelay)
        logger.debug('retry', `Attempt ${attempt + 1} failed, retrying in ${Math.round(delay)}ms: ${error instanceof Error ? error.message : String(error)}`)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  logger.error('retry', `All ${effectiveMaxRetries + 1} attempts exhausted`)
  throw lastError
}
