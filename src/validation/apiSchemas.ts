import { z } from 'zod'

// ============================================================
// East Money Stock Info Schema
// Mirrors ApiStockInfo: { name, code, market, marketCap }
// ============================================================
export const eastMoneyStockInfoSchema = z.object({
  name: z.string(),
  code: z.string(),
  market: z.enum(['HK', 'A']),
  marketCap: z.number(),
})

// ============================================================
// East Money Search Response Schema
// Mirrors StockSearchResult: { code, fullCode, name, market, marketName, marketCap }
// ============================================================
export const stockSearchResultSchema = z.object({
  code: z.string(),
  fullCode: z.string(),
  name: z.string(),
  market: z.enum(['HK', 'A']),
  marketName: z.string(),
  marketCap: z.number(),
})

export const eastMoneySearchResponseSchema = z.array(stockSearchResultSchema)

// ============================================================
// Financial Report Data Schema
// Mirrors FinancialReportData
// ============================================================
export const financialReportDataSchema = z.object({
  years: z.array(z.number()),
  netProfits: z.array(z.number()),
  cashAndEquivalents: z.array(z.number()),
  shortTermDebt: z.array(z.number()),
  longTermDebt: z.array(z.number()),
  operatingCashFlow: z.array(z.number()),
  capitalExpenditure: z.array(z.number()),
  currentRatio: z.array(z.union([z.number(), z.null()])),
  currentRatioProjected: z.array(z.boolean()),
  peRatio: z.array(z.union([z.number(), z.null()])),
  peRatioProjected: z.array(z.boolean()),
  currencyType: z.enum(['USD', 'HKD', 'CNY', 'OTHER']),
  baseCurrency: z.enum(['USD', 'HKD', 'CNY', 'OTHER']),
  source: z.literal('api'),
  reportTypes: z.array(z.enum(['annual', 'Q1', 'H1', 'Q3'])),
  isProjected: z.array(z.boolean()),
  netProfitProjected: z.array(z.boolean()),
  freeCashFlowProjected: z.array(z.boolean()),
  netCashProjected: z.array(z.boolean()),
})

// ============================================================
// Exchange Rate Result Schema
// Mirrors ExchangeRateResult: { rates, source, lastUpdate }
// ============================================================
export const exchangeRateResultSchema = z.object({
  rates: z.record(z.string(), z.number()),
  source: z.enum(['api', 'fallback']),
  lastUpdate: z.number(),
})
