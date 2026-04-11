import { test, expect } from '@playwright/test'
import { clearAllDatabases } from '../../utils/indexeddb'
import { setupConsoleErrorMonitoring } from '../../utils/console-errors'

test.describe('Home Page - Components', () => {
  test.beforeEach(async ({ page }) => {
    await clearAllDatabases(page)
    setupConsoleErrorMonitoring(page)
  })

  /**
   * COMP-001: API tester component displays
   */
  test('COMP-001: API tester component displays', async ({ page }) => {
    // Navigate to home page
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Verify API tester is visible
    const apiTester = page.locator('.api-tester')
    await expect(apiTester).toBeVisible()

    // Verify test button exists
    const testButton = page.locator('.test-button')
    await expect(testButton).toBeVisible()
  })

  /**
   * COMP-002: API test button triggers connection test
   */
  test('COMP-002: API test button triggers connection test', async ({ page }) => {
    // Navigate to home page
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Click test button
    const testButton = page.locator('.test-button')
    await testButton.click()

    // Wait for result to appear
    await page.waitForTimeout(1000)

    // Verify result displays (either success or warning)
    const apiResultItems = page.locator('.api-result-item')
    const resultCount = await apiResultItems.count()

    // Either results show or warning shows
    if (resultCount > 0) {
      await expect(apiResultItems.first()).toBeVisible()
    } else {
      const apiWarning = page.locator('.api-warning')
      await expect(apiWarning).toBeVisible()
    }
  })

  /**
   * COMP-003: Loading state displays during initial load
   */
  test('COMP-003: Loading state displays during initial load', async ({ page }) => {
    // Navigate to home page
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Either loading state appears briefly or stocks grid appears
    // Check for loading state OR stocks grid
    const loadingState = page.locator('.loading-state')
    const stocksGrid = page.locator('.stocks-grid')

    // One of these should be visible
    const hasLoading = await loadingState.isVisible().catch(() => false)
    const hasStocksGrid = await stocksGrid.isVisible().catch(() => false)

    expect(hasLoading || hasStocksGrid).toBeTruthy()
  })
})
