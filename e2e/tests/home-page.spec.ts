import { test, expect } from '@playwright/test'

test.describe('Home Page', () => {
  test('should load home page without errors', async ({ page }) => {
    // Collect console errors (exclude expected network errors from external APIs)
    const consoleErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text()
        // Skip expected network errors from external APIs (exchange rates, East Money, etc.)
        if (text.includes('ERR_CONNECTION') || text.includes('net::ERR') || text.includes('Failed to load resource')) {
          return
        }
        consoleErrors.push(text)
      }
    })

    // Navigate to home page
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Verify page title contains StockAnalyzer
    const title = page.locator('h1')
    await expect(title).toBeVisible()
    const titleText = await title.textContent()
    expect(titleText).toContain('StockAnalyzer')

    // Verify the add button is visible
    const addButton = page.locator('button.add-button:has-text("新增股票")')
    await expect(addButton).toBeVisible()

    // Verify empty state or stock list renders (no crash)
    const emptyState = page.locator('.empty-state')
    const stocksGrid = page.locator('.stocks-grid')
    const hasEmptyState = await emptyState.isVisible().catch(() => false)
    const hasStocksGrid = await stocksGrid.isVisible().catch(() => false)
    expect(hasEmptyState || hasStocksGrid).toBe(true)

    // Verify no console errors
    expect(consoleErrors).toHaveLength(0)
  })
})
