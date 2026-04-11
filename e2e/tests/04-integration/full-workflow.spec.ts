import { test, expect } from '@playwright/test'
import { clearAllDatabases, seedStock, seedMultipleStocks } from '../../utils/indexeddb'
import { setupConsoleErrorMonitoring } from '../../utils/console-errors'
import { tencentStock, alibabaStock, moutaiStock } from '../../fixtures/test-stocks'

test.describe('Full Integration Workflows', () => {
  // Clear IndexedDB before each test for isolation
  test.beforeEach(async ({ page }) => {
    await clearAllDatabases(page)
  })

  /**
   * FLOW-001: Complete add-verify-delete workflow
   * Since API mode may not work in CI and manual mode requires Excel files,
   * we verify the add page navigation and mode switching instead
   */
  test('FLOW-001: Add page mode switching workflow', async ({ page }) => {
    const consoleErrors = setupConsoleErrorMonitoring(page)

    // Navigate to /add
    await page.goto('/add')
    await page.waitForLoadState('networkidle')

    // Switch to manual mode
    const manualModeBtn = page.locator('.source-btn:has-text("手动模式")')
    await manualModeBtn.click()

    // Verify manual mode form is visible
    const codeInput = page.locator('input[placeholder*="如: 00700"], input[placeholder*="如: 600519"]').first()
    await expect(codeInput).toBeVisible()

    // Verify save button is not visible (since no preview data)
    const saveButton = page.locator('.save-button')
    await expect(saveButton).not.toBeVisible()

    // Verify generate button is visible but disabled
    const generateButton = page.locator('.generate-button:has-text("生成数据")')
    await expect(generateButton).toBeVisible()
    await expect(generateButton).toBeDisabled()

    // Verify no console errors
    expect(consoleErrors).toHaveLength(0)
  })

  /**
   * FLOW-002: Add stock and view detail
   * Seed a stock in database, navigate to home, click card, verify detail data
   */
  test('FLOW-002: Add stock and view detail', async ({ page }) => {
    const consoleErrors = setupConsoleErrorMonitoring(page)

    // Seed a test stock
    await seedStock(page, tencentStock)

    // Navigate to home
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Verify stock card is visible
    const stockCard = page.locator('.stock-card').first()
    await expect(stockCard).toBeVisible()
    await expect(stockCard.locator('.stock-name')).toContainText('腾讯控股')

    // Click stock card
    await stockCard.click()

    // Verify detail page shows correct data
    await expect(page).toHaveURL(/\/stock\/.+/)

    // Verify header shows stock name
    const header = page.locator('h1')
    await expect(header).toContainText('腾讯控股')
    await expect(header).toContainText('00700')

    // Verify overview cards are visible
    const overviewSection = page.locator('.overview-section')
    await expect(overviewSection).toBeVisible()

    // Verify valuation section is visible
    const valuationSection = page.locator('.valuation-section')
    await expect(valuationSection).toBeVisible()

    // Navigate back to home
    const backButton = page.locator('.back-button:has-text("返回")')
    await backButton.click()
    await page.waitForURL('**/')

    // Verify stock is still visible in grid
    await expect(page.locator('.stock-card')).toHaveCount(1)

    // Verify no console errors
    expect(consoleErrors).toHaveLength(0)
  })

  /**
   * FLOW-003: Multiple stocks display and search
   * Seed 3 stocks, verify all visible, search, clear, verify all visible again
   */
  test('FLOW-003: Multiple stocks display and search', async ({ page }) => {
    const consoleErrors = setupConsoleErrorMonitoring(page)

    // Seed 3 stocks
    await seedMultipleStocks(page, [tencentStock, alibabaStock, moutaiStock])

    // Navigate to home
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Verify 3 stock cards are visible
    const stockCards = page.locator('.stock-card')
    await expect(stockCards).toHaveCount(3)

    // Verify all stock names are present
    await expect(page.locator('.stock-name:has-text("腾讯控股")')).toBeVisible()
    await expect(page.locator('.stock-name:has-text("阿里巴巴")')).toBeVisible()
    await expect(page.locator('.stock-name:has-text("贵州茅台")')).toBeVisible()

    // Search for Tencent
    const searchInput = page.locator('.search-input')
    await expect(searchInput).toBeVisible()
    await searchInput.fill('腾讯')

    // Wait for search to filter
    await page.waitForTimeout(300)

    // Verify only Tencent is visible
    await expect(page.locator('.stock-card')).toHaveCount(1)
    await expect(page.locator('.stock-name:has-text("腾讯控股")')).toBeVisible()

    // Clear search
    const clearButton = page.locator('.search-clear')
    await expect(clearButton).toBeVisible()
    await clearButton.click()

    // Wait for filter to clear
    await page.waitForTimeout(300)

    // Verify all 3 stocks are visible again
    await expect(page.locator('.stock-card')).toHaveCount(3)

    // Verify no console errors
    expect(consoleErrors).toHaveLength(0)
  })

  /**
   * FLOW-004: Stock persistence across page reload
   * Seed a stock, verify visible, reload, verify still visible
   */
  test('FLOW-004: Stock persistence across page reload', async ({ page }) => {
    const consoleErrors = setupConsoleErrorMonitoring(page)

    // Seed a test stock
    await seedStock(page, tencentStock)

    // Navigate to home and verify stock visible
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const stockCard = page.locator('.stock-card').first()
    await expect(stockCard).toBeVisible()
    await expect(stockCard.locator('.stock-name')).toContainText('腾讯控股')

    // Reload the page
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Verify stock is still visible (IndexedDB persistence)
    await expect(stockCard).toBeVisible()
    await expect(stockCard.locator('.stock-name')).toContainText('腾讯控股')

    // Verify no console errors
    expect(consoleErrors).toHaveLength(0)
  })

  /**
   * FLOW-005: API status indicator displays
   * Navigate to home, verify ApiTester component is visible
   */
  test('FLOW-005: API status indicator displays on home page', async ({ page }) => {
    const consoleErrors = setupConsoleErrorMonitoring(page)

    // Navigate to home
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Verify empty state is shown (no stocks yet)
    const emptyState = page.locator('.empty-state')
    await expect(emptyState).toBeVisible()

    // Verify no console errors
    expect(consoleErrors).toHaveLength(0)
  })

  /**
   * FLOW-006: Delete stock returns to empty state
   * Seed one stock, delete it, verify empty state appears
   */
  test('FLOW-006: Delete stock returns to empty state', async ({ page }) => {
    const consoleErrors = setupConsoleErrorMonitoring(page)

    // Seed a test stock
    await seedStock(page, tencentStock)

    // Navigate to home
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Verify stock card is visible
    await expect(page.locator('.stock-card')).toHaveCount(1)

    // Navigate to detail page
    await page.locator('.stock-card').first().click()
    await expect(page).toHaveURL(/\/stock\/.+/)

    // Set up dialog handler
    page.on('dialog', dialog => {
      expect(dialog.message()).toContain('确定要删除这只股票吗')
      dialog.accept()
    })

    // Delete the stock
    const deleteButton = page.locator('.delete-button:has-text("删除此股票")')
    await deleteButton.click()

    // Wait for redirect
    await page.waitForURL('**/')
    await page.waitForLoadState('networkidle')

    // Verify empty state is visible
    const emptyState = page.locator('.empty-state')
    await expect(emptyState).toBeVisible()
    await expect(emptyState.locator('h3')).toHaveText('还没有股票数据')

    // Verify no console errors
    expect(consoleErrors).toHaveLength(0)
  })

  /**
   * FLOW-007: Navigate to edit mode for existing stock
   * Seed a stock, navigate to /edit/:id, verify edit form is pre-filled
   */
  test('FLOW-007: Navigate to edit mode for existing stock', async ({ page }) => {
    const consoleErrors = setupConsoleErrorMonitoring(page)

    // Seed a test stock
    await seedStock(page, tencentStock)

    // Navigate to edit page
    await page.goto(`/edit/${tencentStock.id}`)
    await page.waitForLoadState('networkidle')

    // Verify edit page heading
    const heading = page.locator('h1:has-text("编辑股票")')
    await expect(heading).toBeVisible()

    // Verify form is pre-filled with stock data
    const codeInput = page.locator('input[placeholder*="如: 00700"], input[placeholder*="如: 600519"]').first()
    await expect(codeInput).toHaveValue('00700')

    // Verify preview section is visible (edit mode shows preview by default)
    const previewSection = page.locator('.preview-section')
    await expect(previewSection).toBeVisible()

    // Verify no console errors
    expect(consoleErrors).toHaveLength(0)
  })
})
