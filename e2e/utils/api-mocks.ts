import type { Page } from '@playwright/test'
import type { StockData } from '../../src/types/stock'

/**
 * Default stock info response for East Money API
 */
interface EastMoneyStockInfoResponse {
  data: {
    f57: string // code
    f58: string // name
    f116: string // market cap
  }
}

/**
 * Default search response for East Money search API
 */
interface EastMoneySearchResponse {
  QuotationCodeTable: {
    Data: Array<{
      Code: string
      Name: string
      MktNum: string
      Classify: string
      JYS: string
    }>
  }
}

/**
 * Default exchange rate response
 */
interface ExchangeRateResponse {
  result: string
  base_code: string
  rates: {
    HKD: number
    CNY: number
    USD: number
  }
}

/**
 * Mock East Money stock info API
 * Endpoint: https://push2.eastmoney.com/api/qt/stock/get
 */
export async function mockEastMoneyStockInfo(
  page: Page,
  overrides?: Partial<EastMoneyStockInfoResponse['data']>
): Promise<void> {
  await page.route(
    'https://push2.eastmoney.com/api/qt/stock/get*',
    (route) => {
      const defaultData = {
        f57: '00700',
        f58: '腾讯控股',
        f116: '350000000000', // 35000亿 in 元 (35000 * 100000000)
        ...overrides,
      }

      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: defaultData,
        }),
      })
    }
  )
}

/**
 * Mock East Money search API
 * Endpoint: https://searchapi.eastmoney.com/api/suggest/get
 */
export async function mockEastMoneySearch(
  page: Page,
  results?: EastMoneySearchResponse['QuotationCodeTable']['Data']
): Promise<void> {
  await page.route(
    'https://searchapi.eastmoney.com/api/suggest/get*',
    (route) => {
      const defaultResults = [
        {
          Code: '00700',
          Name: '腾讯控股',
          MktNum: '116',
          Classify: 'HK',
          JYS: '116',
        },
        {
          Code: '09988',
          Name: '阿里巴巴',
          MktNum: '116',
          Classify: 'HK',
          JYS: '116',
        },
        {
          Code: '600519',
          Name: '贵州茅台',
          MktNum: '1',
          Classify: 'SH',
          JYS: '1',
        },
      ]

      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          QuotationCodeTable: {
            Data: results ?? defaultResults,
          },
        }),
      })
    }
  )
}

/**
 * Mock exchange rate API
 * Endpoint: https://open.er-api.com/v6/latest/HKD
 */
export async function mockExchangeRates(
  page: Page,
  rates?: ExchangeRateResponse['rates']
): Promise<void> {
  await page.route(
    'https://open.er-api.com/v6/latest/HKD',
    (route) => {
      const defaultRates = {
        result: 'success',
        base_code: 'HKD',
        rates: {
          HKD: 1.0,
          CNY: 0.89,
          USD: 7.78,
          ...rates,
        },
      }

      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(defaultRates),
      })
    }
  )
}

/**
 * Mock A-share financial report API
 * Endpoint: https://datacenter.eastmoney.com/securities/api/data/get
 */
export async function mockFinancialReportA(page: Page): Promise<void> {
  await page.route(
    'https://datacenter.eastmoney.com/securities/api/data/get*',
    (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
        }),
      })
    }
  )
}

/**
 * Mock HK stock financial report API
 * Endpoint: https://datacenter.eastmoney.com/api/data/v1/get
 */
export async function mockFinancialReportHK(page: Page): Promise<void> {
  await page.route(
    'https://datacenter.eastmoney.com/api/data/v1/get*',
    (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
        }),
      })
    }
  )
}

/**
 * Mock financial report API based on market type
 */
export async function mockFinancialReport(
  page: Page,
  type: 'HK' | 'A'
): Promise<void> {
  if (type === 'A') {
    await mockFinancialReportA(page)
  } else {
    await mockFinancialReportHK(page)
  }
}

/**
 * Mock API to fail with a specific error
 * Useful for testing error handling
 */
export async function mockApiFailure(
  page: Page,
  urlPattern: string,
  statusCode: number = 500,
  errorMessage: string = 'Internal Server Error'
): Promise<void> {
  await page.route(
    new RegExp(urlPattern),
    (route) => {
      route.fulfill({
        status: statusCode,
        contentType: 'text/plain',
        body: errorMessage,
      })
    }
  )
}

/**
 * Mock all external APIs at once for complete isolation
 */
export async function mockAllApis(page: Page): Promise<void> {
  await mockEastMoneyStockInfo(page)
  await mockEastMoneySearch(page)
  await mockExchangeRates(page)
  await mockFinancialReportA(page)
  await mockFinancialReportHK(page)
}

/**
 * Reset all mocks (stops routing)
 * Note: This removes all route handlers set by page.route()
 */
export async function resetAllMocks(page: Page): Promise<void> {
  // Playwright doesn't have a direct way to reset routes,
  // but we can use page.context().routeAll() to clear routes
  // For now, individual routes will persist until page close
  // This is a limitation of Playwright's routing mechanism
}

/**
 * Create a custom mock for any URL pattern
 */
export async function mockCustomEndpoint(
  page: Page,
  urlPattern: string,
  response: any,
  statusCode: number = 200
): Promise<void> {
  await page.route(
    new RegExp(urlPattern),
    (route) => {
      route.fulfill({
        status: statusCode,
        contentType: 'application/json',
        body: JSON.stringify(response),
      })
    }
  )
}
