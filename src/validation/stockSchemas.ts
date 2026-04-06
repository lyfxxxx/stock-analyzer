import { z } from 'zod'

// ============================================================
// StockData Schema
// Mirrors StockData from src/types/stock.ts
// ============================================================
export const stockDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  market: z.enum(['HK', 'A']),
  marketCap: z.number(),
  netCash: z.number(),
  freeCashFlow: z.number(),
  netProfit: z.number(),
  currentRatio: z.union([z.number(), z.null()]),
  peRatio: z.union([z.number(), z.null()]),
  valuation1: z.union([z.number(), z.null()]),
  valuation2: z.number(),
  yearlyData: z.array(
    z.object({
      year: z.number(),
      freeCashFlow: z.number(),
      netProfit: z.number(),
      isProjected: z.boolean().optional(),
      netProfitProjected: z.boolean().optional(),
      freeCashFlowProjected: z.boolean().optional(),
      netCashProjected: z.boolean().optional(),
      currentRatio: z.union([z.number(), z.null()]).optional(),
      currentRatioProjected: z.boolean().optional(),
      peRatio: z.union([z.number(), z.null()]).optional(),
      peRatioProjected: z.boolean().optional(),
    })
  ),
  createdAt: z.number(),
  updatedAt: z.number(),
  baseCurrency: z.enum(['USD', 'HKD', 'CNY', 'OTHER']),
  rateSource: z.enum(['api', 'fallback']).optional(),
  isUsingProjectedData: z.boolean().optional(),
  netProfitProjected: z.boolean().optional(),
  freeCashFlowProjected: z.boolean().optional(),
  netCashProjected: z.boolean().optional(),
  currentRatioProjected: z.boolean().optional(),
  peRatioProjected: z.boolean().optional(),
})
