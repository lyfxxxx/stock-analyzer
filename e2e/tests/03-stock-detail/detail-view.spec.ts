import { test, expect, Page } from '@playwright/test'
import { clearAllDatabases, seedStock } from '../../utils/indexeddb'
import { setupConsoleErrorMonitoring } from '../../utils/console-errors'

// Test stock data for seeding
const testStock = {
  id: 'HK00700',
  name: '腾讯控股',
  code: '00700',
  market: 'HK',
  marketCap: 34500,
  netCash: 4500,
  freeCashFlow: 1200,
  netProfit: 1800,
  currentRatio: 1.45,
  peRatio: 18.5,
  valuation1: 23.33,
  valuation2: 16.67,
  yearlyData: [
    { year: 2024, freeCashFlow: 1200, netProfit: 1800, isProjected: true },
    { year: 2023, freeCashFlow: 1100, netProfit: 1650 },
    { year: 2022, freeCashFlow: 1000, netProfit: 1500 },
    { year: 2021, freeCashFlow: 900, netProfit: 1350 },
  ],
  createdAt: Date.now(),
  updatedAt: Date.now(),
  baseCurrency: 'HKD',
  isUsingProjectedData: true,
  netProfitProjected: true,
  freeCashFlowProjected: true,
}

test.describe('StockDetailView', () => {
  test.beforeEach(async ({ page }) => {
    // Clear IndexedDB before each test
    await clearAllDatabases(page)
    
    // Monitor console errors
    setupConsoleErrorMonitoring(page)
  })

  test('DET-001: Detail page loads with stock data', async ({ page }) => {
    // Seed a test stock
    await seedStock(page, testStock)

    // Navigate to detail page
    await page.goto(`/stock/${testStock.id}`)
    await page.waitForLoadState('networkidle')

    // Verify stock name in header
    const header = page.locator('h1')
    await expect(header).toContainText(testStock.name)
    await expect(header).toContainText(testStock.code)

    // Verify 6 overview cards are visible
    const overviewCards = page.locator('.overview-card')
    await expect(overviewCards).toHaveCount(6)

    // Verify valuation section is visible
    const valuationSection = page.locator('.valuation-section')
    await expect(valuationSection).toBeVisible()

    // Verify valuation boxes
    const valuationBoxes = page.locator('.valuation-box')
    await expect(valuationBoxes).toHaveCount(2)

    // Verify charts section
    const chartsSection = page.locator('.charts-section')
    await expect(chartsSection).toBeVisible()
  })

  test('DET-002: Back button returns to home', async ({ page }) => {
    // Seed a test stock
    await seedStock(page, testStock)

    // Navigate to detail page
    await page.goto(`/stock/${testStock.id}`)
    await page.waitForLoadState('networkidle')

    // Click back button
    const backButton = page.locator('.back-button:has-text("返回")')
    await expect(backButton).toBeVisible()
    await backButton.click()

    // Verify redirect to home
    await page.waitForURL('**/')
    
    // Verify home page elements
    const addButton = page.locator('button.add-button:has-text("新增股票")')
    await expect(addButton).toBeVisible()
  })

  test('DET-003: Overview cards display correct data', async ({ page }) => {
    // Seed a test stock
    await seedStock(page, testStock)

    // Navigate to detail page
    await page.goto(`/stock/${testStock.id}`)
    await page.waitForLoadState('networkidle')

    // Verify each overview card has label and value
    const overviewCards = page.locator('.overview-card')
    const cardCount = await overviewCards.count()
    expect(cardCount).toBe(6)

    for (let i = 0; i < cardCount; i++) {
      const card = overviewCards.nth(i)
      const label = card.locator('.label')
      const value = card.locator('.value')
      
      await expect(label).toBeVisible()
      await expect(value).toBeVisible()
    }

    // Verify market cap card shows correct formatted value
    const marketCapCard = page.locator('.overview-card').filter({ hasText: '当前市值' })
    const marketCapValue = marketCapCard.locator('.value')
    await expect(marketCapValue).toBeVisible()
    const marketCapText = await marketCapValue.textContent()
    expect(marketCapText).toContain('亿')
  })

  test('DET-004: Currency switching updates values', async ({ page }) => {
    // Seed a test stock
    await seedStock(page, testStock)

    // Navigate to detail page
    await page.goto(`/stock/${testStock.id}`)
    await page.waitForLoadState('networkidle')

    // Get initial market cap value
    const marketCapCard = page.locator('.overview-card').filter({ hasText: '当前市值' })
    const marketCapValue = marketCapCard.locator('.value')
    const initialValue = await marketCapValue.textContent()

    // Change currency to CNY
    const currencySelect = page.locator('.currency-select')
    await currencySelect.selectOption('CNY')

    // Wait for re-render
    await page.waitForTimeout(500)

    // Verify value changed
    const newValue = await marketCapValue.textContent()
    expect(newValue).toContain('亿人民币')
    expect(newValue).not.toBe(initialValue)

    // Change to USD
    await currencySelect.selectOption('USD')
    await page.waitForTimeout(500)

    const usdValue = await marketCapValue.textContent()
    expect(usdValue).toContain('亿美元')
  })

  test('DET-005: Sorting historical data table', async ({ page }) => {
    // Seed a test stock
    await seedStock(page, testStock)

    // Navigate to detail page
    await page.goto(`/stock/${testStock.id}`)
    await page.waitForLoadState('networkidle')

    // Find sort button
    const sortButton = page.locator('.sort-button')
    await expect(sortButton).toBeVisible()

    // Get initial sort order text
    const initialSortText = await sortButton.textContent()
    expect(initialSortText).toContain('从晚到早')

    // Click to sort ascending
    await sortButton.click()
    await page.waitForTimeout(300)

    // Verify sort order changed
    const newSortText = await sortButton.textContent()
    expect(newSortText).toContain('从早到晚')

    // Verify table rows are in correct order (ascending)
    const table = page.locator('.data-table')
    const rows = table.locator('tbody tr')
    const firstRowYear = await rows.nth(0).locator('td').first().textContent()
    expect(firstRowYear).toBe('2021')

    // Click to sort descending again
    await sortButton.click()
    await page.waitForTimeout(300)

    const finalSortText = await sortButton.textContent()
    expect(finalSortText).toContain('从晚到早')
  })

  test('DET-006: Delete button shows confirmation and redirects', async ({ page }) => {
    // Seed a test stock
    await seedStock(page, testStock)

    // Navigate to detail page
    await page.goto(`/stock/${testStock.id}`)
    await page.waitForLoadState('networkidle')

    // Handle dialog
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('删除')
      await dialog.accept()
    })

    // Click delete button
    const deleteButton = page.locator('.delete-button:has-text("删除此股票")')
    await expect(deleteButton).toBeVisible()
    await deleteButton.click()

    // Verify redirect to home
    await page.waitForURL('**/')
    
    // Verify home page elements
    const addButton = page.locator('button.add-button:has-text("新增股票")')
    await expect(addButton).toBeVisible()
  })

  test('DET-007: Delete cancel keeps stock', async ({ page }) => {
    // Seed a test stock
    await seedStock(page, testStock)

    // Navigate to detail page
    await page.goto(`/stock/${testStock.id}`)
    await page.waitForLoadState('networkidle')

    // Handle dialog - dismiss
    page.on('dialog', async dialog => {
      await dialog.dismiss()
    })

    // Click delete button
    const deleteButton = page.locator('.delete-button:has-text("删除此股票")')
    await deleteButton.click()

    // Wait a bit for dialog handling
    await page.waitForTimeout(500)

    // Verify still on detail page
    const currentUrl = page.url()
    expect(currentUrl).toContain(`/stock/${testStock.id}`)

    // Verify stock name is still visible
    const header = page.locator('h1')
    await expect(header).toContainText(testStock.name)
  })

  test('DET-008: Valuation colors are applied correctly', async ({ page }) => {
    // Seed a test stock with known valuation (medium ~16.67)
    await seedStock(page, testStock)

    // Navigate to detail page
    await page.goto(`/stock/${testStock.id}`)
    await page.waitForLoadState('networkidle')

    // Find valuation result elements
    const valResults = page.locator('.val-result')
    const count = await valResults.count()
    expect(count).toBe(2)

    // Check valuation colors - first one should be medium (between 10-20)
    const firstValResult = valResults.nth(0)
    const firstClass = await firstValResult.getAttribute('class')
    
    // valuation1 is 23.33 which is > 20 (high)
    if (testStock.valuation1 >= 20) {
      await expect(firstValResult).toHaveClass(/high/)
    } else if (testStock.valuation1 >= 10) {
      await expect(firstValResult).toHaveClass(/medium/)
    } else {
      await expect(firstValResult).toHaveClass(/low/)
    }

    // Check second valuation result
    const secondValResult = valResults.nth(1)
    const secondClass = await secondValResult.getAttribute('class')
    
    // valuation2 is 16.67 which is between 10-20 (medium)
    if (testStock.valuation2 >= 20) {
      await expect(secondValResult).toHaveClass(/high/)
    } else if (testStock.valuation2 >= 10) {
      await expect(secondValResult).toHaveClass(/medium/)
    } else {
      await expect(secondValResult).toHaveClass(/low/)
    }
  })
})
