import type { StockData } from '../../src/types/stock'

/**
 * Tencent (00700) - HK stock
 * Low valuation case - large company with strong cash position
 * Market cap: ~3.5万亿 HKD = ~4500亿 HKD
 * FCF: ~1500亿 HKD
 * Net Profit: ~1200亿 HKD
 */
export const tencentStock: StockData = {
  id: 'tencent-00700-hk',
  name: '腾讯控股',
  code: '00700',
  market: 'HK',
  marketCap: 35000, // in 亿元 HKD (35000 * 100000000 = 3.5万亿)
  netCash: 1800, // 净现金 1800亿
  freeCashFlow: 1500, // 自由现金流 1500亿
  netProfit: 1200, // 净利润 1200亿
  currentRatio: 1.8, // 流动比率 > 1.5
  peRatio: 18.5, // PE 18.5x
  valuation1: 23.33, // (35000 - 1800) / 1500 = 22.13 (low)
  valuation2: 27.67, // (35000 - 1800) / 1200 = 27.67
  baseCurrency: 'HKD',
  rateSource: 'fallback',
  createdAt: Date.now() - 86400000 * 30, // 30 days ago
  updatedAt: Date.now() - 86400000, // 1 day ago
  yearlyData: [
    {
      year: 2023,
      freeCashFlow: 1500,
      netProfit: 1200,
      currentRatio: 1.8,
      peRatio: 18.5,
    },
    {
      year: 2022,
      freeCashFlow: 1400,
      netProfit: 1100,
      currentRatio: 1.7,
      peRatio: 20.2,
    },
    {
      year: 2021,
      freeCashFlow: 1600,
      netProfit: 1300,
      currentRatio: 1.9,
      peRatio: 17.8,
    },
    {
      year: 2020,
      freeCashFlow: 1450,
      netProfit: 1150,
      currentRatio: 1.75,
      peRatio: 22.1,
    },
  ],
}

/**
 * Alibaba (09988) - HK stock
 * Medium valuation case - large e-commerce company
 * Market cap: ~2万亿 HKD = ~2500亿 HKD
 * FCF: ~1200亿 HKD
 * Net Profit: ~800亿 HKD
 */
export const alibabaStock: StockData = {
  id: 'alibaba-09988-hk',
  name: '阿里巴巴',
  code: '09988',
  market: 'HK',
  marketCap: 20000, // in 亿元 HKD (20000 * 100000000 = 2万亿)
  netCash: 2500, // 净现金 2500亿
  freeCashFlow: 1200, // 自由现金流 1200亿
  netProfit: 800, // 净利润 800亿
  currentRatio: 2.1, // 流动比率 > 1.5
  peRatio: 22.5, // PE 22.5x
  valuation1: 14.58, // (20000 - 2500) / 1200 = 14.58 (medium)
  valuation2: 21.88, // (20000 - 2500) / 800 = 21.88
  baseCurrency: 'HKD',
  rateSource: 'fallback',
  createdAt: Date.now() - 86400000 * 25, // 25 days ago
  updatedAt: Date.now() - 86400000 * 2, // 2 days ago
  yearlyData: [
    {
      year: 2023,
      freeCashFlow: 1200,
      netProfit: 800,
      currentRatio: 2.1,
      peRatio: 22.5,
    },
    {
      year: 2022,
      freeCashFlow: 1100,
      netProfit: 700,
      currentRatio: 1.9,
      peRatio: 28.5,
    },
    {
      year: 2021,
      freeCashFlow: 1500,
      netProfit: 1000,
      currentRatio: 2.0,
      peRatio: 20.1,
    },
    {
      year: 2020,
      freeCashFlow: 1400,
      netProfit: 900,
      currentRatio: 1.95,
      peRatio: 25.3,
    },
  ],
}

/**
 * Kweichow Moutai (600519) - A-share
 * High valuation case - luxury liquor company
 * Market cap: ~2.5万亿 CNY = ~2700亿 HKD equivalent
 * FCF: ~700亿 CNY
 * Net Profit: ~600亿 CNY
 * Note: A-shares display in 亿人民币, converted to HKD for comparison
 */
export const moutaiStock: StockData = {
  id: 'moutai-600519-a',
  name: '贵州茅台',
  code: '600519',
  market: 'A',
  marketCap: 25000, // in 亿元 CNY (25000 * 100000000 = 2.5万亿)
  netCash: 1500, // 净现金 1500亿
  freeCashFlow: 700, // 自由现金流 700亿
  netProfit: 600, // 净利润 600亿
  currentRatio: 4.2, // 流动比率 > 1.5
  peRatio: 35.0, // PE 35x (high)
  valuation1: 33.57, // (25000 - 1500) / 700 = 33.57 (high)
  valuation2: 39.17, // (25000 - 1500) / 600 = 39.17
  baseCurrency: 'CNY',
  rateSource: 'fallback',
  isUsingProjectedData: false,
  createdAt: Date.now() - 86400000 * 20, // 20 days ago
  updatedAt: Date.now() - 86400000 * 3, // 3 days ago
  yearlyData: [
    {
      year: 2023,
      freeCashFlow: 700,
      netProfit: 600,
      currentRatio: 4.2,
      peRatio: 35.0,
    },
    {
      year: 2022,
      freeCashFlow: 650,
      netProfit: 550,
      currentRatio: 4.0,
      peRatio: 38.2,
    },
    {
      year: 2021,
      freeCashFlow: 600,
      netProfit: 500,
      currentRatio: 3.8,
      peRatio: 42.5,
    },
    {
      year: 2020,
      freeCashFlow: 550,
      netProfit: 450,
      currentRatio: 3.5,
      peRatio: 48.0,
    },
  ],
}

/**
 * All test stocks combined
 */
export const testStocks: StockData[] = [tencentStock, alibabaStock, moutaiStock]

/**
 * Get a stock by ID
 */
export function getStockById(id: string): StockData | undefined {
  return testStocks.find((stock) => stock.id === id)
}

/**
 * Get a stock by code
 */
export function getStockByCode(code: string): StockData | undefined {
  return testStocks.find((stock) => stock.code === code)
}

/**
 * Get HK stocks only
 */
export function getHkStocks(): StockData[] {
  return testStocks.filter((stock) => stock.market === 'HK')
}

/**
 * Get A-shares only
 */
export function getAShares(): StockData[] {
  return testStocks.filter((stock) => stock.market === 'A')
}

/**
 * Create a modified copy of a stock with custom overrides
 */
export function createModifiedStock(
  stockId: string,
  overrides: Partial<StockData>
): StockData {
  const original = getStockById(stockId)
  if (!original) {
    throw new Error(`Stock with id ${stockId} not found`)
  }
  return {
    ...original,
    ...overrides,
    id: overrides.id ?? original.id,
    yearlyData: overrides.yearlyData ?? original.yearlyData,
  }
}
