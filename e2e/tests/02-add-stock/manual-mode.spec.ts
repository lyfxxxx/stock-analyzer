import { test, expect, Page } from '@playwright/test'
import { clearAllDatabases } from '../../utils/indexeddb'
import { setupConsoleErrorMonitoring } from '../../utils/console-errors'

test.describe('AddStockView - Manual Mode', () => {
  test.beforeEach(async ({ page }) => {
    // Clear IndexedDB before each test
    await clearAllDatabases(page)
    
    // Monitor console errors
    setupConsoleErrorMonitoring(page)
  })

  test('MAN-001: Switch to manual mode displays manual form', async ({ page }) => {
    await page.goto('/add')
    await page.waitForLoadState('networkidle')

    // Click manual mode button
    const manualModeBtn = page.locator('.source-btn:has-text("手动模式")')
    await expect(manualModeBtn).toBeVisible()
    await manualModeBtn.click()

    // Verify manual form is visible
    const codeInput = page.locator('input[placeholder*="如: 00700"], input[placeholder*="如: 600519"]')
    await expect(codeInput).toBeVisible()

    const nameInput = page.locator('input[placeholder*="股票名称"]')
    await expect(nameInput).toBeVisible()

    const marketCapInput = page.locator('.market-cap-input-group input[type="number"]')
    await expect(marketCapInput).toBeVisible()

    // Verify currency display shows HKD (default)
    const currencyDisplay = page.locator('.currency-display')
    await expect(currencyDisplay).toContainText('亿港元')

    // Verify upload section is visible
    const uploadSection = page.locator('.form-section:has-text("上传财务报表")')
    await expect(uploadSection).toBeVisible()
  })

  test('MAN-002: Form validation for empty required fields', async ({ page }) => {
    await page.goto('/add')
    await page.waitForLoadState('networkidle')

    // Switch to manual mode
    const manualModeBtn = page.locator('.source-btn:has-text("手动模式")')
    await manualModeBtn.click()

    // Wait for manual form to load
    await page.waitForSelector('.market-cap-input-group input[type="number"]')

    // Try to interact with generate button without filling form
    const generateBtn = page.locator('.generate-button:has-text("生成数据")')
    
    // The button should be disabled since form is not filled
    await expect(generateBtn).toBeDisabled()

    // Fill in only code and check validation
    const codeInput = page.locator('input[placeholder*="如: 00700"], input[placeholder*="如: 600519"]').first()
    await codeInput.fill('00700')

    // Button should still be disabled (name and market cap required)
    await expect(generateBtn).toBeDisabled()

    // Fill name only
    const nameInput = page.locator('input[placeholder*="股票名称"]')
    await nameInput.fill('腾讯控股')

    // Button should still be disabled (market cap required)
    await expect(generateBtn).toBeDisabled()
  })

  test('MAN-003: Form validation for invalid market cap', async ({ page }) => {
    await page.goto('/add')
    await page.waitForLoadState('networkidle')

    // Switch to manual mode
    const manualModeBtn = page.locator('.source-btn:has-text("手动模式")')
    await manualModeBtn.click()

    await page.waitForSelector('.market-cap-input-group input[type="number"]')

    // Fill valid data first
    const codeInput = page.locator('input[placeholder*="如: 00700"], input[placeholder*="如: 600519"]').first()
    await codeInput.fill('00700')

    const nameInput = page.locator('input[placeholder*="股票名称"]')
    await nameInput.fill('腾讯控股')

    // Enter negative market cap
    const marketCapInput = page.locator('.market-cap-input-group input[type="number"]')
    await marketCapInput.fill('-100')

    // Check that input has error class
    await expect(marketCapInput).toHaveClass(/input-error/)

    // Check error message appears
    const errorMessage = page.locator('.error-message')
    await expect(errorMessage).toBeVisible()
    await expect(errorMessage).toContainText('市值')
  })

  test('MAN-004: Market selector changes currency display', async ({ page }) => {
    await page.goto('/add')
    await page.waitForLoadState('networkidle')

    // Switch to manual mode
    const manualModeBtn = page.locator('.source-btn:has-text("手动模式")')
    await manualModeBtn.click()

    await page.waitForSelector('.currency-display')

    // Verify default is HKD (HK market)
    const currencyDisplay = page.locator('.currency-display')
    await expect(currencyDisplay).toContainText('亿港元')

    // Change market to A (A-share)
    const marketSelect = page.locator('.form-select').first()
    await marketSelect.selectOption('A')

    // Verify currency display changes to CNY
    await expect(currencyDisplay).toContainText('亿人民币')

    // Change back to HK
    await marketSelect.selectOption('HK')
    await expect(currencyDisplay).toContainText('亿港元')
  })

  test('MAN-005: Back button returns to home', async ({ page }) => {
    await page.goto('/add')
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

  test('MAN-006: Source mode toggle works bidirectionally', async ({ page }) => {
    await page.goto('/add')
    await page.waitForLoadState('networkidle')

    // Initially should show API mode buttons
    const apiModeBtn = page.locator('.source-btn:has-text("API模式")')
    const manualModeBtn = page.locator('.source-btn:has-text("手动模式")')
    
    await expect(apiModeBtn).toBeVisible()
    await expect(manualModeBtn).toBeVisible()

    // Switch to manual mode
    await manualModeBtn.click()
    
    // Verify manual mode is active (button should have active class)
    await expect(manualModeBtn).toHaveClass(/active/)

    // Verify manual form elements are visible
    const marketCapInput = page.locator('.market-cap-input-group')
    await expect(marketCapInput).toBeVisible()

    // Switch back to API mode
    await apiModeBtn.click()
    
    // Verify API mode is active
    await expect(apiModeBtn).toHaveClass(/active/)

    // Verify API form elements are visible
    const searchInput = page.locator('input[placeholder*="输入代码或名称搜索"]')
    await expect(searchInput).toBeVisible()
  })
})
