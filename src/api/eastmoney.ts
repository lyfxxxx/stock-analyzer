import type { ApiStockInfo, ApiTestResult } from '@/types/stock'
import { fetchExchangeRates } from './exchangeRate'

export async function fetchEastMoneyStockInfo(code: string, market: 'HK' | 'A'): Promise<ApiStockInfo | null> {
  try {
    // East Money uses different secid format
    // 116 for HK, 1 for Shanghai A, 0 for Shenzhen A
    let secid: string
    if (market === 'HK') {
      secid = `116.${code}`
    } else {
      secid = code.startsWith('6') ? `1.${code}` : `0.${code}`
    }

    // f57 = code, f58 = name, f116 = total market cap
    const response = await fetch(
      `https://push2.eastmoney.com/api/qt/stock/get?secid=${secid}&fields=f57,f58,f116`,
      {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Accept': 'application/json'
        }
      }
    )

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    
    if (!data.data) {
      return null
    }

    const stockData = data.data
    const name = stockData.f58
    const marketCapRaw = parseFloat(stockData.f116) || 0
    let marketCap = marketCapRaw / 100000000 // Convert to 亿元

    // For A-shares, convert from CNY to HKD
    // For HK stocks, f116 is already in HKD
    if (market === 'A') {
      const { rates } = await fetchExchangeRates()
      const cnyToHkd = rates['CNY'] || 1.10
      marketCap = marketCap * cnyToHkd
    }

    return {
      name,
      code,
      market,
      marketCap
    }
  } catch (error) {
    console.error('EastMoney API error:', error)
    return null
  }
}

export async function testEastMoneyAPI(): Promise<ApiTestResult> {
  const start = performance.now()
  try {
    // Test with Tencent (00700)
    const response = await fetch(
      'https://push2.eastmoney.com/api/qt/stock/get?secid=116.00700&fields=f57,f58,f116',
      {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Accept': 'application/json'
        }
      }
    )

    const latency = Math.round(performance.now() - start)

    if (!response.ok) {
      return {
        source: '东方财富',
        status: 'error',
        message: `HTTP ${response.status}`,
        latency
      }
    }

    const data = await response.json()
    if (data.data && data.data.f58) {
      return {
        source: '东方财富',
        status: 'success',
        message: '连接正常',
        latency
      }
    }

    return {
      source: '东方财富',
      status: 'error',
      message: '数据格式异常',
      latency
    }
  } catch (error) {
    return {
      source: '东方财富',
      status: 'error',
      message: error instanceof Error ? error.message : '网络错误',
      latency: Math.round(performance.now() - start)
    }
  }
}
