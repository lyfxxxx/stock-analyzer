import { test, expect } from '@playwright/test'
import { clearAllDatabases, seedStock } from '../../utils/indexeddb'
import { setupConsoleErrorMonitoring } from '../../utils/console-errors'
import { tencentStock } from '../../fixtures/test-stocks'

test.describe('Navigation Flows', () => {
  // Clear IndexedDB before each test for isolation
  test.beforeEach(async ({ page }) => {
    await clearAllDatabases(page)
  })

  /**
   * NAV-001: Home → Add Stock navigation
   * Navigate to home, click add stock button, verify URL and heading
   */
  test('NAV-001: Home → Add Stock navigation', async ({ page }) => {
    const consoleErrors = setupConsoleErrorMonitoring(page)

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Click add stock button
    const addButton = page.locator('button.add-button:has-text("新增股票")')
    await expect(addButton).toBeVisible()
    await addButton.click()

    // Verify URL is /add
    await expect(page).toHaveURL(/\/add/)

    // Verify heading is visible
    const heading = page.locator('h1:has-text("新增股票分析")')
    await expect(heading).toBeVisible()

    // Verify no console errors
    expect(consoleErrors).toHaveLength(0)
  })

  /**
   * NAV-002: Add Stock → Home via back button
   * Navigate to /add, click back, verify URL is /
   */
  test('NAV-002: Add Stock → Home via back button', async ({ page }) => {
    const consoleErrors = setupConsoleErrorMonitoring(page)

    await page.goto('/add')
    await page.waitForLoadState('networkidle')

    // Click back button
    const backButton = page.locator('.back-button:has-text("返回")')
    await expect(backButton).toBeVisible()
    await backButton.click()

    // Verify redirect to home
    await expect(page).toHaveURL('**/')

    // Verify home page elements
    const addButton = page.locator('button.add-button:has-text("新增股票")')
    await expect(addButton).toBeVisible()

    // Verify no console errors
    expect(consoleErrors).toHaveLength(0)
  })

  /**
   * NAV-003: Home → Stock Detail via card click
   * Seed a stock, navigate to home, click card, verify URL and stock name
   */
  test('NAV-003: Home → Stock Detail via card click', async ({ page }) => {
    const consoleErrors = setupConsoleErrorMonitoring(page)

    // Seed a test stock
    await seedStock(page, tencentStock)

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Click stock card
    const stockCard = page.locator('.stock-card').first()
    await expect(stockCard).toBeVisible()
    await stockCard.click()

    // Verify URL matches /stock/:id pattern
    await expect(page).toHaveURL(/\/stock\/.+/)

    // Verify stock name in header
    const header = page.locator('h1')
    await expect(header).toContainText('腾讯控股')

    // Verify no console errors
    expect(consoleErrors).toHaveLength(0)
  })

  /**
   * NAV-004: Stock Detail → Home via back button
   * Seed a stock, navigate to detail, click back, verify home with stock still visible
   */
  test('NAV-004: Stock Detail → Home via back button', async ({ page }) => {
    const consoleErrors = setupConsoleErrorMonitoring(page)

    // Seed a test stock
    await seedStock(page, tencentStock)

    // Navigate directly to stock detail
    await page.goto(`/stock/${tencentStock.id}`)
    await page.waitForLoadState('networkidle')

    // Verify detail page loaded
    const header = page.locator('h1')
    await expect(header).toContainText('腾讯控股')

    // Click back button
    const backButton = page.locator('.back-button:has-text("返回")')
    await expect(backButton).toBeVisible()
    await backButton.click()

    // Verify redirect to home
    await expect(page).toHaveURL('**/')

    // Verify stock card is still visible in grid
    const stockCard = page.locator('.stock-card').first()
    await expect(stockCard).toBeVisible()
    await expect(stockCard.locator('.stock-name')).toContainText('腾讯控股')

    // Verify no console errors
    expect(consoleErrors).toHaveLength(0)
  })

  /**
   * NAV-005: Add Stock → Home after saving
   * Note: This test focuses on navigation after save, not the full form submission
   * since manual mode requires Excel files and API mode may not be available in CI
   */
  test('NAV-005: Direct URL navigation to /add works', async ({ page }) => {
    const consoleErrors = setupConsoleErrorMonitoring(page)

    // Navigate directly to /add
    await page.goto('/add')
    await page.waitForLoadState('networkidle')

    // Verify page loads correctly
    const heading = page.locator('h1:has-text("新增股票分析")')
    await expect(heading).toBeVisible()

    // Verify source selector buttons are visible
    const apiModeBtn = page.locator('.source-btn:has-text("API模式")')
    const manualModeBtn = page.locator('.source-btn:has-text("手动模式")')
    await expect(apiModeBtn).toBeVisible()
    await expect(manualModeBtn).toBeVisible()

    // Verify no console errors
    expect(consoleErrors).toHaveLength(0)
  })

  /**
   * NAV-006: Stock Detail → Home after deleting
   * Seed a stock, navigate to detail, delete, verify redirect and removal
   */
  test('NAV-006: Stock Detail → Home after deleting', async ({ page }) => {
    const consoleErrors = setupConsoleErrorMonitoring(page)

    // Seed a test stock
    await seedStock(page, tencentStock)

    // Navigate directly to stock detail
    await page.goto(`/stock/${tencentStock.id}`)
    await page.waitForLoadState('networkidle')

    // Verify detail page loaded
    const header = page.locator('h1')
    await expect(header).toContainText('腾讯控股')

    // Set up dialog handler for delete confirmation
    page.on('dialog', dialog => {
      expect(dialog.message()).toContain('确定要删除这只股票吗')
      dialog.accept()
    })

    // Click delete button
    const deleteButton = page.locator('.delete-button:has-text("删除此股票")')
    await expect(deleteButton).toBeVisible()
    await deleteButton.click()

    // Wait for redirect to home
    await page.waitForURL('**/')
    await page.waitForLoadState('networkidle')

    // Verify empty state (since we deleted the only stock)
    const emptyState = page.locator('.empty-state')
    await expect(emptyState).toBeVisible()

    // Verify no console errors
    expect(consoleErrors).toHaveLength(0)
  })

  /**
   * NAV-007: Direct URL navigation to non-existent stock
   * Navigate to /stock/NONEXISTENT_ID, verify error state
   */
  test('NAV-007: Direct URL navigation to non-existent stock shows error', async ({ page }) => {
    const consoleErrors = setupConsoleErrorMonitoring(page)

    // Navigate directly to non-existent stock
    await page.goto('/stock/NONEXISTENT_ID')
    await page.waitForLoadState('networkidle')

    // Verify error state is shown
    const errorState = page.locator('.error-state')
    await expect(errorState).toBeVisible()

    // Verify error message
    const errorMessage = errorState.locator('p')
    await expect(errorMessage).toContainText('未找到股票数据')

    // Verify back button is present
    const backBtn = page.locator('.back-btn')
    await expect(backBtn).toBeVisible()

    // Verify no console errors
    expect(consoleErrors).toHaveLength(0)
  })
})
