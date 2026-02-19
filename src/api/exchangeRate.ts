const FALLBACK_RATES: Record<string, number> = {
  USD: 7.75,
  HKD: 1.00,
  CNY: 1.10
}

const CACHE_KEY = 'exchangeRates_HKD'
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

export interface ExchangeRateResult {
  rates: Record<string, number>
  source: 'api' | 'fallback'
  lastUpdate: number
}

export async function fetchExchangeRates(): Promise<ExchangeRateResult> {
  const cached = getCachedRates()
  if (cached) {
    return cached
  }

  try {
    const response = await fetch('https://open.er-api.com/v6/latest/HKD')
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    if (data.result !== 'success') {
      throw new Error('API returned error')
    }

    const rates: Record<string, number> = {
      HKD: 1.00,
      USD: data.rates?.USD || FALLBACK_RATES.USD,
      CNY: data.rates?.CNY || FALLBACK_RATES.CNY
    }

    const result: ExchangeRateResult = {
      rates,
      source: 'api',
      lastUpdate: Date.now()
    }

    setCachedRates(result)
    return result
  } catch (error) {
    console.error('Failed to fetch exchange rates:', error)
    return {
      rates: FALLBACK_RATES,
      source: 'fallback',
      lastUpdate: Date.now()
    }
  }
}

function getCachedRates(): ExchangeRateResult | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) return null

    const parsed = JSON.parse(cached) as ExchangeRateResult
    const now = Date.now()

    if (now - parsed.lastUpdate < CACHE_DURATION) {
      return parsed
    }

    localStorage.removeItem(CACHE_KEY)
    return null
  } catch {
    return null
  }
}

function setCachedRates(result: ExchangeRateResult): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(result))
  } catch (error) {
    console.error('Failed to cache exchange rates:', error)
  }
}

export function getExchangeRate(from: string, to: string, rates: Record<string, number>): number {
  if (from === to) return 1
  if (from === 'HKD') {
    return 1 / (rates[to] || 1)
  }
  if (to === 'HKD') {
    return rates[from] || 1
  }
  return (rates[from] || 1) / (rates[to] || 1)
}
