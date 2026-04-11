import { test, expect } from '@playwright/test'
import { clearAllDatabases } from '../../utils/indexeddb'
import { setupConsoleErrorMonitoring } from '../../utils/console-errors'

test.describe('Home Page - Empty State', () => {
  // Clear IndexedDB before each test for isolation
  test.beforeEach(async ({ page }) => {
    await clearAllDatabases(page)
  })

  /**
   * HP-001: Empty state displays correctly
   * Verifies: no stocks, empty message, add button visible, update-all hidden
   */
  test('HP-001: Empty state displays correctly', async ({ page }) => {
    // Setup console error monitoring
    const consoleErrors = setupConsoleErrorMonitoring(page)

    // Navigate to home page
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Verify empty state is visible
    const emptyState = page.locator('.empty-state')
    await expect(emptyState).toBeVisible()

    // Verify empty state message
    const emptyTitle = emptyState.locator('h3')
    await expect(emptyTitle).toHaveText('还没有股票数据')

    const emptyDescription = emptyState.locator('p')
    await expect(emptyDescription).toHaveText('点击右上角"新增股票"开始分析')

    // Verify add button is visible in empty state
    const addButton = page.locator('button.add-button:has-text("新增股票")')
    await expect(addButton).toBeVisible()

    // Verify update-all button is NOT visible when no stocks
    const updateAllButton = page.locator('.update-all-button')
    await expect(updateAllButton).not.toBeVisible()

    // Verify stocks grid is NOT visible
    const stocksGrid = page.locator('.stocks-grid')
    await expect(stocksGrid).not.toBeVisible()

    // Verify no console errors
    expect(consoleErrors).toHaveLength(0)
  })

  /**
   * HP-002: Add button navigates to /add
   */
  test('HP-002: Add button navigates to /add', async ({ page }) => {
    // Setup console error monitoring
    const consoleErrors = setupConsoleErrorMonitoring(page)

    // Navigate to home page
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Click the add button
    const addButton = page.locator('button.add-button:has-text("新增股票")')
    await addButton.click()

    // Verify navigation to /add
    await expect(page).toHaveURL(/\/add/)

    // Verify no console errors
    expect(consoleErrors).toHaveLength(0)
  })

  /**
   * HP-003: Page title is correct
   */
  test('HP-003: Page title is correct', async ({ page }) => {
    // Setup console error monitoring
    const consoleErrors = setupConsoleErrorMonitoring(page)

    // Navigate to home page
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Verify page header contains StockAnalyzer
    const header = page.locator('h1')
    await expect(header).toContainText('StockAnalyzer')

    // Verify no console errors
    expect(consoleErrors).toHaveLength(0)
  })
})
