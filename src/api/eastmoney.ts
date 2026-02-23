import type { ApiStockInfo, ApiTestResult, StockSearchResult } from '@/types/stock'
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

interface SearchApiResponse {
  QuotationCodeTable?: {
    Data?: SearchItem[]
  }
}

interface SearchItem {
  Code: string
  Name: string
  MktNum: string
  Classify: string
  JYS: string
}

const JYS_CODE_MAP: Record<string, string> = {
  '116': 'HK',  // 港股
  '1': 'SH',    // 上海A股
  '6': 'SZ',    // 深圳A股
}

function mapJysToCode(jys: string): string {
  return JYS_CODE_MAP[jys] || jys
}

function mapMarketCode(mktNum: string, classify: string, jys: string): { market: 'HK' | 'A'; marketName: string } {
  if (classify === 'HK' || jys === 'HK' || jys === '116') {
    return { market: 'HK', marketName: '港股' }
  }
  if (mktNum === '0' || jys === 'SZ' || jys === '6') {
    return { market: 'A', marketName: 'A股(深)' }
  }
  if (mktNum === '1' || jys === 'SH' || jys === '1') {
    return { market: 'A', marketName: 'A股(沪)' }
  }
  return { market: 'A', marketName: 'A股' }
}

export async function searchStocksByName(
  query: string,
  market?: 'HK' | 'A'
): Promise<StockSearchResult[]> {
  if (!query || query.trim().length === 0) {
    return []
  }

  try {
    const isDev = import.meta.env.DEV
    
    const WORKER_URL = 'https://stock-search-proxy.894624801.workers.dev'
    
    const searchUrl = isDev
      ? `/api/search?input=${encodeURIComponent(query)}&type=14&count=10`
      : `${WORKER_URL}/api/search?input=${encodeURIComponent(query)}&type=14&count=10`
    
    const response = await fetch(searchUrl, {
      method: 'GET',
      mode: 'cors',
      headers: { 'Accept': 'application/json' }
    })

    if (!response.ok) {
      return []
    }

    const data: SearchApiResponse = await response.json()
    
    if (!data.QuotationCodeTable?.Data) {
      return []
    }

    const results: StockSearchResult[] = data.QuotationCodeTable.Data
      .filter(item => {
        const jysCode = mapJysToCode(item.JYS)
        return ['HK', 'SH', 'SZ'].includes(jysCode)
      })
      .map(item => {
        const jysCode = mapJysToCode(item.JYS)
        const { market: marketType, marketName } = mapMarketCode(item.MktNum, item.Classify, jysCode)
        
        if (market && marketType !== market) {
          return null
        }

        const fullCode = jysCode === 'HK'
          ? `${item.Code}.HK`
          : jysCode === 'SZ'
            ? `${item.Code}.SZ`
            : `${item.Code}.SH`

        return {
          code: item.Code,
          fullCode,
          name: item.Name,
          market: marketType,
          marketName,
          marketCap: 0
        }
      })
      .filter((item): item is StockSearchResult => item !== null)

    return results
  } catch (error) {
    console.error('Search stocks error:', error)
    return []
  }
}
