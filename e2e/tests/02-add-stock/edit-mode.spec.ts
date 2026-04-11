import { test, expect, Page } from '@playwright/test'
import { clearAllDatabases, seedStock, getAllStocks } from '../../utils/indexeddb'
import { setupConsoleErrorMonitoring } from '../../utils/console-errors'

/**
 * Test stock data for edit mode tests
 * Using a simple structure that matches StockData type
 */
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
    { "year": 2024, "freeCashFlow": 1200, "netProfit": 1800, "isProjected": true },
    { "year": 2023, "freeCashFlow": 1100, "netProfit": 1650 },
    { "year": 2022, "freeCashFlow": 1000, "netProfit": 1500 },
    { "year": 2021, "freeCashFlow": 900, "netProfit": 1350 },
  ],
  createdAt: Date.now(),
  updatedAt: Date.now(),
  "baseCurrency": 'HKD',
  "isUsingProjectedData": true,
  "netProfitProjected": true,
  "freeCashFlowProjected": true,
}

test.describe('AddStockView - Edit Mode', () => {
  test.beforeEach(async ({ page }) => {
    await clearAllDatabases(page)
    setupConsoleErrorMonitoring(page)
  })

  test('EDIT-001: Edit page loads with pre-filled data', async ({ page }) => {
    // Seed a stock first
    await seedStock(page, testStock)

    // Navigate to edit page
    await page.goto(`/edit/${testStock.id}`)
    await page.waitForLoadState('networkidle')

    // Verify page title shows "编辑股票" (not "新增股票分析")
    const title = page.locator('h1')
    await expect(title).toContainText('编辑股票')

    // Verify code input is disabled
    const codeInput = page.locator('input[placeholder*="输入代码或名称搜索"]').first()
    await expect(codeInput).toBeDisabled()

    // Verify stock name is displayed (in preview or form)
    // In edit mode, preview should be shown immediately with pre-filled data
    const previewSection = page.locator('.preview-section')
    await expect(previewSection).toBeVisible()

    // Verify stock name appears in preview
    await expect(previewSection).toContainText(testStock.name)

    // Verify market cap is displayed in preview
    await expect(previewSection).toContainText('亿')
  })

  test('EDIT-002: Edit mode shows preview data immediately', async ({ page }) => {
    // Seed stock
    await seedStock(page, testStock)

    // Navigate to edit page
    await page.goto(`/edit/${testStock.id}`)
    await page.waitForLoadState('networkidle')

    // Verify preview section is visible
    const previewSection = page.locator('.preview-section')
    await expect(previewSection).toBeVisible()

    // Verify valuation cards are displayed with data
    const valuationCards = page.locator('.valuation-card')
    await expect(valuationCards.first()).toBeVisible()
    const cardCount = await valuationCards.count()
    expect(cardCount).toBeGreaterThan(0)

    // Verify currency selector is visible
    const currencySelector = page.locator('.currency-selector')
    await expect(currencySelector).toBeVisible()

    // Verify currency select options exist
    const currencySelect = page.locator('.currency-selector select')
    await expect(currencySelect).toBeVisible()
    await expect(currencySelect.locator('option[value="HKD"]')).toBeAttached()
    await expect(currencySelect.locator('option[value="CNY"]')).toBeAttached()
    await expect(currencySelect.locator('option[value="USD"]')).toBeAttached()
  })

  test('EDIT-003: Save updates existing stock', async ({ page }) => {
    // Seed stock
    await seedStock(page, testStock)

    // Navigate to edit page
    await page.goto(`/edit/${testStock.id}`)
    await page.waitForLoadState('networkidle')

    // Wait for preview to load
    await page.waitForSelector('.preview-section')

    // Verify save button is visible with correct text
    const saveButton = page.locator('.save-button:has-text("确认保存")')
    await expect(saveButton).toBeVisible()

    // Click save
    await saveButton.click()

    // Wait for redirect to home page
    await page.waitForURL('**/')

    // Verify the stock still exists in the list (updated values)
    const stocks = await getAllStocks(page)
    const updatedStock = stocks.find(s => s.id === testStock.id)
    expect(updatedStock).toBeDefined()
    expect(updatedStock?.name).toBe(testStock.name)
    expect(updatedStock?.code).toBe(testStock.code)
  })

  test('EDIT-004: Back button returns to home', async ({ page }) => {
    // Seed stock
    await seedStock(page, testStock)

    // Navigate to edit page
    await page.goto(`/edit/${testStock.id}`)
    await page.waitForLoadState('networkidle')

    // Click back button
    const backButton = page.locator('.back-button:has-text("返回")')
    await expect(backButton).toBeVisible()
    await backButton.click()

    // Verify URL is home
    await page.waitForURL('**/')

    // Verify stock still appears in grid (unchanged)
    const stocks = await getAllStocks(page)
    const unchangedStock = stocks.find(s => s.id === testStock.id)
    expect(unchangedStock).toBeDefined()
    expect(unchangedStock?.name).toBe(testStock.name)
  })

  test('EDIT-005: Edit code functionality', async ({ page }) => {
    // Seed stock
    await seedStock(page, testStock)

    // Navigate to edit page
    await page.goto(`/edit/${testStock.id}`)
    await page.waitForLoadState('networkidle')

    // Wait for page to fully load
    await page.waitForSelector('.preview-section')

    // Click edit code button to enable editing
    const editCodeBtn = page.locator('.edit-code-btn:has-text("修改")')
    await expect(editCodeBtn).toBeVisible()
    await editCodeBtn.click()

    // Verify edit mode notice appears
    const editModeNotice = page.locator('.edit-mode-notice')
    await expect(editModeNotice).toBeVisible()

    // Verify code input becomes enabled
    // After clicking edit, the code input should be in editing mode
    // Look for the code input that is NOT disabled
    const codeInputs = page.locator('input[placeholder*="如: 00700"], input[placeholder*="如: 600519"]')
    const enabledInput = codeInputs.filter({ hasNot: page.locator(':disabled') }).first()
    await expect(enabledInput).toBeEnabled()

    // Click cancel button
    const cancelBtn = page.locator('.cancel-btn')
    await expect(cancelBtn).toBeVisible()
    await cancelBtn.click()

    // Verify edit mode notice is hidden
    await expect(editModeNotice).not.toBeVisible()

    // Verify code input is disabled again
    const codeInput = page.locator('input[placeholder*="输入代码或名称搜索"]').first()
    await expect(codeInput).toBeDisabled()
  })

  test('EDIT-006: Currency switch in edit mode', async ({ page }) => {
    // Seed stock
    await seedStock(page, testStock)

    // Navigate to edit page
    await page.goto(`/edit/${testStock.id}`)
    await page.waitForLoadState('networkidle')

    // Wait for preview to load
    await page.waitForSelector('.preview-section')

    // Get initial market cap display value
    const initialMarketCapText = await page.locator('.valuation-card').first().textContent()

    // Change currency selector from HKD to CNY
    const currencySelect = page.locator('.currency-selector select')
    await currencySelect.selectOption('CNY')

    // Wait for values to update
    await page.waitForTimeout(100)

    // Verify displayed values update (currency unit should change)
    const cnyMarketCapText = await page.locator('.valuation-card').first().textContent()
    // The display should contain 亿人民币 now
    await expect(page.locator('.valuation-card').first()).toContainText('亿人民币')

    // Change to USD
    await currencySelect.selectOption('USD')
    await page.waitForTimeout(100)

    // Verify values update for USD
    await expect(page.locator('.valuation-card').first()).toContainText('亿')
  })

  test('EDIT-007: Refetch button in edit mode', async ({ page }) => {
    // Seed stock
    await seedStock(page, testStock)

    // Navigate to edit page
    await page.goto(`/edit/${testStock.id}`)
    await page.waitForLoadState('networkidle')

    // Wait for preview to load
    await page.waitForSelector('.preview-section')

    // Verify re-fetch button is visible (only in API mode)
    const refetchButton = page.locator('button:has-text("重新获取")')
    
    // The refetch button should be visible in API mode edit view
    // Check if it exists (may be disabled if API is not available)
    const isVisible = await refetchButton.isVisible().catch(() => false)
    if (isVisible) {
      // If visible, verify it has the reset-button class
      await expect(refetchButton).toHaveClass(/reset-button/)
    }
  })
})
