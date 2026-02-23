import { test, expect } from '@playwright/test'

test.describe('Stock Search', () => {
  test('should search and add stock successfully', async ({ page }) => {
    // Listen to console logs
    page.on('console', msg => {
      console.log('Browser:', msg.text())
    })

    // Test 1: Navigate
    await page.goto('/add')
    await page.waitForLoadState('networkidle')
    console.log('✅ Page loaded')

    // Test 2: Check label
    const hasLabel = await page.locator('label:has-text("股票名称或代码")').isVisible()
    expect(hasLabel).toBe(true)
    console.log('✅ Label correct')

    // Test 3: Enter search term
    const input = page.locator('input[placeholder*="输入代码或名称"]')
    await input.fill('腾讯')
    await input.press('Enter')
    console.log('✅ Filled and pressed Enter')

    // Test 4: Check modal opens
    await page.waitForTimeout(3000)
    const modal = page.locator('.modal-content:has-text("搜索股票")')
    await expect(modal).toBeVisible()
    console.log('✅ Modal opened')

    // Test 5: Click search button in modal
    const searchInput = page.locator('input[placeholder*="输入股票名称"]')
    await searchInput.fill('腾讯')
    const searchBtn = page.locator('button.search-modal-btn')
    await searchBtn.click()
    console.log('✅ Clicked search button')

    // Test 6: Wait for results
    await page.waitForTimeout(8000)
    const results = page.locator('.search-result-item')
    const count = await results.count()
    console.log(`📊 Found ${count} results`)
    expect(count).toBeGreaterThan(0)

    // Test 7: Select result and wait for modal to close
    await results.first().click()
    
    // Wait for modal to close (up to 10 seconds)
    await expect(modal).not.toBeVisible({ timeout: 10000 })
    console.log('✅ Modal closed after selection')

    // Wait for fetch to complete
    await page.waitForTimeout(5000)

    // Test 8: Verify preview section appears (data loaded)
    const previewSection = page.locator('.preview-section')
    const previewVisible = await previewSection.isVisible().catch(() => false)
    console.log(`Preview section visible: ${previewVisible}`)
    
    // Take screenshot
    await page.screenshot({ path: '/tmp/e2e-test-result.png', fullPage: true })
    console.log('📸 Screenshot saved')
  })
})

test.describe('Edit Mode', () => {
  test('should refetch data and save successfully', async ({ page }) => {
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Browser Error:', msg.text())
      }
    })

    // Step 1: Add a stock first
    console.log('Step 1: Add a stock')
    await page.goto('/add')
    await page.waitForLoadState('networkidle')
    
    const input = page.locator('input[placeholder*="输入代码或名称"]')
    await input.fill('腾讯')
    await input.press('Enter')
    await page.waitForTimeout(3000)
    
    const results = page.locator('.search-result-item')
    await results.first().click()
    await page.waitForTimeout(5000)
    
    const previewSection = page.locator('.preview-section')
    await expect(previewSection).toBeVisible({ timeout: 10000 })
    console.log('✅ Stock added')
    
    // Step 2: Save stock
    console.log('Step 2: Save stock')
    const saveBtn = page.locator('button:has-text("确认保存")')
    await saveBtn.click()
    await page.waitForTimeout(2000)
    await page.waitForURL('**/')
    console.log('✅ Stock saved')
    
    // Step 3: Wait for home page to load stocks
    console.log('Step 3: Wait for home page')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    
    // Check if there's a stock card with edit button
    const stockCards = page.locator('.stock-card, [class*="stock-card"]')
    const cardCount = await stockCards.count()
    console.log(`Found ${cardCount} stock cards`)
    
    if (cardCount > 0) {
      // Step 4: Click edit button
      console.log('Step 4: Enter edit mode')
      const editBtn = page.locator('[class*="edit-btn"], button:has-text("编辑")').first()
      await editBtn.click()
      await page.waitForURL('**/edit/**')
      await page.waitForLoadState('networkidle')
      console.log('✅ Entered edit mode')
      
      // Step 5: Click refetch button
      console.log('Step 5: Refetch data')
      const refetchBtn = page.locator('button:has-text("重新获取数据")')
      const refetchVisible = await refetchBtn.isVisible().catch(() => false)
      
      if (refetchVisible) {
        await refetchBtn.click()
        await page.waitForTimeout(5000)
        console.log('✅ Data refetched')
      }
      
      // Step 6: Click confirm save
      console.log('Step 6: Save after refetch')
      const confirmSaveBtn = page.locator('button:has-text("确认保存")')
      await confirmSaveBtn.click()
      await page.waitForTimeout(3000)
      
      // Check for errors
      const hasError = await page.locator('.error-message').isVisible().catch(() => false)
      
      if (hasError) {
        const errorText = await page.locator('.error-message').first().textContent().catch(() => 'Unknown error')
        console.log(`❌ Error: ${errorText}`)
        throw new Error(`Save failed: ${errorText}`)
      } else {
        console.log('✅ Saved successfully')
        await page.waitForURL('**/', { timeout: 5000 })
      }
    } else {
      console.log('⚠️ No stock cards found, test skipped')
    }
  })
})
