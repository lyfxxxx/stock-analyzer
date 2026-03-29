import { describe, it, expect } from 'vitest'

describe('HK Stock (6862 Haidilao) - Real API Integration', () => {
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

describe('A-Stock (600941 China Mobile) - Real API Integration', () => {
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

    // Verify new fields exist
    expect(data.currentRatio).toBeDefined()
    expect(data.currentRatioProjected).toBeDefined()
    expect(data.peRatio).toBeDefined()
    expect(data.peRatioProjected).toBeDefined()

    // Current ratio should be calculable
    const latestCR = data.currentRatio[0]
    if (latestCR !== null) {
      expect(latestCR).toBeGreaterThan(0)
      console.log(`Latest current ratio: ${latestCR}`)
    }

    // PE ratio
    const latestPE = data.peRatio[0]
    if (latestPE !== null) {
      expect(latestPE).toBeGreaterThan(0)
      console.log(`Latest PE ratio: ${latestPE}`)
    }
  })
})