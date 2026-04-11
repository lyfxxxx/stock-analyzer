import type { Page } from '@playwright/test'

/**
 * Expected network errors that should be filtered out during testing
 */
const EXPECTED_NETWORK_ERRORS = [
  'ERR_CONNECTION',
  'net::ERR',
  'Failed to load resource',
  'net::ERR_NAME_NOT_RESOLVED',
  'net::ERR_CONNECTION_REFUSED',
  'net::ERR_CONNECTION_RESET',
  'net::ERR_CONNECTION_TIMED_OUT',
  'net::ERR_INTERNET_DISCONNECTED',
  'Failed to fetch',
  'NetworkError',
  'Network request failed',
]

/**
 * Sets up console error monitoring for a page and returns the collected errors.
 * Filters out expected network errors from external APIs (exchange rates, East Money, etc.)
 * 
 * @param page - Playwright page object
 * @returns Array of filtered console errors
 */
export function setupConsoleErrorMonitoring(page: Page): string[] {
  const consoleErrors: string[] = []

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text()
      
      // Skip expected network errors from external APIs
      const isExpectedNetworkError = EXPECTED_NETWORK_ERRORS.some(
        (expectedError) => text.includes(expectedError)
      )
      
      if (!isExpectedNetworkError) {
        consoleErrors.push(text)
      }
    }
  })

  return consoleErrors
}

/**
 * Sets up console error monitoring and returns a function to get current errors.
 * Useful when you want to check errors at multiple points during a test.
 * 
 * @param page - Playwright page object
 * @returns Object with methods to get and clear errors
 */
export function createConsoleErrorMonitor(page: Page): {
  errors: string[]
  getErrors: () => string[]
  clearErrors: () => void
} {
  const errors: string[] = []

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text()
      
      const isExpectedNetworkError = EXPECTED_NETWORK_ERRORS.some(
        (expectedError) => text.includes(expectedError)
      )
      
      if (!isExpectedNetworkError) {
        errors.push(text)
      }
    }
  })

  return {
    errors,
    getErrors: () => [...errors],
    clearErrors: () => {
      errors.length = 0
    },
  }
}

/**
 * Filters console errors, removing expected network errors
 * 
 * @param errors - Array of error strings
 * @returns Filtered array without expected network errors
 */
export function filterConsoleErrors(errors: string[]): string[] {
  return errors.filter((error) => {
    return !EXPECTED_NETWORK_ERRORS.some((expectedError) =>
      error.includes(expectedError)
    )
  })
}
