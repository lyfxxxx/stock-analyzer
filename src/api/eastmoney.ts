import type { ApiStockInfo, ApiTestResult, StockSearchResult } from '@/types/stock'
import { fetchExchangeRates } from './exchangeRate'
import { validateApiResponse } from '@/utils/validateApiResponse'
import { eastMoneyStockInfoSchema, stockSearchResultSchema } from '@/validation/apiSchemas'
import { logger } from '@/utils/logger'
import { withRetry, fetchWithTimeout, HttpError } from '@/utils/retry'

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
    const result = await withRetry(async () => {
      const response = await fetchWithTimeout(
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
        throw new HttpError(`HTTP ${response.status}`, response.status, response)
      }

      return response.json()
    })

    if (result.data) {
      return validateApiResponse({
        name: result.data.f58,
        code: result.data.f57,
        market,
        marketCap: parseFloat(result.data.f116) / 100000000
      }, eastMoneyStockInfoSchema)
    }

    return null
  } catch (error) {
    logger.error('eastmoney', 'Failed to fetch stock info:', error)
    return null
  }
}

export async function testEastMoneyAPI(): Promise<ApiTestResult> {
  const start = performance.now()
  
  try {
    const response = await fetch(
      'https://push2.eastmoney.com/api/qt/stock/get?secid=116.00700&fields=f57,f58',
      {
        method: 'GET',
        mode: 'cors'
      }
    )
    
    const latency = Math.round(performance.now() - start)
    
    if (response.ok) {
      return {
        source: '东方财富',
        status: 'success',
        message: '连接正常',
        latency
      }
    } else {
      return {
        source: '东方财富',
        status: 'error',
        message: `HTTP ${response.status}`,
        latency
      }
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
  '2': 'SH',    // 上海A股（部分股票返回2）
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
  if (mktNum === '1' || jys === 'SH' || jys === '1' || jys === '2') {
    return { market: 'A', marketName: 'A股(沪)' }
  }
  return { market: 'A', marketName: 'A股' }
}

function jsonp<T>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const callbackName = 'jsonp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    
    const timeout = setTimeout(() => {
      cleanup()
      reject(new Error('JSONP request timeout'))
    }, 10000)
    
    const cleanup = () => {
      if (timeout) clearTimeout(timeout)
      delete (window as any)[callbackName]
      if (script.parentNode) script.remove()
    }
    
    ;(window as any)[callbackName] = (data: T) => {
      cleanup()
      resolve(data)
    }
    
    const script = document.createElement('script')
    script.src = url + '&cb=' + callbackName
    script.onerror = () => {
      cleanup()
      reject(new Error('JSONP request failed'))
    }
    
    document.head.appendChild(script)
  })
}

export async function searchStocksByName(
  query: string,
  market?: 'HK' | 'A'
): Promise<StockSearchResult[]> {
  if (!query || query.trim().length === 0) {
    return []
  }

  try {
    const searchUrl = `https://searchapi.eastmoney.com/api/suggest/get?input=${encodeURIComponent(query)}&type=14&count=10`
    
    const data = await jsonp<SearchApiResponse>(searchUrl)
    
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

        return validateApiResponse({
          code: item.Code,
          fullCode,
          name: item.Name,
          market: marketType,
          marketName,
          marketCap: 0
        }, stockSearchResultSchema)
      })
      .filter((item): item is StockSearchResult => item !== null)

    return results
  } catch (error) {
    logger.error('eastmoney', 'Search stocks error:', error)
    return []
  }
}
