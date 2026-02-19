export type CurrencyType = 'USD' | 'HKD' | 'CNY' | 'OTHER'

export interface StockData {
  id: string
  name: string
  code: string
  market: 'HK' | 'A'
  marketCap: number
  netCash: number
  freeCashFlow: number
  netProfit: number
  valuation1: number | null
  valuation2: number
  yearlyData: YearlyData[]
  createdAt: number
  updatedAt: number
  baseCurrency: 'HKD'
  rateSource?: 'api' | 'fallback'
  isUsingProjectedData?: boolean
}

export interface YearlyData {
  year: number
  freeCashFlow: number
  netProfit: number
  isProjected?: boolean
}

export interface StockAnalysisResult {
  id: string
  name: string
  code: string
  market: 'HK' | 'A'
  marketCap: number
  netCash: number
  freeCashFlow: number
  netProfit: number
  valuation1: number | null
  valuation2: number
  yearlyData: YearlyData[]
  baseCurrency: 'HKD'
  rateSource?: 'api' | 'fallback'
  isUsingProjectedData?: boolean
}

export interface ExcelData {
  benefit: any[][]
  debt: any[][]
  cash: any[][]
  keyIndex: any[][]
}

export type DataSourceMode = 'api' | 'manual'

export interface ApiStockInfo {
  name: string
  code: string
  market: 'HK' | 'A'
  marketCap: number
}

export interface ValidationError {
  file: string
  field: string
  message: string
}

export interface ExcelValidationResult {
  isValid: boolean
  errors: ValidationError[]
  data?: ExcelData
}

export interface ApiTestResult {
  source: string
  status: 'success' | 'error'
  message: string
  latency?: number
}
