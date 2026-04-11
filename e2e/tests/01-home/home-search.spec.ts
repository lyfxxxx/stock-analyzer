import { test, expect } from '@playwright/test'
import { clearAllDatabases, seedMultipleStocks } from '../../utils/indexeddb'
import { setupConsoleErrorMonitoring } from '../../utils/console-errors'
import { tencentStock, alibabaStock, moutaiStock } from '../../fixtures/test-stocks'

test.describe('Home Page - Search', () => {
  // Clear IndexedDB and seed stocks before each test
  test.beforeEach(async ({ page }) => {
    await clearAllDatabases(page)
    await seedMultipleStocks(page, [tencentStock, alibabaStock, moutaiStock])
  })

  /**
   * HP-008: Search filters stocks by name
   */
  test('HP-008: Search filters stocks by name', async ({ page }) => {
    // Setup console error monitoring
    const consoleErrors = setupConsoleErrorMonitoring(page)

    // Navigate to home page
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Verify 3 stock cards initially
    const stockCards = page.locator('.stock-card')
    await expect(stockCards).toHaveCount(3)

    // Search for "腾讯" (Tencent)
    const searchInput = page.locator('.search-input')
    await searchInput.fill('腾讯')

    // Verify only 1 stock card is shown
    await expect(stockCards).toHaveCount(1)

    // Verify the shown card is Tencent
    await expect(stockCards.first().locator('.stock-name')).toContainText('腾讯控股')

    // Verify no console errors
    expect(consoleErrors).toHaveLength(0)
  })

  /**
   * HP-009: Search filters stocks by code
   */
  test('HP-009: Search filters stocks by code', async ({ page }) => {
    // Setup console error monitoring
    const consoleErrors = setupConsoleErrorMonitoring(page)

    // Navigate to home page
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Verify 3 stock cards initially
    const stockCards = page.locator('.stock-card')
    await expect(stockCards).toHaveCount(3)

    // Search for "600519" (Moutai code)
    const searchInput = page.locator('.search-input')
    await searchInput.fill('600519')

    // Verify only 1 stock card is shown
    await expect(stockCards).toHaveCount(1)

    // Verify the shown card is Moutai
    await expect(stockCards.first().locator('.stock-name')).toContainText('贵州茅台')

    // Verify no console errors
    expect(consoleErrors).toHaveLength(0)
  })

  /**
   * HP-010: Clear search restores all stocks
   */
  test('HP-010: Clear search restores all stocks', async ({ page }) => {
    // Setup console error monitoring
    const consoleErrors = setupConsoleErrorMonitoring(page)

    // Navigate to home page
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Verify 3 stock cards initially
    const stockCards = page.locator('.stock-card')
    await expect(stockCards).toHaveCount(3)

    // Search for "阿里" (Alibaba)
    const searchInput = page.locator('.search-input')
    await searchInput.fill('阿里')

    // Verify only 1 stock card is shown
    await expect(stockCards).toHaveCount(1)
    await expect(stockCards.first().locator('.stock-name')).toContainText('阿里巴巴')

    // Click the clear button
    const clearButton = page.locator('.search-clear')
    await clearButton.click()

    // Verify search input is cleared
    await expect(searchInput).toHaveValue('')

    // Verify all 3 stock cards are shown again
    await expect(stockCards).toHaveCount(3)

    // Verify no console errors
    expect(consoleErrors).toHaveLength(0)
  })

  /**
   * HP-011: No results shown for non-matching query
   */
  test('HP-011: No results shown for non-matching query', async ({ page }) => {
    // Setup console error monitoring
    const consoleErrors = setupConsoleErrorMonitoring(page)

    // Navigate to home page
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Verify 3 stock cards initially
    const stockCards = page.locator('.stock-card')
    await expect(stockCards).toHaveCount(3)

    // Search for a non-existent stock
    const searchInput = page.locator('.search-input')
    await searchInput.fill('不存在的股票XYZ')

    // Verify no stock cards are shown
    await expect(stockCards).toHaveCount(0)

    // Verify "no results" message is displayed
    const noResults = page.locator('.no-results')
    await expect(noResults).toBeVisible()
    await expect(noResults).toContainText('没有找到匹配的股票')

    // Verify stocks grid is not visible
    const stocksGrid = page.locator('.stocks-grid')
    await expect(stocksGrid).not.toBeVisible()

    // Verify no console errors
    expect(consoleErrors).toHaveLength(0)
  })
})
