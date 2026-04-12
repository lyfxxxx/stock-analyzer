import { describe, it, expect } from 'vitest'

/**
 * Live API Integration Tests
 *
 * These tests make real HTTP requests to East Money API.
 * To prevent rate limiting during development, they are skipped by default.
 *
 * To run these tests:
 *   npm run test:integration
 *   # or
 *   VITE_LIVE_API_TESTS=true npm test
 *
 * Environment Variable:
 *   VITE_LIVE_API_TESTS - Set to 'true' to enable live API tests
 */
const RUN_LIVE_TESTS = import.meta.env.VITE_LIVE_API_TESTS === 'true'

// Use conditional describe to skip tests when env var is not set
const describeLive = RUN_LIVE_TESTS ? describe : describe.skip

describeLive('HK Stock (6862 Haidilao) - Real API Integration', () => {
  it('should calculate current ratio and PE from real API data', async () => {
    const { fetchHKStockFinancialReport } = await import('@/api/financialReportHK')

    const result = await fetchHKStockFinancialReport('6862')

    expect(result.error).toBeNull()
    expect(result.data).not.toBeNull()

    const data = result.data!

    console.log('=== Haidilao 6862 Real API Data ===')
    console.log('Years:', data.years)
    console.log('Net profits (CNY):', data.netProfits)
    console.log('Short term debt:', data.shortTermDebt)
    console.log('Long term debt:', data.longTermDebt)
    console.log('Current ratio:', data.currentRatio)
    console.log('Current ratio projected:', data.currentRatioProjected)
    console.log('PE ratio:', data.peRatio)
    console.log('PE ratio projected:', data.peRatioProjected)
    console.log('Report types:', data.reportTypes)

    // Verify new fields exist
    expect(data.currentRatio).toBeDefined()
    expect(data.currentRatioProjected).toBeDefined()
    expect(data.peRatio).toBeDefined()
    expect(data.peRatioProjected).toBeDefined()

    expect(data.currentRatio).toHaveLength(data.years.length)
    expect(data.peRatio).toHaveLength(data.years.length)

    // For latest year, current ratio should be calculable
    const latestCR = data.currentRatio[0]
    if (latestCR !== null) {
      expect(latestCR).toBeGreaterThan(0)
      console.log(`Latest current ratio: ${latestCR}`)
    }

    // PE ratio: if market cap was available and net profit > 0, PE should be positive
    // Note: peRatio in API result may be null if marketCap not yet set
    const latestPE = data.peRatio[0]
    if (latestPE !== null) {
      expect(latestPE).toBeGreaterThan(0)
      console.log(`Latest PE ratio: ${latestPE}`)
    }

    // Verify projected flags match report types
    const latestIsAnnual = data.reportTypes[0] === 'annual'
    expect(data.currentRatioProjected[0]).toBe(!latestIsAnnual)
  })

  it('should include both years with current ratio data', async () => {
    const { fetchHKStockFinancialReport } = await import('@/api/financialReportHK')

    const result = await fetchHKStockFinancialReport('6862')

    expect(result.error).toBeNull()
    expect(result.data!.years.length).toBeGreaterThanOrEqual(1)
  })
})

describeLive('A-Stock (600941 China Mobile) - Real API Integration', () => {
  it('should calculate current ratio and PE from real API data', async () => {
    const { fetchAStockFinancialReport } = await import('@/api/financialReportA')

    const result = await fetchAStockFinancialReport('600941')

    expect(result.error).toBeNull()
    expect(result.data).not.toBeNull()

    const data = result.data!

    console.log('=== China Mobile 600941 Real API Data ===')
    console.log('Years:', data.years)
    console.log('Net profits (CNY):', data.netProfits)
    console.log('Current ratio:', data.currentRatio)
    console.log('Current ratio projected:', data.currentRatioProjected)
    console.log('PE ratio:', data.peRatio)
    console.log('PE ratio projected:', data.peRatioProjected)
    console.log('Report types:', data.reportTypes)
    console.log('Base currency:', data.baseCurrency)

    expect(data.currentRatio).toBeDefined()
    expect(data.currentRatioProjected).toBeDefined()
    expect(data.peRatio).toBeDefined()
    expect(data.peRatioProjected).toBeDefined()

    const latestCR = data.currentRatio[0]
    if (latestCR !== null) {
      expect(latestCR).toBeGreaterThan(0)
      console.log(`Latest current ratio: ${latestCR}`)
    }

    const latestPE = data.peRatio[0]
    if (latestPE !== null) {
      expect(latestPE).toBeGreaterThan(0)
      console.log(`Latest PE ratio: ${latestPE}`)
    }
  })
})

describeLive('A-Stock (002027 Focus Media) - Real API Integration', () => {
  it('should have correct CNY base currency for A-share stock', async () => {
    const { fetchAStockFinancialReport } = await import('@/api/financialReportA')

    const result = await fetchAStockFinancialReport('002027')

    expect(result.error).toBeNull()
    expect(result.data).not.toBeNull()

    const data = result.data!

    console.log('=== Focus Media 002027 Real API Data ===')
    console.log('Years:', data.years)
    console.log('Net profits (CNY):', data.netProfits)
    console.log('Current ratio:', data.currentRatio)
    console.log('Current ratio projected:', data.currentRatioProjected)
    console.log('Base currency:', data.baseCurrency)
    console.log('Currency type:', data.currencyType)

    expect(data.baseCurrency).toBe('CNY')
    expect(data.currencyType).toBe('CNY')

    expect(data.currentRatio).toBeDefined()
    expect(data.currentRatioProjected).toBeDefined()

    const latestCR = data.currentRatio[0]
    if (latestCR !== null) {
      expect(latestCR).toBeGreaterThan(0)
      console.log(`Latest current ratio: ${latestCR}`)
    }

    console.log('Report types:', data.reportTypes)
    console.log('Years with data:', data.years.slice(0, 5))
  })
})
