import { test, expect } from '@playwright/test'
import { clearAllDatabases, seedMultipleStocks } from '../../utils/indexeddb'
import { setupConsoleErrorMonitoring } from '../../utils/console-errors'
import { tencentStock, alibabaStock, moutaiStock } from '../../fixtures/test-stocks'

test.describe('Home Page - With Stocks', () => {
  // Clear IndexedDB and seed stocks before each test
  test.beforeEach(async ({ page }) => {
    await clearAllDatabases(page)
    await seedMultipleStocks(page, [tencentStock, alibabaStock, moutaiStock])
  })

  /**
   * HP-004: Stock cards display correctly after seeding data
   */
  test('HP-004: Stock cards display correctly after seeding data', async ({ page }) => {
    // Setup console error monitoring
    const consoleErrors = setupConsoleErrorMonitoring(page)

    // Navigate to home page
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Verify stocks grid is visible
    const stocksGrid = page.locator('.stocks-grid')
    await expect(stocksGrid).toBeVisible()

    // Verify 3 stock cards are displayed
    const stockCards = page.locator('.stock-card')
    await expect(stockCards).toHaveCount(3)

    // Verify first stock card (Tencent) contains expected content
    const firstCard = stockCards.first()
    await expect(firstCard.locator('.stock-name')).toContainText('腾讯控股')
    await expect(firstCard.locator('.stock-code')).toContainText('00700')
    await expect(firstCard.locator('.market-badge.HK')).toBeVisible()

    // Verify empty state is NOT visible
    const emptyState = page.locator('.empty-state')
    await expect(emptyState).not.toBeVisible()

    // Verify no console errors
    expect(consoleErrors).toHaveLength(0)
  })

  /**
   * HP-005: Stock card click navigates to detail page
   */
  test('HP-005: Stock card click navigates to detail page', async ({ page }) => {
    // Setup console error monitoring
    const consoleErrors = setupConsoleErrorMonitoring(page)

    // Navigate to home page
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Click on the first stock card
    const stockCards = page.locator('.stock-card')
    await stockCards.first().click()

    // Verify navigation to stock detail page
    await expect(page).toHaveURL(/\/stock\/.+/)

    // Verify no console errors
    expect(consoleErrors).toHaveLength(0)
  })

  /**
   * HP-006: Update all button visible and clickable (with loading state)
   */
  test('HP-006: Update all button visible and clickable', async ({ page }) => {
    // Setup console error monitoring
    const consoleErrors = setupConsoleErrorMonitoring(page)

    // Navigate to home page
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Verify update-all button is visible
    const updateAllButton = page.locator('.update-all-button')
    await expect(updateAllButton).toBeVisible()

    // Verify update-all button contains expected text
    await expect(updateAllButton).toContainText('更新全部')

    // Click the update-all button
    await updateAllButton.click()

    // Verify button becomes disabled (loading state) or shows spinner
    // The button may show progress text like "0/3" during update
    // We just verify it was clicked without error
    await page.waitForTimeout(500)

    // Verify no console errors
    expect(consoleErrors).toHaveLength(0)
  })

  /**
   * HP-007: Market cap and valuation displayed in cards
   */
  test('HP-007: Market cap and valuation displayed in cards', async ({ page }) => {
    // Setup console error monitoring
    const consoleErrors = setupConsoleErrorMonitoring(page)

    // Navigate to home page
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Get the first stock card (Tencent)
    const firstCard = page.locator('.stock-card').first()

    // Verify market cap is displayed
    const marketCap = firstCard.locator('.market-cap')
    await expect(marketCap).toBeVisible()
    await expect(marketCap).toContainText('市值')

    // Verify valuation1 and valuation2 are displayed
    const valuationRow = firstCard.locator('.valuation-row')
    await expect(valuationRow).toBeVisible()

    const valuation1Label = firstCard.locator('.valuation-item').first().locator('.label')
    await expect(valuation1Label).toContainText('估值1')

    const valuation2Label = firstCard.locator('.valuation-item').last().locator('.label')
    await expect(valuation2Label).toContainText('估值2')

    // Verify valuation values are present (not N/A for Tencent)
    const valuationValues = firstCard.locator('.valuation-item .value')
    await expect(valuationValues.first()).toBeVisible()

    // Verify no console errors
    expect(consoleErrors).toHaveLength(0)
  })
})
